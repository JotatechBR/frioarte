const { erroHttp } = require('../shared/erroHttp');
const diario = require('../shared/diario');

/**
 * A segunda fechadura.
 *
 * `exigirSessao` responde "quem é você"; esta responde "você manda aqui". A
 * diferença importa porque criar e excluir usuário é a única operação do
 * sistema que mexe em quem tem acesso a ele — um técnico que apaga a conta do
 * dono não perde um cadastro, perde o sistema.
 *
 * Não existe coluna de papel na tabela: o que existe é `funcao`, texto livre
 * que já era usado para dizer o cargo ("Técnico", "Administrador"). Em vez de
 * migrar o banco para acrescentar um booleano que diria a mesma coisa em
 * duplicidade, o papel é lido da função — com uma lista explícita do que conta
 * como mando, e comparação sem acento e sem caixa, porque quem cadastrou
 * "Administradora" não deveria perder o acesso por causa da última letra.
 */

const FUNCOES_DE_MANDO = [
    'master',
    'administrador',
    'administradora',
    'admin',
    'dono',
    'dona',
    'proprietario',
    'proprietaria',
    'diretor',
    'diretora',
    'gestor',
    'gestora'
];

/** Sem acento, sem caixa, sem espaço sobrando. */
function normalizar(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase();
}

function ehAdministrador(usuario) {
    if (!usuario) return false;

    return FUNCOES_DE_MANDO.includes(normalizar(usuario.funcao));
}

/**
 * Roda sempre depois de `exigirSessao` — é ela que carimba `req.usuario`.
 * Sozinha esta função barraria todo mundo, o que é o lado certo de falhar.
 */
function exigirAdministrador(req, res, next) {
    if (ehAdministrador(req.usuario)) return next();

    diario.registrar('aviso', 'acesso', 'sem-permissao', {
        rota: req.path,
        usuario: req.usuario && req.usuario.usuario
    });

    return next(erroHttp(
        403,
        'Esta ação é restrita a administradores.',
        'SEM_PERMISSAO'
    ));
}

module.exports = { exigirAdministrador, ehAdministrador, FUNCOES_DE_MANDO };
