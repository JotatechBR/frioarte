/** Destinos de contato aplicados a toda a página. */

window.FrioArteRegistro.registrar('links', { precisaDados: true }, (perfil) => {
    const { link } = window.FrioArteDom;

    link('ligar', perfil.links.ligar);
    link('whatsapp', perfil.links.whatsapp);
    link('rotas', perfil.links.rotas);

    // Sem perfil cadastrado, o link continua escondido em vez de levar a lugar nenhum.
    if (!perfil.links.instagram) return;

    document.querySelectorAll('[data-rede="instagram"]').forEach((no) => {
        no.href = perfil.links.instagram;
        no.hidden = false;
    });
});
