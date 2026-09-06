import type { ItemDef, ItemId } from '../types';

/**
 * Kits de curacion.
 *
 * TODO: confirmar con el usuario — los kits se usan desde el menu de PAUSA
 * (inventario), no desde la caja de combate. Esa fue la asuncion tomada para
 * que el menu de batalla quede en solo dos opciones (FIGHT / ACT).
 */
export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  medkit: {
    id: 'medkit',
    name: 'KIT MEDICO',
    heal: 8,
    description: 'Vendas, alcohol y optimismo. Sobre todo optimismo.',
  },
  medkit_big: {
    id: 'medkit_big',
    name: 'KIT MEDICO+',
    heal: 20,
    description: 'Igual que el otro pero mas grande, que es como funciona la medicina.',
  },
};

/** Inventario con el que arranca una partida nueva. */
export const STARTING_ITEMS: Partial<Record<ItemId, number>> = {
  medkit: 3,
};
