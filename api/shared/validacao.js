const { erroHttp } = require('./erroHttp');

const ID_MAXIMO = 4294967295;

function corpo(valor) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
        throw erroHttp(400, 'O corpo da requisição deve ser um objeto JSON.');
    }

    return valor;
}

function camposPermitidos(dados, permitidos) {
    corpo(dados);

    const extras = Object.keys(dados).filter((campo) => !permitidos.includes(campo));
    if (extras.length) {
        throw erroHttp(400, `Campo não permitido: ${extras[0]}.`);
    }
}

function textoObrigatorio(valor, campo, maximo) {
    if (typeof valor !== 'string' && typeof valor !== 'number') {
        throw erroHttp(400, `O campo ${campo} é obrigatório.`);
    }

    const pronto = String(valor).trim();
    if (!pronto) throw erroHttp(400, `O campo ${campo} é obrigatório.`);
    conferirTamanho(pronto, campo, maximo);

    return pronto;
}

/** Ausente continua ausente; vazio explícito vira NULL para o MySQL. */
function textoOpcional(valor, campo, maximo) {
    if (valor === undefined) return undefined;
    if (valor === null || valor === '') return null;
    if (typeof valor !== 'string' && typeof valor !== 'number') {
        throw erroHttp(400, `O campo ${campo} é inválido.`);
    }

    const pronto = String(valor).trim();
    if (!pronto) return null;
    conferirTamanho(pronto, campo, maximo);

    return pronto;
}

function conferirTamanho(valor, campo, maximo) {
    if (maximo && valor.length > maximo) {
        throw erroHttp(400, `O campo ${campo} deve ter no máximo ${maximo} caracteres.`);
    }
}

function idPositivo(valor, campo = 'id', opcional = false) {
    if ((valor === undefined || valor === null || valor === '') && opcional) {
        return valor === null || valor === '' ? null : undefined;
    }

    const texto = String(valor);
    if (!/^\d+$/.test(texto)) throw erroHttp(400, `O campo ${campo} deve ser um inteiro positivo.`);

    const numero = Number(texto);
    if (!Number.isInteger(numero) || numero < 1 || numero > ID_MAXIMO) {
        throw erroHttp(400, `O campo ${campo} deve ser um inteiro positivo.`);
    }

    return numero;
}

function booleano(valor, campo = 'ativo', opcional = false) {
    if (valor === undefined && opcional) return undefined;
    if (typeof valor !== 'boolean') throw erroHttp(400, `O campo ${campo} deve ser booleano.`);

    return valor;
}

function booleanoConsulta(valor, campo = 'ativo') {
    if (valor === undefined || valor === '') return undefined;
    if (valor === true || valor === 'true' || valor === '1' || valor === 1) return true;
    if (valor === false || valor === 'false' || valor === '0' || valor === 0) return false;

    throw erroHttp(400, `O filtro ${campo} deve ser true ou false.`);
}

function email(valor, campo = 'email') {
    const pronto = textoOpcional(valor, campo, 150);
    if (pronto == null) return pronto;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pronto)) {
        throw erroHttp(400, `O campo ${campo} é inválido.`);
    }

    return pronto;
}

function estado(valor) {
    const pronto = textoObrigatorio(valor, 'estado', 2).toUpperCase();
    if (!/^[A-Z]{2}$/.test(pronto)) throw erroHttp(400, 'O campo estado deve conter uma UF com 2 letras.');

    return pronto;
}

function data(valor, campo, opcional = false) {
    if ((valor === undefined || valor === null || valor === '') && opcional) {
        return valor === null || valor === '' ? null : undefined;
    }

    const pronto = textoObrigatorio(valor, campo, 10);
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pronto);
    if (!partes) throw erroHttp(400, `O campo ${campo} deve estar no formato AAAA-MM-DD.`);

    const ano = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);
    const conferida = new Date(Date.UTC(ano, mes - 1, dia));

    if (conferida.getUTCFullYear() !== ano || conferida.getUTCMonth() !== mes - 1 ||
        conferida.getUTCDate() !== dia) {
        throw erroHttp(400, `O campo ${campo} contém uma data inválida.`);
    }

    return pronto;
}

function hora(valor, campo = 'hora') {
    const pronto = textoObrigatorio(valor, campo, 8);
    const partes = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(pronto);

    if (!partes || Number(partes[1]) > 23 || Number(partes[2]) > 59 ||
        Number(partes[3] || 0) > 59) {
        throw erroHttp(400, `O campo ${campo} deve conter um horário válido.`);
    }

    return `${partes[1]}:${partes[2]}:${partes[3] || '00'}`;
}

function senha(valor, obrigatoria = true) {
    if (valor === undefined && !obrigatoria) return undefined;
    if (typeof valor !== 'string' || !valor.trim()) {
        throw erroHttp(400, 'O campo senha é obrigatório.');
    }
    if (Buffer.byteLength(valor, 'utf8') > 72) {
        throw erroHttp(400, 'A senha deve ter no máximo 72 bytes.');
    }

    return valor;
}

function codigoEquipamento(valor, opcional = false) {
    if ((valor === undefined || valor === null || valor === '') && opcional) {
        return valor === null || valor === '' ? null : undefined;
    }

    const pronto = textoObrigatorio(valor, 'equipamento_codigo', 20).toUpperCase();
    if (!/^FA-\d{6,17}$/.test(pronto)) {
        throw erroHttp(400, 'O código do equipamento é inválido.');
    }

    return pronto;
}

module.exports = {
    corpo,
    camposPermitidos,
    textoObrigatorio,
    textoOpcional,
    idPositivo,
    booleano,
    booleanoConsulta,
    email,
    estado,
    data,
    hora,
    senha,
    codigoEquipamento
};
