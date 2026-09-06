import Phaser from 'phaser';
import { GENERATED } from '../config/AssetKeys';
import { DEPTH, TILE_SIZE } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { cellToWorld } from '../systems/WangRoomBuilder';
import type { Cell } from '../types';

/**
 * Punto de guardado.
 *
 * Interactuar con el guarda la partida en localStorage Y cura el HP al maximo.
 * Es el unico lugar donde se guarda, y es el punto al que vuelve el jugador
 * despues de un Game Over.
 *
 * TODO(arte): el sprite es procedural (ver createGeneratedTextures). En cuanto
 * exista un save_point.png real, cargalo en PreloadScene y cambia la key.
 */
export class SavePoint extends Phaser.Physics.Arcade.Sprite {
  private readonly prompt: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, cell: Cell) {
    const pos = cellToWorld(cell.cx, cell.cy);
    super(scene, pos.x, pos.y, GENERATED.savePoint);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setDepth(DEPTH.entities - 1);
    this.setScale(1.4);

    // Latido del nucleo: hace obvio que es interactuable sin poner un cartel.
    scene.tweens.add({
      targets: this,
      alpha: 0.72,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.prompt = scene.add
      .text(pos.x, pos.y - TILE_SIZE, '[E] GUARDAR', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: css(Palette.white),
        backgroundColor: css(Palette.black),
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.overlay)
      .setVisible(false);
  }

  showPrompt(visible: boolean): void {
    this.prompt.setVisible(visible);
  }

  override destroy(fromScene?: boolean): void {
    this.prompt.destroy();
    super.destroy(fromScene);
  }
}
