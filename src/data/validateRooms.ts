import { ROOMS } from './rooms';
import { ENEMIES } from './enemies';
import type { Cell, RoomDef } from '../types';

/**
 * Chequeos de integridad de src/data/rooms.ts.
 *
 * Los layouts son texto plano y las coordenadas son numeros sueltos: es muy
 * facil dejar un enemigo dentro de una pared o una puerta apuntando a una sala
 * que no existe. Esto corre una vez al arrancar (BootScene) y falla ruidoso,
 * en vez de dejar bugs silenciosos en runtime.
 */
export function validateRooms(): void {
  const errors: string[] = [];
  const roomIds = new Set(Object.keys(ROOMS));

  for (const room of Object.values(ROOMS)) {
    const prefix = `[sala ${room.id}]`;

    if (room.tiledMap) continue; // los mapas de Tiled se validan al cargarlos

    const height = room.layout.length;
    if (height === 0) {
      errors.push(`${prefix} layout vacio`);
      continue;
    }
    const width = room.layout[0]!.length;
    room.layout.forEach((row, y) => {
      if (row.length !== width) {
        errors.push(`${prefix} la fila ${y} mide ${row.length}, se esperaba ${width}`);
      }
    });

    const isFloor = (c: Cell): boolean => {
      const row = room.layout[c.cy];
      if (row === undefined) return false;
      return row[c.cx] === '.';
    };
    const checkCell = (c: Cell, what: string): void => {
      if (!isFloor(c)) errors.push(`${prefix} ${what} en (${c.cx},${c.cy}) no cae sobre piso`);
    };

    for (const [name, cell] of Object.entries(room.spawns)) checkCell(cell, `spawn "${name}"`);
    for (const d of room.doors) {
      checkCell(d, `puerta hacia ${d.toRoom}`);
      if (!roomIds.has(d.toRoom)) {
        errors.push(`${prefix} la puerta apunta a la sala inexistente "${d.toRoom}"`);
      } else if (!ROOMS[d.toRoom]!.spawns[d.toSpawn]) {
        errors.push(`${prefix} la sala "${d.toRoom}" no tiene el spawn "${d.toSpawn}"`);
      }
    }
    for (const e of room.enemies) {
      checkCell(e, `enemigo ${e.uid}`);
      if (!ENEMIES[e.enemy]) errors.push(`${prefix} enemigo desconocido "${e.enemy}" (uid ${e.uid})`);
      for (const p of e.patrol ?? []) checkCell(p, `patrulla de ${e.uid}`);
    }
    for (const d of room.decor ?? []) checkCell(d, `decoracion ${d.decor}`);
    if (room.savePoint) checkCell(room.savePoint, 'punto de guardado');
  }

  // uids de enemigos unicos a lo largo de todo el juego: son la clave con la que
  // el save recuerda a quien ya derrotaste.
  const seen = new Set<string>();
  for (const room of Object.values(ROOMS)) {
    for (const e of room.enemies) {
      if (seen.has(e.uid)) errors.push(`uid de enemigo duplicado: "${e.uid}"`);
      seen.add(e.uid);
    }
  }

  if (errors.length) {
    throw new Error(`Datos de salas invalidos:\n  - ${errors.join('\n  - ')}`);
  }
}

/** Ancho/alto en celdas de una sala. */
export function roomSize(room: RoomDef): { cols: number; rows: number } {
  return { cols: room.layout[0]?.length ?? 0, rows: room.layout.length };
}
