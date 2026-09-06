import Phaser from 'phaser';
import { TOUCH } from '../config/AssetKeys';
import { BASE_HEIGHT, viewWidth } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { virtualInput } from '../systems/VirtualInput';

/**
 * Controles tactiles. Corre encima de todo y nunca se detiene.
 *
 * Esquema:
 *   mitad izquierda   joystick flotante: aparece donde apoyas el pulgar
 *   mitad derecha     tocar = accion (interactuar, confirmar, avanzar dialogo)
 *   arriba a derecha  pausa y volver
 *
 * El joystick es flotante y no fijo a proposito: la caja de dialogo ocupa toda
 * la franja de abajo y la caja de combate el centro, asi que no queda lugar
 * libre para una cruceta permanente. Flotante no ocupa nada mientras no lo usas
 * y ademas aparece siempre bajo el dedo, que se banca mejor las pantallas de
 * cualquier tamano.
 *
 * Inclinar el stick tambien navega menues: `VirtualInput` convierte entrar en
 * una direccion en una pulsacion, equivalente a un toque de flecha.
 */

/** Radio del anillo del joystick. */
const STICK_RADIUS = 74;
const KNOB_RADIUS = 32;
/** Debajo de esto el dedo cuenta como centrado (evita caminar sin querer). */
const DEAD_ZONE = 16;

/** Botones chicos de la esquina, en una zona que ninguna escena usa. */
const CORNER_SIZE = 60;

interface Spot {
  x: number;
  y: number;
}

/**
 * Posiciones de los botones, ancladas al borde derecho.
 *
 * Se calculan en `create()` y no a nivel de modulo porque el ancho de vista se
 * decide al arrancar: una constante de modulo se evaluaria al importar, cuando
 * `viewWidth()` todavia devuelve el ancho de diseno.
 */
function cornerSpots(): { pause: Spot; cancel: Spot; actionHint: Spot } {
  const right = viewWidth();
  return {
    pause: { x: right - 46, y: 44 },
    cancel: { x: right - 116, y: 44 },
    // Pista de "aca se toca para accionar": fuera de la caja de dialogo y de la
    // de combate.
    actionHint: { x: right - 52, y: 300 },
  };
}

const IDLE_ALPHA = 0.42;

export class TouchScene extends Phaser.Scene {
  private ring!: Phaser.GameObjects.Arc;
  private knob!: Phaser.GameObjects.Arc;
  private actionHint!: Phaser.GameObjects.Container;
  private pauseButton!: Phaser.GameObjects.Container;
  private cancelButton!: Phaser.GameObjects.Container;

  /** Puntero que esta manejando el joystick, o null si no hay ninguno. */
  private stickPointer: number | null = null;
  private stickOrigin = new Phaser.Math.Vector2();

  private spots = cornerSpots();

  constructor() {
    super('Touch');
  }

  create(): void {
    this.spots = cornerSpots();

    this.buildStick();
    this.actionHint = this.buildButton(this.spots.actionHint, TOUCH.action.key, 'A');
    this.pauseButton = this.buildButton(this.spots.pause, TOUCH.pause.key, 'II');
    this.cancelButton = this.buildButton(this.spots.cancel, null, '<');

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);

