const { pool } = require('../db');
const { erroHttp } = require('../shared/erroHttp');
const {
    camposPermitidos,
    textoObrigatorio,
    textoOpcional,
    idPositivo,
    data,
    hora,
    codigoEquipamento
} = require('../shared/validacao');

const CAMPOS = [
    'cliente_id',
    'equipamento_codigo',
    'tecnico_id',
    'data',
    'hora',
    'tipo',
    'motivo',
    'observacoes',
    'status'
];

const COLUNAS = `
    v.id,
    v.cliente_id,
    c.nome AS cliente_nome,
    v.equipamento_codigo,
    v.tecnico_id,
    u.nome AS tecnico_nome,
    v.data,
    TIME_FORMAT(v.hora, '%H:%i') AS hora,
    v.tipo,
    v.motivo,
    v.observacoes,
    v.status,
    e.tipo AS equipamento_tipo,
    e.marca AS equipamento_marca,
    e.modelo AS equipamento_modelo,
    e.local AS equipamento_local`;

const JUNCOES = `
    FROM visitas v
    INNER JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN equipamentos e ON e.codigo = v.equipamento_codigo
    LEFT JOIN usuarios u ON u.id = v.tecnico_id`;

async function listar(filtros = {}) {
    const condicoes = [];
    const valores = [];

    filtroId(filtros.cliente_id, 'cliente_id', 'v.cliente_id', condicoes, valores);
    filtroId(filtros.tecnico_id, 'tecnico_id', 'v.tecnico_id', condicoes, valores);

    const equipamento = codigoEquipamento(filtros.equipamento_codigo, true);
    if (equipamento) {
        condicoes.push('v.equipamento_codigo = ?');
        valores.push(equipamento);
    }

    filtroTexto(filtros.status, 'status', 30, 'v.status', condicoes, valores);
    filtroTexto(filtros.tipo, 'tipo', 50, 'v.tipo', condicoes, valores);

    const dia = data(filtros.data, 'data', true);
    const inicio = data(filtros.data_inicio, 'data_inicio', true);
    const fim = data(filtros.data_fim, 'data_fim', true);

    if (inicio && fim && inicio > fim) {
        throw erroHttp(400, 'A data inicial não pode ser posterior à data final.');
    }

    if (dia) {
        condicoes.push('v.data = ?');
        valores.push(dia);
    }
    if (inicio) {
        condicoes.push('v.data >= ?');
        valores.push(inicio);
    }
    if (fim) {
        condicoes.push('v.data <= ?');
        valores.push(fim);
    }

    const onde = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : '';
    const [linhas] = await pool.execute(
        `SELECT ${COLUNAS}${JUNCOES}${onde} ORDER BY v.data, v.hora, v.id`,
        valores
    );

    return linhas;
}

async function obter(id) {
    const visitaId = idPositivo(id);
    const [linhas] = await pool.execute(
        `SELECT ${COLUNAS}${JUNCOES} WHERE v.id = ?`,
        [visitaId]
    );

    if (!linhas.length) throw erroHttp(404, 'Visita não encontrada.');
    return linhas[0];
}

