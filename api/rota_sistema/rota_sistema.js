const express = require('express');

const diario = require('../shared/diario');

/**
 * Recebe os acontecimentos do navegador.
 *
 * Sem isto, o que a interface faz morre no console do aparelho — e é exatamente
 * no celular do técnico, em campo, que ninguém está olhando para um console.
 * A tela manda os eventos em lote e eles saem no terminal do servidor junto com
 * o resto.
 *
 * Nada é gravado: a rota imprime e esquece.
 */

const router = express.Router();

/* Limites do lote. O corpo vem da rede: tudo aqui é suspeito até ser podado. */
const MAXIMO_POR_LOTE = 40;
const NIVEIS = ['depuracao', 'info', 'aviso', 'erro'];

router.post('/registros', (req, res) => {
    const corpo = req.body || {};
    const lote = Array.isArray(corpo.registros) ? corpo.registros.slice(0, MAXIMO_POR_LOTE) : [];

    lote.forEach((registro) => {
        if (!registro || typeof registro !== 'object') return;

        diario.registrarDoNavegador({
            nivel: NIVEIS.includes(registro.nivel) ? registro.nivel : 'info',
            onde: texto(registro.onde) || 'navegador',
            evento: texto(registro.evento) || 'evento',
            ms: Number.isFinite(registro.ms) ? Math.round(registro.ms) : undefined,
            tela: texto(corpo.tela),
            sessao: texto(corpo.sessao),
            detalhe: registro.detalhe && typeof registro.detalhe === 'object'
                ? registro.detalhe
                : undefined
        });
    });

    // 204: a tela não precisa de resposta nenhuma, e esperar por uma atrasaria
    // o que o usuário está fazendo.
    res.status(204).end();
});

function texto(valor) {
    if (typeof valor !== 'string') return undefined;

    return valor.slice(0, 80);
}

module.exports = router;
