import type { MoveInput } from '../entities/Player';

/**
 * Estado del control tactil, compartido por todas las escenas.
 *
 * TouchScene escribe aca y InputController lee, asi ninguna escena se entera de
 * que existe el tactil: siguen preguntando `justAction()` como siempre.
 *
 * Las pulsaciones se cuentan en vez de guardarse como un booleano "recien
 * apretado". Un booleano se lo come el primer lector y las demas escenas que
 * miran el mismo frame se quedan sin el; con un contador cada InputController
 * recuerda cuantas vio y consume la suya. Es el mismo comportamiento que
 * `Phaser.Input.Keyboard.JustDown`, que tambien consume.
 */

export type VirtualKey = 'up' | 'down' | 'left' | 'right' | 'action' | 'cancel' | 'pause';

export type PressCounts = Record<VirtualKey, number>;

type Axis = 'up' | 'down' | 'left' | 'right';

/** Cuanto hay que inclinar el stick para que un eje cuente como apretado. */
const AXIS_THRESHOLD = 0.38;

/**
 * Si conviene mostrar controles tactiles.
 *
 * `pointer: coarse` es el dato que importa: un notebook con pantalla tactil
 * pero con mouse reporta `fine` y no necesita joystick en pantalla.
 *
 * `?touch=1` fuerza el modo tactil y `?touch=0` lo apaga: sirve para probar los
 * controles desde la compu sin tener que abrir el juego en el celular.
 */
export function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('touch');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

class VirtualInput {
  private on = false;
  private readonly held: Record<Axis, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private readonly presses: PressCounts = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    action: 0,
    cancel: 0,
    pause: 0,
  };

  get enabled(): boolean {
    return this.on;
  }

  enable(): void {
    this.on = true;
  }

  get move(): MoveInput {
    return { ...this.held };
  }

  /** Foto de los contadores, para que un lector nuevo no vea pulsaciones viejas. */
  counts(): PressCounts {
    return { ...this.presses };
  }

  pressCount(key: VirtualKey): number {
    return this.presses[key];
  }

  press(key: VirtualKey): void {
    this.presses[key] += 1;
  }

  /**
   * Inclinacion del joystick, ya normalizada a [-1, 1] en cada eje.
   *
   * Entrar en una direccion cuenta como pulsacion: es lo que hace que el stick
   * sirva para navegar menues, no solo para caminar.
   */
  setAxis(x: number, y: number): void {
    this.setHeld('left', x <= -AXIS_THRESHOLD);
    this.setHeld('right', x >= AXIS_THRESHOLD);
    this.setHeld('up', y <= -AXIS_THRESHOLD);
    this.setHeld('down', y >= AXIS_THRESHOLD);
  }

  /** Suelta todas las direcciones (el dedo se levanto o entro en la zona muerta). */
  releaseAxis(): void {
    this.setHeld('left', false);
    this.setHeld('right', false);
    this.setHeld('up', false);
    this.setHeld('down', false);
  }

  private setHeld(axis: Axis, down: boolean): void {
    if (down && !this.held[axis]) this.presses[axis] += 1;
    this.held[axis] = down;
  }
}

export const virtualInput = new VirtualInput();
