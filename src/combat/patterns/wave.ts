import Phaser from 'phaser';
import { GENERATED } from '../../config/AssetKeys';
import type { PatternFn } from '../BulletPatterns';

/**
 * "Onda" — MUTANTE DEMONTEK.
 * Proyectiles que cruzan horizontalmente describiendo una senoidal. Alternan
 * de lado, asi que no alcanza con quedarse pegado a un borde.
 */
export const wavePattern: PatternFn = ({ scene, box, spawn, every }) => {
  let fromLeft = true;

  every(240, () => {
    const y = Phaser.Math.Between(box.top + 40, box.bottom - 40);
    const x = fromLeft ? box.left - 20 : box.right + 20;
    const vx = fromLeft ? 230 : -230;
    fromLeft = !fromLeft;

    spawn({
      x,
      y,
      texture: GENERATED.bulletRound,
      vx,
      // La componente vertical no es velocidad sino un tween: asi la curva es
      // una senoidal limpia y no un movimiento parabolico.
      onCreated: (bullet) => {
        scene.tweens.add({
          targets: bullet,
          y: y + Phaser.Math.Between(50, 80) * (Math.random() < 0.5 ? 1 : -1),
          duration: 520,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      },
    });
  });
};
