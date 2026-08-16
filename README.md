
# Frio Arte Ar Condicionado

Site institucional da Frio Arte. Monólito Node.js + Express servindo a página e a
API, com frontend em HTML, CSS e JavaScript puro — sem framework.

## Rodar

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

O sistema interno precisa de um usuário para entrar, e a tabela `usuarios` nasce
vazia. O primeiro usuário se cria fora do navegador — a tela que cadastra
usuários fica atrás do login, então sem esta porta o sistema tranca a chave do
lado de dentro. Crie-o como **Administrador**: é a função que libera
`/sistema/usuarios`, de onde saem todos os outros.

```bash
npm run usuario -- criar <usuario> <senha> "<nome>" "Administrador"
npm run usuario -- listar
npm run usuario -- funcao <usuario> <funcao>   # promove ou rebaixa
npm run usuario -- senha <usuario> <nova-senha>
npm run usuario -- ativar|desativar <usuario>
```

Do segundo usuário em diante o caminho normal é a tela, não o terminal — a senha
digitada no comando fica no histórico do shell. O `funcao` existe como válvula de
escape: se a última conta de administrador for rebaixada por engano, ninguém
promove ninguém pelo navegador, e é este comando que destrava.

O servidor escuta em `0.0.0.0`, então também responde pelo IP da máquina na rede
local — é assim que o técnico abre `/sistema` no celular. Ao subir, ele imprime
os endereços de rede disponíveis. Para restringir só a esta máquina, use
`HOST=127.0.0.1` no `.env`.

Em desenvolvimento a home é remontada a cada pedido, então basta salvar o HTML e
dar F5. Em produção (`NODE_ENV=production`) ela é montada uma vez e fica em
memória.

## Deploy na Vercel

A Vercel não roda `npm start`: ela procura *funções*. Sem `vercel.json` e sem uma
pasta `api/`, ela não encontra nenhuma, trata o repositório como site estático,
não acha um `index.html` na raiz e devolve `404: NOT_FOUND` — o `server.js` nunca
chega a ser executado.

`vercel.json` resolve isso declarando o monólito como **uma função só**:

```json
"builds": [{ "src": "server.js", "use": "@vercel/node",
             "config": { "includeFiles": ["public/**", "backend/**"] } }],
"routes": [{ "src": "/(.*)", "dest": "server.js" }]
```

Três detalhes que não são decoração:

- **Uma build, uma função.** Foi por isso que a pasta saiu de `api/` para
  `backend/`: qualquer arquivo dentro de `api/` vira uma Serverless Function
  separada no modo automático, e o Express deixava de ser um app só.
- **`includeFiles`.** O empacotador segue `require`, mas não enxerga
  `fs.readFileSync(path.join(HTML, 'layout.html'))`. Sem esta linha, as páginas
  do sistema e o `statSync` do sitemap quebram em produção com o arquivo ausente.
- **A rota `/(.*)` pega tudo**, inclusive `public/`. Quem serve estático continua
  sendo o `express.static` do `server.js`, igual ao local — um caminho só, sem
  regra de reescrita para sair de sincronia.

O `server.js` atende os dois mundos porque exporta o app e só escuta quando é
executado direto:

```js
if (require.main === module) iniciar();   // local: conecta ao banco e escuta
module.exports = app;                      // Vercel: importa e chama como handler
```

**O banco precisa ser acessível pela internet.** `backend/db.js` lê `DB_HOST`,
`DB_PORT`, `DB_USER` e `DB_PASSWORD` no momento do `require` e lança se faltar
alguma — então elas têm que estar nas *Environment Variables* do projeto na
Vercel, apontando para um MySQL público. Um endereço de rede local não é
alcançável de lá. Vale o mesmo para `SESSAO_SEGREDO`: sem ele cada arranque a
frio sorteia um segredo novo e derruba quem estava logado. Com HTTPS, ligue
`SESSAO_SEGURA=true`.

## Estrutura

```text
frio arte/
├── server.js                       Sobe o Express: estáticos, páginas, rotas, erros
│
├── backend/                        Todo o código de servidor
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
├── painel.html          Miolo de cada tela; backend/paginas_sistema.js compõe layout + miolo
├── clientes.html · cliente.html
├── equipamentos.html · equipamento.html
├── visitas.html
└── usuarios.html       Administração da equipe (restrita)

public/js/sistema_js/
├── formato.js           Datas, máscaras, "instalado há 1 ano e 4 meses"
├── dados.js             Camada de dados: fala com /api, traduz nomes, cruza as listas
├── interface.js         Estados, esqueleto, folhas, avisos, validação
├── cartoes.js           Visita, equipamento, cliente, usuário e histórico — usados por várias telas
├── formularios.js       Os cadastros, a confirmação e o detalhe da visita
├── navegacao.js         Navegação, perfil, busca global e sino
└── painel|clientes|cliente|equipamentos|equipamento|visitas|usuarios.js
```

