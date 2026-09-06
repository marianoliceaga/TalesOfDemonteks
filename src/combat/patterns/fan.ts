import Phaser from 'phaser';
import { GENERATED } from '../../config/AssetKeys';
import type { PatternFn } from '../BulletPatterns';

/**
 * "Abanico" — GUARDIA DEMONTEK.
 * Rafagas en abanico desde arriba, apuntadas al centro de la caja. Entre rafaga
 * y rafaga hay una pausa larga: el hueco esta, hay que leerlo a tiempo.
 */
export const fanPattern: PatternFn = ({ box, origin, spawn, every }) => {
  const BULLETS = 7;
  const SPREAD = Phaser.Math.DegToRad(78);

  let flip = false;
  every(900, () => {
    const aim = Phaser.Math.Angle.Between(origin.x, origin.y, box.centerX, box.centerY);
    // Alternar el desfasaje mueve el hueco de rafaga en rafaga.
    const offset = flip ? SPREAD / (BULLETS - 1) / 2 : 0;
    flip = !flip;

    for (let i = 0; i < BULLETS; i++) {
      const t = i / (BULLETS - 1) - 0.5;
      spawn({
        x: origin.x,
        y: origin.y,
        texture: GENERATED.bulletSquare,
        angle: aim + t * SPREAD + offset,
        speed: 215,
        spin: 140,
      });
    }
  });
};
