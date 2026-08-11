---
name: arquitetura-e-organizao
description: 'Esta skill define um padrão arquitetural para criação e evolução de aplicações web monolíticas utilizando:'
---

# Skill — Arquitetura Monolítica Node.js + Express + HTML/CSS/JavaScript

## Objetivo

Esta skill define um padrão arquitetural para criação e evolução de aplicações web monolíticas utilizando:

* Node.js
* Express
* MySQL
* HTML
* CSS
* JavaScript puro
* Socket.IO quando necessário

Use esta arquitetura como padrão ao criar novos projetos administrativos, sistemas internos, CRMs, ERPs, dashboards, sistemas de atendimento, painéis corporativos e aplicações web semelhantes.

O objetivo é manter o projeto:

* Organizado.
* Modular.
* Fácil de navegar.
* Fácil de manter.
* Sem complexidade desnecessária.
* Com frontend e backend claramente relacionados.
* Preparado para crescer sem exigir frameworks frontend.

---

# 1. Filosofia da arquitetura

A aplicação deve ser um monólito modular.

Backend e frontend ficam no mesmo repositório e são executados pelo mesmo servidor Node.js.

O fluxo padrão deve ser:

```text
Navegador
    ↓
HTML
    ↓
JavaScript
    ↓
HTTP / fetch
    ↓
Express
    ↓
Service / regra de negócio
    ↓
Repository / banco
    ↓
MySQL
    ↓
JSON
    ↓
JavaScript
    ↓
Interface
```

Quando existir necessidade de comunicação em tempo real:

```text
Frontend
    ↕
Socket.IO
    ↕
Backend
```

O projeto deve priorizar simplicidade.

Não adicionar React, Vue, Angular, Next.js, TypeScript ou outros frameworks apenas por conveniência.

Essas tecnologias somente devem ser adicionadas quando houver justificativa arquitetural real.

---

# 2. Estrutura base do projeto

Todo novo projeto deve preferencialmente iniciar com:

```text
projeto/
├── server.js
├── package.json
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── api/
│   ├── auth/
│   ├── database/
│   ├── middleware/
│   ├── shared/
│   └── rota_<funcionalidade>/
│
├── public/
│   ├── html/
│   ├── js/
│   ├── css/
│   ├── images/
│   ├── midias/
│   └── uploads/
│
├── uploads/
├── scripts/
├── logs/
└── docs/
```

Cada pasta possui uma responsabilidade clara.

---

# 3. Regra principal de organização

A organização deve ser baseada principalmente em **funcionalidades**.

Se o sistema possui:

```text
clientes
financeiro
patrimonio
chamados
dashboard
usuarios
```

essas funcionalidades devem aparecer de maneira equivalente no frontend e backend.

Exemplo:

```text
public/html/clientes_html/
public/js/clientes_js/
public/css/clientes_css/
public/images/clientes_images/

api/rota_clientes/
```

Isso cria uma relação visual clara entre as partes do sistema.

Ao procurar uma funcionalidade chamada `clientes`, deve ser possível encontrá-la rapidamente utilizando o mesmo nome.

---

# 4. Estrutura de uma funcionalidade

Uma funcionalidade simples pode usar:

```text
api/rota_clientes/
├── rota_clientes.js
└── queries_clientes.js
```

Uma funcionalidade maior deve evoluir para:

```text
api/rota_clientes/
├── routes/
│   └── clientes.routes.js
│
├── controllers/
│   └── clientes.controller.js
│
├── services/
│   └── clientes.service.js
│
├── repositories/
│   └── clientes.repository.js
│
├── validators/
│   └── clientes.validator.js
│
├── sockets/
│   └── clientes.socket.js
│
└── index.js
```

Não é obrigatório criar todas essas camadas para funcionalidades pequenas.

A arquitetura deve crescer de acordo com a complexidade.

---

# 5. Responsabilidade das camadas

## Routes

Responsável apenas por definir endpoints.

Exemplo:

```js
router.get('/clientes', controller.listar);
router.get('/clientes/:id', controller.buscar);
router.post('/clientes', controller.criar);
router.put('/clientes/:id', controller.atualizar);
router.delete('/clientes/:id', controller.excluir);
```

Evitar colocar regras complexas diretamente nas rotas.

---

# 6. Controllers

Controllers recebem:

```text
req
res
next
```

Sua responsabilidade é:

