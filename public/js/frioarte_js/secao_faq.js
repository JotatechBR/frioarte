/**
 * Seção 9 — perguntas frequentes: monta e liga o comportamento.
 *
 * Vários itens podem ficar abertos ao mesmo tempo: fechar uma resposta que a
 * pessoa não pediu para fechar é tirar o controle dela. A altura é animada pelo
 * CSS (grid 0fr → 1fr); aqui só existe o estado.
 */

const MAIS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

window.FrioArteRegistro.registrar('faq', { precisaDados: true }, (perfil) => {
    const { lista, escapar } = window.FrioArteDom;

    const montou = lista(
        'faq',
        perfil.faq,
        (item) => `
            <div class="faq__item" data-faq-item data-aberto="false">
                <h3 class="faq__cabeca">
                    <button class="faq__pergunta" type="button"
                            id="faq-botao-${escapar(item.id)}"
                            aria-expanded="false" aria-controls="faq-corpo-${escapar(item.id)}">
                        ${escapar(item.pergunta)}
                        <span class="faq__sinal" aria-hidden="true">${MAIS}</span>
                    </button>
                </h3>
                <div class="faq__corpo" id="faq-corpo-${escapar(item.id)}"
                     role="region" aria-labelledby="faq-botao-${escapar(item.id)}">
                    <div class="faq__conteudo">
                        <p>${escapar(item.resposta)}</p>
                    </div>
                </div>
            </div>`
    );

    if (montou) ligarAlternancia();
});

function ligarAlternancia() {
    document.querySelectorAll('[data-faq-item]').forEach((item) => {
        const botao = item.querySelector('.faq__pergunta');
        if (!botao) return;

        botao.addEventListener('click', () => {
            const aberto = item.dataset.aberto === 'true';

            item.dataset.aberto = aberto ? 'false' : 'true';
            botao.setAttribute('aria-expanded', aberto ? 'false' : 'true');
        });
    });
}
