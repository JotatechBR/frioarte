const bcrypt = require('bcryptjs');

const { pool } = require('../db');
const { erroHttp } = require('../shared/erroHttp');

/**
 * Autenticação.
 *
 * A senha nunca sai da tabela: o que está gravado é o hash bcrypt, e a
 * conferência acontece contra ele. Nenhuma consulta deste arquivo devolve
 * `senha_hash` para fora — ele existe dentro de `autenticar()` e morre ali.
 */

/*
 * Hash descartável, de uma senha aleatória que ninguém conhece. Quando o
 * usuário não existe, a conferência roda contra ele mesmo assim: sem isso, um
 * usuário inexistente responderia na hora e um existente demoraria os ~200ms do
 * bcrypt — o que transforma o tempo de resposta numa lista de quem tem conta.
 */
const HASH_FANTASMA = '$2b$12$DIXAAu8pqsF/LyMMvAA8IOvS2Hc/cpLZtZHz3cJuT.FMptld8KyWC';

/*
 * Uma mensagem só para usuário errado, senha errada e conta desativada. Dizer
 * "senha incorreta" confirma que o usuário existe — e a pessoa que digitou
 * certo não precisa da distinção para nada.
 */
const RECUSA = 'Usuário ou senha inválidos.';

async function autenticar(usuario, senha) {
    const [linhas] = await pool.execute(
        'SELECT id, usuario, senha_hash, nome, funcao, ativo FROM usuarios WHERE usuario = ? LIMIT 1',
        [usuario]
    );

    const encontrado = linhas[0] || null;
    const confere = await bcrypt.compare(senha, encontrado ? encontrado.senha_hash : HASH_FANTASMA);

    if (!encontrado || !confere || Number(encontrado.ativo) !== 1) {
        throw erroHttp(401, RECUSA, 'ACESSO_NEGADO');
    }

    return publicar(encontrado);
}

/**
 * Quem está com a sessão aberta, lido do banco a cada pedido.
 *
 * Devolve null tanto para o id que não existe mais quanto para o usuário
 * desativado: nos dois casos o cookie continua assinado e válido, mas não vale
 * mais nada — e quem chama trata os dois como "não autenticado".
 */
async function porId(id) {
    const [linhas] = await pool.execute(
        'SELECT id, usuario, nome, funcao, ativo FROM usuarios WHERE id = ? LIMIT 1',
        [id]
    );

    const encontrado = linhas[0] || null;
    if (!encontrado || Number(encontrado.ativo) !== 1) return null;

    return publicar(encontrado);
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

module.exports = { autenticar, porId, RECUSA };
