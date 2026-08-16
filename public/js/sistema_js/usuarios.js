/**
 * Tela de usuários — a administração do acesso.
 *
 * Mesma estrutura das outras listagens: busca e filtro só mudam a consulta e
 * mandam desenhar de novo. O que muda aqui são as duas ações que vivem na
 * própria linha — tirar o acesso e excluir — e o cuidado que elas pedem.
 *
 * A diferença entre as duas não é de gravidade, é de consequência. Desativar
 * fecha a porta e guarda tudo: o nome do técnico continua nas visitas que ele
 * fez. Excluir só funciona para quem nunca apareceu em visita nenhuma — o
 * próprio banco recusa o resto, e o servidor traduz essa recusa em português.
 * Por isso a tela oferece desativar primeiro e excluir depois.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const C = window.FrioArteCartoes;
    const LOG = window.FrioArteDiario;

    const consulta = { termo: '', filtro: 'todos' };

    let lista = null;
    let contagem = null;
    let tempo = null;

    /*
     * Quem está com a tela aberta. Guardado numa variável porque a lista se
     * redesenha a cada busca e a cada gravação, e perguntar "quem sou eu" ao
     * servidor em toda tecla digitada seria uma requisição por letra.
     */
    let voceId = null;

    async function desenhar() {
        const usuarios = await D.carregarUsuarios(consulta);

        contagem.textContent = usuarios.length
            ? F.plural(usuarios.length, 'usuário', 'usuários')
            : '';

        UI.pintar(lista, usuarios.length
            ? `<div class="fileiras">${usuarios.map((usuario) => C.usuario(usuario, { voceId })).join('')}</div>`
            : UI.vazio(nadaEncontrado()));
    }

    /**
     * O estado vazio depende de por que está vazio. Uma busca sem resultado
     * pede correção do termo; um filtro sem resultado é uma boa notícia
     * ("ninguém está sem acesso") e não deveria oferecer um cadastro.
     */
    function nadaEncontrado() {
        if (consulta.termo) {
            return {
                titulo: 'Nenhum usuário encontrado',
                texto: `Nada corresponde a “${consulta.termo}”. Tente parte do nome, do nome de acesso ou da função.`
            };
        }

        if (consulta.filtro === 'inativos') {
            return {
                titulo: 'Ninguém está sem acesso',
                texto: 'Todas as contas cadastradas conseguem entrar no sistema.'
            };
        }

        if (consulta.filtro === 'administradores') {
            return {
                titulo: 'Nenhum administrador nesta lista',
                texto: 'Administrador é quem tem "Administrador" no campo de função — é isso que libera esta tela.'
            };
        }

        return {
            titulo: 'Nenhum usuário ainda',
            texto: 'Cadastre quem precisa entrar no sistema. Cada pessoa com o próprio acesso.',
            acao: { abrir: 'usuario', rotulo: 'Criar usuário' }
        };
    }

    /* ---------- Ações da linha ---------- */

    async function trocarAcesso(botao) {
        const id = Number(botao.dataset.usuarioAcesso);
        const tirando = botao.dataset.ativo === 'true';
        const usuario = await D.carregarUsuarioPorId(id);

        if (!usuario) return sumiu();

        /*
         * Devolver acesso não precisa de pergunta: é a ação que conserta, e
         * desfazê-la custa um clique. Tirar precisa — a pessoa perde a sessão
         * aberta no meio do expediente.
         */
        if (tirando) {
            const certeza = await UI.confirmar({
                rotulo: 'Acesso',
                titulo: `Tirar o acesso de ${F.primeiroNome(usuario.nome)}?`,
                texto: `${usuario.nome} deixa de conseguir entrar no sistema imediatamente, `
                    + 'inclusive se estiver com ele aberto agora. Tudo que já foi registrado por '
                    + 'essa pessoa continua no lugar, e o acesso pode ser devolvido a qualquer momento.',
                acao: 'Tirar acesso'
            });

            if (!certeza) return;
        }

        botao.disabled = true;

        try {
            await D.atualizarStatusUsuario(id, !usuario.ativo);

            LOG.info('usuario', tirando ? 'desativou' : 'ativou', { alvo: id });

            UI.notificar({
                titulo: tirando ? 'Acesso removido.' : 'Acesso liberado.',
                texto: usuario.nome
            });

            await desenhar();
        } catch (erro) {
            botao.disabled = false;
            falhar('mudar o acesso', erro);
        }
    }

    async function excluir(botao) {
        const id = Number(botao.dataset.usuarioExcluir);
        const usuario = await D.carregarUsuarioPorId(id);

        if (!usuario) return sumiu();

        const certeza = await UI.confirmar({
            rotulo: 'Exclusão',
            titulo: `Excluir ${usuario.nome}?`,
            texto: 'A conta some da lista e não há como desfazer. Se esta pessoa já '
                + 'atendeu alguma visita, o sistema vai recusar a exclusão — nesse caso, '
                + 'tire o acesso: o histórico continua íntegro e ela não entra mais.',
            acao: 'Excluir usuário',
            tom: 'ruim'
        });

        if (!certeza) return;

        botao.disabled = true;

        try {
            await D.excluirUsuario(id);

            LOG.info('usuario', 'excluiu', { alvo: id });
            UI.notificar({ titulo: 'Usuário excluído.', texto: usuario.nome });

            await desenhar();
        } catch (erro) {
            botao.disabled = false;
            falhar('excluir', erro);
        }
    }

    /**
     * A linha clicada não existe mais — outro administrador mexeu na equipe
     * enquanto esta tela estava aberta. Redesenhar é a resposta: agir sobre um
     * id que sumiu daria um erro do servidor para explicar uma tela velha.
     */
    function sumiu() {
        UI.notificar({ titulo: 'Este usuário não existe mais.', texto: 'A lista foi atualizada.' });
        return desenhar();
    }

    /** A recusa do servidor é a explicação — não faz sentido inventar outra. */
    function falhar(oque, erro) {
        LOG.erro('usuario', 'falhou', { acao: oque, mensagem: erro && erro.message });

        UI.notificar({
            titulo: `Não foi possível ${oque}.`,
            texto: erro && erro.message,
            tom: 'ruim'
        });
    }

    /* ---------- Ligações ---------- */

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

    /*
     * Um ouvinte na lista inteira, e não um por botão: as linhas são
     * redesenhadas a cada busca e a cada gravação, e religar eventos em cada
     * redesenho é vazamento garantido. Abrir o formulário não entra aqui —
     * `data-abrir` já é tratado por formularios.js, no documento.
     */
    function ligarAcoes() {
        lista.addEventListener('click', (evento) => {
            const acesso = evento.target.closest('[data-usuario-acesso]');

            if (acesso) {
                // O `.catch` fecha o buraco que sobra: as duas funções tratam a
                // falha da gravação, mas a leitura que vem antes dela também
                // pode cair — e um clique que não faz nada nem explica por quê
                // é o pior desfecho possível para um botão de excluir.
                trocarAcesso(acesso).catch((erro) => falhar('mudar o acesso', erro));
                return;
            }

            const remover = evento.target.closest('[data-usuario-excluir]');

            if (remover) excluir(remover).catch((erro) => falhar('excluir', erro));
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        lista = document.querySelector('[data-lista="usuarios"]');
        contagem = document.querySelector('[data-contagem]');

        lista.innerHTML = UI.esqueleto(4);

        ligarBusca();
        ligarFiltros();
        ligarAcoes();

        // Quem sou eu vem antes do primeiro desenho: as linhas dependem disso
        // para decidir quais ações mostrar, e uma lista que troca de botões
        // meio segundo depois de aparecer parece defeito.
        const eu = await D.carregarUsuario();
        voceId = eu ? eu.id : null;

        await desenhar();
    });

    document.addEventListener('sistema:atualizado', desenhar);
})();
