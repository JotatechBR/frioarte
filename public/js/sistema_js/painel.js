/**
 * Painel.
 *
 * A tela responde a uma pergunta antes de qualquer outra: o que eu tenho para
 * fazer hoje? Por isso a abertura é uma frase, e não uma fileira de cartões —
 * a frase já é a resposta, e o resto da tela existe para detalhá-la.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const C = window.FrioArteCartoes;

    const alvos = {};

    function alvo(nome) {
        if (!alvos[nome]) alvos[nome] = document.querySelector(`[data-lista="${nome}"]`);
        return alvos[nome];
    }

    async function abertura() {
        const usuario = await D.carregarUsuario();
        const resumo = await D.carregarResumo();

        // Sem usuário identificado, cumprimenta sem nome. "Boa tarde, ." seria
        // pior do que "Boa tarde."
        document.querySelector('[data-saudacao]').textContent = usuario
            ? `${F.saudacao()}, ${F.primeiroNome(usuario.nome)}.`
            : `${F.saudacao()}.`;

        ajustarAcaoPrincipal(resumo);

        const hoje = resumo.visitasHoje;

        /*
         * O número é a única cor da frase. Ele é o dado; o resto é a moldura
         * verbal em volta dele.
         */
        document.querySelector('[data-frase]').innerHTML = hoje
            ? `Hoje você tem<br><span class="abertura__numero">${F.doisDigitos(hoje)}</span> `
                + `${hoje === 1 ? 'visita técnica' : 'visitas técnicas'}.`
            : 'Hoje a agenda<br>está livre.';

        const data = new Date();
        document.querySelector('[data-data]').textContent =
            `${F.diaSemana(F.paraISO(data))}, ${F.dataLonga(F.paraISO(data))}`;

        UI.pintar(alvo('resumo'), [
            numero(resumo.clientes, 'clientes cadastrados'),
            numero(resumo.equipamentos, 'equipamentos instalados'),
            numero(resumo.visitasSemana, 'visitas nos próximos sete dias'),
            numero(resumo.manutencoes, 'equipamentos pedindo atenção')
        ].join(''));
    }

    /**
     * A ação principal do painel segue o que dá para fazer agora. Sem nenhum
     * cliente na base, "Agendar visita" abriria um formulário sem para quem
     * agendar — o primeiro passo é o cadastro, e o botão diz isso.
     */
    function ajustarAcaoPrincipal(resumo) {
        const botao = document.querySelector('[data-acao-principal]');
        if (!botao) return;

        const semClientes = resumo.clientes === 0;

        botao.dataset.abrir = semClientes ? 'cliente' : 'visita';
        botao.textContent = semClientes ? 'Cadastrar cliente' : 'Agendar visita';
    }

    function numero(valor, rotulo) {
        return `<div class="numero">
            <span class="numero__valor">${F.doisDigitos(valor)}</span>
            <span class="numero__rotulo">${rotulo}</span>
        </div>`;
    }

    async function agenda() {
        const visitas = await D.carregarAgenda(8);

        UI.pintar(alvo('agenda'), visitas.length
            ? C.agenda(visitas)
            : UI.vazio({
                titulo: 'Nenhuma visita em aberto',
                texto: 'Quando houver atendimento agendado, ele aparece aqui na ordem em que precisa acontecer.',
                acao: { abrir: 'visita', rotulo: 'Agendar visita' }
            }));
    }

    async function manutencoes() {
        const equipamentos = await D.carregarManutencoes(5);

        UI.pintar(alvo('manutencao'), equipamentos.length
            ? `<div class="fileiras">${equipamentos.map((item) => C.equipamento(item)).join('')}</div>`
            : UI.vazio({
                titulo: 'Nada pendente',
                texto: 'Nenhum equipamento parado, com manutenção vencida ou perto do prazo.'
            }));
    }

    async function desenhar() {
        alvo('agenda').innerHTML = UI.esqueleto(3);
        alvo('manutencao').innerHTML = UI.esqueleto(2);

        await Promise.all([abertura(), agenda(), manutencoes()]);
    }

    document.addEventListener('DOMContentLoaded', desenhar);

    // Agendou ou concluiu uma visita numa folha: o painel se refaz sozinho.
    document.addEventListener('sistema:atualizado', desenhar);
})();
