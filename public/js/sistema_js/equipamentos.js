/**
 * Lista de equipamentos.
 *
 * Mesma mecânica da lista de clientes — busca, filtro e uma consulta só. O
 * filtro também pode vir pelo endereço (`?filtro=manutencao`), que é como o
 * painel manda o usuário para cá já com a pergunta certa feita.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const C = window.FrioArteCartoes;

    const consulta = { termo: '', filtro: 'todos' };

    let lista = null;
    let contagem = null;
    let tempo = null;

    async function desenhar() {
        const equipamentos = await D.carregarEquipamentos(consulta);

        contagem.textContent = equipamentos.length
            ? F.plural(equipamentos.length, 'equipamento', 'equipamentos')
            : '';

        UI.pintar(lista, equipamentos.length
            ? `<div class="fileiras">${equipamentos.map((item) => C.equipamento(item)).join('')}</div>`
            : UI.vazio({
                titulo: consulta.termo ? 'Nenhum equipamento encontrado' : 'Nenhum equipamento ainda',
                texto: consulta.termo
                    ? `Nada corresponde a “${consulta.termo}”. O código tem o formato FA-000000.`
                    : 'Cadastre uma máquina para acompanhar instalação, manutenção e histórico.',
                acao: consulta.termo || consulta.filtro !== 'todos'
                    ? null
                    : { abrir: 'equipamento', rotulo: 'Cadastrar equipamento' }
            }));
    }

    document.addEventListener('DOMContentLoaded', () => {
        lista = document.querySelector('[data-lista="equipamentos"]');
        contagem = document.querySelector('[data-contagem]');

        lista.innerHTML = UI.esqueleto(5);

        const barra = document.querySelector('[data-filtros]');
        const campo = document.querySelector('[data-procurar]');

        // O painel entrega o filtro pronto pela URL; a tela só obedece.
        const pedido = new URLSearchParams(window.location.search).get('filtro');

        if (pedido && barra.querySelector(`[data-filtro="${pedido}"]`)) {
            consulta.filtro = pedido;
        }

        UI.marcarFiltros(barra, consulta.filtro);

        campo.addEventListener('input', () => {
            consulta.termo = campo.value.trim();

            clearTimeout(tempo);
            tempo = setTimeout(desenhar, 180);
        });

        barra.addEventListener('click', (evento) => {
            const botao = evento.target.closest('[data-filtro]');
            if (!botao) return;

            consulta.filtro = botao.dataset.filtro;
            UI.marcarFiltros(barra, consulta.filtro);
            desenhar();
        });

        desenhar();
    });

    document.addEventListener('sistema:atualizado', desenhar);
})();
