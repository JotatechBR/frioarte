const bcrypt = require('bcryptjs');

const pool = require('../db').pool;
const { erroHttp, erroBanco } = require('../shared/erroHttp');

const CUSTO_HASH = 12;
const COLUNAS_PUBLICAS = 'id, usuario, nome, funcao, ativo';

async function listar(filtros) {
    const condicoes = [];
    const valores = [];

    if (filtros.busca) {
        const busca = `%${filtros.busca}%`;

        condicoes.push('(usuario LIKE ? OR nome LIKE ? OR funcao LIKE ?)');
        valores.push(busca, busca, busca);
    }

    if (filtros.ativo !== undefined) {
        condicoes.push('ativo = ?');
        valores.push(filtros.ativo ? 1 : 0);
    }

    if (filtros.funcao) {
        condicoes.push('funcao = ?');
        valores.push(filtros.funcao);
    }

    const onde = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : '';
    const [linhas] = await pool.execute(
        `SELECT ${COLUNAS_PUBLICAS} FROM usuarios${onde} ORDER BY nome, id`,
        valores
    );

    return linhas.map(publicar);
}

async function obterPorId(id) {
    const usuario = await procurarPorId(id);

    if (!usuario) throw erroHttp(404, 'Usuário não encontrado.');

    return usuario;
}

async function criar(dados) {
    await conferirDuplicidade(dados.usuario);

    const senhaHash = await bcrypt.hash(dados.senha, CUSTO_HASH);

    try {
        const [resultado] = await pool.execute(
            `INSERT INTO usuarios (usuario, senha_hash, nome, funcao, ativo)
             VALUES (?, ?, ?, ?, ?)`,
            [dados.usuario, senhaHash, dados.nome, dados.funcao, dados.ativo ? 1 : 0]
        );

        return obterPorId(resultado.insertId);
    } catch (erro) {
        traduzirDuplicidade(erro);
        throw erro;
    }
}

async function atualizar(id, dados) {
    await obterPorId(id);

    if (dados.usuario !== undefined) {
        await conferirDuplicidade(dados.usuario, id);
    }

    const alteracoes = [];
    const valores = [];

    if (dados.usuario !== undefined) adicionar(alteracoes, valores, 'usuario', dados.usuario);
    if (dados.nome !== undefined) adicionar(alteracoes, valores, 'nome', dados.nome);
    if (dados.funcao !== undefined) adicionar(alteracoes, valores, 'funcao', dados.funcao);
    if (dados.ativo !== undefined) adicionar(alteracoes, valores, 'ativo', dados.ativo ? 1 : 0);

    if (dados.senha !== undefined) {
        const senhaHash = await bcrypt.hash(dados.senha, CUSTO_HASH);
        adicionar(alteracoes, valores, 'senha_hash', senhaHash);
    }

    valores.push(id);

    try {
        await pool.execute(
            `UPDATE usuarios SET ${alteracoes.join(', ')} WHERE id = ?`,
            valores
        );
    } catch (erro) {
        traduzirDuplicidade(erro);
        throw erro;
    }

    return obterPorId(id);
}

async function atualizarStatus(id, ativo) {
    await obterPorId(id);

    await pool.execute(
        'UPDATE usuarios SET ativo = ? WHERE id = ?',
        [ativo ? 1 : 0, id]
    );

    return obterPorId(id);
}

async function excluir(id) {
    const usuario = await obterPorId(id);

    try {
        const [resultado] = await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);

        if (resultado.affectedRows === 0) {
            throw erroHttp(404, 'Usuário não encontrado.');
        }

        return usuario;
    } catch (erro) {
        if (erroBanco(erro, 'ER_ROW_IS_REFERENCED_2') ||
            erroBanco(erro, 'ER_ROW_IS_REFERENCED')) {
            throw erroHttp(
                409,
                'Não é possível excluir este usuário porque existem visitas vinculadas.'
            );
        }

        throw erro;
    }
}

async function procurarPorId(id) {
    const [linhas] = await pool.execute(
        `SELECT ${COLUNAS_PUBLICAS} FROM usuarios WHERE id = ? LIMIT 1`,
        [id]
    );

    return linhas.length ? publicar(linhas[0]) : null;
}

async function conferirDuplicidade(usuario, ignorarId) {
    const valores = [usuario];
    let sql = 'SELECT id FROM usuarios WHERE usuario = ?';

    if (ignorarId !== undefined) {
        sql += ' AND id <> ?';
        valores.push(ignorarId);
    }

    sql += ' LIMIT 1';

    const [linhas] = await pool.execute(sql, valores);

    if (linhas.length) {
        throw erroHttp(409, 'Já existe um usuário com esse nome de acesso.');
    }
}

function adicionar(alteracoes, valores, coluna, valor) {
    alteracoes.push(`${coluna} = ?`);
    valores.push(valor);
}

function traduzirDuplicidade(erro) {
    if (erroBanco(erro, 'ER_DUP_ENTRY')) {
        throw erroHttp(409, 'Já existe um usuário com esse nome de acesso.');
    }
}

function publicar(linha) {
    return {
        id: Number(linha.id),
        usuario: linha.usuario,
        nome: linha.nome,
        funcao: linha.funcao,
        ativo: Number(linha.ativo) === 1
    };
}

module.exports = {
    listar,
    obterPorId,
    criar,
    atualizar,
    atualizarStatus,
    excluir
};
