function naoEncontrado(req, res) {
    res.status(404).json({
        sucesso: false,
        erro: 'Recurso não encontrado'
    });
}

function tratarErro(err, req, res, next) {
    console.error(err);

    res.status(err.status || 500).json({
        sucesso: false,
        erro: err.publicMessage || 'Erro interno do servidor'
    });
}

module.exports = { naoEncontrado, tratarErro };
