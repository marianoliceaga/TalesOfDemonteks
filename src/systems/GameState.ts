import { PLAYER_MAX_HP } from '../config/GameConfig';
import { ITEM_DEFS, STARTING_ITEMS } from '../data/items';
import { FIRST_ROOM, FIRST_SPAWN } from '../data/rooms';
import { SAVE_VERSION, type ItemId, type RoomId, type SaveData } from '../types';

/**
 * Estado de la partida en memoria.
 *
 * Es un singleton a proposito: las escenas de Phaser se crean y destruyen todo
 * el tiempo (cambiar de sala reinicia RoomScene, entrar en combate lanza otra
 * escena encima) y el HP, el inventario y los enemigos ya derrotados tienen que
 * sobrevivir a todo eso. SaveSystem solo serializa/deserializa este objeto.
 */
class GameState {
  hp = PLAYER_MAX_HP;
  maxHp = PLAYER_MAX_HP;
  items: Partial<Record<ItemId, number>> = {};
  /** uids de EnemySpawn ya derrotados: no vuelven a aparecer. */
  defeated = new Set<string>();
  /** Salas ya visitadas: el texto de intro se muestra una sola vez. */
  visited = new Set<RoomId>();

  currentRoom: RoomId = FIRST_ROOM;
  currentSpawn = FIRST_SPAWN;

  /** Ultimo punto de guardado. Es a donde vuelve el jugador tras un Game Over. */
  lastSave: { roomId: RoomId; spawnId: string } = { roomId: FIRST_ROOM, spawnId: FIRST_SPAWN };

  /** Se pone en true cuando el Rey cae: lo usa RoomScene para el final. */
  gameCleared = false;

  reset(): void {
    this.hp = PLAYER_MAX_HP;
    this.maxHp = PLAYER_MAX_HP;
    this.items = { ...STARTING_ITEMS };
    this.defeated.clear();
    this.visited.clear();
    this.currentRoom = FIRST_ROOM;
    this.currentSpawn = FIRST_SPAWN;
    this.lastSave = { roomId: FIRST_ROOM, spawnId: FIRST_SPAWN };
    this.gameCleared = false;
  }

  /* ------------------------------ HP ------------------------------ */

  get isDead(): boolean {
    return this.hp <= 0;
  }

  damage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  fullHeal(): void {
    this.hp = this.maxHp;
  }

  /* --------------------------- Inventario -------------------------- */

  itemCount(id: ItemId): number {
    return this.items[id] ?? 0;
  }

  get totalItems(): number {
    return Object.values(this.items).reduce<number>((sum, n) => sum + (n ?? 0), 0);
  }

  addItem(id: ItemId, amount = 1): void {
    this.items[id] = this.itemCount(id) + amount;
  }

  /**
   * Consume un kit y cura. Devuelve el HP realmente recuperado, o null si no
   * habia stock o el HP ya estaba al maximo.
   */
  useItem(id: ItemId): number | null {
    if (this.itemCount(id) <= 0) return null;
    if (this.hp >= this.maxHp) return null;
    const healed = this.heal(ITEM_DEFS[id].heal);
    this.items[id] = this.itemCount(id) - 1;
    return healed;
  }

  /* --------------------------- Progresion -------------------------- */

  isDefeated(uid: string): boolean {
    return this.defeated.has(uid);
  }

  markDefeated(uid: string): void {
    this.defeated.add(uid);
  }

  /** Devuelve true la primera vez que se entra a la sala. */
  markVisited(roomId: RoomId): boolean {
    if (this.visited.has(roomId)) return false;
    this.visited.add(roomId);
    return true;
  }

  /* ------------------------- Serializacion ------------------------- */

  toSave(): SaveData {
    return {
      version: SAVE_VERSION,
      roomId: this.currentRoom,
      spawnId: this.currentSpawn,
      hp: this.hp,
      maxHp: this.maxHp,
      items: { ...this.items },
      defeated: [...this.defeated],
      visited: [...this.visited],
      savedAt: Date.now(),
    };
  }

  loadFrom(save: SaveData): void {
    this.hp = save.hp;
    this.maxHp = save.maxHp;
    this.items = { ...save.items };
    this.defeated = new Set(save.defeated);
    this.visited = new Set(save.visited);
    this.currentRoom = save.roomId;
    this.currentSpawn = save.spawnId;
    this.lastSave = { roomId: save.roomId, spawnId: save.spawnId };
    this.gameCleared = false;
  }
}

export const gameState = new GameState();
