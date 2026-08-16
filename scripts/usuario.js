require('dotenv').config();

const bcrypt = require('bcryptjs');

const { pool, NOME_BANCO } = require('../api/db');
const { ehAdministrador } = require('../api/middleware/exigirAdministrador');

/**
 * Cadastro de usuário pela linha de comando.
 *
 * Existe por um motivo prático: a tabela `usuarios` nasce vazia, e a tela que
 * cadastra usuários fica atrás do login. Sem uma porta fora do navegador, o
 * sistema tranca a chave do lado de dentro.
 *
 *     npm run usuario -- listar
 *     npm run usuario -- criar joao "senha-forte" "João Pedro" "Administrador"
 *     npm run usuario -- senha joao "nova-senha"
 *     npm run usuario -- funcao joao "Administrador"
 *     npm run usuario -- ativar joao
 *     npm run usuario -- desativar joao
 *
 * A senha aparece no comando e, portanto, no histórico do terminal. Para o
 * primeiro acesso isso é aceitável; para trocas de rotina, o certo é a tela do
 * sistema. Vale trocar a senha do primeiro usuário depois de entrar.
 *
 * `funcao` existe por um motivo de segurança, não de conveniência: a tela
 * `/sistema/usuarios` é restrita a quem tem função de administrador, e é a
 * própria função que define isso. Se a última conta de administrador for
 * rebaixada por engano, ninguém consegue promover ninguém pelo navegador — este
 * comando é a porta de fora que destrava esse nó.
 */

const CUSTO_HASH = 12;

const COMANDOS = {
    listar,
    criar,
    senha: trocarSenha,
    funcao: trocarFuncao,
    ativar: (usuario) => situacao(usuario, true),
    desativar: (usuario) => situacao(usuario, false)
};

async function principal() {
    const [comando, ...argumentos] = process.argv.slice(2);
    const acao = COMANDOS[comando];

    if (!acao) {
        ajuda();
        process.exitCode = 1;
        return;
    }

    await acao(...argumentos);
}

async function listar() {
    const [linhas] = await pool.execute(
        'SELECT id, usuario, nome, funcao, ativo FROM usuarios ORDER BY nome, id'
    );

    if (!linhas.length) {
        console.log(`Nenhum usuário em ${NOME_BANCO}. Crie o primeiro com:`);
        console.log('  npm run usuario -- criar <usuario> <senha> <nome> <funcao>');
        return;
    }

    linhas.forEach((linha) => {
        const marca = Number(linha.ativo) === 1 ? 'ativo   ' : 'inativo ';
        // Quem manda aparece marcado: é a informação que falta quando alguém
        // precisa descobrir a quem pedir um acesso novo.
        const manda = ehAdministrador(linha) ? '  ← administra' : '';

        console.log(`${String(linha.id).padStart(4)}  ${marca}  ${linha.usuario}  —  ${linha.nome} (${linha.funcao})${manda}`);
    });
}

async function criar(usuario, senhaCrua, nome, funcao) {
    exigir(usuario, 'usuario');
    exigir(senhaCrua, 'senha');
    exigir(nome, 'nome');

    conferirSenha(senhaCrua);

    const [existentes] = await pool.execute(
        'SELECT id FROM usuarios WHERE usuario = ? LIMIT 1',
        [usuario]
    );

    if (existentes.length) {
        throw new Error(`Já existe um usuário "${usuario}".`);
    }

    const hash = await bcrypt.hash(senhaCrua, CUSTO_HASH);

    const [resultado] = await pool.execute(
        'INSERT INTO usuarios (usuario, senha_hash, nome, funcao, ativo) VALUES (?, ?, ?, ?, 1)',
        [usuario, hash, nome, funcao || 'Técnico']
    );

    console.log(`Usuário "${usuario}" criado (id ${resultado.insertId}). Entre em /login.`);
}

async function trocarSenha(usuario, senhaCrua) {
    exigir(usuario, 'usuario');
    exigir(senhaCrua, 'senha');

    conferirSenha(senhaCrua);

    const hash = await bcrypt.hash(senhaCrua, CUSTO_HASH);
    const [resultado] = await pool.execute(
        'UPDATE usuarios SET senha_hash = ? WHERE usuario = ?',
        [hash, usuario]
    );

    if (!resultado.affectedRows) throw new Error(`Usuário "${usuario}" não encontrado.`);

    console.log(`Senha de "${usuario}" trocada.`);
}

async function trocarFuncao(usuario, novaFuncao) {
    exigir(usuario, 'usuario');
    exigir(novaFuncao, 'funcao');

    const [resultado] = await pool.execute(
        'UPDATE usuarios SET funcao = ? WHERE usuario = ?',
        [novaFuncao.trim(), usuario]
    );

    if (!resultado.affectedRows) throw new Error(`Usuário "${usuario}" não encontrado.`);

    const manda = ehAdministrador({ funcao: novaFuncao });

    console.log(`Função de "${usuario}" agora é "${novaFuncao.trim()}".`);
    console.log(manda
        ? '  Tem acesso à tela de usuários em /sistema/usuarios.'
        : '  Não tem acesso à tela de usuários — só administradores entram lá.');
}

async function situacao(usuario, ativo) {
    exigir(usuario, 'usuario');

    const [resultado] = await pool.execute(
        'UPDATE usuarios SET ativo = ? WHERE usuario = ?',
        [ativo ? 1 : 0, usuario]
    );

    if (!resultado.affectedRows) throw new Error(`Usuário "${usuario}" não encontrado.`);

    console.log(`Usuário "${usuario}" ${ativo ? 'ativado' : 'desativado'}.`);
}

function exigir(valor, nome) {
    if (typeof valor !== 'string' || !valor.trim()) {
        throw new Error(`Informe ${nome}.`);
    }
}

/**
 * O bcrypt ignora tudo depois do 72º byte: uma senha maior só *parece* mais
 * forte. Melhor recusar do que gravar uma senha silenciosamente truncada.
 */
function conferirSenha(valor) {
    if (valor.length < 8) throw new Error('A senha deve ter ao menos 8 caracteres.');
    if (Buffer.byteLength(valor, 'utf8') > 72) throw new Error('A senha deve ter no máximo 72 bytes.');
}

function ajuda() {
    console.log('Uso:');
    console.log('  npm run usuario -- listar');
    console.log('  npm run usuario -- criar <usuario> <senha> <nome> [funcao]');
    console.log('  npm run usuario -- senha <usuario> <nova-senha>');
    console.log('  npm run usuario -- funcao <usuario> <funcao>');
    console.log('  npm run usuario -- ativar <usuario>');
    console.log('  npm run usuario -- desativar <usuario>');
}

principal()
    .catch((erro) => {
        console.error(`[frioarte] ${erro.message}`);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
