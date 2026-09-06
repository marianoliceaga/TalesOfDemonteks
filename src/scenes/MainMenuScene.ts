import Phaser from 'phaser';
import { MISC } from '../config/AssetKeys';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { STARTING_ITEMS } from '../data/items';
import { audio } from '../systems/AudioSystem';
import { gameState } from '../systems/GameState';
import { InputController } from '../systems/InputController';
import { SaveSystem } from '../systems/SaveSystem';
import { Menu } from '../ui/Menu';
import type { RoomSceneData } from '../types';

/**
 * Pantalla de inicio. "Continue" solo se habilita si hay una partida guardada
 * en localStorage.
 */
export class MainMenuScene extends Phaser.Scene {
  private input$!: InputController;
  private menu!: Menu;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.input$ = new InputController(this);
    audio.playMusic(this, 'main');

    this.add
      .image(BASE_WIDTH / 2, BASE_HEIGHT / 2, MISC.splash.key)
      .setScale(6)
      .setAlpha(0.16);

    this.add
      .text(BASE_WIDTH / 2, 108, 'TALES OF', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: css(Palette.grey),
      })
      .setOrigin(0.5);

    this.add
      .text(BASE_WIDTH / 2, 156, 'DEMONTEKS', {
        fontFamily: FONT_FAMILY,
        fontSize: '44px',
        color: css(Palette.violet),
      })
      .setOrigin(0.5);

    const save = SaveSystem.load();
    const savedAt = save ? new Date(save.savedAt).toLocaleString() : null;

    this.menu = new Menu(
      this,
      [
        { label: 'START' },
        {
          label: 'CONTINUE',
          enabled: save !== null,
          hint: savedAt ? `${save!.roomId} - HP ${save!.hp}/${save!.maxHp} - ${savedAt}` : 'sin partida guardada',
        },
      ],
      {
        x: BASE_WIDTH / 2 - 120,
        y: 300,
        spacing: 78,
        fontSize: 22,
        hintWidth: 520,
        onSelect: (index) => this.select(index),
        onMove: () => audio.play(this, 'uiMove'),
      },
    );

    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT - 46, 'Mover: WASD / flechas    Accion: E o ESPACIO    Pausa: ESC', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: css(Palette.grey),
      })
      .setOrigin(0.5);
  }

  override update(): void {
    if (this.input$.justUp()) this.menu.move(-1);
    if (this.input$.justDownKey()) this.menu.move(1);
    if (this.input$.justAction()) this.menu.confirm();
  }

  private select(index: number): void {
    audio.play(this, 'uiClick');

    if (index === 0) {
      // Partida nueva: no borramos el save existente hasta que el jugador
      // llegue a un punto de guardado y grabe encima.
      gameState.reset();
      gameState.items = { ...STARTING_ITEMS };
      this.startGame({ roomId: gameState.currentRoom, spawnId: gameState.currentSpawn });
      return;
    }

    const save = SaveSystem.load();
    if (!save) {
      audio.play(this, 'error');
      return;
    }
    gameState.loadFrom(save);
    this.startGame({ roomId: save.roomId, spawnId: save.spawnId });
  }

  private startGame(data: RoomSceneData): void {
    audio.stopMusic();
    this.scene.start('Room', data);
    this.scene.launch('Hud');
  }
}
