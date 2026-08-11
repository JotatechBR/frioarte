/** Dados que aparecem em várias seções: nome, contatos, endereço, atendimento. */

window.FrioArteRegistro.registrar('identidade', { precisaDados: true }, (perfil) => {
    const { campos } = window.FrioArteDom;

    campos({
        nome: perfil.nome,
        telefone: perfil.telefone.formatado,
        whatsapp: perfil.whatsapp.formatado,
        'endereco-linha1': perfil.endereco.linha1,
        'endereco-linha2': perfil.endereco.linha2,
        'atendimento-resumo': perfil.atendimento.resumo,
        'atendimento-detalhe': perfil.atendimento.detalhe,
        'atendimento-publico': perfil.atendimento.publico,
        'situacao-estado': perfil.funcionamento.situacao,
        'situacao-proxima': perfil.funcionamento.proximaAbertura,
        ano: String(new Date().getFullYear())
    });

    // O indicador é pintado a partir do dado, sem interpretar texto.
    document.querySelectorAll('[data-ponto]').forEach((no) => {
        no.dataset.aberto = perfil.funcionamento.aberto ? 'true' : 'false';
    });
});
