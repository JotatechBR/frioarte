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

/** Aplica um href a todos os `[data-link="nome"]`. */
function link(nome, destino) {
    if (!destino) return;

    document.querySelectorAll(`[data-link="${nome}"]`).forEach((no) => {
        no.href = destino;
    });
}

window.FrioArteDom = { escapar, campo, campos, lista, link };
