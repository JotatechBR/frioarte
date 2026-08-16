const fs = require('fs');
const path = require('path');

const { exigirSessaoPagina } = require('./middleware/exigirSessao');
const { ehAdministrador } = require('./middleware/exigirAdministrador');

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
 *
 * `admin: true` diz que a tela é de administrador. É só uma tela hoje, e ainda
 * assim a marca fica na tabela e não num `if` solto: quando aparecer a segunda,
 * a regra já está no lugar onde se procura por ela.
 */
const PAGINAS = {
    painel: { titulo: 'Visão geral', secao: 'painel' },
    clientes: { titulo: 'Clientes', secao: 'clientes' },
    cliente: { titulo: 'Cliente', secao: 'clientes', estilo: 'clientes' },
    equipamentos: { titulo: 'Equipamentos', secao: 'equipamentos' },
    equipamento: { titulo: 'Equipamento', secao: 'equipamentos', estilo: 'equipamentos' },
    visitas: { titulo: 'Visitas técnicas', secao: 'visitas' },
    usuarios: { titulo: 'Usuários', secao: 'usuarios', admin: true }
};

const cache = new Map();

function registrarPaginasSistema(app) {
    entregar(app, '/sistema', 'painel');

    entregar(app, '/sistema/clientes', 'clientes');
    entregar(app, '/sistema/clientes/:id', 'cliente');

    entregar(app, '/sistema/equipamentos', 'equipamentos');
    entregar(app, '/sistema/equipamentos/:codigo', 'equipamento');

    entregar(app, '/sistema/visitas', 'visitas');

    entregar(app, '/sistema/usuarios', 'usuarios');
}

/**
 * Toda tela do sistema passa pela sessão antes de ser montada. Servir o HTML e
 * deixar a API recusar depois entregaria a estrutura da ferramenta a quem não
 * entrou — e a pessoa veria a tela piscar e esvaziar, em vez de ir para o login.
 *
 * Quem entrou mas não manda não leva um 403 na cara: vai para o painel. A tela
 * restrita nem aparece no menu dele, então chegar aqui significa endereço
 * digitado à mão — e a resposta certa para isso é "esta porta não é sua", não
 * uma página de erro.
 */
function entregar(app, rota, nome) {
    app.get(rota, exigirSessaoPagina, (req, res) => {
        const administrador = ehAdministrador(req.usuario);

        if (PAGINAS[nome].admin && !administrador) return res.redirect(302, '/sistema');

        res.type('html').send(montar(nome, administrador));
    });
}

/**
 * O layout sai do servidor já sabendo se quem pediu é administrador. Poderia
 * ser o JavaScript escondendo o item depois de perguntar quem está logado — mas
 * aí o menu de administração pisca na tela de todo mundo antes de sumir, e um
 * item que aparece e desaparece é pior do que um item que nunca esteve lá.
 *
 * Por isso o cache é por tela *e* por papel: são duas montagens diferentes do
 * mesmo arquivo.
 */
function montar(nome, administrador) {
    const chave = `${nome}:${administrador ? 'admin' : 'comum'}`;

    if (PRODUCAO && cache.has(chave)) return cache.get(chave);

    const pagina = PAGINAS[nome];
    const estilo = pagina.estilo || nome;
    const script = pagina.script || nome;

    const layout = fs.readFileSync(LAYOUT, 'utf8');
    const conteudo = fs.readFileSync(path.join(HTML, `${nome}.html`), 'utf8');

    const pronto = layout
        .replace(/{{titulo}}/g, pagina.titulo)
        .replace(/{{secao}}/g, pagina.secao)
        .replace(/{{admin}}/g, administrador ? 'true' : 'false')
        .replace(/{{estilo}}/g, `/css/sistema_css/${estilo}.css`)
        .replace(/{{script}}/g, `/js/sistema_js/${script}.js`)
        .replace('{{conteudo}}', conteudo);

    if (PRODUCAO) cache.set(chave, pronto);

    return pronto;
}

module.exports = { registrarPaginasSistema };
