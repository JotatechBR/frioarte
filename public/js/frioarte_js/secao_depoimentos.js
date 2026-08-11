/**
 * Cena 08 — depoimentos.
 *
 * São as duas avaliações reais, e continuam sendo duas: a primeira ocupa a
 * cena, a segunda entra em escala menor. Hierarquia entre vozes verdadeiras é
 * melhor do que inventar uma terceira para fechar a grade.
 */

window.FrioArteRegistro.registrar('depoimentos', { precisaDados: true }, (perfil) => {
    const { lista, escapar } = window.FrioArteDom;

    lista(
        'depoimentos',
        perfil.avaliacoes,
        (item) => `
            <li data-revelar="subir">
                <blockquote class="depoimento__texto">“${escapar(item.texto)}”</blockquote>
                <p class="depoimento__fonte">
                    ${item.autor ? `<span class="depoimento__autor">${escapar(item.autor)}</span>` : ''}
                    ${escapar(item.fonte)}
                </p>
            </li>`
    );
});
