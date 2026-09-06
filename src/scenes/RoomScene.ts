import Phaser from 'phaser';
import { DECOR } from '../config/AssetKeys';
import { DEPTH, TILE_SIZE } from '../config/GameConfig';
import { SAVE_POINT_DONE, SAVE_POINT_LINES } from '../data/dialogue';
import { getRoom } from '../data/rooms';
import { Door } from '../entities/Door';
import { OverworldEnemy } from '../entities/OverworldEnemy';
import { Player } from '../entities/Player';
import { SavePoint } from '../entities/SavePoint';
import { audio } from '../systems/AudioSystem';
import { gameState } from '../systems/GameState';
import { InputController } from '../systems/InputController';
import { SaveSystem } from '../systems/SaveSystem';
import { buildRoom, cellToWorld, preloadTiledMap, type BuiltRoom } from '../systems/WangRoomBuilder';
import { DialogueBox } from '../ui/DialogueBox';
import type { Cell, RoomDef, RoomSceneData } from '../types';

/** spawnId reservado: "donde esta el punto de guardado de esta sala". */
export const SAVE_SPAWN_ID = 'save';

/**
 * Escena de exploracion. UNA sola para todas las salas: se parametriza con
 * `roomId` y arma todo desde src/data/rooms.ts. Cambiar de sala es un
 * `scene.restart` con otro roomId.
 *
 * El combate NO vive aca: al tocar un enemigo se pausa esta escena y se lanza
 * BattleScene encima. Cuando termina, esta escena se reanuda con el resultado.
 */
export class RoomScene extends Phaser.Scene {
  private roomDef!: RoomDef;
  private built!: BuiltRoom;
  private player!: Player;
  private input$!: InputController;
  private dialogue!: DialogueBox;

  private enemies: OverworldEnemy[] = [];
  private doors: Door[] = [];
  private savePoint?: SavePoint;

  /** Evita que dos colisiones en el mismo frame lancen dos combates. */
  private transitioning = false;

  constructor() {
    super('Room');
  }

  init(data: RoomSceneData): void {
    this.roomDef = getRoom(data.roomId ?? gameState.currentRoom);
    gameState.currentRoom = this.roomDef.id;
    gameState.currentSpawn = data.spawnId ?? 'start';
    this.transitioning = false;
    this.enemies = [];
    this.doors = [];
    this.savePoint = undefined;
  }

  /** Solo hace algo si la sala declara un `tiledMap`; el resto ya esta cargado. */
  preload(): void {
    preloadTiledMap(this, this.roomDef);
  }

