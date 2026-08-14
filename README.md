
# Frio Arte Ar Condicionado

Site institucional da Frio Arte. Monólito Node.js + Express servindo a página e a
API, com frontend em HTML, CSS e JavaScript puro — sem framework.

## Rodar

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

O servidor escuta em `0.0.0.0`, então também responde pelo IP da máquina na rede
local — é assim que o técnico abre `/sistema` no celular. Ao subir, ele imprime
os endereços de rede disponíveis. Para restringir só a esta máquina, use
`HOST=127.0.0.1` no `.env`.

Em desenvolvimento a home é remontada a cada pedido, então basta salvar o HTML e
dar F5. Em produção (`NODE_ENV=production`) ela é montada uma vez e fica em
memória.

## Estrutura

```text
frio arte/
├── server.js                       Sobe o Express: estáticos, páginas, rotas, erros
│
├── api/
│   ├── routes.js                   Registro central das rotas /api
│   ├── pages.js                    Home com SEO injetado, robots.txt, sitemap, 404
│   ├── middleware/
│   │   └── tratamentoErros.js      404 da API e handler global de erro
│   ├── shared/
│   │   ├── frioarte.dados.js       TODO o conteúdo do site (fonte única)
│   │   ├── funcionamento.js        Calcula Aberto/Fechado a partir da grade
│   │   └── seo.js                  Monta canonical, Open Graph e JSON-LD
│   └── rota_frioarte/
│       ├── rota_frioarte.js        GET /api/frioarte
│       └── frioarte.service.js     Monta o perfil, deriva links e confirma fotos
│
├── scripts/
│   └── imagens.js                  Gera os WebP e a imagem de prévia de link
│
└── public/
    ├── html/frioarte_html/
    │   ├── frioarte.html           A home
    │   └── 404.html                Página de endereço inexistente
    ├── css/
    │   ├── shared/                 variaveis.css (tokens), base.css
    │   └── frioarte_css/           frioarte.css (chrome), secoes.css (seções)
    ├── js/
    │   ├── shared/                 registro.js, dom.js, pressao.js, revelar.js,
    │   │                           progresso.js
    │   └── frioarte_js/            api.js, main.js,
    │                               chrome_* (cabeçalho, menu, navegação, barra),
    │                               global_* (identidade, links, avaliação),
    │                               secao_* (uma por cena da página),
    │                               orcamento_* (validação, mensagem)
    ├── images/frioarte_images/     Fotos do site, em JPG e WebP (ver LEIA-ME.md)
    └── midias/
        ├── frioarte-marca.png      Lockup completo — cabeçalho e rodapé
        ├── frioarte-simbolo.png    Só o floco, quadrado — favicon
        └── frioarte-og.jpg         1200×630, prévia do link (gerada pelo script)
```


## Sistema interno (`/sistema`)

Ferramenta de trabalho da equipe: clientes, equipamentos instalados e visitas
técnicas. Vive no mesmo monólito, com a mesma linguagem visual do site em escala
de aplicação.

O backend já possui persistência MySQL e APIs REST para usuários, clientes,
equipamentos e visitas. A base começa vazia — não há nenhum cadastro fictício.
Toda a interface conversa com `dados.js`, a única peça do frontend que sabe de
onde os dados vêm; por enquanto ele ainda lê os arrays de
`public/js/sistema_js/data/`. A próxima etapa troca o miolo dessas funções por
`fetch('/api/clientes')` e pelas demais rotas, sem mudar as telas.

Os arquivos em `data/` estão vazios de propósito e documentam, em comentário, o
formato de cada registro — é o contrato que a API vai precisar devolver.

```text
public/html/sistema_html/
├── layout.html          Chrome do sistema (lateral, cabeçalho, folhas) — uma vez só
├── painel.html          Miolo de cada tela; api/paginas_sistema.js compõe layout + miolo
├── clientes.html · cliente.html
├── equipamentos.html · equipamento.html
└── visitas.html

public/js/sistema_js/
├── data/*.mock.js       Clientes, equipamentos, visitas e equipe
├── formato.js           Datas, máscaras, "instalado há 1 ano e 4 meses"
├── dados.js             Camada de dados: consultas, junções, gravação (a fronteira da API)
├── interface.js         Estados, esqueleto, folhas, avisos, validação
├── cartoes.js           Visita, equipamento, cliente e histórico — usados por várias telas
├── formularios.js       Os três cadastros e o detalhe da visita
├── navegacao.js         Navegação, perfil, busca global e sino
└── painel|clientes|cliente|equipamentos|equipamento|visitas.js
```

| Rota                             | Tela                             |
| -------------------------------- | -------------------------------- |
| `/sistema`                       | Painel — agenda e pendências     |
| `/sistema/clientes`              | Lista com busca e filtros        |
| `/sistema/clientes/:id`          | Ficha do cliente                 |
| `/sistema/equipamentos`          | Lista com busca e filtros        |
| `/sistema/equipamentos/:codigo`  | Ficha da máquina (`FA-000028`)   |
| `/sistema/visitas`               | Agenda por período               |

