# Tales of Demonteks

Top-down pixel-art con combate estilo Undertale. **Phaser 3 + Vite + TypeScript estricto**.
Dark comedy, fantasía medieval con alienígenas. Un solo personaje jugable: **The Explorer**.

---

## Cómo correrlo

```bash
npm install
npm run dev
```

`predev` corre `scripts/sync-assets.mjs`, que copia a `public/assets/` el subset de
`Assets/` que el juego usa (223 archivos, ~32 MB). Después abrí la URL que imprime Vite.

Otros comandos:

```bash
npm run build       # typecheck + build de produccion en dist/
npm run typecheck   # solo tsc --noEmit
npm run sync-assets # recopiar assets a mano
npm run preview     # servir dist/
```

**Controles**

| Acción | Teclas |
|---|---|
| Mover | WASD / flechas |
| Interactuar, confirmar, avanzar diálogo | `E`, `ESPACIO`, `ENTER` |
| Volver (submenú de ACT) | `X`, `BACKSPACE` |
| Pausa / inventario | `ESC`, `P` |

---

## Estructura

```
Assets/                     fuente de verdad de arte y audio (no se toca, viene del proyecto Godot)
public/assets/              GENERADO por sync-assets.mjs — gitignoreado, 100% derivado
scripts/sync-assets.mjs     copia el subset usado de Assets/ -> public/assets/ (y renombra los mp3)
scripts/ascii-to-tiled.mjs  convierte un layout ASCII a un mapa de Tiled editable
public/maps/                mapas de Tiled (fuente, NO derivados: se versionan)
src/
  config/
    AssetKeys.ts            ÚNICO lugar con rutas y keys de assets. Si renombrás algo, es acá
    GameConfig.ts           resolución base, escala de render, velocidades, hitboxes, depths
    Palette.ts              paleta pixel-art compartida + fuente
  data/
    enemies.ts              EnemyDef[]: HP, daño, sprites, patrón de proyectiles, textos de ACT
    rooms.ts                RoomDef[]: layout ASCII, spawns, enemigos, puertas, punto de guardado
    items.ts                kits de curación
    dialogue.ts             textos genéricos (opciones de ACT, punto de guardado, game over)
    ending.ts               texto de la pantalla de final
    validateRooms.ts        chequeos de integridad de rooms.ts, corren al arrancar
  entities/
    Player.ts               movimiento 4-direcciones sin inercia, idle mira la última dirección
    OverworldEnemy.ts       patrulla por celdas; al tocarlo arranca el combate
    SavePoint.ts            guardar + curar al máximo
    Door.ts                 transición entre salas
  combat/
    BattleBox.ts            caja de esquive: recorte, movimiento confinado, proyectiles
    BattleMenu.ts           FIGHT / ACT (+ submenú TALK / CHECK)
    TimingBar.ts            barra de timing del FIGHT, genérica para cualquier enemigo
    BulletPatterns.ts       registro id -> función emisora
    patterns/               un archivo por patrón (rain, fan, wave, spiral, walls, homing)
  scenes/
    BootScene.ts            valida los datos de salas y carga el splash
    PreloadScene.ts         carga sheets, tilesets, decoración y SFX; registra animaciones
    MainMenuScene.ts        START / CONTINUE
    RoomScene.ts            UNA sola escena de exploración, parametrizada por roomId
    BattleScene.ts          orquesta el turno: menú -> FIGHT/ACT -> esquive -> menú
    HudScene.ts             HP y nombre de sala, overlay persistente
    PauseScene.ts           inventario (kits), opciones de audio y volver al menú principal
    GameOverScene.ts        reintentar desde el último guardado
    EndingScene.ts          final del juego: cierre + THE END + resumen de la partida
  systems/
    GameState.ts            estado en memoria (HP, inventario, enemigos derrotados, sala)
    SaveSystem.ts           persistencia en localStorage
    AnimationFactory.ts     carga de spritesheets y registro de animaciones
    AudioSystem.ts          música por sala (carga bajo demanda), SFX y mute independiente
    WangRoomBuilder.ts      arma la geometría de la sala desde el layout ASCII
    TextureUtils.ts         re-escalado de tilesets y texturas procedurales
    InputController.ts      mapa de teclas único para todas las escenas
    tweens.ts               cancelación de tweens segura durante el shutdown
  ui/
    DialogueBox.ts          caja blanca con borde negro, typewriter, triángulo parpadeante
    HealthBar.ts            barra de HP (exploración y combate)
    Menu.ts                 lista navegable reusable
```

