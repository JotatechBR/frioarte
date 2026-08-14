const pool = require('../db').pool;
const { erroHttp, erroBanco } = require('../shared/erroHttp');

const COLUNAS = [
    'id',
    'tipo',
    'nome',
    'documento',
    'telefone',
    'whatsapp',
    'email',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'estado',
    'cliente_desde',
    'status',
    'observacoes'
];

const CAMPOS_GRAVAVEIS = COLUNAS.filter((coluna) => coluna !== 'id');
const SELECAO = COLUNAS.map((coluna) => `c.${coluna}`).join(', ');

async function listar(filtros) {
    const condicoes = [];
    const parametros = [];

    if (filtros.busca) {
        condicoes.push(
            `(c.nome LIKE CONCAT('%', ?, '%') OR ` +
            `c.documento LIKE CONCAT('%', ?, '%') OR ` +
            `c.telefone LIKE CONCAT('%', ?, '%') OR ` +
            `c.whatsapp LIKE CONCAT('%', ?, '%'))`
        );
        parametros.push(filtros.busca, filtros.busca, filtros.busca, filtros.busca);
    }

    adicionarFiltroExato(condicoes, parametros, 'c.status', filtros.status);
    adicionarFiltroExato(condicoes, parametros, 'c.tipo', filtros.tipo);
    adicionarFiltroExato(condicoes, parametros, 'c.cidade', filtros.cidade);
    adicionarFiltroExato(condicoes, parametros, 'c.estado', filtros.estado);

    let sql = `SELECT ${SELECAO} FROM clientes c`;
    if (condicoes.length) sql += ` WHERE ${condicoes.join(' AND ')}`;
    sql += ' ORDER BY c.nome ASC, c.id ASC';

    const [linhas] = await pool.execute(sql, parametros);
    return linhas;
}

async function obterPorId(id) {
    const [linhas] = await pool.execute(
        `SELECT ${SELECAO} FROM clientes c WHERE c.id = ?`,
        [id]
    );

    if (!linhas.length) throw erroHttp(404, 'Cliente não encontrado.');
    return linhas[0];
}

async function criar(dados) {
    const marcadores = CAMPOS_GRAVAVEIS.map(() => '?').join(', ');
    const valores = CAMPOS_GRAVAVEIS.map((campo) => dados[campo] ?? null);
    const [resultado] = await pool.execute(
        `INSERT INTO clientes (${CAMPOS_GRAVAVEIS.join(', ')}) VALUES (${marcadores})`,
        valores
    );

    return obterPorId(resultado.insertId);
}

async function atualizar(id, dados) {
    const campos = CAMPOS_GRAVAVEIS.filter((campo) =>
        Object.prototype.hasOwnProperty.call(dados, campo)
    );

    if (!campos.length) {
        throw erroHttp(400, 'Informe ao menos um campo para atualizar.');
    }

    const atribuicoes = campos.map((campo) => `${campo} = ?`).join(', ');
    const valores = campos.map((campo) => dados[campo] ?? null);

    await pool.execute(
        `UPDATE clientes SET ${atribuicoes} WHERE id = ?`,
        [...valores, id]
    );

    return obterPorId(id);
}

async function excluir(id) {
    try {
        const [resultado] = await pool.execute('DELETE FROM clientes WHERE id = ?', [id]);

        if (!resultado.affectedRows) throw erroHttp(404, 'Cliente não encontrado.');
    } catch (erro) {
        if (erroBanco(erro, 'ER_ROW_IS_REFERENCED_2') ||
            erroBanco(erro, 'ER_ROW_IS_REFERENCED')) {
            throw erroHttp(
                409,
                'Não é possível excluir este cliente porque existem equipamentos ou visitas vinculados.'
            );
        }

        throw erro;
    }
}

function adicionarFiltroExato(condicoes, parametros, coluna, valor) {
    if (valor === undefined || valor === null) return;

    condicoes.push(`${coluna} = ?`);
    parametros.push(valor);
}

module.exports = { listar, obterPorId, criar, atualizar, excluir };
