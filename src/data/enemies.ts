import type { EnemyDef, EnemyId } from '../types';

/**
 * Definicion central de enemigos.
 *
 * Agregar un enemigo nuevo = agregar una entrada aca (y, si usa un patron de
 * proyectiles nuevo, un archivo en src/combat/patterns/ + su registro en
 * BulletPatterns.ts). Ninguna escena hardcodea stats de enemigos.
 *
 * Los sprites salen de Assets/characters/<character>/. Cada enemigo usa una
 * animacion distinta de ataque segun lo que tiene disponible: los "demontek"
 * pegan (cross-punch) y los jefes lanzan magia (attack_magic).
 *
 * Tono: dark comedy. Los textos estan en castellano; los labels del menu
 * (FIGHT / ACT / CHECK / TALK) quedan en ingles a proposito, por la referencia.
 */
export const ENEMIES: Record<EnemyId, EnemyDef> = {
  demontek: {
    id: 'demontek',
    name: 'DEMONTEK',
    character: 'demontek',
    idle: { anim: 'breathing-idle', dir: 'south' },
    attack: { anim: 'cross-punch', dir: 'south' },
    maxHp: 30,
    bulletDamage: 2,
    fightBaseDamage: 10,
    pattern: 'rain',
    dodgeSeconds: 5,
    battleScale: 1.35,
    check: 'DEMONTEK - ATK 2 / DEF 1\nUn demonio con implantes que no pidio.\nLa garantia vencio hace 400 anios.',
    talk: [
      'Le preguntas como esta. Responde con un pitido de error.',
      'Elogias sus implantes. Se le cae uno. Los dos hacen como que no pasó.',
      'Le contas un chiste. No se rie. Vos tampoco, para ser justos.',
    ],
    defeat: 'El DEMONTEK se apaga. Un ventilador interno sigue girando un rato mas.',
  },

  guard: {
    id: 'guard',
    name: 'GUARDIA DEMONTEK',
    character: 'guard_demontek',
    idle: { anim: 'breathing-idle', dir: 'south' },
    attack: { anim: 'cross-punch', dir: 'south' },
    maxHp: 42,
    bulletDamage: 2,
    fightBaseDamage: 10,
    pattern: 'fan',
    dodgeSeconds: 6,
    battleScale: 1.35,
    check: 'GUARDIA DEMONTEK - ATK 2 / DEF 3\nHace 200 anios que cubre el turno noche.\nNadie vino a relevarlo. Nadie va a venir.',
    talk: [
      'Le preguntas por su turno. Dice que termina "pronto". Miente.',
      'Le mencionas el sindicato. Se emociona. Despues recuerda que no existe.',
      'Le pedis indicaciones. Te senala tres direcciones a la vez.',
    ],
    defeat: 'El GUARDIA cae. Por primera vez en dos siglos, se toma el descanso.',
  },

  /**
   * Variante del guardia. No hay un sexto personaje en Assets/characters/, asi
   * que este reusa el arte del guardia con un tinte verde. El guardia es el
   * unico sprite poco saturado del set, y por eso es el unico que aguanta bien
   * un tinte (el tinte multiplica: sobre los sprites rojos solo los oscurece).
   * TODO(arte): si alguna vez hay un sexto personaje propio, cambiar
   * `character` y borrar `tint`.
   */
  sentinel: {
    id: 'sentinel',
    name: 'CENTINELA MOHOSO',
    character: 'guard_demontek',
    tint: 0x9fe08a,
    idle: { anim: 'breathing-idle', dir: 'south' },
    attack: { anim: 'cross-punch', dir: 'south' },
    maxHp: 50,
    bulletDamage: 3,
    fightBaseDamage: 11,
    pattern: 'walls',
    dodgeSeconds: 6,
    battleScale: 1.4,
    check:
      'CENTINELA MOHOSO - ATK 3 / DEF 3\nLo dejaron custodiando una puerta que ya no existe.\nLa humedad hizo el resto.',
    talk: [
      'Le preguntas que custodia. Senala una pared. La pared no opina.',
      'Le decis que la puerta ya no esta. Responde que igual hay que custodiarla.',
      'Le ofreces relevarlo. Se emociona. Despues recuerda el papeleo.',
    ],
    defeat: 'El CENTINELA se desarma. La puerta que no existe queda sin vigilancia.',
  },

  mutant: {
    id: 'mutant',
    name: 'MUTANTE DEMONTEK',
    character: 'mutant_demontek',
    idle: { anim: 'breathing-idle', dir: 'south' },
    attack: { anim: 'cross-punch', dir: 'south' },
    maxHp: 55,
    bulletDamage: 3,
    fightBaseDamage: 11,
    pattern: 'wave',
    dodgeSeconds: 6,
    battleScale: 1.45,
    check: 'MUTANTE DEMONTEK - ATK 3 / DEF 2\nResultado de un experimento exitoso.\nEl problema es que nadie recuerda cual era el objetivo.',
    talk: [
      'Le preguntas que le hicieron. Contesta: "mejoras". No especifica.',
      'Intentas un saludo de mano. Elige mal el brazo. Los dos eligen mal.',
      'Le decis que se lo ve bien. Es la primera vez que se lo dicen. Duda.',
    ],
    defeat: 'El MUTANTE se desarma en partes que, honestamente, nunca encajaron.',
  },

  goliath: {
    id: 'goliath',
    name: 'GOLIATH',
    character: 'goliath',
    idle: { anim: 'breathing-idle', dir: 'south' },
    attack: { anim: 'attack_magic', dir: 'south' },
    maxHp: 80,
    bulletDamage: 3,
    fightBaseDamage: 12,
    pattern: 'spiral',
    dodgeSeconds: 7,
    battleScale: 1.6,
    check: 'GOLIATH - ATK 3 / DEF 4\nMide cuatro metros y tiene miedo a los espacios abiertos.\nPor eso vive en un pasillo.',
    talk: [
      'Le preguntas si no le duele la espalda. Silencio muy largo. Si le duele.',
      'Le ofrecés terapia. Te lanza una bola de fuego. Progreso, igual.',
      'Le decis que es mas alto que vos. Ya lo sabia. Igual le gustó.',
    ],
    defeat: 'GOLIATH se arrodilla. El pasillo, por fin, le queda comodo.',
  },

  king: {
    id: 'king',
    name: 'REY DEMONTEK',
    character: 'king_demontek',
    idle: { anim: 'breathing-idle', dir: 'south' },
    attack: { anim: 'attack_magic', dir: 'east' },
    maxHp: 110,
    bulletDamage: 4,
    fightBaseDamage: 13,
    pattern: 'homing',
    dodgeSeconds: 8,
    battleScale: 1.7,
    check: 'REY DEMONTEK - ATK 4 / DEF 5\nGobierna un reino de tres salas y media.\nInsiste en que "la mitad cuenta".',
    talk: [
      'Le pedis una audiencia. Dice que ya estas en una. Tecnicamente si.',
      'Le preguntas por su reino. Enumera dos salas y se pone a la defensiva.',
      'Le ofreces rendirte. Se ofende: dice que arruinarias el tercer acto.',
    ],
    defeat: 'La corona toca el suelo antes que el. Prioridades.',
  },
};

export function getEnemy(id: EnemyId): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Enemigo desconocido: ${id}`);
  return def;
}
