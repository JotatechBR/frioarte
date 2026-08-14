const diario = require('../shared/diario');

function naoEncontrado(req, res) {
    res.status(404).json({
        sucesso: false,
        erro: 'Recurso não encontrado'
    });
}

function tratarErro(err, req, res, next) {
    if (res.headersSent) return next(err);

    const traducao = traduzirErroBanco(err);
    const status = err.status || traducao.status || 500;
    const mensagem = err.publicMessage || traducao.mensagem || 'Erro interno do servidor';
    const codigo = codigoSeguro(err);

    /* Objetos do mysql2 carregam `sql`, `sqlMessage` e valores. Registrar o
       objeto inteiro poderia imprimir hash de senha ou dados do cliente. Erro
       esperado do pedido (4xx) também não precisa de pilha no stderr. */
    if (status >= 500) {
        console.error(`[frioarte] ${req.method} ${req.path} falhou (${codigo}, status ${status})`);
    }

    diario.registrar(status >= 500 ? 'erro' : 'aviso', 'servidor',
        status >= 500 ? 'excecao' : 'rejeicao', {
            rota: req.path,
            metodo: req.method,
            codigo,
            status
        });

    return res.status(status).json({
        sucesso: false,
        erro: mensagem
    });
}

function traduzirErroBanco(err) {
    if (err && err.type === 'entity.parse.failed') {
        return { status: 400, mensagem: 'O corpo JSON da requisição é inválido.' };
    }
    if (err && err.type === 'entity.too.large') {
        return { status: 413, mensagem: 'O corpo da requisição é muito grande.' };
    }

    const traducoes = {
        ER_DUP_ENTRY: { status: 409, mensagem: 'Já existe um registro com esses dados.' },
        ER_ROW_IS_REFERENCED_2: { status: 409, mensagem: 'O registro possui vínculos e não pode ser excluído.' },
        ER_NO_REFERENCED_ROW_2: { status: 400, mensagem: 'Um dos registros relacionados não existe.' },
        ER_BAD_NULL_ERROR: { status: 400, mensagem: 'Um campo obrigatório não foi informado.' },
        ER_DATA_TOO_LONG: { status: 400, mensagem: 'Um dos campos ultrapassa o tamanho permitido.' },
        ER_TRUNCATED_WRONG_VALUE: { status: 400, mensagem: 'Um dos valores informados é inválido.' },
        ER_WARN_DATA_OUT_OF_RANGE: { status: 400, mensagem: 'Um dos valores está fora do intervalo permitido.' },
        ER_INCORRECT_STRING_VALUE: { status: 400, mensagem: 'Um dos textos informados contém caracteres inválidos.' },
        ER_LOCK_WAIT_TIMEOUT: { status: 503, mensagem: 'O banco está ocupado. Tente novamente.' },
        ER_LOCK_DEADLOCK: { status: 503, mensagem: 'O banco está ocupado. Tente novamente.' },
        ER_ACCESS_DENIED_ERROR: { status: 503, mensagem: 'Banco de dados temporariamente indisponível.' },
        ER_BAD_DB_ERROR: { status: 503, mensagem: 'Banco de dados temporariamente indisponível.' },
        ECONNREFUSED: { status: 503, mensagem: 'Banco de dados temporariamente indisponível.' },
        ECONNRESET: { status: 503, mensagem: 'Banco de dados temporariamente indisponível.' },
        ETIMEDOUT: { status: 503, mensagem: 'Banco de dados temporariamente indisponível.' },
        PROTOCOL_CONNECTION_LOST: { status: 503, mensagem: 'Banco de dados temporariamente indisponível.' }
    };

    return traducoes[err && err.code] || {};
}

function codigoSeguro(err) {
    if (err && typeof err.codigo === 'string') return err.codigo.slice(0, 80);
    if (err && typeof err.code === 'string') return err.code.slice(0, 80);
    if (err && typeof err.name === 'string') return err.name.slice(0, 80);

    return 'ERRO_INTERNO';
}

module.exports = { naoEncontrado, tratarErro };