1. Ler parâmetros.
2. Ler body.
3. Ler usuário autenticado.
4. Chamar o service.
5. Retornar HTTP apropriado.

Exemplo:

```js
async function buscar(req, res, next) {
    try {
        const cliente = await clientesService.buscarPorId(req.params.id);

        if (!cliente) {
            return res.status(404).json({
                erro: 'Cliente não encontrado'
            });
        }

        return res.json(cliente);
    } catch (error) {
        next(error);
    }
}
```

Controllers não devem conter queries SQL.

---

# 7. Services

Services concentram regras de negócio.

Exemplo:

```js
async function criarCliente(dados) {

    const existente = await repository.buscarPorCpf(dados.cpf);

    if (existente) {
        throw new Error('CPF já cadastrado');
    }

    return repository.criar(dados);
}
```

Services podem utilizar:

* Repositories.
* APIs externas.
* Outros services.
* Regras de validação.
* Transformações.

Services não devem depender diretamente de `req` ou `res`.

---

# 8. Repositories

Repositories são responsáveis pelo banco.

Exemplo:

```js
async function buscarPorId(id) {
    const [rows] = await pool.query(
        'SELECT * FROM clientes WHERE id = ? LIMIT 1',
        [id]
    );

    return rows[0] || null;
}
```

Toda query deve preferencialmente ser parametrizada.

Nunca utilizar:

```js
`SELECT * FROM clientes WHERE cpf = '${cpf}'`
```

Preferir:

```js
'SELECT * FROM clientes WHERE cpf = ?'
```

---

# 9. Banco centralizado

A conexão com banco deve ficar centralizada.

Estrutura recomendada:

```text
api/database/
├── mysql.js
└── transaction.js
```

Exemplo:

```js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;
```

Evitar criar pools diferentes em cada módulo sem necessidade.

---

# 10. Múltiplos bancos

Se o sistema utilizar vários bancos:

```text
api/database/
├── principal.js
├── financeiro.js
├── patrimonio.js
└── consultas.js
```

Ou utilizar um gerenciador:

```js
const pools = {
    principal,
    financeiro,
    patrimonio
};
```

Cada módulo deve importar apenas o banco necessário.

---

# 11. Frontend

O frontend deve permanecer organizado por funcionalidade.

Estrutura:

```text
public/
├── html/
├── js/
├── css/
├── images/
└── shared/
```

Exemplo:

```text
public/html/clientes_html/
    clientes.html

public/js/clientes_js/
    clientes.js
    api.js
    tabela.js
    modal.js

public/css/clientes_css/
    clientes.css

public/images/clientes_images/
```

---

# 12. HTML

Cada tela deve possuir um HTML responsável principalmente pela estrutura.

Evitar colocar grandes blocos de JavaScript dentro do HTML.

Exemplo:

```html
<script src="/js/clientes_js/clientes.js"></script>
```

Evitar:

```html
<script>
    // centenas de linhas
</script>
```

O HTML deve conter:

* Estrutura.
* Formulários.
* Containers.
* Modais.
* IDs.
* Classes.
* Inclusão dos CSS.
* Inclusão dos JS.

---

# 13. JavaScript do frontend

O JavaScript deve ser dividido quando a tela crescer.

Uma tela simples:

```text
clientes.js
```

Uma tela maior:

```text
clientes_js/
├── main.js
├── api.js
├── tabela.js
├── filtros.js
├── formulario.js
├── modal.js
└── utils.js
```

---

# 14. Arquivo `main.js`

O `main.js` deve inicializar a página.

Exemplo:

```js
document.addEventListener('DOMContentLoaded', async () => {
    await verificarSessao();
    await carregarClientes();
    configurarEventos();
});
```

Evitar colocar toda a lógica da aplicação dentro do evento `DOMContentLoaded`.

---

# 15. Camada de API no frontend

Funcionalidades maiores devem possuir um arquivo dedicado às requisições.

Exemplo:

```text
api.js
```

```js
async function listarClientes() {
    const response = await fetch('/api/clientes');

    if (!response.ok) {
        throw new Error('Erro ao carregar clientes');
    }

    return response.json();
}
```

Dessa forma, manipulação de DOM e comunicação HTTP ficam separadas.

---

# 16. Shared frontend

Comportamentos reutilizados devem ficar em:

```text
public/js/shared/
```

Exemplos:

