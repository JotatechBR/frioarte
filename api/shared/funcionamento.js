/**
 * Aberto ou fechado, calculado.
 *
 * A empresa declara a grade uma vez em `frioarte.dados.js`; tudo que a tela
 * mostra — o estado, a bolinha e a frase "Abre seg. às 09:00" — sai daqui.
 * Antes isso era um par de strings editado à mão, o que significa que o site
 * dizia "Fechado" numa terça às dez da manhã até alguém lembrar de trocar.
 *
 * O relógio é sempre o de São Paulo, não o do servidor: a empresa abre às 09:00
 * no horário dela, e um deploy em outro fuso não pode mudar isso.
 */

const DIAS_CURTOS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

/** Ordem que o Intl devolve em inglês, para virar índice 0–6. */
const INDICE_POR_DIA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Devolve o funcionamento pronto para a tela.
 *
 * `agora` é injetável para o cálculo ser testável sem esperar a terça-feira.
 */
function calcular(funcionamento, agora = new Date()) {
    const { grade, fusoHorario } = funcionamento;

    const { dia, minutos } = momentoLocal(agora, fusoHorario);
    const hoje = grade[dia];

    const aberto =
        Boolean(hoje) &&
        minutos >= emMinutos(hoje.abre) &&
        minutos < emMinutos(hoje.fecha);

    return {
        ...funcionamento,
        aberto,
        situacao: aberto ? 'Aberto' : 'Fechado',
        detalhe: aberto
            ? `Fecha às ${hoje.fecha}`
            : proximaAbertura(grade, dia, minutos),

        // Formato schema.org, para os dados estruturados da home.
        horarios: emSchemaOrg(grade)
    };
}

/**
 * Que horas são em São Paulo, independentemente de onde o servidor esteja.
 *
 * `formatToParts` é o caminho honesto: pedir ao Intl o dia e a hora naquele
 * fuso, em vez de somar offset na mão e errar no horário de verão.
 */
function momentoLocal(agora, fusoHorario) {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: fusoHorario,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(agora);

    const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;

    // "24" aparece à meia-noite em algumas implementações de hour12: false.
    const hora = Number(valor('hour')) % 24;

    return {
        dia: INDICE_POR_DIA[valor('weekday')],
        minutos: hora * 60 + Number(valor('minute'))
    };
}

/**
 * A próxima porta aberta, procurando a partir de hoje.
 *
 * Sete voltas cobrem a semana inteira: se nenhuma encontrar horário, a grade
 * está fechada todos os dias e não há frase honesta a dizer — devolve o aviso
 * genérico em vez de inventar um dia.
 */
function proximaAbertura(grade, diaAtual, minutos) {
    for (let adiante = 0; adiante < 7; adiante += 1) {
        const dia = (diaAtual + adiante) % 7;
        const faixa = grade[dia];

        if (!faixa) continue;

        // Hoje só conta se a abertura ainda está por vir.
        if (adiante === 0 && minutos >= emMinutos(faixa.abre)) continue;

        return `${quando(adiante, dia)} às ${faixa.abre}`;
    }

    return 'Consulte pelo WhatsApp';
}

function quando(adiante, dia) {
    if (adiante === 0) return 'Abre hoje';
    if (adiante === 1) return 'Abre amanhã';

    return `Abre ${DIAS_CURTOS[dia]}`;
}

function emMinutos(relogio) {
    const [hora, minuto] = relogio.split(':').map(Number);
    return hora * 60 + minuto;
}

/**
 * A grade no vocabulário do schema.org (`Mo 09:00-18:00`), agrupando dias
 * seguidos com o mesmo horário — é assim que o Google espera ler.
 */
const SIGLAS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function emSchemaOrg(grade) {
    const faixas = [];

    // Segunda a domingo: a semana do schema.org não começa no domingo.
    const ordem = [1, 2, 3, 4, 5, 6, 0];

    ordem.forEach((dia) => {
        const faixa = grade[dia];
        if (!faixa) return;

        const horario = `${faixa.abre}-${faixa.fecha}`;
        const ultima = faixas[faixas.length - 1];

        // Dia seguido com o mesmo horário estende o bloco em vez de abrir outro.
        if (ultima && ultima.horario === horario && ultima.fim === anterior(dia, ordem)) {
            ultima.fim = dia;
            return;
        }

        faixas.push({ inicio: dia, fim: dia, horario });
    });

    return faixas.map(({ inicio, fim, horario }) =>
        inicio === fim
            ? `${SIGLAS[inicio]} ${horario}`
            : `${SIGLAS[inicio]}-${SIGLAS[fim]} ${horario}`
    );
}

/** O dia imediatamente anterior a `dia` dentro da ordem usada. */
function anterior(dia, ordem) {
    const posicao = ordem.indexOf(dia);
    return posicao > 0 ? ordem[posicao - 1] : null;
}

module.exports = { calcular };
