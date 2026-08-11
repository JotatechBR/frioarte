/**
 * Resposta ao toque: o elemento reage no pointerdown, não na soltura.
 *
 * Também cancela quando o dedo sai do alvo e volta a reagir se ele retornar,
 * com uma folga de alguns pixels ao redor do botão.
 */

const FOLGA = 10;

function ativarPressao(raiz = document) {
    raiz.querySelectorAll('[data-pressionavel]').forEach(preparar);
}

function preparar(elemento) {
    if (elemento.dataset.pressaoAtiva === 'true') return;
    elemento.dataset.pressaoAtiva = 'true';

    elemento.addEventListener('pointerdown', (evento) => {
        elemento.setPointerCapture(evento.pointerId);
        marcar(elemento, true);
    });

    elemento.addEventListener('pointermove', (evento) => {
        if (!elemento.hasPointerCapture(evento.pointerId)) return;
        marcar(elemento, dentro(elemento, evento));
    });

    const soltar = () => marcar(elemento, false);

    elemento.addEventListener('pointerup', soltar);
    elemento.addEventListener('pointercancel', soltar);
    elemento.addEventListener('lostpointercapture', soltar);
}

function marcar(elemento, pressionado) {
    elemento.dataset.pressionado = pressionado ? 'true' : 'false';
}

function dentro(elemento, evento) {
    const caixa = elemento.getBoundingClientRect();

    return (
        evento.clientX >= caixa.left - FOLGA &&
        evento.clientX <= caixa.right + FOLGA &&
        evento.clientY >= caixa.top - FOLGA &&
        evento.clientY <= caixa.bottom + FOLGA
    );
}

window.FrioArtePressao = { ativarPressao };
