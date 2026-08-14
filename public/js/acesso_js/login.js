/**
 * Página de acesso.
 *
 * **Ainda não existe autenticação.** Não há banco, não há usuário, não há
 * sessão e não há endpoint. Esta página entrega a porta — o formulário, os
 * estados e as mensagens — e concentra em `realizarLogin()` o único ponto que
 * muda quando o backend chegar.
 *
 * Enquanto isso: nada é enviado, nada é guardado, nada é liberado. O envio real
 * é impedido sempre, e o que a tela responde é a verdade do momento.
 *
 * A validação é local, e não a do formulário de orçamento, por um motivo: aqui
 * cada mensagem de erro já existe no HTML, ligada ao campo por
 * `aria-describedby`. Mensagem criada na hora não teria como ser referenciada,
 * e o leitor de tela anunciaria "inválido" sem dizer por quê.
 */

const RECADOS = {
    semAutenticacao: 'Autenticação ainda não configurada.',
    semRecuperacao: 'Recuperação de senha ainda não configurada.'
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

    forma.addEventListener('submit', async (evento) => {
        // Enter no teclado chega aqui pelo mesmo caminho do clique no botão.
        evento.preventDefault();

        if (!validar(obrigatorios)) {
            limparRecado();
            return;
        }

        const resultado = await realizarLogin();
        anunciar(resultado.recado);
    });

    // O toque nos botões, como no resto do site.
    try {
        window.FrioArtePressao.ativarPressao();
    } catch (erro) {
        console.error('[frioarte] pressão falhou na tela de acesso:', erro);
    }
});

/**
 * O único ponto que muda quando existir autenticação de verdade.
 *
 * Hoje não lê o formulário, não chama a rede e não concede acesso nenhum: sem
 * banco não há a quem perguntar. Responde o que é fato — o acesso ainda não
 * está configurado — e a interface mostra isso.
 *
 * Quando o backend e o banco existirem, é aqui dentro que entra o
 * `POST /api/auth/login`, e nenhuma outra parte desta página precisa mudar.
 */
async function realizarLogin() {
    // TODO: conectar à autenticação real quando o backend e o banco existirem.
    return { autenticado: false, recado: RECADOS.semAutenticacao };
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
