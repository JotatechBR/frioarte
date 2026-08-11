/**
 * Seção de contato — formulário de orçamento.
 *
 * Não envia nada para o servidor: monta a mensagem e abre o WhatsApp da Frio
 * Arte com ela já escrita. O pedido chega onde a empresa realmente atende, e o
 * site não guarda dado de ninguém.
 */

window.FrioArteRegistro.registrar('orcamento', { precisaDados: true }, (perfil) => {
    preencherOpcoes(perfil.opcoesOrcamento);

    const formulario = document.querySelector('[data-orcamento]');
    if (!formulario) return;

    const { validar, vigiar } = window.FrioArteValidacao;
    const { montarMensagem, montarDestino } = window.FrioArteMensagem;
    const rotulo = formulario.querySelector('[data-rotulo-envio]');

    vigiar(formulario);

    formulario.addEventListener('submit', (evento) => {
        evento.preventDefault();

        if (!validar(formulario)) return;

        const mensagem = montarMensagem(new FormData(formulario), perfil.nome);
        const destino = montarDestino(perfil.whatsapp.numero, mensagem);

        const aba = window.open(destino, '_blank', 'noopener');

        // Bloqueio de pop-up: em vez de falhar em silêncio, navega na própria aba.
        if (!aba) {
            window.location.href = destino;
            return;
        }

        confirmar(rotulo, 'WhatsApp aberto');
    });
});

function preencherOpcoes(opcoes) {
    const select = document.querySelector('[data-opcoes-servico]');
    if (!select) return;

    const { escapar } = window.FrioArteDom;
    const escolhido = select.value;

    select.innerHTML =
        '<option value="">Selecione o serviço</option>' +
        opcoes.map((opcao) => `<option value="${escapar(opcao)}">${escapar(opcao)}</option>`).join('');

    select.value = escolhido;
}

/** Confirmação curta no próprio botão — a resposta aparece onde a ação aconteceu. */
function confirmar(rotulo, mensagem) {
    if (!rotulo) return;

    const anterior = rotulo.textContent;
    rotulo.textContent = mensagem;

    setTimeout(() => {
        rotulo.textContent = anterior;
    }, 2600);
}