---

## Assets: lo que hay de verdad

Los nombres del brief (`player.png`, `enemy_01.png`, `tileset_dungeon.png`, `save_point.png`) no
existen. Esto es lo que hay en `Assets/`, y a lo que apunta `src/config/AssetKeys.ts`:

**Personajes** — `Assets/characters/<nombre>/<nombre>_<anim>_<dir>_sheet.png`
Frames de **128×128 en fila horizontal con 2px de separación** (4 frames = 4·128 + 3·2 = 518px).
Un PNG por animación **y** por dirección (`north`/`south`/`east`/`west`).

- `explorer` — The Explorer. Tiene las 4 direcciones de `breathing-idle`, `walking-8-frames`,
  `cross-punch` (ataque) y `taking-punch` (golpe recibido).
- `demontek`, `guard_demontek`, `mutant_demontek`, `goliath`, `king_demontek` — los 5 personajes
  enemigos. No todos tienen las 4 direcciones; en el MVP los enemigos solo se dibujan de frente
  dentro de la caja de combate, así que alcanza con la dirección que declara cada `EnemyDef`.
  El **sexto enemigo** (`sentinel`, CENTINELA MOHOSO) reusa el arte de `guard_demontek` con un
  tinte verde (`EnemyDef.tint`): es el único sprite poco saturado del set y por eso el único que
  aguanta bien un tinte — el tinte multiplica, así que sobre los sprites rojos solo los oscurece.
  Si algún día hay un sexto personaje propio, se cambia `character` y se borra `tint`.

**Tilesets** — `Assets/tilesets/<tema>_tileset_16x16.png` (`jungle`, `dungeon`, `castle`)
PNG de 64×64 = grilla 4×4 de **16 wang tiles de 16px**, con su `_metadata.json` describiendo las
esquinas de cada pieza.

**Audio** — 123 mp3 en `Assets/audio/`. El juego usa música por bioma + tema principal y una
decena de SFX; `sync-assets.mjs` los renombra a nombres sin espacios.

### Limitaciones conocidas del arte (no son bugs)

1. **Los tilesets son de sidescroller.** Sus propios metadatos dicen `"tileset_type": "sidescroller"`:
   la pieza totalmente sólida es un corte de tierra/roca visto de costado, casi negro, y las piezas
   con detalle son los bordes con pasto arriba. Puestas en cenital funcionan como pared/piso, pero
   se leen aproximadas. Para compensar, `TextureUtils.createFloorTexture()` extrae la pieza sólida y
   la aclara (`brightness(1.7)`) para que el piso no sea un vacío negro. **Cuando existan tiles
   pensados para vista cenital, esa función sobra: se carga el PNG y listo.**
2. **Los personajes son template `mannequin` con `view: "side"`.** Las 4 rotaciones existen, pero
   están dibujadas de costado; en top-down se leen bien pero no son sprites cenitales.
3. **La ilustración del Explorer (`Cinematics/Ingredients/Explorer.png`) viene sin canal alfa**, con
   fondo negro opaco. `EndingScene` la dibuja en modo `ADD`, donde el negro no suma nada: el recorte
   sale gratis y de paso queda un halo.
4. **No existe sprite de punto de guardado.** Se dibuja proceduralmente en
   `TextureUtils.createGeneratedTextures()` (obelisco con núcleo violeta). Mismo caso para los
   proyectiles del combate. Todos están marcados con `TODO(arte)`.
5. **En `Assets/UI/` solo hay 5 botones táctiles.** Las cajas de diálogo y de combate se dibujan con
   `Graphics` — que además es lo correcto para el look Undertale, así que no hace falta arte.

---

## Escala de render