Detalhes que valem saber:

- **Nada é escrito à mão que possa ser calculado**: tempo de instalação,
  atraso, "em 30 minutos", próxima visita e os avisos do sino saem todos das
  datas. Nenhum desses rótulos é campo do registro.
- **O que se cadastra durante a sessão** fica em `sessionStorage`, só as
  alterações — sobrevive à navegação entre telas e some ao fechar a aba. É o
  substituto temporário do banco, não um recurso do produto.
- **Base vazia é estado normal, não erro.** Toda tela tem um estado vazio que
  explica a ausência e oferece a próxima ação; o painel troca a ação principal
  para "Cadastrar cliente" enquanto não houver nenhum.
- **Sem usuário logado**, o rodapé da lateral some e o painel cumprimenta sem
  nome. O perfil volta quando existir autenticação.
- **Técnico não é obrigatório** ao agendar: marca-se a visita e define-se quem
  vai depois. Enquanto `equipe.mock.js` estiver vazio, toda visita fica "a
  definir".
- O sistema está fora do `sitemap.xml` e barrado no `robots.txt`.

## Registro ao vivo

Tudo que acontece no sistema interno sai no terminal onde o servidor está
rodando, em tempo real. **Nada é gravado** — nem em disco, nem no navegador.
Fechou o terminal, acabou o registro.

```text
18:18:50  info        http/pedido               8ms  metodo=GET rota=/sistema status=200 de=local
18:18:51  info      ~ tela/abriu                     aparelho=celular largura=390 sessao=a1b2c3
18:18:51  depuracao ~ dados/carregarClientes  124ms  filtro=todos itens=0 tela=clientes
18:18:51  info      ~ cadastro/salvou-cliente        id=1 tela=clientes
18:18:51  aviso     ~ busca/global              8ms  termo=carlos achados=0
18:18:51  erro      ~ tela/excecao                   mensagem=... arquivo=clientes.js linha=42
```

O til (`~`) marca o que veio do navegador. É o ponto principal do desenho: a
interface manda os acontecimentos dela para o servidor, então **o que o técnico
faz no celular aparece nesta janela** — no console do aparelho ninguém está
olhando.

| Peça                                  | O que faz                                        |
| ------------------------------------- | ------------------------------------------------ |
| `api/shared/diario.js`                | Formata e imprime. Nunca lança exceção            |
| `api/middleware/registroPedidos.js`   | Cada pedido HTTP: rota, status, tempo, de onde     |
| `api/rota_sistema/rota_sistema.js`    | `POST /api/sistema/registros` — recebe do navegador |
| `public/js/sistema_js/diario.js`      | Registra na tela e envia em lote a cada 1,2s      |

Detalhes que valem saber:

- **A camada de dados sai envolvida pelo diário** (`dados.js`), então toda
  consulta e toda gravação viram uma linha com duração e tamanho do resultado,
  sem uma chamada de log dentro de cada função. Quando virar `fetch`, o mesmo
  registro passa a medir a rede.
- **Arquivo estático não é registrado**, a não ser que falhe — uma tela puxa
  dezenas de CSS e JS, e imprimir todos afogaria o que interessa.
- **Dado pessoal não entra.** O que vai para a linha é identificador,
  contagem, filtro e duração; nunca o registro inteiro do cliente com telefone,
  CPF e endereço. É um log para acompanhar o sistema, e ele fica numa janela
  aberta o dia inteiro.
- **`LOG_NIVEL`** no `.env` controla o volume: `depuracao` mostra cada consulta,
  `info` mostra ação e navegação, `aviso` e `erro` mostram só problema.
- Se `diario.js` não carregar, o `<head>` deixou um diário mudo no lugar e nada
  quebra.

## Fluxo da página

```text
frioarte.html → main.js → api.js → GET /api/frioarte
                                        ↓
                              rota_frioarte.js → frioarte.service.js
                                        ↓
                                 frioarte.dados.js
                                        ↓
                                      JSON → módulos secao_* → tela
```

**Para mudar qualquer texto do site, edite `api/shared/frioarte.dados.js`.**
Nada de conteúdo solto no HTML: o HTML só tem estrutura e ganchos `data-campo` /
`data-lista` que os módulos preenchem.

Cada módulo se registra sozinho em `registro.js` e roda dentro do próprio
try/catch — um que falhe não derruba os outros.

## Seções da home

