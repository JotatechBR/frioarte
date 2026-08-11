/**
 * Material do cabeçalho.
 *
 * Só aparece quando existe conteúdo passando por baixo dele. Não depende da
 * API: funciona mesmo se a rede falhar.
 */

window.FrioArteRegistro.registrar('cabecalho', () => {
    const cabecalho = document.querySelector('[data-cabecalho]');
    if (!cabecalho) return;

    const atualizar = () => {
        cabecalho.dataset.rolado = window.scrollY > 8 ? 'true' : 'false';
    };

    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
});
