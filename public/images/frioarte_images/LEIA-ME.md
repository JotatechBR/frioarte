# Fotos da Frio Arte

Esta pasta guarda as fotos reais da empresa usadas no site.

Nenhuma foto foi incluída ainda. Enquanto isso, a seção **Projetos** mostra
molduras marcadas como "Foto em breve" — o site não usa imagem genérica nem
gerada para simular um trabalho que não foi feito por vocês.

## Como publicar uma foto no portfólio

1. Coloque o arquivo nesta pasta, com nome descritivo em minúsculas e hífen:

   ```
   instalacao-sala-vila-salete.jpg
   higienizacao-evaporadora.jpg
   ```

2. Abra `api/shared/frioarte.dados.js` e preencha o projeto correspondente:

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

- **Formato:** JPG ou WebP. WebP pesa bem menos com a mesma qualidade.
- **Proporção:** as molduras são 4:3. Fotos em outra proporção são recortadas
  pelo centro.
- **Tamanho:** 1600 px de largura basta. Acima disso só deixa o site lento.
- **Peso:** mire abaixo de 300 KB por foto.
- **Conteúdo:** ambientes limpos e organizados, sem texto sobre a imagem e sem
  captura de tela de rede social.

## Foto de fundo do topo

O hero funciona sem foto, com um campo de gradiente construído em CSS. Para usar
uma foto de ambiente, defina o token em `public/css/shared/variaveis.css`:

```css
--hero-imagem: url('/images/frioarte_images/ambiente-climatizado.jpg');
```

A tela de degradê que garante a leitura do texto já está aplicada por cima.