```text
auth.js
menu.js
formatadores.js
modal.js
toast.js
http.js
permissoes.js
```

Evitar copiar a mesma função para várias páginas.

---

# 17. CSS

O CSS deve ser separado por módulo.

Exemplo:

```text
public/css/clientes_css/
├── clientes.css
├── tabela.css
└── modal.css
```

Elementos globais devem ficar em:

```text
public/css/shared/
```

Exemplo:

```text
variables.css
layout.css
sidebar.css
buttons.css
forms.css
```

---

# 18. Variáveis CSS

Definir tokens visuais globais.

Exemplo:

```css
:root {
    --background: #0d0d0d;
    --surface: #161616;
    --text-primary: #ffffff;
    --text-secondary: #a1a1a1;

    --border-radius-sm: 6px;
    --border-radius-md: 10px;
    --border-radius-lg: 16px;

    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
}
```

Isso facilita manter consistência visual.

---

# 19. Imagens

As imagens específicas devem acompanhar a funcionalidade.

Exemplo:

```text
public/images/clientes_images/
public/images/dashboard_images/
public/images/patrimonio_images/
```

Imagens globais:

```text
public/midias/
```

Exemplos:

```text
logo.svg
favicon.ico
logo-branca.svg
logo-escura.svg
```

---

# 20. API

Todos endpoints internos devem preferencialmente iniciar com:

```text
/api/
```

Exemplo:

```text
GET    /api/clientes
GET    /api/clientes/:id
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id
```

Evitar criar padrões diferentes para cada módulo.

---

# 21. Respostas HTTP

Utilizar códigos HTTP corretamente.

```text
200 → sucesso
201 → criado
204 → sucesso sem conteúdo
400 → entrada inválida
401 → não autenticado
403 → sem permissão
404 → não encontrado
409 → conflito
422 → regra de negócio inválida
500 → erro interno
```

Resposta de sucesso:

```json
{
    "sucesso": true,
    "dados": {}
}
```

Resposta de erro:

```json
{
    "sucesso": false,
    "erro": "Mensagem"
}
```

Em sistemas antigos onde outro formato já estiver consolidado, preservar compatibilidade.

---

# 22. Middleware

Middlewares reutilizáveis devem ficar em:

```text
api/middleware/
```

Exemplos:

```text
autenticacao.js
permissoes.js
tratamentoErros.js
rateLimit.js
upload.js
validacao.js
```

---

# 23. Autenticação

A autenticação deve ser centralizada.

Estrutura:

```text
api/auth/
├── login.js
├── senha.js
├── token.js
├── sessao.js
├── middleware.js
└── sockets_sessao.js
```

Nunca criar autenticação independente em cada módulo.

---

# 24. Autorização

Autenticação responde:

```text
Quem é o usuário?
```

Autorização responde:

```text
O usuário pode fazer isso?
```

Nunca confiar apenas no frontend.

Mesmo que um botão esteja escondido, o backend deve verificar permissão.

Exemplo:

```js
router.delete(
    '/usuarios/:id',
    autenticar,
    exigirPermissao('USUARIO_EXCLUIR'),
    controller.excluir
);
```

---

# 25. Socket.IO

Socket.IO deve ser usado somente quando atualização em tempo real realmente agregar valor.

Exemplos adequados:

* Chat.
* Chamados.
* Notificações.
* Sessões simultâneas.
* Atualização de status.
* Monitoramento em tempo real.

Não utilizar Socket.IO para substituir requisições HTTP comuns.

---

# 26. Organização dos sockets

Para módulos grandes:

```text
api/rota_chamados/
├── routes/
├── controllers/
├── services/
├── repositories/
└── sockets/
    └── chamados.socket.js
```

Evitar misturar toda configuração Socket.IO dentro de `server.js`.

---

# 27. `server.js`

O `server.js` deve ser enxuto.

Responsabilidades:

1. Carregar `.env`.
2. Criar Express.
3. Configurar middlewares.
4. Configurar arquivos estáticos.
5. Registrar rotas.
6. Criar HTTP server.
7. Inicializar Socket.IO.
8. Iniciar aplicação.

Evitar colocar regras de negócio em `server.js`.

---

# 28. Registro central de rotas

Projetos maiores devem possuir:

```text
api/routes.js
```

Exemplo:

```js
module.exports = function registrarRotas(app) {
    app.use('/api/clientes', clientesRoutes);
    app.use('/api/financeiro', financeiroRoutes);
    app.use('/api/patrimonio', patrimonioRoutes);
};
```

Então o `server.js` permanece simples.

---

# 29. Páginas do frontend

Também é possível criar:

```text
api/pages.js
```

Responsável apenas por:

```js
app.get('/clientes', ...);
app.get('/financeiro', ...);
app.get('/patrimonio', ...);
```

Isso evita que `server.js` cresça indefinidamente.

---

# 30. Uploads

Uploads públicos:

```text
public/uploads/
```

Uploads privados:

```text
uploads/
```

Arquivos sensíveis não devem ser armazenados diretamente dentro de `public`.

Quando necessário, criar endpoint autenticado para download.

---

# 31. Estrutura de uploads

Para sistemas grandes:

```text
uploads/
├── clientes/
├── contratos/
├── financeiro/
├── patrimonio/
└── temporarios/
```

O banco deve preferencialmente armazenar:

```text
caminho
nome_original
nome_arquivo
mime_type
tamanho
data_upload
```

Não salvar arquivos grandes diretamente no banco sem necessidade.

---

# 32. Scripts administrativos

Scripts que não fazem parte diretamente da aplicação devem ficar em:

```text
scripts/
```

Exemplos:

```text
scripts/
├── migrations/
├── seeds/
├── manutencao/
├── importacoes/
└── exportacoes/
```

Não deixar scripts temporários espalhados na raiz.

---

# 33. Migrações

Alterações de banco devem possuir scripts reproduzíveis.

Exemplo:

```text
scripts/migrations/
├── 001_criar_clientes.sql
├── 002_adicionar_nome_mae.sql
├── 003_criar_patrimonio.sql
└── 004_adicionar_indices.sql
```

Isso permite rastrear evolução do banco.

---

# 34. Logs

Logs devem ficar em:

```text
logs/
```

E não devem ser versionados.

Exemplo:

```text
logs/
├── app.log
├── errors.log
└── integracoes.log
```

Em produção, considerar solução dedicada de logs quando necessário.

---

# 35. Configuração

O `.env` deve conter apenas valores específicos do ambiente.

Exemplo:

```text
PORT=

DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

SESSION_SECRET=

OPENAI_API_KEY=
```

Criar sempre:

```text
.env.example
```

sem valores sensíveis.

---

# 36. `.gitignore`

Todo novo projeto deve ignorar pelo menos:

```text
node_modules/
.env
logs/
data/
uploads/
_pgbackup/
.wwebjs_cache/
*.log
nohup.out
```

Ajustar conforme a aplicação.

---

# 37. Regra de segurança do Git

Nunca versionar:

* `.env`
* Tokens
* Credenciais
* Senhas
* Sessões
* Cache
* Cookies
* Backups automáticos
* Dados de produção
* Uploads sensíveis
* Logs

---

# 38. Convenção de nomes

Manter nomes previsíveis.

Funcionalidade:

```text
clientes
```

Frontend:

```text
clientes_html
clientes_js
clientes_css
clientes_images
```

Backend:

```text
rota_clientes
```

Dentro de arquitetura em camadas:

```text
clientes.routes.js
clientes.controller.js
clientes.service.js
clientes.repository.js
clientes.validator.js
clientes.socket.js
```

---

# 39. Evitar nomes genéricos

Evitar quando possível:

```text
teste.js
novo.js
script2.js
final.js
final2.js
backupnovo.js
coisa.js
```

Preferir nomes que expliquem responsabilidade.

---

# 40. Versões de desenvolvimento

Não criar:

```text
clientes
clientes_novo
clientes_novo2
clientes_final
clientes_desenvolvimento
```

como solução permanente.

Utilizar Git para controle de versões.

Branches devem ser usadas para desenvolvimento experimental.

---

# 41. Arquivos antigos

Não manter arquivos:

```text
arquivo.js.backup
arquivo_old.js
arquivo_antigo.js
```

no código principal.

O histórico deve ser mantido pelo Git.

---

# 42. Arquitetura proporcional

Não transformar toda funcionalidade em arquitetura complexa desnecessariamente.

Uma rota pequena pode ser:

```text
rota_configuracoes/
├── rota_configuracoes.js
└── configuracoes.repository.js
```

Uma funcionalidade crítica pode ser:

