import Phaser from 'phaser';
import { DEPTH } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';

/**
 * Barra de HP. Se usa igual en el HUD de exploracion y dentro de la caja de
 * combate, por eso vive en ui/ y no en ninguna escena.
 *
 * El color cambia por tramos (verde > amarillo > rojo): en pixel-art se lee
 * mucho mejor que un gradiente.
 */
export class HealthBar {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly barWidth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: { width?: number; height?: number; showLabel?: boolean } = {},
  ) {
    this.barWidth = options.width ?? 180;
    const height = options.height ?? 18;
    const border = 3;

    const frame = scene.add.graphics();
    frame.fillStyle(Palette.black, 1);
    frame.fillRect(-border, -border, this.barWidth + border * 2, height + border * 2);
    frame.fillStyle(Palette.darkGrey, 1);
    frame.fillRect(0, 0, this.barWidth, height);

    this.fill = scene.add.rectangle(0, 0, this.barWidth, height, Palette.hpGreen).setOrigin(0, 0);

    this.label = scene.add.text(this.barWidth + 14, -2, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: css(Palette.white),
    });
    this.label.setVisible(options.showLabel !== false);

    this.container = scene.add.container(x, y, [frame, this.fill, this.label]);
    this.container.setScrollFactor(0);
    this.container.setDepth(DEPTH.ui);
  }

  set(hp: number, maxHp: number): void {
    const ratio = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    // Redondear a pixel entero evita que la barra "tiemble" al escalar.
    this.fill.width = Math.max(0, Math.round(this.barWidth * ratio));
    this.fill.setFillStyle(ratio > 0.5 ? Palette.hpGreen : ratio > 0.25 ? Palette.hpYellow : Palette.hpRed);
    this.label.setText(`${Math.max(0, Math.ceil(hp))}/${maxHp}`);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  destroy(): void {
    this.container.destroy();
  }
}
