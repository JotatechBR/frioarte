/** Seção 7 — marcas atendidas, em texto (marca de terceiro não se recria). */

window.FrioArteRegistro.registrar('marcas', { precisaDados: true }, (perfil) => {
    const { lista, escapar } = window.FrioArteDom;

    lista('marcas', perfil.marcas, (marca) => `<li>${escapar(marca)}</li>`);
});
