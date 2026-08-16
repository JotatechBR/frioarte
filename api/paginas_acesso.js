const path = require('path');

const { resolver } = require('./middleware/exigirSessao');

/**
 * Página de acesso ao sistema interno.
 *
 * Fica entre a home pública e `/sistema`. É uma tela só: não compõe layout como
 * as páginas do sistema, e não recebe SEO como a home — área restrita não é
 * conteúdo de busca (ver o `Disallow` em pages.js e o `noindex` no HTML).
 *
 * Quem já entrou não vê esta tela: cai direto no sistema. Um formulário de
 * login para quem está logado é um beco — a pessoa digita a senha de novo para
 * chegar onde já podia ter chegado.
 */

const HTML = path.join(__dirname, '..', 'public', 'html', 'acesso_html');

function registrarPaginasAcesso(app) {
    app.get('/login', async (req, res, next) => {
        try {
            const usuario = await resolver(req);

            if (usuario) return res.redirect(302, destinoSeguro(req.query.destino));
        } catch (erro) {
            /*
             * Banco fora do ar não pode esconder a tela de login: sem ela não há
             * nem como tentar entrar quando ele voltar. Segue e serve a página.
             */
        }

        return res.sendFile(path.join(HTML, 'login.html'));
    });
}

/**
 * O `destino` vem da barra de endereços e é, portanto, de quem quiser digitar.
 * Só caminho interno passa: `//outro.site` e `https://outro.site` são desvios
 * para fora disfarçados de caminho relativo.
 */
function destinoSeguro(valor) {
    if (typeof valor !== 'string') return '/sistema';
    if (!valor.startsWith('/') || valor.startsWith('//')) return '/sistema';
    if (!valor.startsWith('/sistema')) return '/sistema';

    return valor;
}

module.exports = { registrarPaginasAcesso, destinoSeguro };
