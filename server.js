require('dotenv').config();

const os = require('os');
const path = require('path');
const express = require('express');

const registrarRotas = require('./api/routes');
const { registrarPaginas, registrarPaginaNaoEncontrada } = require('./api/pages');
const { naoEncontrado, tratarErro } = require('./api/middleware/tratamentoErros');
const { registrarPedidos } = require('./api/middleware/registroPedidos');
const diario = require('./api/shared/diario');
const { pool, testarConexao, NOME_BANCO } = require('./api/db');

const app = express();
const PORT = process.env.PORT || 3000;

/*
 * Escuta em todas as interfaces da máquina, e não só na de retorno. É o que
 * permite abrir o sistema pelo celular na mesma rede — o técnico em campo usa o
 * aparelho dele, não este computador.
 *
 * Continua configurável: HOST=127.0.0.1 no .env fecha o acesso à rede sem
 * precisar mexer no código.
 */
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

// Antes de tudo que responde: é o único ponto por onde todo pedido passa.
app.use(registrarPedidos);

app.use(express.static(path.join(__dirname, 'public')));

registrarPaginas(app);
registrarRotas(app);

app.use('/api', naoEncontrado);

// Último de todos: só chega aqui o que nenhuma rota acima reconheceu.
registrarPaginaNaoEncontrada(app);

app.use(tratarErro);

async function iniciar() {
    try {
        const banco = await testarConexao();

        if (!banco.conectado || banco.banco !== NOME_BANCO) {
            const erro = new Error('Banco de dados inesperado');
            erro.code = 'BANCO_INESPERADO';
            throw erro;
        }

        diario.info('banco', 'conectado', { banco: NOME_BANCO });

        return app.listen(PORT, HOST, () => {
            console.log(`FrioArte rodando em http://localhost:${PORT}`);

            // Os endereços da rede local, para não ter que descobrir o IP no ipconfig
            // toda vez que for abrir o sistema no celular.
            enderecosDaRede().forEach((endereco) => {
                console.log(`             na rede em http://${endereco}:${PORT}`);
            });

            diario.abrirSessao(PORT);
        });
    } catch (erro) {
        const codigo = typeof erro.code === 'string' ? erro.code : 'ERRO_CONEXAO';

        // Nunca imprimir o objeto do mysql2: ele pode carregar SQL e valores.
        console.error(`[frioarte] não foi possível conectar ao banco ${NOME_BANCO} (${codigo})`);
        diario.erro('banco', 'conexao-falhou', { banco: NOME_BANCO, codigo });

        try {
            await pool.end();
        } catch (falhaAoFechar) {
            /* A falha original de conexão é a informação relevante. */
        }

        process.exitCode = 1;
        return null;
    }
}

if (require.main === module) iniciar();

/** IPv4 das placas de rede reais — sem a de retorno e sem as virtuais. */
function enderecosDaRede() {
    if (HOST !== '0.0.0.0') return [];

    return Object.values(os.networkInterfaces())
        .flat()
        .filter((placa) => placa && placa.family === 'IPv4' && !placa.internal)
        .map((placa) => placa.address);
}

module.exports = app;

// Mantém compatibilidade caso algum arquivo use { app, iniciar }
module.exports.app = app;
module.exports.iniciar = iniciar;
