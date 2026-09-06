import Phaser from 'phaser';
import { ACT_OPTIONS, type ActOption } from '../data/dialogue';
import { Menu } from '../ui/Menu';

export type BattleChoice = { type: 'fight' } | { type: 'act'; option: ActOption };

/**
 * Menu de la caja de combate: FIGHT / ACT y el submenu de ACT.
 *
 * No hay ITEM ni MERCY, por decision de alcance: los kits de curacion se usan
 * desde el menu de pausa (ver src/scenes/PauseScene.ts).
 * TODO: confirmar con el usuario.
 *
 * Las opciones de ACT son genericas para todos los enemigos; lo que cambia es
 * el texto, que sale del EnemyDef.
 */
export class BattleMenu {
  private readonly main: Menu;
  private readonly act: Menu;
  private level: 'main' | 'act' | 'closed' = 'closed';
  private readonly onChoice: (choice: BattleChoice) => void;
  private readonly onNavigate?: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onChoice: (choice: BattleChoice) => void,
    onNavigate?: () => void,
  ) {
    this.onChoice = onChoice;
    this.onNavigate = onNavigate;

    this.main = new Menu(
      scene,
      [{ label: 'FIGHT' }, { label: 'ACT' }],
      {
        x,
        y,
        direction: 'horizontal',
        spacing: 200,
        fontSize: 22,
        onSelect: (index) => {
          if (index === 0) {
            this.level = 'closed';
            this.main.setVisible(false);
            this.onChoice({ type: 'fight' });
          } else {
            this.level = 'act';
            this.main.setVisible(false);
            this.act.setVisible(true);
          }
        },
        onMove: () => this.onNavigate?.(),
      },
    );

    this.act = new Menu(
      scene,
      ACT_OPTIONS.map((label) => ({ label })),
      {
        x,
        y,
        direction: 'horizontal',
        spacing: 200,
        fontSize: 22,
        onSelect: (index) => {
          const option = ACT_OPTIONS[index];
          if (!option) return;
          this.level = 'closed';
          this.act.setVisible(false);
          this.onChoice({ type: 'act', option });
        },
        onMove: () => this.onNavigate?.(),
      },
    );

    this.main.setVisible(false);
    this.act.setVisible(false);
  }

  get isOpen(): boolean {
    return this.level !== 'closed';
  }

  open(): void {
    this.level = 'main';
    this.main.setVisible(true);
    this.act.setVisible(false);
  }

  close(): void {
    this.level = 'closed';
    this.main.setVisible(false);
    this.act.setVisible(false);
  }

  move(delta: number): void {
    if (this.level === 'main') this.main.move(delta);
    else if (this.level === 'act') this.act.move(delta);
  }

  confirm(): void {
    if (this.level === 'main') this.main.confirm();
    else if (this.level === 'act') this.act.confirm();
  }

  /** Volver del submenu de ACT al menu principal. */
  cancel(): boolean {
    if (this.level !== 'act') return false;
    this.level = 'main';
    this.act.setVisible(false);
    this.main.setVisible(true);
    return true;
  }

  destroy(): void {
    this.main.destroy();
    this.act.destroy();
  }
}
