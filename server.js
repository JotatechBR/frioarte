require('dotenv').config();

const path = require('path');
const express = require('express');

const registrarRotas = require('./api/routes');
const { registrarPaginas, registrarPaginaNaoEncontrada } = require('./api/pages');
const { naoEncontrado, tratarErro } = require('./api/middleware/tratamentoErros');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

registrarPaginas(app);
registrarRotas(app);

app.use('/api', naoEncontrado);

// Último de todos: só chega aqui o que nenhuma rota acima reconheceu.
registrarPaginaNaoEncontrada(app);

app.use(tratarErro);

app.listen(PORT, () => {
    console.log(`FrioArte rodando em http://localhost:${PORT}`);
});
