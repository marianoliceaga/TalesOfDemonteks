import Phaser from 'phaser';
import { GENERATED } from '../config/AssetKeys';
import { Palette } from '../config/Palette';

/**
 * Utilidades de textura.
 *
 * Dos cosas viven aca:
 *  1. `upscaleTexture`: los tilesets originales son de 16px y el juego dibuja
 *     tiles de 64px. En vez de escalar la capa del tilemap (que complica la
 *     fisica), re-escalamos la textura x4 por vecino mas cercano una sola vez
 *     y trabajamos con tiles de 64px "reales". Cero blur, cero medias celdas.
 *  2. Texturas proceduraless (proyectiles, punto de guardado): no existen como
 *     PNG en Assets/. Se generan con Graphics para no bloquear el MVP.
 *     TODO(arte): cuando existan los sprites, cargarlos en PreloadScene y
 *     reemplazar las keys de GENERATED en src/config/AssetKeys.ts.
 */

/** Re-escala una textura ya cargada por un factor entero, sin interpolar. */
export function upscaleTexture(
  scene: Phaser.Scene,
  srcKey: string,
  dstKey: string,
  factor: number,
): void {
  if (scene.textures.exists(dstKey)) return;

  const source = scene.textures.get(srcKey).getSourceImage();
  const width = source.width * factor;
  const height = source.height * factor;

  const canvasTexture = scene.textures.createCanvas(dstKey, width, height);
  if (!canvasTexture) throw new Error(`No se pudo crear la textura "${dstKey}"`);

  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  canvasTexture.refresh();
}

/**
 * Extrae UN tile del tileset, lo re-escala y lo aclara, para usarlo como piso.
 *
 * Por que hace falta: los tilesets de Assets/ fueron generados con prompts de
 * "sidescroller", asi que la pieza totalmente solida es un corte de tierra o
 * roca vista de costado, casi negra. Puesta como piso en top-down, la sala se
 * lee como un vacio. El tinte de Phaser multiplica (solo oscurece), asi que la
 * unica forma de recuperarla es aclararla al construir la textura.
 *
 * TODO(arte): cuando existan tiles de piso pensados para vista cenital, esto
 * sobra: se carga el PNG y listo.
 */
export function createFloorTexture(
  scene: Phaser.Scene,
  srcKey: string,
  dstKey: string,
  tileIndex: number,
  sourceTileSize: number,
  factor: number,
  filter = 'brightness(1.7) saturate(1.1)',
): void {
  if (scene.textures.exists(dstKey)) return;

  const source = scene.textures.get(srcKey).getSourceImage();
  const size = sourceTileSize * factor;
  const columns = Math.max(1, Math.floor(source.width / sourceTileSize));
  const sx = (tileIndex % columns) * sourceTileSize;
  const sy = Math.floor(tileIndex / columns) * sourceTileSize;

  const canvasTexture = scene.textures.createCanvas(dstKey, size, size);
  if (!canvasTexture) throw new Error(`No se pudo crear la textura "${dstKey}"`);

  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;
  // ctx.filter no existe en todos los motores; si falta, el piso queda oscuro
  // pero el juego sigue funcionando.
  ctx.filter = filter;
  ctx.drawImage(source as CanvasImageSource, sx, sy, sourceTileSize, sourceTileSize, 0, 0, size, size);
  ctx.filter = 'none';
  canvasTexture.refresh();
}

/** Crea las texturas generadas proceduralmente. Idempotente. */
export function createGeneratedTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  if (!scene.textures.exists(GENERATED.pixel)) {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture(GENERATED.pixel, 1, 1);
  }

  // Proyectil cuadrado (patrones "rain" y "fan").
  if (!scene.textures.exists(GENERATED.bulletSquare)) {
    g.clear();
    g.fillStyle(Palette.white, 1);
    g.fillRect(0, 0, 12, 12);
    g.fillStyle(Palette.violet, 1);
    g.fillRect(2, 2, 8, 8);
    g.generateTexture(GENERATED.bulletSquare, 12, 12);
  }

  // Proyectil redondo (patrones "wave" y "spiral").
  if (!scene.textures.exists(GENERATED.bulletRound)) {
    g.clear();
    g.fillStyle(Palette.white, 1);
    g.fillCircle(7, 7, 7);
    g.fillStyle(Palette.danger, 1);
    g.fillCircle(7, 7, 4);
    g.generateTexture(GENERATED.bulletRound, 14, 14);
  }

  // Proyectil alargado (patron "homing").
  if (!scene.textures.exists(GENERATED.bulletLong)) {
    g.clear();
    g.fillStyle(Palette.white, 1);
    g.fillRect(0, 0, 22, 8);
    g.fillStyle(Palette.violetDark, 1);
    g.fillRect(2, 2, 18, 4);
    g.generateTexture(GENERATED.bulletLong, 22, 8);
  }

  // Punto de guardado provisorio: un obelisco con un nucleo brillante.
  if (!scene.textures.exists(GENERATED.savePoint)) {
    g.clear();
    g.fillStyle(Palette.darkGrey, 1);
    g.fillRect(8, 10, 24, 38);
    g.fillStyle(Palette.grey, 1);
    g.fillRect(10, 12, 20, 34);
    g.fillStyle(Palette.violet, 1);
    g.fillRect(14, 4, 12, 18);
    g.fillStyle(Palette.white, 1);
    g.fillRect(17, 7, 6, 10);
    g.fillStyle(Palette.darkGrey, 1);
    g.fillRect(4, 46, 32, 6);
    g.generateTexture(GENERATED.savePoint, 40, 52);
  }

  g.destroy();
}
