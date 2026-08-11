/**
 * Prepara as imagens do site a partir dos JPG de public/images.
 *
 * Faz duas coisas e nada além:
 *   1. gera o par `.webp` de cada foto, que é o que o `<picture>` serve;
 *   2. recorta a imagem de prévia de link (1200×630) usada no Open Graph.
 *
 * É um script de manutenção, não parte do servidor: roda quando chega foto
 * nova (`npm run imagens`) e o resultado é commitado. O site em produção não
 * depende do sharp — por isso ele é devDependency.
 *
 * Reprocessar é seguro: o script pula o WebP que já está atualizado.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.join(__dirname, '..');
const FOTOS = path.join(RAIZ, 'public', 'images', 'frioarte_images');
const MIDIAS = path.join(RAIZ, 'public', 'midias');

/**
 * A foto que representa a empresa na prévia do link: a mesma do hero.
 *
 * É deliberado que seja a do topo — quem clica no link cai exatamente na cena
 * que viu na prévia. Também é a mais clara do conjunto e a que mostra o
 * aparelho instalado, que num quadrado de 200 px no WhatsApp é o que se lê.
 * A cena da chamada final é bonita, mas escura e com meia parede vazia: some
 * em miniatura.
 */
const ORIGEM_PREVIA = path.join(FOTOS, 'hero-amplo.jpg');
const DESTINO_PREVIA = path.join(MIDIAS, 'frioarte-og.jpg');

/** Medida fixa do Open Graph. Fora disso o WhatsApp recorta por conta. */
const PREVIA = { largura: 1200, altura: 630 };

/** 82 é o ponto em que o WebP para de encolher sem começar a borrar. */
const QUALIDADE_WEBP = 82;

async function principal() {
    const jpgs = fs
        .readdirSync(FOTOS)
        .filter((arquivo) => arquivo.toLowerCase().endsWith('.jpg'));

    if (jpgs.length === 0) {
        console.log('Nenhum JPG em public/images/frioarte_images — nada a fazer.');
        return;
    }

    let geradas = 0;
    let puladas = 0;
    let antes = 0;
    let depois = 0;

    for (const arquivo of jpgs) {
        const origem = path.join(FOTOS, arquivo);
        const destino = origem.replace(/\.jpg$/i, '.webp');

        antes += fs.statSync(origem).size;

        if (atualizado(origem, destino)) {
            depois += fs.statSync(destino).size;
            puladas += 1;
            continue;
        }

        await sharp(origem).webp({ quality: QUALIDADE_WEBP }).toFile(destino);

        const peso = fs.statSync(destino).size;
        depois += peso;
        geradas += 1;

        console.log(`  ${arquivo} → ${path.basename(destino)}  ${kb(peso)}`);
    }

    await gerarPrevia();

    console.log(
        `\n${geradas} geradas, ${puladas} já atualizadas.` +
            `\nJPG ${kb(antes)} → WebP ${kb(depois)} (${Math.round((1 - depois / antes) * 100)}% menor).`
    );
}

/** O WebP serve enquanto for mais novo que o JPG que o originou. */
function atualizado(origem, destino) {
    if (!fs.existsSync(destino)) return false;

    return fs.statSync(destino).mtimeMs >= fs.statSync(origem).mtimeMs;
}

/**
 * A prévia é recortada, não encolhida: deformar para caber em 1200×630 deixaria
 * o ambiente esticado. O hero já é quase esta proporção, então `cover` no
 * centro tira poucos pixels de cima e de baixo e a composição fica de pé.
 */
async function gerarPrevia() {
    if (!fs.existsSync(ORIGEM_PREVIA)) {
        console.warn(`\nAviso: ${path.basename(ORIGEM_PREVIA)} não existe — prévia não gerada.`);
        return;
    }

    await sharp(ORIGEM_PREVIA)
        .resize(PREVIA.largura, PREVIA.altura, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(DESTINO_PREVIA);

    console.log(
        `\n  prévia de link → ${path.basename(DESTINO_PREVIA)}  ` +
            `${PREVIA.largura}×${PREVIA.altura}  ${kb(fs.statSync(DESTINO_PREVIA).size)}`
    );
}

function kb(bytes) {
    return `${Math.round(bytes / 1024)} KB`;
}

principal().catch((erro) => {
    console.error('Falha ao preparar as imagens:', erro);
    process.exitCode = 1;
});
