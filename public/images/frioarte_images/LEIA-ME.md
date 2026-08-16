# Fotos da Frio Arte

Esta pasta guarda as fotos usadas no site, cada uma em JPG e WebP.

**As imagens de hoje são geradas por IA**, usadas como referência de ambiente
com o aval da empresa. Os itens de `projetos` em `frioarte.dados.js` carregam
`gerada: true` — a marca é o que separa ilustração de portfólio. Quando chegar
a foto de um trabalho realmente executado, troque o arquivo e apague a marca.

## Depois de colocar ou trocar qualquer foto

```bash
npm run imagens
```

Gera o `.webp` correspondente e atualiza a imagem de prévia de link. Sem isso a
foto nova até aparece, mas sai só em JPG — mais pesada do que precisava.

## Como publicar uma foto no portfólio

1. Coloque o arquivo nesta pasta, com nome descritivo em minúsculas e hífen:

   ```
   instalacao-sala-vila-salete.jpg
   higienizacao-evaporadora.jpg
   ```

2. Abra `backend/shared/frioarte.dados.js` e preencha o projeto correspondente:

   ```js
   {
       id: 'projeto-1',
       titulo: 'Instalação residencial',
       legenda: 'Split em ambiente de estar',
       imagem: '/images/frioarte_images/instalacao-sala-vila-salete.jpg',
       alt: 'Split instalado acima do sofá em sala de estar'
   }
   ```

O `alt` descreve a foto para quem usa leitor de tela e para quando a imagem não
carrega. Descreva o que aparece, não repita o título.

## Recomendações

- **Formato:** entregue em JPG. O WebP é gerado pelo `npm run imagens`.
- **Proporção:** as molduras são 4:3. Fotos em outra proporção são recortadas
  pelo centro.
- **Tamanho:** 1600 px de largura basta. Acima disso só deixa o site lento.
- **Peso:** mire abaixo de 300 KB por foto.
- **Conteúdo:** ambientes limpos e organizados, sem texto sobre a imagem e sem
  captura de tela de rede social.
- **Originais pesados:** deixe fora do repositório. `_bruto/` está no
  `.gitignore` justamente para isso.

## Foto de fundo do topo

O hero tem duas variantes, trocadas por largura de tela: `hero-amplo.jpg` no
desktop e `hero-alto.jpg` no celular, porque o corte do desktop não serve em
retrato. Os tokens ficam em `public/css/shared/variaveis.css`:

```css
--hero-imagem: url('/images/frioarte_images/hero-amplo.jpg');
--hero-imagem-alto: url('/images/frioarte_images/hero-alto.jpg');
```

Duas coisas andam junto com esses nomes: o `preload` no `<head>` da home e a
imagem de prévia de link, recortada de `hero-amplo.jpg`. Ao trocar o arquivo,
confira os dois. Sem foto nenhuma o hero ainda funciona — o campo de gradiente
em CSS é a cena, e a tela de degradê que garante a leitura do texto já está
aplicada por cima.
