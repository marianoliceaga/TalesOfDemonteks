import Phaser from 'phaser';
import { DEPTH } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { killTweens } from '../systems/tweens';

export interface TimingResult {
  /** true si el marcador cayo dentro de la zona objetivo. */
  hit: boolean;
  /** 0..1, cuanto se acerco al centro exacto. Multiplica el dano. */
  accuracy: number;
}

export interface TimingBarOptions {
  width?: number;
  height?: number;
  /** Segundos que tarda el marcador en cruzar la barra de punta a punta. */
  sweepSeconds?: number;
  /** Ancho de la zona objetivo como fraccion del ancho total (0..1). */
  targetRatio?: number;
}

/**
 * Barra de timing del FIGHT.
 *
 * Un marcador va y viene sobre la barra; el jugador presiona la tecla de accion
 * para frenarlo. Cuanto mas cerca del centro, mas dano.
 *
 * Es generica a proposito: no sabe nada del enemigo. Cada EnemyDef aporta su
 * `fightBaseDamage` y BattleScene multiplica por la `accuracy` que devuelve
 * esta clase. Un enemigo nuevo no necesita tocar este archivo.
 */
export class TimingBar {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly marker: Phaser.GameObjects.Rectangle;
  private readonly resultText: Phaser.GameObjects.Text;
  private readonly width: number;
  private readonly targetHalf: number;
  private readonly sweepSeconds: number;

  private running = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: TimingBarOptions = {}) {
    this.scene = scene;
    this.width = options.width ?? 460;
    const height = options.height ?? 34;
    this.sweepSeconds = options.sweepSeconds ?? 1.15;
    const targetRatio = options.targetRatio ?? 0.16;
    this.targetHalf = (this.width * targetRatio) / 2;

    const border = 4;
    const frame = scene.add.graphics();
    frame.fillStyle(Palette.white, 1);
    frame.fillRect(-border, -border, this.width + border * 2, height + border * 2);
    frame.fillStyle(Palette.black, 1);
    frame.fillRect(0, 0, this.width, height);

    // Zona objetivo: verde al centro, amarilla en los bordes de la zona.
    const center = this.width / 2;
    frame.fillStyle(Palette.hpYellow, 0.55);
    frame.fillRect(center - this.targetHalf, 0, this.targetHalf * 2, height);
    frame.fillStyle(Palette.hpGreen, 0.85);
    frame.fillRect(center - this.targetHalf * 0.34, 0, this.targetHalf * 0.68, height);

    this.marker = scene.add.rectangle(0, height / 2, 6, height + 14, Palette.white).setOrigin(0.5, 0.5);

    this.resultText = scene.add
      .text(center, -30, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: css(Palette.white),
      })
      .setOrigin(0.5, 1);

    this.container = scene.add.container(x, y, [frame, this.marker, this.resultText]);
    this.container.setScrollFactor(0);
    this.container.setDepth(DEPTH.ui + 1);
    this.container.setVisible(false);
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    this.container.setVisible(true);
    this.resultText.setText('');
    this.running = true;
    this.marker.x = 0;
    this.stopTween();
    this.scene.tweens.add({
      targets: this.marker,
      x: this.width,
      duration: this.sweepSeconds * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
    });
  }

  /** Frena el marcador y devuelve el resultado. Solo vale si estaba corriendo. */
  stop(): TimingResult {
    if (!this.running) return { hit: false, accuracy: 0 };
    this.running = false;
    this.stopTween();

    const center = this.width / 2;
    const distance = Math.abs(this.marker.x - center);
    const hit = distance <= this.targetHalf;
    // Fuera de la zona la precision es 0: no hay dano "de consuelo".
    const accuracy = hit ? 1 - distance / this.targetHalf : 0;

    this.resultText.setText(hit ? (accuracy > 0.75 ? 'PERFECTO' : 'IMPACTO') : 'FALLASTE');
    this.resultText.setColor(css(hit ? Palette.hpGreen : Palette.danger));
    this.marker.setFillStyle(hit ? Palette.hpGreen : Palette.danger);

    return { hit, accuracy };
  }

  hide(): void {
    this.stopTween();
    this.running = false;
    this.marker.setFillStyle(Palette.white);
    this.container.setVisible(false);
  }

  destroy(): void {
    this.stopTween();
    this.container.destroy();
  }

  /** El tween del marcador se cancela por target, no guardando la referencia. */
  private stopTween(): void {
    killTweens(this.scene, this.marker);
  }
}
