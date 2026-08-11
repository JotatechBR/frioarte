const rotaFrioarte = require('./rota_frioarte/rota_frioarte');

module.exports = function registrarRotas(app) {
    app.use('/api/frioarte', rotaFrioarte);
};
