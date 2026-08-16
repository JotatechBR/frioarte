const express = require('express');

const acesso = require('./acesso.service');
const sessao = require('../shared/sessao');
const rotaAssincrona = require('../shared/rotaAssincrona');
const diario = require('../shared/diario');
const { erroHttp } = require('../shared/erroHttp');
const { camposPermitidos, textoObrigatorio } = require('../shared/validacao');
const { resolver } = require('../middleware/exigirSessao');

/**
 * Entrar, sair e saber quem está dentro.
 *
 * É a única rota da API que responde sem sessão — teria que ser.
 */

const router = express.Router();

/*
 * Freio de tentativa.
 *
 * O sistema atende pela rede local, mas o .env também prevê acesso de fora: um
 * formulário de login exposto sem freio é um alvo de força bruta em questão de
 * horas. A contagem é por usuário *e* origem, para que quem errar a senha três
 * vezes não tranque o colega da mesa ao lado.
 *
 * Em memória, de propósito: reiniciar o servidor limpa a contagem, e isso é
 * aceitável — quem reinicia o servidor já tem acesso à máquina.
 */
const TENTATIVAS_MAXIMAS = 8;
const JANELA = 15 * 60 * 1000;
const tentativas = new Map();

router.post('/login', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.body, ['usuario', 'senha']);

    const usuario = textoObrigatorio(req.body.usuario, 'usuario', 100);
    const senha = textoObrigatorio(req.body.senha, 'senha', 200);
    const chave = `${origem(req)}|${usuario.toLowerCase()}`;

    if (excedeu(chave)) {
        diario.registrar('aviso', 'acesso', 'bloqueado', { usuario });

        throw erroHttp(
            429,
            'Tentativas demais. Aguarde alguns minutos antes de tentar de novo.',
            'ACESSO_BLOQUEADO'
        );
    }

    let autenticado;

    try {
        autenticado = await acesso.autenticar(usuario, senha);
    } catch (erro) {
        anotarFalha(chave);
        diario.registrar('aviso', 'acesso', 'recusado', { usuario });
        throw erro;
    }

    tentativas.delete(chave);
    sessao.gravarCookie(res, autenticado.id);
    diario.info('acesso', 'entrou', { usuario: autenticado.usuario });

    return res.json({
        sucesso: true,
        mensagem: 'Acesso liberado.',
        dados: autenticado
    });
}));

router.post('/sair', rotaAssincrona(async (req, res) => {
    const usuario = await resolver(req);

    sessao.limparCookie(res);

    if (usuario) diario.info('acesso', 'saiu', { usuario: usuario.usuario });

    return res.json({ sucesso: true, mensagem: 'Sessão encerrada.' });
}));

/** Quem está com o sistema aberto. A barra lateral e o painel perguntam isto. */
router.get('/eu', rotaAssincrona(async (req, res) => {
    const usuario = await resolver(req);

    if (!usuario) {
        sessao.limparCookie(res);
        throw erroHttp(401, 'Sessão expirada ou inexistente.', 'SEM_SESSAO');
    }

    return res.json({ sucesso: true, dados: usuario });
}));

/* ---------- Freio ---------- */

function excedeu(chave) {
    const registro = tentativas.get(chave);
    if (!registro) return false;

    if (Date.now() - registro.desde > JANELA) {
        tentativas.delete(chave);
        return false;
    }

    return registro.contagem >= TENTATIVAS_MAXIMAS;
}

function anotarFalha(chave) {
    const agora = Date.now();
    const registro = tentativas.get(chave);

    if (!registro || agora - registro.desde > JANELA) {
        tentativas.set(chave, { contagem: 1, desde: agora });
        return;
    }

    registro.contagem += 1;

    // A limpeza acontece aqui, e não num temporizador: um `setInterval` manteria
    // o processo acordado para varrer um mapa que quase sempre está vazio.
    if (tentativas.size > 500) limpar(agora);
}

function limpar(agora) {
    tentativas.forEach((registro, chave) => {
        if (agora - registro.desde > JANELA) tentativas.delete(chave);
    });
}

function origem(req) {
    return String(req.ip || (req.socket && req.socket.remoteAddress) || 'desconhecida');
}

module.exports = router;
