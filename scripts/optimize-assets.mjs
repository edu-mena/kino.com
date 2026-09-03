/**
 * Otimização de imagens estáticas (`src/assets`).
 *
 * As imagens da app foram exportadas em bruto (heróis PNG de 2 MB+, favicon
 * de 1 MB) — pesado demais para uma app cujo público está em Luanda, muitas
 * vezes em rede móvel. Este script re-encoda / redimensiona tudo para
 * tamanhos sensatos.
 *
 * - Ficheiros marcados `convertTo: "webp"` passam a `.webp`; é preciso
 *   atualizar os imports (poucos, todos rastreados) — feito manualmente.
 * - Os restantes são otimizados no lugar, mantendo nome e extensão, por isso
 *   nenhum import muda.
 *
 * Uso:  node scripts/optimize-assets.mjs
 */
import { readFile, writeFile, stat, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../src/assets/", import.meta.url));

/** width = largura máxima (mantém proporção, nunca faz upscale). */
const plan = [
  // Favicon + og:image — usado em TODAS as páginas. 200×200 no HTML.
  { file: "icon.png", width: 256 },
  // Logo no header — mostrado a ~140px, 512 cobre retina.
  { file: "logo.png", width: 512 },
  // Heróis grandes de fundo — únicos usos, convertidos para webp.
  { file: "hero.png", width: 2000, convertTo: "webp", quality: 72 },
  { file: "auth-food.png", width: 1800, convertTo: "webp", quality: 72 },
  { file: "kino/hero.png", width: 1600, convertTo: "webp", quality: 74 },
  // Fotos menores.
  { file: "hero-food.jpg", width: 1400, quality: 76 },
  { file: "restaurant-angolana.jpg", width: 900, quality: 76 },
  { file: "cocacap.webp", width: 800, quality: 78 },
  { file: "dish-drink.png", width: 800 },
  { file: "dish-fries.png", width: 800 },
  { file: "kino/chief.png", width: 800 },
  { file: "kino/date.png", width: 800 },
  { file: "kino/menu.png", width: 800 },
  { file: "kino/prato.png", width: 800 },
];

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

let before = 0;
let after = 0;

for (const item of plan) {
  const src = path.join(root, item.file);
  let input;
  try {
    input = await readFile(src);
  } catch {
    console.warn(`skip (não encontrado): ${item.file}`);
    continue;
  }
  const origSize = input.length;
  const meta = await sharp(input).metadata();

  let pipeline = sharp(input).rotate();
  if (meta.width && item.width && meta.width > item.width) {
    pipeline = pipeline.resize({ width: item.width, withoutEnlargement: true });
  }

  const ext = (item.convertTo ?? path.extname(item.file).slice(1)).toLowerCase();
  if (ext === "webp") {
    pipeline = pipeline.webp({ quality: item.quality ?? 74, effort: 6 });
  } else if (ext === "jpg" || ext === "jpeg") {
    pipeline = pipeline.jpeg({ quality: item.quality ?? 78, mozjpeg: true });
  } else {
    // png — mantém alfa/qualidade fotográfica, só comprime melhor.
    pipeline = pipeline.png({ compressionLevel: 9, effort: 10, palette: true, quality: 82 });
  }

  const out = await pipeline.toBuffer();
  const outPath = item.convertTo ? src.replace(/\.[^.]+$/, `.${item.convertTo}`) : src;

  if (!item.convertTo && out.length >= origSize) {
    console.log(`= ${item.file}: já otimizado (${kb(origSize)})`);
    before += origSize;
    after += origSize;
    continue;
  }

  await writeFile(outPath, out);
  if (item.convertTo && outPath !== src) await unlink(src);

  before += origSize;
  after += out.length;
  console.log(
    `✓ ${item.file} → ${path.basename(outPath)}  ${kb(origSize)} → ${kb(out.length)}  (-${(
      (1 - out.length / origSize) *
      100
    ).toFixed(0)}%)`,
  );
}

console.log(
  `\nTotal: ${kb(before)} → ${kb(after)}  (-${((1 - after / before) * 100).toFixed(0)}%)`,
);
