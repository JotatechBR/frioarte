const express = require('express');

const equipamentosService = require('./equipamentos.service');
const visitasService = require('../rota_visitas/visitas.service');
const rotaAssincrona = require('../shared/rotaAssincrona');
const { camposPermitidos } = require('../shared/validacao');

const router = express.Router();

router.get('/', rotaAssincrona(async (req, res) => {
    const equipamentos = await equipamentosService.listar(req.query);

    res.json({
        sucesso: true,
        dados: equipamentos
    });
}));

router.post('/', rotaAssincrona(async (req, res) => {
    const equipamento = await equipamentosService.criar(req.body);

    res.status(201).json({
        sucesso: true,
        mensagem: 'Equipamento cadastrado com sucesso.',
        dados: equipamento
    });
}));

router.get('/:codigo/visitas', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.query, [
        'tecnico_id',
        'status',
        'tipo',
        'data',
        'data_inicio',
        'data_fim'
    ]);

    const equipamento = await equipamentosService.obter(req.params.codigo);
    const dados = await visitasService.listar({
        ...req.query,
        equipamento_codigo: equipamento.codigo
    });

    res.json({ sucesso: true, dados });
}));

router.get('/:codigo', rotaAssincrona(async (req, res) => {
    const equipamento = await equipamentosService.obter(req.params.codigo);

    res.json({
        sucesso: true,
        dados: equipamento
    });
}));

router.put('/:codigo', rotaAssincrona(async (req, res) => {
    const equipamento = await equipamentosService.atualizar(req.params.codigo, req.body);

    res.json({
        sucesso: true,
        mensagem: 'Equipamento atualizado com sucesso.',
        dados: equipamento
    });
}));

router.delete('/:codigo', rotaAssincrona(async (req, res) => {
    await equipamentosService.remover(req.params.codigo);

    res.json({
        sucesso: true,
        mensagem: 'Equipamento excluído com sucesso.'
    });
}));

module.exports = router;
