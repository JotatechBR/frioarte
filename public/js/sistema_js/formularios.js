/**
 * Cadastros e detalhe de visita.
 *
 * Os três formulários do sistema — cliente, visita e equipamento — vivem no
 * layout, e não em cada tela. Assim "Nova visita" funciona igual no painel, na
 * ficha do cliente e na lista de visitas, sem três cópias do mesmo formulário
 * saindo de sincronia.
 *
 * Qualquer botão da aplicação abre um deles só declarando o que quer:
 *
 *     <button data-abrir="visita" data-cliente="7" data-equipamento="FA-000028">
 *     <button data-abrir="cliente" data-id="7">
 *     <button data-visita="103">          (abre o detalhe)
 *
 * Ao salvar, dispara `sistema:atualizado` no documento. Cada tela decide se
 * precisa se redesenhar — nenhuma delas conhece o formulário.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const { escapar } = window.FrioArteDom;

    const dialogos = {};

    function dialogo(nome) {
        if (!dialogos[nome]) {
            dialogos[nome] = document.querySelector(`[data-dialogo="${nome}"]`);
        }

        return dialogos[nome];
    }

    function avisarMudanca(tipo, registro) {
        document.dispatchEvent(new CustomEvent('sistema:atualizado', { detail: { tipo, registro } }));
    }

    /* ---------- Preenchimento das listas ---------- */

    async function preencherClientes(select, selecionado) {
        const clientes = await D.carregarClientes({ filtro: 'todos' });

        select.innerHTML = '<option value="">Selecione o cliente</option>'
            + clientes
                .map((cliente) => `<option value="${cliente.id}">${escapar(cliente.nome)}</option>`)
                .join('');

        if (selecionado) select.value = String(selecionado);
    }

    async function preencherTecnicos(select, selecionado) {
        const tecnicos = await D.carregarTecnicos();

        select.innerHTML = tecnicos
            .map((tecnico) => `<option value="${tecnico.id}">${escapar(tecnico.nome)}</option>`)
            .join('');

        if (selecionado) select.value = String(selecionado);
    }

    /**
     * A lista de equipamentos segue o cliente escolhido. Mostrar as 22 máquinas
     * da base inteira para depois o usuário achar a certa é o tipo de detalhe
     * que faz um sistema parecer improvisado.
     */
    async function preencherEquipamentos(select, clienteId, selecionado) {
        if (!clienteId) {
            select.innerHTML = '<option value="">Escolha o cliente primeiro</option>';
            select.disabled = true;
            return;
        }

        const equipamentos = await D.carregarEquipamentos({ clienteId });

        select.disabled = false;
        select.innerHTML = '<option value="">Sem equipamento específico</option>'
            + equipamentos
                .map((equipamento) => {
                    const nome = `${equipamento.codigo} · ${equipamento.descricao} · ${equipamento.local}`;
                    return `<option value="${equipamento.codigo}">${escapar(nome)}</option>`;
                })
                .join('');

        if (selecionado) select.value = selecionado;
    }

    /* ---------- Cliente ---------- */

    async function abrirCliente(id) {
        const alvo = dialogo('cliente');
        const forma = alvo.querySelector('[data-forma="cliente"]');

        forma.reset();
        limparErros(forma);

        const editando = Boolean(id);
        const cliente = editando ? await D.carregarCliente(id) : null;

        alvo.querySelector('[data-forma-rotulo]').textContent = editando ? 'Editar' : 'Cadastro';
        alvo.querySelector('[data-forma-titulo]').textContent = editando ? cliente.nome : 'Novo cliente';
        alvo.querySelector('[data-forma-enviar]').textContent = editando
            ? 'Salvar alterações'
            : 'Cadastrar cliente';

        if (cliente) {
            preencherFormulario(forma, {
                id: cliente.id,
                tipo: cliente.tipo,
                nome: cliente.nome,
                documento: F.documento(cliente.documento),
                telefone: F.telefone(cliente.telefone),
                whatsapp: F.telefone(cliente.whatsapp),
                email: cliente.email,
                cep: F.cep(cliente.cep),
                logradouro: cliente.logradouro,
                numero: cliente.numero,
                complemento: cliente.complemento,
                bairro: cliente.bairro,
                cidade: cliente.cidade,
                estado: cliente.estado,
                observacoes: cliente.observacoes
            });
        }

        UI.abrirDialogo(alvo);
    }

    async function salvarCliente(forma) {
        const dados = UI.lerFormulario(forma);

        const registro = await D.salvarCliente({
            id: dados.id || null,
            tipo: dados.tipo,
            nome: dados.nome,
            documento: F.soDigitos(dados.documento),
            telefone: F.soDigitos(dados.telefone),
            whatsapp: F.soDigitos(dados.whatsapp || dados.telefone),
            email: dados.email,
            cep: F.soDigitos(dados.cep),
            logradouro: dados.logradouro,
            numero: dados.numero,
            complemento: dados.complemento,
            bairro: dados.bairro,
            cidade: dados.cidade,
            estado: (dados.estado || 'SP').toUpperCase(),
            observacoes: dados.observacoes
        });

        UI.notificar({
            titulo: dados.id ? 'Cliente atualizado.' : 'Cliente cadastrado com sucesso.',
            texto: registro.nome
        });

        avisarMudanca('cliente', registro);
    }

    /* ---------- Visita ---------- */

    async function abrirVisita(opcoes) {
        const dados = opcoes || {};
        const alvo = dialogo('visita');
        const forma = alvo.querySelector('[data-forma="visita"]');

        forma.reset();
        limparErros(forma);

        const editando = Boolean(dados.id);
        const visita = editando ? await D.carregarVisita(dados.id) : null;

        alvo.querySelector('[data-forma-rotulo]').textContent = editando ? 'Editar' : 'Agenda';
        alvo.querySelector('[data-forma-titulo]').textContent = editando
            ? 'Editar visita'
            : 'Nova visita';
        alvo.querySelector('[data-forma-enviar]').textContent = editando
            ? 'Salvar alterações'
            : 'Agendar visita';

        const clienteId = visita ? visita.clienteId : dados.clienteId;

        await preencherClientes(forma.querySelector('[data-lista-clientes]'), clienteId);
        await preencherTecnicos(forma.querySelector('[data-lista-tecnicos]'), visita && visita.tecnicoId);
        await preencherEquipamentos(
            forma.querySelector('[data-lista-equipamentos]'),
            clienteId,
            visita ? visita.equipamento : dados.equipamento
        );

        preencherFormulario(forma, {
            id: visita ? visita.id : '',
            data: visita ? visita.data : F.paraISO(new Date()),
            hora: visita ? visita.hora : '09:00',
            tipo: visita ? visita.tipo : 'Manutenção preventiva',
            motivo: visita ? visita.motivo : '',
            observacoes: visita ? visita.observacoes : ''
        });

        UI.abrirDialogo(alvo);
    }

    async function salvarVisita(forma) {
        const dados = UI.lerFormulario(forma);

        const registro = await D.salvarVisita({
            id: dados.id || null,
            clienteId: dados.clienteId,
            equipamento: dados.equipamento || null,
            data: dados.data,
            hora: dados.hora,
            tecnicoId: dados.tecnicoId,
            tipo: dados.tipo,
            motivo: dados.motivo,
            observacoes: dados.observacoes
        });

        UI.notificar({
            titulo: dados.id ? 'Visita atualizada.' : 'Visita agendada com sucesso.',
            texto: `${F.dataRelativa(registro.data)} às ${registro.hora}`
        });

        avisarMudanca('visita', registro);
    }

    /* ---------- Equipamento ---------- */

    async function abrirEquipamento(opcoes) {
        const dados = opcoes || {};
        const alvo = dialogo('equipamento');
        const forma = alvo.querySelector('[data-forma="equipamento"]');

        forma.reset();
        limparErros(forma);

        const editando = Boolean(dados.codigo);
        const equipamento = editando ? await D.carregarEquipamento(dados.codigo) : null;

        alvo.querySelector('[data-forma-rotulo]').textContent = editando ? 'Editar' : 'Cadastro';
        alvo.querySelector('[data-forma-titulo]').textContent = editando
            ? equipamento.codigo
            : 'Novo equipamento';
        alvo.querySelector('[data-forma-enviar]').textContent = editando
            ? 'Salvar alterações'
            : 'Cadastrar equipamento';

        // O código só aparece depois de salvar: é o backend que numera a etiqueta.
        alvo.querySelector('[data-forma-codigo]').textContent = editando
            ? `Código ${equipamento.codigo} · número de série ${equipamento.numeroSerie || 'não informado'}`
            : 'O código FA será gerado automaticamente ao salvar.';

        await preencherClientes(
            forma.querySelector('[data-lista-clientes]'),
            equipamento ? equipamento.clienteId : dados.clienteId
        );

        preencherFormulario(forma, {
            codigo: equipamento ? equipamento.codigo : '',
            tipo: equipamento ? equipamento.tipo : 'Split Hi-Wall',
            marca: equipamento ? equipamento.marca : '',
            modelo: equipamento ? equipamento.modelo : '',
            capacidade: equipamento ? equipamento.capacidade : 12000,
            numeroSerie: equipamento ? equipamento.numeroSerie : '',
            local: equipamento ? equipamento.local : '',
            dataInstalacao: equipamento ? equipamento.dataInstalacao : F.paraISO(new Date()),
            proximaManutencao: equipamento ? equipamento.proximaManutencao : '',
            status: equipamento ? equipamento.status : 'funcionando',
            observacoes: equipamento ? equipamento.observacoes : ''
        });

        UI.abrirDialogo(alvo);
    }

    async function salvarEquipamento(forma) {
        const dados = UI.lerFormulario(forma);

        const registro = await D.salvarEquipamento({
            codigo: dados.codigo || null,
            clienteId: dados.clienteId,
            tipo: dados.tipo,
            marca: dados.marca,
            modelo: dados.modelo,
            capacidade: dados.capacidade,
            numeroSerie: dados.numeroSerie,
            local: dados.local,
            dataInstalacao: dados.dataInstalacao,
            proximaManutencao: dados.proximaManutencao || null,
            status: dados.status,
            observacoes: dados.observacoes
        });

        UI.notificar({
            titulo: dados.codigo ? 'Equipamento atualizado.' : 'Equipamento cadastrado com sucesso.',
            texto: `${registro.codigo} · ${registro.marca} ${registro.modelo}`
        });

        avisarMudanca('equipamento', registro);
    }

    /* ---------- Detalhe da visita ----------
       Uma visita não merece uma página inteira: o que se faz com ela é ligar,
       conferir endereço e fechar o atendimento. Isso cabe numa folha. */

    async function abrirDetalheVisita(id) {
        const visita = await D.carregarVisita(id);
        if (!visita) return;

        const alvo = dialogo('visita-detalhe');
        const cliente = visita.cliente || {};
        const equipamento = visita.equipamentoDados;

        alvo.querySelector('[data-detalhe-faixa]').textContent =
            `${visita.faixa.rotulo} · ${F.dataCurta(visita.data)} às ${visita.hora}`;
        alvo.querySelector('[data-detalhe-titulo]').textContent = cliente.nome || 'Visita';

        const linhas = [
            ['Atendimento', visita.tipo],
            ['Motivo', visita.motivo],
            ['Equipamento', equipamento
                ? `${equipamento.codigo} · ${equipamento.descricao} · ${F.milhar(equipamento.capacidade)} BTUs`
                : 'Não vinculado'],
            ['Local', equipamento ? equipamento.local : '—'],
            ['Endereço', visita.endereco.completo],
            ['Técnico', visita.tecnico ? visita.tecnico.nome : 'A definir'],
            ['Observações', visita.observacoes || '—']
        ];

        alvo.querySelector('[data-detalhe-corpo]').innerHTML =
            `<p class="detalhe__estado">${UI.marca('visita', visita.status)}</p>`
            + '<dl class="dados">'
            + linhas
                .map((linha) => '<div class="dados__par">'
                    + `<dt>${escapar(linha[0])}</dt><dd>${escapar(linha[1])}</dd></div>`)
                .join('')
            + '</dl>';

        const acoes = [];

        if (cliente.telefone) {
            acoes.push(`<a class="botao botao--secundario" href="${F.linkTelefone(cliente.telefone)}"
                           data-pressionavel>Ligar</a>`);
        }

        if (cliente.whatsapp) {
            const texto = `Olá, ${F.primeiroNome(cliente.nome)}! Aqui é da Frio Arte, sobre a visita `
                + `de ${F.dataCurta(visita.data)} às ${visita.hora}.`;

            acoes.push(`<a class="botao botao--secundario" target="_blank" rel="noopener"
                           href="${F.linkWhatsapp(cliente.whatsapp, texto)}" data-pressionavel>WhatsApp</a>`);
        }

        if (visita.status === 'agendada' || visita.status === 'andamento') {
            acoes.push(`<button class="botao botao--primario" type="button"
                            data-concluir="${visita.id}" data-pressionavel>Concluir visita</button>`);
        }

        acoes.push(`<a class="elo detalhe__elo" href="/sistema/clientes/${cliente.id}">Ver cliente</a>`);

        alvo.querySelector('[data-detalhe-acoes]').innerHTML = acoes.join('');

        UI.abrirDialogo(alvo);
    }

    /* ---------- Apoio ---------- */

    function preencherFormulario(forma, valores) {
        Object.entries(valores).forEach(([nome, valor]) => {
            const campos = forma.querySelectorAll(`[name="${nome}"]`);

            campos.forEach((campo) => {
                if (campo.type === 'radio') {
                    campo.checked = campo.value === String(valor);
                    return;
                }

                campo.value = valor === null || valor === undefined ? '' : valor;
            });
        });
    }

    function limparErros(forma) {
        forma.querySelectorAll('[data-campo-erro]').forEach((no) => {
            no.textContent = '';
        });

        forma.querySelectorAll('[data-invalido]').forEach((campo) => {
            delete campo.dataset.invalido;
        });
    }

    /* ---------- Ligações ---------- */

    function ligarFormulario(nome, salvar) {
        const forma = document.querySelector(`[data-forma="${nome}"]`);
        if (!forma) return;

        forma.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            if (!UI.validar(forma)) return;

            const botao = forma.querySelector('[data-forma-enviar]');
            const rotulo = botao.textContent;

            botao.disabled = true;
            botao.dataset.ocupado = 'true';

            try {
                await salvar(forma);
                UI.fecharDialogo(forma.closest('dialog'));
            } catch (erro) {
                console.error(`[sistema] falha ao salvar ${nome}:`, erro);
                UI.notificar({ titulo: 'Não foi possível salvar.', tom: 'ruim' });
            } finally {
                botao.disabled = false;
                delete botao.dataset.ocupado;
                botao.textContent = rotulo;
            }
        });

        // Máscaras: o valor sai formatado da tela e entra em dígitos na base.
        forma.querySelectorAll('[data-mascara]').forEach((campo) => {
            UI.mascarar(campo, campo.dataset.mascara);
        });

        // Trocar o cliente troca a lista de equipamentos.
        const cliente = forma.querySelector('[data-lista-clientes]');
        const equipamentos = forma.querySelector('[data-lista-equipamentos]');

        if (cliente && equipamentos) {
            cliente.addEventListener('change', () => {
                preencherEquipamentos(equipamentos, cliente.value);
            });
        }
    }

    function iniciar() {
        ligarFormulario('cliente', salvarCliente);
        ligarFormulario('visita', salvarVisita);
        ligarFormulario('equipamento', salvarEquipamento);

        /*
         * Um ouvinte só, no documento: os botões que abrem formulário nascem e
         * morrem o tempo todo dentro das listas, e ligar evento em cada um deles
         * a cada redesenho seria vazamento garantido.
         */
        document.addEventListener('click', (evento) => {
            const abrir = evento.target.closest('[data-abrir]');

            if (abrir) {
                evento.preventDefault();
                const dados = abrir.dataset;

                if (dados.abrir === 'cliente') abrirCliente(dados.id || null);
                if (dados.abrir === 'visita') {
                    abrirVisita({
                        id: dados.id || null,
                        clienteId: dados.cliente || null,
                        equipamento: dados.equipamento || null
                    });
                }
                if (dados.abrir === 'equipamento') {
                    abrirEquipamento({ codigo: dados.codigo || null, clienteId: dados.cliente || null });
                }

                return;
            }

            const detalhe = evento.target.closest('[data-visita]');

            if (detalhe) {
                /*
                 * O cartão inteiro abre o detalhe, mas "Ligar" e "WhatsApp"
                 * moram dentro dele. Um link clicado tem prioridade sobre o
                 * cartão que o contém — senão o toque no telefone abriria a
                 * folha por cima da ligação.
                 */
                const interativo = evento.target.closest('a[href], button');

                if (interativo && interativo !== detalhe && !interativo.hasAttribute('data-visita')) {
                    return;
                }

                evento.preventDefault();
                abrirDetalheVisita(detalhe.dataset.visita);
                return;
            }

            const concluir = evento.target.closest('[data-concluir]');

            if (concluir) {
                concluir.disabled = true;

                D.atualizarStatusVisita(concluir.dataset.concluir, 'concluida').then((visita) => {
                    UI.fecharDialogo(dialogo('visita-detalhe'));
                    UI.notificar({ titulo: 'Visita concluída.' });
                    avisarMudanca('visita', visita);
                });
            }
        });
    }

    window.FrioArteFormularios = {
        iniciar,
        abrirCliente,
        abrirVisita,
        abrirEquipamento,
        abrirDetalheVisita
    };
})();
