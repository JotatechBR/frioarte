/**
 * Camada de dados do sistema.
 *
 * É a única parte do frontend que sabe de onde os dados vêm — e agora eles vêm
 * do MySQL, por `/api`. Nenhuma tela mudou para isso acontecer: todas já
 * falavam com funções assíncronas que devolvem o objeto pronto para desenhar, e
 * é exatamente esse contrato que este arquivo continua cumprindo.
 *
 * Três coisas acontecem aqui, e em lugar nenhum além daqui:
 *
 *   1. **Tradução de nomes.** O banco fala `cliente_id`, `data_instalacao`,
 *      `equipamento_codigo`; as telas falam `clienteId`, `dataInstalacao`,
 *      `equipamento`. A fronteira entre os dois vocabulários é este arquivo —
 *      espalhar `numero_serie` por dentro das telas seria deixar o formato da
 *      tabela vazar para dentro do HTML.
 *
 *   2. **Junções e contas.** Quantos equipamentos o cliente tem, qual a próxima
 *      visita, se a manutenção venceu, o que entra no histórico. A API entrega
 *      as três listas; quem as cruza é este arquivo, e não a tela.
 *
 *   3. **Cache curto.** Uma tela como o painel faz quatro perguntas diferentes
 *      que dependem das mesmas três listas. Sem cache seriam doze idas ao
 *      servidor para desenhar uma página. Com ele são três, e qualquer gravação
 *      derruba tudo — dado velho na tela é pior do que uma requisição a mais.
 */

