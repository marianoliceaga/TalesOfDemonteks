import { ROOMS } from '../data/rooms';
import { SAVE_VERSION, type SaveData } from '../types';
import { gameState } from './GameState';

/**
 * Persistencia en localStorage.
 *
 * Un unico slot. El guardado solo ocurre en los puntos de guardado (ver
 * src/entities/SavePoint.ts): eso es lo que hace que el Game Over duela y que
 * el HP entre salas tenga peso.
 */
const STORAGE_KEY = 'tales-of-demonteks:save:v1';

/** localStorage puede tirar (modo privado, cuota, permisos). Nunca romper el juego por eso. */
function safeGet(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function isValid(data: unknown): data is SaveData {
  if (typeof data !== 'object' || data === null) return false;
  const s = data as Partial<SaveData>;
  return (
    s.version === SAVE_VERSION &&
    typeof s.roomId === 'string' &&
    typeof s.spawnId === 'string' &&
    typeof s.hp === 'number' &&
    typeof s.maxHp === 'number' &&
    Array.isArray(s.defeated) &&
    Array.isArray(s.visited) &&
    // Una sala borrada de rooms.ts invalidaria el save: mejor detectarlo aca.
    ROOMS[s.roomId] !== undefined
  );
}

export const SaveSystem = {
  hasSave(): boolean {
    return SaveSystem.load() !== null;
  },

  load(): SaveData | null {
    const raw = safeGet();
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  /** Guarda el estado actual. `spawnId` es donde reaparece tras un Game Over. */
  save(roomId: string, spawnId: string): boolean {
    gameState.currentRoom = roomId;
    gameState.currentSpawn = spawnId;
    gameState.lastSave = { roomId, spawnId };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState.toSave()));
      return true;
    } catch {
      return false;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nada que hacer */
    }
  },
};
