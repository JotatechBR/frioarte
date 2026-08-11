/** Cena 06 — sobre a empresa. A frase-cena vive no HTML; aqui só a prosa. */

window.FrioArteRegistro.registrar('sobre', { precisaDados: true }, (perfil) => {
    const { lista, escapar } = window.FrioArteDom;

    lista('sobre-paragrafos', perfil.sobre.paragrafos, (texto) => `<p class="corpo">${escapar(texto)}</p>`);
});
