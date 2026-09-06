import Phaser from 'phaser';
import { SOURCE_TILE_SIZE, TILESETS, type TilesetTheme } from '../config/AssetKeys';
import { DEPTH, TILE_SIZE, TILE_UPSCALE } from '../config/GameConfig';
import { Palette } from '../config/Palette';
import { createFloorTexture, upscaleTexture } from './TextureUtils';
import type { RoomDef } from '../types';

/**
 * Construye la geometria de una sala a partir del layout ASCII.
 *
 * Los tilesets que trae Assets/ son "wang tilesets" de 16 piezas: un PNG de
 * 64x64 con una grilla 4x4 donde cada tile describe que hay en sus 4 ESQUINAS
 * (solido o vacio), no en su centro. Eso permite dibujar bordes y esquinas
 * correctas sin dibujarlas a mano, con la tecnica de "dual grid":
 *
 *   - La grilla logica (la del layout) tiene cols x rows celdas.
 *   - La capa visible de paredes se dibuja DESPLAZADA media celda y tiene
 *     (cols+1) x (rows+1) tiles. Cada tile dibujado mira las 4 celdas logicas
 *     que lo rodean y elige la pieza wang que corresponde.
 *
 * Resultado: el borde entre pared y piso cae exacto sobre el limite de celda,
 * y las esquinas salen redondeadas/biseladas segun el arte del tileset.
 *
 * La colision NO usa la capa visible (que esta desplazada media celda) sino una
 * tercera capa invisible alineada a la grilla logica: asi lo que se ve y lo que
 * frena al jugador coinciden exactamente.
 */

/** Tile completamente opaco (las 4 esquinas solidas) dentro de la grilla 4x4. */
const FULL_SOLID_INDEX = 6;
/** Tile completamente transparente (las 4 esquinas vacias). */
const FULL_EMPTY_INDEX = 12;

/**
 * mask -> indice en la grilla 4x4 del PNG.
 * mask = NW*8 + NE*4 + SW*2 + SE*1, con bit=1 cuando esa esquina es VACIO.
 * Se calcula a partir del metadata del tileset; esta tabla es el fallback
 * (y el orden real verificado en los tres tilesets de Assets/).
 */
const DEFAULT_WANG_TABLE: readonly number[] = [6, 7, 10, 9, 2, 11, 4, 15, 5, 14, 1, 8, 3, 0, 13, 12];

interface WangTileMeta {
  corners: { NE: string; NW: string; SE: string; SW: string };
}
interface TilesetMeta {
  tileset_data?: { tiles?: WangTileMeta[] };
}

/**
 * Deriva la tabla mask->indice leyendo el metadata del tileset, para no
 * depender de que PixelLab mantenga el orden de las piezas.
 */
function buildWangTable(scene: Phaser.Scene, metaKey: string): readonly number[] {
  const meta = scene.cache.json.get(metaKey) as TilesetMeta | undefined;
  const tiles = meta?.tileset_data?.tiles;
  if (!tiles || tiles.length !== 16) return DEFAULT_WANG_TABLE;

  const table = new Array<number>(16).fill(-1);
  tiles.forEach((tile, index) => {
    const c = tile.corners;
    if (!c) return;
    const bit = (v: string): number => (v === 'upper' ? 1 : 0);
    const mask = bit(c.NW) * 8 + bit(c.NE) * 4 + bit(c.SW) * 2 + bit(c.SE);
    table[mask] = index;
  });
  return table.some((v) => v < 0) ? DEFAULT_WANG_TABLE : table;
}

/** Key de la textura del tileset ya re-escalada a TILE_SIZE. */
function upscaledKey(theme: TilesetTheme): string {
  return `${TILESETS[theme].key}_x${TILE_UPSCALE}`;
}

/** Key de la textura de piso (un solo tile, re-escalado y aclarado). */
function floorKey(theme: TilesetTheme): string {
  return `${TILESETS[theme].key}_floor`;
}

/**
 * Filtro por bioma para la textura de piso.
 *
 * Las tres piezas solidas son oscuras pero con croma muy distinto: la de jungla
 * es azul marino casi negro, la de castillo es magenta saturado. Un filtro
 * unico deja o un piso invisible o uno fluorescente, asi que cada bioma lleva
 * el suyo. La regla general: subir luminosidad y BAJAR saturacion, para que el
 * piso quede neutro y las paredes (que no se tocan) sean lo que resalta.
 */
/** Tinte del piso en mapas de Tiled (ver buildRoomFromTiled). */
const TILED_FLOOR_TINT = 0x565b6e;

