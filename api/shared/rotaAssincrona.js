/** Express 4 não encaminha sozinho rejeições de handlers assíncronos. */
module.exports = function rotaAssincrona(handler) {
    return function tratarRotaAssincrona(req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
};
