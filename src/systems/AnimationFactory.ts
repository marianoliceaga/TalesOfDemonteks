import Phaser from 'phaser';
import {
  CHAR_FRAME_SIZE,
  CHAR_FRAME_SPACING,
  DIRECTIONS,
  charSheet,
  type AnimFamily,
  type CharacterId,
  type Direction,
  type SheetSpec,
} from '../config/AssetKeys';
import { ENEMIES } from '../data/enemies';
import type { EnemyId } from '../types';

/**
 * Carga de spritesheets y registro de animaciones, en un solo lugar.
 *
 * Los assets vienen como un PNG por (personaje, animacion, direccion), con los
 * frames en fila y 2px de separacion. Ninguna escena deberia saber eso: piden
 * animaciones por su key logica (`player-walk-north`, `enemy-goliath-attack`)
 * y listo.
 *
 * Nota sobre direcciones: no todos los personajes tienen las 4. El Explorer si;
 * los enemigos, en el MVP, solo se dibujan mirando al frente dentro de la caja
 * de combate, asi que alcanza con una direccion por animacion (la que declara
 * cada EnemyDef en src/data/enemies.ts).
 */

/** Familias de animacion que usa el Explorer, con su key logica. */
type PlayerAnimKey = 'idle' | 'walk' | 'attack' | 'hurt';

const PLAYER_ANIMS: ReadonlyArray<{
  family: AnimFamily;
  key: PlayerAnimKey;
  frameRate: number;
  repeat: number;
}> = [
  { family: 'breathing-idle', key: 'idle', frameRate: 6, repeat: -1 },
  { family: 'walking-8-frames', key: 'walk', frameRate: 14, repeat: -1 },
  { family: 'cross-punch', key: 'attack', frameRate: 16, repeat: 0 },
  { family: 'taking-punch', key: 'hurt', frameRate: 14, repeat: 0 },
];

const PLAYER: CharacterId = 'explorer';

export const playerAnim = (key: PlayerAnimKey, dir: Direction): string =>
  `player-${key}-${dir}`;

export const enemyAnim = (id: EnemyId, key: 'idle' | 'attack'): string => `enemy-${id}-${key}`;

/** Todos los spritesheets que hay que precargar. */
export function collectSheets(): SheetSpec[] {
  const sheets: SheetSpec[] = [];

  for (const { family } of PLAYER_ANIMS) {
    for (const dir of DIRECTIONS) sheets.push(charSheet(PLAYER, family, dir));
  }

  for (const def of Object.values(ENEMIES)) {
    sheets.push(charSheet(def.character, def.idle.anim, def.idle.dir));
    sheets.push(charSheet(def.character, def.attack.anim, def.attack.dir));
  }

  // Puede haber repetidos (dos enemigos con el mismo sprite): deduplicar por key.
  const byKey = new Map<string, SheetSpec>();
  for (const s of sheets) byKey.set(s.key, s);
  return [...byKey.values()];
}

/** Encola en el loader de la escena todos los spritesheets de personajes. */
export function loadCharacterSheets(scene: Phaser.Scene): void {
  for (const sheet of collectSheets()) {
    scene.load.spritesheet(sheet.key, sheet.path, {
      frameWidth: CHAR_FRAME_SIZE,
      frameHeight: CHAR_FRAME_SIZE,
      spacing: CHAR_FRAME_SPACING,
    });
  }
}

function createAnim(
  scene: Phaser.Scene,
  key: string,
  textureKey: string,
  frames: number,
  frameRate: number,
  repeat: number,
): void {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: frames - 1 }),
    frameRate,
    repeat,
  });
}

/** Registra todas las animaciones. Idempotente: se puede llamar mas de una vez. */
export function registerAnimations(scene: Phaser.Scene): void {
  for (const { family, key, frameRate, repeat } of PLAYER_ANIMS) {
    for (const dir of DIRECTIONS) {
      const sheet = charSheet(PLAYER, family, dir);
      createAnim(scene, playerAnim(key, dir), sheet.key, sheet.frames, frameRate, repeat);
    }
  }

  for (const def of Object.values(ENEMIES)) {
    const idle = charSheet(def.character, def.idle.anim, def.idle.dir);
    createAnim(scene, enemyAnim(def.id, 'idle'), idle.key, idle.frames, 6, -1);

    const attack = charSheet(def.character, def.attack.anim, def.attack.dir);
    createAnim(scene, enemyAnim(def.id, 'attack'), attack.key, attack.frames, 12, 0);
  }
}

/** Textura por defecto de un enemigo (su pose idle), util para el sprite del overworld. */
export function enemyIdleTexture(id: EnemyId): string {
  const def = ENEMIES[id];
  return charSheet(def.character, def.idle.anim, def.idle.dir).key;
}
