class ErroHttp extends Error {
    constructor(status, mensagem, codigo) {
        super(mensagem);
        this.name = 'ErroHttp';
        this.status = status;
        this.publicMessage = mensagem;
        this.codigo = codigo;
    }
}

function erroHttp(status, mensagem, codigo) {
    return new ErroHttp(status, mensagem, codigo);
}

function erroBanco(erro, codigo) {
    return Boolean(erro && erro.code === codigo);
}

module.exports = { ErroHttp, erroHttp, erroBanco };
