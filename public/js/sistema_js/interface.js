/**
 * Peças de interface compartilhadas por todas as telas do sistema:
 * estados (status), avisos de tela, diálogos, esqueleto de carregamento e
 * estado vazio.
 *
 * A regra que mantém o sistema coerente é a tabela `ESTADOS`: "funcionando",
 * "atrasada" e "concluída" têm um nome e uma cor só, definidos aqui. Se cada
 * tela decidisse a sua, o sistema pareceria três sistemas.
 */

(function () {
    const { escapar } = window.FrioArteDom;

    /**
     * Tom é semântico, não decorativo: `bom`, `atencao`, `ruim`, `neutro` e
     * `ativo`. O CSS decide como cada tom se parece.
     */
    const ESTADOS = {
        equipamento: {
            funcionando: { rotulo: 'Funcionando', tom: 'bom' },
            atencao: { rotulo: 'Requer atenção', tom: 'atencao' },
            parado: { rotulo: 'Parado', tom: 'ruim' }
        },
        visita: {
            agendada: { rotulo: 'Agendada', tom: 'ativo' },
            andamento: { rotulo: 'Em andamento', tom: 'ativo' },
            concluida: { rotulo: 'Concluída', tom: 'bom' },
            cancelada: { rotulo: 'Cancelada', tom: 'neutro' }
        },
        cliente: {
            ativo: { rotulo: 'Ativo', tom: 'bom' },
            inativo: { rotulo: 'Inativo', tom: 'neutro' }
        },
        agenda: {
            atrasada: { rotulo: 'Atrasada', tom: 'ruim' },
            hoje: { rotulo: 'Hoje', tom: 'ativo' },
            amanha: { rotulo: 'Amanhã', tom: 'atencao' },
            proximos: { rotulo: 'Próximos dias', tom: 'neutro' },
            passado: { rotulo: 'Realizada', tom: 'neutro' }
        }
    };

    function estado(familia, chave) {
        const grupo = ESTADOS[familia] || {};
        return grupo[chave] || { rotulo: chave || '—', tom: 'neutro' };
    }

    /** Marca de estado: um ponto e um nome. Sem caixa, sem cor de fundo. */
    function marca(familia, chave) {
        const dados = estado(familia, chave);

        return `<span class="estado" data-tom="${dados.tom}">`
            + '<span class="estado__ponto" aria-hidden="true"></span>'
            + `${escapar(dados.rotulo)}</span>`;
    }

    /* ---------- Carregamento e vazio ---------- */

    /**
     * Esqueleto: a forma do conteúdo antes do conteúdo. Mantém a altura da
     * lista estável, então nada salta quando os dados chegam.
     */
    function esqueleto(quantidade, classe) {
        const item = `<div class="esqueleto ${classe || ''}">`
            + '<div class="esqueleto__linha esqueleto__linha--curta"></div>'
            + '<div class="esqueleto__linha"></div>'
            + '</div>';

        return `<div class="esqueletos" aria-hidden="true">${item.repeat(quantidade || 3)}</div>`;
    }

    function vazio(opcoes) {
        const dados = opcoes || {};

        const acao = dados.acao
            ? `<button class="botao botao--secundario" type="button" data-acao="${escapar(dados.acao.acao)}"
                       data-pressionavel>${escapar(dados.acao.rotulo)}</button>`
            : '';

        return '<div class="vazio">'
            + `<p class="vazio__titulo">${escapar(dados.titulo || 'Nada por aqui')}</p>`
            + (dados.texto ? `<p class="vazio__texto">${escapar(dados.texto)}</p>` : '')
            + acao
            + '</div>';
    }

    /**
     * Troca o conteúdo de uma região com uma aparição curta. O `data-entrando`
     * é removido no quadro seguinte, então a transição parte do estado certo.
     */
    function pintar(alvo, html) {
        if (!alvo) return;

        alvo.classList.add('pintado');
        alvo.innerHTML = html;
        alvo.dataset.entrando = 'true';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                delete alvo.dataset.entrando;
            });
        });

        if (window.FrioArtePressao) window.FrioArtePressao.ativarPressao(alvo);
    }

    /**
     * Marca o filtro escolhido. `aria-pressed` acompanha o `data-ativo`: o
     * sublinhado azul comunica a seleção para quem vê, e o atributo comunica a
     * mesma coisa para quem usa leitor de tela.
     */
    function marcarFiltros(barra, valor) {
        barra.querySelectorAll('[data-filtro]').forEach((item) => {
            const ativo = item.dataset.filtro === valor;

            item.dataset.ativo = ativo ? 'true' : 'false';
            item.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        });
    }

    /* ---------- Avisos de tela ---------- */

    let pilha = null;

    function notificar(opcoes) {
        const dados = typeof opcoes === 'string' ? { titulo: opcoes } : opcoes || {};

        if (!pilha) {
            pilha = document.createElement('div');
            pilha.className = 'notas';
            pilha.setAttribute('role', 'status');
            pilha.setAttribute('aria-live', 'polite');
            document.body.appendChild(pilha);
        }

        const nota = document.createElement('div');
        nota.className = 'nota-tela';
        nota.dataset.tom = dados.tom || 'bom';
        nota.innerHTML = `<p class="nota-tela__titulo">${escapar(dados.titulo || '')}</p>`
            + (dados.texto ? `<p class="nota-tela__texto">${escapar(dados.texto)}</p>` : '');

        pilha.appendChild(nota);

        requestAnimationFrame(() => {
            nota.dataset.visivel = 'true';
        });

        const sair = () => {
            nota.dataset.visivel = 'false';
            setTimeout(() => nota.remove(), 320);
        };

        setTimeout(sair, dados.duracao || 4200);
        nota.addEventListener('click', sair);
    }

    /* ---------- Diálogos ----------
       No desktop é um painel centrado; no celular, uma folha que sobe pela
       borda de baixo. É o mesmo elemento: quem muda a composição é o CSS.

       `<dialog>` entrega de graça o que costuma ser feito errado à mão — foco
       preso dentro do painel, Esc fechando e o resto da página inerte. O que
       falta é a animação de saída, e é só isso que o JavaScript aqui faz. */

    const SAIDA = 260;

    function abrirDialogo(elemento, opcoes) {
        if (!elemento) return;

        const dados = opcoes || {};

        if (!elemento.open) elemento.showModal();

        document.documentElement.dataset.travado = 'true';

        requestAnimationFrame(() => {
            elemento.dataset.aberto = 'true';
        });

        const primeiro = dados.foco
            ? elemento.querySelector(dados.foco)
            : elemento.querySelector('[data-foco-inicial]');

        if (primeiro) {
            // Sem o atraso, o teclado do celular sobe antes de a folha assentar.
            setTimeout(() => primeiro.focus({ preventScroll: true }), 120);
        }

        preparar(elemento);
    }

    function fecharDialogo(elemento) {
        if (!elemento || !elemento.open) return;

        elemento.dataset.aberto = 'false';
        delete document.documentElement.dataset.travado;

        setTimeout(() => {
            if (elemento.dataset.aberto === 'false') elemento.close();
        }, SAIDA);
    }

    function preparar(elemento) {
        if (elemento.dataset.preparado === 'true') return;
        elemento.dataset.preparado = 'true';

        // Esc: o navegador fecharia na hora; aqui ele passa pela animação.
        elemento.addEventListener('cancel', (evento) => {
            evento.preventDefault();
            fecharDialogo(elemento);
        });

        // Clique no véu — a área do próprio <dialog>, fora do painel.
        elemento.addEventListener('click', (evento) => {
            if (evento.target === elemento) fecharDialogo(elemento);
        });

        elemento.querySelectorAll('[data-fechar]').forEach((botao) => {
            botao.addEventListener('click', () => fecharDialogo(elemento));
        });
    }

    /* ---------- Formulários ---------- */

    /** Lê um <form> como objeto, já sem espaços sobrando. */
    function lerFormulario(formulario) {
        const dados = {};

        new FormData(formulario).forEach((valor, chave) => {
            dados[chave] = typeof valor === 'string' ? valor.trim() : valor;
        });

        return dados;
    }

    /**
     * Validação visível: a mensagem nasce embaixo do campo que errou, e o foco
     * vai para o primeiro deles. Nada de alerta genérico no topo.
     */
    function validar(formulario) {
        let primeiroErro = null;

        formulario.querySelectorAll('[data-campo-erro]').forEach((no) => {
            no.textContent = '';
        });

        formulario.querySelectorAll('input, select, textarea').forEach((campo) => {
            const valido = campo.checkValidity();
            campo.dataset.invalido = valido ? 'false' : 'true';

            if (valido) return;

            const aviso = campo.closest('.campo-forma');
            const alvo = aviso ? aviso.querySelector('[data-campo-erro]') : null;

            if (alvo) alvo.textContent = mensagem(campo);
            if (!primeiroErro) primeiroErro = campo;
        });

        if (primeiroErro) {
            primeiroErro.focus({ preventScroll: false });
            return false;
        }

        return true;
    }

    function mensagem(campo) {
        if (campo.validity.valueMissing) return 'Preencha este campo.';
        if (campo.validity.typeMismatch) return 'Confira o formato.';
        if (campo.validity.tooShort) return 'Está curto demais.';

        return 'Valor inválido.';
    }

    /** Máscara conforme se digita, sem impedir apagar. */
    function mascarar(campo, tipo) {
        const aplicar = () => {
            const F = window.FrioArteFormato;
            const digitos = F.soDigitos(campo.value);

            if (tipo === 'telefone') campo.value = F.telefone(digitos) || digitos;
            if (tipo === 'documento') campo.value = F.documento(digitos) || digitos;
            if (tipo === 'cep') campo.value = F.cep(digitos) || digitos;
        };

        campo.addEventListener('blur', aplicar);
        campo.addEventListener('change', aplicar);
    }

    window.FrioArteInterface = {
        estado,
        marca,
        esqueleto,
        vazio,
        pintar,
        marcarFiltros,
        notificar,
        abrirDialogo,
        fecharDialogo,
        lerFormulario,
        validar,
        mascarar
    };
})();