```text
rota_financeiro/
├── routes/
├── controllers/
├── services/
├── repositories/
├── validators/
├── integrations/
├── sockets/
└── utils/
```

A arquitetura deve acompanhar a complexidade.

---

# 43. Processo para criar nova funcionalidade

Antes de programar, definir:

```text
Nome da funcionalidade
Objetivo
Tela necessária
Endpoints
Tabelas
Permissões
Uploads
Integrações
Tempo real
```

Depois criar:

```text
public/html/<nome>_html/
public/js/<nome>_js/
public/css/<nome>_css/
public/images/<nome>_images/

api/rota_<nome>/
```

---

# 44. Ordem de implementação

Preferencialmente:

```text
1. Banco
2. Repository
3. Service
4. Controller
5. Route
6. Registro no servidor
7. HTML
8. JavaScript
9. CSS
10. Testes
```

Para pequenas alterações, adaptar conforme necessário.

---

# 45. Fluxo de investigação

Ao trabalhar em projeto existente, seguir:

```text
Tela
↓
HTML
↓
Scripts carregados
↓
fetch
↓
Endpoint
↓
Route
↓
Controller
↓
Service
↓
Repository
↓
Banco
```

Nunca modificar arquivos apenas porque possuem nome parecido.

Encontrar o fluxo efetivamente utilizado.

---

# 46. Reutilização

Antes de criar código novo, procurar:

* Componente existente.
* Middleware existente.
* Helper.
* Service.
* Repository.
* Função compartilhada.
* Endpoint semelhante.

Evitar duplicação.

---

# 47. Utils

Funções realmente genéricas podem ficar em:

```text
api/shared/
```

ou:

```text
api/utils/
```

Exemplos:

```text
datas.js
cpf.js
formatadores.js
arquivos.js
erros.js
```

Não transformar `utils` em uma pasta onde qualquer código é colocado.

---

# 48. Integrações externas

Integrações devem ficar isoladas.

Exemplo:

```text
api/integrations/
├── openai/
├── clicksign/
├── whatsapp/
└── maisvoip/
```

Ou dentro do módulo:

```text
rota_contratos/
└── integrations/
    └── clicksign.js
```

Isso evita espalhar chamadas externas pela aplicação.

---

# 49. Tratamento de erros

Utilizar middleware global.

Exemplo:

```js
function errorHandler(err, req, res, next) {
    console.error(err);

    res.status(err.status || 500).json({
        sucesso: false,
        erro: err.publicMessage || 'Erro interno do servidor'
    });
}
```

Não retornar stack trace ao usuário em produção.

---

# 50. Validação

Nunca confiar nos dados enviados pelo frontend.

Validar:

* IDs.
* CPF.
* Emails.
* Datas.
* Números.
* Enumerações.
* Strings.
* Arquivos.
* Permissões.

Frontend pode validar para melhorar experiência.

Backend deve validar por segurança.

---

# 51. Segurança SQL

Utilizar:

```js
pool.execute(
    'SELECT * FROM usuarios WHERE email = ?',
    [email]
);
```

Nunca concatenar dados vindos da requisição.

---

# 52. Transações

Operações que modificam múltiplas tabelas relacionadas devem utilizar transações.

Fluxo:

```text
BEGIN
↓
INSERT
↓
UPDATE
↓
INSERT histórico
↓
COMMIT
```

Em erro:

```text
ROLLBACK
```

---

# 53. Histórico e auditoria

Funcionalidades importantes devem possuir histórico quando necessário.

Exemplo:

```text
cliente_historico
patrimonio_historico
chamado_historico
usuario_auditoria
```

Registrar:

```text
usuario
acao
registro
valor_anterior
valor_novo
data
```

---

# 54. Índices

Tabelas grandes devem possuir índices adequados.

Especialmente campos utilizados frequentemente em:

```text
WHERE
JOIN
ORDER BY
```

Exemplos:

```text
cpf
email
status
parceiro_id
usuario_id
created_at
```

Não adicionar índices indiscriminadamente.

---

# 55. Paginação

Consultas grandes devem utilizar paginação.

Exemplo:

```text
GET /api/clientes?page=1&limit=50
```

Evitar retornar milhares de registros sem necessidade.

---

# 56. Filtros

Filtros devem ser enviados como query parameters.

Exemplo:

```text
/api/clientes?status=ATIVO&parceiro=10
```