Los sprites son de 128px y los tiles de 16px: hay un salto de 8×. La opción elegida
(`src/config/GameConfig.ts`) es **tiles ×4, personajes al 100%**:

- resolución base **960×540**, `Phaser.Scale.FIT` + `autoCenter`, `pixelArt: true`, `roundPixels: true`
- el tileset de 16px se re-escala a **64px** por vecino más cercano (entero, nítido)
- los personajes se dibujan a **128px nativos** → 2 tiles de alto

Todo queda en múltiplos enteros: cero resampleo, cero blur. Para probar la alternativa
"tiles ×2 / personajes al 50%" alcanza con cambiar cuatro constantes en `GameConfig.ts`:

```ts
export const BASE_WIDTH = 480;
export const BASE_HEIGHT = 270;
export const TILE_UPSCALE = 2;
export const CHAR_SCALE = 0.5;
```

Dentro de la caja de combate el Explorer se dibuja al 50% (`PLAYER_BATTLE_SCALE`): a 128px no queda
lugar para esquivar nada.

---

## Cómo están hechas las salas

El layout de cada sala es una grilla ASCII en `src/data/rooms.ts` (`#` = pared, `.` = piso).
`WangRoomBuilder` la convierte en tres capas:

1. **Piso** — la sala entera con la textura de piso del bioma (aclarada, ver arriba).
2. **Paredes** — *dual grid*: la capa visible se dibuja desplazada media celda y tiene
   `(cols+1)×(rows+1)` tiles. Cada tile mira las **4 celdas lógicas que lo rodean** y elige la pieza
   wang correspondiente. Así los bordes y las esquinas salen bien sin dibujarlos a mano. La tabla
   `máscara → índice de tile` se deriva del `_metadata.json` del tileset, con un fallback fijo.
3. **Colisión** — capa invisible alineada a la grilla lógica (no a la visible, que está desplazada),
   para que lo que se ve y lo que frena al jugador coincidan exactamente.

Cada sala usa el tileset de su bioma para el piso y **otro** para las paredes (`wallTheme`), que es
lo que da contraste entre ambos.

`validateRooms()` corre en `BootScene` y falla ruidoso si una fila mide distinto, si un spawn /
puerta / enemigo / punto de guardado cae sobre pared, si una puerta apunta a una sala o un spawn
inexistente, o si hay `uid` de enemigo repetidos.

### Mapas de Tiled

El renderer por defecto es el de arriba (layout ASCII + wang), porque saca bordes y esquinas bien
sin que dibujes nada. Pero la carga de **mapas de Tiled está implementada y probada**: si una sala
declara `tiledMap`, `RoomScene` carga ese JSON y el layout ASCII se ignora.

```ts
dungeon_gate: {
  id: 'dungeon_gate',
  tiledMap: 'maps/dungeon_gate.json',   // relativo a public/
  ...
}
```

**Cómo tiene que ser el mapa**

- Tiles de **16px** (el tamaño nativo del tileset). Las capas se escalan ×4 en runtime, así que las
  coordenadas de celda siguen siendo las mismas que en las salas generadas.
- Tres capas, con estos nombres exactos:
  - `ground` — piso, sin colisión (obligatoria)
  - `walls` — paredes; **todo tile presente colisiona** (obligatoria)
  - `objects` — decoración sin colisión, se dibuja sobre las paredes (opcional)
- Un solo tileset, apuntando al PNG del bioma de la sala.
- Spawns, puertas, enemigos y punto de guardado **siguen viniendo del `RoomDef`** en coordenadas de
  celda: el mapa de Tiled solo aporta la geometría.

Si algo no cumple (tamaño de tile distinto, falta una capa, el tileset no se puede registrar), la
escena tira un error explicando qué falta, en vez de dibujar una sala rota.

**Para arrancar desde los layouts que ya están**

```bash
node scripts/ascii-to-tiled.mjs dungeon_gate dungeon
```

Genera `public/maps/dungeon_gate.json` a partir de un layout ASCII (por stdin, o el de ejemplo que
trae el script) y te dice cómo referenciarlo. `public/maps/example_room.json` ya está generado como
plantilla — abrilo en Tiled, pintá encima con las 16 piezas del tileset y apuntá la sala ahí.