    // Ultima en la lista de escenas, pero las que arrancan despues se dibujan
    // encima si no lo pedimos explicitamente.
    this.scene.bringToTop();
  }

  /* ---------------------------- construccion ---------------------------- */

  private buildStick(): void {
    this.ring = this.add
      .circle(0, 0, STICK_RADIUS, Palette.black, 0.35)
      .setStrokeStyle(3, Palette.white, 0.45)
      .setVisible(false);
    this.knob = this.add
      .circle(0, 0, KNOB_RADIUS, Palette.violet, 0.75)
      .setStrokeStyle(2, Palette.white, 0.6)
      .setVisible(false);
  }

  /**
   * Boton de esquina. Usa el arte de `Assets/UI/` cuando existe y cae en un
   * circulo con una letra cuando no (no hay PNG para "volver").
   */
  private buildButton(
    pos: Spot,
    textureKey: string | null,
    glyph: string,
  ): Phaser.GameObjects.Container {
    const parts: Phaser.GameObjects.GameObject[] = [];

    if (textureKey !== null && this.textures.exists(textureKey)) {
      const icon = this.add.image(0, 0, textureKey);
      // Los PNG son de 45x45; escalar por entero para que no se ensucie.
      icon.setScale(Math.max(1, Math.floor(CORNER_SIZE / icon.width)));
      parts.push(icon);
    } else {
      parts.push(
        this.add.circle(0, 0, CORNER_SIZE / 2, Palette.black, 0.55).setStrokeStyle(3, Palette.white, 0.5),
        this.add
          .text(0, 1, glyph, {
            fontFamily: FONT_FAMILY,
            fontSize: '18px',
            color: css(Palette.white),
          })
          .setOrigin(0.5),
      );
    }

    return this.add.container(pos.x, pos.y, parts).setAlpha(IDLE_ALPHA);
  }

  /* ------------------------------- punteros ------------------------------ */

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.hits(this.spots.pause, pointer)) {
      virtualInput.press('pause');
      this.flash(this.pauseButton);
      return;
    }
    if (this.hits(this.spots.cancel, pointer)) {
      virtualInput.press('cancel');
      this.flash(this.cancelButton);
      return;
    }

    if (pointer.x > viewWidth() / 2) {
      virtualInput.press('action');
      this.flash(this.actionHint);
      return;
    }

    // Un segundo dedo en la izquierda no roba el joystick al primero.
    if (this.stickPointer !== null) return;
    this.stickPointer = pointer.id;
    this.stickOrigin.set(
      Phaser.Math.Clamp(pointer.x, STICK_RADIUS + 8, viewWidth() / 2 - 8),
      Phaser.Math.Clamp(pointer.y, STICK_RADIUS + 8, BASE_HEIGHT - STICK_RADIUS - 8),
    );
    this.ring.setPosition(this.stickOrigin.x, this.stickOrigin.y).setVisible(true);
    this.updateStick(pointer);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointer) return;
    this.updateStick(pointer);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointer) return;
    this.stickPointer = null;
    virtualInput.releaseAxis();
    this.ring.setVisible(false);
    this.knob.setVisible(false);
  }

  private updateStick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.stickOrigin.x;
    const dy = pointer.y - this.stickOrigin.y;
    const distance = Math.hypot(dx, dy);

    if (distance < DEAD_ZONE) {
      virtualInput.releaseAxis();
      this.knob.setPosition(this.stickOrigin.x, this.stickOrigin.y).setVisible(true);
      return;
    }

    // El pomo se queda en el borde del anillo aunque el dedo se vaya mas lejos:
    // asi se sigue viendo la direccion sin que el control se escape de pantalla.
    const clamped = Math.min(distance, STICK_RADIUS);
    const nx = dx / distance;
    const ny = dy / distance;
    this.knob
      .setPosition(this.stickOrigin.x + nx * clamped, this.stickOrigin.y + ny * clamped)
      .setVisible(true);

    virtualInput.setAxis(nx, ny);
  }

  private hits(pos: Spot, pointer: Phaser.Input.Pointer): boolean {
    const half = CORNER_SIZE / 2 + 10; // margen extra: el dedo no es un pixel
    return Math.abs(pointer.x - pos.x) <= half && Math.abs(pointer.y - pos.y) <= half;
  }

  private flash(target: Phaser.GameObjects.Container): void {
    this.tweens.killTweensOf(target);
    target.setAlpha(1).setScale(1.15);
    this.tweens.add({
      targets: target,
      alpha: IDLE_ALPHA,
      scale: 1,
      duration: 220,
      ease: 'Quad.Out',
    });
  }
}
