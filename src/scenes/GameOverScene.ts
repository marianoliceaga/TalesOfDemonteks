import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { GAME_OVER_LINES } from '../data/dialogue';
import { audio } from '../systems/AudioSystem';
import { gameState } from '../systems/GameState';
import { InputController } from '../systems/InputController';
import { SaveSystem } from '../systems/SaveSystem';
import { Menu } from '../ui/Menu';

/**
 * Game Over.
 *
 * Reintentar devuelve al ULTIMO PUNTO DE GUARDADO, no al principio del juego:
 * se recarga el save de localStorage tal cual quedo. Si nunca guardaste, se
 * arranca una partida nueva (y se dice explicitamente).
 */
export class GameOverScene extends Phaser.Scene {
  private input$!: InputController;
  private menu!: Menu;

  constructor() {
    super('GameOver');
  }

  create(): void {
    this.input$ = new InputController(this);
    const save = SaveSystem.load();

    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, Palette.black, 1).setOrigin(0, 0);

    this.add
      .text(BASE_WIDTH / 2, 140, 'GAME OVER', {
        fontFamily: FONT_FAMILY,
        fontSize: '46px',
        color: css(Palette.danger),
      })
      .setOrigin(0.5);

    this.add
      .text(BASE_WIDTH / 2, 214, Phaser.Utils.Array.GetRandom([...GAME_OVER_LINES]), {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: css(Palette.white),
        align: 'center',
        wordWrap: { width: 620 },
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.menu = new Menu(
      this,
      [
        {
          label: save ? 'REINTENTAR' : 'EMPEZAR DE NUEVO',
          hint: save
            ? `Desde: ${save.roomId}`
            : 'Nunca llegaste a un punto de guardado.',
        },
        { label: 'MENU PRINCIPAL' },
      ],
      {
        x: BASE_WIDTH / 2 - 130,
        y: 320,
        spacing: 88,
        fontSize: 20,
        hintWidth: 520,
        onSelect: (index) => this.select(index),
        onMove: () => audio.play(this, 'uiMove'),
      },
    );
  }

  override update(): void {
    if (this.input$.justUp()) this.menu.move(-1);
    if (this.input$.justDownKey()) this.menu.move(1);
    if (this.input$.justAction()) this.menu.confirm();
  }

  private select(index: number): void {
    audio.play(this, 'uiClick');

    if (index === 1) {
      this.scene.start('MainMenu');
      return;
    }

    const save = SaveSystem.load();
    if (save) {
      gameState.loadFrom(save);
      // El punto de guardado cura al maximo: reintentar deberia dejarte igual
      // que cuando guardaste, no con el HP con el que moriste.
      gameState.fullHeal();
    } else {
      gameState.reset();
    }

    this.scene.start('Room', { roomId: gameState.currentRoom, spawnId: gameState.currentSpawn });
    this.scene.launch('Hud');
  }
}
