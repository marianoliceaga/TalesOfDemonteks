import Phaser from 'phaser';
import { GENERATED } from '../../config/AssetKeys';
import { Palette } from '../../config/Palette';
import type { PatternFn } from '../BulletPatterns';

/**
 * "Teledirigido" — REY DEMONTEK.
 * Lanzas que aparecen en un borde, se quedan un instante apuntando (telegrafia)
 * y recien despues salen disparadas hacia donde estaba el jugador. No persiguen:
 * fijan el objetivo al disparar, asi que se esquivan moviendose tarde.
 */
export const homingPattern: PatternFn = ({ scene, box, spawn, playerPos, every, after, track }) => {
  const TELEGRAPH_MS = 380;

  const edgePoint = (): { x: number; y: number } => {
    switch (Phaser.Math.Between(0, 3)) {
      case 0:
        return { x: Phaser.Math.Between(box.left, box.right), y: box.top - 16 };
      case 1:
        return { x: Phaser.Math.Between(box.left, box.right), y: box.bottom + 16 };
      case 2:
        return { x: box.left - 16, y: Phaser.Math.Between(box.top, box.bottom) };
      default:
        return { x: box.right + 16, y: Phaser.Math.Between(box.top, box.bottom) };
    }
  };

  every(430, () => {
    const from = edgePoint();

    // Telegrafia: una marca que parpadea donde va a salir la lanza.
    const warning = scene.add
      .rectangle(from.x, from.y, 16, 16, Palette.danger, 0.85)
      .setDepth(1200)
      .setScrollFactor(0);
    scene.tweens.add({ targets: warning, alpha: 0.15, duration: 120, yoyo: true, repeat: -1 });
    track(warning);

    after(TELEGRAPH_MS, () => {
      warning.destroy();
      const target = playerPos();
      spawn({
        x: from.x,
        y: from.y,
        texture: GENERATED.bulletLong,
        angle: Phaser.Math.Angle.Between(from.x, from.y, target.x, target.y),
        speed: 330,
        faceDirection: true,
        tint: Palette.white,
      });
    });
  });
};
