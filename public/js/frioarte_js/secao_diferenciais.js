/** Cena 07 — qualidade. Fio no topo agrupa o item; ícone e caixa não fariam falta. */

window.FrioArteRegistro.registrar('diferenciais', { precisaDados: true }, (perfil) => {
    const { lista, escapar } = window.FrioArteDom;

    lista(
        'diferenciais',
        perfil.diferenciais,
        (item) => `
            <li class="marco" data-revelar="subir">
                <h3 class="marco__titulo">${escapar(item.titulo)}</h3>
                <p class="marco__resumo">${escapar(item.resumo)}</p>
            </li>`
    );
});
