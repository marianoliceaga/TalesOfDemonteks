/**
 * sync-assets.mjs
 *
 * Assets/ es la fuente de verdad (venia de un proyecto Godot: ~4000 archivos,
 * la mitad .import que no sirven en web). Vite solo sirve estaticos desde public/,
 * asi que este script copia UNICAMENTE el subset que el juego usa a public/assets/.
 *
 * - Corre solo en `npm run predev` / `prebuild`, o a mano: `npm run sync-assets`.
 * - public/assets/ esta gitignoreado: es 100% derivado.
 * - Si agregas un asset nuevo: sumalo aca Y en src/config/AssetKeys.ts.
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'Assets');
const DST = join(ROOT, 'public', 'assets');

/** Personajes cuyos spritesheets (*_sheet.png) se copian enteros (~3 MB en total). */
const CHARACTERS = ['explorer', 'demontek', 'guard_demontek', 'mutant_demontek', 'goliath', 'king_demontek'];

/** Copias directorio->directorio filtradas por predicado sobre el nombre de archivo. */
const DIR_RULES = [
  ...CHARACTERS.map((c) => ({
    from: join('characters', c),
    to: join('characters', c),
    recursive: false,
    match: (f) => f.endsWith('_sheet.png'),
  })),
  { from: 'tilesets', to: 'tilesets', recursive: false, match: (f) => /_tileset_16x16(_metadata)?\.(png|json)$/.test(f) },
  { from: 'decorations', to: 'decorations', recursive: false, match: (f) => f.endsWith('.png') },
  { from: join('items', 'weapons'), to: 'items', recursive: false, match: (f) => f.endsWith('.png') },
  { from: 'UI', to: 'ui', recursive: false, match: (f) => f.endsWith('.png') },
];

/** Archivos sueltos con renombre (los mp3 originales tienen espacios y parentesis). */
const FILE_RULES = [
  ['splash.png', 'splash.png'],

  // Pantalla de final.
  [join('story', 'Level3', 'story_scene_3.png'), join('story', 'ending_bg.png')],
  [join('Cinematics', 'Ingredients', 'Explorer.png'), join('story', 'portrait_explorer.png')],

  // Musica (una por bioma + tema principal + loop de victoria).
  [join('audio', 'music', 'MainTheme.mp3'), join('audio', 'music_main.mp3')],
  [join('audio', 'music', 'Level1 (The Jungle).mp3'), join('audio', 'music_jungle.mp3')],
  [join('audio', 'music', 'Level 2 (The Dungeon).mp3'), join('audio', 'music_dungeon.mp3')],
  [join('audio', 'music', 'Level 3 (The Castle).mp3'), join('audio', 'music_castle.mp3')],
  [join('audio', 'music', 'Victoryy_Loop.mp3'), join('audio', 'music_victory.mp3')],

  // SFX de UI.
  [join('audio', 'sfx', 'UI_Sounds', 'Button_Click.mp3'), join('audio', 'sfx_ui_click.mp3')],
  [join('audio', 'sfx', 'UI_Sounds', 'Menu_Navigate.mp3'), join('audio', 'sfx_ui_move.mp3')],
  [join('audio', 'sfx', 'UI_Sounds', 'Save_Game.mp3'), join('audio', 'sfx_save.mp3')],
  [join('audio', 'sfx', 'UI_Sounds', 'Error_Buzz.mp3'), join('audio', 'sfx_error.mp3')],

  // SFX del jugador.
  [join('audio', 'sfx', 'Player', 'Knife_Slash.mp3'), join('audio', 'sfx_slash.mp3')],
  [join('audio', 'sfx', 'Player', 'Knife_Hit_Enemy.mp3'), join('audio', 'sfx_hit.mp3')],
  [join('audio', 'sfx', 'Player', 'Player_Hurt_01.mp3'), join('audio', 'sfx_player_hurt.mp3')],
  [join('audio', 'sfx', 'Player', 'Player_Heal.mp3'), join('audio', 'sfx_heal.mp3')],
  [join('audio', 'sfx', 'Player', 'Player_Death.mp3'), join('audio', 'sfx_player_death.mp3')],
  [join('audio', 'sfx', 'Player', 'Checkpoint_Activate.mp3'), join('audio', 'sfx_checkpoint.mp3')],
];

let copied = 0;
let missing = [];

async function copyFile(from, to) {
  const src = join(SRC, from);
  if (!existsSync(src)) {
    missing.push(from);
    return;
  }
  const dst = join(DST, to);
  await mkdir(dirname(dst), { recursive: true });
  await cp(src, dst);
  copied++;
}

async function applyDirRule(rule) {
  const dir = join(SRC, rule.from);
  if (!existsSync(dir)) {
    missing.push(rule.from + '/');
    return;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) continue;
    if (!rule.match(e.name)) continue;
    await copyFile(join(rule.from, e.name), join(rule.to, e.name));
  }
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`[sync-assets] No encuentro ${SRC}. Este script espera correr desde la raiz del repo.`);
    process.exit(1);
  }
  await rm(DST, { recursive: true, force: true });
  await mkdir(DST, { recursive: true });

  for (const rule of DIR_RULES) await applyDirRule(rule);
  for (const [from, to] of FILE_RULES) await copyFile(from, to);

  let bytes = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else bytes += (await stat(p)).size;
    }
  };
  await walk(DST);

  console.log(`[sync-assets] ${copied} archivos -> ${relative(ROOT, DST)} (${(bytes / 1048576).toFixed(1)} MB)`);
  if (missing.length) {
    console.warn(`[sync-assets] ${missing.length} entradas no encontradas en Assets/:`);
    for (const m of missing) console.warn(`  - ${m}`);
  }
}

main().catch((err) => {
  console.error('[sync-assets] fallo:', err);
  process.exit(1);
});
