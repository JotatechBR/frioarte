/**
 * Pedaços de lista reaproveitados entre telas.
 *
 * A visita aparece no painel, na agenda e na ficha do cliente; o equipamento
 * aparece em três lugares. Se cada tela montasse o seu, o sistema teria três
 * versões do mesmo cartão — e elas divergiriam na primeira mudança.
 *
 * Aqui só se monta HTML. Quem busca dado é `dados.js`, quem decide o que
 * mostrar é a tela.
 */

(function () {
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const { escapar } = window.FrioArteDom;

    function icone(nome, classe) {
        return `<svg class="${classe || ''}" viewBox="0 0 24 24" aria-hidden="true">`
            + `<use href="#i-${nome}"/></svg>`;
    }

    /* ---------- Visita ----------
       O horário manda: é o primeiro dado que o técnico procura. Depois o
       cliente, depois o que será feito, depois onde. Nessa ordem, sempre. */

    function visita(dados, opcoes) {
        const config = opcoes || {};
        const cliente = dados.cliente || {};
        const equipamento = dados.equipamentoDados;
        const daqui = F.tempoRelativo(dados.data, dados.hora);
        const aberta = dados.status === 'agendada' || dados.status === 'andamento';

        const quando = config.comData
            ? `<span class="visita__dia">${escapar(F.dataRelativa(dados.data))}</span>`
            : '';

        return `<article class="visita" data-visita="${dados.id}" data-faixa="${dados.faixa.chave}">
            <p class="visita__hora">
                <span class="visita__horas numeral">${escapar(dados.hora)}</span>
                ${quando}
                ${aberta ? `<span class="visita__daqui">${escapar(daqui)}</span>` : ''}
            </p>

            <div class="visita__corpo">
                <p class="visita__cliente">${escapar(cliente.nome || 'Cliente')}</p>
                <p class="visita__tipo">${escapar(dados.tipo)}</p>

                ${equipamento
                    ? `<p class="visita__equipamento">${escapar(equipamento.descricao)}
                        <span class="visita__leve">${F.milhar(equipamento.capacidade)} BTUs
                        · ${escapar(equipamento.local)}</span></p>`
                    : '<p class="visita__equipamento visita__leve">Sem equipamento vinculado</p>'}

                <p class="visita__local">${icone('local', 'visita__pino')}
                    ${escapar(dados.endereco.linha)}</p>

                ${config.semAcoes ? '' : acoes(cliente, dados)}
            </div>

            <div class="visita__fim">
                ${UI.marca('visita', dados.status)}
                <button class="elo-seta visita__ver" type="button" data-visita="${dados.id}">
                    Ver detalhes ${icone('seta')}
                </button>
            </div>
        </article>`;
    }

    /**
     * Ligar e WhatsApp em toque direto. São as duas ações que o técnico usa em
     * pé na porta do cliente — não podem estar a três toques de distância.
     */
    function acoes(cliente, dados) {
        if (!cliente || !cliente.telefone) return '';

        const texto = dados
            ? `Olá, ${F.primeiroNome(cliente.nome)}! Aqui é da Frio Arte, sobre a visita de `
                + `${F.dataCurta(dados.data)} às ${dados.hora}.`
            : '';

        return `<div class="rapidas">
            <a class="rapida" href="${F.linkTelefone(cliente.telefone)}" data-pressionavel>
                ${icone('telefone')} Ligar
            </a>
            <a class="rapida rapida--marca" target="_blank" rel="noopener"
               href="${F.linkWhatsapp(cliente.whatsapp || cliente.telefone, texto)}" data-pressionavel>
                ${icone('conversa')} WhatsApp
            </a>
        </div>`;
    }

    /** Grupo da agenda: HOJE, AMANHÃ, ATRASADA, PRÓXIMOS DIAS. */
    function grupo(titulo, itens, tom) {
        return `<section class="grupo" data-tom="${tom || 'neutro'}">
            <header class="grupo__cabeca">
                <p class="grupo__titulo">${escapar(titulo)}</p>
                <span class="grupo__contagem numeral">${F.doisDigitos(itens.length)}</span>
            </header>
            ${itens.join('')}
        </section>`;
    }

    /** Agrupa uma lista de visitas na ordem em que a agenda deve ser lida. */
    function agenda(visitas, opcoes) {
        const ordem = [
            { chave: 'atrasada', titulo: 'Atrasada', tom: 'ruim' },
            { chave: 'hoje', titulo: 'Hoje', tom: 'ativo' },
            { chave: 'amanha', titulo: 'Amanhã', tom: 'atencao' },
            { chave: 'proximos', titulo: 'Próximos dias', tom: 'neutro' },
            { chave: 'passado', titulo: 'Realizadas', tom: 'neutro' }
        ];

        return ordem
            .map((faixa) => {
                const itens = visitas.filter((item) => item.faixa.chave === faixa.chave);
                if (itens.length === 0) return '';

                const comData = faixa.chave === 'proximos' || faixa.chave === 'passado';

                return grupo(
                    faixa.titulo,
                    itens.map((item) => visita(item, Object.assign({ comData }, opcoes))),
                    faixa.tom
                );
            })
            .join('');
    }

    /* ---------- Equipamento ---------- */

    function equipamento(dados, opcoes) {
        const config = opcoes || {};
        const dono = dados.cliente;

        const meio = config.semCliente
            ? `<span>${escapar(dados.local)}</span>
               <span class="fileira__leve">Instalado há ${escapar(dados.tempoInstalado)}</span>`
            : `<span>${escapar(dono ? dono.nome : 'Sem dono')}</span>
               <span class="fileira__leve">${escapar(dados.local)} · ${escapar(dados.endereco.curto)}</span>`;

        /*
         * O código sobe para a linha de cima, em tipo pequeno e espaçado. É a
         * etiqueta da máquina — funciona como o número de um produto, dá
         * identidade própria a esta lista e o modelo fica livre para ser lido
         * como nome.
         */
        return `<a class="fileira" href="/sistema/equipamentos/${encodeURIComponent(dados.codigo)}">
            <div>
                <p class="fileira__codigo numeral">${escapar(dados.codigo)}</p>
                <p class="fileira__nome">${escapar(dados.descricao)}</p>
                <p class="fileira__apoio">${F.milhar(dados.capacidade)} BTUs · ${escapar(dados.tipo)}</p>
            </div>

            <div class="fileira__dados">${meio}</div>

            <div class="fileira__fim">
                ${UI.marca('equipamento', dados.status)}
                ${icone('seta', 'fileira__seta')}
            </div>
        </a>`;
    }

    /* ---------- Cliente ---------- */

    function cliente(dados) {
        const proxima = dados.proximaVisita
            ? `${F.dataRelativa(dados.proximaVisita.data)} às ${dados.proximaVisita.hora}`
            : 'Sem visita agendada';

        return `<a class="fileira" href="/sistema/clientes/${dados.id}">
            <div>
                <p class="fileira__nome">${escapar(dados.nome)}</p>
                <p class="fileira__apoio">${escapar(dados.endereco.curto)}
                    <span class="fileira__leve">· ${F.telefone(dados.telefone)}</span></p>
            </div>

            <div class="fileira__dados">
                <span>${F.plural(dados.totalEquipamentos, 'equipamento', 'equipamentos')}</span>
                <span class="fileira__leve">${escapar(proxima)}</span>
            </div>

            <div class="fileira__fim">
                ${dados.status === 'inativo' ? UI.marca('cliente', 'inativo') : ''}
                ${icone('seta', 'fileira__seta')}
            </div>
        </a>`;
    }

    /* ---------- Histórico ---------- */

    function evento(item) {
        return `<article class="tempo__item" data-marco="${item.marco ? 'true' : 'false'}">
            <p class="tempo__data numeral">${escapar(F.dataCurta(item.data))}</p>
            <div class="tempo__corpo">
                <p class="tempo__tipo">${escapar(item.tipo)}</p>
                ${item.descricao ? `<p class="tempo__texto">${escapar(item.descricao)}</p>` : ''}
                ${item.autor || item.referencia
                    ? `<p class="tempo__autor">${escapar([item.referencia, item.autor]
                        .filter(Boolean).join(' · '))}</p>`
                    : ''}
            </div>
        </article>`;
    }

    function historico(eventos) {
        if (!eventos.length) {
            return UI.vazio({ titulo: 'Sem histórico ainda', texto: 'As atividades aparecem aqui conforme forem registradas.' });
        }

        return `<div class="tempo">${eventos.map(evento).join('')}</div>`;
    }

    window.FrioArteCartoes = {
        icone,
        visita,
        acoes,
        grupo,
        agenda,
        equipamento,
        cliente,
        historico
    };
})();
