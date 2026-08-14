const express = require('express');

const clientesService = require('./clientes.service');
const equipamentosService = require('../rota_equipamentos/equipamentos.service');
const visitasService = require('../rota_visitas/visitas.service');
const rotaAssincrona = require('../shared/rotaAssincrona');
const { erroHttp } = require('../shared/erroHttp');
const {
    camposPermitidos,
    textoObrigatorio,
    textoOpcional,
    idPositivo,
    email,
    estado,
    data
} = require('../shared/validacao');

const router = express.Router();

const CAMPOS_CLIENTE = [
    'tipo',
    'nome',
    'documento',
    'telefone',
    'whatsapp',
    'email',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'estado',
    'cliente_desde',
    'status',
    'observacoes'
];

const FILTROS = ['busca', 'status', 'tipo', 'cidade', 'estado'];

router.get('/', rotaAssincrona(async (req, res) => {
    const filtros = validarFiltros(req.query);
    const clientes = await clientesService.listar(filtros);

    return res.json({ sucesso: true, dados: clientes });
}));

router.post('/', rotaAssincrona(async (req, res) => {
    const dados = validarCliente(req.body, false);
    const cliente = await clientesService.criar(dados);

    return res.status(201).json({
        sucesso: true,
        mensagem: 'Cliente cadastrado com sucesso.',
        dados: cliente
    });
}));

router.get('/:id/equipamentos', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.query, ['busca', 'status', 'tipo']);

    const id = idPositivo(req.params.id);
    await clientesService.obterPorId(id);

    const dados = await equipamentosService.listar({ ...req.query, cliente_id: id });
    return res.json({ sucesso: true, dados });
}));

router.get('/:id/visitas', rotaAssincrona(async (req, res) => {
    camposPermitidos(req.query, [
        'tecnico_id',
        'equipamento_codigo',
        'status',
        'tipo',
        'data',
        'data_inicio',
        'data_fim'
    ]);

    const id = idPositivo(req.params.id);
    await clientesService.obterPorId(id);

    const dados = await visitasService.listar({ ...req.query, cliente_id: id });
    return res.json({ sucesso: true, dados });
}));

router.get('/:id', rotaAssincrona(async (req, res) => {
    const id = idPositivo(req.params.id);
    const cliente = await clientesService.obterPorId(id);

    return res.json({ sucesso: true, dados: cliente });
}));

router.put('/:id', rotaAssincrona(async (req, res) => {
    const id = idPositivo(req.params.id);
    const dados = validarCliente(req.body, true);

    // A consulta anterior diferencia um ID inexistente de uma atualização válida
    // que apenas repete os mesmos valores já armazenados.
    await clientesService.obterPorId(id);
    const cliente = await clientesService.atualizar(id, dados);

    return res.json({
        sucesso: true,
        mensagem: 'Cliente atualizado com sucesso.',
        dados: cliente
    });
}));

router.delete('/:id', rotaAssincrona(async (req, res) => {
    const id = idPositivo(req.params.id);
    await clientesService.excluir(id);

    return res.json({
        sucesso: true,
        mensagem: 'Cliente excluído com sucesso.'
    });
}));

function validarFiltros(consulta) {
    camposPermitidos(consulta, FILTROS);

    const filtroEstado = textoOpcional(consulta.estado, 'estado', 2);

    return {
        busca: textoOpcional(consulta.busca, 'busca', 200),
        status: textoOpcional(consulta.status, 'status', 30),
        tipo: textoOpcional(consulta.tipo, 'tipo', 30),
        cidade: textoOpcional(consulta.cidade, 'cidade', 100),
        estado: filtroEstado == null ? filtroEstado : estado(filtroEstado)
    };
}

function validarCliente(corpo, parcial) {
    camposPermitidos(corpo, CAMPOS_CLIENTE);

    if (parcial && Object.keys(corpo).length === 0) {
        throw erroHttp(400, 'Informe ao menos um campo para atualizar.');
    }

    const dados = {};

    validarCampo(dados, corpo, parcial, 'tipo', () =>
        textoObrigatorio(corpo.tipo, 'tipo', 30));
    validarCampo(dados, corpo, parcial, 'nome', () =>
        textoObrigatorio(corpo.nome, 'nome', 150));
    validarCampo(dados, corpo, parcial, 'documento', () =>
        textoOpcional(corpo.documento, 'documento', 20));
    validarCampo(dados, corpo, parcial, 'telefone', () =>
        textoObrigatorio(corpo.telefone, 'telefone', 20));
    validarCampo(dados, corpo, parcial, 'whatsapp', () =>
        textoOpcional(corpo.whatsapp, 'whatsapp', 20));
    validarCampo(dados, corpo, parcial, 'email', () => email(corpo.email));
    validarCampo(dados, corpo, parcial, 'cep', () =>
        textoObrigatorio(corpo.cep, 'cep', 10));
    validarCampo(dados, corpo, parcial, 'logradouro', () =>
        textoObrigatorio(corpo.logradouro, 'logradouro', 200));
    validarCampo(dados, corpo, parcial, 'numero', () =>
        textoOpcional(corpo.numero, 'numero', 20));
    validarCampo(dados, corpo, parcial, 'complemento', () =>
        textoOpcional(corpo.complemento, 'complemento', 150));
    validarCampo(dados, corpo, parcial, 'bairro', () =>
        textoObrigatorio(corpo.bairro, 'bairro', 100));
    validarCampo(dados, corpo, parcial, 'cidade', () =>
        textoObrigatorio(corpo.cidade, 'cidade', 100));
    validarCampo(dados, corpo, parcial, 'estado', () => estado(corpo.estado));
    validarCampo(dados, corpo, parcial, 'cliente_desde', () =>
        data(corpo.cliente_desde, 'cliente_desde'));
    validarCampo(dados, corpo, parcial, 'status', () =>
        textoObrigatorio(corpo.status, 'status', 30));
    validarCampo(dados, corpo, parcial, 'observacoes', () =>
        textoOpcional(corpo.observacoes, 'observacoes'));

    return dados;
}

function validarCampo(destino, origem, parcial, campo, validar) {
    if (parcial && !Object.prototype.hasOwnProperty.call(origem, campo)) return;
    destino[campo] = validar();
}

module.exports = router;