const FLOOR_FILTER: Record<TilesetTheme, string> = {
  jungle: 'brightness(1.85) saturate(0.85)',
  dungeon: 'brightness(1.5) saturate(0.55)',
  castle: 'brightness(1.35) saturate(0.35)',
};

/**
 * Prepara las texturas derivadas de los tres tilesets. Es idempotente: cada
 * helper corta enseguida si su textura ya existe.
 *
 * La llama PreloadScene (para no pagarla a mitad de partida) y tambien
 * `buildRoom`, para que armar una sala no dependa de que otra escena haya
 * corrido antes.
 */
export function prepareTilesetTextures(scene: Phaser.Scene): void {
  for (const theme of Object.keys(TILESETS) as TilesetTheme[]) {
    upscaleTexture(scene, TILESETS[theme].key, upscaledKey(theme), TILE_UPSCALE);
    createFloorTexture(
      scene,
      TILESETS[theme].key,
      floorKey(theme),
      FULL_SOLID_INDEX,
      SOURCE_TILE_SIZE,
      TILE_UPSCALE,
      FLOOR_FILTER[theme],
    );
  }
}

export interface BuiltRoom {
  cols: number;
  rows: number;
  widthPx: number;
  heightPx: number;
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  wallLayer: Phaser.Tilemaps.TilemapLayer;
  collisionLayer: Phaser.Tilemaps.TilemapLayer;
  /** true si esa celda es pared. */
  isSolid: (cx: number, cy: number) => boolean;
}

/** Centro en pixeles de mundo de una celda de la grilla logica. */
export function cellToWorld(cx: number, cy: number): { x: number; y: number } {
  return { x: (cx + 0.5) * TILE_SIZE, y: (cy + 0.5) * TILE_SIZE };
}

function makeLayer(
  scene: Phaser.Scene,
  data: number[][],
  textureKey: string,
  x: number,
  y: number,
): Phaser.Tilemaps.TilemapLayer {
  const map = scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tileset = map.addTilesetImage(`ts_${textureKey}`, textureKey, TILE_SIZE, TILE_SIZE, 0, 0);
  if (!tileset) throw new Error(`No se pudo registrar el tileset "${textureKey}"`);
  const layer = map.createLayer(0, tileset, x, y);
  if (!layer) throw new Error(`No se pudo crear la capa del tileset "${textureKey}"`);
  return layer;
}

/** Key de cache del tilemap de Tiled de una sala. */
export function tiledMapKey(room: RoomDef): string {
  return `tiledmap_${room.id}`;
}

/**
 * Encola el JSON de Tiled de la sala, si la sala usa uno. Llamar desde el
 * `preload()` de la escena.
 */
export function preloadTiledMap(scene: Phaser.Scene, room: RoomDef): void {
  if (!room.tiledMap) return;
  const key = tiledMapKey(room);
  if (scene.cache.tilemap.exists(key)) return;
  scene.load.tilemapTiledJSON(key, room.tiledMap);
}

/**
 * Arma la sala a partir de un mapa hecho en Tiled.
 *
 * El mapa se autorea con tiles de **16px** (el tamano nativo del tileset) y las
 * capas se escalan x`TILE_UPSCALE` en runtime, para que las coordenadas de
 * mundo sigan siendo las mismas que en las salas generadas desde ASCII: una
 * celda = TILE_SIZE px. Phaser tiene en cuenta la escala de la capa tanto al
 * dibujar como al colisionar.
 *
 * Capas esperadas (nombres exactos):
 *   - `ground`  piso, sin colision
 *   - `walls`   paredes; todo tile presente colisiona
 *   - `objects` opcional, decoracion sin colision, se dibuja sobre las paredes
 *
 * Los spawns, puertas, enemigos y punto de guardado siguen saliendo del RoomDef
 * en coordenadas de celda: el mapa de Tiled solo aporta la geometria.
 */
