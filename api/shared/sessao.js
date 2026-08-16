require('dotenv').config();

const crypto = require('crypto');

/**
 * Sessão do sistema interno.
 *
 * Um cookie assinado, e não um registro de sessão no banco: o que precisa ser
 * lembrado entre um pedido e outro é apenas *quem* está do outro lado, e isso
 * cabe em algumas dezenas de bytes. Guardar sessão em tabela custaria uma
 * escrita por login e uma leitura por pedido para resolver um problema que a
 * assinatura já resolve.
 *
 * O que o cookie carrega é o id do usuário e a hora de expirar. Nada mais —
 * nome, função e situação são lidos do banco a cada pedido, porque são o tipo
 * de dado que muda enquanto a sessão está aberta. Um usuário desativado às 14h
 * perde o acesso às 14h, e não quando o cookie vencer.
 */

const NOME_COOKIE = 'frioarte_sessao';
const HORAS = Number(process.env.SESSAO_HORAS) > 0 ? Number(process.env.SESSAO_HORAS) : 12;
const DURACAO = HORAS * 60 * 60 * 1000;

/*
 * Sem segredo declarado o processo sorteia um. O sistema funciona igual, mas
 * toda reinicialização derruba quem estava dentro — por isso o aviso: em
 * produção isso é um incômodo diário, não um detalhe.
 */
const SEGREDO = lerSegredo();

/*
 * `Secure` exige HTTPS. Este sistema roda em rede local, por HTTP, e um cookie
 * `Secure` simplesmente nunca seria enviado — o login pareceria falhar sem
 * erro nenhum. Fica desligado por padrão e liga-se pelo .env quando houver
 * certificado.
 */
const SEGURO = process.env.SESSAO_SEGURA === 'true';

function lerSegredo() {
    const declarado = process.env.SESSAO_SEGREDO;

    if (typeof declarado === 'string' && declarado.trim().length >= 32) {
        return declarado.trim();
    }

    if (declarado) {
        console.warn('[frioarte] SESSAO_SEGREDO tem menos de 32 caracteres — sorteando um segredo temporário');
    } else {
        console.warn('[frioarte] SESSAO_SEGREDO ausente — sorteando um segredo temporário (as sessões caem a cada reinício)');
    }

    return crypto.randomBytes(48).toString('hex');
}

/** `id` + validade, assinados. O ponto separa o conteúdo da assinatura. */
function criarToken(id) {
    const conteudo = Buffer
        .from(JSON.stringify({ id: Number(id), exp: Date.now() + DURACAO }), 'utf8')
        .toString('base64url');

    return `${conteudo}.${assinar(conteudo)}`;
}

/**
 * Devolve o id, ou null. Assinatura conferida antes de olhar o conteúdo: um
 * token adulterado nunca chega a ser interpretado.
 */
function lerToken(token) {
    if (typeof token !== 'string') return null;

    const separador = token.lastIndexOf('.');
    if (separador < 1) return null;

    const conteudo = token.slice(0, separador);
    const assinatura = token.slice(separador + 1);

    if (!conferir(conteudo, assinatura)) return null;

    let dados;

    try {
        dados = JSON.parse(Buffer.from(conteudo, 'base64url').toString('utf8'));
    } catch (erro) {
        return null;
    }

    if (!dados || !Number.isInteger(dados.id) || dados.id < 1) return null;
    if (!Number.isFinite(dados.exp) || dados.exp <= Date.now()) return null;

    return dados.id;
}

function assinar(conteudo) {
    return crypto.createHmac('sha256', SEGREDO).update(conteudo).digest('base64url');
}

/** Comparação de tempo constante: comparar com `===` vaza a assinatura byte a byte. */
function conferir(conteudo, assinatura) {
    const esperada = Buffer.from(assinar(conteudo), 'utf8');
    const recebida = Buffer.from(String(assinatura), 'utf8');

    if (esperada.length !== recebida.length) return false;

    return crypto.timingSafeEqual(esperada, recebida);
}

/* ---------- Cookie ---------- */

/**
 * Leitor de cookie próprio, para não trazer o `cookie-parser` por um único
 * cabeçalho. O valor pode conter `=` (base64url não, mas o formato permite),
 * então só o primeiro separador conta.
 */
function lerCookie(req) {
    const cabecalho = req.headers && req.headers.cookie;
    if (typeof cabecalho !== 'string') return null;

    const partes = cabecalho.split(';');

    for (const parte of partes) {
        const igual = parte.indexOf('=');
        if (igual < 0) continue;

        if (parte.slice(0, igual).trim() !== NOME_COOKIE) continue;

        try {
            return decodeURIComponent(parte.slice(igual + 1).trim());
        } catch (erro) {
            return null;
        }
    }

    return null;
}

function gravarCookie(res, id) {
    res.cookie(NOME_COOKIE, criarToken(id), {
        httpOnly: true,
        sameSite: 'lax',
        secure: SEGURO,
        path: '/',
        maxAge: DURACAO
    });
}

function limparCookie(res) {
    res.clearCookie(NOME_COOKIE, {
        httpOnly: true,
        sameSite: 'lax',
        secure: SEGURO,
        path: '/'
    });
}

/** O id do usuário do pedido, ou null. Não toca no banco. */
function idDoPedido(req) {
    return lerToken(lerCookie(req));
}

module.exports = {
    NOME_COOKIE,
    DURACAO,
    criarToken,
    lerToken,
    gravarCookie,
    limparCookie,
    idDoPedido
};
