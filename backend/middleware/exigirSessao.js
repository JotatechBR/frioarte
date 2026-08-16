const sessao = require('../shared/sessao');
const acesso = require('../rota_acesso/acesso.service');
const { erroHttp } = require('../shared/erroHttp');
const diario = require('../shared/diario');

/**
 * A fechadura.
 *
 * Duas portas usam a mesma chave e precisam de respostas diferentes: a API
 * responde 401 em JSON, porque quem a chama é código; a página responde um
 * desvio para `/login`, porque quem a abre é gente — e gente diante de um JSON
 * de erro não sabe o que fazer.
 *
 * Nos dois casos o usuário sai carimbado em `req.usuario`, já lido do banco.
 */

async function resolver(req) {
    const id = sessao.idDoPedido(req);
    if (!id) return null;

    const usuario = await acesso.porId(id);

    if (usuario) req.usuario = usuario;

    return usuario;
}

/** Protege as rotas de dados. */
async function exigirSessao(req, res, next) {
    try {
        const usuario = await resolver(req);

        if (!usuario) {
            // O cookie que não vale mais é lixo: apagá-lo evita que o navegador
            // continue mandando um token morto em todo pedido.
            sessao.limparCookie(res);
            diario.registrar('aviso', 'acesso', 'sem-sessao', { rota: req.path });

            return next(erroHttp(401, 'Sessão expirada ou inexistente.', 'SEM_SESSAO'));
        }

        return next();
    } catch (erro) {
        return next(erro);
    }
}

/** Protege as páginas do sistema. */
async function exigirSessaoPagina(req, res, next) {
    try {
        const usuario = await resolver(req);

        if (!usuario) {
            sessao.limparCookie(res);

            /*
             * O endereço pedido volta no `destino` para a pessoa cair onde
             * queria depois de entrar, e não sempre no painel. Só o caminho —
             * nunca um endereço completo, que viraria um desvio aberto para
             * fora do sistema.
             */
            const destino = encodeURIComponent(req.originalUrl || '/sistema');

            return res.redirect(302, `/login?destino=${destino}`);
        }

        return next();
    } catch (erro) {
        return next(erro);
    }
}

module.exports = { exigirSessao, exigirSessaoPagina, resolver };
