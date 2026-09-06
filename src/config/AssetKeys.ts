/**
 * AssetKeys.ts
 *
 * UNICO lugar del proyecto donde viven las rutas y las keys de assets.
 * Si renombras algo dentro de Assets/, cambialo aca (y en scripts/sync-assets.mjs)
 * y el resto del codigo sigue funcionando sin tocar nada mas.
 *
 * Convencion real de los assets (verificada sobre Assets/, NO son placeholders):
 *  - Personajes: Assets/characters/<char>/<char>_<anim>_<dir>_sheet.png
 *      frames de 128x128, en fila horizontal, con 2px de separacion entre frames.
 *      Ej: 4 frames -> 4*128 + 3*2 = 518px de ancho.
 *  - Tilesets:  Assets/tilesets/<tema>_tileset_16x16.png
 *      PNG de 64x64 = grilla 4x4 de tiles de 16x16 (wang tileset de 16 piezas).
 *
 * TODO(arte): no existe un sprite de punto de guardado en Assets/. Por ahora se
 * dibuja proceduralmente en src/entities/SavePoint.ts. Cuando exista el arte,
 * agrega la key aca y cambia SavePoint para usar la textura.
 */

/** Prefijo servido por Vite (public/assets/ lo genera scripts/sync-assets.mjs). */
const A = 'assets/';

export type Direction = 'north' | 'south' | 'east' | 'west';
export const DIRECTIONS: readonly Direction[] = ['south', 'north', 'east', 'west'] as const;

/** Tamano nativo de cada frame de personaje. */
export const CHAR_FRAME_SIZE = 128;
/** Separacion entre frames en los sheets direccionales. */
export const CHAR_FRAME_SPACING = 2;

export type CharacterId =
  | 'explorer'
  | 'demontek'
  | 'guard_demontek'
  | 'mutant_demontek'
  | 'goliath'
  | 'king_demontek';

/**
 * Cantidad de frames por familia de animacion. Es una propiedad del asset
 * (esta en el nombre del archivo o se deduce del ancho del PNG), no una eleccion.
 */
export const ANIM_FRAMES = {
  'breathing-idle': 4,
  'walking-8-frames': 8,
  'running-6-frames': 6,
  'cross-punch': 6,
  'taking-punch': 6,
  'falling-back-death': 7,
  'attack_magic': 6,
  'fireball': 6,
} as const;

export type AnimFamily = keyof typeof ANIM_FRAMES;

export interface SheetSpec {
  /** Key con la que queda registrada la textura en Phaser. */
  key: string;
  path: string;
  frames: number;
}

/** Describe un spritesheet direccional de personaje. */
export function charSheet(char: CharacterId, anim: AnimFamily, dir: Direction): SheetSpec {
  return {
    key: `${char}__${anim}__${dir}`,
    path: `${A}characters/${char}/${char}_${anim}_${dir}_sheet.png`,
    frames: ANIM_FRAMES[anim],
  };
}

/* ------------------------------------------------------------------ */
/* Tilesets                                                            */
/* ------------------------------------------------------------------ */

export type TilesetTheme = 'jungle' | 'dungeon' | 'castle';

/** Tamano del tile en el PNG original. */
export const SOURCE_TILE_SIZE = 16;

export const TILESETS: Record<TilesetTheme, { key: string; path: string; metaKey: string; metaPath: string }> = {
  jungle: {
    key: 'tiles_jungle',
    path: `${A}tilesets/jungle_tileset_16x16.png`,
    metaKey: 'tilesmeta_jungle',
    metaPath: `${A}tilesets/jungle_tileset_16x16_metadata.json`,
  },
  dungeon: {
    key: 'tiles_dungeon',
    path: `${A}tilesets/dungeon_tileset_16x16.png`,
    metaKey: 'tilesmeta_dungeon',
    metaPath: `${A}tilesets/dungeon_tileset_16x16_metadata.json`,
  },
  castle: {
    key: 'tiles_castle',
    path: `${A}tilesets/castle_tileset_16x16.png`,
    metaKey: 'tilesmeta_castle',
    metaPath: `${A}tilesets/castle_tileset_16x16_metadata.json`,
  },
};

