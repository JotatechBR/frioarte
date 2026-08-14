const express = require('express');

const rotaAssincrona = require('../shared/rotaAssincrona');
const { camposPermitidos } = require('../shared/validacao');
const visitas = require('./visitas.service');

const router = express.Router();

router.get('/', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.query, [
        'cliente_id',
        'tecnico_id',
        'equipamento_codigo',
        'status',
        'tipo',
        'data',
        'data_inicio',
        'data_fim'
    ]);

    res.json({ sucesso: true, dados: await visitas.listar(req.query) });
}));

router.get('/:id', rotaAssincrona(async (req, res) => {
    res.json({ sucesso: true, dados: await visitas.obter(req.params.id) });
}));

router.post('/', rotaAssincrona(async (req, res) => {
    const dados = await visitas.criar(req.body);
    res.status(201).json({
        sucesso: true,
        mensagem: 'Visita cadastrada com sucesso.',
        dados
    });
}));

router.put('/:id', rotaAssincrona(async (req, res) => {
    const dados = await visitas.atualizar(req.params.id, req.body);
    res.json({ sucesso: true, mensagem: 'Visita atualizada com sucesso.', dados });
}));

router.delete('/:id', rotaAssincrona(async (req, res) => {
    await visitas.remover(req.params.id);
    res.json({ sucesso: true, mensagem: 'Visita excluída com sucesso.' });
}));

module.exports = router;