export function buildRoomFromTiled(scene: Phaser.Scene, room: RoomDef): BuiltRoom {
  const map = scene.make.tilemap({ key: tiledMapKey(room) });

  if (map.tileWidth !== SOURCE_TILE_SIZE || map.tileHeight !== SOURCE_TILE_SIZE) {
    throw new Error(
      `El mapa de "${room.id}" usa tiles de ${map.tileWidth}x${map.tileHeight}; ` +
        `se esperaban ${SOURCE_TILE_SIZE}x${SOURCE_TILE_SIZE}`,
    );
  }

  // Se acepta cualquier nombre de tileset dentro del mapa: lo que importa es que
  // apunte a la imagen del bioma de la sala.
  const tilesetName = map.tilesets[0]?.name ?? TILESETS[room.theme].key;
  const tileset = map.addTilesetImage(tilesetName, TILESETS[room.theme].key);
  if (!tileset) {
    throw new Error(`No se pudo registrar el tileset "${tilesetName}" del mapa de "${room.id}"`);
  }

  const layer = (name: string, depth: number, required: boolean): Phaser.Tilemaps.TilemapLayer | null => {
    const created = map.createLayer(name, tileset, 0, 0);
    if (!created) {
      if (required) throw new Error(`Al mapa de "${room.id}" le falta la capa "${name}"`);
      return null;
    }
    created.setScale(TILE_UPSCALE);
    created.setDepth(depth);
    return created;
  };

  const groundLayer = layer('ground', DEPTH.ground, true)!;
  const wallLayer = layer('walls', DEPTH.walls, true)!;
  layer('objects', DEPTH.decor, false);

  // Oscurecer el piso. Un mapa recien exportado por ascii-to-tiled.mjs usa la
  // MISMA pieza para piso y pared, y sin esto no se distingue una cosa de la
  // otra. Si tu mapa ya usa tiles distintos para piso y pared, borra esta linea
  // y el piso se ve tal cual lo dibujaste.
  groundLayer.setTint(TILED_FLOOR_TINT);

  wallLayer.setCollisionByExclusion([-1]);

  return {
    cols: map.width,
    rows: map.height,
    widthPx: map.width * TILE_SIZE,
    heightPx: map.height * TILE_SIZE,
    groundLayer,
    wallLayer,
    // En los mapas de Tiled la capa de paredes ES la de colision.
    collisionLayer: wallLayer,
    isSolid: (cx, cy) => {
      if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) return true;
      return wallLayer.getTileAt(cx, cy) !== null;
    },
  };
}

export function buildRoom(scene: Phaser.Scene, room: RoomDef): BuiltRoom {
  if (room.tiledMap) return buildRoomFromTiled(scene, room);

  prepareTilesetTextures(scene);

  const rows = room.layout.length;
  const cols = room.layout[0]?.length ?? 0;

  const solid = (cx: number, cy: number): boolean => {
    // Fuera del mapa cuenta como pared: encierra la sala sin casos especiales.
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return true;
    return room.layout[cy]![cx] === '#';
  };

  /* --- Piso: la sala entera con el unico tile de la textura de piso --- */
  const groundData: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  /* --- Paredes: dual grid, (cols+1) x (rows+1) desplazado media celda --- */
  const wangTable = buildWangTable(scene, TILESETS[room.wallTheme].metaKey);
  const wallData: number[][] = [];
  for (let ry = 0; ry <= rows; ry++) {
    const line: number[] = [];
    for (let rx = 0; rx <= cols; rx++) {
      // bit = 1 cuando la celda de esa esquina es PISO (vacio para el tileset)
      const nw = solid(rx - 1, ry - 1) ? 0 : 1;
      const ne = solid(rx, ry - 1) ? 0 : 1;
      const sw = solid(rx - 1, ry) ? 0 : 1;
      const se = solid(rx, ry) ? 0 : 1;
      const mask = nw * 8 + ne * 4 + sw * 2 + se;
      line.push(mask === 15 ? -1 : (wangTable[mask] ?? FULL_EMPTY_INDEX));
    }
    wallData.push(line);
  }

  /* --- Colision: alineada a la grilla logica, invisible --- */
  const collisionData: number[][] = room.layout.map((row) =>
    [...row].map((ch) => (ch === '#' ? FULL_SOLID_INDEX : -1)),
  );

  const groundLayer = makeLayer(scene, groundData, floorKey(room.theme), 0, 0);
  groundLayer.setDepth(DEPTH.ground);
  // Tinte suave para dar identidad de bioma sin volver a apagar el piso.
  groundLayer.setTint(floorTint(room.theme));

  const wallLayer = makeLayer(
    scene,
    wallData,
    upscaledKey(room.wallTheme),
    -TILE_SIZE / 2,
    -TILE_SIZE / 2,
  );
  wallLayer.setDepth(DEPTH.walls);

  const collisionLayer = makeLayer(scene, collisionData, upscaledKey(room.wallTheme), 0, 0);
  collisionLayer.setDepth(DEPTH.walls);
  collisionLayer.setVisible(false);
  collisionLayer.setCollisionByExclusion([-1]);

  return {
    cols,
    rows,
    widthPx: cols * TILE_SIZE,
    heightPx: rows * TILE_SIZE,
    groundLayer,
    wallLayer,
    collisionLayer,
    isSolid: solid,
  };
}

function floorTint(theme: TilesetTheme): number {
  switch (theme) {
    case 'jungle':
      return Palette.tintJungle;
    case 'dungeon':
      return Palette.tintDungeon;
    case 'castle':
      return Palette.tintCastle;
  }
}
