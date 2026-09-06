import type { RoomDef, RoomId } from '../types';

/**
 * Definicion central de salas.
 *
 * Cada sala es una entrada de datos: la escena de exploracion (RoomScene) es
 * UNA sola y se parametriza con `roomId`. Agregar una sala nueva = agregar una
 * entrada aca, sin escribir codigo nuevo.
 *
 * Layout: grilla ASCII, '#' = pared solida, '.' = piso. Todas las filas de una
 * sala tienen que medir lo mismo y toda celda referenciada (spawns, puertas,
 * enemigos, punto de guardado, decoracion) tiene que caer sobre piso.
 * `validateRooms()` en src/data/validateRooms.ts chequea las dos cosas y tira
 * error apenas arranca el juego si algo no cierra.
 *
 * Convencion de diseno: el "anillo" de celdas pegado a la pared (col 1, col 18,
 * fila 1, fila 11) siempre es piso. Asi las puertas, spawns y puntos de guardado
 * se pueden colocar contra el borde sin sorpresas.
 *
 * El dibujo usa "dual grid" sobre los wang tiles de 16 piezas que trae cada
 * tileset (ver src/systems/WangRoomBuilder.ts): los bordes y esquinas salen
 * bien solos, no hay que dibujarlos a mano.
 *
 * Reemplazar por mapas de Tiled: pone la ruta del JSON exportado en `tiledMap`
 * (ver README > "Reemplazar los mapas por mapas de Tiled").
 */
