/**
 * Textos genericos. El ACT tiene las MISMAS opciones para todos los enemigos
 * (decision explicita del alcance del MVP); lo que cambia por enemigo son los
 * textos de `check` y `talk`, que viven en src/data/enemies.ts.
 */

export const ACT_OPTIONS = ['TALK', 'CHECK'] as const;
export type ActOption = (typeof ACT_OPTIONS)[number];

export const SAVE_POINT_LINES = [
  'Un punto de guardado. Zumba como una heladera vieja.',
  'La sensacion de que esto podria salir bien te llena de determinacion.',
];

export const SAVE_POINT_DONE = 'Partida guardada. HP al maximo.\n(Tampoco te confies.)';

export const GAME_OVER_LINES = [
  'No te rindas todavia...',
  'El Explorer no puede terminar asi.',
  'Alguien alla afuera todavia te espera. Probablemente para cobrarte algo.',
];

export const BATTLE_MISS = 'Fallaste. El enemigo lo nota. Es peor que el dano.';

export const NO_ITEMS = 'No te queda ningun kit. Solo actitud.';
