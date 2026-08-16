const rotaFrioarte = require('./rota_frioarte/rota_frioarte');
const rotaAcesso = require('./rota_acesso/rota_acesso');
const rotaSistema = require('./rota_sistema/rota_sistema');
const rotaUsuarios = require('./rota_usuarios/rota_usuarios');
const rotaClientes = require('./rota_clientes/rota_clientes');
const rotaEquipamentos = require('./rota_equipamentos/rota_equipamentos');
const rotaVisitas = require('./rota_visitas/rota_visitas');
const { exigirSessao } = require('./middleware/exigirSessao');

/**
 * Duas faixas, e a diferença entre elas é o que está do outro lado.
 *
 * `/api/frioarte` alimenta o site público — quem chama é o navegador de quem
 * está pedindo orçamento, e exigir sessão ali fecharia a porta da rua.
 * `/api/acesso` é a própria fechadura, e não pode depender de estar destrancada.
 *
 * Todo o resto é cadastro de cliente: nome, telefone, endereço, agenda. Passa
 * pela sessão sem exceção — inclusive o diário, que é chamado de dentro das
 * telas do sistema e de mais lugar nenhum.
 */
module.exports = function registrarRotas(app) {
    app.use('/api/frioarte', rotaFrioarte);
    app.use('/api/acesso', rotaAcesso);

    app.use('/api/sistema', exigirSessao, rotaSistema);
    app.use('/api/usuarios', exigirSessao, rotaUsuarios);
    app.use('/api/clientes', exigirSessao, rotaClientes);
    app.use('/api/equipamentos', exigirSessao, rotaEquipamentos);
    app.use('/api/visitas', exigirSessao, rotaVisitas);
};
