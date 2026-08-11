const express = require('express');
const frioarteService = require('./frioarte.service');

const router = express.Router();

router.get('/', (req, res, next) => {
    try {
        return res.json({
            sucesso: true,
            dados: frioarteService.obterPerfil()
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
