import Phaser from 'phaser';
import type { MoveInput } from '../entities/Player';

/**
 * Teclado, en un solo lugar.
 *
 * Todas las escenas usan el mismo mapa de teclas, asi que conviene tenerlo
 * declarado una vez y no repartido en cada `create()`:
 *
 *   mover     flechas / WASD
 *   accion    E / ESPACIO / ENTER   (interactuar, avanzar dialogo, confirmar)
 *   cancelar  X / BACKSPACE          (volver en un submenu)
 *   pausa     ESC / P
 */
export class InputController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Esta escena necesita teclado y no hay plugin de teclado activo');

    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys(
      'W,A,S,D,E,SPACE,ENTER,ESC,P,X,BACKSPACE',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private key(name: string): Phaser.Input.Keyboard.Key | undefined {
    return this.keys[name];
  }

  get move(): MoveInput {
    return {
      up: this.cursors.up.isDown || !!this.key('W')?.isDown,
      down: this.cursors.down.isDown || !!this.key('S')?.isDown,
      left: this.cursors.left.isDown || !!this.key('A')?.isDown,
      right: this.cursors.right.isDown || !!this.key('D')?.isDown,
    };
  }

  private static justDown(...keys: Array<Phaser.Input.Keyboard.Key | undefined>): boolean {
    return keys.some((k) => k !== undefined && Phaser.Input.Keyboard.JustDown(k));
  }

  /** Interactuar / confirmar / avanzar dialogo. */
  justAction(): boolean {
    return InputController.justDown(this.key('E'), this.key('SPACE'), this.key('ENTER'));
  }

  justCancel(): boolean {
    return InputController.justDown(this.key('X'), this.key('BACKSPACE'));
  }

  justPause(): boolean {
    return InputController.justDown(this.key('ESC'), this.key('P'));
  }

  justUp(): boolean {
    return InputController.justDown(this.cursors.up, this.key('W'));
  }

  justDownKey(): boolean {
    return InputController.justDown(this.cursors.down, this.key('S'));
  }

  justLeft(): boolean {
    return InputController.justDown(this.cursors.left, this.key('A'));
  }

  justRight(): boolean {
    return InputController.justDown(this.cursors.right, this.key('D'));
  }
}
