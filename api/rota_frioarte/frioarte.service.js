const fs = require('fs');
const path = require('path');

const FRIOARTE = require('../shared/frioarte.dados');
const funcionamento = require('../shared/funcionamento');

const PUBLICO = path.join(__dirname, '..', '..', 'public');

/**
 * Monta o perfil público da empresa.
 *
 * Os links de contato são derivados aqui, e não no frontend, para que telefone e
 * endereço existam em um único lugar do projeto.
 *
 * As fotos passam por `foto()`: o caminho declarado nos dados só vira imagem se
 * o arquivo realmente existir em /public. É o que permite ao site nascer sem
 * nenhuma fotografia e ir se completando — basta soltar o arquivo na pasta com
 * o nome previsto, sem editar código nenhum. Enquanto ele não existe, a cena
 * usa a composição alternativa em vez de apontar para uma imagem quebrada.
 */
function obterPerfil() {
    const { telefone, whatsapp, endereco, nome, redes } = FRIOARTE;

    const saudacao = `Olá! Vim pelo site da ${nome} e gostaria de mais informações.`;

    return {
        ...FRIOARTE,

        servicos: {
            ...FRIOARTE.servicos,
            lista: FRIOARTE.servicos.lista.map(comFoto)
        },

        publicos: FRIOARTE.publicos.map(comFoto),
        projetos: FRIOARTE.projetos.map(comFoto),

        // Estado, frase e horários derivados da grade, no relógio de São Paulo.
        // O frontend pinta o indicador a partir de `aberto`, sem ler texto.
        funcionamento: funcionamento.calcular(FRIOARTE.funcionamento),

        links: {
            ligar: `tel:${telefone.discagem}`,
            whatsapp: montarWhatsapp(whatsapp.numero, saudacao),
            rotas: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${nome}, ${endereco.completo}`
            )}`,
            instagram: redes.instagram
                ? `https://instagram.com/${redes.instagram.replace('@', '')}`
                : null
        }
    };
}

/**
 * Devolve o item com a foto confirmada — ou sem foto, se o arquivo não existe.
 *
 * `imagemWebp` é o mesmo arquivo em WebP, gerado por `npm run imagens`. Vem
 * separado, e não no lugar do JPG, porque o `<picture>` precisa dos dois: o
 * WebP é a oferta, o JPG é a garantia para quem não o lê. Se o WebP ainda não
 * foi gerado, o campo é `null` e a página serve o JPG direto.
 */
function comFoto(item) {
    const imagem = foto(item.imagem);

    return {
        ...item,
        imagem,
        imagemWebp: imagem ? foto(imagem.replace(/\.jpe?g$/i, '.webp')) : null
    };
}

/**
 * Só um caminho relativo a /public é aceito. `..` e caminho absoluto são
 * recusados: este dado vira `src` no HTML, e um caminho que escapa da pasta
 * pública não deveria conseguir sair daqui nem por engano de digitação.
 */
function foto(caminho) {
    if (!caminho || typeof caminho !== 'string') return null;

    const relativo = caminho.replace(/^\/+/, '');
    const destino = path.resolve(PUBLICO, relativo);

    if (!destino.startsWith(PUBLICO + path.sep)) return null;

    return fs.existsSync(destino) ? caminho : null;
}

/** O texto vai pré-preenchido para a pessoa não precisar escrever do zero. */
function montarWhatsapp(numero, texto) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

module.exports = { obterPerfil, montarWhatsapp };
