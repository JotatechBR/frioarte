/**
 * Visitas técnicas.
 *
 * A tela abre em "Hoje", que é a pergunta de 90% dos dias. Os outros períodos
 * estão a um toque, e a lista continua agrupada por urgência — atrasada, hoje,
 * amanhã, próximos dias — em vez de virar uma tabela ordenada por data.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const C = window.FrioArteCartoes;

    const consulta = { termo: '', periodo: 'hoje' };

    const AGENDAR = { abrir: 'visita', rotulo: 'Agendar visita' };

    /*
     * Cada período explica a própria ausência. "Nenhum resultado" seria a
     * mesma frase para seis situações diferentes, e nenhuma delas informa.
     * Só os períodos em que agendar é a próxima ação oferecem o botão.
     */
    const VAZIOS = {
        hoje: {
            titulo: 'Nenhuma visita hoje',
            texto: 'A agenda de hoje está limpa. Veja "Próximas" para o que vem pela frente.',
            acao: AGENDAR
        },
        semana: {
            titulo: 'Nada nesta semana',
            texto: 'Nenhum atendimento agendado para os próximos sete dias.',
            acao: AGENDAR
        },
        proximas: {
            titulo: 'Nenhuma visita agendada',
            texto: 'Marque o próximo atendimento e ele aparece aqui, e também no painel.',
            acao: AGENDAR
        },
        concluidas: {
            titulo: 'Nenhuma visita concluída',
            texto: 'Os atendimentos fechados ficam registrados aqui e no histórico do equipamento.'
        },
        canceladas: {
            titulo: 'Nenhuma visita cancelada',
            texto: 'Visitas canceladas continuam no histórico do cliente, com o motivo.'
        },
        todas: {
            titulo: 'Nenhuma visita registrada',
            texto: 'A agenda da equipe começa vazia.',
            acao: AGENDAR
        }
    };

    let lista = null;
    let contagem = null;
    let tempo = null;

    async function desenhar() {
        const visitas = await D.carregarVisitas(consulta);

        contagem.textContent = visitas.length
            ? F.plural(visitas.length, 'visita', 'visitas')
            : '';

        UI.pintar(lista, visitas.length
            ? C.agenda(visitas)
            : UI.vazio(VAZIOS[consulta.periodo] || VAZIOS.todas));
    }

    document.addEventListener('DOMContentLoaded', async () => {
        lista = document.querySelector('[data-lista="visitas"]');
        contagem = document.querySelector('[data-contagem]');

        lista.innerHTML = UI.esqueleto(4);

        const barra = document.querySelector('[data-filtros]');
        const campo = document.querySelector('[data-procurar]');
        const endereco = new URLSearchParams(window.location.search);

        const pedido = endereco.get('filtro');

        if (pedido && barra.querySelector(`[data-filtro="${pedido}"]`)) {
            consulta.periodo = pedido;
        }

        UI.marcarFiltros(barra, consulta.periodo);

        campo.addEventListener('input', () => {
            consulta.termo = campo.value.trim();

            clearTimeout(tempo);
            tempo = setTimeout(desenhar, 180);
        });

        barra.addEventListener('click', (evento) => {
            const botao = evento.target.closest('[data-filtro]');
            if (!botao) return;

            consulta.periodo = botao.dataset.filtro;
            UI.marcarFiltros(barra, consulta.periodo);
            desenhar();
        });

        await desenhar();

        /*
         * A busca global aponta para cá com `?visita=103`. Abrir a folha logo
         * na chegada é o que faz o resultado da busca parecer um destino, e não
         * um desvio.
         */
        const visita = endereco.get('visita');
        if (visita) window.FrioArteFormularios.abrirDetalheVisita(visita);
    });

    document.addEventListener('sistema:atualizado', desenhar);
})();
