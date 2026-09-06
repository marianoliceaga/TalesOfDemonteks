import Phaser from 'phaser';

/**
 * Cancela los tweens que apuntan a un objeto, sin importar en que momento del
 * ciclo de vida de la escena estemos.
 *
 * Por que existe: si un objeto guarda su tween y hace `tween.remove()` dentro de
 * su `destroy()`, funciona mientras lo destruyas vos; pero cuando la escena se
 * apaga, el TweenManager ya vacio sus cadenas y `remove()` tira
 * "Cannot read properties of undefined (reading 'setRemovedState')".
 * `killTweensOf` es seguro en los dos casos: si el manager ya se apago, no hace
 * nada.
 */
export function killTweens(scene: Phaser.Scene | undefined, target: object): void {
  scene?.tweens?.killTweensOf(target);
}
