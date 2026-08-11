/**
 * Arranque da home.
 *
 * Este arquivo não sabe renderizar nada. Ele busca os dados uma vez e manda o
 * registro rodar os módulos — cada um isolado no próprio try/catch. Um módulo
 * que falha não impede nenhum outro de funcionar.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const { executar, listar } = window.FrioArteRegistro;

    let perfil = null;

    try {
        perfil = await window.FrioArteApi.buscarPerfil();
    } catch (erro) {
        console.error('[frioarte] a API não respondeu:', erro);
        mostrarFalha();
    }

    const falhas = await executar(perfil);

    // Comportamentos que valem para tudo que existe na tela, inclusive o que
    // acabou de ser criado pelos módulos.
    tentar('pressao', () => window.FrioArtePressao.ativarPressao());
    tentar('revelar', () => window.FrioArteRevelar.ativarRevelacao());
    tentar('progresso', () => window.FrioArteProgresso.ativarProgresso());

    if (falhas.length > 0) {
        console.warn(
            `[frioarte] ${falhas.length} de ${listar().length} módulos não subiram:`,
            falhas.join(', ')
        );
    }
});

/** Mesma proteção do registro, para o que roda depois dele. */
function tentar(nome, acao) {
    try {
        acao();
    } catch (erro) {
        console.error(`[frioarte] "${nome}" falhou e foi isolado:`, erro);
    }
}

/**
 * Sem dados, os blocos que só existem para exibi-los saem de cena inteiros.
 * Deixá-los na página mostraria molduras vazias e frases pela metade ("·",
 * "avaliações no") — pior do que a ausência do bloco.
 */
function mostrarFalha() {
    const aviso = document.querySelector('[data-falha]');
    if (aviso) aviso.hidden = false;

    document.querySelectorAll('[data-precisa-dados]').forEach((no) => {
        no.hidden = true;
    });
}
