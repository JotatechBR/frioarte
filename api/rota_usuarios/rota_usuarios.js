const express = require('express');

const usuariosService = require('./usuarios.service');
const { erroHttp } = require('../shared/erroHttp');
const rotaAssincrona = require('../shared/rotaAssincrona');
const { exigirAdministrador } = require('../middleware/exigirAdministrador');
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

/**
 * Ler a equipe e mexer nela são coisas diferentes.
 *
 * A listagem fica aberta a qualquer sessão porque o sistema depende dela: é o
 * `select` de técnico no agendamento de visita. Fechá-la aqui quebraria a
 * agenda para todo mundo que não é administrador, para esconder uma informação
 * que estas mesmas pessoas leem no cartão da visita ao lado.
 *
 * Criar, editar, ativar e excluir são outra história — e é onde a segunda
 * fechadura entra. O que a lista devolve, aqui e ali, nunca inclui `senha_hash`
 * (ver COLUNAS_PUBLICAS no serviço).
 */
router.get('/', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.query, ['busca', 'ativo', 'funcao']);

    const dados = await usuariosService.listar({
        busca: textoOpcional(req.query.busca, 'busca', 150),
        ativo: booleanoConsulta(req.query.ativo),
        funcao: textoOpcional(req.query.funcao, 'funcao', 100)
    });

    return res.json({ sucesso: true, dados });
}));

router.use(exigirAdministrador);

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

    if (entrada.ativo === false) conferirNaoEhVoce(req, id, 'desativar');

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

    if (!ativo) conferirNaoEhVoce(req, id, 'desativar');

    const dados = await usuariosService.atualizarStatus(id, ativo);

    return res.json({
        sucesso: true,
        mensagem: 'Status do usuário atualizado com sucesso.',
        dados
    });
}));

router.delete('/:id', rotaAssincrona(async (req, res) => {
    const id = idPositivo(req.params.id);

    conferirNaoEhVoce(req, id, 'excluir');

    const dados = await usuariosService.excluir(id);

    return res.json({
        sucesso: true,
        mensagem: 'Usuário excluído com sucesso.',
        dados
    });
}));

/**
 * A conta que está em uso não se desliga sozinha.
 *
 * Excluir ou desativar a própria conta é o único erro desta tela sem volta pela
 * própria tela: no pedido seguinte a sessão deixa de valer (`porId` recusa
 * usuário inativo) e a pessoa cai no login sem conseguir voltar. Se o
 * administrador quer mesmo sair de cena, alguém com acesso faz isso por ele —
 * ou o `npm run usuario` faz, do lado de fora do navegador.
 *
 * Trocar a *própria função* continua permitido de propósito: é uma decisão
 * consciente, e o script da linha de comando desfaz.
 */
function conferirNaoEhVoce(req, id, acao) {
    if (req.usuario && Number(req.usuario.id) === id) {
        throw erroHttp(
            409,
            `Você não pode ${acao} a própria conta. Peça a outro administrador.`,
            'CONTA_EM_USO'
        );
    }
}

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
