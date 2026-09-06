import Phaser from 'phaser';
import { GENERATED } from '../../config/AssetKeys';
import { Palette } from '../../config/Palette';
import type { PatternFn } from '../BulletPatterns';

/**
 * "Espiral" — GOLIATH.
 * Un emisor en el centro que gira y escupe proyectiles de a dos brazos
 * opuestos. Se esquiva moviendose en circulo, no quedandose quieto.
 */
export const spiralPattern: PatternFn = ({ box, spawn, every }) => {
  const ARMS = 2;
  const STEP = Phaser.Math.DegToRad(23);
  let angle = 0;

  every(70, () => {
    for (let arm = 0; arm < ARMS; arm++) {
      spawn({
        x: box.centerX,
        y: box.centerY,
        texture: GENERATED.bulletRound,
        angle: angle + (arm * Math.PI * 2) / ARMS,
        speed: 165,
        tint: arm === 0 ? Palette.white : Palette.violet,
      });
    }
    angle += STEP;
  });
};
