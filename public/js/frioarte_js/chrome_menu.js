/**
 * Menu de navegação do celular.
 *
 * Entra e sai pelo mesmo caminho (por cima), com véu escurecendo o fundo — é
 * uma tarefa modal. Fecha por Esc, por toque fora e ao escolher um destino,
 * então nunca prende a pessoa dentro dele.
 */

window.FrioArteRegistro.registrar('menu', () => {
    const menu = document.querySelector('[data-menu]');
    const gatilho = document.querySelector('[data-abrir-menu]');

    if (!menu || !gatilho) return;

    function alternar(aberto) {
        menu.dataset.aberto = aberto ? 'true' : 'false';
        gatilho.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        gatilho.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');

        // Trava a rolagem do fundo enquanto a tarefa modal está aberta.
        document.body.style.overflow = aberto ? 'hidden' : '';

        if (!aberto) gatilho.focus({ preventScroll: true });
    }

    const fechar = () => alternar(false);

    gatilho.addEventListener('click', () => {
        alternar(menu.dataset.aberto !== 'true');
    });

    menu.querySelectorAll('[data-fechar-menu]').forEach((no) => {
        no.addEventListener('click', fechar);
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && menu.dataset.aberto === 'true') fechar();
    });

    // Ao alargar para o layout de desktop o menu perde a razão de existir.
    window.matchMedia('(min-width: 64rem)').addEventListener('change', (consulta) => {
        if (consulta.matches) fechar();
    });
});
