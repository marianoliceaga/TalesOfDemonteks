import Phaser from 'phaser';
import { Palette } from './Palette';

/**
 * Escala de render (decidida con los assets reales en la mano):
 *
 *   Los sprites de personaje son de 128x128 y los tiles de 16x16: hay un salto
 *   de 8x entre ambos. La opcion elegida es "tiles x4, personajes al 100%":
 *     - el tileset de 16px se re-escala a 64px por vecino mas cercano (entero, nitido)
 *     - los personajes se dibujan a 128px nativos => 2 tiles de alto
 *     - alto de vista 540, ancho adaptado a la pantalla, Scale.FIT + autoCenter
 *   Todo queda en multiplos enteros: cero resampleo, cero blur.
 *
 * Para probar la alternativa "tiles x2 / personajes al 50%" alcanza con:
 *   TILE_UPSCALE = 2, CHAR_SCALE = 0.5, DESIGN_WIDTH = 480, BASE_HEIGHT = 270.
 */
/**
 * El alto es fijo: es lo que define la escala de render (13 filas de tiles de
 * 64 px entran justas) y no se toca.
 */
export const BASE_HEIGHT = 540;

/**
 * Ancho de diseno, 16:9. Es el MINIMO: en una pantalla mas angosta que esto se
 * letterboxea, nunca se muestra menos mundo.
 */
export const DESIGN_WIDTH = 960;

/**
 * Tope del ancho de vista.
 *
 * Las salas miden 20 celdas x 64 px = 1280 px de ancho. Pasarse de ahi dejaria
 * a la camara con bounds mas angostos que su propia vista, que es un caso que
 * Phaser resuelve de formas raras. Ademas a 1280 ya se ve la sala entera de
 * lado a lado y la camara deja de tener para donde moverse.
 */
const MAX_VIEW_WIDTH = 1280;

let currentViewWidth = DESIGN_WIDTH;

/**
 * Ancho real del canvas, en pixeles de juego.
 *
 * Es una funcion y no una constante porque se decide al arrancar, segun la
 * pantalla. Leerlo a nivel de modulo devolveria el valor de diseno: siempre
 * llamarlo dentro de `create()` o del constructor.
 */
export function viewWidth(): number {
  return currentViewWidth;
}

/**
 * Calcula el ancho de vista a partir de la forma de la pantalla y lo deja
 * fijado para el resto de la partida. Se llama una sola vez, antes de crear el
 * juego.
 *
 * Los telefonos actuales son mucho mas anchos que 16:9 (el iPhone 12 y
 * posteriores rondan 2.16, y un Android de 720x1600 llega a 2.22), asi que con
 * un ancho fijo de 960 quedaba un cuarto de pantalla en barras negras. En vez de
 * estirar la imagen —que arruinaria el pixel art— se muestra mas mundo a los
 * costados.
 *
 * Se pasan el lado largo y el corto, no el viewport tal cual: el juego es
 * apaisado y la pagina puede cargar con el telefono en vertical.
 */
export function measureViewWidth(longSide: number, shortSide: number): number {
  if (shortSide > 0) {
    const wanted = BASE_HEIGHT * (longSide / shortSide);
    const clamped = Math.min(Math.max(wanted, DESIGN_WIDTH), MAX_VIEW_WIDTH);
    // Multiplo de 4 para que el centro caiga en pixel entero: si no, los textos
    // centrados quedan a medio pixel y el pixel art se ve sucio.
    currentViewWidth = Math.round(clamped / 4) * 4;
  }
  return currentViewWidth;
}

/** Factor de re-escalado del tileset original de 16px. */
export const TILE_UPSCALE = 4;
/** Tamano del tile en unidades de mundo. */
export const TILE_SIZE = 16 * TILE_UPSCALE; // 64
/** Escala a la que se dibujan los personajes de 128px. */
export const CHAR_SCALE = 1;

/** Velocidad del Explorer en exploracion (px/s). Constante, sin inercia (estilo Undertale). */
export const PLAYER_SPEED = 210;
/** Velocidad dentro de la caja de esquive. */
export const PLAYER_SPEED_BATTLE = 190;

/**
 * Cuerpo de colision del jugador: chico y a los pies, no el sprite entero.
 * Los offsets son relativos a la esquina superior izquierda del frame de 128x128.
 */
export const PLAYER_BODY = { width: 44, height: 26, offsetX: 42, offsetY: 86 };

/**
 * Dentro de la caja de esquive el Explorer se dibuja a la mitad (64px): un
 * sprite de 128px no deja lugar para esquivar nada. 0.5 es un halving exacto,
 * asi que no hay resampleo sucio.
 */
export const PLAYER_BATTLE_SCALE = 0.5;

/** Cuerpo del jugador dentro de la caja (en espacio de textura, sin escalar). */
export const PLAYER_BODY_BATTLE = { width: 40, height: 44, offsetX: 44, offsetY: 58 };

/** Geometria de la caja de esquive, en coordenadas de pantalla. */
export const BATTLE_BOX = { width: 660, height: 230 };

/** HP inicial del Explorer. */
export const PLAYER_MAX_HP = 20;

/** Duracion de la invulnerabilidad tras recibir un golpe (ms). */
export const IFRAMES_MS = 700;

export const DEPTH = {
  ground: 0,
  decor: 5,
  walls: 10,
  entities: 20,
  overlay: 100,
  ui: 1000,
} as const;

export function createGameConfig(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: viewWidth(),
    height: BASE_HEIGHT,
    backgroundColor: Palette.black,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      // Por defecto Phaser prende el tactil segun su propio sniffing de
      // dispositivo, que no tiene por que coincidir con el nuestro (ver
      // `detectTouch`). Si los dos no opinan lo mismo quedan controles en
      // pantalla que no responden, asi que lo prendemos siempre: en una compu
      // sin pantalla tactil no llega ningun evento y no molesta.
      touch: true,
      // Caminar y accionar al mismo tiempo necesita mas de un dedo. Tres deja
      // margen para el pulgar que se apoya de mas.
      activePointers: 3,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false, // poner en true para ver los cuerpos de colision
      },
    },
    scene: scenes,
  };
}
