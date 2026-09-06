import Phaser from 'phaser';
import { STORY } from '../config/AssetKeys';
import { BASE_HEIGHT, BASE_WIDTH, DEPTH } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { ENDING_FOOTER, ENDING_LINES, ENDING_TITLE } from '../data/ending';
import { ROOMS } from '../data/rooms';
import { audio } from '../systems/AudioSystem';
import { gameState } from '../systems/GameState';
import { InputController } from '../systems/InputController';
import { DialogueBox } from '../ui/DialogueBox';
import { Menu } from '../ui/Menu';

/**
 * Pantalla de final. Se llega derrotando al REY DEMONTEK.
 *
 * Dos tiempos:
 *   1. las lineas de cierre sobre el arte de la ultima escena de la historia
 *   2. el cartel de THE END con el resumen de la partida y la vuelta al menu
 *
 * El arte de fondo pesa varios MB y se usa una sola vez en toda la partida, asi
 * que se carga aca y no en PreloadScene.
 */
export class EndingScene extends Phaser.Scene {
  private input$!: InputController;
  private dialogue!: DialogueBox;
  private menu?: Menu;
  private stage: 'lines' | 'card' = 'lines';

  /** Todo lo del primer tiempo, para poder fundirlo de una. */
  private sceneryGroup!: Phaser.GameObjects.Group;

  constructor() {
    super('Ending');
  }

  preload(): void {
    for (const entry of Object.values(STORY)) {
      if (!this.textures.exists(entry.key)) this.load.image(entry.key, entry.path);
    }
  }

  create(): void {
    this.input$ = new InputController(this);
    this.stage = 'lines';

    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, Palette.black, 1).setOrigin(0, 0);

    this.sceneryGroup = this.add.group();
    this.createScenery();

    this.dialogue = new DialogueBox(this);
    this.dialogue.show(ENDING_LINES, () => this.showCard());

    audio.playMusic(this, 'victory');
    this.cameras.main.fadeIn(900, 0, 0, 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dialogue.destroy());
  }

  private createScenery(): void {
    if (this.textures.exists(STORY.endingBg.key)) {
      const bg = this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, STORY.endingBg.key);
      // Escalar para cubrir la pantalla completa sin deformar.
      const scale = Math.max(BASE_WIDTH / bg.width, BASE_HEIGHT / bg.height);
      bg.setScale(scale).setAlpha(0.22).setTint(0x7f88ab);
      this.sceneryGroup.add(bg);
    }

    if (this.textures.exists(STORY.portraitExplorer.key)) {
      const portrait = this.add.image(BASE_WIDTH / 2, 190, STORY.portraitExplorer.key);
      portrait.setScale(320 / portrait.height);
      // El PNG viene sin alfa, con fondo negro. En modo ADD el negro no suma
      // nada, asi que el recorte sale gratis y de paso queda un halo.
      portrait.setBlendMode(Phaser.BlendModes.ADD);
      this.sceneryGroup.add(portrait);

      this.tweens.add({
        targets: portrait,
        y: portrait.y - 8,
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  override update(): void {
    if (this.stage === 'lines') {
      if (this.input$.justAction()) this.dialogue.advance();
      return;
    }
    // Recien cuando el menu aparecio: si no, machacar la tecla de accion desde
    // la ultima linea te saca del final sin haberlo visto.
    if (this.menu?.visible && this.input$.justAction()) this.menu.confirm();
  }

  /* ---------------------------- THE END ---------------------------- */

  private showCard(): void {
    this.stage = 'card';

    this.tweens.add({
      targets: this.sceneryGroup.getChildren(),
      alpha: 0,
      duration: 900,
      onComplete: () => this.sceneryGroup.clear(true, true),
    });

    const title = this.add
      .text(BASE_WIDTH / 2, 150, ENDING_TITLE, {
        fontFamily: FONT_FAMILY,
        fontSize: '52px',
        color: css(Palette.violet),
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(DEPTH.ui);

    const totalEnemies = Object.values(ROOMS).reduce((sum, room) => sum + room.enemies.length, 0);
    const stats = [
      `SALAS VISITADAS   ${gameState.visited.size} / ${Object.keys(ROOMS).length}`,
      `ENEMIGOS VENCIDOS ${gameState.defeated.size} / ${totalEnemies}`,
      `HP AL FINAL       ${gameState.hp} / ${gameState.maxHp}`,
      `KITS SIN USAR     ${gameState.totalItems}`,
    ].join('\n');

    const statsText = this.add
      .text(BASE_WIDTH / 2, 250, stats, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: css(Palette.white),
        // Alineado a la izquierda dentro del bloque (y el bloque centrado): con
        // align 'center' cada linea se centra sola y las columnas no coinciden.
        align: 'left',
        lineSpacing: 12,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0)
      .setDepth(DEPTH.ui);

    const footer = this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT - 40, ENDING_FOOTER, {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: css(Palette.grey),
        align: 'center',
        wordWrap: { width: BASE_WIDTH - 120 },
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(DEPTH.ui);

    this.menu = new Menu(this, [{ label: 'MENU PRINCIPAL' }], {
      x: BASE_WIDTH / 2 - 90,
      y: 420,
      fontSize: 18,
      onSelect: () => this.toMainMenu(),
    });
    this.menu.setVisible(false);

    this.tweens.add({
      targets: [title, statsText, footer],
      alpha: 1,
      duration: 700,
      delay: 500,
      onComplete: () => this.menu?.setVisible(true),
    });
  }

  private toMainMenu(): void {
    audio.play(this, 'uiClick');
    audio.stopMusic();
    // La partida guardada queda como estaba: el jugador puede volver a entrar y
    // seguir recorriendo el mundo con el Rey ya derrotado.
    this.scene.start('MainMenu');
  }
}
