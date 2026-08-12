/**
 * Formatação e cálculo de tempo.
 *
 * Regra da casa: o dado é guardado cru (dígitos, data ISO) e só ganha máscara na
 * hora de aparecer. Nenhuma tela escreve "instalado há 1 ano" — ela pergunta
 * aqui, e a resposta continua certa no ano que vem.
 *
 * Datas chegam como 'AAAA-MM-DD'. `new Date('2025-04-18')` seria interpretado
 * como UTC e, no fuso de São Paulo, viraria dia 17. Por isso toda conversão
 * passa por `paraData`, que monta a data no fuso local.
 */

(function () {
    const MESES = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    const SEMANA = [
        'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
        'quinta-feira', 'sexta-feira', 'sábado'
    ];

    const DIA_MS = 86400000;

    /* Acentos combinantes que o NFD separa das letras. Escrito por escape
       para o arquivo poder trafegar em qualquer codificacao sem se perder. */
    const ACENTOS = new RegExp('[\\u0300-\\u036f]', 'g');

    /* ---------- Datas ---------- */

    function paraData(iso) {
        if (!iso) return null;
        if (iso instanceof Date) return iso;

        const partes = String(iso).slice(0, 10).split('-').map(Number);
        if (partes.length !== 3 || partes.some(Number.isNaN)) return null;

        return new Date(partes[0], partes[1] - 1, partes[2]);
    }

    /** Data + hora num único instante, para comparar com agora. */
    function momento(iso, hora) {
        const data = paraData(iso);
        if (!data) return null;

        const [h, m] = String(hora || '00:00').split(':').map(Number);
        data.setHours(h || 0, m || 0, 0, 0);

        return data;
    }

    function hoje() {
        const data = new Date();
        data.setHours(0, 0, 0, 0);
        return data;
    }

    function paraISO(data) {
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${data.getFullYear()}-${mes}-${dia}`;
    }

    /** 12/08/2026 */
    function dataCurta(iso) {
        const data = paraData(iso);
        if (!data) return '—';

        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');

        return `${dia}/${mes}/${data.getFullYear()}`;
    }

    /** 12 de agosto de 2026 */
    function dataLonga(iso) {
        const data = paraData(iso);
        if (!data) return '—';

        return `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`;
    }

    /** 12 de agosto — sem o ano, quando ele já está claro no contexto. */
    function dataDia(iso) {
        const data = paraData(iso);
        if (!data) return '—';

        return `${data.getDate()} de ${MESES[data.getMonth()]}`;
    }

    /** abril de 2025 */
    function mesAno(iso) {
        const data = paraData(iso);
        if (!data) return '—';

        return `${MESES[data.getMonth()]} de ${data.getFullYear()}`;
    }

    function diaSemana(iso) {
        const data = paraData(iso);
        return data ? SEMANA[data.getDay()] : '';
    }

    /** Diferença em dias inteiros entre hoje e a data. Negativo é passado. */
    function diasAte(iso) {
        const data = paraData(iso);
        if (!data) return null;

        data.setHours(0, 0, 0, 0);
        return Math.round((data - hoje()) / DIA_MS);
    }

    /**
     * Onde a data cai na agenda. É este rótulo que agrupa e colore as visitas —
     * por isso ele é calculado num lugar só.
     *
     * Uma visita marcada para hoje às 8h, ainda "agendada" às 11h, está
     * atrasada: o dia certo não basta, o horário conta.
     */
    function faixaAgenda(iso, hora, status) {
        const dias = diasAte(iso);
        if (dias === null) return { chave: 'sem-data', rotulo: 'Sem data' };

        const aberta = status === 'agendada' || status === 'andamento';
        const instante = momento(iso, hora);

        if (aberta && instante && instante < new Date()) {
            return { chave: 'atrasada', rotulo: 'Atrasada' };
        }

        if (dias === 0) return { chave: 'hoje', rotulo: 'Hoje' };
        if (dias === 1) return { chave: 'amanha', rotulo: 'Amanhã' };
        if (dias > 1) return { chave: 'proximos', rotulo: 'Próximos dias' };

        return { chave: 'passado', rotulo: dataDia(iso) };
    }

    /** "Hoje", "Amanhã", "Ontem" ou a data — para uma linha solta. */
    function dataRelativa(iso) {
        const dias = diasAte(iso);

        if (dias === 0) return 'Hoje';
        if (dias === 1) return 'Amanhã';
        if (dias === -1) return 'Ontem';

        return dataCurta(iso);
    }

    /**
     * Tempo decorrido em anos e meses. Abaixo de um mês fala em dias, porque
     * "instalado há 0 meses" não diz nada a ninguém.
     */
    function tempoDesde(iso) {
        const data = paraData(iso);
        if (!data) return '—';

        const agora = hoje();
        if (data > agora) return 'ainda não instalado';

        let meses = (agora.getFullYear() - data.getFullYear()) * 12
            + (agora.getMonth() - data.getMonth());

        if (agora.getDate() < data.getDate()) meses -= 1;

        if (meses < 1) {
            const dias = Math.max(0, Math.round((agora - data) / DIA_MS));
            if (dias === 0) return 'hoje';
            return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
        }

        const anos = Math.floor(meses / 12);
        const resto = meses % 12;

        const parteAno = anos ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : '';
        const parteMes = resto ? `${resto} ${resto === 1 ? 'mês' : 'meses'}` : '';

        if (parteAno && parteMes) return `${parteAno} e ${parteMes}`;

        return parteAno || parteMes;
    }

    /** Minutos entre agora e o instante. Negativo é passado. */
    function minutosAte(iso, hora) {
        const instante = momento(iso, hora);
        if (!instante) return null;

        return Math.round((instante - new Date()) / 60000);
    }

    /** "em 35 minutos", "em 2 horas", "há 1 hora". */
    function tempoRelativo(iso, hora) {
        const minutos = minutosAte(iso, hora);
        if (minutos === null) return '';

        const passado = minutos < 0;
        const absoluto = Math.abs(minutos);

        let texto;

        if (absoluto < 60) {
            texto = `${absoluto} ${absoluto === 1 ? 'minuto' : 'minutos'}`;
        } else if (absoluto < 1440) {
            const horas = Math.round(absoluto / 60);
            texto = `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
        } else {
            const dias = Math.round(absoluto / 1440);
            texto = `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
        }

        return passado ? `há ${texto}` : `em ${texto}`;
    }

    function saudacao() {
        const hora = new Date().getHours();

        if (hora < 12) return 'Bom dia';
        if (hora < 18) return 'Boa tarde';

        return 'Boa noite';
    }

    /* ---------- Números e texto ---------- */

    /** 12000 → "12.000" */
    function milhar(valor) {
        return Number(valor || 0).toLocaleString('pt-BR');
    }

    /** 3 → "03". Número grande de painel fica melhor com dois dígitos. */
    function doisDigitos(valor) {
        return String(valor).padStart(2, '0');
    }

    function plural(quantidade, singular, plural) {
        return `${quantidade} ${quantidade === 1 ? singular : plural}`;
    }

    function soDigitos(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    /** Sem acento e em minúsculas: é assim que a busca compara. */
    function normalizar(valor) {
        return String(valor || '')
            .normalize('NFD')
            // Faixa dos acentos combinantes, escrita em código para não depender
            // da codificação do arquivo.
            .replace(ACENTOS, '')
            .toLowerCase()
            .trim();
    }

    function telefone(valor) {
        const digitos = soDigitos(valor);

        if (digitos.length === 11) {
            return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
        }

        if (digitos.length === 10) {
            return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
        }

        return valor || '';
    }

    function documento(valor) {
        const digitos = soDigitos(valor);

        if (digitos.length === 11) {
            return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
        }

        if (digitos.length === 14) {
            return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}`
                + `/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
        }

        return valor || '';
    }

    function cep(valor) {
        const digitos = soDigitos(valor);
        if (digitos.length !== 8) return valor || '';

        return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
    }

    /** Duas letras para o avatar do perfil. */
    function iniciais(nome) {
        const partes = String(nome || '').trim().split(/\s+/);
        if (partes.length === 0 || !partes[0]) return '?';

        const primeira = partes[0][0];
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';

        return (primeira + ultima).toUpperCase();
    }

    /** Só o primeiro nome — cabeçalho não precisa do nome completo. */
    function primeiroNome(nome) {
        return String(nome || '').trim().split(/\s+/)[0] || '';
    }

    /* ---------- Atalhos de contato ----------
       Ligar e chamar no WhatsApp são as duas ações que o técnico mais usa no
       celular. Montar o endereço num lugar só evita que uma tela esqueça o 55. */

    function linkTelefone(valor) {
        const digitos = soDigitos(valor);
        return digitos ? `tel:+55${digitos}` : '';
    }

    function linkWhatsapp(valor, texto) {
        const digitos = soDigitos(valor);
        if (!digitos) return '';

        const mensagem = texto ? `?text=${encodeURIComponent(texto)}` : '';
        return `https://wa.me/55${digitos}${mensagem}`;
    }

    /** Abre o endereço no mapa do próprio aparelho, sem integração nenhuma. */
    function linkMapa(endereco) {
        if (!endereco) return '';
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    }

    window.FrioArteFormato = {
        paraData,
        paraISO,
        momento,
        hoje,
        dataCurta,
        dataLonga,
        dataDia,
        dataRelativa,
        mesAno,
        diaSemana,
        diasAte,
        faixaAgenda,
        tempoDesde,
        minutosAte,
        tempoRelativo,
        saudacao,
        milhar,
        doisDigitos,
        plural,
        soDigitos,
        normalizar,
        telefone,
        documento,
        cep,
        iniciais,
        primeiroNome,
        linkTelefone,
        linkWhatsapp,
        linkMapa
    };
})();
