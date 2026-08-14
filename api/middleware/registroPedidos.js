const diario = require('../shared/diario');

/**
 * Registra cada pedido que interessa acompanhar.
 *
 * Arquivo estático fica de fora: uma tela do sistema puxa dezenas de CSS, JS e
 * imagens, e imprimir todos afogaria no ruído justamente o que se quer ver. O
 * que vale é página, API e qualquer coisa que tenha dado errado — um 404 de
 * arquivo é sintoma, então esse passa.
 */

const ESTATICO = /\.(css|js|png|jpe?g|webp|svg|ico|woff2?|map)$/i;

/** Endereços que existem para o próprio log e não devem se registrar. */
const SILENCIOSAS = ['/api/sistema/registros'];

function registrarPedidos(req, res, next) {
    const inicio = Date.now();

    /*
     * A rota é lida agora, e não no 'finish'. Ao entrar num `app.use` com
     * prefixo, o Express reescreve `req.url` e `req.path` para o caminho
     * relativo ao ponto de montagem — no fim do pedido, `req.path` de
     * `/api/sistema/registros` já vale só `/registros`. `originalUrl` nunca é
     * reescrito, e é ele que responde "o que foi pedido".
     */
    const rota = req.originalUrl;
    const caminho = rota.split('?')[0];

    // 'finish' porque só no fim existe status e duração — no começo do pedido
    // ainda não há o que contar.
    res.on('finish', () => {
        // Arquivo que carregou bem é ruído; arquivo que faltou é sintoma.
        if (ESTATICO.test(caminho) && res.statusCode < 400) return;

        if (SILENCIOSAS.includes(caminho)) return;

        diario.registrar(nivelDoStatus(res.statusCode), 'http', 'pedido', {
            ms: Date.now() - inicio,
            metodo: req.method,
            // Valores de busca podem ser telefone, documento ou nome. O diário
            // precisa da rota, não desses dados pessoais.
            rota: caminho,
            status: res.statusCode,
            de: aparelho(req)
        });
    });

    next();
}

function nivelDoStatus(status) {
    if (status >= 500) return 'erro';
    if (status >= 400) return 'aviso';

    return 'info';
}

/**
 * Quem pediu. No sistema em rede local isto responde a pergunta prática: foi
 * deste computador ou foi o celular do técnico?
 */
function aparelho(req) {
    // ::ffff:10.0.0.5 é IPv4 embrulhado em IPv6; o embrulho não informa nada.
    const endereco = String(req.ip || '').replace('::ffff:', '');

    if (endereco === '::1' || endereco === '127.0.0.1') return 'local';

    return endereco;
}

module.exports = { registrarPedidos };
