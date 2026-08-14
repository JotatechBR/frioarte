/**
 * Camada de dados do sistema.
 *
 * É a única parte do frontend que sabe de onde os dados vêm. Hoje eles vêm dos
 * mocks; amanhã, de `fetch('/api/clientes')`. Nenhuma tela precisa saber a
 * diferença — todas já falam com funções assíncronas que devolvem o objeto
 * pronto para desenhar.
 *
 * Por isso três decisões que parecem exagero num protótipo:
 *
 *   1. tudo é `async`, mesmo lendo de um array em memória;
 *   2. tudo devolve cópia, para nenhuma tela conseguir corromper a base;
 *   3. junções e contas (equipamentos por cliente, próxima visita, atraso)
 *      acontecem aqui, e não na tela. É o mesmo trabalho que o backend fará.
 *
 * O que o usuário cadastra durante a sessão fica em `sessionStorage`, e não
 * dentro do mock: os mocks têm datas relativas a hoje, e congelá-los faria a
 * agenda envelhecer. Guardando só o que mudou, o protótipo continua honesto e
 * o cliente recém-cadastrado sobrevive à navegação entre telas.
 */

(function () {
    const F = window.FrioArteFormato;

    /** Existe para os estados de carregamento serem reais, e não decorativos. */
    const LATENCIA = 120;

    const CHAVE = 'frioarte.sistema.alteracoes.v1';

    const vazio = { clientes: [], equipamentos: [], visitas: [] };

    let alteracoes = ler();

    /* ---------- Sessão ---------- */

    function ler() {
        try {
            return Object.assign({}, vazio, JSON.parse(sessionStorage.getItem(CHAVE)) || {});
        } catch (erro) {
            // Navegação privada, storage cheio ou JSON corrompido: o sistema
            // funciona igual, só não lembra do que foi cadastrado agora.
            return Object.assign({}, vazio);
        }
    }

    function gravar() {
        try {
            sessionStorage.setItem(CHAVE, JSON.stringify(alteracoes));
        } catch (erro) {
            /* sem persistência de sessão; segue em memória */
        }
    }

    function limparSimulacao() {
        alteracoes = Object.assign({}, vazio);
        try {
            sessionStorage.removeItem(CHAVE);
        } catch (erro) {
            /* nada a fazer */
        }
    }

    /**
     * Mock + alterações da sessão. O que foi editado substitui pelo id; o que
     * foi criado entra no fim.
     */
    function juntar(nome, chave) {
        const original = (window.FrioArteMock[nome] || []).map(copiar);
        const mudanca = alteracoes[nome] || [];

        mudanca.forEach((registro) => {
            const posicao = original.findIndex((item) => item[chave] === registro[chave]);

            if (posicao >= 0) original[posicao] = copiar(registro);
            else original.push(copiar(registro));
        });

        return original;
    }

    function copiar(valor) {
        return JSON.parse(JSON.stringify(valor));
    }

    function esperar() {
        return new Promise((resolve) => setTimeout(resolve, LATENCIA));
    }

    /* ---------- Bases ---------- */

    function baseClientes() {
        return juntar('clientes', 'id');
    }

    function baseEquipamentos() {
        return juntar('equipamentos', 'codigo');
    }

    function baseVisitas() {
        return juntar('visitas', 'id');
    }

    function baseTecnicos() {
        return (window.FrioArteMock.tecnicos || []).map(copiar);
    }

    /* ---------- Enriquecimento ----------
       Cada função devolve o registro com o que a tela precisa mostrar junto:
       nome do cliente, endereço resolvido, tempo de instalação, atraso. */

    function endereco(cliente) {
        if (!cliente) return { curto: '—', linha: '—', completo: '—' };

        const numero = cliente.numero ? `, ${cliente.numero}` : '';
        const complemento = cliente.complemento ? ` — ${cliente.complemento}` : '';

        return {
            curto: `${cliente.bairro}, ${cliente.cidade}`,
            linha: `${cliente.logradouro}${numero} — ${cliente.bairro}`,
            completo: `${cliente.logradouro}${numero}${complemento} — ${cliente.bairro}, `
                + `${cliente.cidade}/${cliente.estado} · CEP ${F.cep(cliente.cep)}`
        };
    }

    function comCliente(cliente, equipamentos, visitas) {
        const meus = equipamentos.filter((equipamento) => equipamento.clienteId === cliente.id);

        const abertas = visitas
            .filter((visita) => visita.clienteId === cliente.id && ehAberta(visita))
            .sort(porQuando);

        return Object.assign({}, cliente, {
            endereco: endereco(cliente),
            totalEquipamentos: meus.length,
            equipamentosAtencao: meus.filter((item) => item.status !== 'funcionando').length,
            proximaVisita: abertas[0] || null
        });
    }

    function comEquipamento(equipamento, clientes) {
        const dono = clientes.find((cliente) => cliente.id === equipamento.clienteId) || null;

        return Object.assign({}, equipamento, {
            cliente: dono
                ? { id: dono.id, nome: dono.nome, telefone: dono.telefone, whatsapp: dono.whatsapp }
                : null,
            endereco: endereco(dono),
            descricao: `${equipamento.marca} ${equipamento.modelo}`,
            tempoInstalado: F.tempoDesde(equipamento.dataInstalacao),
            manutencaoVencida: venceu(equipamento.proximaManutencao)
        });
    }

    function comVisita(visita, clientes, equipamentos, tecnicos) {
        const cliente = clientes.find((item) => item.id === visita.clienteId) || null;
        const equipamento = equipamentos.find((item) => item.codigo === visita.equipamento) || null;
        const tecnico = tecnicos.find((item) => item.id === visita.tecnicoId) || null;

        return Object.assign({}, visita, {
            cliente: cliente
                ? {
                    id: cliente.id,
                    nome: cliente.nome,
                    telefone: cliente.telefone,
                    whatsapp: cliente.whatsapp
                }
                : null,
            equipamentoDados: equipamento
                ? {
                    codigo: equipamento.codigo,
                    descricao: `${equipamento.marca} ${equipamento.modelo}`,
                    capacidade: equipamento.capacidade,
                    local: equipamento.local
                }
                : null,
            tecnico: tecnico ? { id: tecnico.id, nome: tecnico.nome, apelido: tecnico.apelido } : null,
            endereco: endereco(cliente),
            faixa: F.faixaAgenda(visita.data, visita.hora, visita.status)
        });
    }

    /* ---------- Regras de apoio ---------- */

    function ehAberta(visita) {
        return visita.status === 'agendada' || visita.status === 'andamento';
    }

    function venceu(iso) {
        const dias = F.diasAte(iso);
        return dias !== null && dias < 0;
    }

    function porQuando(a, b) {
        return `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`);
    }

    function porQuandoDesc(a, b) {
        return porQuando(b, a);
    }

    /** Compara texto já normalizado; usada por toda busca do sistema. */
    function contem(alvo, termo) {
        return F.normalizar(alvo).includes(termo);
    }

    /**
     * Um cliente é encontrado por nome, telefone, documento ou endereço. Dígitos
     * e letras são comparados separadamente: quem digita "11982" está procurando
     * telefone, não nome.
     */
    function clienteBate(cliente, termo, digitos) {
        if (digitos && digitos.length >= 3) {
            const campos = [cliente.telefone, cliente.whatsapp, cliente.documento, cliente.cep];
            if (campos.some((valor) => F.soDigitos(valor).includes(digitos))) return true;
        }

        return contem(cliente.nome, termo)
            || contem(cliente.email, termo)
            || contem(`${cliente.logradouro} ${cliente.bairro} ${cliente.cidade}`, termo);
    }

    function equipamentoBate(equipamento, cliente, termo, digitos) {
        if (digitos && digitos.length >= 3 && F.soDigitos(equipamento.codigo).includes(digitos)) {
            return true;
        }

        return contem(equipamento.codigo, termo)
            || contem(equipamento.numeroSerie, termo)
            || contem(`${equipamento.marca} ${equipamento.modelo} ${equipamento.tipo}`, termo)
            || contem(equipamento.local, termo)
            || (cliente ? clienteBate(cliente, termo, digitos) : false);
    }

    /* ---------- Consultas ---------- */

    async function carregarUsuario() {
        return copiar(window.FrioArteMock.usuario);
    }

    async function carregarTecnicos() {
        return baseTecnicos();
    }

    async function carregarClientes(filtros) {
        await esperar();

        const opcoes = filtros || {};
        const equipamentos = baseEquipamentos();
        const visitas = baseVisitas();

        const termo = F.normalizar(opcoes.termo);
        const digitos = F.soDigitos(opcoes.termo);

        return baseClientes()
            .filter((cliente) => (termo ? clienteBate(cliente, termo, digitos) : true))
            .map((cliente) => comCliente(cliente, equipamentos, visitas))
            .filter((cliente) => aplicarFiltroCliente(cliente, opcoes.filtro))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }

    function aplicarFiltroCliente(cliente, filtro) {
        if (!filtro || filtro === 'todos') return true;
        if (filtro === 'ativos') return cliente.status === 'ativo';
        if (filtro === 'agendados') return Boolean(cliente.proximaVisita);
        if (filtro === 'atencao') return cliente.equipamentosAtencao > 0;
        if (filtro === 'sem-equipamento') return cliente.totalEquipamentos === 0;

        return true;
    }

    async function carregarCliente(id) {
        await esperar();

        const numero = Number(id);
        const cliente = baseClientes().find((item) => item.id === numero);
        if (!cliente) return null;

        return comCliente(cliente, baseEquipamentos(), baseVisitas());
    }

    async function carregarEquipamentos(filtros) {
        await esperar();

        const opcoes = filtros || {};
        const clientes = baseClientes();

        const termo = F.normalizar(opcoes.termo);
        const digitos = F.soDigitos(opcoes.termo);

        return baseEquipamentos()
            .filter((equipamento) => {
                if (opcoes.clienteId && equipamento.clienteId !== Number(opcoes.clienteId)) {
                    return false;
                }

                if (!termo && !digitos) return true;

                const dono = clientes.find((cliente) => cliente.id === equipamento.clienteId);
                return equipamentoBate(equipamento, dono, termo, digitos);
            })
            .map((equipamento) => comEquipamento(equipamento, clientes))
            .filter((equipamento) => aplicarFiltroEquipamento(equipamento, opcoes.filtro))
            .sort((a, b) => a.codigo.localeCompare(b.codigo));
    }

    function aplicarFiltroEquipamento(equipamento, filtro) {
        if (!filtro || filtro === 'todos') return true;
        if (filtro === 'manutencao') return equipamento.manutencaoVencida;

        return equipamento.status === filtro;
    }

    async function carregarEquipamento(codigo) {
        await esperar();

        const alvo = String(codigo || '').toUpperCase();
        const equipamento = baseEquipamentos().find((item) => item.codigo.toUpperCase() === alvo);
        if (!equipamento) return null;

        return comEquipamento(equipamento, baseClientes());
    }

    async function carregarVisitas(filtros) {
        await esperar();

        const opcoes = filtros || {};
        const clientes = baseClientes();
        const equipamentos = baseEquipamentos();
        const tecnicos = baseTecnicos();

        const termo = F.normalizar(opcoes.termo);
        const digitos = F.soDigitos(opcoes.termo);

        return baseVisitas()
            .filter((visita) => {
                if (opcoes.clienteId && visita.clienteId !== Number(opcoes.clienteId)) return false;
                if (opcoes.equipamento && visita.equipamento !== opcoes.equipamento) return false;

                if (!termo && !digitos) return true;

                const cliente = clientes.find((item) => item.id === visita.clienteId);

                return (cliente ? clienteBate(cliente, termo, digitos) : false)
                    || contem(visita.tipo, termo)
                    || contem(visita.motivo, termo)
                    || contem(visita.equipamento || '', termo);
            })
            .map((visita) => comVisita(visita, clientes, equipamentos, tecnicos))
            .filter((visita) => aplicarFiltroVisita(visita, opcoes.periodo))
            .sort(ordemDoPeriodo(opcoes.periodo));
    }

    function aplicarFiltroVisita(visita, periodo) {
        if (!periodo || periodo === 'todas') return true;

        const dias = F.diasAte(visita.data);

        if (periodo === 'hoje') return dias === 0 || visita.faixa.chave === 'atrasada';
        if (periodo === 'semana') return ehAberta(visita) && dias >= 0 && dias <= 7;
        if (periodo === 'proximas') return ehAberta(visita) && dias >= 0;
        if (periodo === 'concluidas') return visita.status === 'concluida';
        if (periodo === 'canceladas') return visita.status === 'cancelada';

        return true;
    }

    /** Agenda futura sobe do mais próximo; histórico desce do mais recente. */
    function ordemDoPeriodo(periodo) {
        const passado = periodo === 'concluidas' || periodo === 'canceladas';
        return passado ? porQuandoDesc : porQuando;
    }

    async function carregarVisita(id) {
        await esperar();

        const numero = Number(id);
        const visita = baseVisitas().find((item) => item.id === numero);
        if (!visita) return null;

        return comVisita(visita, baseClientes(), baseEquipamentos(), baseTecnicos());
    }

    /* ---------- Painel ---------- */

    async function carregarResumo() {
        await esperar();

        const clientes = baseClientes();
        const equipamentos = baseEquipamentos();
        const visitas = baseVisitas();

        const hoje = visitas.filter((visita) => ehAberta(visita) && F.diasAte(visita.data) === 0);

        const semana = visitas.filter((visita) => {
            const dias = F.diasAte(visita.data);
            return ehAberta(visita) && dias > 0 && dias <= 7;
        });

        return {
            clientes: clientes.length,
            clientesAtivos: clientes.filter((cliente) => cliente.status === 'ativo').length,
            equipamentos: equipamentos.length,
            visitasHoje: hoje.length,
            visitasSemana: semana.length,
            manutencoes: pendencias(equipamentos, baseClientes()).length
        };
    }

    /**
     * A agenda do painel: tudo que está em aberto daqui para a frente, mais o
     * que ficou para trás sem ser fechado. Visita atrasada não pode sumir da
     * tela só porque a data passou — é justamente a que precisa de ação.
     */
    async function carregarAgenda(limite) {
        await esperar();

        const clientes = baseClientes();
        const equipamentos = baseEquipamentos();
        const tecnicos = baseTecnicos();

        const abertas = baseVisitas()
            .filter(ehAberta)
            .map((visita) => comVisita(visita, clientes, equipamentos, tecnicos))
            .sort(porQuando);

        return limite ? abertas.slice(0, limite) : abertas;
    }

    /**
     * Equipamentos que pedem atenção, do mais urgente para o menos: parado,
     * manutenção vencida, atenção, manutenção chegando.
     */
    function pendencias(equipamentos, clientes) {
        return equipamentos
            .map((equipamento) => comEquipamento(equipamento, clientes))
            .map((equipamento) => Object.assign({}, equipamento, { peso: peso(equipamento) }))
            .filter((equipamento) => equipamento.peso > 0)
            .sort((a, b) => b.peso - a.peso
                || String(a.proximaManutencao).localeCompare(String(b.proximaManutencao)));
    }

    function peso(equipamento) {
        if (equipamento.status === 'parado') return 4;
        if (equipamento.manutencaoVencida) return 3;
        if (equipamento.status === 'atencao') return 2;

        // Duas semanas é o horizonte em que a manutenção vira tarefa. Um mês
        // inteiro encheria a lista de coisas que ainda não precisam de decisão.
        const dias = F.diasAte(equipamento.proximaManutencao);
        if (dias !== null && dias <= 14) return 1;

        return 0;
    }

    async function carregarManutencoes(limite) {
        await esperar();

        const lista = pendencias(baseEquipamentos(), baseClientes());
        return limite ? lista.slice(0, limite) : lista;
    }

    /**
     * Avisos do sino. Todos calculados a partir das datas — nenhum aviso é
     * cadastrado, porque nenhum aviso é um dado: é uma leitura da agenda.
     */
    async function carregarAvisos() {
        const clientes = baseClientes();
        const equipamentos = baseEquipamentos();
        const tecnicos = baseTecnicos();

        const avisos = [];

        baseVisitas()
            .filter(ehAberta)
            .map((visita) => comVisita(visita, clientes, equipamentos, tecnicos))
            .sort(porQuando)
            .forEach((visita) => {
                const minutos = F.minutosAte(visita.data, visita.hora);
                const dias = F.diasAte(visita.data);

                if (visita.faixa.chave === 'atrasada') {
                    avisos.push({ tipo: 'atrasada', titulo: 'Visita atrasada', visita });
                    return;
                }

                if (minutos !== null && minutos <= 90 && dias === 0) {
                    avisos.push({
                        tipo: 'agora',
                        titulo: `Visita ${F.tempoRelativo(visita.data, visita.hora)}`,
                        visita
                    });
                    return;
                }

                if (dias === 0) {
                    avisos.push({ tipo: 'hoje', titulo: 'Visita hoje', visita });
                    return;
                }

                if (dias === 1) {
                    avisos.push({ tipo: 'amanha', titulo: 'Visita amanhã', visita });
                }
            });

        return avisos;
    }

    /* ---------- Busca global ---------- */

    async function buscar(texto) {
        const termo = F.normalizar(texto);
        const digitos = F.soDigitos(texto);

        if (termo.length < 2 && digitos.length < 3) {
            return { clientes: [], equipamentos: [], visitas: [], total: 0 };
        }

        const clientes = baseClientes();
        const equipamentos = baseEquipamentos();
        const tecnicos = baseTecnicos();
        const visitas = baseVisitas();

        const achouClientes = clientes
            .filter((cliente) => clienteBate(cliente, termo, digitos))
            .map((cliente) => comCliente(cliente, equipamentos, visitas))
            .slice(0, 5);

        const achouEquipamentos = equipamentos
            .filter((equipamento) => {
                if (digitos.length >= 3 && F.soDigitos(equipamento.codigo).includes(digitos)) {
                    return true;
                }

                return contem(equipamento.codigo, termo)
                    || contem(equipamento.numeroSerie, termo)
                    || contem(`${equipamento.marca} ${equipamento.modelo}`, termo)
                    || contem(equipamento.local, termo);
            })
            .map((equipamento) => comEquipamento(equipamento, clientes))
            .slice(0, 5);

        const achouVisitas = visitas
            .filter(ehAberta)
            .map((visita) => comVisita(visita, clientes, equipamentos, tecnicos))
            .filter((visita) => {
                const cliente = clientes.find((item) => item.id === visita.clienteId);
                return (cliente ? clienteBate(cliente, termo, digitos) : false)
                    || contem(visita.tipo, termo);
            })
            .sort(porQuando)
            .slice(0, 3);

        return {
            clientes: achouClientes,
            equipamentos: achouEquipamentos,
            visitas: achouVisitas,
            total: achouClientes.length + achouEquipamentos.length + achouVisitas.length
        };
    }

    /* ---------- Histórico ----------
       Histórico não é uma tabela à parte: é a leitura cronológica do que já
       aconteceu com o registro. Montá-lo aqui evita que cada tela invente o
       seu. */

    async function carregarHistoricoEquipamento(codigo) {
        await esperar();

        const equipamento = baseEquipamentos().find((item) => item.codigo === codigo);
        if (!equipamento) return [];

        const clientes = baseClientes();
        const tecnicos = baseTecnicos();

        const eventos = baseVisitas()
            .filter((visita) => visita.equipamento === codigo && visita.status === 'concluida')
            .map((visita) => ({
                data: visita.data,
                tipo: visita.tipo,
                descricao: visita.observacoes || visita.motivo,
                autor: nomeTecnico(tecnicos, visita.tecnicoId),
                visitaId: visita.id
            }));

        eventos.push({
            data: equipamento.dataInstalacao,
            tipo: 'Instalação',
            descricao: `Equipamento instalado em ${equipamento.local.toLowerCase()}.`,
            autor: nomeCliente(clientes, equipamento.clienteId),
            marco: true
        });

        return eventos.sort((a, b) => String(b.data).localeCompare(String(a.data)));
    }

    async function carregarHistoricoCliente(id) {
        await esperar();

        const numero = Number(id);
        const cliente = baseClientes().find((item) => item.id === numero);
        if (!cliente) return [];

        const tecnicos = baseTecnicos();

        const eventos = baseVisitas()
            .filter((visita) => visita.clienteId === numero && visita.status !== 'agendada')
            .map((visita) => ({
                data: visita.data,
                tipo: visita.status === 'cancelada' ? `${visita.tipo} · cancelada` : visita.tipo,
                descricao: visita.observacoes || visita.motivo,
                autor: nomeTecnico(tecnicos, visita.tecnicoId),
                referencia: visita.equipamento
            }));

        baseEquipamentos()
            .filter((equipamento) => equipamento.clienteId === numero)
            .forEach((equipamento) => {
                eventos.push({
                    data: equipamento.dataInstalacao,
                    tipo: 'Instalação',
                    descricao: `${equipamento.marca} ${equipamento.modelo} em ${equipamento.local.toLowerCase()}.`,
                    referencia: equipamento.codigo
                });
            });

        eventos.push({
            data: cliente.clienteDesde,
            tipo: 'Cadastro',
            descricao: 'Cliente cadastrado na Frio Arte.',
            marco: true
        });

        return eventos.sort((a, b) => String(b.data).localeCompare(String(a.data)));
    }

    function nomeTecnico(tecnicos, id) {
        const tecnico = tecnicos.find((item) => item.id === id);
        return tecnico ? tecnico.nome : '';
    }

    function nomeCliente(clientes, id) {
        const cliente = clientes.find((item) => item.id === id);
        return cliente ? cliente.nome : '';
    }

    /* ---------- Gravação ----------
       Sem banco: grava na sessão e devolve o registro como um POST devolveria.
       O dia em que existir API, só o miolo destas três funções muda. */

    async function salvarCliente(dados) {
        await esperar();

        const clientes = baseClientes();
        const editando = Boolean(dados.id);

        const registro = Object.assign(
            {
                id: editando ? Number(dados.id) : proximoId(clientes, 'id'),
                status: 'ativo',
                clienteDesde: F.paraISO(new Date())
            },
            editando ? clientes.find((item) => item.id === Number(dados.id)) : {},
            dados
        );

        registro.id = Number(registro.id);

        guardar('clientes', 'id', registro);

        return copiar(registro);
    }

    async function salvarEquipamento(dados) {
        await esperar();

        const equipamentos = baseEquipamentos();
        const editando = Boolean(dados.codigo);

        const registro = Object.assign(
            {
                codigo: proximoCodigo(equipamentos),
                status: 'funcionando',
                ultimaManutencao: null,
                observacoes: ''
            },
            editando ? equipamentos.find((item) => item.codigo === dados.codigo) : {},
            dados
        );

        registro.clienteId = Number(registro.clienteId);
        registro.capacidade = Number(registro.capacidade);

        guardar('equipamentos', 'codigo', registro);

        return copiar(registro);
    }

    async function salvarVisita(dados) {
        await esperar();

        const visitas = baseVisitas();
        const editando = Boolean(dados.id);

        const registro = Object.assign(
            {
                id: editando ? Number(dados.id) : proximoId(visitas, 'id'),
                status: 'agendada',
                observacoes: ''
            },
            editando ? visitas.find((item) => item.id === Number(dados.id)) : {},
            dados
        );

        registro.id = Number(registro.id);
        registro.clienteId = Number(registro.clienteId);
        // Técnico é opcional: sem escolha, a visita fica "a definir" — e não
        // com um id 0 que não corresponde a ninguém.
        registro.tecnicoId = registro.tecnicoId ? Number(registro.tecnicoId) : null;

        guardar('visitas', 'id', registro);

        return copiar(registro);
    }

    /** Muda só o status — o que a lista de visitas faz ao concluir ou cancelar. */
    async function atualizarStatusVisita(id, status) {
        const visita = baseVisitas().find((item) => item.id === Number(id));
        if (!visita) return null;

        return salvarVisita(Object.assign({}, visita, { status }));
    }

    function guardar(nome, chave, registro) {
        const lista = alteracoes[nome] || [];
        const posicao = lista.findIndex((item) => item[chave] === registro[chave]);

        if (posicao >= 0) lista[posicao] = registro;
        else lista.push(registro);

        alteracoes[nome] = lista;
        gravar();
    }

    function proximoId(lista, chave) {
        return lista.reduce((maior, item) => Math.max(maior, Number(item[chave]) || 0), 0) + 1;
    }

    /** FA-000039, FA-000040… O código nasce sequencial, como uma etiqueta. */
    function proximoCodigo(equipamentos) {
        const maior = equipamentos.reduce((topo, equipamento) => {
            const numero = Number(String(equipamento.codigo).replace(/\D/g, ''));
            return Math.max(topo, Number.isNaN(numero) ? 0 : numero);
        }, 0);

        return `FA-${String(maior + 1).padStart(6, '0')}`;
    }

    /*
     * A camada inteira sai envolvida pelo diário: cada consulta e cada
     * gravação vira uma linha no terminal, com duração e tamanho do resultado,
     * sem que nenhuma função aqui saiba que está sendo observada.
     *
     * Quando estas funções virarem `fetch`, o registro continua valendo — e
     * passa a medir a rede, que é justamente o que se vai querer medir.
     */
    const api = {
        carregarUsuario,
        carregarTecnicos,
        carregarClientes,
        carregarCliente,
        carregarEquipamentos,
        carregarEquipamento,
        carregarVisitas,
        carregarVisita,
        carregarResumo,
        carregarAgenda,
        carregarManutencoes,
        carregarAvisos,
        carregarHistoricoCliente,
        carregarHistoricoEquipamento,
        buscar,
        salvarCliente,
        salvarEquipamento,
        salvarVisita,
        atualizarStatusVisita,
        limparSimulacao
    };

    // Se o diário não tiver subido, a camada sai crua. Sistema sem log funciona;
    // sistema que não abre porque o log falhou, não.
    window.FrioArteDados = window.FrioArteDiario
        ? window.FrioArteDiario.envolver('dados', api)
        : api;
})();
