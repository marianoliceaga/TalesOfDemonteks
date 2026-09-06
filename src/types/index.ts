import type { AnimFamily, CharacterId, DecorId, Direction, MusicId, TilesetTheme } from '../config/AssetKeys';

/* ------------------------------------------------------------------ */
/* Enemigos                                                            */
/* ------------------------------------------------------------------ */

export type EnemyId = 'demontek' | 'guard' | 'sentinel' | 'mutant' | 'goliath' | 'king';

/** Id de un patron de proyectiles registrado en src/combat/BulletPatterns.ts. */
export type PatternId = 'rain' | 'fan' | 'wave' | 'spiral' | 'walls' | 'homing';

export interface EnemyDef {
  id: EnemyId;
  /** Nombre que se muestra en la caja de combate. */
  name: string;
  /** Carpeta/prefijo real del personaje dentro de Assets/characters/. */
  character: CharacterId;
  /** Animacion + direccion usadas como pose idle en la caja de combate. */
  idle: { anim: AnimFamily; dir: Direction };
  /** Animacion + direccion del ataque (se reproduce al empezar la fase de esquive). */
  attack: { anim: AnimFamily; dir: Direction };
  maxHp: number;
  /** Dano que hace cada proyectil suyo al Explorer. */
  bulletDamage: number;
  /** Dano base del FIGHT contra el (se multiplica por la precision de la barra). */
  fightBaseDamage: number;
  pattern: PatternId;
  /** Segundos que dura la fase de esquive de este enemigo. */
  dodgeSeconds: number;
  /** Escala del sprite en la caja de combate (los jefes se ven mas grandes). */
  battleScale: number;
  /**
   * Tinte opcional del sprite. Sirve para variantes: dos enemigos pueden
   * compartir el arte y leerse distinto. El tinte MULTIPLICA, asi que solo
   * funciona bien sobre sprites poco saturados.
   */
  tint?: number;
  /** Texto que devuelve el ACT > Check. */
  check: string;
  /** Lineas del ACT > Talk (se van rotando). */
  talk: string[];
  /** Linea al derrotarlo. */
  defeat: string;
}

/* ------------------------------------------------------------------ */
/* Salas                                                               */
/* ------------------------------------------------------------------ */

export type RoomId = string;

/** Posicion en celdas de la grilla del layout (no en pixeles). */
export interface Cell {
  cx: number;
  cy: number;
}

export interface EnemySpawn extends Cell {
  /** Id unico dentro de la partida: se usa para no revivir enemigos ya derrotados. */
  uid: string;
  enemy: EnemyId;
  /** Recorrido de patrulla en celdas relativas al spawn. Vacio = quieto. */
  patrol?: Cell[];
}

export interface DoorSpawn extends Cell {
  toRoom: RoomId;
  /** Nombre del punto de aparicion en la sala destino. */
  toSpawn: string;
  label?: string;
}

export interface DecorSpawn extends Cell {
  decor: DecorId;
  /** Escala opcional (los PNG de decoracion vienen en tamanos variados). */
  scale?: number;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  theme: TilesetTheme;
  /** Tileset usado para las paredes; da contraste contra el piso del bioma. */
  wallTheme: TilesetTheme;
  music: MusicId;
  /**
   * Layout en ASCII. '#' = pared solida, '.' = piso.
   * Todas las filas deben medir lo mismo.
   *
   * Si en algun momento traes mapas hechos en Tiled, poné la ruta del JSON en
   * `tiledMap` y este layout se ignora (ver README > "Reemplazar los mapas").
   */
  layout: string[];
  tiledMap?: string;
  /** Puntos de aparicion nombrados. 'start' es el que usa una partida nueva. */
  spawns: Record<string, Cell>;
  enemies: EnemySpawn[];
  doors: DoorSpawn[];
  decor?: DecorSpawn[];
  /** Si esta presente, la sala tiene punto de guardado en esa celda. */
  savePoint?: Cell;
  /** Lineas que se muestran la primera vez que entras a la sala. */
  intro?: string[];
}

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

export type ItemId = 'medkit' | 'medkit_big';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** HP que restaura al usarlo. */
  heal: number;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Guardado                                                            */
/* ------------------------------------------------------------------ */

export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  roomId: RoomId;
  spawnId: string;
  hp: number;
  maxHp: number;
  items: Partial<Record<ItemId, number>>;
  /** uids de EnemySpawn ya derrotados. */
  defeated: string[];
  /** Ids de salas ya visitadas (para no repetir el texto de intro). */
  visited: RoomId[];
  savedAt: number;
}

/* ------------------------------------------------------------------ */
/* Datos que se pasan entre escenas                                    */
/* ------------------------------------------------------------------ */

export interface RoomSceneData {
  roomId: RoomId;
  spawnId: string;
}

export interface BattleSceneData {
  enemy: EnemyId;
  /** uid del spawn, para marcarlo derrotado al ganar. */
  spawnUid: string;
  returnTo: RoomSceneData;
}

export type BattleOutcome = 'victory' | 'defeat';