(function () {
    const F = window.FrioArteFormato;

    const BASE = '/api';

    /*
     * Vida do cache. Curta de propósito: é o bastante para uma tela inteira se
     * desenhar a partir de uma leitura só, e curta demais para alguém ver na
     * tela o que outro técnico acabou de mudar do celular dele.
     */
    const CACHE_MS = 1500;

    const cache = new Map();

    /* ---------- Conversa com o servidor ---------- */

    async function pedir(metodo, caminho, corpo) {
        const opcoes = {
            method: metodo,
            headers: { Accept: 'application/json' },
            // O cookie de sessão precisa acompanhar o pedido; sem isto toda
            // chamada volta 401 e o sistema manda para o login em looping.
            credentials: 'same-origin'
        };

        if (corpo !== undefined) {
            opcoes.headers['Content-Type'] = 'application/json';
            opcoes.body = JSON.stringify(corpo);
        }

        const resposta = await fetch(`${BASE}${caminho}`, opcoes);

        if (resposta.status === 401) {
            irParaLogin();
            throw erroDe(401, 'Sessão expirada.');
        }

        if (resposta.status === 204) return null;

        let pacote = null;

        try {
            pacote = await resposta.json();
        } catch (erro) {
            /* Resposta sem JSON: o status abaixo é o que sobra para explicar. */
        }

        if (!resposta.ok || !pacote || pacote.sucesso === false) {
            throw erroDe(
                resposta.status,
                (pacote && pacote.erro) || `Falha na comunicação com o servidor (${resposta.status}).`
            );
        }

        return pacote.dados === undefined ? null : pacote.dados;
    }

    function erroDe(status, mensagem) {
        const erro = new Error(mensagem);
        erro.status = status;
        return erro;
    }

    /**
     * Sessão vencida no meio do uso. Leva ao login já com o endereço atual, para
     * a pessoa voltar para a tela em que estava — e não para o painel.
     */
    function irParaLogin() {
        const destino = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?destino=${destino}`);
    }

    /**
     * Leitura com cache. Guarda a *promessa*, e não o resultado: assim quatro
     * chamadas simultâneas ao mesmo endereço viram uma requisição só, e não
     * quatro que chegam antes da primeira responder.
     */
    function ler(caminho) {
        const guardado = cache.get(caminho);

        if (guardado && Date.now() - guardado.quando < CACHE_MS) return guardado.promessa;

        const promessa = pedir('GET', caminho).catch((erro) => {
            // Falha não fica em cache: a próxima tentativa tem que ir de novo ao
            // servidor, senão um soluço de rede congela a tela por segundos.
            cache.delete(caminho);
            throw erro;
        });

        cache.set(caminho, { quando: Date.now(), promessa });

        return promessa;
    }

    /** Gravou: tudo que estava lido virou passado. */
    function invalidar() {
        cache.clear();
    }

    /* ---------- Tradução ----------
       Banco à esquerda, tela à direita. Nenhum destes nomes aparece fora deste
       arquivo — é esse o ponto. */

    function clienteDaApi(linha) {
        return {
            id: Number(linha.id),
            tipo: linha.tipo,
            nome: linha.nome,
            documento: linha.documento || '',
            telefone: linha.telefone || '',
            whatsapp: linha.whatsapp || '',
            email: linha.email || '',
            cep: linha.cep || '',
            logradouro: linha.logradouro || '',
            numero: linha.numero || '',
            complemento: linha.complemento || '',
            bairro: linha.bairro || '',
            cidade: linha.cidade || '',
            estado: linha.estado || '',
            clienteDesde: linha.cliente_desde,
            status: linha.status,
            observacoes: linha.observacoes || ''
        };
    }

    function clienteParaApi(dados) {
        return semIndefinidos({
            tipo: dados.tipo,
            nome: dados.nome,
            documento: dados.documento,
            telefone: dados.telefone,
            whatsapp: dados.whatsapp,
            email: dados.email,
            cep: dados.cep,
            logradouro: dados.logradouro,
            numero: dados.numero,
            complemento: dados.complemento,
            bairro: dados.bairro,
            cidade: dados.cidade,
            estado: dados.estado,
            cliente_desde: dados.clienteDesde,
            status: dados.status,
            observacoes: dados.observacoes
        });
    }

    function equipamentoDaApi(linha) {
        return {
            codigo: linha.codigo,
            clienteId: Number(linha.cliente_id),
            clienteNome: linha.cliente_nome || '',
            tipo: linha.tipo,
            marca: linha.marca,
            modelo: linha.modelo,
            capacidade: linha.capacidade,
            numeroSerie: linha.numero_serie || '',
            local: linha.local,
            dataInstalacao: linha.data_instalacao,
            ultimaManutencao: linha.ultima_manutencao,
            proximaManutencao: linha.proxima_manutencao,
            status: linha.status,
            observacoes: linha.observacoes || ''
        };
    }

    function equipamentoParaApi(dados) {
        return semIndefinidos({
            cliente_id: dados.clienteId,
            tipo: dados.tipo,
            marca: dados.marca,
            modelo: dados.modelo,
            // A tabela guarda a capacidade como texto ("12000", "9.000 BTUs"):
            // o que vem do campo já serve, sem passar por Number.
            capacidade: dados.capacidade === undefined ? undefined : String(dados.capacidade),
            numero_serie: dados.numeroSerie,
            local: dados.local,
            data_instalacao: dados.dataInstalacao,
            ultima_manutencao: dados.ultimaManutencao,
            proxima_manutencao: dados.proximaManutencao,
            status: dados.status,
            observacoes: dados.observacoes
        });
    }

    function visitaDaApi(linha) {
        return {
            id: Number(linha.id),
            clienteId: Number(linha.cliente_id),
            clienteNome: linha.cliente_nome || '',
            equipamento: linha.equipamento_codigo || null,
            tecnicoId: linha.tecnico_id === null || linha.tecnico_id === undefined
                ? null
                : Number(linha.tecnico_id),
            tecnicoNome: linha.tecnico_nome || '',
            data: linha.data,
            hora: linha.hora,
            tipo: linha.tipo,
            motivo: linha.motivo || '',
            observacoes: linha.observacoes || '',
            status: linha.status
        };
    }

    function visitaParaApi(dados) {
        return semIndefinidos({
            cliente_id: dados.clienteId,
            equipamento_codigo: vazioVirandoNulo(dados.equipamento),
            tecnico_id: vazioVirandoNulo(dados.tecnicoId),
            data: dados.data,
            hora: dados.hora,
            tipo: dados.tipo,
            motivo: dados.motivo,
            observacoes: dados.observacoes,
            status: dados.status
        });
    }

    /*
     * Usuário e técnico são a mesma linha da mesma tabela, lida com dois olhos
     * diferentes. `tecnicoDaApi` prepara alguém para aparecer numa visita —
     * daí o apelido. `usuarioDaApi` prepara a mesma pessoa para a tela de
     * administração, onde o que importa é se ela consegue entrar.
     */
    function usuarioDaApi(linha) {
        return {
            id: Number(linha.id),
            usuario: linha.usuario,
            nome: linha.nome,
            funcao: linha.funcao,
            ativo: Boolean(linha.ativo)
        };
    }

    function tecnicoDaApi(linha) {
        return {
            id: Number(linha.id),
            nome: linha.nome,
            apelido: F.primeiroNome ? F.primeiroNome(linha.nome) : linha.nome,
            funcao: linha.funcao,
            usuario: linha.usuario
        };
    }

    /**
     * A API recusa campo que ela não conhece e trata `null` como "apague isto".
     * Campo ausente tem que continuar ausente — mandar `undefined` viraria
     * `null` no JSON e apagaria dado que ninguém pediu para apagar.
     */
    function semIndefinidos(objeto) {
        const pronto = {};

        Object.keys(objeto).forEach((chave) => {
            if (objeto[chave] !== undefined) pronto[chave] = objeto[chave];
        });

        return pronto;
    }

    /** Select vazio manda `''`; o banco quer `null`. */
    function vazioVirandoNulo(valor) {
        if (valor === undefined) return undefined;
        if (valor === null || valor === '') return null;

        return valor;
    }

    function consulta(parametros) {
        const busca = new URLSearchParams();

        Object.keys(parametros || {}).forEach((chave) => {
            const valor = parametros[chave];
            if (valor === undefined || valor === null || valor === '') return;

            busca.set(chave, String(valor));
        });

        const texto = busca.toString();

        return texto ? `?${texto}` : '';
    }

    /* ---------- Bases ----------
       As três listas do sistema, já traduzidas. Todo o resto deste arquivo é
       feito a partir delas. */

    async function baseClientes() {
        return (await ler('/clientes')).map(clienteDaApi);
    }

    async function baseEquipamentos() {
        return (await ler('/equipamentos')).map(equipamentoDaApi);
    }

    async function baseVisitas() {
        return (await ler('/visitas')).map(visitaDaApi);
    }

    async function baseTecnicos() {
        return (await ler('/usuarios?ativo=true')).map(tecnicoDaApi);
    }

    /*
     * Sem `?ativo=true`: a tela de administração precisa justamente ver quem
     * está sem acesso — é lá que se descobre por que fulano não consegue entrar.
     * É por isso que não dá para reaproveitar `baseTecnicos` aqui.
     */
    async function baseUsuarios() {
        return (await ler('/usuarios')).map(usuarioDaApi);
    }

    /** As três de uma vez, em paralelo. É o que quase toda tela precisa. */
    function bases() {
        return Promise.all([baseClientes(), baseEquipamentos(), baseVisitas()]);
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

    /**
     * Quem está com o sistema aberto, direto da sessão do servidor.
     *
     * Devolve null se algo der errado em vez de estourar: a barra lateral sabe
     * viver sem perfil, e o sistema inteiro não pode deixar de abrir porque o
     * nome do usuário não veio.
     */
    async function carregarUsuario() {
        try {
            return await ler('/acesso/eu');
        } catch (erro) {
            return null;
        }
    }

    async function carregarTecnicos() {
        return baseTecnicos();
    }

    /* ---------- Usuários ---------- */

    /**
     * Quem administra.
     *
     * A mesma lista de funções que o servidor usa em `exigirAdministrador.js`,
     * repetida aqui de propósito: esta cópia decide o que a *tela* mostra, e a
     * de lá decide o que o sistema *permite*. Se as duas saírem de sincronia, o
     * pior que acontece é um botão aparecer para quem levará um 403 ao clicar —
     * feio, mas não é brecha. O contrário, confiar só nesta, seria.
     */
    const FUNCOES_DE_MANDO = [
        'administrador', 'administradora', 'admin',
        'dono', 'dona', 'proprietario', 'proprietaria',
        'diretor', 'diretora', 'gestor', 'gestora'
    ];

    function ehAdministrador(usuario) {
        return Boolean(usuario) && FUNCOES_DE_MANDO.includes(F.normalizar(usuario.funcao));
    }

    async function carregarUsuarios(filtros) {
        const opcoes = filtros || {};
        const usuarios = await baseUsuarios();
        const termo = F.normalizar(opcoes.termo);

        return usuarios
            .filter((usuario) => (termo
                ? contem(`${usuario.nome} ${usuario.usuario} ${usuario.funcao}`, termo)
                : true))
            .filter((usuario) => aplicarFiltroUsuario(usuario, opcoes.filtro))
            /*
             * Quem perdeu o acesso desce para o fim da lista, e não some: a
             * pessoa continua no histórico das visitas dela, e uma tela que
             * escondesse a conta desativada deixaria "por que este nome aparece
             * na visita e não na lista?" sem resposta.
             */
            .sort((a, b) => (a.ativo === b.ativo
                ? a.nome.localeCompare(b.nome, 'pt-BR')
                : Number(b.ativo) - Number(a.ativo)));
    }

    function aplicarFiltroUsuario(usuario, filtro) {
        if (!filtro || filtro === 'todos') return true;
        if (filtro === 'ativos') return usuario.ativo;
        if (filtro === 'inativos') return !usuario.ativo;
        if (filtro === 'administradores') return ehAdministrador(usuario);

        return true;
    }

    /**
     * Um usuário só, tirado da lista já em cache — e não de `GET /usuarios/:id`.
     * Abrir o formulário de edição logo depois de desenhar a lista não deveria
     * custar uma segunda ida ao servidor para buscar o que acabou de chegar.
     */
    async function carregarUsuarioPorId(id) {
        const numero = Number(id);
        const usuarios = await baseUsuarios();

        return usuarios.find((usuario) => usuario.id === numero) || null;
    }

    async function carregarClientes(filtros) {
        const opcoes = filtros || {};
        const [clientes, equipamentos, visitas] = await bases();

        const termo = F.normalizar(opcoes.termo);
        const digitos = F.soDigitos(opcoes.termo);

        return clientes
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
        const numero = Number(id);
        const [clientes, equipamentos, visitas] = await bases();
        const cliente = clientes.find((item) => item.id === numero);
        if (!cliente) return null;

        return comCliente(cliente, equipamentos, visitas);
    }

    async function carregarEquipamentos(filtros) {
        const opcoes = filtros || {};
        const [clientes, equipamentos] = await Promise.all([baseClientes(), baseEquipamentos()]);

        const termo = F.normalizar(opcoes.termo);
        const digitos = F.soDigitos(opcoes.termo);

        return equipamentos
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
        const alvo = String(codigo || '').toUpperCase();
        const [clientes, equipamentos] = await Promise.all([baseClientes(), baseEquipamentos()]);
        const equipamento = equipamentos.find((item) => item.codigo.toUpperCase() === alvo);
        if (!equipamento) return null;

        return comEquipamento(equipamento, clientes);
    }

    async function carregarVisitas(filtros) {
        const opcoes = filtros || {};
        const [clientes, equipamentos, visitas] = await bases();
        const tecnicos = await baseTecnicos();

        const termo = F.normalizar(opcoes.termo);
        const digitos = F.soDigitos(opcoes.termo);

        return visitas
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
        const numero = Number(id);
        const [clientes, equipamentos, visitas] = await bases();
        const tecnicos = await baseTecnicos();

        const visita = visitas.find((item) => item.id === numero);
        if (!visita) return null;

        return comVisita(visita, clientes, equipamentos, tecnicos);
    }

    /* ---------- Painel ---------- */

    async function carregarResumo() {
        const [clientes, equipamentos, visitas] = await bases();

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
            manutencoes: pendencias(equipamentos, clientes).length
        };
    }

    /**
     * A agenda do painel: tudo que está em aberto daqui para a frente, mais o
     * que ficou para trás sem ser fechado. Visita atrasada não pode sumir da
     * tela só porque a data passou — é justamente a que precisa de ação.
     */
    async function carregarAgenda(limite) {
        const [clientes, equipamentos, visitas] = await bases();
        const tecnicos = await baseTecnicos();

        const abertas = visitas
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
        const [clientes, equipamentos] = await Promise.all([baseClientes(), baseEquipamentos()]);
        const lista = pendencias(equipamentos, clientes);

        return limite ? lista.slice(0, limite) : lista;
    }

    /**
     * Avisos do sino. Todos calculados a partir das datas — nenhum aviso é
     * cadastrado, porque nenhum aviso é um dado: é uma leitura da agenda.
     */
    async function carregarAvisos() {
        const [clientes, equipamentos, visitas] = await bases();
        const tecnicos = await baseTecnicos();

        const avisos = [];

        visitas
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

        const [clientes, equipamentos, visitas] = await bases();
        const tecnicos = await baseTecnicos();

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
        const [clientes, equipamentos, visitas] = await bases();
        const tecnicos = await baseTecnicos();

        const equipamento = equipamentos.find((item) => item.codigo === codigo);
        if (!equipamento) return [];

        const eventos = visitas
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
        const numero = Number(id);
        const [clientes, equipamentos, visitas] = await bases();
        const tecnicos = await baseTecnicos();

        const cliente = clientes.find((item) => item.id === numero);
        if (!cliente) return [];

        const eventos = visitas
            .filter((visita) => visita.clienteId === numero && visita.status !== 'agendada')
            .map((visita) => ({
                data: visita.data,
                tipo: visita.status === 'cancelada' ? `${visita.tipo} · cancelada` : visita.tipo,
                descricao: visita.observacoes || visita.motivo,
                autor: nomeTecnico(tecnicos, visita.tecnicoId),
                referencia: visita.equipamento
            }));

        equipamentos
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
       POST cria, PUT edita, e o registro que volta é o que o banco gravou — não
       o que a tela mandou. É essa diferença que faz o código FA do equipamento e
       o id do cliente aparecerem na tela sem ninguém inventá-los aqui. */

    async function salvarCliente(dados) {
        const editando = Boolean(dados.id);

        /*
         * Situação e data de cadastro não estão no formulário: são decisão do
         * sistema, não do usuário. Só entram na criação — no PUT ficariam
         * reescrevendo a data de cadastro a cada edição.
         */
        const corpo = clienteParaApi(editando ? dados : Object.assign({
            status: 'ativo',
            clienteDesde: F.paraISO(new Date())
        }, dados));

        const salvo = editando
            ? await pedir('PUT', `/clientes/${Number(dados.id)}`, corpo)
            : await pedir('POST', '/clientes', corpo);

        invalidar();

        return clienteDaApi(salvo);
    }

    async function salvarEquipamento(dados) {
        const editando = Boolean(dados.codigo);
        const corpo = equipamentoParaApi(editando
            ? dados
            : Object.assign({ status: 'funcionando' }, dados));

        // O código nasce no servidor, sob trava: dois cadastros ao mesmo tempo
        // não podem receber a mesma etiqueta.
        const salvo = editando
            ? await pedir('PUT', `/equipamentos/${encodeURIComponent(dados.codigo)}`, corpo)
            : await pedir('POST', '/equipamentos', corpo);

        invalidar();

        return equipamentoDaApi(salvo);
    }

    async function salvarVisita(dados) {
        const editando = Boolean(dados.id);
        const corpo = visitaParaApi(editando
            ? dados
            : Object.assign({ status: 'agendada' }, dados));

        const salvo = editando
            ? await pedir('PUT', `/visitas/${Number(dados.id)}`, corpo)
            : await pedir('POST', '/visitas', corpo);

        invalidar();

        return visitaDaApi(salvo);
    }

    /** Muda só o status — o que a lista de visitas faz ao concluir ou cancelar. */
    async function atualizarStatusVisita(id, status) {
        const salvo = await pedir('PUT', `/visitas/${Number(id)}`, { status });

        invalidar();

        return visitaDaApi(salvo);
    }

    /**
     * A senha é o único campo desta camada que só viaja de ida.
     *
     * Ela nunca volta do servidor — nem no cadastro, nem na edição, nem na
     * listagem — e por isso `undefined` aqui significa "não mexa na senha", e
     * não "apague a senha". Mandar o campo vazio na edição trocaria a senha de
     * alguém por nada toda vez que se corrigisse um sobrenome.
     */
    async function salvarUsuario(dados) {
        const editando = Boolean(dados.id);

        const corpo = semIndefinidos({
            usuario: dados.usuario,
            senha: dados.senha,
            nome: dados.nome,
            funcao: dados.funcao,
            ativo: dados.ativo
        });

        const salvo = editando
            ? await pedir('PUT', `/usuarios/${Number(dados.id)}`, corpo)
            : await pedir('POST', '/usuarios', corpo);

        invalidar();

        return usuarioDaApi(salvo);
    }

    /** Só o interruptor do acesso — o que a lista faz sem abrir formulário. */
    async function atualizarStatusUsuario(id, ativo) {
        const salvo = await pedir('PATCH', `/usuarios/${Number(id)}/status`, { ativo: Boolean(ativo) });

        invalidar();

        return usuarioDaApi(salvo);
    }

    async function excluirUsuario(id) {
        await pedir('DELETE', `/usuarios/${Number(id)}`);
        invalidar();
    }

    async function excluirCliente(id) {
        await pedir('DELETE', `/clientes/${Number(id)}`);
        invalidar();
    }

    async function excluirEquipamento(codigo) {
        await pedir('DELETE', `/equipamentos/${encodeURIComponent(codigo)}`);
        invalidar();
    }

    async function excluirVisita(id) {
        await pedir('DELETE', `/visitas/${Number(id)}`);
        invalidar();
    }

    async function sair() {
        try {
            await pedir('POST', '/acesso/sair', {});
        } catch (erro) {
            /* Falhou o aviso ao servidor; o cookie vence sozinho. Segue para o login. */
        }

        invalidar();
        window.location.replace('/login');
    }

    /*
     * A camada inteira sai envolvida pelo diário: cada consulta e cada gravação
     * vira uma linha no terminal, com duração e tamanho do resultado, sem que
     * nenhuma função aqui saiba que está sendo observada.
     *
     * Agora que estas funções são `fetch`, o registro mede a rede — que é
     * justamente o que se quer medir.
     */
    const api = {
        carregarUsuario,
        carregarTecnicos,
        carregarUsuarios,
        carregarUsuarioPorId,
        ehAdministrador,
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
        salvarUsuario,
        atualizarStatusVisita,
        atualizarStatusUsuario,
        excluirUsuario,
        excluirCliente,
        excluirEquipamento,
        excluirVisita,
        sair,
        // Mantido pelo nome antigo: quem chamava para largar a simulação agora
        // larga o cache, que é o que sobrou de estado nesta camada.
        limparSimulacao: invalidar
    };

    // Se o diário não tiver subido, a camada sai crua. Sistema sem log funciona;
    // sistema que não abre porque o log falhou, não.
    window.FrioArteDados = window.FrioArteDiario
        ? window.FrioArteDiario.envolver('dados', api)
        : api;
})();
