const path = require('path');

const HTML = path.join(__dirname, '..', 'public', 'html');

module.exports = function registrarPaginas(app) {
    app.get('/', (req, res) => {
        res.sendFile(path.join(HTML, 'frioarte_html', 'frioarte.html'));
    });
};