| Rota                             | Tela                             |
| -------------------------------- | -------------------------------- |
| `/sistema`                       | Painel — agenda e pendências     |
| `/sistema/clientes`              | Lista com busca e filtros        |
| `/sistema/clientes/:id`          | Ficha do cliente                 |
| `/sistema/equipamentos`          | Lista com busca e filtros        |
| `/sistema/equipamentos/:codigo`  | Ficha da máquina (`FA-000028`)   |
| `/sistema/visitas`               | Agenda por período               |
| `/sistema/usuarios`              | Equipe e acesso — **só administradores** |

### Quem administra

Não há coluna de papel na tabela: quem manda é quem tem função de administrador
(`Administrador`, `Dono`, `Diretor`, `Gestor` e variantes — a lista está em
`backend/middleware/exigirAdministrador.js`, comparada sem acento e sem caixa).

A regra vale em três camadas, e as três são independentes de propósito:

| Camada                                   | O que faz                                                |
| ---------------------------------------- | -------------------------------------------------------- |
| `backend/paginas_sistema.js`             | Desvia para `/sistema` quem digitar a rota sem ser admin  |
| `backend/rota_usuarios/rota_usuarios.js` | 403 em criar, editar, ativar e excluir                    |
| `data-admin` no `<body>` + CSS           | O menu "Administração" não chega ao navegador dos outros  |

`GET /api/usuarios` continua aberto a qualquer sessão: é ele que preenche o
campo "Técnico" do agendamento de visita, e fechá-lo quebraria a agenda de todo
mundo para esconder um nome que já aparece no cartão da visita ao lado.

Duas ações são recusadas até para administradores: **desativar e excluir a
própria conta**. As duas derrubam a sessão no pedido seguinte e deixam a pessoa
no login sem caminho de volta — se for mesmo o caso, outro administrador faz, ou
o `npm run usuario` faz do lado de fora.

Desativar e excluir também não são a mesma coisa: desativar fecha a porta e
guarda o histórico (o nome do técnico continua nas visitas dele); excluir só
funciona para quem nunca apareceu em visita nenhuma, porque a chave estrangeira
recusa o resto — e o servidor traduz essa recusa em português.

Detalhes que valem saber:

- **Nada é escrito à mão que possa ser calculado**: tempo de instalação,
  atraso, "em 30 minutos", próxima visita e os avisos do sino saem todos das
  datas. Nenhum desses rótulos é campo do registro.
- **Tudo que se cadastra vai para o MySQL.** `dados.js` é a única parte do
  frontend que conhece a rede: as telas pedem `carregarClientes()` e recebem o
  objeto pronto, sem saber que houve um `fetch`. Ele também é a fronteira entre
  os dois vocabulários — o banco fala `cliente_id` e `data_instalacao`, as telas
  falam `clienteId` e `dataInstalacao`, e a tradução acontece só ali.
- **O código `FA-000000` nasce no servidor**, sob trava de banco: dois cadastros
  simultâneos não podem receber a mesma etiqueta.
- **Base vazia é estado normal, não erro.** Toda tela tem um estado vazio que
  explica a ausência e oferece a próxima ação; o painel troca a ação principal
  para "Cadastrar cliente" enquanto não houver nenhum.
- **Técnico não é obrigatório** ao agendar: marca-se a visita e define-se quem
  vai depois. Enquanto não houver usuário ativo cadastrado, toda visita fica "a
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

| Peça                                    | O que faz                                           |
| --------------------------------------- | --------------------------------------------------- |
| `backend/shared/diario.js`              | Formata e imprime. Nunca lança exceção              |
| `backend/middleware/registroPedidos.js` | Cada pedido HTTP: rota, status, tempo, de onde       |
| `backend/rota_sistema/rota_sistema.js`  | `POST /api/sistema/registros` — recebe do navegador  |
| `public/js/sistema_js/diario.js`        | Registra na tela e envia em lote a cada 1,2s        |

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

**Para mudar qualquer texto do site, edite `backend/shared/frioarte.dados.js`.**
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

Públicas:

| Método | Rota            | Retorno                                   |
| ------ | --------------- | ----------------------------------------- |
| GET    | `/`             | Home, com o bloco de SEO injetado          |
| GET    | `/login`        | Tela de acesso (desvia para `/sistema` se já entrou) |
| GET    | `/api/frioarte` | `{ sucesso: true, dados: { ...perfil } }` |
| POST   | `/api/acesso/login` | Confere a senha e devolve o cookie de sessão |
| GET    | `/robots.txt`   | Gerado a partir do domínio nos dados      |
| GET    | `/sitemap.xml`  | Uma entrada; `lastmod` = data do conteúdo |
| —      | qualquer outra  | `404.html`                                |

