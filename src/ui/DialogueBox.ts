import Phaser from 'phaser';
import { BASE_HEIGHT, DEPTH, viewWidth } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { killTweens } from '../systems/tweens';

export interface DialogueBoxOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** ms por caracter del efecto typewriter. */
  charDelay?: number;
  fontSize?: number;
}

/**
 * Caja de dialogo estilo RPG retro: rectangulo blanco, borde negro grueso,
 * texto negro que aparece letra por letra y un triangulo que parpadea cuando
 * la linea termino y se puede avanzar.
 *
 * No escucha teclas por su cuenta: la escena que la usa le manda `advance()`.
 * Asi la misma caja sirve en exploracion y dentro del combate sin pelearse por
 * el input.
 */
export class DialogueBox {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Graphics;

  private lines: string[] = [];
  private lineIndex = 0;
  private fullLine = '';
  private charIndex = 0;
  private typing = false;
  private typeEvent?: Phaser.Time.TimerEvent;
  private onDone?: () => void;

  private readonly charDelay: number;

  constructor(scene: Phaser.Scene, options: DialogueBoxOptions = {}) {
    this.scene = scene;
    this.charDelay = options.charDelay ?? 26;

    const width = options.width ?? viewWidth() - 80;
    const height = options.height ?? 150;
    const x = options.x ?? 40;
    const y = options.y ?? BASE_HEIGHT - height - 28;
    const border = 6;
    const pad = 22;

    const bg = scene.add.graphics();
    bg.fillStyle(Palette.black, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(Palette.white, 1);
    bg.fillRect(border, border, width - border * 2, height - border * 2);

    this.text = scene.add.text(pad, pad, '', {
      fontFamily: FONT_FAMILY,
      fontSize: `${options.fontSize ?? 15}px`,
      color: css(Palette.black),
      wordWrap: { width: width - pad * 2 },
      lineSpacing: 10,
    });

    this.arrow = scene.add.graphics();
    this.arrow.fillStyle(Palette.black, 1);
    this.arrow.fillTriangle(0, 0, 14, 0, 7, 11);
    this.arrow.setPosition(width - 34, height - 30);
    this.arrow.setVisible(false);

    this.container = scene.add.container(x, y, [bg, this.text, this.arrow]);
    this.container.setScrollFactor(0);
    this.container.setDepth(DEPTH.ui);
    this.container.setVisible(false);
  }

  get isOpen(): boolean {
    return this.container.visible;
  }

  /** true mientras se esta escribiendo la linea actual. */
  get isTyping(): boolean {
    return this.typing;
  }

  show(lines: string[], onDone?: () => void): void {
    if (lines.length === 0) {
      onDone?.();
      return;
    }
    this.lines = lines;
    this.lineIndex = 0;
    this.onDone = onDone;
    this.container.setVisible(true);
    this.startLine(lines[0]!);
  }

  /**
   * Avanza: si todavia esta escribiendo, completa la linea de golpe; si no,
   * pasa a la siguiente (o cierra).
   */
  advance(): void {
    if (!this.isOpen) return;
    if (this.typing) {
      this.finishLine();
      return;
    }
    this.lineIndex++;
    const next = this.lines[this.lineIndex];
    if (next === undefined) {
      this.close();
      return;
    }
    this.startLine(next);
  }

  close(): void {
    this.stopTyping();
    this.container.setVisible(false);
    this.arrow.setVisible(false);
    this.stopArrow();
    const done = this.onDone;
    this.onDone = undefined;
    this.lines = [];
    done?.();
  }

  destroy(): void {
    this.stopTyping();
    this.stopArrow();
    this.container.destroy();
  }

  /** El parpadeo se cancela por target, no guardando la referencia. */
  private stopArrow(): void {
    killTweens(this.scene, this.arrow);
  }

  private startLine(line: string): void {
    this.stopTyping();
    this.fullLine = line;
    this.charIndex = 0;
    this.typing = true;
    this.text.setText('');
    this.arrow.setVisible(false);
    this.stopArrow();

    this.typeEvent = this.scene.time.addEvent({
      delay: this.charDelay,
      repeat: line.length - 1,
      callback: () => {
        this.charIndex++;
        this.text.setText(this.fullLine.slice(0, this.charIndex));
        if (this.charIndex >= this.fullLine.length) this.finishLine();
      },
    });
  }

  private finishLine(): void {
    this.stopTyping();
    this.text.setText(this.fullLine);
    this.arrow.setVisible(true);
    this.arrow.setAlpha(1);
    this.scene.tweens.add({
      targets: this.arrow,
      alpha: 0.1,
      duration: 420,
      yoyo: true,
      repeat: -1,
    });
  }

  private stopTyping(): void {
    this.typing = false;
    this.typeEvent?.remove();
    this.typeEvent = undefined;
  }
}
