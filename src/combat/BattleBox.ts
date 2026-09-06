import Phaser from 'phaser';
import { charSheet } from '../config/AssetKeys';
import {
  DEPTH,
  PLAYER_BATTLE_SCALE,
  PLAYER_BODY_BATTLE,
  PLAYER_SPEED_BATTLE,
} from '../config/GameConfig';
import { Palette } from '../config/Palette';
import { playerAnim } from '../systems/AnimationFactory';
import type { PatternId } from '../types';
import { getPattern, type BulletOptions, type PatternContext } from './BulletPatterns';
import type { MoveInput } from '../entities/Player';

/**
 * La caja de esquive.
 *
 * Delimita el area jugable durante la fase en que el enemigo dispara. Se ocupa
 * de:
 *   - dibujar la caja (recuadro blanco sobre fondo negro)
 *   - mover al Explorer dentro, clampeado al interior
 *   - correr el patron de proyectiles del enemigo y limpiarlo al terminar
 *   - avisar cuando un proyectil toca al jugador
 *
 * No sabe nada de HP ni de menus: eso es de BattleScene. Asi el mismo componente
 * sirve para cualquier enemigo con solo cambiarle el `PatternId`.
 */
export class BattleBox {
  private readonly scene: Phaser.Scene;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly interior: Phaser.Geom.Rectangle;
  private readonly bullets: Phaser.Physics.Arcade.Group;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  /** Recorta todo lo que este dentro de la caja: nada se dibuja afuera. */
  private readonly clip: Phaser.Display.Masks.GeometryMask;
  private readonly clipShape: Phaser.GameObjects.Graphics;

  private timers: Phaser.Time.TimerEvent[] = [];
  private tracked: Phaser.GameObjects.GameObject[] = [];
  private endTimer?: Phaser.Time.TimerEvent;
  private onHit?: (bullet: Phaser.Physics.Arcade.Image) => void;
  private onEnd?: () => void;
  private running = false;

  constructor(scene: Phaser.Scene, centerX: number, centerY: number, width: number, height: number) {
    this.scene = scene;
    const border = 5;

    this.interior = new Phaser.Geom.Rectangle(
      centerX - width / 2,
      centerY - height / 2,
      width,
      height,
    );

    this.frame = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.ui);
    this.frame.fillStyle(Palette.white, 1);
    this.frame.fillRect(
      this.interior.x - border,
      this.interior.y - border,
      width + border * 2,
      height + border * 2,
    );
    this.frame.fillStyle(Palette.black, 1);
    this.frame.fillRect(this.interior.x, this.interior.y, width, height);

    // Mascara de recorte. El Explorer mide 64px en la caja y su cuerpo de
    // colision son solo los pies: sin recortar, la cabeza se le sale por arriba
    // del marco. Recortando, la caja funciona como ventana, que es lo que se
    // espera visualmente.
    this.clipShape = scene.make.graphics({ x: 0, y: 0 }, false);
    this.clipShape.fillStyle(0xffffff);
    this.clipShape.fillRect(this.interior.x, this.interior.y, width, height);
    this.clip = this.clipShape.createGeometryMask();

    this.bullets = scene.physics.add.group();

