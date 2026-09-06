import Phaser from 'phaser';
import { DECOR, ITEMS, TILESETS } from '../config/AssetKeys';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { loadCharacterSheets, registerAnimations } from '../systems/AnimationFactory';
import { audio } from '../systems/AudioSystem';
import { createGeneratedTextures } from '../systems/TextureUtils';
import { prepareTilesetTextures } from '../systems/WangRoomBuilder';

/**
 * Carga todo lo que el juego necesita siempre: spritesheets de personajes,
 * tilesets, decoracion y SFX.
 *
 * La musica NO se precarga (son ~7 MB por pista): la trae AudioSystem bajo
 * demanda la primera vez que una sala pide su tema.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.showProgress();

    loadCharacterSheets(this);

    for (const tileset of Object.values(TILESETS)) {
      this.load.image(tileset.key, tileset.path);
      this.load.json(tileset.metaKey, tileset.metaPath);
    }
    for (const decor of Object.values(DECOR)) this.load.image(decor.key, decor.path);
    for (const item of Object.values(ITEMS)) this.load.image(item.key, item.path);

    audio.preloadSfx(this);
  }

  create(): void {
    createGeneratedTextures(this);
    prepareTilesetTextures(this);
    registerAnimations(this);
    this.scene.start('MainMenu');
  }

  private showProgress(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;

    this.add
      .text(cx, cy - 60, 'TALES OF DEMONTEKS', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: css(Palette.white),
      })
      .setOrigin(0.5);

    const width = 420;
    const frame = this.add.graphics();
    frame.fillStyle(Palette.darkGrey, 1);
    frame.fillRect(cx - width / 2, cy, width, 16);

    const bar = this.add.rectangle(cx - width / 2, cy, 0, 16, Palette.violet).setOrigin(0, 0);
    const label = this.add
      .text(cx, cy + 40, '0%', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: css(Palette.grey),
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      bar.width = width * value;
      label.setText(`${Math.round(value * 100)}%`);
    });
  }
}
