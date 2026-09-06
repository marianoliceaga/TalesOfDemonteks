/**
 * ascii-to-tiled.mjs
 *
 * Convierte un layout ASCII (el formato de src/data/rooms.ts) a un mapa de
 * Tiled (JSON) que podes abrir y seguir editando en Tiled.
 *
 * Uso:
 *   node scripts/ascii-to-tiled.mjs <nombre> <tema>
 *     <nombre>  nombre del archivo de salida, sin extension
 *     <tema>    jungle | dungeon | castle  (define el tileset del mapa)
 *
 * El layout se lee por stdin, una fila por linea ('#' pared, '.' piso):
 *   node scripts/ascii-to-tiled.mjs mi_sala dungeon < mi_layout.txt
 *
 * Si no le pasas nada por stdin usa un layout de ejemplo.
 *
 * Salida: public/maps/<nombre>.json  (NO esta gitignoreado: los mapas de Tiled
 * son fuente, no derivados). Para usarlo, en src/data/rooms.ts:
 *   tiledMap: 'maps/<nombre>.json'
 *
 * Ojo: el resultado usa una sola pieza del tileset (el tile totalmente solido),
 * asi que las paredes salen cuadradas. El renderer propio (WangRoomBuilder) usa
 * las 16 piezas wang y saca bordes y esquinas bien; este script existe para que
 * puedas ARRANCAR desde el layout y despues dibujar a mano en Tiled.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'maps');

/** Tamano del tile en el PNG original. */
const TILE = 16;
/** Indice (0-based) del tile totalmente opaco dentro de la grilla 4x4. */
const SOLID_INDEX = 6;
/** Tiled usa gids 1-based; 0 significa "sin tile". */
const SOLID_GID = SOLID_INDEX + 1;

const THEMES = {
  jungle: 'jungle_tileset_16x16.png',
  dungeon: 'dungeon_tileset_16x16.png',
  castle: 'castle_tileset_16x16.png',
};

const EXAMPLE_LAYOUT = [
  '####################',
  '#..................#',
  '#..................#',
  '#....##########....#',
  '#....#........#....#',
  '#....#........#....#',
  '#....#........#....#',
  '#....#........#....#',
  '#....####..####....#',
  '#..................#',
  '#..................#',
  '#..................#',
  '####################',
];

function tileLayer(id, name, data, width, height) {
  return {
    data,
    height,
    id,
    name,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width,
    x: 0,
    y: 0,
  };
}

function buildMap(layout, theme) {
  const height = layout.length;
  const width = layout[0].length;
  for (const [i, row] of layout.entries()) {
    if (row.length !== width) {
      throw new Error(`La fila ${i} mide ${row.length}, se esperaba ${width}`);
    }
  }

  const cells = layout.flatMap((row) => [...row]);
  const ground = cells.map(() => SOLID_GID);
  const walls = cells.map((ch) => (ch === '#' ? SOLID_GID : 0));

  const image = THEMES[theme];
  if (!image) throw new Error(`Tema desconocido "${theme}". Usa: ${Object.keys(THEMES).join(', ')}`);

  return {
    compressionlevel: -1,
    height,
    infinite: false,
    layers: [
      tileLayer(1, 'ground', ground, width, height),
      tileLayer(2, 'walls', walls, width, height),
      {
        draworder: 'topdown',
        id: 3,
        name: 'objects',
        objects: [],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 4,
    nextobjectid: 1,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TILE,
    tilesets: [
      {
        columns: 4,
        firstgid: 1,
        // Relativo a public/maps/, para que Tiled encuentre la imagen.
        image: `../assets/tilesets/${image}`,
        imageheight: 64,
        imagewidth: 64,
        margin: 0,
        name: image.replace(/\.png$/, ''),
        spacing: 0,
        tilecount: 16,
        tileheight: TILE,
        tilewidth: TILE,
      },
    ],
    tilewidth: TILE,
    type: 'map',
    version: '1.10',
    width,
  };
}

async function readStdin() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8').trim();
  return text ? text.split(/\r?\n/) : null;
}

async function main() {
  const [name = 'example_room', theme = 'dungeon'] = process.argv.slice(2);
  const layout = (await readStdin()) ?? EXAMPLE_LAYOUT;

  const map = buildMap(layout, theme);
  await mkdir(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `${name}.json`);
  await writeFile(out, `${JSON.stringify(map, null, 2)}\n`, 'utf8');

  console.log(`[ascii-to-tiled] ${map.width}x${map.height} (${theme}) -> public/maps/${name}.json`);
  console.log(`[ascii-to-tiled] usalo con  tiledMap: 'maps/${name}.json'  en src/data/rooms.ts`);
}

main().catch((err) => {
  console.error('[ascii-to-tiled] fallo:', err.message);
  process.exit(1);
});