async function criar(corpo) {
    const dados = validar(corpo, true);
    const conexao = await pool.getConnection();
    let id;

    try {
        await conexao.beginTransaction();
        await validarRelacionamentos(conexao, dados);

        const [resultado] = await conexao.execute(
            `INSERT INTO visitas
                (cliente_id, equipamento_codigo, tecnico_id, data, hora, tipo, motivo, observacoes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            CAMPOS.map((campo) => dados[campo])
        );

        id = resultado.insertId;
        await conexao.commit();
    } catch (erro) {
        await desfazer(conexao);
        throw erro;
    } finally {
        conexao.release();
    }

    return obter(id);
}

async function atualizar(id, corpo) {
    const visitaId = idPositivo(id);
    const alteracoes = validar(corpo, false);
    const chaves = Object.keys(alteracoes);

    if (!chaves.length) throw erroHttp(400, 'Informe ao menos um campo para atualizar.');

    const conexao = await pool.getConnection();

    try {
        await conexao.beginTransaction();

        const [linhas] = await conexao.execute(
            `SELECT ${CAMPOS.join(', ')} FROM visitas WHERE id = ? FOR UPDATE`,
            [visitaId]
        );
        if (!linhas.length) throw erroHttp(404, 'Visita não encontrada.');

        const registro = Object.assign({}, linhas[0], alteracoes);
        await validarRelacionamentos(conexao, registro);

        const atribuicoes = chaves.map((campo) => `${campo} = ?`).join(', ');
        const valores = chaves.map((campo) => alteracoes[campo]);
        valores.push(visitaId);

        await conexao.execute(`UPDATE visitas SET ${atribuicoes} WHERE id = ?`, valores);
        await conexao.commit();
    } catch (erro) {
        await desfazer(conexao);
        throw erro;
    } finally {
        conexao.release();
    }

    return obter(visitaId);
}

async function remover(id) {
    const visitaId = idPositivo(id);
    const [resultado] = await pool.execute('DELETE FROM visitas WHERE id = ?', [visitaId]);

    if (!resultado.affectedRows) throw erroHttp(404, 'Visita não encontrada.');
}

function validar(dados, criacao) {
    camposPermitidos(dados, CAMPOS);
    const pronto = {};

    aplicar(pronto, dados, 'cliente_id', criacao, (valor) => idPositivo(valor, 'cliente_id'));
    aplicar(pronto, dados, 'equipamento_codigo', false,
        (valor) => codigoEquipamento(valor, true), criacao ? null : undefined);
    aplicar(pronto, dados, 'tecnico_id', false,
        (valor) => idPositivo(valor, 'tecnico_id', true), criacao ? null : undefined);
    aplicar(pronto, dados, 'data', criacao, (valor) => data(valor, 'data'));
    aplicar(pronto, dados, 'hora', criacao, (valor) => hora(valor));
    aplicar(pronto, dados, 'tipo', criacao, (valor) => textoObrigatorio(valor, 'tipo', 50));
    aplicar(pronto, dados, 'motivo', false,
        (valor) => textoOpcional(valor, 'motivo'), criacao ? null : undefined);
    aplicar(pronto, dados, 'observacoes', false,
        (valor) => textoOpcional(valor, 'observacoes'), criacao ? null : undefined);
    aplicar(pronto, dados, 'status', criacao, (valor) => textoObrigatorio(valor, 'status', 30));

    return pronto;
}

function aplicar(destino, origem, campo, obrigatorio, conversor, padrao) {
    if (Object.prototype.hasOwnProperty.call(origem, campo)) {
        destino[campo] = conversor(origem[campo]);
        return;
    }

    if (obrigatorio) destino[campo] = conversor(undefined);
    else if (padrao !== undefined) destino[campo] = padrao;
}

async function validarRelacionamentos(conexao, dados) {
    const [clientes] = await conexao.execute(
        'SELECT id FROM clientes WHERE id = ? FOR UPDATE',
        [dados.cliente_id]
    );
    if (!clientes.length) throw erroHttp(404, 'Cliente informado não encontrado.');

    if (dados.equipamento_codigo) {
        const [equipamentos] = await conexao.execute(
            'SELECT codigo, cliente_id FROM equipamentos WHERE codigo = ? FOR UPDATE',
            [dados.equipamento_codigo]
        );

        if (!equipamentos.length) throw erroHttp(404, 'Equipamento informado não encontrado.');
        if (Number(equipamentos[0].cliente_id) !== Number(dados.cliente_id)) {
            throw erroHttp(409, 'O equipamento informado não pertence ao cliente da visita.');
        }
    }

    if (dados.tecnico_id) {
        const [usuarios] = await conexao.execute(
            'SELECT id, ativo FROM usuarios WHERE id = ? FOR UPDATE',
            [dados.tecnico_id]
        );

        if (!usuarios.length) throw erroHttp(404, 'Técnico informado não encontrado.');
        if (!Boolean(usuarios[0].ativo)) throw erroHttp(409, 'O técnico informado está inativo.');
    }
}

function filtroId(valor, campo, coluna, condicoes, valores) {
    if (valor === undefined || valor === '') return;
    condicoes.push(`${coluna} = ?`);
    valores.push(idPositivo(valor, campo));
}

function filtroTexto(valor, campo, maximo, coluna, condicoes, valores) {
    const pronto = textoOpcional(valor, campo, maximo);
    if (!pronto) return;
    condicoes.push(`${coluna} = ?`);
    valores.push(pronto);
}

async function desfazer(conexao) {
    try {
        await conexao.rollback();
    } catch (erro) {
        // O erro original é o que explica a falha; rollback é apenas limpeza.
    }
}

module.exports = { listar, obter, criar, atualizar, remover };
