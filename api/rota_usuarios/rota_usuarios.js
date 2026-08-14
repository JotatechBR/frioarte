const express = require('express');

const usuariosService = require('./usuarios.service');
const { erroHttp } = require('../shared/erroHttp');
const rotaAssincrona = require('../shared/rotaAssincrona');
const {
    camposPermitidos,
    textoObrigatorio,
    textoOpcional,
    idPositivo,
    booleano,
    booleanoConsulta,
    senha
} = require('../shared/validacao');

const router = express.Router();

router.get('/', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.query, ['busca', 'ativo', 'funcao']);

    const dados = await usuariosService.listar({
        busca: textoOpcional(req.query.busca, 'busca', 150),
        ativo: booleanoConsulta(req.query.ativo),
        funcao: textoOpcional(req.query.funcao, 'funcao', 100)
    });

    return res.json({ sucesso: true, dados });
}));

router.post('/', rotaAssincrona(async (req, res) => {
    const entrada = validarCriacao(req.body);
    const dados = await usuariosService.criar(entrada);

    return res.status(201).json({
        sucesso: true,
        mensagem: 'Usuário cadastrado com sucesso.',
        dados
    });
}));

router.get('/:id', rotaAssincrona(async (req, res) => {
    const dados = await usuariosService.obterPorId(idPositivo(req.params.id));

    return res.json({ sucesso: true, dados });
}));

router.put('/:id', rotaAssincrona(async (req, res) => {
    const id = idPositivo(req.params.id);
    const entrada = validarAtualizacao(req.body);
    const dados = await usuariosService.atualizar(id, entrada);

    return res.json({
        sucesso: true,
        mensagem: 'Usuário atualizado com sucesso.',
        dados
    });
}));

router.patch('/:id/status', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.body, ['ativo']);

    const id = idPositivo(req.params.id);
    const ativo = booleano(req.body.ativo);
    const dados = await usuariosService.atualizarStatus(id, ativo);

    return res.json({
        sucesso: true,
        mensagem: 'Status do usuário atualizado com sucesso.',
        dados
    });
}));

router.delete('/:id', rotaAssincrona(async (req, res) => {
    const dados = await usuariosService.excluir(idPositivo(req.params.id));

    return res.json({
        sucesso: true,
        mensagem: 'Usuário excluído com sucesso.',
        dados
    });
}));

function validarCriacao(dados) {
    camposPermitidos(dados, ['usuario', 'senha', 'nome', 'funcao', 'ativo']);

    return {
        usuario: textoObrigatorio(dados.usuario, 'usuario', 100),
        senha: senha(dados.senha),
        nome: textoObrigatorio(dados.nome, 'nome', 150),
        funcao: textoObrigatorio(dados.funcao, 'funcao', 100),
        ativo: dados.ativo === undefined ? true : booleano(dados.ativo)
    };
}

function validarAtualizacao(dados) {
    camposPermitidos(dados, ['usuario', 'senha', 'nome', 'funcao', 'ativo']);

    if (Object.keys(dados).length === 0) {
        throw erroHttp(400, 'Informe ao menos um campo para atualizar.');
    }

    const pronto = {};

    if (tem(dados, 'usuario')) pronto.usuario = textoObrigatorio(dados.usuario, 'usuario', 100);
    if (tem(dados, 'senha')) pronto.senha = senha(dados.senha, false);
    if (tem(dados, 'nome')) pronto.nome = textoObrigatorio(dados.nome, 'nome', 150);
    if (tem(dados, 'funcao')) pronto.funcao = textoObrigatorio(dados.funcao, 'funcao', 100);
    if (tem(dados, 'ativo')) pronto.ativo = booleano(dados.ativo);

    return pronto;
}

function tem(objeto, campo) {
    return Object.prototype.hasOwnProperty.call(objeto, campo);
}

module.exports = router;
