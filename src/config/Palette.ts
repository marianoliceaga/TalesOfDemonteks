/**
 * Paleta limitada compartida por toda la UI.
 * Mantener el numero de colores bajo es lo que hace que el pixel-art se lea
 * coherente aunque los sprites vengan de fuentes distintas.
 */
export const Palette = {
  /* Base */
  black: 0x0b0b10,
  white: 0xf4f4ee,
  grey: 0x6e6a7a,
  darkGrey: 0x2a2733,

  /* Acentos "demontek" (violeta alien) */
  violet: 0x8a4fff,
  violetDark: 0x3a1e63,

  /* Estados */
  hpGreen: 0x4fd06a,
  hpYellow: 0xf2c14e,
  hpRed: 0xe03b3b,
  danger: 0xff4d4d,

  /*
   * Tinte del piso por bioma. El tinte de Phaser MULTIPLICA, asi que solo puede
   * oscurecer: por eso son colores casi blancos, apenas desviados de hue. Con
   * valores mas saturados el piso se va a negro y la sala parece un vacio.
   */
  tintJungle: 0xcfe8bb,
  tintDungeon: 0xc6d2e8,
  tintCastle: 0xd8cfe6,
} as const;

/** Version CSS de un color de la paleta (para Phaser.Text, que espera string). */
export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Familia tipografica pixel usada en toda la UI (ver index.html). */
export const FONT_FAMILY = '"Press Start 2P", "Courier New", monospace';