/* ------------------------------------------------------------------ */
/* Decoraciones / items / UI                                           */
/* ------------------------------------------------------------------ */

export const DECOR = {
  alienTree: { key: 'decor_alien_tree', path: `${A}decorations/alien_tree_64x64.png` },
  exoticLeaf: { key: 'decor_exotic_leaf', path: `${A}decorations/exotic_leaf_64x64.png` },
  hangingVine: { key: 'decor_hanging_vine', path: `${A}decorations/hanging_vine_64x64.png` },
  mossBoulder: { key: 'decor_moss_boulder', path: `${A}decorations/moss_boulder_32x32.png` },
  purpleFlowers: { key: 'decor_purple_flowers', path: `${A}decorations/purple_flowers_32x32.png` },
  portal: { key: 'decor_portal', path: `${A}decorations/PortalEarth.png` },
} as const;

export type DecorId = keyof typeof DECOR;

export const ITEMS = {
  machete: { key: 'item_machete', path: `${A}items/weapon_machete.png` },
  knife: { key: 'item_saber', path: `${A}items/weapon_saber.png` },
} as const;

export const MISC = {
  splash: { key: 'splash', path: `${A}splash.png` },
} as const;

/** Arte de la pantalla de final. */
export const STORY = {
  endingBg: { key: 'ending_bg', path: `${A}story/ending_bg.png` },
  portraitExplorer: { key: 'portrait_explorer', path: `${A}story/portrait_explorer.png` },
} as const;

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

/** Musica: se carga bajo demanda (son ~7 MB por pista). */
export const MUSIC = {
  main: { key: 'music_main', path: `${A}audio/music_main.mp3` },
  jungle: { key: 'music_jungle', path: `${A}audio/music_jungle.mp3` },
  dungeon: { key: 'music_dungeon', path: `${A}audio/music_dungeon.mp3` },
  castle: { key: 'music_castle', path: `${A}audio/music_castle.mp3` },
  victory: { key: 'music_victory', path: `${A}audio/music_victory.mp3` },
} as const;

export type MusicId = keyof typeof MUSIC;

/** SFX: chicos, se precargan todos. */
export const SFX = {
  uiClick: { key: 'sfx_ui_click', path: `${A}audio/sfx_ui_click.mp3` },
  uiMove: { key: 'sfx_ui_move', path: `${A}audio/sfx_ui_move.mp3` },
  save: { key: 'sfx_save', path: `${A}audio/sfx_save.mp3` },
  error: { key: 'sfx_error', path: `${A}audio/sfx_error.mp3` },
  slash: { key: 'sfx_slash', path: `${A}audio/sfx_slash.mp3` },
  hit: { key: 'sfx_hit', path: `${A}audio/sfx_hit.mp3` },
  playerHurt: { key: 'sfx_player_hurt', path: `${A}audio/sfx_player_hurt.mp3` },
  heal: { key: 'sfx_heal', path: `${A}audio/sfx_heal.mp3` },
  playerDeath: { key: 'sfx_player_death', path: `${A}audio/sfx_player_death.mp3` },
  checkpoint: { key: 'sfx_checkpoint', path: `${A}audio/sfx_checkpoint.mp3` },
} as const;

export type SfxId = keyof typeof SFX;

/* ------------------------------------------------------------------ */
/* Texturas generadas en runtime (no salen de un PNG)                  */
/* ------------------------------------------------------------------ */

export const GENERATED = {
  /** Proyectiles del combate. TODO(arte): reemplazar por sprites reales. */
  bulletSquare: 'gen_bullet_square',
  bulletRound: 'gen_bullet_round',
  bulletLong: 'gen_bullet_long',
  /** Punto de guardado provisorio. TODO(arte): reemplazar por save_point.png. */
  savePoint: 'gen_save_point',
  /** Pixel blanco de 1x1, util para barras y overlays. */
  pixel: 'gen_pixel',
} as const;
