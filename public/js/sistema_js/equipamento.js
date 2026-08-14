/**
 * Ficha do equipamento.
 *
 * O que o técnico precisa ver de pé, com o celular na mão, antes de abrir a
 * máquina: qual é o aparelho, se está funcionando e há quanto tempo está
 * instalado. Isso ocupa a primeira tela inteira. A ficha técnica vem depois —
 * ela é consulta, não decisão.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const C = window.FrioArteCartoes;
    const { escapar } = window.FrioArteDom;

    const codigo = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop());

    function alvo(nome) {
        return document.querySelector(`[data-lista="${nome}"]`);
    }

    function mostrar(secao) {
        const bloco = document.querySelector(`[data-secao-${secao}]`);
        if (bloco) bloco.hidden = false;
    }

    async function desenhar() {
        const equipamento = await D.carregarEquipamento(codigo);

        if (!equipamento) {
            UI.pintar(document.querySelector('[data-maquina]'), UI.vazio({
                titulo: 'Equipamento não encontrado',
                texto: `Nenhuma máquina com o código ${codigo}. Confira a etiqueta ou busque pelo número de série.`
            }));
            return;
        }

        document.title = `${equipamento.codigo} · Frio Arte`;
        document.querySelector('.topo__secao').textContent = equipamento.codigo;

        desenharCabeca(equipamento);
        window.FrioArteNavegacao.observarTitulo();

        desenharFicha(equipamento);

        await Promise.all([desenharVisitas(equipamento), desenharHistorico()]);
    }

    function desenharCabeca(equipamento) {
        const cliente = equipamento.cliente || {};

        // "Vencida há 3 meses" é mais útil do que a data crua da manutenção.
        const dias = F.diasAte(equipamento.proximaManutencao);
        const prazo = equipamento.proximaManutencao
            ? (dias < 0
                ? `Manutenção vencida ${F.tempoRelativo(equipamento.proximaManutencao, '12:00')}`
                : `Próxima manutenção ${F.tempoRelativo(equipamento.proximaManutencao, '12:00')}`)
            : 'Sem manutenção programada';

        UI.pintar(document.querySelector('[data-maquina]'), `
            <p class="maquina__codigo numeral">${escapar(equipamento.codigo)}</p>

            <h1 class="maquina__nome" data-titulo>${escapar(equipamento.descricao)}</h1>

            <p class="maquina__capacidade numeral">${F.milhar(equipamento.capacidade)} BTUs</p>

            <div class="maquina__fatos">
                <div class="fato">
                    <p class="fato__rotulo">Situação</p>
                    <p class="fato__valor">${UI.marca('equipamento', equipamento.status)}</p>
                    <p class="fato__apoio" data-vencida="${dias !== null && dias < 0}">${escapar(prazo)}</p>
                </div>

                <div class="fato">
                    <p class="fato__rotulo">Instalado há</p>
                    <p class="fato__valor fato__valor--tempo">${escapar(equipamento.tempoInstalado)}</p>
                    <p class="fato__apoio">Desde ${F.dataCurta(equipamento.dataInstalacao)}</p>
                </div>

                <div class="fato">
                    <p class="fato__rotulo">Cliente</p>
                    <p class="fato__valor fato__valor--texto">
                        <a href="/sistema/clientes/${cliente.id}">${escapar(cliente.nome || '—')}</a>
                    </p>
                    <p class="fato__apoio">${escapar(equipamento.local)} · ${escapar(equipamento.endereco.curto)}</p>
                </div>
            </div>

            <div class="maquina__acoes">
                <button class="botao botao--primario" type="button" data-pressionavel
                        data-abrir="visita" data-cliente="${cliente.id}"
                        data-equipamento="${escapar(equipamento.codigo)}">Agendar visita</button>

                <button class="botao botao--secundario" type="button" data-pressionavel
                        data-abrir="equipamento" data-codigo="${escapar(equipamento.codigo)}">Editar</button>

                <a class="botao botao--secundario" data-pressionavel
                   href="/sistema/clientes/${cliente.id}">Ver cliente</a>
            </div>
        `);
    }

    function desenharFicha(equipamento) {
        mostrar('ficha');

        const pares = [
            ['Tipo', equipamento.tipo],
            ['Marca', equipamento.marca],
            ['Modelo', equipamento.modelo],
            ['Capacidade', `${F.milhar(equipamento.capacidade)} BTUs`],
            ['Número de série', equipamento.numeroSerie || 'Não informado'],
            ['Local da instalação', equipamento.local],
            ['Data da instalação', F.dataCurta(equipamento.dataInstalacao)],
            ['Última manutenção', equipamento.ultimaManutencao
                ? F.dataCurta(equipamento.ultimaManutencao)
                : 'Ainda não realizada'],
            ['Próxima manutenção', equipamento.proximaManutencao
                ? F.dataCurta(equipamento.proximaManutencao)
                : 'Não programada'],
            ['Endereço', equipamento.endereco.completo],
            ['Observações', equipamento.observacoes || 'Nenhuma']
        ];

        UI.pintar(alvo('ficha'), pares
            .map(([nome, valor], indice) => `<div class="dados__par${indice >= 9 ? ' dados__par--largo' : ''}">
                <dt>${escapar(nome)}</dt>
                <dd>${escapar(valor)}</dd>
            </div>`)
            .join(''));
    }

    async function desenharVisitas(equipamento) {
        mostrar('visitas');

        const visitas = await D.carregarVisitas({
            equipamento: equipamento.codigo,
            periodo: 'proximas'
        });

        document.querySelector('[data-visitas-apoio]').textContent = visitas.length
            ? `${F.plural(visitas.length, 'visita agendada', 'visitas agendadas')} para esta máquina.`
            : 'Nada agendado para esta máquina.';

        UI.pintar(alvo('visitas'), visitas.length
            ? C.agenda(visitas)
            : UI.vazio({
                titulo: 'Sem visitas agendadas',
                texto: 'Programe a próxima manutenção desta máquina.',
                acao: {
                    abrir: 'visita',
                    rotulo: 'Agendar visita',
                    cliente: equipamento.cliente ? equipamento.cliente.id : ''
                }
            }));
    }

    async function desenharHistorico() {
        mostrar('historico');

        const eventos = await D.carregarHistoricoEquipamento(codigo);
        UI.pintar(alvo('historico'), C.historico(eventos));
    }

    document.addEventListener('DOMContentLoaded', desenhar);
    document.addEventListener('sistema:atualizado', desenhar);
})();
