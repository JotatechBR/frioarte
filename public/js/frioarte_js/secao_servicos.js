/**
 * Cena 03 — serviços.
 *
 * Lista editorial numerada à direita; à esquerda, uma foto fixa que troca
 * conforme o serviço entra em foco. Sete cartões iguais diriam a mesma coisa
 * sete vezes; aqui a variação é a própria imagem.
 *
 * Nem todo serviço tem foto: variações do mesmo trabalho (preventiva e
 * corretiva, carga de gás e desinstalação) mantêm a última em cena, o que
 * evita trocar a imagem por outra que diz a mesma coisa.
 */

window.FrioArteRegistro.registrar('servicos', { precisaDados: true }, (perfil) => {
    const { campo, lista, figura, escapar } = window.FrioArteDom;
    const itens = perfil.servicos.lista;

    campo('servicos-categoria', perfil.servicos.categoria);

    /* A foto de cada linha é a dela ou a última que existiu antes. */
    let ultima = null;
    const fotos = itens.map((servico) => {
        if (servico.imagem) ultima = servico.imagem;
        return ultima;
    });

    lista(
        'servicos-fotos',
        itens.filter((servico) => servico.imagem),
        (servico) =>
            figura(servico, {
                class: 'servicos__foto',
                'data-foto': servico.imagem
            })
    );

    /*
     * Nenhuma foto entregue ainda: a cena avisa o CSS para recompor em duas
     * colunas, em vez de reservar metade da tela para uma moldura vazia.
     */
    const grade = document.querySelector('.servicos__grade');
    if (grade) grade.dataset.semFoto = fotos.some(Boolean) ? 'false' : 'true';

    const montou = lista(
        'servicos',
        itens,
        (servico, indice) => `
            <li class="servico" data-servico data-foto="${escapar(fotos[indice] || '')}">
                <span class="servico__numero" aria-hidden="true">${String(indice + 1).padStart(2, '0')}</span>
                <h3 class="nome servico__nome">${escapar(servico.titulo)}</h3>
                <p class="servico__resumo">${escapar(servico.resumo)}</p>
            </li>`
    );

    if (montou) sincronizarFoco();
});

/**
 * O serviço em foco é o que está mais perto do meio da tela. A faixa estreita
 * de observação garante que exista sempre um só — sem ela, três linhas ficariam
 * "ativas" ao mesmo tempo e a foto piscaria entre elas.
 */
function sincronizarFoco() {
    const linhas = Array.from(document.querySelectorAll('[data-servico]'));
    const fotos = Array.from(document.querySelectorAll('.servicos__foto'));

    if (linhas.length === 0) return;

    const focar = (linha) => {
        linhas.forEach((no) => {
            no.dataset.ativo = no === linha ? 'true' : 'false';
        });

        fotos.forEach((foto) => {
            foto.dataset.ativo = foto.dataset.foto === linha.dataset.foto ? 'true' : 'false';
        });
    };

    focar(linhas[0]);

    if (!('IntersectionObserver' in window)) {
        linhas.forEach((linha) => (linha.dataset.ativo = 'true'));
        return;
    }

    const observador = new IntersectionObserver(
        (entradas) => {
            const entrando = entradas.find((entrada) => entrada.isIntersecting);
            if (entrando) focar(entrando.target);
        },
        { rootMargin: '-45% 0px -45% 0px' }
    );

    linhas.forEach((linha) => observador.observe(linha));
}
