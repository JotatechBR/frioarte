/**
 * Progresso de cena: publica `--p` (0 → 1) enquanto o elemento atravessa a tela.
 *
 * É o único lugar do site que lê a rolagem quadro a quadro, e existe para dois
 * parallax muito curtos — hero e chamada final. O CSS faz o resto: aqui não se
 * escreve `transform` nenhum.
 *
 * Custos controlados:
 *   · um `requestAnimationFrame` só, e só enquanto há elemento na tela;
 *   · leitura de todas as caixas antes de qualquer escrita, para não alternar
 *     medição e pintura no mesmo quadro;
 *   · desligado inteiro quando a pessoa pede menos movimento.
 */

function ativarProgresso(raiz = document) {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const alvos = raiz.querySelectorAll('[data-progresso]');
    if (alvos.length === 0) return;

    const naTela = new Set();
    let rodando = false;

    const observador = new IntersectionObserver(
        (entradas) => {
            entradas.forEach((entrada) => {
                if (entrada.isIntersecting) naTela.add(entrada.target);
                else naTela.delete(entrada.target);
            });

            if (naTela.size > 0) ligar();
        },
        { rootMargin: '15% 0px' }
    );

    alvos.forEach((alvo) => observador.observe(alvo));

    function ligar() {
        if (rodando) return;
        rodando = true;
        requestAnimationFrame(quadro);
    }

    function quadro() {
        if (naTela.size === 0) {
            rodando = false;
            return;
        }

        const altura = window.innerHeight;

        // Mede tudo primeiro…
        const medidas = [];
        naTela.forEach((alvo) => {
            const caixa = alvo.getBoundingClientRect();
            medidas.push([alvo, (altura - caixa.top) / (altura + caixa.height)]);
        });

        // …e só então escreve.
        medidas.forEach(([alvo, bruto]) => {
            const p = bruto < 0 ? 0 : bruto > 1 ? 1 : bruto;
            alvo.style.setProperty('--p', p.toFixed(3));
        });

        requestAnimationFrame(quadro);
    }
}

window.FrioArteProgresso = { ativarProgresso };
