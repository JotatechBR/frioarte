/**
 * Revelação ao rolar.
 *
 * Três gestos, um por natureza de conteúdo — `linha` para título, `subir` para
 * apoio, `foto` para imagem. Um bloco revelado não volta a esconder: reaparecer
 * seria movimento sem função.
 *
 * O estado inicial (invisível) só existe quando <html> tem `data-cena`, marcado
 * por um script curto no <head>. Se este arquivo não carregar, o mesmo script
 * desfaz a marca sozinho e a página aparece inteira — nenhum conteúdo depende
 * de animação para ser lido.
 */

/* Escalonamento curto: mais que isso e o último item chega atrasado demais. */
const PASSO = 70;
const TETO = 6;

function ativarRevelacao(raiz = document) {
    const alvos = raiz.querySelectorAll('[data-revelar]:not([data-visivel])');
    if (alvos.length === 0) return;

    // Avisa o <head> de que a revelação assumiu: a rede de segurança se desliga.
    document.documentElement.dataset.cenaPronta = 'true';

    if (!('IntersectionObserver' in window)) {
        alvos.forEach((alvo) => alvo.setAttribute('data-visivel', 'true'));
        return;
    }

    const observador = new IntersectionObserver(
        (entradas) => {
            entradas.forEach((entrada) => {
                if (!entrada.isIntersecting) return;

                entrada.target.setAttribute('data-visivel', 'true');
                observador.unobserve(entrada.target);
            });
        },
        // Dispara um pouco antes do fim da tela: o bloco chega já em movimento.
        { rootMargin: '0px 0px -10% 0px', threshold: 0.01 }
    );

    alvos.forEach((alvo) => {
        alvo.style.setProperty('--atraso', `${atraso(alvo)}ms`);
        observador.observe(alvo);
    });
}

/**
 * O atraso vem da posição do elemento entre os irmãos que também revelam.
 * Marcar o pai com `data-escalonar` basta — nenhum item precisa saber o índice.
 */
function atraso(alvo) {
    const pai = alvo.parentElement;

    if (!pai || !(pai.hasAttribute('data-escalonar') || alvo.hasAttribute('data-revelar-escalonado'))) {
        return 0;
    }

    const irmaos = Array.prototype.filter.call(pai.children, (no) => no.hasAttribute('data-revelar'));
    const posicao = irmaos.indexOf(alvo);

    return Math.min(Math.max(posicao, 0), TETO) * PASSO;
}

window.FrioArteRevelar = { ativarRevelacao };