Ojo: lo que sale del script usa **la misma pieza sólida** para piso y pared, así que las paredes
salen cuadradas (por eso `buildRoomFromTiled` oscurece la capa `ground`, para que se distingan). Es
un punto de partida para editar en Tiled, no un reemplazo del renderer wang.

---

## Estado del MVP

### Hecho y verificado en el navegador

- Menú principal con START y CONTINUE (CONTINUE solo si hay save).
- **6 salas** conectadas por puertas, con dificultad creciente:
  `jungle_clearing → jungle_path → dungeon_gate → dungeon_cells → castle_hall → throne_room`.
- Exploración: movimiento 4-direcciones sin inercia, colisión con paredes (frena al píxel en el
  borde de celda), cámara con deadzone y bounds, diálogos con typewriter.
- **6 tipos de enemigo**, todos con stats y patrón propios, distribuidos entre las salas
  (algunos repetidos): 9 encuentros en total.
- **Combate completo**: caja 1v1, menú FIGHT / ACT, barra de timing (más centrado = más daño,
  fuera de zona = fallo sin daño), ACT con TALK y CHECK, fase de esquive con el Explorer confinado
  y recortado a la caja, i-frames de 700 ms.
- **6 patrones de proyectiles distintos**: lluvia (demontek), abanico (guardia), muros con hueco
  móvil (centinela), onda senoidal (mutante), espiral (goliath), lanzas teledirigidas con
  telegrafía (rey).
- **3 puntos de guardado** (`jungle_path`, `dungeon_cells`, `castle_hall`): guardan en localStorage
  y curan al máximo.
- HP e inventario **persisten entre salas**; los enemigos derrotados no reaparecen.
- Pausa con inventario (usar kits de curación), **opciones de audio** (mute independiente de
  música y de efectos, con la preferencia persistida) y salida al menú principal.
- Game Over que reinicia desde el último punto de guardado, no desde el principio.
- **Pantalla de final**: al derrotar al Rey, cierre narrativo sobre el arte de `Assets/story/`,
  tarjeta de THE END con resumen de la partida (salas, enemigos, HP, kits) y vuelta al menú.
- Audio: música por bioma (carga bajo demanda), SFX de UI, golpe, daño, curación y guardado.
- Carga de **mapas de Tiled** (`RoomDef.tiledMap`), verificada con `public/maps/example_room.json`:
  renderiza, escala y colisiona bien. Por defecto ninguna sala la usa — las 6 van con el renderer
  wang, que se ve mejor.

### Lo que falta para cerrar el alcance completo

1. **Balance.** Los HP, el daño y la duración de las fases de esquive están puestos a ojo. Todo vive
   en `src/data/enemies.ts` (`maxHp`, `bulletDamage`, `fightBaseDamage`, `dodgeSeconds`) y en
   `PLAYER_MAX_HP` / `IFRAMES_MS` de `GameConfig.ts`.
2. **Cinemáticas sin usar.** El final es estático (arte + texto). En `Assets/Cinematics/` hay tres
   `.mp4` y un `TheEnd.ogv` de 17 MB sin usar; si querés que el final sea un video, Phaser lo
   reproduce con `this.add.video()`.
3. **Arte pendiente**: sprite del punto de guardado, sprites de proyectiles y tiles cenitales
   (los tres marcados con `TODO(arte)` en el código).
4. **Layouts a mano.** Las 6 salas son rectángulos de 20×13 con bloques; sirven para jugar y probar,
   pero no están diseñadas.

### Asunciones marcadas como `// TODO: confirmar con el usuario`

- Los **kits de curación se usan desde el menú de pausa**, no dentro de la caja de combate. Eso es lo
  que mantiene el menú de batalla en dos opciones (FIGHT / ACT), como pedía el alcance.
  → `src/data/items.ts`, `src/combat/BattleMenu.ts`, `src/scenes/PauseScene.ts`
- El **daño al jugador ocurre solo por colisión de proyectil** dentro de la caja de esquive; el
  enemigo no hace daño en el overworld, solo dispara el combate al tocarte.
  → `src/scenes/BattleScene.ts`

