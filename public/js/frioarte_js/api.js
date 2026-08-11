/** Comunicação HTTP da página inicial. Nada de DOM aqui. */

async function buscarPerfil() {
    const resposta = await fetch('/api/frioarte');

    if (!resposta.ok) {
        throw new Error('Não foi possível carregar os dados da FrioArte');
    }

    const corpo = await resposta.json();

    if (!corpo.sucesso) {
        throw new Error(corpo.erro || 'Resposta inválida do servidor');
    }

    return corpo.dados;
}

window.FrioArteApi = { buscarPerfil };
