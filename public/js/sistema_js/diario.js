/**
 * Diário da interface.
 *
 * Registra o que acontece na tela e manda para o terminal do servidor, onde
 * tudo aparece ao vivo, misturado aos pedidos HTTP. Nada é gravado em lugar
 * nenhum: nem em disco, nem em `localStorage`.
 *
 * Existe porque o console do navegador não serve para acompanhar este sistema.
 * Quem o usa em campo é o técnico, no celular, e ninguém está olhando para o
 * console de um celular. Mandando para cá, uma janela só mostra o movimento dos
 * dois lados.
 *
 * Envio em lote, e não a cada evento: uma tela de lista dispara cinco ou seis
 * acontecimentos em menos de um segundo, e cinco requisições para relatá-los
 * custariam mais do que o trabalho que estão relatando.
 */

(function () {
    /* Espera curta o bastante para parecer ao vivo, longa o bastante para juntar. */
    const INTERVALO = 1200;

    /* Teto do que fica esperando. Servidor fora do ar não vira memória crescendo. */
    const LIMITE_FILA = 60;

    const ENDERECO = '/api/sistema/registros';

    /* Identifica esta aba no meio das outras — celular e computador ao mesmo tempo. */
    const sessao = Math.random().toString(36).slice(2, 8);

    const fila = [];

    let agendado = null;
    let calado = false;

    /** Que tela está aberta. Vai em todo lote, e não em cada linha. */
    function tela() {
        return `${document.body.dataset.secao || '?'}${window.location.pathname.replace('/sistema', '') || ''}`;
    }

    function registrar(nivel, onde, evento, detalhe) {
        // Console do navegador continua servindo a quem estiver com ele aberto.
        const marca = `[sistema] ${onde}/${evento}`;

        if (nivel === 'erro') console.error(marca, detalhe || '');
        else if (nivel === 'aviso') console.warn(marca, detalhe || '');
        else console.debug(marca, detalhe || '');

        if (calado) return;

        fila.push({ nivel, onde, evento, ms: detalhe && detalhe.ms, detalhe: limpar(detalhe) });

        if (fila.length > LIMITE_FILA) fila.splice(0, fila.length - LIMITE_FILA);

        if (!agendado) agendado = setTimeout(despachar, INTERVALO);
    }

    /**
     * O que vai para o terminal é o que explica o evento: identificador,
     * contagem, filtro, duração. Registro inteiro de cliente — telefone, CPF,
     * endereço — não entra: o log é para acompanhar o sistema, não para
     * espalhar dado pessoal por uma janela aberta o dia todo.
     */
    function limpar(detalhe) {
        if (!detalhe || typeof detalhe !== 'object') return undefined;

        const limpo = {};

        Object.entries(detalhe).forEach(([chave, valor]) => {
            if (chave === 'ms') return;
            if (valor === null || valor === undefined) return;

            if (typeof valor === 'string') limpo[chave] = valor.slice(0, 120);
            else if (typeof valor === 'number' || typeof valor === 'boolean') limpo[chave] = valor;
            else if (Array.isArray(valor)) limpo[chave] = valor.length;
        });

        return Object.keys(limpo).length ? limpo : undefined;
    }

    function despachar() {
        agendado = null;

        if (fila.length === 0) return;

        const lote = { sessao, tela: tela(), registros: fila.splice(0, fila.length) };

        fetch(ENDERECO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lote),
            keepalive: true
        }).catch(() => {
            /*
             * Servidor fora do ar: cala a boca de vez. Continuar tentando
             * encheria o console do navegador de falhas de rede — o log
             * atrapalhando justamente quando algo já está errado.
             */
            calado = true;
        });
    }

    /**
     * Ao sair da página, o que estiver na fila vai embora agora. `sendBeacon`
     * é o único envio que o navegador garante durante a saída — um `fetch`
     * comum seria cancelado no meio.
     */
    function esvaziar() {
        if (fila.length === 0 || calado) return;

        const lote = { sessao, tela: tela(), registros: fila.splice(0, fila.length) };

        try {
            navigator.sendBeacon(ENDERECO, new Blob([JSON.stringify(lote)], {
                type: 'application/json'
            }));
        } catch (erro) {
            /* Saindo da página: não há mais nada a fazer. */
        }
    }

    /**
     * Envolve as funções de um módulo para registrar sozinho toda chamada:
     * nome, duração e o tamanho do que voltou. É o que permite "tudo o que
     * acontece" sem espalhar uma linha de log dentro de cada função.
     */
    function envolver(onde, modulo) {
        const envolvido = {};

        Object.entries(modulo).forEach(([nome, valor]) => {
            if (typeof valor !== 'function') {
                envolvido[nome] = valor;
                return;
            }

            envolvido[nome] = function (...argumentos) {
                const inicio = performance.now();

                try {
                    const resultado = valor.apply(this, argumentos);

                    if (resultado && typeof resultado.then === 'function') {
                        return resultado.then(
                            (valorFinal) => {
                                contar(onde, nome, inicio, argumentos, valorFinal);
                                return valorFinal;
                            },
                            (erro) => {
                                falhar(onde, nome, inicio, erro);
                                throw erro;
                            }
                        );
                    }

                    contar(onde, nome, inicio, argumentos, resultado);
                    return resultado;
                } catch (erro) {
                    falhar(onde, nome, inicio, erro);
                    throw erro;
                }
            };
        });

        return envolvido;
    }

    function contar(onde, nome, inicio, argumentos, resultado) {
        const detalhe = { ms: Math.round(performance.now() - inicio) };

        if (Array.isArray(resultado)) detalhe.itens = resultado.length;
        else if (resultado === null) detalhe.achou = false;

        const primeiro = argumentos[0];

        if (primeiro && typeof primeiro === 'object') {
            if (primeiro.termo) detalhe.termo = String(primeiro.termo).slice(0, 40);
            if (primeiro.filtro) detalhe.filtro = primeiro.filtro;
            if (primeiro.periodo) detalhe.periodo = primeiro.periodo;
            if (primeiro.clienteId) detalhe.cliente = primeiro.clienteId;
        } else if (primeiro !== undefined) {
            detalhe.alvo = String(primeiro).slice(0, 40);
        }

        registrar('depuracao', onde, nome, detalhe);
    }

    function falhar(onde, nome, inicio, erro) {
        registrar('erro', onde, nome, {
            ms: Math.round(performance.now() - inicio),
            mensagem: erro && erro.message ? erro.message : String(erro)
        });
    }

    /** Erro que ninguém pegou é o que mais importa registrar. */
    function vigiarFalhas() {
        window.addEventListener('error', (evento) => {
            registrar('erro', 'tela', 'excecao', {
                mensagem: evento.message,
                arquivo: String(evento.filename || '').split('/').pop(),
                linha: evento.lineno
            });
        });

        window.addEventListener('unhandledrejection', (evento) => {
            const motivo = evento.reason;

            registrar('erro', 'tela', 'promessa-rejeitada', {
                mensagem: motivo && motivo.message ? motivo.message : String(motivo)
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        vigiarFalhas();

        registrar('info', 'tela', 'abriu', {
            largura: window.innerWidth,
            aparelho: window.matchMedia('(min-width: 64rem)').matches ? 'desktop' : 'celular'
        });
    });

    // 'pagehide' e não 'unload': é o único que o Safari do iPhone entrega, e
    // metade do uso deste sistema é iPhone em cima de uma escada.
    window.addEventListener('pagehide', esvaziar);

    // Substitui o diário mudo que o <head> deixou no lugar. Se este arquivo não
    // tivesse subido, aquele continuaria valendo e ninguém quebraria.
    window.FrioArteDiario = {
        registrar,
        envolver,
        depuracao: (onde, evento, detalhe) => registrar('depuracao', onde, evento, detalhe),
        info: (onde, evento, detalhe) => registrar('info', onde, evento, detalhe),
        aviso: (onde, evento, detalhe) => registrar('aviso', onde, evento, detalhe),
        erro: (onde, evento, detalhe) => registrar('erro', onde, evento, detalhe)
    };
})();
