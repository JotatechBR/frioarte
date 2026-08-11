/**
 * Conteúdo institucional da Frio Arte Ar Condicionado.
 *
 * Fonte única de verdade dos DADOS do site: o backend entrega tudo em
 * GET /api/frioarte e o frontend apenas renderiza.
 *
 * O que mora aqui: contato, endereço, funcionamento, serviços, públicos
 * atendidos, portfólio, diferenciais, marcas, avaliações e dúvidas.
 *
 * O que NÃO mora aqui: as frases-cena da home (hero, declaração, sobre,
 * chamada final). Elas têm quebra de linha proposital — a quebra faz parte da
 * composição, não do texto — e por isso vivem marcadas no próprio HTML, em
 * public/html/frioarte_html/frioarte.html. Manter uma frase de oito palavras
 * aqui só para reinjetá-la por JavaScript atrasaria o maior texto da tela sem
 * ganho nenhum.
 *
 * Regra do projeto: nada de número, prazo, certificação ou depoimento que a
 * empresa não tenha confirmado. Onde falta informação, o campo fica `null` e a
 * cena correspondente se ajusta sozinha.
 */

/** Pasta única das fotos, para o caminho não se repetir vinte vezes. */
const FOTOS = '/images/frioarte_images';

const FRIOARTE = {
    nome: 'Frio Arte Ar Condicionado',
    nomeCurto: 'Frio Arte',

    /* Telefone e WhatsApp são linhas diferentes: um não deriva do outro. */
    telefone: {
        formatado: '(11) 95229-5391',
        discagem: '+5511952295391'
    },

    whatsapp: {
        formatado: '(11) 97247-3317',
        numero: '5511972473317'
    },

    endereco: {
        linha1: 'Rua São Florêncio, 76',
        linha2: 'Penha, São Paulo - SP',
        cep: '03615-000',
        completo: 'Rua São Florêncio, 76 - Penha, São Paulo - SP, 03615-000'
    },

    atendimento: {
        resumo: 'São Paulo capital',
        detalhe: 'Penha, Vila Salete e região',
        publico: 'Residências, comércios e empresas'
    },

    /** Sem perfil confirmado: enquanto for `null`, o link não aparece no rodapé. */
    redes: {
        instagram: null
    },

    avaliacao: {
        nota: 4.2,
        total: 12,
        fonte: 'Google'
    },

    funcionamento: {
        situacao: 'Fechado',
        proximaAbertura: 'Abre seg. às 07:00',
        aviso: 'Feriados podem afetar o horário de funcionamento'
    },

    /**
     * Serviços. `imagem` alimenta a foto fixa da cena: ela troca conforme o
     * serviço em foco. Nem todo item precisa de foto — sem `imagem`, a cena
     * mantém a última em cena, que é o comportamento certo para variações do
     * mesmo trabalho (preventiva e corretiva, por exemplo).
     */
    servicos: {
        categoria: 'Climatização',
        lista: [
            {
                id: 'instalacao',
                titulo: 'Instalação',
                resumo:
                    'Split, multi split e cassete instalados com infraestrutura planejada e acabamento alinhado ao ambiente.',
                imagem: `${FOTOS}/servico-instalacao.jpg`,
                alt: 'Evaporadora split branca instalada nivelada em parede clara de sala de estar, ao lado de janela ampla'
            },
            {
                id: 'manutencao-preventiva',
                titulo: 'Manutenção preventiva',
                resumo:
                    'Revisão periódica para o aparelho gelar como no primeiro dia e durar mais — antes de o problema aparecer.',
                imagem: `${FOTOS}/servico-manutencao.jpg`,
                alt: 'Três condensadoras alinhadas na mesma altura em muro de concreto claro, com tubulação organizada'
            },
            {
                id: 'manutencao-corretiva',
                titulo: 'Manutenção corretiva',
                resumo:
                    'Diagnóstico e reparo de falha, ruído, vazamento e queda de desempenho, com orçamento antes do serviço.',
                imagem: null,
                alt: null
            },
            {
                id: 'higienizacao',
                titulo: 'Higienização',
                resumo:
                    'Limpeza profunda de evaporadora, condensadora, filtros e bandeja. Ar limpo, sem odor e sem mofo.',
                imagem: `${FOTOS}/servico-higienizacao.jpg`,
                alt: 'Detalhe da grelha e das aletas de uma evaporadora aberta após limpeza'
            },
            {
                id: 'venda',
                titulo: 'Venda de equipamentos',
                resumo:
                    'Aparelhos novos e seminovos, com orientação de capacidade e modelo conforme o seu ambiente.',
                imagem: `${FOTOS}/servico-equipamento.jpg`,
                alt: 'Evaporadora split moderna em parede de concreto claro'
            },
            {
                id: 'carga-gas',
                titulo: 'Carga de gás',
                resumo:
                    'Verificação de vazamento, recarga e teste de estanqueidade para o sistema voltar à pressão correta.',
                imagem: null,
                alt: null
            },
            {
                id: 'desinstalacao',
                titulo: 'Desinstalação',
                resumo:
                    'Retirada segura do equipamento, com recolhimento de gás e fechamento adequado dos pontos.',
                imagem: null,
                alt: null
            }
        ]
    },

    /** Cena 04: os dois públicos, um ao lado do outro, em fotos grandes. */
    publicos: [
        {
            id: 'residencial',
            rotulo: 'Residencial',
            frase: 'Conforto todos os dias.',
            apoio: 'Salas, quartos e apartamentos — instalação silenciosa, alinhada e discreta no ambiente.',
            imagem: `${FOTOS}/publico-residencial.jpg`,
            alt: 'Sala de estar contemporânea com luz natural e split integrado à parede'
        },
        {
            id: 'comercial',
            rotulo: 'Comercial',
            frase: 'Climatização preparada para sua operação.',
            apoio: 'Lojas, escritórios e salas comerciais — equipamento dimensionado para o uso real do espaço.',
            imagem: `${FOTOS}/publico-comercial.jpg`,
            alt: 'Escritório amplo de arquitetura moderna com climatização integrada ao forro'
        }
    ],

    diferenciais: [
        { id: 'rapidez', titulo: 'Atendimento rápido', resumo: 'Retorno ágil e visita agendada sem enrolação.' },
        { id: 'equipe', titulo: 'Equipe qualificada', resumo: 'Serviço executado por profissionais da área.' },
        { id: 'acabamento', titulo: 'Acabamento profissional', resumo: 'Instalação limpa, alinhada e bem finalizada.' },
        { id: 'especializacao', titulo: 'Higienização especializada', resumo: 'Limpeza técnica completa, não só o filtro.' },
        { id: 'confianca', titulo: 'Qualidade e compromisso', resumo: 'Orçamento honesto e combinado cumprido.' },
        { id: 'publico', titulo: 'Residencial e comercial', resumo: 'Do apartamento à loja, sala e escritório.' }
    ],

    /**
     * Cena 05 — galeria de ambientes.
     *
     * `formato` é decisão de composição, não de conteúdo: define o tamanho e a
     * posição da peça na grade assimétrica. Valores possíveis:
     * `grande`, `alta`, `media`, `larga`, `retrato` — nesta ordem eles formam
     * a diagonal desenhada em secoes.css. Cinco peças é o número certo; a
     * sexta faria a grade voltar a parecer feed.
     *
     * `gerada: true` marca a foto de referência de ambiente, usada enquanto a
     * empresa não entrega a foto real do serviço. Ao substituir por uma foto
     * real, apague a marca — é ela que separa ilustração de portfólio.
     */
    projetos: [
        {
            id: 'projeto-1',
            titulo: 'Sala de estar',
            legenda: 'Split hi-wall em residência',
            formato: 'grande',
            imagem: `${FOTOS}/ambiente-sala.jpg`,
            alt: 'Sala de estar de pé-direito duplo com porta de vidro para o jardim e evaporadora discreta no alto da parede',
            gerada: true
        },
        {
            id: 'projeto-2',
            titulo: 'Infraestrutura',
            legenda: 'Tubulação embutida',
            formato: 'alta',
            imagem: `${FOTOS}/ambiente-infraestrutura.jpg`,
            alt: 'Detalhe de parede clara com acabamento de tubulação embutida e recorte alinhado',
            gerada: true
        },
        {
            id: 'projeto-3',
            titulo: 'Dormitório',
            legenda: 'Conforto para dormir',
            formato: 'media',
            imagem: `${FOTOS}/ambiente-dormitorio.jpg`,
            alt: 'Quarto de tons claros com luz de fim de tarde e split acima da cabeceira',
            gerada: true
        },
        {
            id: 'projeto-4',
            titulo: 'Área externa',
            legenda: 'Condensadoras alinhadas',
            formato: 'larga',
            imagem: `${FOTOS}/ambiente-externo.jpg`,
            alt: 'Três condensadoras alinhadas em muro de concreto aparente, vistas em perspectiva sob luz de fim de tarde',
            gerada: true
        },
        {
            id: 'projeto-5',
            titulo: 'Escritório',
            legenda: 'Climatização de sala comercial',
            formato: 'retrato',
            imagem: `${FOTOS}/ambiente-escritorio.jpg`,
            alt: 'Sala comercial com mesa de reunião e difusor de ar embutido no forro',
            gerada: true
        }
    ],

    sobre: {
        paragrafos: [
            'A Frio Arte é especializada em soluções de climatização para residências, comércios e empresas de São Paulo. Trabalhamos com instalação, manutenção, higienização e venda de equipamentos.',
            'O que muda de uma empresa para outra é quem instala, como termina o acabamento e se o combinado é cumprido. É exatamente aí que a gente trabalha.'
        ]
    },

    /** Marcas com que a empresa trabalha — exibidas como texto, não como logotipo. */
    marcas: ['LG', 'Samsung', 'Midea', 'Gree'],

    avaliacoes: [
        { texto: 'Super recomendo melhores atendimentos , serviço de qualidade', fonte: 'Avaliação no Google' },
        { texto: 'Recomendamos a loja Frio Arte com certeza', fonte: 'Avaliação no Google' }
    ],

    faq: [
        {
            id: 'instalacao',
            pergunta: 'Vocês fazem instalação?',
            resposta:
                'Sim. Instalamos split, multi split e cassete, cuidando da infraestrutura e do acabamento para o aparelho ficar bem integrado ao ambiente.'
        },
        {
            id: 'manutencao',
            pergunta: 'Fazem manutenção?',
            resposta:
                'Sim, preventiva e corretiva. A preventiva mantém o desempenho e prolonga a vida do equipamento; a corretiva resolve falha, ruído, vazamento e perda de refrigeração.'
        },
        {
            id: 'higienizacao',
            pergunta: 'Trabalham com higienização?',
            resposta:
                'Sim. É uma limpeza técnica completa de evaporadora, condensadora, filtros e bandeja — bem além da limpeza de filtro feita em casa.'
        },
        {
            id: 'venda',
            pergunta: 'Vendem aparelhos?',
            resposta:
                'Sim, novos e seminovos. Antes da compra orientamos sobre a capacidade e o modelo mais adequados ao tamanho e ao uso do seu ambiente.'
        },
        {
            id: 'atendimento',
            pergunta: 'Atendem São Paulo?',
            resposta:
                'Atendemos São Paulo capital, com base na Penha e forte presença na Vila Salete e região. Fale com a gente pelo WhatsApp para confirmar seu bairro.'
        }
    ],

    /** Opções do formulário de orçamento — os mesmos serviços, na ordem da cena. */
    get opcoesOrcamento() {
        return this.servicos.lista.map((servico) => servico.titulo);
    }
};

module.exports = FRIOARTE;
