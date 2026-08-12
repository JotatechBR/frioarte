/**
 * Ficha do cliente.
 *
 * A tela abre com quem é o cliente e o que dá para fazer com ele — ligar,
 * chamar no WhatsApp, agendar. Só depois vêm equipamentos, agenda e histórico.
 * A ordem é a de uso: ninguém abre a ficha para ler cadastro.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const C = window.FrioArteCartoes;
    const { escapar } = window.FrioArteDom;

    /** O id vem do endereço: /sistema/clientes/7 */
    const id = Number(window.location.pathname.split('/').filter(Boolean).pop());

    function alvo(nome) {
        return document.querySelector(`[data-lista="${nome}"]`);
    }

    function mostrar(secao) {
        const bloco = document.querySelector(`[data-secao-${secao}]`);
        if (bloco) bloco.hidden = false;
    }

    async function desenhar() {
        const cliente = await D.carregarCliente(id);

        if (!cliente) {
            document.querySelector('[data-ficha]').innerHTML = UI.vazio({
                titulo: 'Cliente não encontrado',
                texto: 'Este cadastro não existe mais ou o endereço está incorreto.'
            });
            return;
        }

        document.title = `${cliente.nome} · Frio Arte`;
        document.querySelector('.topo__secao').textContent = cliente.nome;

        desenharFicha(cliente);

        // O título grande acabou de nascer: o cabeçalho passa a observá-lo.
        window.FrioArteNavegacao.observarTitulo();

        await Promise.all([
            desenharEquipamentos(cliente),
            desenharVisitas(cliente),
            desenharHistorico()
        ]);

        desenharDados(cliente);
    }

    function desenharFicha(cliente) {
        const texto = `Olá, ${F.primeiroNome(cliente.nome)}! Aqui é da Frio Arte.`;

        UI.pintar(document.querySelector('[data-ficha]'), `
            <h1 class="ficha__nome" data-titulo>${escapar(cliente.nome)}</h1>

            <p class="ficha__desde">Cliente desde ${F.mesAno(cliente.clienteDesde)}.</p>

            <div class="ficha__contato">
                <a class="ficha__telefone" href="${F.linkTelefone(cliente.telefone)}">
                    ${F.telefone(cliente.telefone)}
                </a>
                <span class="ficha__separador" aria-hidden="true">·</span>
                <span>${escapar(cliente.endereco.curto)}</span>
                ${cliente.status === 'inativo' ? UI.marca('cliente', 'inativo') : ''}
            </div>

            <div class="ficha__acoes">
                <a class="botao botao--primario" target="_blank" rel="noopener" data-pressionavel
                   href="${F.linkWhatsapp(cliente.whatsapp || cliente.telefone, texto)}">WhatsApp</a>

                <button class="botao botao--secundario" type="button" data-pressionavel
                        data-abrir="visita" data-cliente="${cliente.id}">Nova visita</button>

                <button class="botao botao--secundario" type="button" data-pressionavel
                        data-abrir="equipamento" data-cliente="${cliente.id}">Adicionar equipamento</button>

                <button class="botao botao--secundario" type="button" data-pressionavel
                        data-abrir="cliente" data-id="${cliente.id}">Editar</button>
            </div>
        `);
    }

    async function desenharEquipamentos(cliente) {
        mostrar('equipamentos');

        const bloco = document.querySelector('[data-secao-equipamentos]');
        bloco.querySelector('[data-adicionar]').dataset.cliente = cliente.id;

        const equipamentos = await D.carregarEquipamentos({ clienteId: cliente.id });

        document.querySelector('[data-equipamentos-apoio]').textContent = equipamentos.length
            ? `${F.plural(equipamentos.length, 'máquina instalada', 'máquinas instaladas')}.`
            : 'Nenhuma máquina cadastrada para este cliente.';

        UI.pintar(alvo('equipamentos'), equipamentos.length
            ? `<div class="fileiras">${equipamentos
                .map((item) => C.equipamento(item, { semCliente: true })).join('')}</div>`
            : UI.vazio({
                titulo: 'Sem equipamentos',
                texto: 'Cadastre a primeira máquina para acompanhar instalação, manutenção e histórico.'
            }));
    }

    async function desenharVisitas(cliente) {
        mostrar('visitas');

        const visitas = await D.carregarVisitas({ clienteId: cliente.id, periodo: 'proximas' });

        document.querySelector('[data-visitas-apoio]').textContent = visitas.length
            ? `${F.plural(visitas.length, 'visita agendada', 'visitas agendadas')}.`
            : 'Nada agendado no momento.';

        UI.pintar(alvo('visitas'), visitas.length
            ? C.agenda(visitas)
            : UI.vazio({
                titulo: 'Sem visitas agendadas',
                texto: 'Use "Nova visita" para marcar o próximo atendimento deste cliente.'
            }));
    }

    function desenharDados(cliente) {
        mostrar('dados');

        const pares = [
            ['Documento', F.documento(cliente.documento) || 'Não informado'],
            ['Telefone', F.telefone(cliente.telefone)],
            ['WhatsApp', F.telefone(cliente.whatsapp) || 'Mesmo telefone'],
            ['E-mail', cliente.email || 'Não informado'],
            ['Endereço', cliente.endereco.completo],
            ['Observações', cliente.observacoes || 'Nenhuma']
        ];

        UI.pintar(alvo('dados'), pares
            .map(([nome, valor], indice) => `<div class="dados__par${indice >= 4 ? ' dados__par--largo' : ''}">
                <dt>${escapar(nome)}</dt>
                <dd>${escapar(valor)}</dd>
            </div>`)
            .join(''));
    }

    async function desenharHistorico() {
        mostrar('historico');

        const eventos = await D.carregarHistoricoCliente(id);
        UI.pintar(alvo('historico'), C.historico(eventos));
    }

    document.addEventListener('DOMContentLoaded', desenhar);
    document.addEventListener('sistema:atualizado', desenhar);
})();
