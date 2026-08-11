/**
 * Montagem da mensagem de orçamento para o WhatsApp.
 *
 * Função pura: recebe os dados do formulário e devolve texto. Não toca no DOM
 * e não abre nada — por isso pode ser conferida isoladamente.
 */

function montarMensagem(dados, nomeEmpresa) {
    const nome = texto(dados.get('nome'));
    const servico = texto(dados.get('servico'));
    const bairro = texto(dados.get('bairro'));
    const detalhes = texto(dados.get('mensagem'));

    const linhas = [
        `Olá! Sou ${nome} e vim pelo site da ${nomeEmpresa}.`,
        '',
        `Serviço: ${servico}`
    ];

    if (bairro) linhas.push(`Bairro: ${bairro}`);
    if (detalhes) linhas.push('', `Detalhes: ${detalhes}`);

    linhas.push('', 'Gostaria de solicitar um orçamento.');

    return linhas.join('\n');
}

function montarDestino(numero, mensagem) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function texto(valor) {
    return (valor || '').trim();
}

window.FrioArteMensagem = { montarMensagem, montarDestino };
