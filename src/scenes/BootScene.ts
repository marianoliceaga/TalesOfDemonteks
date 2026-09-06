import Phaser from 'phaser';
import { MISC } from '../config/AssetKeys';
import { validateRooms } from '../data/validateRooms';

/**
 * Arranque. Solo dos cosas:
 *  - validar los datos de salas (falla ruidoso si hay una puerta rota o un
 *    enemigo dentro de una pared, en vez de romper a mitad de partida)
 *  - cargar el splash para poder mostrar algo mientras carga el resto
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    validateRooms();
    this.load.image(MISC.splash.key, MISC.splash.path);
  }

  create(): void {
    this.scene.start('Preload');
  }
}
