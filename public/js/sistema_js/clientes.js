/**
 * Lista de clientes.
 *
 * Busca e filtro conversam com a mesma consulta: os dois só mudam os parâmetros
 * e mandam desenhar de novo. Nenhum filtro esconde linha na tela — quem filtra
 * é a camada de dados, exatamente como o backend fará depois.
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
        const clientes = await D.carregarClientes(consulta);

        contagem.textContent = clientes.length
            ? F.plural(clientes.length, 'cliente', 'clientes')
            : '';

        UI.pintar(lista, clientes.length
            ? `<div class="fileiras">${clientes.map(C.cliente).join('')}</div>`
            : UI.vazio({
                titulo: consulta.termo ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda',
                texto: consulta.termo
                    ? `Nada corresponde a “${consulta.termo}”. Tente parte do nome, do telefone ou do endereço.`
                    : 'Cadastre o primeiro cliente para começar a registrar equipamentos e visitas.'
            }));
    }

    function ligarBusca() {
        const campo = document.querySelector('[data-procurar]');

        campo.addEventListener('input', () => {
            consulta.termo = campo.value.trim();

            clearTimeout(tempo);
            tempo = setTimeout(desenhar, 180);
        });
    }

    function ligarFiltros() {
        const barra = document.querySelector('[data-filtros]');

        UI.marcarFiltros(barra, consulta.filtro);

        barra.addEventListener('click', (evento) => {
            const botao = evento.target.closest('[data-filtro]');
            if (!botao) return;

            consulta.filtro = botao.dataset.filtro;
            UI.marcarFiltros(barra, consulta.filtro);
            desenhar();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        lista = document.querySelector('[data-lista="clientes"]');
        contagem = document.querySelector('[data-contagem]');

        lista.innerHTML = UI.esqueleto(5);

        ligarBusca();
        ligarFiltros();
        desenhar();
    });

    document.addEventListener('sistema:atualizado', desenhar);
})();
