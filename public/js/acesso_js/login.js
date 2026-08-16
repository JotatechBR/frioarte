/**
 * Página de acesso.
 *
 * O formulário conversa com `POST /api/acesso/login`. Dando certo, o servidor
 * devolve um cookie de sessão assinado e a página troca de endereço; dando
 * errado, a tela diz o que o servidor disse — nem mais, nem menos.
 *
 * A senha não é guardada em lugar nenhum do navegador: ela existe no campo, vai
 * no corpo do pedido e some. O que sobra depois do login é o cookie, que é
 * `HttpOnly` e portanto invisível para todo JavaScript desta página.
 *
 * A validação é local, e não a do formulário de orçamento, por um motivo: aqui
 * cada mensagem de erro já existe no HTML, ligada ao campo por
 * `aria-describedby`. Mensagem criada na hora não teria como ser referenciada,
 * e o leitor de tela anunciaria "inválido" sem dizer por quê.
 */

const RECADOS = {
    semRede: 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.',
    semRecuperacao: 'Para redefinir a senha, procure o responsável pelo sistema.'
};

document.addEventListener('DOMContentLoaded', () => {
    const forma = document.querySelector('[data-acesso]');
    if (!forma) return;

    const obrigatorios = Array.from(forma.querySelectorAll('[required]'));

    // O erro sai assim que o campo deixa de estar vazio: cobrar de novo o que a
    // pessoa acabou de corrigir é ruído.
    obrigatorios.forEach((entrada) => {
        entrada.addEventListener('input', () => {
            if (entrada.value.trim()) marcarErro(entrada, false);
        });
    });

    prepararOlho(forma);
    prepararEsqueci();

    const botao = forma.querySelector('[type="submit"]');

    forma.addEventListener('submit', async (evento) => {
        // Enter no teclado chega aqui pelo mesmo caminho do clique no botão.
        evento.preventDefault();

        if (!validar(obrigatorios)) {
            limparRecado();
            return;
        }

        // O botão desligado é o que impede o duplo envio — bcrypt leva uns
        // décimos de segundo, e nesse tempo dá para clicar três vezes.
        ocupar(botao, true);
        limparRecado();

        try {
            const resultado = await realizarLogin(forma);

            if (resultado.autenticado) {
                /*
                 * `replace`, e não `href`: quem entrou não deve voltar para a
                 * tela de login apertando "voltar" do navegador.
                 */
                window.location.replace(destino());
                return;
            }

            anunciar(resultado.recado);
        } finally {
            ocupar(botao, false);
        }
    });

    // O toque nos botões, como no resto do site.
    try {
        window.FrioArtePressao.ativarPressao();
    } catch (erro) {
        console.error('[frioarte] pressão falhou na tela de acesso:', erro);
    }
});

/**
 * O pedido de acesso.
 *
 * A mensagem de recusa vem do servidor de propósito: é lá que se decide o que
 * pode ser dito sem entregar quem tem conta e quem não tem. A tela repete, não
 * interpreta.
 */
async function realizarLogin(forma) {
    const dados = new FormData(forma);

    let resposta;

    try {
        resposta = await fetch('/api/acesso/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            // O servidor responde com `Set-Cookie`; sem isto o navegador o
            // descartaria e o login "daria certo" sem liberar nada.
            credentials: 'same-origin',
            body: JSON.stringify({
                usuario: String(dados.get('usuario') || '').trim(),
                senha: String(dados.get('senha') || '')
            })
        });
    } catch (erro) {
        // Servidor fora do ar, wi-fi caído, cabo solto: nada disso é senha
        // errada, e dizer "usuário ou senha inválidos" mandaria a pessoa
        // procurar o erro no lugar errado.
        return { autenticado: false, recado: RECADOS.semRede };
    }

    let pacote = null;

    try {
        pacote = await resposta.json();
    } catch (erro) {
        /* Sem JSON na resposta; o status abaixo decide. */
    }

    if (resposta.ok && pacote && pacote.sucesso) {
        return { autenticado: true, recado: '' };
    }

    return {
        autenticado: false,
        recado: (pacote && pacote.erro) || RECADOS.semRede
    };
}

/**
 * Para onde ir depois de entrar.
 *
 * Vem de `?destino=` — que o servidor põe quando barra alguém no meio do
 * caminho. Só caminho interno do sistema passa: `//outro.site` é um endereço
 * externo disfarçado de relativo, e seria um desvio aberto na tela de login.
 */
function destino() {
    const pedido = new URLSearchParams(window.location.search).get('destino');

    if (!pedido) return '/sistema';
    if (!pedido.startsWith('/') || pedido.startsWith('//')) return '/sistema';
    if (!pedido.startsWith('/sistema')) return '/sistema';

    return pedido;
}

function ocupar(botao, ocupado) {
    if (!botao) return;

    botao.disabled = ocupado;

    if (ocupado) botao.dataset.ocupado = 'true';
    else delete botao.dataset.ocupado;
}

/** Só cobra o que é obrigatório e leva o foco ao primeiro campo em falta. */
function validar(entradas) {
    let primeiroVazio = null;

    entradas.forEach((entrada) => {
        const vazio = !entrada.value.trim();

        marcarErro(entrada, vazio);

        if (vazio && !primeiroVazio) primeiroVazio = entrada;
    });

    if (primeiroVazio) primeiroVazio.focus();

    return !primeiroVazio;
}

/**
 * A mensagem já está no HTML e o campo já aponta para ela por
 * `aria-describedby`. Aqui só se liga e desliga — assim o motivo do erro é
 * anunciado junto do campo, e nunca sobra mensagem órfã na tela.
 */
function marcarErro(entrada, comErro) {
    entrada.setAttribute('aria-invalid', comErro ? 'true' : 'false');

    const mensagem = document.getElementById(`${entrada.id}-erro`);
    if (mensagem) mensagem.hidden = !comErro;
}

/**
 * Mostrar e ocultar a senha.
 *
 * O script cuida do estado (`aria-pressed`, tipo do campo); a aparência dos
 * dois ícones é do CSS.
 */
function prepararOlho(forma) {
    const botao = forma.querySelector('[data-ver-senha]');
    if (!botao) return;

    const senha = document.getElementById(botao.getAttribute('aria-controls'));
    if (!senha) return;

    botao.addEventListener('click', () => {
        const mostrando = botao.getAttribute('aria-pressed') === 'true';
        const digitando = document.activeElement === senha;

        botao.setAttribute('aria-pressed', mostrando ? 'false' : 'true');
        senha.type = mostrando ? 'password' : 'text';

        // Quem estava digitando continua de onde parou, no fim do texto. Quem
        // chegou pelo teclado fica no botão, para poder desfazer a troca.
        if (!digitando) return;

        senha.focus();
        senha.setSelectionRange(senha.value.length, senha.value.length);
    });
}

/**
 * Recuperação de senha depende do mesmo backend que ainda não existe. Em vez de
 * um link para lugar nenhum, a tela diz o que está acontecendo.
 */
function prepararEsqueci() {
    const botao = document.querySelector('[data-esqueci]');
    if (!botao) return;

    botao.addEventListener('click', () => anunciar(RECADOS.semRecuperacao));
}

/** Recado único da tela — a região já é anunciada por `role="status"`. */
function anunciar(texto) {
    const recado = document.querySelector('[data-recado]');
    if (recado) recado.textContent = texto;
}

function limparRecado() {
    anunciar('');
}