O repository monta apenas filtros permitidos.

---

# 57. Arquitetura de dashboards

Dashboards devem possuir endpoints específicos para agregações.

Exemplo:

```text
/api/dashboard/resumo
/api/dashboard/producao
/api/dashboard/ranking
/api/dashboard/grafico-mensal
```

Evitar carregar todos os registros para realizar cálculos no navegador.

Cálculos agregados devem preferencialmente ocorrer no banco/backend.

---

# 58. Responsabilidade do frontend

O frontend deve cuidar principalmente de:

* Interface.
* Eventos.
* Validação visual.
* Requisições.
* Renderização.
* Experiência do usuário.

Regras críticas de negócio pertencem ao backend.

---

# 59. Responsabilidade do backend

O backend deve controlar:

* Segurança.
* Autenticação.
* Permissões.
* Regras de negócio.
* Banco.
* Integrações.
* Validação definitiva.
* Auditoria.

---

# 60. Regra de crescimento

Quando um arquivo começar a concentrar responsabilidades demais, dividir.

Exemplo ruim:

```text
rota_clientes.js
3000 linhas
```

Evoluir para:

```text
routes/
controllers/
services/
repositories/
```

Porém não realizar refatorações grandes sem necessidade durante uma correção pequena.

---

# 61. Princípio da mudança mínima

Ao corrigir bugs ou adicionar funcionalidades:

```text
Modificar o menor conjunto possível de arquivos.
```

Evitar:

* Refatorações paralelas.
* Renomeações desnecessárias.
* Mudanças globais sem relação.
* Alterar interfaces estáveis.

---

# 62. Compatibilidade

Antes de alterar:

```text
Nome de campo
Endpoint
Resposta JSON
ID HTML
Classe
Nome de evento Socket.IO
```

procurar todos os consumidores.

Mudanças nesses elementos podem quebrar funcionalidades silenciosamente.

---

# 63. Arquitetura final recomendada

Para um projeto maduro:

```text
projeto/
│
├── server.js
├── package.json
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── api/
│   │
│   ├── auth/
│   ├── database/
│   ├── middleware/
│   ├── shared/
│   ├── integrations/
│   │
│   ├── rota_clientes/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── validators/
│   │
│   ├── rota_financeiro/
│   ├── rota_patrimonio/
│   ├── rota_chamados/
│   └── rota_dashboard/
│
├── public/
│   │
│   ├── html/
│   │   ├── clientes_html/
│   │   ├── financeiro_html/
│   │   ├── patrimonio_html/
│   │   └── chamados_html/
│   │
│   ├── js/
│   │   ├── shared/
│   │   ├── clientes_js/
│   │   ├── financeiro_js/
│   │   ├── patrimonio_js/
│   │   └── chamados_js/
│   │
│   ├── css/
│   │   ├── shared/
│   │   ├── clientes_css/
│   │   ├── financeiro_css/
│   │   ├── patrimonio_css/
│   │   └── chamados_css/
│   │
│   ├── images/
│   ├── midias/
│   └── uploads/
│
├── uploads/
│
├── scripts/
│   ├── migrations/
│   ├── seeds/
│   ├── importacoes/
│   └── manutencao/
│
├── docs/
└── logs/
```

---

# 64. Regra fundamental da skill

Sempre que criar ou arquitetar um projeto seguindo esta skill, pensar em:

```text
FUNCIONALIDADE
      │
      ├── HTML
      ├── JavaScript
      ├── CSS
      ├── Imagens
      │
      └── Backend
            ├── Route
            ├── Controller
            ├── Service
            └── Repository
                  ↓
                Banco
```

O mesmo nome da funcionalidade deve ser facilmente identificável em todas as camadas.

---

# 65. Princípio final

A arquitetura deve permitir que qualquer desenvolvedor consiga olhar para uma funcionalidade e responder rapidamente:

```text
Onde está a tela?
Onde está o JavaScript?
Onde está o CSS?
Qual endpoint ela chama?
Onde está a regra?
Onde está a query?
Qual tabela ela utiliza?
```

Se essas respostas forem fáceis de encontrar, a arquitetura está funcionando corretamente.

Ao gerar novos projetos com esta skill, priorize sempre:

**simplicidade, organização por funcionalidade, separação de responsabilidades, baixo acoplamento, segurança e facilidade de manutenção.**
