/** Nota do Google: número, total, fonte e as estrelas. */

const ESTRELA =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"/></svg>';

window.FrioArteRegistro.registrar('avaliacao', { precisaDados: true }, (perfil) => {
    const { campos } = window.FrioArteDom;
    const { nota, total, fonte } = perfil.avaliacao;

    const notaTexto = nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 });

    campos({ nota: notaTexto, total: String(total), fonte });

    const marcacao = montarEstrelas(nota);

    document.querySelectorAll('[data-estrelas]').forEach((no) => {
        no.innerHTML = marcacao;
        no.setAttribute(
            'aria-label',
            `Nota ${notaTexto} de 5 em ${total} avaliações no ${fonte}`
        );
    });
});

/** Cada estrela é a versão apagada com a acesa recortada por cima. */
function montarEstrelas(nota) {
    let marcacao = '';

    for (let i = 0; i < 5; i += 1) {
        const preenchimento = Math.min(Math.max(nota - i, 0), 1) * 100;

        marcacao +=
            `<span class="estrela">${ESTRELA}` +
            `<span class="estrela__cheia" style="width:${preenchimento}%">${ESTRELA}</span>` +
            '</span>';
    }

    return marcacao;
}