    this.player = scene.physics.add
      .sprite(centerX, centerY, charSheet('explorer', 'breathing-idle', 'south').key, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.ui + 2)
      .setScale(PLAYER_BATTLE_SCALE);
    this.player.setMask(this.clip);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_BODY_BATTLE.width, PLAYER_BODY_BATTLE.height);
    body.setOffset(PLAYER_BODY_BATTLE.offsetX, PLAYER_BODY_BATTLE.offsetY);
    this.player.play(playerAnim('idle', 'south'));

    scene.physics.add.overlap(this.player, this.bullets, (_p, b) => {
      if (!this.running) return;
      this.onHit?.(b as Phaser.Physics.Arcade.Image);
    });
  }

  get rect(): Phaser.Geom.Rectangle {
    return this.interior;
  }

  get playerSprite(): Phaser.Physics.Arcade.Sprite {
    return this.player;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Vuelve a poner al Explorer en el centro y lo deja quieto. */
  resetPlayer(): void {
    this.player.setPosition(this.interior.centerX, this.interior.centerY);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.play(playerAnim('idle', 'south'), true);
  }

  setPlayerVisible(visible: boolean): void {
    this.player.setVisible(visible);
  }

  /**
   * Arranca la fase de esquive.
   * @param onHit se llama por cada proyectil que toca al jugador
   * @param onEnd se llama cuando se cumple la duracion
   */
  start(pattern: PatternId, durationMs: number, onHit: (bullet: Phaser.Physics.Arcade.Image) => void, onEnd: () => void): void {
    this.stop();
    this.running = true;
    this.onHit = onHit;
    this.onEnd = onEnd;
    this.resetPlayer();
    this.setPlayerVisible(true);

    const context: PatternContext = {
      scene: this.scene,
      box: this.interior,
      origin: { x: this.interior.centerX, y: this.interior.top - 60 },
      playerPos: () => ({ x: this.player.x, y: this.player.y }),
      duration: durationMs,
      spawn: (options) => this.spawnBullet(options),
      every: (delay, callback) => {
        this.timers.push(this.scene.time.addEvent({ delay, loop: true, callback }));
      },
      after: (delay, callback) => {
        this.timers.push(this.scene.time.delayedCall(delay, callback));
      },
      track: (object) => this.tracked.push(object),
    };

    getPattern(pattern)(context);

    this.endTimer = this.scene.time.delayedCall(durationMs, () => {
      const done = this.onEnd;
      this.stop();
      done?.();
    });
  }

  /**
   * Corta la fase: para los emisores, borra proyectiles y objetos auxiliares.
   *
   * Tiene que poder llamarse tambien durante el shutdown de la escena, cuando
   * Phaser ya destruyo el grupo y los cuerpos: de ahi los chequeos defensivos.
   */
  stop(): void {
    this.running = false;
    for (const timer of this.timers) timer.remove();
    this.timers = [];
    this.endTimer?.remove();
    this.endTimer = undefined;
    for (const object of this.tracked) object.destroy();
    this.tracked = [];
    if (this.bullets.children) this.bullets.clear(true, true);
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  /** Llamar desde el update de la escena mientras la fase esta activa. */
  update(input: MoveInput): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    if (!this.running) {
      body.setVelocity(0, 0);
      return;
    }

    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const inv = dx !== 0 && dy !== 0 ? Math.SQRT1_2 : 1;
    body.setVelocity(dx * PLAYER_SPEED_BATTLE * inv, dy * PLAYER_SPEED_BATTLE * inv);

    if (dx !== 0 || dy !== 0) {
      const dir = dx !== 0 ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north';
      const key = playerAnim('walk', dir);
      if (this.player.anims.currentAnim?.key !== key) this.player.play(key, true);
    }

    this.clampPlayer();
    this.cullBullets();
  }

  /**
   * El clamp se hace sobre el CUERPO, no sobre el sprite: el frame de 128px
   * tiene mucho aire alrededor y clampear el sprite dejaria al personaje
   * flotando lejos del borde.
   */
  private clampPlayer(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const halfW = body.halfWidth * PLAYER_BATTLE_SCALE;
    const halfH = body.halfHeight * PLAYER_BATTLE_SCALE;
    // Desfasaje entre el centro del sprite y el centro del cuerpo.
    const offsetX = (PLAYER_BODY_BATTLE.offsetX + PLAYER_BODY_BATTLE.width / 2 - 64) * PLAYER_BATTLE_SCALE;
    const offsetY = (PLAYER_BODY_BATTLE.offsetY + PLAYER_BODY_BATTLE.height / 2 - 64) * PLAYER_BATTLE_SCALE;

    this.player.x = Phaser.Math.Clamp(
      this.player.x,
      this.interior.left + halfW - offsetX,
      this.interior.right - halfW - offsetX,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      this.interior.top + halfH - offsetY,
      this.interior.bottom - halfH - offsetY,
    );
  }

  /** Los proyectiles que se van lejos de la caja se destruyen. */
  private cullBullets(): void {
    const margin = 80;
    for (const child of this.bullets.getChildren()) {
      const bullet = child as Phaser.Physics.Arcade.Image;
      if (
        bullet.x < this.interior.left - margin ||
        bullet.x > this.interior.right + margin ||
        bullet.y < this.interior.top - margin ||
        bullet.y > this.interior.bottom + margin
      ) {
        bullet.destroy();
      }
    }
  }

  private spawnBullet(options: BulletOptions): void {
    const bullet = this.bullets.create(options.x, options.y, options.texture) as Phaser.Physics.Arcade.Image;
    bullet.setScrollFactor(0);
    bullet.setDepth(DEPTH.ui + 1);
    bullet.setMask(this.clip);
    if (options.scale) bullet.setScale(options.scale);
    if (options.tint !== undefined) bullet.setTint(options.tint);

    let vx = options.vx ?? 0;
    let vy = options.vy ?? 0;
    if (options.angle !== undefined && options.speed !== undefined) {
      vx = Math.cos(options.angle) * options.speed;
      vy = Math.sin(options.angle) * options.speed;
      if (options.faceDirection) bullet.setRotation(options.angle);
    }
    bullet.setVelocity(vx, vy);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    // Hitbox un poco mas chica que el sprite: perdona los roces y se siente justo.
    body.setSize(bullet.width * 0.7, bullet.height * 0.7, true);

    if (options.spin) bullet.setAngularVelocity(options.spin);
    if (options.lifespan) {
      this.timers.push(this.scene.time.delayedCall(options.lifespan, () => bullet.destroy()));
    }
    options.onCreated?.(bullet);
  }

  destroy(): void {
    this.stop();
    if (this.bullets.children) this.bullets.destroy(true);
    this.player.destroy();
    this.frame.destroy();
    // clipShape se crea con make.graphics(..., false): no esta en la display
    // list, asi que Phaser no lo limpia solo.
    this.clip.destroy();
    this.clipShape.destroy();
  }
}
