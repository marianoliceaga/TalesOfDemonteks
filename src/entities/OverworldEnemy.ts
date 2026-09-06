import Phaser from 'phaser';
import { CHAR_SCALE, DEPTH } from '../config/GameConfig';
import { ENEMIES } from '../data/enemies';
import { enemyAnim, enemyIdleTexture } from '../systems/AnimationFactory';
import { killTweens } from '../systems/tweens';
import { cellToWorld } from '../systems/WangRoomBuilder';
import type { EnemySpawn } from '../types';

/**
 * Enemigo tal como se ve en la sala (no en la caja de combate).
 *
 * Patrulla entre las celdas que declara su EnemySpawn y, al tocar al jugador,
 * dispara el combate. El combate NO es aleatorio ni automatico al entrar a la
 * sala: se puede esquivar a un enemigo si le encontras la vuelta.
 *
 * La patrulla se resuelve con tweens y no con velocidad fisica: el cuerpo
 * arcade existe solo para detectar el solape con el jugador. Los recorridos se
 * declaran sobre celdas de piso (validateRooms lo chequea), asi que no hace
 * falta que el enemigo colisione con las paredes.
 */
export class OverworldEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly spawn: EnemySpawn;
  private patrolTween?: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain;

  constructor(scene: Phaser.Scene, spawn: EnemySpawn) {
    const def = ENEMIES[spawn.enemy];
    const pos = cellToWorld(spawn.cx, spawn.cy);
    super(scene, pos.x, pos.y, enemyIdleTexture(spawn.enemy), 0);
    this.spawn = spawn;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(CHAR_SCALE);
    this.setDepth(DEPTH.entities);
    if (def.tint !== undefined) this.setTint(def.tint);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Hitbox generosa pero no del tamano del frame: si no, el combate salta
    // desde dos tiles de distancia.
    body.setSize(56, 56);
    body.setOffset(36, 60);
    body.setImmovable(true);

    this.play(enemyAnim(def.id, 'idle'));
    this.startPatrol();
  }

  private startPatrol(): void {
    const points = this.spawn.patrol;
    if (!points || points.length < 2) {
      // Los que no patrullan (jefes) hacen un balanceo suave para no parecer estatuas.
      this.scene.tweens.add({
        targets: this,
        y: this.y - 6,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      return;
    }

    const world = points.map((p) => cellToWorld(p.cx, p.cy));
    const first = world[0]!;
    this.setPosition(first.x, first.y);

    // Velocidad constante: la duracion de cada tramo sale de su largo.
    const SPEED = 55; // px/s
    const tweens = world.slice(1).concat([first]).map((target, i) => {
      const from = world[i] ?? first;
      const distance = Phaser.Math.Distance.Between(from.x, from.y, target.x, target.y);
      return {
        x: target.x,
        y: target.y,
        duration: Math.max(300, (distance / SPEED) * 1000),
        ease: 'Linear',
        hold: 400,
        onStart: () => this.setFlipX(target.x < from.x),
      };
    });

    this.patrolTween = this.scene.tweens.chain({ targets: this, tweens, repeat: -1 });
  }

  /** Congela la patrulla (al entrar en combate o mientras hay un dialogo). */
  freeze(): void {
    this.patrolTween?.pause();
  }

  unfreeze(): void {
    this.patrolTween?.resume();
  }

  override destroy(fromScene?: boolean): void {
    this.patrolTween = undefined;
    killTweens(this.scene, this);
    super.destroy(fromScene);
  }
}
