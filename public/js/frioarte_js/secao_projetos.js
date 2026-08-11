/**
 * Cena 05 — galeria de ambientes.
 *
 * O `formato` de cada peça vem dos dados e define proporção e posição na grade
 * assimétrica. Grade igual de seis quadrados é feed de rede social; aqui uma
 * peça domina e as outras acompanham.
 */

const SEM_FOTO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-4.5-4.5L7 21"/></svg>';

const FORMATOS = ['grande', 'alta', 'media', 'larga', 'retrato'];

window.FrioArteRegistro.registrar('projetos', { precisaDados: true }, (perfil) => {
    const { lista, escapar } = window.FrioArteDom;

    lista(
        'projetos',
        perfil.projetos,
        (projeto, indice) => {
            // Formato ausente ou desconhecido volta para a diagonal desenhada.
            const formato = FORMATOS.includes(projeto.formato)
                ? projeto.formato
                : FORMATOS[indice % FORMATOS.length];

            return `
            <li class="peca peca--${escapar(formato)}">
                <div class="quadro" data-revelar="foto">${quadro(projeto, escapar)}</div>
                <div class="peca__legenda">
                    <h3 class="peca__titulo">${escapar(projeto.titulo)}</h3>
                    <p class="peca__texto">${escapar(projeto.legenda)}</p>
                </div>
            </li>`;
        }
    );
});

/**
 * Com foto, mostra a foto. Sem foto, mostra uma moldura que se assume como
 * espaço reservado — o site não simula um trabalho que ainda não existe.
 */
function quadro(projeto, escapar) {
    if (projeto.imagem) {
        return `<img src="${escapar(projeto.imagem)}"
                     alt="${escapar(projeto.alt || projeto.titulo)}"
                     loading="lazy" decoding="async">`;
    }

    return `
        <div class="reserva">
            ${SEM_FOTO}
            <span>Foto em breve</span>
        </div>`;
}