  create(): void {
    const room = this.roomDef;
    this.input$ = new InputController(this);
    this.built = buildRoom(this, room);

    this.physics.world.setBounds(0, 0, this.built.widthPx, this.built.heightPx);

    this.createDecor(room);
    this.createPlayer(room);
    this.createDoors(room);
    this.createSavePoint(room);
    this.createEnemies(room);
    this.createCamera();

    this.dialogue = new DialogueBox(this);
    audio.playMusic(this, room.music);

    // Al volver de un combate la escena se reanuda (no se recrea): hay que
    // limpiar el enemigo derrotado y devolver el control.
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
      this.dialogue.destroy();
    });

    this.cameras.main.fadeIn(220, 0, 0, 0);

    if (gameState.markVisited(room.id) && room.intro?.length) {
      this.showDialogue(room.intro);
    }
  }

  /* ------------------------------ setup ------------------------------ */

  private createDecor(room: RoomDef): void {
    for (const spec of room.decor ?? []) {
      const pos = cellToWorld(spec.cx, spec.cy);
      this.add
        .image(pos.x, pos.y, DECOR[spec.decor].key)
        .setScale(spec.scale ?? 1)
        .setDepth(DEPTH.decor);
    }
  }

  private createPlayer(room: RoomDef): void {
    const cell = this.resolveSpawn(room, gameState.currentSpawn);
    const pos = cellToWorld(cell.cx, cell.cy);
    this.player = new Player(this, pos.x, pos.y);
    this.physics.add.collider(this.player, this.built.collisionLayer);
  }

  /** 'save' es un spawn virtual: la celda del punto de guardado de la sala. */
  private resolveSpawn(room: RoomDef, spawnId: string): Cell {
    if (spawnId === SAVE_SPAWN_ID && room.savePoint) return room.savePoint;
    const named = room.spawns[spawnId];
    if (named) return named;
    const fallback = Object.values(room.spawns)[0];
    if (!fallback) throw new Error(`La sala "${room.id}" no tiene ningun spawn`);
    return fallback;
  }

  private createDoors(room: RoomDef): void {
    this.doors = room.doors.map((spec) => new Door(this, spec));
  }

  private createSavePoint(room: RoomDef): void {
    if (!room.savePoint) return;
    this.savePoint = new SavePoint(this, room.savePoint);
  }

  private createEnemies(room: RoomDef): void {
    for (const spawn of room.enemies) {
      if (gameState.isDefeated(spawn.uid)) continue;
      const enemy = new OverworldEnemy(this, spawn);
      this.enemies.push(enemy);
      this.physics.add.overlap(this.player, enemy, () => this.startBattle(enemy));
    }
  }

  private createCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.built.widthPx, this.built.heightPx);
    camera.startFollow(this.player, true, 0.18, 0.18);
    // Deadzone chica: la camara acompana pero no persigue cada pixel.
    camera.setDeadzone(140, 100);
    camera.setRoundPixels(true);
  }

  /* ------------------------------ update ------------------------------ */

  override update(): void {
    if (this.transitioning) {
      this.player.halt();
      return;
    }

    if (this.dialogue.isOpen) {
      this.player.halt();
      if (this.input$.justAction()) this.dialogue.advance();
      return;
    }

    if (this.input$.justPause()) {
      this.openPause();
      return;
    }

    this.player.handleInput(this.input$.move);
    this.updateDoors();
    this.updateSavePoint();
  }

  private updateDoors(): void {
    const threshold = TILE_SIZE * 0.55;
    for (const door of this.doors) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y);
      const inside = distance < threshold;
      // Al entrar a la sala el jugador puede aparecer sobre una puerta: recien
      // se "arma" cuando se aleja, para no rebotar entre salas.
      if (!inside) {
        door.armed = true;
        continue;
      }
      if (door.armed) {
        this.goToRoom(door.spec.toRoom, door.spec.toSpawn);
        return;
      }
    }
  }

  private updateSavePoint(): void {
    const point = this.savePoint;
    if (!point) return;
    const near =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) < TILE_SIZE * 1.1;
    point.showPrompt(near);
    if (near && this.input$.justAction()) this.useSavePoint();
  }

  /* ----------------------------- acciones ----------------------------- */

  private useSavePoint(): void {
    gameState.fullHeal();
    const ok = SaveSystem.save(this.roomDef.id, SAVE_SPAWN_ID);
    audio.play(this, ok ? 'checkpoint' : 'error');
    if (ok) audio.play(this, 'save', 0.8);
    this.showDialogue([
      ...SAVE_POINT_LINES,
      ok ? SAVE_POINT_DONE : 'No se pudo guardar (localStorage bloqueado).',
    ]);
  }

  private goToRoom(roomId: string, spawnId: string): void {
    this.transitioning = true;
    this.player.halt();
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ roomId, spawnId } satisfies RoomSceneData);
    });
  }

  private startBattle(enemy: OverworldEnemy): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.halt();
    for (const e of this.enemies) e.freeze();
    audio.duckMusic();

    this.cameras.main.flash(180, 138, 79, 255);
    this.time.delayedCall(200, () => {
      this.scene.pause();
      this.scene.launch('Battle', {
        enemy: enemy.spawn.enemy,
        spawnUid: enemy.spawn.uid,
        returnTo: { roomId: this.roomDef.id, spawnId: gameState.currentSpawn },
      });
    });
  }

  private openPause(): void {
    this.scene.pause();
    this.scene.launch('Pause');
  }

  private showDialogue(lines: string[]): void {
    this.player.locked = true;
    this.dialogue.show(lines, () => {
      this.player.locked = false;
    });
  }

  /** Se dispara al volver de BattleScene o de PauseScene. */
  private onResume(_sys: Phaser.Scenes.Systems, data?: { defeatedUid?: string }): void {
    this.transitioning = false;
    audio.unduckMusic();

    if (data?.defeatedUid) {
      const index = this.enemies.findIndex((e) => e.spawn.uid === data.defeatedUid);
      if (index >= 0) {
        this.enemies[index]!.destroy();
        this.enemies.splice(index, 1);
      }
    }

    for (const e of this.enemies) e.unfreeze();

    // Empujar al jugador fuera del enemigo con el que peleo, si sigue en pie,
    // para no reabrir el combate en el frame siguiente.
    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance < TILE_SIZE) {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        this.player.setPosition(
          this.player.x + Math.cos(angle) * TILE_SIZE * 1.4,
          this.player.y + Math.sin(angle) * TILE_SIZE * 1.4,
        );
      }
    }
  }
}
