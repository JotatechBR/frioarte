const { pool } = require('../db');
const { erroHttp, erroBanco } = require('../shared/erroHttp');
const {
    corpo,
    camposPermitidos,
    textoObrigatorio,
    textoOpcional,
    idPositivo,
    data,
    codigoEquipamento
} = require('../shared/validacao');

const BLOQUEIO_CODIGO = 'frio_arte:equipamentos:codigo';
const PADRAO_CODIGO = '^FA-[0-9]+$';
const STATUS = ['funcionando', 'atencao', 'parado'];

const CAMPOS_CRIACAO = [
    'cliente_id',
    'tipo',
    'marca',
    'modelo',
    'capacidade',
    'numero_serie',
    'local',
    'data_instalacao',
    'ultima_manutencao',
    'proxima_manutencao',
    'status',
    'observacoes'
];

const COLUNAS_ATUALIZAVEIS = Object.freeze({
    cliente_id: 'cliente_id',
    tipo: 'tipo',
    marca: 'marca',
    modelo: 'modelo',
    capacidade: 'capacidade',
    numero_serie: 'numero_serie',
    local: 'local',
    data_instalacao: 'data_instalacao',
    ultima_manutencao: 'ultima_manutencao',
    proxima_manutencao: 'proxima_manutencao',
    status: 'status',
    observacoes: 'observacoes'
});

const CONSULTA_BASE = `
    SELECT
        e.codigo,
        e.cliente_id,
        c.nome AS cliente_nome,
        e.tipo,
        e.marca,
        e.modelo,
        e.capacidade,
        e.numero_serie,
        e.local,
        e.data_instalacao,
        e.ultima_manutencao,
        e.proxima_manutencao,
        e.status,
        e.observacoes
    FROM equipamentos e
    INNER JOIN clientes c ON c.id = e.cliente_id
`;

async function listar(filtros = {}) {
    const opcoes = validarFiltros(filtros);
    const condicoes = [];
    const valores = [];

    if (opcoes.busca) {
        const padrao = `%${opcoes.busca}%`;

        condicoes.push(`(
            e.codigo LIKE ? OR
            e.marca LIKE ? OR
            e.modelo LIKE ? OR
            e.numero_serie LIKE ? OR
            e.local LIKE ?
        )`);
        valores.push(padrao, padrao, padrao, padrao, padrao);
    }

    if (opcoes.cliente_id !== undefined) {
        condicoes.push('e.cliente_id = ?');
        valores.push(opcoes.cliente_id);
    }

    if (opcoes.status) {
        condicoes.push('e.status = ?');
        valores.push(opcoes.status);
    }

    if (opcoes.tipo) {
        condicoes.push('e.tipo = ?');
        valores.push(opcoes.tipo);
    }

    const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const [linhas] = await pool.execute(
        `${CONSULTA_BASE} ${onde} ORDER BY e.codigo ASC`,
        valores
    );

    return linhas;
}

async function obter(codigo) {
    const pronto = codigoEquipamento(codigo);
    const equipamento = await selecionarPorCodigo(pool, pronto);

    if (!equipamento) throw equipamentoNaoEncontrado();

    return equipamento;
}

