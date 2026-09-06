import Phaser from 'phaser';
import type { MoveInput } from '../entities/Player';
import { virtualInput, type PressCounts, type VirtualKey } from './VirtualInput';

/**
 * Teclado y tactil, en un solo lugar.
 *
 * Todas las escenas usan el mismo mapa de teclas, asi que conviene tenerlo
 * declarado una vez y no repartido en cada `create()`:
 *
 *   mover     flechas / WASD
 *   accion    E / ESPACIO / ENTER   (interactuar, avanzar dialogo, confirmar)
 *   cancelar  X / BACKSPACE          (volver en un submenu)
 *   pausa     ESC / P
 *
 * En celular las mismas acciones llegan desde TouchScene a traves de
 * `virtualInput`. Las escenas no distinguen una fuente de la otra: preguntan
 * `justAction()` y listo.
 */
export class InputController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  /**
   * Cuantas pulsaciones tactiles vio ya este controlador. Arranca con la foto
   * actual: una escena que nace despues de un toque no tiene por que heredarlo.
   */
  private readonly seen: PressCounts = virtualInput.counts();

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
    const touch = virtualInput.move;
    return {
      up: this.cursors.up.isDown || !!this.key('W')?.isDown || touch.up,
      down: this.cursors.down.isDown || !!this.key('S')?.isDown || touch.down,
      left: this.cursors.left.isDown || !!this.key('A')?.isDown || touch.left,
      right: this.cursors.right.isDown || !!this.key('D')?.isDown || touch.right,
    };
  }

  private static justDown(...keys: Array<Phaser.Input.Keyboard.Key | undefined>): boolean {
    return keys.some((k) => k !== undefined && Phaser.Input.Keyboard.JustDown(k));
  }

  /** Una pulsacion tactil nueva desde la ultima vez que se pregunto por esta tecla. */
  private touched(key: VirtualKey): boolean {
    const count = virtualInput.pressCount(key);
    if (count === this.seen[key]) return false;
    this.seen[key] = count;
    return true;
  }

  /**
   * Las dos fuentes se evaluan siempre, sin cortocircuito: `||` se saltearia el
   * consumo de la pulsacion tactil cuando el teclado ya dio true, y esa
   * pulsacion sin consumir dispararia sola en el frame siguiente.
   */
  private just(virtual: VirtualKey, ...keys: Array<Phaser.Input.Keyboard.Key | undefined>): boolean {
    const fromKeyboard = InputController.justDown(...keys);
    const fromTouch = this.touched(virtual);
    return fromKeyboard || fromTouch;
  }

  /** Interactuar / confirmar / avanzar dialogo. */
  justAction(): boolean {
    return this.just('action', this.key('E'), this.key('SPACE'), this.key('ENTER'));
  }

  justCancel(): boolean {
    return this.just('cancel', this.key('X'), this.key('BACKSPACE'));
  }

  justPause(): boolean {
    return this.just('pause', this.key('ESC'), this.key('P'));
  }

  justUp(): boolean {
    return this.just('up', this.cursors.up, this.key('W'));
  }

  justDownKey(): boolean {
    return this.just('down', this.cursors.down, this.key('S'));
  }

  justLeft(): boolean {
    return this.just('left', this.cursors.left, this.key('A'));
  }

  justRight(): boolean {
    return this.just('right', this.cursors.right, this.key('D'));
  }
}
