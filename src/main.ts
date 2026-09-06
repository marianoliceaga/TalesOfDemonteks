import Phaser from 'phaser';
import { createGameConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { RoomScene } from './scenes/RoomScene';
import { BattleScene } from './scenes/BattleScene';
import { HudScene } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';
import { GameOverScene } from './scenes/GameOverScene';
import { EndingScene } from './scenes/EndingScene';
import { TouchScene } from './scenes/TouchScene';
import { detectTouch, virtualInput } from './systems/VirtualInput';

/**
 * Punto de entrada.
 *
 * Esperamos a que la fuente pixel este lista antes de arrancar: Phaser mide el
 * texto al crearlo y, si la fuente llega despues, quedan los textos con el
 * ancho del fallback. Si la fuente no carga (sin red), arrancamos igual con la
 * monoespaciada del sistema.
 */
const SCENES = [
  BootScene,
  PreloadScene,
  MainMenuScene,
  RoomScene,
  BattleScene,
  HudScene,
  PauseScene,
  GameOverScene,
  EndingScene,
  // Ultima: el orden de esta lista es el orden de dibujado, y los controles
  // tactiles van encima de todo.
  TouchScene,
];

async function boot(): Promise<void> {
  if (detectTouch()) virtualInput.enable();

  try {
    await Promise.race([
      document.fonts.load('16px "Press Start 2P"').then(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* seguimos con la fuente de fallback */
  }

  const game = new Phaser.Game(createGameConfig(SCENES));

  // Handle para depurar desde la consola del navegador (solo en dev).
  if (import.meta.env.DEV) {
    (window as unknown as { __game: Phaser.Game }).__game = game;
  }
}

void boot();
