/**
 * Operações de DOM usadas pelos módulos de seção.
 *
 * Só manipulação genérica mora aqui — nada que saiba o que é "serviço" ou
 * "projeto". Cada seção traz o próprio conteúdo e usa estas peças.
 */

/**
 * Escapa também aspas: além do texto, o valor entra em atributos (src, alt,
 * id, value). Sem isso, uma aspa numa legenda quebraria o atributo.
 */
function escapar(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Preenche todos os `[data-campo="nome"]` da página. */
function campo(nome, valor) {
    document.querySelectorAll(`[data-campo="${nome}"]`).forEach((no) => {
        no.textContent = valor;
    });
}

/** Preenche vários campos de uma vez, a partir de um objeto. */
function campos(mapa) {
    Object.entries(mapa).forEach(([nome, valor]) => campo(nome, valor));
}

/** Monta o conteúdo de um `[data-lista="nome"]`. Devolve false se não existir. */
function lista(nome, itens, montarItem) {
    const alvo = document.querySelector(`[data-lista="${nome}"]`);
    if (!alvo) return false;

    alvo.innerHTML = itens.map(montarItem).join('');
    return true;
}

/**
 * Monta a foto de uma seção, em WebP quando existe e em JPG sempre.
 *
 * O `<picture>` é a única forma de oferecer WebP sem apostar que o navegador
 * o entende: quem lê o formato pega o `<source>`, quem não lê cai no `<img>`,
 * e nenhum dos dois baixa o arquivo do outro. Sem `imagemWebp` — foto nova
 * cuja conversão ainda não rodou — devolve o `<img>` puro, sem embrulho.
 *
 * `atributos` entra no `<img>`, que é o elemento que o CSS e o JS enxergam.
 */
function figura(item, atributos = {}) {
    if (!item || !item.imagem) return '';

    const pares = { loading: 'lazy', decoding: 'async', ...atributos };

    const extras = Object.entries(pares)
        .filter(([, valor]) => valor !== null && valor !== undefined && valor !== false)
        .map(([chave, valor]) => `${chave}="${escapar(valor)}"`)
        .join(' ');

    const img =
        `<img src="${escapar(item.imagem)}" alt="${escapar(item.alt || '')}" ${extras}>`;

    if (!item.imagemWebp) return img;

    return (
        '<picture>' +
        `<source type="image/webp" srcset="${escapar(item.imagemWebp)}">` +
        img +
        '</picture>'
    );
}

/** Aplica um href a todos os `[data-link="nome"]`. */
function link(nome, destino) {
    if (!destino) return;

    document.querySelectorAll(`[data-link="${nome}"]`).forEach((no) => {
        no.href = destino;
    });
}

window.FrioArteDom = { escapar, campo, campos, lista, figura, link };