| #  | Seção                     | Fonte do conteúdo            |
| -- | ------------------------- | ---------------------------- |
| 1  | Cabeçalho                 | nav fixa no HTML             |
| 2  | Hero                      | frase no HTML + `avaliacao`  |
| 3  | Declaração                | frase no HTML                |
| 4  | Serviços                  | `servicos.lista`             |
| 5  | Públicos                  | `publicos`                   |
| 6  | Projetos                  | `projetos`                   |
| 7  | Sobre                     | `sobre` + `atendimento`      |
| 8  | Qualidade                 | `diferenciais`               |
| 9  | Depoimentos               | `avaliacoes` + `avaliacao`   |
| 10 | Marcas                    | `marcas`                     |
| 11 | Dúvidas                   | `faq`                        |
| 12 | Chamada final             | frase no HTML                |
| 13 | Contato + orçamento       | `opcoesOrcamento`, contatos  |
| 14 | Rodapé                    | `endereco`, `empresa`, `redes` |

As frases-cena (hero, declaração, sobre, chamada final) vivem no HTML de
propósito: a quebra de linha faz parte da composição, não do texto.

## Rotas

| Método | Rota            | Retorno                                   |
| ------ | --------------- | ----------------------------------------- |
| GET    | `/`             | Home, com o bloco de SEO injetado          |
| GET    | `/sistema/*`    | Sistema interno (ver seção acima)         |
| GET    | `/api/frioarte` | `{ sucesso: true, dados: { ...perfil } }` |
| GET    | `/robots.txt`   | Gerado a partir do domínio nos dados      |
| GET    | `/sitemap.xml`  | Uma entrada; `lastmod` = data do conteúdo |
| —      | qualquer outra  | `404.html`                                |

## Horário de funcionamento

A empresa declara só a grade, em `funcionamento.grade` — índice 0 é domingo,
`null` é dia fechado:

```js
grade: {
    1: { abre: '09:00', fecha: '18:00' },   // segunda
    ...
    6: null                                 // sábado fechado
}
```

`api/shared/funcionamento.js` calcula o resto no relógio de São Paulo (não no do
servidor): `situacao`, `aberto`, o `detalhe` que a tela mostra ("Fecha às 18:00",
"Abre seg. às 09:00") e o `horarios` no formato schema.org.

Para mudar o horário, mexa só na grade.

## SEO

`api/shared/seo.js` monta canonical, Open Graph, Twitter Card e o JSON-LD
`HVACBusiness` a partir dos dados, e `pages.js` injeta tudo no lugar do
marcador `<!-- SEO -->` da home. É feito no servidor porque quem lê essas tags —
robô de busca, prévia de link do WhatsApp — em geral não executa JavaScript.

Nunca escreva endereço, telefone ou horário direto no `<head>`: mude o dado e a
cabeça acompanha.

**A nota do Google não é declarada como `aggregateRating` de propósito.** A
empresa marcar a própria nota é avaliação de si mesmo na política do Google:
não gera estrela na busca e pode render aviso no Search Console. A nota
continua visível na página; ela só não vira dado estruturado.

## Imagens

```bash
npm run imagens
```

Gera o `.webp` de cada JPG de `public/images/frioarte_images/` e recorta a
prévia de link em `public/midias/frioarte-og.jpg`. É script de manutenção: roda
quando chega foto nova e o resultado é commitado — o servidor em produção não
depende do `sharp`.

O service confirma cada arquivo em disco antes de publicá-lo, e entrega o par
`imagem` (JPG) + `imagemWebp`. O helper `figura()` em `dom.js` monta o
`<picture>`: WebP para quem lê, JPG para o resto. Foto cuja conversão ainda não
rodou sai como `<img>` puro, sem quebrar nada.

Os originais pesados ficam **fora** do repositório (`_bruto/` está no
`.gitignore`).

## Formulário de orçamento

O formulário **não envia nada para o servidor e não armazena dado nenhum**. Ele
monta uma mensagem organizada (nome, serviço, bairro, detalhes) e abre o WhatsApp
da empresa com o texto já escrito, para o pedido chegar onde a Frio Arte atende.

Se um dia for preciso guardar os pedidos, o caminho é criar `api/rota_orcamentos/`
com repository e uma tabela — a estrutura do projeto já comporta.

## Pendências

- **Integração do frontend e autenticação.** O banco e o CRUD da API já estão
  prontos; `dados.js` ainda usa a simulação de sessão e a tela de login ainda
  não cria uma sessão autenticada.

- **Fotografia.** Todas as imagens do site são geradas por IA, usadas como
  referência de ambiente com o aval da empresa. Os itens de `projetos` carregam
  `gerada: true`. Ao substituir por foto real de um trabalho executado, apague a
  marca — é ela que separa ilustração de portfólio.
- **Textos dos serviços e do Sobre.** Foram redigidos para o site e ainda
  esperam revisão da empresa.
- **Histórico do Git.** As imagens brutas saíram de `public/`, mas continuam no
  histórico do commit `c7b9ae3` (~99 MB). Todo clone ainda baixa esse peso;
  limpar exige reescrever o histórico.
