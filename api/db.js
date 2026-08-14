require('dotenv').config();

const mysql = require('mysql2/promise');

const NOME_BANCO = 'frio_arte';

function obrigatoria(nome) {
    const valor = process.env[nome];

    if (typeof valor !== 'string' || !valor.trim()) {
        throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
    }

    return valor.trim();
}

function porta() {
    const valor = Number(obrigatoria('DB_PORT'));

    if (!Number.isInteger(valor) || valor < 1 || valor > 65535) {
        throw new Error('Variável de ambiente DB_PORT inválida');
    }

    return valor;
}

if (!Object.prototype.hasOwnProperty.call(process.env, 'DB_PASSWORD')) {
    throw new Error('Variável de ambiente obrigatória ausente: DB_PASSWORD');
}

/**
 * Pool único do processo. `dateStrings` impede que DATE passe por UTC e mude
 * de dia; `multipleStatements: false` reduz a superfície de injeção.
 */
const pool = mysql.createPool({
    host: obrigatoria('DB_HOST'),
    port: porta(),
    user: obrigatoria('DB_USER'),
    password: process.env.DB_PASSWORD,
    database: NOME_BANCO,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4_unicode_ci',
    dateStrings: true,
    multipleStatements: false
});

/** Consulta somente leitura usada pela inicialização e pelos diagnósticos. */
async function testarConexao() {
    const [linhas] = await pool.execute('SELECT 1 AS ok, DATABASE() AS banco');
    const resultado = linhas[0] || {};

    return {
        conectado: Number(resultado.ok) === 1,
        banco: resultado.banco
    };
}

module.exports = { pool, testarConexao, NOME_BANCO };
