/**
 * Diário do sistema — ao vivo, no terminal.
 *
 * Nada é gravado em disco. Tudo o que acontece no sistema interno sai aqui, em
 * tempo real, na janela onde o servidor está rodando: os pedidos HTTP e também
 * o que o navegador faz — inclusive o celular do técnico, que manda os eventos
 * dele para cá justamente para caberem nesta mesma janela.
 *
 * Formato de uma linha:
 *
 *     17:04:22  info   ~ dados/carregarClientes   124ms  itens=0 filtro=todos
 *                      ↑ o til marca o que veio do navegador
 *
 * Regra que vale para o arquivo inteiro: **registrar nunca pode derrubar nada**.
 * Qualquer falha aqui é engolida. Um sistema que para porque não conseguiu
 * escrever uma linha de log trocou o problema pequeno pelo grande.
 */

const PRODUCAO = process.env.NODE_ENV === 'production';

/* Do mais tagarela ao mais grave. Abaixo do mínimo, nada aparece. */
const NIVEIS = ['depuracao', 'info', 'aviso', 'erro'];

const MINIMO = Math.max(0, NIVEIS.indexOf(process.env.LOG_NIVEL || (PRODUCAO ? 'info' : 'depuracao')));

/** Detalhe é contexto, não dossiê: texto longo é cortado antes de imprimir. */
const LIMITE_TEXTO = 200;

/* Mesmo que um navegador mande detalhe indevido, segredo não chega ao
   terminal. A comparação cobre também nomes como nova_senha e access_token. */
const SEGREDO = /(senha|password|token|authorization|cookie|secret)/i;

/*
 * Cor só quando a saída é um terminal de verdade. Redirecionada para arquivo ou
 * cano, ela viraria lixo de escape no meio do texto. NO_COLOR é a convenção que
 * o usuário usa para pedir silêncio de cor.
 */
const COLORIR = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const COR = {
    depuracao: '\x1b[90m',
    info: '\x1b[36m',
    aviso: '\x1b[33m',
    erro: '\x1b[31m',
    fraco: '\x1b[90m',
    forte: '\x1b[1m',
    fim: '\x1b[0m'
};

function pintar(texto, cor) {
    return COLORIR ? `${COR[cor]}${texto}${COR.fim}` : texto;
}

/**
 * @param {string} nivel    depuracao | info | aviso | erro
 * @param {string} onde     área: http, dados, formulario, busca, tela…
 * @param {string} evento   o que aconteceu, em uma palavra ou duas
 * @param {object} detalhe  o contexto que explica o evento
 */
function registrar(nivel, onde, evento, detalhe) {
    imprimir(Object.assign(
        { nivel, onde, evento, origem: 'servidor' },
        detalhe && typeof detalhe === 'object' ? podar(detalhe) : {}
    ));
}

/**
 * Imprime o que veio do navegador. É dado de fora: mesmo tendo passado pela
 * validação da rota, é podado de novo aqui — nada chega ao terminal sem passar
 * pela mesma peneira.
 */
function registrarDoNavegador(registro) {
    imprimir(Object.assign(
        { nivel: 'info', onde: 'navegador', evento: 'evento' },
        podar(registro || {}),
        { origem: 'navegador' }
    ));
}

function imprimir(registro) {
    try {
        const posicao = NIVEIS.indexOf(registro.nivel);
        if (posicao < 0 || posicao < MINIMO) return;

        const hora = new Date().toTimeString().slice(0, 8);
        // 10 porque "depuracao" tem 9: sem a folga, o til da origem cola no nível.
        const nivel = registro.nivel.padEnd(10);
        const marca = registro.origem === 'navegador' ? '~ ' : '  ';
        const assunto = `${registro.onde}/${registro.evento}`;
        const tempo = registro.ms !== undefined ? `${registro.ms}ms`.padStart(7) : '       ';

        const linha = pintar(hora, 'fraco')
            + '  ' + pintar(nivel, registro.nivel)
            + pintar(marca, 'fraco')
            + assunto.padEnd(30)
            + pintar(tempo, 'fraco')
            + '  ' + pintar(cauda(registro), 'fraco');

        if (registro.nivel === 'erro') console.error(linha);
        else console.log(linha);
    } catch (erro) {
        /* Nem o log pode quebrar por causa do log. */
    }
}

/**
 * Os campos que sobram viram `chave=valor` no fim da linha.
 *
 * `detalhe` é embrulho, não informação: as chaves de dentro sobem para a linha
 * em vez de aparecerem como um JSON espremido. E o contexto que se repete em
 * todo evento da mesma aba — tela e sessão — vai para o fim, onde não atrapalha
 * a leitura do que mudou.
 */
function cauda(registro) {
    const estrutura = ['nivel', 'origem', 'onde', 'evento', 'ms'];
    const contexto = ['tela', 'sessao'];
    const partes = [];

    Object.keys(registro)
        .filter((chave) => !estrutura.includes(chave) && !contexto.includes(chave))
        .forEach((chave) => {
            const valor = registro[chave];

            if (chave === 'detalhe' && valor && typeof valor === 'object') {
                Object.entries(valor).forEach(([dentro, conteudo]) => {
                    partes.push(`${dentro}=${resumir(conteudo)}`);
                });
                return;
            }

            partes.push(`${chave}=${resumir(valor)}`);
        });

    contexto.forEach((chave) => {
        if (registro[chave] !== undefined) partes.push(`${chave}=${resumir(registro[chave])}`);
    });

    return partes.join(' ');
}

function resumir(valor) {
    if (valor === null || valor === undefined) return '—';
    if (typeof valor === 'object') return JSON.stringify(valor).slice(0, LIMITE_TEXTO);

    return String(valor).slice(0, LIMITE_TEXTO);
}

/** Corta texto comprido, conta lista e descarta o que não é dado simples. */
function podar(objeto, profundidade = 0) {
    const limpo = {};

    Object.entries(objeto).forEach(([chave, valor]) => {
        if (SEGREDO.test(chave)) return;
        if (valor === null || valor === undefined) return;

        if (typeof valor === 'string') {
            limpo[chave] = valor.length > LIMITE_TEXTO ? `${valor.slice(0, LIMITE_TEXTO)}…` : valor;
            return;
        }

        if (typeof valor === 'number' || typeof valor === 'boolean') {
            limpo[chave] = valor;
            return;
        }

        if (Array.isArray(valor)) {
            limpo[chave] = valor.length;
            return;
        }

        if (typeof valor === 'object' && profundidade < 2) {
            limpo[chave] = podar(valor, profundidade + 1);
        }
    });

    return limpo;
}

/** Cabeçalho impresso uma vez, quando o servidor sobe. */
function abrirSessao(porta) {
    console.log('');
    console.log(pintar(`  diário do sistema — ao vivo, nada é gravado (porta ${porta})`, 'forte'));
    console.log(pintar('  hora      nível      área/evento                  tempo  detalhe', 'fraco'));
    console.log(pintar('  ' + '─'.repeat(72), 'fraco'));
}

module.exports = {
    registrar,
    registrarDoNavegador,
    abrirSessao,
    depuracao: (onde, evento, detalhe) => registrar('depuracao', onde, evento, detalhe),
    info: (onde, evento, detalhe) => registrar('info', onde, evento, detalhe),
    aviso: (onde, evento, detalhe) => registrar('aviso', onde, evento, detalhe),
    erro: (onde, evento, detalhe) => registrar('erro', onde, evento, detalhe)
};