---

## Cómo agregar cosas

**Un enemigo nuevo** — una entrada en `src/data/enemies.ts`:

```ts
nuevo: {
  id: 'nuevo',
  name: 'NOMBRE',
  character: 'demontek',                        // carpeta en Assets/characters/
  idle:   { anim: 'breathing-idle', dir: 'south' },
  attack: { anim: 'cross-punch',    dir: 'south' },
  maxHp: 40, bulletDamage: 2, fightBaseDamage: 10,
  pattern: 'fan', dodgeSeconds: 6, battleScale: 1.4,
  tint: 0x9fe08a,                               // opcional: variante de color
  check: '...', talk: ['...'], defeat: '...',
},
```

Sumá el id a `EnemyId` en `src/types/index.ts` y ya podés referenciarlo desde cualquier sala.

**Un patrón de proyectiles nuevo** — `src/combat/patterns/<nombre>.ts` exportando una `PatternFn`,
el id en `PatternId` (`src/types/index.ts`), y registrarlo en el mapa `PATTERNS` de
`src/combat/BulletPatterns.ts`. La `PatternContext` te da la caja, la posición del jugador,
`spawn()`, `every()`, `after()` y `track()` — todo se limpia solo al terminar la fase.

**Una sala nueva** — una entrada en `src/data/rooms.ts`. Convención: dejá siempre como piso el
"anillo" pegado a la pared (columna 1, columna `ancho-2`, fila 1, fila `alto-2`), así podés poner
puertas y puntos de guardado contra el borde sin sorpresas. `validateRooms()` te avisa si algo no
cierra.

---

## Audio

Música y efectos se silencian por separado desde el menú de pausa (`ESC` > `MUSICA` / `EFECTOS`).

- El mute de música **no corta la pista**: la deja sonando a volumen 0. Desmutear es inmediato y no
  reinicia el tema desde el principio.
- El mute de efectos simplemente descarta las llamadas a `audio.play()`.
- La atenuación del combate (`duckMusic`) y el mute se combinan: el volumen final es
  `muteada ? 0 : volumenBase * atenuación`.
- La preferencia se guarda en `localStorage`, en la clave `tales-of-demonteks:audio:v1`, **aparte
  del slot de partida**: es configuración del jugador, no progreso, y no se pierde al empezar de
  nuevo ni al morir.

Ojo al testear el volumen desde consola: el getter de `volume` de `WebAudioSound` lee el gain node,
que se actualiza en el hilo de audio. Leerlo en la misma vuelta en que lo escribís devuelve el valor
viejo; hay que dejar pasar al menos un frame.

---

## Notas técnicas

- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`). Sin `any`.
- **Sin dependencias más allá de Phaser.** La fuente pixel (Press Start 2P) entra por un `<link>` a
  Google Fonts en `index.html`; si querés build offline, bajá el `.ttf` a `public/fonts/` y
  reemplazá el link por un `@font-face`. Si la fuente no carga, `main.ts` arranca igual con la
  monoespaciada del sistema.
- **Una sola escena de exploración.** Cambiar de sala es `scene.restart({ roomId, spawnId })`.
  El combate se lanza encima con `scene.pause()` + `scene.launch('Battle')` y devuelve el resultado
  por el evento `RESUME`.
- **Reingreso de puertas**: al entrar a una sala el jugador puede aparecer cerca de la puerta de
  vuelta, así que una puerta no se dispara hasta que el jugador dejó de solaparla al menos una vez
  (`Door.armed`).
- **Limpieza de tweens**: usar `systems/tweens.ts::killTweens()` en vez de guardar el tween y llamar
  `remove()` en el `destroy()`. Durante el shutdown de una escena el TweenManager ya vació sus
  cadenas y `remove()` tira `Cannot read properties of undefined (reading 'setRemovedState')`.
- **En dev, `window.__game`** expone la instancia de Phaser para depurar desde la consola.
- Si el puerto 5173 está ocupado, `vite.config.ts` toma el de la variable de entorno `PORT`.