export const ROOMS: Record<RoomId, RoomDef> = {
  /* ------------------------- Nivel 1: jungla ------------------------- */

  jungle_clearing: {
    id: 'jungle_clearing',
    name: 'CLARO ALIENIGENA',
    theme: 'jungle',
    wallTheme: 'dungeon',
    music: 'jungle',
    layout: [
      '####################',
      '#..................#',
      '#...####....####...#',
      '#...####....####...#',
      '#...####....####...#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#...####....####...#',
      '#...####....####...#',
      '#...####....####...#',
      '#..................#',
      '####################',
    ],
    spawns: {
      start: { cx: 3, cy: 6 },
      fromEast: { cx: 16, cy: 6 },
    },
    enemies: [
      {
        uid: 'jc_demontek_1',
        enemy: 'demontek',
        cx: 13,
        cy: 6,
        patrol: [
          { cx: 11, cy: 6 },
          { cx: 16, cy: 6 },
        ],
      },
    ],
    doors: [{ cx: 18, cy: 6, toRoom: 'jungle_path', toSpawn: 'fromWest', label: 'SENDERO' }],
    decor: [
      { cx: 2, cy: 2, decor: 'alienTree' },
      { cx: 17, cy: 2, decor: 'alienTree' },
      { cx: 2, cy: 10, decor: 'purpleFlowers', scale: 2 },
      { cx: 17, cy: 10, decor: 'mossBoulder', scale: 2 },
      { cx: 9, cy: 1, decor: 'hangingVine' },
    ],
    intro: [
      'Te despertas en un claro que no figura en ningun mapa.',
      'El cielo tiene dos soles y ninguno de los dos parece contento con eso.',
      'Tenes un cuchillo, tres kits medicos y cero explicaciones.',
    ],
  },

  jungle_path: {
    id: 'jungle_path',
    name: 'SENDERO DE VINAS',
    theme: 'jungle',
    wallTheme: 'dungeon',
    music: 'jungle',
    layout: [
      '####################',
      '#..................#',
      '#..######...#.####.#',
      '#.......#...#......#',
      '#..#....#...#......#',
      '#..#....#...#......#',
      '#..#........#......#',
      '#..######...######.#',
      '#..................#',
      '#...####.....####..#',
      '#...####.....####..#',
      '#..................#',
      '####################',
    ],
    spawns: {
      fromWest: { cx: 2, cy: 8 },
      fromEast: { cx: 17, cy: 8 },
    },
    enemies: [
      {
        uid: 'jp_guard_1',
        enemy: 'guard',
        cx: 10,
        cy: 11,
        patrol: [
          { cx: 4, cy: 11 },
          { cx: 16, cy: 11 },
        ],
      },
    ],
    doors: [
      { cx: 1, cy: 6, toRoom: 'jungle_clearing', toSpawn: 'fromEast', label: 'CLARO' },
      { cx: 18, cy: 10, toRoom: 'dungeon_gate', toSpawn: 'fromWest', label: 'MAZMORRA' },
    ],
    decor: [
      { cx: 2, cy: 1, decor: 'exoticLeaf' },
      { cx: 17, cy: 1, decor: 'hangingVine' },
      { cx: 9, cy: 1, decor: 'purpleFlowers', scale: 2 },
    ],
    savePoint: { cx: 2, cy: 11 },
    intro: ['El sendero baja. El aire se pone frio y con olor a metal caliente.'],
  },

  /* ------------------------ Nivel 2: mazmorra ------------------------ */

  dungeon_gate: {
    id: 'dungeon_gate',
    name: 'PORTON DE LA MAZMORRA',
    theme: 'dungeon',
    wallTheme: 'castle',
    music: 'dungeon',
    layout: [
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
    ],
    spawns: {
      fromWest: { cx: 3, cy: 10 },
      fromNorth: { cx: 12, cy: 2 },
    },
    enemies: [
      {
        uid: 'dg_mutant_1',
        enemy: 'mutant',
        cx: 9,
        cy: 6,
        patrol: [
          { cx: 7, cy: 6 },
          { cx: 12, cy: 6 },
        ],
      },
      {
        uid: 'dg_sentinel_1',
        enemy: 'sentinel',
        cx: 14,
        cy: 2,
        patrol: [
          { cx: 11, cy: 2 },
          { cx: 17, cy: 2 },
        ],
      },
    ],
    doors: [
      { cx: 1, cy: 10, toRoom: 'jungle_path', toSpawn: 'fromEast', label: 'SENDERO' },
      { cx: 9, cy: 1, toRoom: 'dungeon_cells', toSpawn: 'fromSouth', label: 'CELDAS' },
    ],
    decor: [{ cx: 2, cy: 2, decor: 'mossBoulder', scale: 2 }],
    intro: [
      'Un porton abierto de par en par. Nadie se molesto en cerrarlo.',
      'Eso deberia preocuparte mas de lo que te preocupa.',
    ],
  },

  dungeon_cells: {
    id: 'dungeon_cells',
    name: 'BLOQUE DE CELDAS',
    theme: 'dungeon',
    wallTheme: 'castle',
    music: 'dungeon',
    layout: [
      '####################',
      '#..................#',
      '#.####.####.####...#',
      '#.####.####.####...#',
      '#.####.####.####...#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.####.####.####...#',
      '#.####.####.####...#',
      '#.####.####.####...#',
      '#..................#',
      '####################',
    ],
    spawns: {
      fromSouth: { cx: 9, cy: 7 },
      fromEast: { cx: 16, cy: 6 },
    },
    enemies: [
      {
        uid: 'dc_demontek_1',
        enemy: 'demontek',
        cx: 6,
        cy: 6,
        patrol: [
          { cx: 2, cy: 6 },
          { cx: 8, cy: 6 },
        ],
      },
      {
        uid: 'dc_guard_1',
        enemy: 'guard',
        cx: 14,
        cy: 6,
        patrol: [
          { cx: 11, cy: 6 },
          { cx: 17, cy: 6 },
        ],
      },
    ],
    doors: [
      { cx: 9, cy: 11, toRoom: 'dungeon_gate', toSpawn: 'fromNorth', label: 'PORTON' },
      { cx: 18, cy: 6, toRoom: 'castle_hall', toSpawn: 'fromWest', label: 'CASTILLO' },
    ],
    savePoint: { cx: 17, cy: 1 },
    intro: ['Celdas vacias. Todas abiertas desde adentro.', 'Alguien salio. Nadie entro a revisar.'],
  },

  /* ------------------------ Nivel 3: castillo ------------------------ */

  castle_hall: {
    id: 'castle_hall',
    name: 'SALON DEL CASTILLO',
    theme: 'castle',
    wallTheme: 'dungeon',
    music: 'castle',
    layout: [
      '####################',
      '#..................#',
      '#..##..##..##..##..#',
      '#..##..##..##..##..#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..##..##..##..##..#',
      '#..##..##..##..##..#',
      '#..................#',
      '#..................#',
      '####################',
    ],
    spawns: {
      fromWest: { cx: 3, cy: 6 },
      fromNorth: { cx: 9, cy: 4 },
    },
    enemies: [
      {
        uid: 'ch_goliath_1',
        enemy: 'goliath',
        cx: 13,
        cy: 6,
        patrol: [
          { cx: 10, cy: 6 },
          { cx: 16, cy: 6 },
        ],
      },
      {
        uid: 'ch_mutant_1',
        enemy: 'mutant',
        cx: 6,
        cy: 11,
        patrol: [
          { cx: 3, cy: 11 },
          { cx: 12, cy: 11 },
        ],
      },
    ],
    doors: [
      { cx: 1, cy: 6, toRoom: 'dungeon_cells', toSpawn: 'fromEast', label: 'CELDAS' },
      { cx: 9, cy: 1, toRoom: 'throne_room', toSpawn: 'fromSouth', label: 'TRONO' },
    ],
    savePoint: { cx: 2, cy: 11 },
    decor: [{ cx: 17, cy: 11, decor: 'mossBoulder', scale: 2 }],
    intro: [
      'Un salon con columnas y sin gente.',
      'La decoracion grita "presupuesto" y susurra "nadie limpia hace siglos".',
    ],
  },

  throne_room: {
    id: 'throne_room',
    name: 'SALA DEL TRONO',
    theme: 'castle',
    wallTheme: 'dungeon',
    music: 'castle',
    layout: [
      '####################',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.....########.....#',
      '#.....#......#.....#',
      '#.....#......#.....#',
      '#.....########.....#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '####################',
    ],
    spawns: {
      fromSouth: { cx: 9, cy: 9 },
    },
    enemies: [
      {
        uid: 'tr_king_1',
        enemy: 'king',
        cx: 9,
        cy: 2,
      },
    ],
    doors: [{ cx: 9, cy: 11, toRoom: 'castle_hall', toSpawn: 'fromNorth', label: 'SALON' }],
    decor: [{ cx: 9, cy: 5, decor: 'portal', scale: 0.05 }],
    intro: [
      'El REY DEMONTEK te estaba esperando.',
      'Bueno: estaba sentado. Que despues de 400 anios es practicamente lo mismo.',
    ],
  },
};

/** Sala y spawn con los que arranca una partida nueva. */
export const FIRST_ROOM: RoomId = 'jungle_clearing';
export const FIRST_SPAWN = 'start';

export function getRoom(id: RoomId): RoomDef {
  const room = ROOMS[id];
  if (!room) throw new Error(`Sala desconocida: ${id}`);
  return room;
}
