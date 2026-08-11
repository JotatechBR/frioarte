/**
 * Cena 04 — residencial e comercial.
 *
 * Com fotografia: duas imagens grandes sangradas até a borda da tela, com o
 * texto vivendo sobre elas (véu escuro, tinta clara).
 *
 * Sem fotografia: o par vira um díptico de luz — um painel claro e um grafite.
 * A quebra de luz entre os dois diz "são dois mundos diferentes" tão bem quanto
 * as fotos diriam, e é honesta: não exibe moldura vazia esperando material.
 */

const TONS = ['publico--claro', 'publico--escuro'];

window.FrioArteRegistro.registrar('publicos', { precisaDados: true }, (perfil) => {
    const { lista, figura, escapar } = window.FrioArteDom;

    lista(
        'publicos',
        perfil.publicos,
        (publico, indice) => {
            const tom = publico.imagem ? '' : ` publico--tom ${TONS[indice % TONS.length]}`;

            return `
            <article class="publico${tom}">
                ${fundo(publico, figura)}

                <div class="publico__texto">
                    <p class="rotulo publico__rotulo" data-revelar="subir">${escapar(publico.rotulo)}</p>
                    <h2 class="publico__frase" data-revelar="subir">${escapar(publico.frase)}</h2>
                    <p class="publico__apoio" data-revelar="subir">${escapar(publico.apoio)}</p>
                </div>
            </article>`;
        }
    );
});

function fundo(publico, figura) {
    if (!publico.imagem) return '';

    return `
        ${figura(publico, { class: 'publico__foto' })}
        <div class="publico__veu" aria-hidden="true"></div>`;
}
