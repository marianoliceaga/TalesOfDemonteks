import Phaser from 'phaser';
import type { PatternId } from '../types';
import { rainPattern } from './patterns/rain';
import { fanPattern } from './patterns/fan';
import { wavePattern } from './patterns/wave';
import { spiralPattern } from './patterns/spiral';
import { wallsPattern } from './patterns/walls';
import { homingPattern } from './patterns/homing';

/**
 * Registro de patrones de proyectiles.
 *
 * Cada enemigo declara un `pattern` en src/data/enemies.ts y aca se resuelve a
 * la funcion que lo emite. Agregar un patron nuevo:
 *   1. crear src/combat/patterns/<nombre>.ts exportando una PatternFn
 *   2. sumar el id a `PatternId` en src/types/index.ts
 *   3. registrarlo en PATTERNS
 * Nada mas: ni BattleScene ni BattleBox se enteran.
 */

export interface BulletOptions {
  x: number;
  y: number;
  /** Key de textura (ver GENERATED en AssetKeys). */
  texture: string;
  /** Velocidad en px/s. */
  vx?: number;
  vy?: number;
  /** Alternativa a vx/vy: angulo en radianes + rapidez. */
  angle?: number;
  speed?: number;
  scale?: number;
  tint?: number;
  /** Grados por segundo de rotacion visual (no afecta la trayectoria). */
  spin?: number;
  /** ms hasta autodestruirse. Por defecto vive hasta salir de la caja. */
  lifespan?: number;
  /** Rota el sprite para que apunte en la direccion en la que viaja. */
  faceDirection?: boolean;
  /** Gancho para retocar el proyectil recien creado (tweens, datos extra). */
  onCreated?: (bullet: Phaser.Physics.Arcade.Image) => void;
}

export interface PatternContext {
  scene: Phaser.Scene;
  /** Interior util de la caja de esquive, en coordenadas de pantalla. */
  box: Phaser.Geom.Rectangle;
  /** Punto desde el que "dispara" el enemigo (arriba y al centro de la caja). */
  origin: { x: number; y: number };
  /** Posicion actual del Explorer dentro de la caja. */
  playerPos: () => { x: number; y: number };
  /** Crea y lanza un proyectil. */
  spawn: (options: BulletOptions) => void;
  /** Programa un callback repetido que se limpia solo al terminar la fase. */
  every: (delayMs: number, callback: () => void) => void;
  /** Programa un callback unico. */
  after: (delayMs: number, callback: () => void) => void;
  /**
   * Registra un objeto auxiliar (telegrafias, marcas) para que se destruya solo
   * cuando termina la fase, aunque la fase corte antes de tiempo.
   */
  track: (object: Phaser.GameObjects.GameObject) => void;
  /** Duracion total de la fase de esquive, en ms. */
  duration: number;
}

export type PatternFn = (ctx: PatternContext) => void;

const PATTERNS: Record<PatternId, PatternFn> = {
  rain: rainPattern,
  fan: fanPattern,
  wave: wavePattern,
  spiral: spiralPattern,
  walls: wallsPattern,
  homing: homingPattern,
};

export function getPattern(id: PatternId): PatternFn {
  const pattern = PATTERNS[id];
  if (!pattern) throw new Error(`Patron de proyectiles desconocido: ${id}`);
  return pattern;
}