Atrás da sessão — sem cookie válido, a API responde 401 e a página desvia para
`/login?destino=…`:

| Método            | Rota                        | Retorno                        |
| ----------------- | --------------------------- | ------------------------------ |
| GET               | `/sistema/*`                | Sistema interno (ver seção acima) |
| GET               | `/api/acesso/eu`            | Quem está com a sessão aberta  |
| POST              | `/api/acesso/sair`          | Encerra a sessão               |
| GET/POST/PUT/DEL  | `/api/clientes`             | CRUD de clientes               |
| GET/POST/PUT/DEL  | `/api/equipamentos`         | CRUD de equipamentos           |
| GET/POST/PUT/DEL  | `/api/visitas`              | CRUD de visitas                |
| GET               | `/api/usuarios`             | Lista da equipe (preenche o campo "Técnico") |
| POST              | `/api/sistema/registros`    | Diário vindo do navegador      |

Atrás da sessão **e** da função de administrador — as demais respondem 403:

| Método       | Rota                        | Retorno                              |
| ------------ | --------------------------- | ------------------------------------ |
| GET          | `/sistema/usuarios`         | Tela de administração da equipe      |
| POST         | `/api/usuarios`             | Cria usuário                         |
| GET/PUT/DEL  | `/api/usuarios/:id`         | Lê, edita e exclui                   |
| PATCH        | `/api/usuarios/:id/status`  | Dá ou tira o acesso                  |

## Acesso

A sessão é um **cookie assinado** (`HttpOnly`, `SameSite=Lax`), e não um registro
em tabela: o que precisa ser lembrado entre um pedido e outro é só *quem* está do
outro lado. O cookie carrega o id do usuário e a hora de vencer — nome, função e
situação são lidos do banco a cada pedido, porque mudam enquanto a sessão está
aberta. Um usuário desativado às 14h perde o acesso às 14h, não quando o cookie
vencer.

A senha tem piso de **8 caracteres** e teto de 72 bytes, nos dois caminhos que a
gravam (a tela e o `npm run usuario`). O teto não é escolha: o bcrypt descarta em
silêncio tudo que passa disso, e senha truncada sem aviso é pior que senha
recusada.

A senha é guardada como hash **bcrypt** (custo 12) e nunca sai da tabela.
Usuário inexistente, senha errada e conta desativada devolvem a mesma frase —
"Usuário ou senha inválidos" — e levam o mesmo tempo para responder: distinguir
os casos, no texto ou no relógio, entregaria a lista de quem tem conta. Oito
tentativas erradas em 15 minutos, por usuário e origem, param em 429.

No `.env`:

- `SESSAO_SEGREDO` — assina o cookie, mínimo 32 caracteres. Ausente, o processo
  sorteia um a cada início: funciona, mas toda reinicialização desloga quem
  estava usando. Trocá-lo é como se encerram todas as sessões de uma vez.
- `SESSAO_HORAS` — duração da sessão. Ausente = 12, um turno de trabalho.
- `SESSAO_SEGURA` — só ligar atrás de HTTPS. Um cookie `Secure` não é enviado
  por HTTP, e o login passaria a falhar sem mensagem de erro.

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

`backend/shared/funcionamento.js` calcula o resto no relógio de São Paulo (não no do
servidor): `situacao`, `aberto`, o `detalhe` que a tela mostra ("Fecha às 18:00",
"Abre seg. às 09:00") e o `horarios` no formato schema.org.

Para mudar o horário, mexa só na grade.

## SEO

`backend/shared/seo.js` monta canonical, Open Graph, Twitter Card e o JSON-LD
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

Se um dia for preciso guardar os pedidos, o caminho é criar `backend/rota_orcamentos/`
com repository e uma tabela — a estrutura do projeto já comporta.

## Pendências

- **Fotografia.** Todas as imagens do site são geradas por IA, usadas como
  referência de ambiente com o aval da empresa. Os itens de `projetos` carregam
  `gerada: true`. Ao substituir por foto real de um trabalho executado, apague a
  marca — é ela que separa ilustração de portfólio.
- **Textos dos serviços e do Sobre.** Foram redigidos para o site e ainda
  esperam revisão da empresa.
- **Histórico do Git.** As imagens brutas saíram de `public/`, mas continuam no
  histórico do commit `c7b9ae3` (~99 MB). Todo clone ainda baixa esse peso;
  limpar exige reescrever o histórico.