async function criar(entrada) {
    const dados = validarCriacao(entrada);
    const conexao = await pool.getConnection();

    let bloqueioAdquirido = false;
    let emTransacao = false;
    let destruirConexao = false;

    try {
        const [resultadoBloqueio] = await conexao.execute(
            'SELECT GET_LOCK(?, ?) AS adquirido',
            [BLOQUEIO_CODIGO, 5]
        );

        if (Number(resultadoBloqueio[0] && resultadoBloqueio[0].adquirido) !== 1) {
            throw erroHttp(503, 'Não foi possível gerar o código do equipamento agora. Tente novamente.');
        }

        bloqueioAdquirido = true;
        await conexao.beginTransaction();
        emTransacao = true;

        await confirmarCliente(conexao, dados.cliente_id, true);

        const codigo = await gerarProximoCodigo(conexao);

        await conexao.execute(
            `INSERT INTO equipamentos (
                codigo,
                cliente_id,
                tipo,
                marca,
                modelo,
                capacidade,
                numero_serie,
                local,
                data_instalacao,
                ultima_manutencao,
                proxima_manutencao,
                status,
                observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                codigo,
                dados.cliente_id,
                dados.tipo,
                dados.marca,
                dados.modelo,
                dados.capacidade,
                dados.numero_serie,
                dados.local,
                dados.data_instalacao,
                dados.ultima_manutencao,
                dados.proxima_manutencao,
                dados.status,
                dados.observacoes
            ]
        );

        const equipamento = await selecionarPorCodigo(conexao, codigo);

        await conexao.commit();
        emTransacao = false;

        return equipamento;
    } catch (erro) {
        if (emTransacao) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                destruirConexao = true;
            }
        }

        throw traduzirErroEscrita(erro);
    } finally {
        if (bloqueioAdquirido) {
            try {
                const [resultadoLiberacao] = await conexao.execute(
                    'SELECT RELEASE_LOCK(?) AS liberado',
                    [BLOQUEIO_CODIGO]
                );

                if (Number(resultadoLiberacao[0] && resultadoLiberacao[0].liberado) !== 1) {
                    destruirConexao = true;
                }
            } catch (erroLiberacao) {
                destruirConexao = true;
            }
        }

        if (destruirConexao) conexao.destroy();
        else conexao.release();
    }
}

async function atualizar(codigo, entrada) {
    const pronto = codigoEquipamento(codigo);
    const alteracoes = validarAtualizacao(entrada);
    const conexao = await pool.getConnection();

    let emTransacao = false;
    let destruirConexao = false;

    try {
        await conexao.beginTransaction();
        emTransacao = true;

        /*
         * Visitas bloqueiam primeiro o cliente e depois o equipamento. Manter a
         * mesma ordem aqui evita o ciclo cliente -> equipamento / equipamento ->
         * cliente quando um agendamento e uma transferência acontecem juntos.
         */
        if (tem(alteracoes, 'cliente_id')) {
            await confirmarCliente(conexao, alteracoes.cliente_id, true);
        }

        const [atuais] = await conexao.execute(
            'SELECT codigo, cliente_id FROM equipamentos WHERE codigo = ? FOR UPDATE',
            [pronto]
        );

        if (!atuais.length) throw equipamentoNaoEncontrado();

        const atual = atuais[0];

        if (tem(alteracoes, 'cliente_id')) {
            if (Number(alteracoes.cliente_id) !== Number(atual.cliente_id)) {
                const [visitasIncompativeis] = await conexao.execute(
                    `SELECT id
                     FROM visitas
                     WHERE equipamento_codigo = ? AND cliente_id <> ?
                     LIMIT 1
                     FOR UPDATE`,
                    [pronto, alteracoes.cliente_id]
                );

                if (visitasIncompativeis.length) {
                    throw erroHttp(
                        409,
                        'Não é possível trocar o cliente porque existem visitas vinculadas a este equipamento.'
                    );
                }
            }
        }

        const campos = Object.keys(alteracoes);
        const atribuicoes = campos.map((campo) => `${COLUNAS_ATUALIZAVEIS[campo]} = ?`);
        const valores = campos.map((campo) => alteracoes[campo]);

        await conexao.execute(
            `UPDATE equipamentos SET ${atribuicoes.join(', ')} WHERE codigo = ?`,
            [...valores, pronto]
        );

        const equipamento = await selecionarPorCodigo(conexao, pronto);

        await conexao.commit();
        emTransacao = false;

        return equipamento;
    } catch (erro) {
        if (emTransacao) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                destruirConexao = true;
            }
        }

        throw traduzirErroEscrita(erro);
    } finally {
        if (destruirConexao) conexao.destroy();
        else conexao.release();
    }
}

async function remover(codigo) {
    const pronto = codigoEquipamento(codigo);

    try {
        const [resultado] = await pool.execute(
            'DELETE FROM equipamentos WHERE codigo = ?',
            [pronto]
        );

        if (!resultado.affectedRows) throw equipamentoNaoEncontrado();
    } catch (erro) {
        if (erroBanco(erro, 'ER_ROW_IS_REFERENCED_2') ||
            erroBanco(erro, 'ER_ROW_IS_REFERENCED')) {
            throw erroHttp(
                409,
                'Não é possível excluir este equipamento porque existem visitas vinculadas.'
            );
        }

        throw erro;
    }
}

async function selecionarPorCodigo(executor, codigo) {
    const [linhas] = await executor.execute(
        `${CONSULTA_BASE} WHERE e.codigo = ?`,
        [codigo]
    );

    return linhas[0] || null;
}

async function confirmarCliente(executor, clienteId, bloquear = false) {
    const trava = bloquear ? ' FOR SHARE' : '';
    const [linhas] = await executor.execute(
        `SELECT id FROM clientes WHERE id = ?${trava}`,
        [clienteId]
    );

    if (!linhas.length) throw erroHttp(404, 'Cliente não encontrado.');
}

async function gerarProximoCodigo(conexao) {
    const [linhas] = await conexao.execute(
        `SELECT CAST(
            COALESCE(MAX(CAST(SUBSTRING(codigo, 4) AS UNSIGNED)), 0)
            AS CHAR
         ) AS maior
         FROM equipamentos
         WHERE codigo REGEXP ?`,
        [PADRAO_CODIGO]
    );

    let proximo;

    try {
        proximo = BigInt(String((linhas[0] && linhas[0].maior) || '0')) + 1n;
    } catch (erro) {
        throw erroHttp(500, 'Não foi possível gerar o código do equipamento.');
    }

    const codigo = `FA-${proximo.toString().padStart(6, '0')}`;

    if (codigo.length > 20) {
        throw erroHttp(409, 'O limite de códigos de equipamento foi atingido.');
    }

    return codigo;
}

function validarFiltros(entrada) {
    const filtros = corpo(entrada);
    camposPermitidos(filtros, ['busca', 'cliente_id', 'status', 'tipo']);

    const status = textoOpcional(filtros.status, 'status', 30);

    if (status && !STATUS.includes(status)) {
        throw erroHttp(400, 'O filtro status é inválido.');
    }

    return {
        busca: textoOpcional(filtros.busca, 'busca', 200) || undefined,
        cliente_id: idPositivo(filtros.cliente_id, 'cliente_id', true) ?? undefined,
        status: status || undefined,
        tipo: textoOpcional(filtros.tipo, 'tipo', 100) || undefined
    };
}

function validarCriacao(entrada) {
    const dados = corpo(entrada);
    camposPermitidos(dados, CAMPOS_CRIACAO);

    return {
        cliente_id: idPositivo(dados.cliente_id, 'cliente_id'),
        tipo: textoObrigatorio(dados.tipo, 'tipo', 100),
        marca: textoObrigatorio(dados.marca, 'marca', 100),
        modelo: textoObrigatorio(dados.modelo, 'modelo', 100),
        capacidade: textoObrigatorio(dados.capacidade, 'capacidade', 50),
        numero_serie: textoOpcional(dados.numero_serie, 'numero_serie', 100) ?? null,
        local: textoObrigatorio(dados.local, 'local', 150),
        data_instalacao: data(dados.data_instalacao, 'data_instalacao'),
        ultima_manutencao: data(dados.ultima_manutencao, 'ultima_manutencao', true) ?? null,
        proxima_manutencao: data(dados.proxima_manutencao, 'proxima_manutencao', true) ?? null,
        status: validarStatusObrigatorio(dados.status),
        observacoes: textoOpcional(dados.observacoes, 'observacoes') ?? null
    };
}

function validarAtualizacao(entrada) {
    const dados = corpo(entrada);
    camposPermitidos(dados, Object.keys(COLUNAS_ATUALIZAVEIS));

    if (!Object.keys(dados).length) {
        throw erroHttp(400, 'Informe ao menos um campo para atualizar.');
    }

    const pronto = {};

    if (tem(dados, 'cliente_id')) pronto.cliente_id = idPositivo(dados.cliente_id, 'cliente_id');
    if (tem(dados, 'tipo')) pronto.tipo = textoObrigatorio(dados.tipo, 'tipo', 100);
    if (tem(dados, 'marca')) pronto.marca = textoObrigatorio(dados.marca, 'marca', 100);
    if (tem(dados, 'modelo')) pronto.modelo = textoObrigatorio(dados.modelo, 'modelo', 100);
    if (tem(dados, 'capacidade')) {
        pronto.capacidade = textoObrigatorio(dados.capacidade, 'capacidade', 50);
    }
    if (tem(dados, 'numero_serie')) {
        pronto.numero_serie = textoOpcional(dados.numero_serie, 'numero_serie', 100) ?? null;
    }
    if (tem(dados, 'local')) pronto.local = textoObrigatorio(dados.local, 'local', 150);
    if (tem(dados, 'data_instalacao')) {
        pronto.data_instalacao = data(dados.data_instalacao, 'data_instalacao');
    }
    if (tem(dados, 'ultima_manutencao')) {
        pronto.ultima_manutencao = data(
            dados.ultima_manutencao,
            'ultima_manutencao',
            true
        ) ?? null;
    }
    if (tem(dados, 'proxima_manutencao')) {
        pronto.proxima_manutencao = data(
            dados.proxima_manutencao,
            'proxima_manutencao',
            true
        ) ?? null;
    }
    if (tem(dados, 'status')) pronto.status = validarStatusObrigatorio(dados.status);
    if (tem(dados, 'observacoes')) {
        pronto.observacoes = textoOpcional(dados.observacoes, 'observacoes') ?? null;
    }

    return pronto;
}

function validarStatusObrigatorio(valor) {
    const pronto = textoObrigatorio(valor, 'status', 30);

    if (!STATUS.includes(pronto)) {
        throw erroHttp(400, 'O campo status é inválido.');
    }

    return pronto;
}

function traduzirErroEscrita(erro) {
    if (erro && erro.status) return erro;

    if (erroBanco(erro, 'ER_NO_REFERENCED_ROW_2') ||
        erroBanco(erro, 'ER_NO_REFERENCED_ROW')) {
        return erroHttp(404, 'Cliente não encontrado.');
    }

    if (erroBanco(erro, 'ER_DUP_ENTRY')) {
        return erroHttp(409, 'Já existe um equipamento com este código.');
    }

    return erro;
}

function equipamentoNaoEncontrado() {
    return erroHttp(404, 'Equipamento não encontrado.');
}

function tem(objeto, campo) {
    return Object.prototype.hasOwnProperty.call(objeto, campo);
}

module.exports = { listar, obter, criar, atualizar, remover };
