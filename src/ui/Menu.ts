import Phaser from 'phaser';
import { DEPTH } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';

export interface MenuItem {
  label: string;
  /** Un item deshabilitado se ve grisado y no se puede confirmar. */
  enabled?: boolean;
  /** Texto auxiliar a la derecha (cantidad de items, "sin datos", etc). */
  hint?: string;
}

export interface MenuOptions {
  x: number;
  y: number;
  /** 'vertical' para menus de pantalla, 'horizontal' para el FIGHT/ACT del combate. */
  direction?: 'vertical' | 'horizontal';
  spacing?: number;
  fontSize?: number;
  /** Si es false, el cursor no vuelve al principio al pasarse del final. */
  wrap?: boolean;
  /** Ancho disponible para los textos auxiliares (`hint`), en px. */
  hintWidth?: number;
  onSelect: (index: number) => void;
  onMove?: (index: number) => void;
}

/**
 * Lista navegable reusable.
 *
 * La misma clase resuelve el menu principal, el de pausa, el submenu de ACT y
 * la lista de items. Solo maneja seleccion y dibujo; quien la usa decide que
 * hacer en `onSelect` y le pasa el input desde su propio `update`.
 */
export class Menu {
  private readonly container: Phaser.GameObjects.Container;
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly hints: Phaser.GameObjects.Text[] = [];
  private readonly cursor: Phaser.GameObjects.Text;
  private readonly options: Required<Omit<MenuOptions, 'onSelect' | 'onMove'>> &
    Pick<MenuOptions, 'onSelect' | 'onMove'>;

  private items: MenuItem[] = [];
  private index = 0;

  constructor(scene: Phaser.Scene, items: MenuItem[], options: MenuOptions) {
    this.options = {
      direction: 'vertical',
      spacing: options.direction === 'horizontal' ? 230 : 40,
      fontSize: 18,
      wrap: true,
      hintWidth: 420,
      ...options,
    };

    this.cursor = scene.add.text(0, 0, '>', {
      fontFamily: FONT_FAMILY,
      fontSize: `${this.options.fontSize}px`,
      color: css(Palette.violet),
    });

    this.container = scene.add.container(options.x, options.y, [this.cursor]);
    this.container.setScrollFactor(0);
    this.container.setDepth(DEPTH.ui);

    this.setItems(items);
  }

  /**
   * Reemplaza la lista.
   *
   * `keepIndex` conserva la posicion del cursor: hace falta cuando un item se
   * redibuja como consecuencia de haberlo confirmado (usar un kit, prender o
   * apagar el audio). Sin eso el cursor salta al principio en cada toggle.
   */
  setItems(items: MenuItem[], keepIndex = false): void {
    const previous = this.index;
    for (const t of this.texts) t.destroy();
    for (const h of this.hints) h.destroy();
    this.texts.length = 0;
    this.hints.length = 0;

    const scene = this.container.scene;
    items.forEach((item, i) => {
      const pos = this.slotPosition(i);
      const text = scene.add.text(pos.x, pos.y, item.label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${this.options.fontSize}px`,
        color: css(Palette.white),
      });
      this.texts.push(text);
      this.container.add(text);

      if (item.hint) {
        const hint = scene.add.text(pos.x, pos.y + this.options.fontSize + 8, item.hint, {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.max(10, this.options.fontSize - 6)}px`,
          color: css(Palette.grey),
          // Sin wrap, las descripciones largas se salen del panel.
          wordWrap: { width: this.options.hintWidth },
          lineSpacing: 4,
        });
        this.hints.push(hint);
        this.container.add(hint);
      }
    });

    this.items = items;
    if (keepIndex && previous >= 0 && previous < items.length) {
      this.index = previous;
    } else {
      this.index = items.findIndex((i) => i.enabled !== false);
      if (this.index < 0) this.index = 0;
    }
    this.refresh();
  }

  private slotPosition(i: number): { x: number; y: number } {
    return this.options.direction === 'horizontal'
      ? { x: 26 + i * this.options.spacing, y: 0 }
      : { x: 26, y: i * this.options.spacing };
  }

  get selectedIndex(): number {
    return this.index;
  }

  move(delta: number): void {
    if (this.items.length === 0) return;
    let next = this.index;
    // Saltea los items deshabilitados en lugar de frenar sobre ellos.
    for (let step = 0; step < this.items.length; step++) {
      next += delta;
      if (next < 0) {
        if (!this.options.wrap) return;
        next = this.items.length - 1;
      }
      if (next >= this.items.length) {
        if (!this.options.wrap) return;
        next = 0;
      }
      if (this.items[next]?.enabled !== false) break;
    }
    if (next === this.index) return;
    this.index = next;
    this.refresh();
    this.options.onMove?.(this.index);
  }

  confirm(): boolean {
    if (this.items[this.index]?.enabled === false) return false;
    this.options.onSelect?.(this.index);
    return true;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.container.destroy();
  }

  private refresh(): void {
    this.texts.forEach((text, i) => {
      const enabled = this.items[i]?.enabled !== false;
      const selected = i === this.index;
      text.setColor(css(!enabled ? Palette.grey : selected ? Palette.violet : Palette.white));
    });
    const pos = this.slotPosition(this.index);
    this.cursor.setPosition(pos.x - 24, pos.y);
    this.cursor.setVisible(this.items.length > 0);
  }
}
