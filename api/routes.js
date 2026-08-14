const rotaFrioarte = require('./rota_frioarte/rota_frioarte');
const rotaSistema = require('./rota_sistema/rota_sistema');
const rotaUsuarios = require('./rota_usuarios/rota_usuarios');
const rotaClientes = require('./rota_clientes/rota_clientes');
const rotaEquipamentos = require('./rota_equipamentos/rota_equipamentos');
const rotaVisitas = require('./rota_visitas/rota_visitas');

module.exports = function registrarRotas(app) {
    app.use('/api/frioarte', rotaFrioarte);
    app.use('/api/sistema', rotaSistema);
    app.use('/api/usuarios', rotaUsuarios);
    app.use('/api/clientes', rotaClientes);
    app.use('/api/equipamentos', rotaEquipamentos);
    app.use('/api/visitas', rotaVisitas);
};
