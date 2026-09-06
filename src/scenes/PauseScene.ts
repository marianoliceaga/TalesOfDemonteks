import Phaser from 'phaser';
import { BASE_HEIGHT, DEPTH, viewWidth } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { ITEM_DEFS } from '../data/items';
import { NO_ITEMS } from '../data/dialogue';
import { audio } from '../systems/AudioSystem';
import { gameState } from '../systems/GameState';
import { InputController } from '../systems/InputController';
import { HealthBar } from '../ui/HealthBar';
import { Menu, type MenuItem } from '../ui/Menu';
import type { ItemId } from '../types';

/** Un item del menu de pausa junto con lo que hace al confirmarlo. */
interface PauseEntry extends MenuItem {
  action: () => void;
}

const PANEL = { width: 620, height: 430 };

/**
 * Menu de pausa: inventario, opciones de audio y salida al menu principal.
 *
 * Los kits de curacion se usan SOLO desde aca, no dentro del combate. Esa es la
 * asuncion que mantiene el menu de batalla en dos opciones (FIGHT / ACT).
 * TODO: confirmar con el usuario.
 *
 * La lista se arma como entradas con su propia `action`: al agregar opciones no
 * hay que tocar ningun mapeo de indices (que era como estaba antes y se rompia
 * apenas cambiaba la cantidad de items).
 *
 * Corre encima de RoomScene pausada; salir la reanuda.
 */
export class PauseScene extends Phaser.Scene {
  private input$!: InputController;
  private menu!: Menu;
  private bar!: HealthBar;
  private feedback!: Phaser.GameObjects.Text;
  private entries: PauseEntry[] = [];

  constructor() {
    super('Pause');
  }

  create(): void {
    this.input$ = new InputController(this);

    this.add
      .rectangle(0, 0, viewWidth(), BASE_HEIGHT, Palette.black, 0.82)
      .setOrigin(0, 0)
      .setDepth(DEPTH.overlay);

    const panelX = (viewWidth() - PANEL.width) / 2;
    const panelY = (BASE_HEIGHT - PANEL.height) / 2;

    const panel = this.add.graphics().setDepth(DEPTH.ui - 1);
    panel.fillStyle(Palette.white, 1);
    panel.fillRect(panelX - 5, panelY - 5, PANEL.width + 10, PANEL.height + 10);
    panel.fillStyle(Palette.black, 1);
    panel.fillRect(panelX, panelY, PANEL.width, PANEL.height);

    this.add
      .text(viewWidth() / 2, panelY + 26, 'PAUSA', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: css(Palette.violet),
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.bar = new HealthBar(this, panelX + 40, panelY + 74, { width: 220 });
    this.bar.set(gameState.hp, gameState.maxHp);

    this.feedback = this.add
      .text(viewWidth() / 2, panelY + PANEL.height - 26, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: css(Palette.grey),
        wordWrap: { width: PANEL.width - 60 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.entries = this.buildEntries();
    this.menu = new Menu(this, this.entries, {
      x: panelX + 40,
      y: panelY + 120,
      spacing: 58,
      fontSize: 16,
      hintWidth: PANEL.width - 90,
      onSelect: (index) => this.entries[index]?.action(),
      onMove: () => audio.play(this, 'uiMove'),
    });
  }

  /* ------------------------------ items ------------------------------ */

  private get itemIds(): ItemId[] {
    return (Object.keys(ITEM_DEFS) as ItemId[]).filter((id) => gameState.itemCount(id) > 0);
  }

  private buildEntries(): PauseEntry[] {
    const entries: PauseEntry[] = this.itemIds.map((id) => ({
      label: `USAR ${ITEM_DEFS[id].name}  x${gameState.itemCount(id)}`,
      enabled: gameState.hp < gameState.maxHp,
      hint: ITEM_DEFS[id].description,
      action: () => this.useItem(id),
    }));

    if (entries.length === 0) {
      entries.push({ label: NO_ITEMS, enabled: false, action: () => undefined });
    }

    entries.push(
      {
        label: `MUSICA: ${onOff(!audio.musicMuted)}`,
        action: () => this.toggleMusic(),
      },
      {
        label: `EFECTOS: ${onOff(!audio.sfxMuted)}`,
        action: () => this.toggleSfx(),
      },
      { label: 'CONTINUAR', action: () => this.resumeGame() },
      { label: 'VOLVER AL MENU PRINCIPAL', action: () => this.toMainMenu() },
    );

    return entries;
  }

  /** Redibuja la lista sin mover el cursor (se usa tras cada toggle). */
  private refreshEntries(): void {
    this.entries = this.buildEntries();
    this.menu.setItems(this.entries, true);
  }

  override update(): void {
    if (this.input$.justUp()) this.menu.move(-1);
    if (this.input$.justDownKey()) this.menu.move(1);
    if (this.input$.justAction()) this.menu.confirm();
    if (this.input$.justPause()) this.resumeGame();
  }

  /* ---------------------------- acciones ---------------------------- */

  private useItem(id: ItemId): void {
    const healed = gameState.useItem(id);
    if (healed === null) {
      audio.play(this, 'error', 0.6);
      this.feedback.setText('No hace falta, o no te queda de ese.');
      return;
    }
    audio.play(this, 'heal');
    this.bar.set(gameState.hp, gameState.maxHp);
    this.feedback.setText(`+${healed} HP. El optimismo funciona, a veces.`);
    this.refreshEntries();
  }

  private toggleMusic(): void {
    const muted = audio.toggleMusicMuted();
    // El click va despues del toggle: si acabas de prender los efectos, lo escuchas.
    audio.play(this, 'uiClick');
    this.feedback.setText(muted ? 'Musica en silencio.' : 'Musica encendida.');
    this.refreshEntries();
  }

  private toggleSfx(): void {
    const muted = audio.toggleSfxMuted();
    audio.play(this, 'uiClick');
    this.feedback.setText(muted ? 'Efectos en silencio.' : 'Efectos encendidos.');
    this.refreshEntries();
  }

  private resumeGame(): void {
    audio.play(this, 'uiClick');
    this.scene.stop();
    this.scene.resume('Room');
  }

  private toMainMenu(): void {
    audio.play(this, 'uiClick');
    // El progreso no guardado se pierde: es el punto de los puntos de guardado.
    audio.stopMusic();
    this.scene.stop('Room');
    this.scene.stop('Hud');
    this.scene.start('MainMenu');
  }
}

function onOff(on: boolean): string {
  return on ? 'ON' : 'OFF';
}
