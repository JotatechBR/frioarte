/**
 * Marcação da seção atual no menu — "onde estou" respondido sem esforço.
 *
 * Observa as seções do HTML, então não depende da API.
 */

window.FrioArteRegistro.registrar('navegacao', () => {
    const nav = document.querySelector('[data-nav]');
    if (!nav || !('IntersectionObserver' in window)) return;

    const elos = new Map();

    nav.querySelectorAll('a[href^="#"]').forEach((elo) => {
        const secao = document.querySelector(elo.getAttribute('href'));
        if (secao) elos.set(secao, elo);
    });

    if (elos.size === 0) return;

    const visiveis = new Set();

    const observador = new IntersectionObserver(
        (entradas) => {
            entradas.forEach((entrada) => {
                if (entrada.isIntersecting) visiveis.add(entrada.target);
                else visiveis.delete(entrada.target);
            });

            // A seção marcada é a mais alta entre as que estão na tela.
            let atual = null;

            elos.forEach((_, secao) => {
                if (!visiveis.has(secao)) return;
                if (!atual || secao.offsetTop < atual.offsetTop) atual = secao;
            });

            elos.forEach((elo, secao) => {
                elo.dataset.atual = secao === atual ? 'true' : 'false';
            });
        },
        { rootMargin: '-30% 0px -55% 0px' }
    );

    elos.forEach((_, secao) => observador.observe(secao));
});
