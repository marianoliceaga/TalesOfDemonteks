import Phaser from 'phaser';
import { GENERATED } from '../../config/AssetKeys';
import { Palette } from '../../config/Palette';
import type { PatternFn } from '../BulletPatterns';

/**
 * "Lluvia" — DEMONTEK.
 * Proyectiles que caen desde arriba en columnas al azar, cada vez mas seguido.
 * El patron mas simple del juego: sirve de tutorial de la fase de esquive.
 */
export const rainPattern: PatternFn = ({ box, spawn, every, duration, after }) => {
  const drop = (count: number): void => {
    for (let i = 0; i < count; i++) {
      spawn({
        x: Phaser.Math.Between(box.left + 12, box.right - 12),
        y: box.top - 20,
        texture: GENERATED.bulletSquare,
        vy: Phaser.Math.Between(190, 250),
        spin: 90,
        tint: Palette.white,
      });
    }
  };

  every(300, () => drop(1));
  // Segunda mitad: mas densidad, para que la fase escale.
  after(duration / 2, () => every(260, () => drop(2)));
};
