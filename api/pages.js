const fs = require('fs');
const path = require('path');

const seo = require('./shared/seo');
const FRIOARTE = require('./shared/frioarte.dados');

const HTML = path.join(__dirname, '..', 'public', 'html', 'frioarte_html');

/** O arquivo de conteúdo: sua data de alteração é o `lastmod` honesto do site. */
const DADOS = path.join(__dirname, 'shared', 'frioarte.dados.js');

/** Onde a cabeça montada pelo servidor entra na home. */
const MARCADOR = '<!-- SEO -->';

/**
 * Em produção a home é montada uma vez e fica em memória; em desenvolvimento
 * cada pedido relê o arquivo, para editar o HTML e dar F5 sem reiniciar nada.
 */
const PRODUCAO = process.env.NODE_ENV === 'production';

let homeEmCache = null;

/** As páginas de verdade. Entra antes das rotas da API. */
function registrarPaginas(app) {
    app.get('/', (req, res) => {
        res.type('html').send(montarHome());
    });

    /*
     * robots.txt e sitemap.xml são servidos por rota, e não como arquivo em
     * /public, para o domínio sair de `frioarte.dados.js` como todo o resto.
     * Um sitemap com o domínio errado é pior do que sitemap nenhum.
     */
    app.get('/robots.txt', (req, res) => {
        res.type('text/plain').send(montarRobots());
    });

    app.get('/sitemap.xml', (req, res) => {
        res.type('application/xml').send(montarSitemap());
    });
}

/**
 * A rede embaixo de tudo: endereço que não é arquivo estático, não é `/` e não
 * é `/api` cai aqui. Precisa ser o último registro do servidor — se viesse
 * antes das rotas, engoliria a API inteira.
 */
function registrarPaginaNaoEncontrada(app) {
    app.use((req, res) => {
        res.status(404).sendFile(path.join(HTML, '404.html'));
    });
}

function montarHome() {
    if (PRODUCAO && homeEmCache) return homeEmCache;

    const bruto = fs.readFileSync(path.join(HTML, 'frioarte.html'), 'utf8');

    if (!bruto.includes(MARCADOR)) {
        // Sem o marcador a página ainda abre; o que se perde é a prévia de link
        // e a busca local. Silenciar isso deixaria o site pior sem aviso.
        console.warn(`[frioarte] marcador ${MARCADOR} não encontrado na home — SEO não injetado`);
        return bruto;
    }

    const pronto = bruto.replace(MARCADOR, seo.montarCabeca());

    if (PRODUCAO) homeEmCache = pronto;

    return pronto;
}

function montarRobots() {
    const base = FRIOARTE.site.dominio;

    return [
        'User-agent: *',
        'Allow: /',
        '',
        // Material interno servido por engano não deveria virar resultado de busca.
        'Disallow: /api/',
        '',
        `Sitemap: ${base}/sitemap.xml`,
        ''
    ].join('\n');
}

/**
 * Site de uma página só — o sitemap tem uma entrada e é isso mesmo.
 *
 * `lastmod` vem da data de alteração do arquivo de conteúdo, não da hora do
 * pedido: dizer ao Google que a página mudou a cada visita é mentira e treina
 * o robô a ignorar o campo.
 */
function montarSitemap() {
    const base = FRIOARTE.site.dominio;
    const alterado = fs.statSync(DADOS).mtime.toISOString().slice(0, 10);

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '    <url>',
        `        <loc>${base}/</loc>`,
        `        <lastmod>${alterado}</lastmod>`,
        '        <changefreq>monthly</changefreq>',
        '        <priority>1.0</priority>',
        '    </url>',
        '</urlset>',
        ''
    ].join('\n');
}

module.exports = { registrarPaginas, registrarPaginaNaoEncontrada };
