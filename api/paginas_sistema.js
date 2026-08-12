const fs = require('fs');
const path = require('path');

/**
 * Páginas do sistema interno.
 *
 * O chrome do sistema — barra lateral, cabeçalho, busca global, avisos e a
 * navegação de celular — existe uma única vez, em `layout.html`. Cada tela é só
 * o miolo dela. Montar as duas coisas aqui evita seis cópias do mesmo menu, que
 * é exatamente o tipo de duplicação que sai de sincronia na primeira mudança.
 *
 * Em produção cada página é montada uma vez e fica em memória; em
 * desenvolvimento tudo é relido a cada pedido, para editar o HTML e dar F5.
 */

const HTML = path.join(__dirname, '..', 'public', 'html', 'sistema_html');
const LAYOUT = path.join(HTML, 'layout.html');

const PRODUCAO = process.env.NODE_ENV === 'production';

/**
 * O que cada tela precisa. `estilo` e `script` caem no próprio nome quando não
 * são declarados — telas de detalhe reaproveitam o CSS da listagem irmã.
 */
const PAGINAS = {
    painel: { titulo: 'Visão geral', secao: 'painel' },
    clientes: { titulo: 'Clientes', secao: 'clientes' },
    cliente: { titulo: 'Cliente', secao: 'clientes', estilo: 'clientes' },
    equipamentos: { titulo: 'Equipamentos', secao: 'equipamentos' },
    equipamento: { titulo: 'Equipamento', secao: 'equipamentos', estilo: 'equipamentos' },
    visitas: { titulo: 'Visitas técnicas', secao: 'visitas' }
};

const cache = new Map();

function registrarPaginasSistema(app) {
    entregar(app, '/sistema', 'painel');

    entregar(app, '/sistema/clientes', 'clientes');
    entregar(app, '/sistema/clientes/:id', 'cliente');

    entregar(app, '/sistema/equipamentos', 'equipamentos');
    entregar(app, '/sistema/equipamentos/:codigo', 'equipamento');

    entregar(app, '/sistema/visitas', 'visitas');
}

function entregar(app, rota, nome) {
    app.get(rota, (req, res) => {
        res.type('html').send(montar(nome));
    });
}

function montar(nome) {
    if (PRODUCAO && cache.has(nome)) return cache.get(nome);

    const pagina = PAGINAS[nome];
    const estilo = pagina.estilo || nome;
    const script = pagina.script || nome;

    const layout = fs.readFileSync(LAYOUT, 'utf8');
    const conteudo = fs.readFileSync(path.join(HTML, `${nome}.html`), 'utf8');

    const pronto = layout
        .replace(/{{titulo}}/g, pagina.titulo)
        .replace(/{{secao}}/g, pagina.secao)
        .replace(/{{estilo}}/g, `/css/sistema_css/${estilo}.css`)
        .replace(/{{script}}/g, `/js/sistema_js/${script}.js`)
        .replace('{{conteudo}}', conteudo);

    if (PRODUCAO) cache.set(nome, pronto);

    return pronto;
}

module.exports = { registrarPaginasSistema };
