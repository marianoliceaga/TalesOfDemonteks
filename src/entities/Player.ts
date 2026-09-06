import Phaser from 'phaser';
import { charSheet, type Direction } from '../config/AssetKeys';
import { CHAR_SCALE, DEPTH, PLAYER_BODY, PLAYER_SPEED } from '../config/GameConfig';
import { playerAnim } from '../systems/AnimationFactory';

export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * The Explorer.
 *
 * Movimiento estilo Undertale: velocidad constante, sin aceleracion ni inercia.
 * Se permiten diagonales (con la velocidad normalizada para que no sean mas
 * rapidas), pero la direccion "a la que mira" siempre se resuelve a una de las
 * 4 cardinales, porque eso es lo unico que existe en los sprites.
 *
 * Cuando se queda quieto conserva la ultima direccion de movimiento.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Direction = 'south';
  /** Mientras esta bloqueado ignora el input (dialogos, transiciones). */
  locked = false;

  private speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, speed = PLAYER_SPEED) {
    // La textura inicial es la del idle mirando al frente; las animaciones
    // cambian de spritesheet segun la direccion.
    super(scene, x, y, charSheet('explorer', 'breathing-idle', 'south').key, 0);
    this.speed = speed;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(CHAR_SCALE);
    this.setDepth(DEPTH.entities);
    this.setOrigin(0.5, 0.5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_BODY.width, PLAYER_BODY.height);
    body.setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY);
    body.setCollideWorldBounds(true);

    this.play(playerAnim('idle', this.facing));
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /** Llamar desde el update de la escena con el estado del input. */
  handleInput(input: MoveInput): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.locked) {
      body.setVelocity(0, 0);
      this.playIdle();
      return;
    }

    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    if (dx === 0 && dy === 0) {
      body.setVelocity(0, 0);
      this.playIdle();
      return;
    }

    // Normalizar: en diagonal la velocidad total tiene que ser la misma.
    const inv = dx !== 0 && dy !== 0 ? Math.SQRT1_2 : 1;
    body.setVelocity(dx * this.speed * inv, dy * this.speed * inv);

    // El eje horizontal manda para elegir el sprite: en top-down se lee mejor.
    this.facing = dx !== 0 ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north';
    this.playWalk();
  }

  /** Corta el movimiento y deja al personaje en idle. */
  halt(): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.playIdle();
  }

  /** Animacion de ataque (se usa en la caja de combate, al acertar el FIGHT). */
  playAttack(onComplete?: () => void): void {
    this.play(playerAnim('attack', this.facing), true);
    if (onComplete) this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
  }

  /** Animacion de golpe recibido + parpadeo. */
  playHurt(): void {
    this.play(playerAnim('hurt', this.facing), true);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.setAlpha(1),
    });
  }

  private playIdle(): void {
    const key = playerAnim('idle', this.facing);
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
  }

  private playWalk(): void {
    const key = playerAnim('walk', this.facing);
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
  }
}
