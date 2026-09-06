import Phaser from 'phaser';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { getRoom } from '../data/rooms';
import { gameState } from '../systems/GameState';
import { virtualInput } from '../systems/VirtualInput';
import { HealthBar } from '../ui/HealthBar';

/** Ver el comentario de `controlsHint()` en MainMenuScene: no puede ser constante. */
function pauseHint(): string {
  return virtualInput.enabled ? 'pausa: boton II' : '[ESC] pausa';
}

/**
 * HUD de exploracion: HP y nombre de la sala.
 *
 * Corre como escena aparte, encima de RoomScene, para que sobreviva a los
 * `scene.restart` de los cambios de sala. Se esconde sola durante el combate y
 * la pausa, que dibujan su propia UI.
 */
export class HudScene extends Phaser.Scene {
  private bar!: HealthBar;
  private roomLabel!: Phaser.GameObjects.Text;
  private itemsLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('Hud');
  }

  create(): void {
    // Arriba a la izquierda: abajo lo tapaba la caja de dialogo.
    this.bar = new HealthBar(this, 28, 62, { width: 190 });

    this.roomLabel = this.add.text(24, 22, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: css(Palette.white),
      backgroundColor: css(Palette.black),
      padding: { x: 8, y: 6 },
    });

    this.itemsLabel = this.add
      .text(28, 92, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: css(Palette.grey),
      });
  }

  override update(): void {
    // El combate y la pausa dibujan su propia interfaz: el HUD estorba.
    const hidden = this.scene.isActive('Battle') || this.scene.isActive('Pause');
    this.bar.setVisible(!hidden);
    this.roomLabel.setVisible(!hidden);
    this.itemsLabel.setVisible(!hidden);
    if (hidden) return;

    this.bar.set(gameState.hp, gameState.maxHp);
    this.roomLabel.setText(getRoom(gameState.currentRoom).name);
    this.itemsLabel.setText(`KITS: ${gameState.totalItems}   ${pauseHint()}`);
  }
}
