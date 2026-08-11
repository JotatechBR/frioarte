/**
 * Barra de ação do celular.
 *
 * Fica ao alcance do polegar e sai de cena quando o rodapé já traz as mesmas
 * ações — em nenhum momento a pessoa fica sem como falar com a empresa.
 */

window.FrioArteRegistro.registrar('barra-acao', () => {
    const barra = document.querySelector('[data-barra-acao]');
    const rodape = document.querySelector('[data-rodape]');

    if (!barra || !rodape || !('IntersectionObserver' in window)) return;

    const observador = new IntersectionObserver(
        ([entrada]) => {
            barra.dataset.oculta = entrada.isIntersecting ? 'true' : 'false';
        },
        { threshold: 0.2 }
    );

    observador.observe(rodape);
});
