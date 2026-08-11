/**
 * Registro de módulos com execução isolada.
 *
 * Cada módulo roda dentro do próprio try/catch. Se um quebra, ele é o único
 * que para — os outros seguem normalmente. É o contrário de um `try` grande
 * envolvendo a página inteira, onde um erro em qualquer ponto derruba tudo o
 * que viria depois.
 *
 * Um módulo que nem chegou a carregar (arquivo com erro de sintaxe, 404)
 * simplesmente não se registra, e a página funciona sem ele.
 */

const modulos = [];

/**
 * @param {string} nome        identifica o módulo no console quando falha
 * @param {object} opcoes      { precisaDados: true } se depende da API
 * @param {Function} iniciar   recebe o perfil quando precisaDados é true
 */
function registrar(nome, opcoes, iniciar) {
    if (typeof opcoes === 'function') {
        iniciar = opcoes;
        opcoes = {};
    }

    modulos.push({
        nome,
        precisaDados: Boolean(opcoes.precisaDados),
        iniciar
    });
}

/**
 * Roda os módulos elegíveis e devolve o que falhou.
 * `perfil` nulo significa que a API não respondeu: só rodam os módulos que
 * não dependem de dados, como cabeçalho e menu.
 */
async function executar(perfil) {
    const falhas = [];

    for (const modulo of modulos) {
        if (modulo.precisaDados && !perfil) {
            falhas.push(modulo.nome);
            continue;
        }

        try {
            await modulo.iniciar(perfil);
        } catch (erro) {
            falhas.push(modulo.nome);
            console.error(`[frioarte] módulo "${modulo.nome}" falhou e foi isolado:`, erro);
        }
    }

    return falhas;
}

function listar() {
    return modulos.map((modulo) => modulo.nome);
}

window.FrioArteRegistro = { registrar, executar, listar };
