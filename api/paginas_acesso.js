const path = require('path');

/**
 * Página de acesso ao sistema interno.
 *
 * Fica entre a home pública e `/sistema`. É uma tela só: não compõe layout como
 * as páginas do sistema, e não recebe SEO como a home — área restrita não é
 * conteúdo de busca (ver o `Disallow` em pages.js e o `noindex` no HTML).
 *
 * **Ainda não existe autenticação.** Esta etapa entrega a porta, não a
 * fechadura: nenhuma sessão é criada aqui e nenhuma rota do sistema é
 * protegida. Quando o banco existir, o formulário passa a falar com
 * `POST /api/auth/login` e esta rota continua exatamente como está.
 */

const HTML = path.join(__dirname, '..', 'public', 'html', 'acesso_html');

function registrarPaginasAcesso(app) {
    app.get('/login', (req, res) => {
        res.sendFile(path.join(HTML, 'login.html'));
    });
}

module.exports = { registrarPaginasAcesso };
