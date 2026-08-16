/**
 * A cabeça da home: canonical, Open Graph, Twitter Card e dados estruturados.
 *
 * Tudo é montado a partir de `frioarte.dados.js`. O HTML não repete endereço,
 * telefone nem horário — repetir seria criar uma segunda verdade que envelhece
 * sozinha, e é justamente o que o projeto evita em todo o resto.
 *
 * Por que no servidor e não por JavaScript na página: quem lê estas tags é
 * robô de busca e prévia de link (WhatsApp, Instagram, Facebook). Boa parte
 * deles não executa script nenhum — se a tag não vier no HTML da resposta,
 * para eles ela não existe.
 */

const FRIOARTE = require('./frioarte.dados');
const funcionamento = require('./funcionamento');

const TITULO = 'Frio Arte Ar Condicionado — Climatização em São Paulo';

const DESCRICAO =
    'Instalação, manutenção preventiva e corretiva, higienização, carga de gás, ' +
    'venda e desinstalação de ar-condicionado. Penha, Vila Salete e São Paulo capital.';

/** Imagem da prévia: é ela que aparece quando o link é colado no WhatsApp. */
const PREVIA = { caminho: '/midias/frioarte-og.jpg', largura: 1200, altura: 630 };

/** Devolve o bloco pronto para entrar no lugar do marcador `<!-- SEO -->`. */
function montarCabeca() {
    const base = FRIOARTE.site.dominio;
    const previa = base + PREVIA.caminho;

    const marcas = [
        tag('link', { rel: 'canonical', href: base + '/' }),

        comentario('Prévia do link — WhatsApp, Instagram, Facebook, LinkedIn'),
        meta('og:locale', 'pt_BR', true),
        meta('og:type', 'website', true),
        meta('og:site_name', FRIOARTE.nome, true),
        meta('og:title', TITULO, true),
        meta('og:description', DESCRICAO, true),
        meta('og:url', base + '/', true),
        meta('og:image', previa, true),
        meta('og:image:width', String(PREVIA.largura), true),
        meta('og:image:height', String(PREVIA.altura), true),
        meta('og:image:alt', `${FRIOARTE.nome} — climatização em São Paulo`, true),

        meta('twitter:card', 'summary_large_image'),
        meta('twitter:title', TITULO),
        meta('twitter:description', DESCRICAO),
        meta('twitter:image', previa),

        comentario('Dados estruturados — busca local do Google'),
        `<script type="application/ld+json">${json(montarNegocio(base, previa))}</script>`
    ];

    return marcas.join('\n    ');
}

/**
 * O negócio em schema.org.
 *
 * `HVACBusiness` é o tipo específico para climatização — mais preciso que
 * `LocalBusiness` genérico e reconhecido pelo Google para busca local.
 *
 * Nota deliberada: a nota do Google (4,2 em 12 avaliações) NÃO entra como
 * `aggregateRating`. A própria empresa marcando a própria nota é "avaliação
 * de si mesmo" na política do Google — não gera estrela na busca e pode render
 * aviso no Search Console. A nota continua visível na página para quem lê; ela
 * só não é declarada como dado estruturado.
 */
function montarNegocio(base, previa) {
    const { nome, empresa, endereco, telefone, atendimento, servicos, redes } = FRIOARTE;

    const horarios = funcionamento.calcular(FRIOARTE.funcionamento).horarios;

    return limpar({
        '@context': 'https://schema.org',
        '@type': 'HVACBusiness',
        '@id': `${base}/#empresa`,

        name: nome,
        legalName: empresa.razaoSocial,
        taxID: empresa.cnpj,
        description: DESCRICAO,

        url: `${base}/`,
        image: previa,
        logo: `${base}/midias/frioarte-marca.png`,
        telephone: telefone.discagem,

        address: {
            '@type': 'PostalAddress',
            streetAddress: `${endereco.logradouro} - ${endereco.bairro}`,
            addressLocality: endereco.cidade,
            addressRegion: endereco.uf,
            postalCode: endereco.cep,
            addressCountry: endereco.pais
        },

        areaServed: [
            { '@type': 'City', name: 'São Paulo' },
            { '@type': 'Place', name: atendimento.detalhe }
        ],

        openingHours: horarios,

        // O que a empresa faz, item a item — os mesmos sete serviços da página.
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: `Serviços — ${nome}`,
            itemListElement: servicos.lista.map((servico) => ({
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'Service',
                    name: servico.titulo,
                    description: servico.resumo
                }
            }))
        },

        sameAs: redes.instagram
            ? [`https://instagram.com/${redes.instagram.replace('@', '')}`]
            : undefined
    });
}

/** Remove as chaves sem valor, para o JSON não carregar campo vazio. */
function limpar(objeto) {
    return Object.fromEntries(
        Object.entries(objeto).filter(([, valor]) => valor !== undefined && valor !== null)
    );
}

/**
 * `</script>` dentro de uma string fecharia o bloco JSON-LD antes da hora.
 * Escapar a barra resolve sem mudar o valor lido pelo parser.
 */
function json(objeto) {
    return JSON.stringify(objeto).replace(/<\//g, '<\\/');
}

function meta(nome, conteudo, propriedade = false) {
    return tag('meta', { [propriedade ? 'property' : 'name']: nome, content: conteudo });
}

function tag(nome, atributos) {
    const partes = Object.entries(atributos)
        .map(([chave, valor]) => `${chave}="${escapar(valor)}"`)
        .join(' ');

    return `<${nome} ${partes}>`;
}

function comentario(texto) {
    return `\n    <!-- ${texto} -->`;
}

function escapar(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = { montarCabeca, TITULO, DESCRICAO };
