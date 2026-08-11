/**
 * Validação do formulário de orçamento.
 *
 * Só valida e sinaliza — não sabe para onde a mensagem vai nem como ela é
 * montada. Serve a qualquer formulário com campos `required`.
 */

function validar(formulario) {
    let valido = true;
    let primeiroInvalido = null;

    formulario.querySelectorAll('[required]').forEach((campo) => {
        if (campo.value.trim()) {
            limparErro(campo);
            return;
        }

        marcarErro(campo, 'Preencha este campo para continuar.');
        valido = false;
        primeiroInvalido = primeiroInvalido || campo;
    });

    if (primeiroInvalido) primeiroInvalido.focus();

    return valido;
}

/** Validação durante o preenchimento, não só no envio. */
function vigiar(formulario) {
    formulario.querySelectorAll('[required]').forEach((campo) => {
        campo.addEventListener('input', () => limparErro(campo));
        campo.addEventListener('change', () => limparErro(campo));
    });
}

function marcarErro(campo, mensagem) {
    campo.setAttribute('aria-invalid', 'true');

    let erro = campo.parentElement.querySelector('.campo__erro');

    if (!erro) {
        erro = document.createElement('span');
        erro.className = 'campo__erro';
        campo.parentElement.appendChild(erro);
    }

    erro.textContent = mensagem;
}

function limparErro(campo) {
    if (!campo.value.trim()) return;

    campo.removeAttribute('aria-invalid');

    const erro = campo.parentElement.querySelector('.campo__erro');
    if (erro) erro.remove();
}

window.FrioArteValidacao = { validar, vigiar };
