import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { cellToWorld } from '../systems/WangRoomBuilder';
import type { DoorSpawn } from '../types';

/**
 * Puerta entre salas.
 *
 * Es una zona de fisica (sin sprite propio) con un marco dibujado encima y el
 * nombre del destino, para que se entienda a donde lleva antes de cruzarla.
 *
 * Ojo con el reingreso: al llegar a una sala el jugador puede aparecer encima
 * de la puerta por la que volveria. Por eso RoomScene exige que el jugador
 * DEJE de solaparla al menos una vez antes de que la puerta pueda dispararse
 * (ver `armed`).
 */
export class Door extends Phaser.GameObjects.Zone {
  readonly spec: DoorSpawn;
  /** false hasta que el jugador sale del solape por primera vez. */
  armed = false;

  private readonly visual: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, spec: DoorSpawn) {
    const pos = cellToWorld(spec.cx, spec.cy);
    super(scene, pos.x, pos.y, TILE_SIZE * 0.8, TILE_SIZE * 0.8);
    this.spec = spec;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    const frame = scene.add.graphics();
    frame.lineStyle(4, Palette.violet, 1);
    frame.strokeRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    frame.fillStyle(Palette.violetDark, 0.45);
    frame.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);

    const label = scene.add
      .text(0, -TILE_SIZE / 2 - 8, spec.label ?? 'SALIDA', {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: css(Palette.white),
        backgroundColor: css(Palette.black),
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5, 1);

    this.visual = scene.add.container(pos.x, pos.y, [frame, label]);
    this.visual.setDepth(DEPTH.decor);

    scene.tweens.add({
      targets: frame,
      alpha: 0.45,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  override destroy(fromScene?: boolean): void {
    this.visual.destroy();
    super.destroy(fromScene);
  }
}
