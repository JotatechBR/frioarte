/**
 * O chrome do sistema: navegação, perfil, busca global e avisos.
 *
 * Roda em todas as telas. Nada aqui sabe o que é um cliente ou um equipamento —
 * ele pergunta à camada de dados e desenha o resultado.
 */

(function () {
    const D = window.FrioArteDados;
    const F = window.FrioArteFormato;
    const UI = window.FrioArteInterface;
    const LOG = window.FrioArteDiario;
    const { escapar } = window.FrioArteDom;

    const raiz = document.documentElement;
    const corpo = document.body;

    /* ---------- Navegação ---------- */

    function marcarSecao() {
        const secao = corpo.dataset.secao;

        document.querySelectorAll('[data-nav]').forEach((item) => {
            const ativo = item.dataset.nav === secao;

            item.dataset.ativo = ativo ? 'true' : 'false';
            if (ativo) item.setAttribute('aria-current', 'page');
        });
    }

    async function mostrarUsuario() {
        const usuario = await D.carregarUsuario();
        const bloco = document.querySelector('.lateral__pe');

        /*
         * Sem usuário — sessão vencida, ou banco fora do ar no instante da
         * consulta — o rodapé da lateral sai inteiro. Um avatar vazio com duas
         * linhas em branco é pior do que espaço nenhum.
         */
        if (!usuario) {
            if (bloco) bloco.hidden = true;
            return;
        }

        if (bloco) bloco.hidden = false;

        document.querySelectorAll('[data-usuario-nome]').forEach((no) => {
            no.textContent = usuario.nome;
        });
        document.querySelectorAll('[data-usuario-funcao]').forEach((no) => {
            no.textContent = usuario.funcao;
        });
        document.querySelectorAll('[data-usuario-iniciais]').forEach((no) => {
            no.textContent = F.iniciais(usuario.nome);
        });
    }

    /**
     * Título compacto do cabeçalho.
     *
     * Enquanto o título grande da tela está visível, o cabeçalho fica sem
     * texto: ninguém precisa ler "Clientes" duas vezes na mesma dobra. Quando
     * ele sai por cima, o nome aparece no topo e o usuário continua sabendo
     * onde está.
     */
    function observarTitulo() {
        const compacto = document.querySelector('.topo__secao');
        const grande = document.querySelector('[data-titulo]');

        if (!compacto || !grande || !('IntersectionObserver' in window)) {
            if (compacto) compacto.dataset.visivel = 'true';
            return;
        }

        if (observarTitulo.observador) observarTitulo.observador.disconnect();

        observarTitulo.observador = new IntersectionObserver(
            (entradas) => {
                compacto.dataset.visivel = entradas[0].isIntersecting ? 'false' : 'true';
            },
            // A troca acontece quando o título passa por trás do cabeçalho.
            { rootMargin: '-64px 0px 0px 0px', threshold: 0 }
        );

        observarTitulo.observador.observe(grande);
    }

    /**
     * Borda de rolagem: o cabeçalho só ganha o fio quando existe conteúdo
     * passando por baixo dele. Linha fixa no topo de uma tela no começo é
     * decoração — este fio informa.
     */
    function ligarRolagem() {
        const topo = document.querySelector('[data-topo]');
        if (!topo) return;

        const atualizar = () => {
            topo.dataset.rolado = window.scrollY > 8 ? 'true' : 'false';
        };

        atualizar();
        window.addEventListener('scroll', atualizar, { passive: true });
    }

    /* ---------- Busca global ---------- */

    function ligarBusca() {
        const caixa = document.querySelector('[data-busca]');
        if (!caixa) return;

        const entrada = caixa.querySelector('[data-busca-entrada]');
        const painel = caixa.querySelector('[data-busca-resultados]');

        let tempo = null;

        const fechar = () => {
            painel.hidden = true;
            entrada.setAttribute('aria-expanded', 'false');
        };

        const procurar = async () => {
            const termo = entrada.value.trim();

            if (termo.length < 2) {
                fechar();
                return;
            }

            const achados = await D.buscar(termo);

            // Busca sem resultado é informação: mostra o que as pessoas
            // procuram e o sistema não sabe responder.
            LOG.registrar(achados.total ? 'info' : 'aviso', 'busca', 'global', {
                termo,
                achados: achados.total
            });

            painel.innerHTML = achados.total
                ? montarResultados(achados)
                : `<p class="resultados__vazio">Nada encontrado para “${escapar(termo)}”.</p>`;

            painel.hidden = false;
            entrada.setAttribute('aria-expanded', 'true');
        };

        entrada.addEventListener('input', () => {
            // Espera o dedo parar: buscar a cada tecla é trabalho jogado fora.
            clearTimeout(tempo);
            tempo = setTimeout(procurar, 160);
        });

        entrada.addEventListener('focus', () => {
            if (entrada.value.trim().length >= 2) procurar();
        });

        entrada.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape') {
                if (painel.hidden) sairDaBusca(entrada);
                else fechar();
            }

            // Da caixa para o primeiro resultado, sem tirar a mão do teclado.
            if (evento.key === 'ArrowDown' && !painel.hidden) {
                const primeiro = painel.querySelector('a');
                if (primeiro) {
                    evento.preventDefault();
                    primeiro.focus();
                }
            }
        });

        document.addEventListener('click', (evento) => {
            if (!caixa.contains(evento.target)) fechar();
        });

        // Celular: a lupa abre a busca em tela cheia; "Cancelar" a devolve.
        const abrir = document.querySelector('[data-busca-abrir]');
        const cancelar = caixa.querySelector('[data-busca-fechar]');

        if (abrir) {
            abrir.addEventListener('click', () => {
                corpo.dataset.busca = 'aberta';
                entrada.focus();
            });
        }

        if (cancelar) {
            cancelar.addEventListener('click', () => {
                entrada.value = '';
                fechar();
                sairDaBusca(entrada);
            });
        }

        // "/" foca a busca, como em toda ferramenta que se usa o dia inteiro.
        document.addEventListener('keydown', (evento) => {
            if (evento.key !== '/' || evento.metaKey || evento.ctrlKey) return;

            const foco = document.activeElement;
            const digitando = foco && /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName);

            if (digitando) return;

            evento.preventDefault();
            corpo.dataset.busca = 'aberta';
            entrada.focus();
        });
    }

    function sairDaBusca(entrada) {
        delete corpo.dataset.busca;
        entrada.blur();
    }

    function montarResultados(achados) {
        const grupos = [];

        if (achados.clientes.length) {
            grupos.push(grupo('Clientes', achados.clientes.map((cliente) => `
                <a class="resultado" href="/sistema/clientes/${cliente.id}">
                    <span class="resultado__nome">${escapar(cliente.nome)}</span>
                    <span class="resultado__apoio">${escapar(cliente.endereco.curto)}
                        · ${F.plural(cliente.totalEquipamentos, 'equipamento', 'equipamentos')}</span>
                </a>`)));
        }

        if (achados.equipamentos.length) {
            grupos.push(grupo('Equipamentos', achados.equipamentos.map((equipamento) => `
                <a class="resultado" href="/sistema/equipamentos/${equipamento.codigo}">
                    <span class="resultado__nome">${escapar(equipamento.codigo)}
                        <span class="resultado__leve">${escapar(equipamento.descricao)}</span></span>
                    <span class="resultado__apoio">${escapar(equipamento.cliente
                        ? equipamento.cliente.nome
                        : 'sem dono')} · ${escapar(equipamento.local)}</span>
                </a>`)));
        }

        if (achados.visitas.length) {
            grupos.push(grupo('Visitas', achados.visitas.map((visita) => `
                <a class="resultado" href="/sistema/visitas?visita=${visita.id}">
                    <span class="resultado__nome">${escapar(visita.cliente ? visita.cliente.nome : '')}
                        <span class="resultado__leve">${escapar(visita.tipo)}</span></span>
                    <span class="resultado__apoio">${escapar(visita.faixa.rotulo)}
                        · ${F.dataCurta(visita.data)} às ${escapar(visita.hora)}</span>
                </a>`)));
        }

        return grupos.join('');
    }

    function grupo(titulo, itens) {
        return `<section class="resultados__grupo">
            <p class="rotulo">${escapar(titulo)}</p>
            ${itens.join('')}
        </section>`;
    }

    /* ---------- Avisos ---------- */

    async function ligarAvisos() {
        const painel = document.querySelector('[data-avisos]');
        const botao = document.querySelector('[data-avisos-abrir]');
        if (!painel || !botao) return;

        const lista = painel.querySelector('[data-avisos-lista]');
        const marca = document.querySelector('[data-avisos-marca]');
        const fechar = painel.querySelector('[data-avisos-fechar]');

        async function atualizar() {
            const avisos = await D.carregarAvisos();

            const urgentes = avisos.filter((aviso) => aviso.tipo === 'atrasada' || aviso.tipo === 'agora');

            marca.hidden = urgentes.length === 0;

            lista.innerHTML = avisos.length
                ? avisos.map(montarAviso).join('')
                : '<p class="resultados__vazio">Nenhuma visita próxima.</p>';
        }

        function abrir(estado) {
            painel.hidden = !estado;
            painel.dataset.aberto = estado ? 'true' : 'false';
            botao.setAttribute('aria-expanded', estado ? 'true' : 'false');

            if (estado) {
                LOG.info('avisos', 'abriu');
                atualizar();
            }
        }

        botao.addEventListener('click', (evento) => {
            evento.stopPropagation();
            abrir(painel.hidden);
        });

        fechar.addEventListener('click', () => abrir(false));

        document.addEventListener('click', (evento) => {
            if (painel.hidden) return;
            if (painel.contains(evento.target) || botao.contains(evento.target)) return;

            abrir(false);
        });

        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape' && !painel.hidden) abrir(false);
        });

        document.addEventListener('sistema:atualizado', atualizar);

        await atualizar();
    }

    function montarAviso(aviso) {
        const visita = aviso.visita;
        const cliente = visita.cliente ? visita.cliente.nome : 'Cliente';

        return `<button class="aviso" type="button" data-visita="${visita.id}" data-tipo="${aviso.tipo}">
            <span class="aviso__titulo">${escapar(aviso.titulo)}</span>
            <span class="aviso__cliente">${escapar(cliente)}</span>
            <span class="aviso__apoio">${escapar(visita.hora)} · ${escapar(visita.tipo)}</span>
        </button>`;
    }

    /**
     * Sair.
     *
     * O botão desliga a si mesmo antes de chamar: `sair()` termina numa troca de
     * endereço, e nesse intervalo um segundo clique dispararia um segundo pedido
     * para encerrar uma sessão que já acabou.
     */
    function ligarSaida() {
        const botao = document.querySelector('[data-sair]');
        if (!botao) return;

        botao.addEventListener('click', () => {
            botao.disabled = true;
            D.sair();
        });
    }

    /* ---------- Arranque ---------- */

    document.addEventListener('DOMContentLoaded', () => {
        marcarSecao();

        tentar('perfil', mostrarUsuario);
        tentar('saída', ligarSaida);
        tentar('título', observarTitulo);
        tentar('rolagem', ligarRolagem);
        tentar('busca', ligarBusca);
        tentar('avisos', ligarAvisos);
        tentar('formulários', () => window.FrioArteFormularios.iniciar());
        tentar('pressão', () => window.FrioArtePressao.ativarPressao());
        tentar('revelação', () => window.FrioArteRevelar.ativarRevelacao());

        // A folha aberta trava a rolagem do fundo; a marca vive no <html>.
        raiz.addEventListener('close', () => {
            delete raiz.dataset.travado;
        }, true);
    });

    /**
     * Cada peça do chrome dentro do próprio try/catch: se a busca quebrar, os
     * avisos continuam funcionando, e a tela abaixo também.
     */
    function tentar(nome, acao) {
        try {
            const resultado = acao();

            if (resultado && resultado.catch) {
                resultado.catch((erro) => {
                    LOG.erro('chrome', 'falhou', { peca: nome, mensagem: erro && erro.message });
                });
            }
        } catch (erro) {
            LOG.erro('chrome', 'falhou', { peca: nome, mensagem: erro && erro.message });
        }
    }

    // As fichas montam o próprio título depois de buscar os dados; quando isso
    // acontece, elas pedem para o cabeçalho voltar a observar o elemento novo.
    window.FrioArteNavegacao = { marcarSecao, observarTitulo };
})();
