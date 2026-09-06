import Phaser from 'phaser';
import { GENERATED } from '../../config/AssetKeys';
import { Palette } from '../../config/Palette';
import type { PatternFn } from '../BulletPatterns';

/**
 * "Muros" — CENTINELA MOHOSO.
 *
 * Paredes verticales de proyectiles que cruzan la caja de lado a lado con un
 * hueco: hay que estar en el hueco, no esquivar proyectil por proyectil. El
 * hueco cambia de lugar en cada pared y los lados se alternan, asi que obliga a
 * moverse en vertical y en horizontal.
 */
export const wallsPattern: PatternFn = ({ box, spawn, every, after, duration }) => {
  /** Cantidad de posiciones de la pared, de borde a borde de la caja. */
  const SLOTS = 9;
  /** Alto del hueco, en cantidad de posiciones. */
  const GAP = 3;

  const margin = 12;
  // La separacion se deriva del alto de la caja: si se fijara a un valor
  // constante, la pared no llegaria abajo y bastaria con quedarse en el borde
  // inferior para no recibir nada.
  const step = (box.height - margin * 2) / (SLOTS - 1);

  let fromLeft = true;
  let speed = 150;

  const wall = (): void => {
    const gapStart = Phaser.Math.Between(0, SLOTS - GAP);
    const x = fromLeft ? box.left - 24 : box.right + 24;
    const vx = fromLeft ? speed : -speed;
    fromLeft = !fromLeft;

    for (let i = 0; i < SLOTS; i++) {
      if (i >= gapStart && i < gapStart + GAP) continue;
      spawn({
        x,
        y: box.top + margin + i * step,
        texture: GENERATED.bulletSquare,
        vx,
        tint: Palette.hpGreen,
      });
    }
  };

  every(1300, wall);
  // Segunda mitad: las paredes vienen mas rapido.
  after(duration / 2, () => {
    speed = 215;
  });
};
