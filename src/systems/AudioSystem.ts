import Phaser from 'phaser';
import { MUSIC, SFX, type MusicId, type SfxId } from '../config/AssetKeys';

/**
 * Audio.
 *
 * Los SFX son chicos y se precargan todos en PreloadScene. La musica pesa ~7 MB
 * por pista, asi que se carga bajo demanda: la primera vez que una sala pide su
 * tema, el loader lo trae en caliente y recien ahi suena.
 *
 * Un unico BGM sonando a la vez; pedir el mismo tema dos veces no lo reinicia.
 *
 * Musica y efectos se silencian por separado (menu de pausa > OPCIONES). El
 * mute de musica NO corta la pista: la deja sonando a volumen 0, para que
 * desmutear sea inmediato y no reinicie el tema desde el principio.
 *
 * La preferencia se guarda en localStorage, en una clave propia y aparte del
 * slot de partida: es una config del jugador, no progreso, y no tiene por que
 * perderse al empezar de nuevo.
 */

const PREFS_KEY = 'tales-of-demonteks:audio:v1';

interface AudioPrefs {
  musicMuted: boolean;
  sfxMuted: boolean;
}

function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { musicMuted: false, sfxMuted: false };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { musicMuted: false, sfxMuted: false };
    const p = parsed as Partial<AudioPrefs>;
    return { musicMuted: p.musicMuted === true, sfxMuted: p.sfxMuted === true };
  } catch {
    // localStorage puede tirar (modo privado, permisos). Nunca romper por audio.
    return { musicMuted: false, sfxMuted: false };
  }
}

class AudioSystem {
  private current: MusicId | null = null;
  private bgm: Phaser.Sound.BaseSound | null = null;
  private readonly musicVolume = 0.35;
  private readonly sfxVolume = 0.6;
  /** Atenuacion temporal del BGM (caja de combate). 1 = sin atenuar. */
  private duck = 1;

  private prefs: AudioPrefs = loadPrefs();

  /* ------------------------------ SFX ------------------------------ */

  /** Encola los SFX en el loader (llamar desde PreloadScene.preload). */
  preloadSfx(scene: Phaser.Scene): void {
    for (const entry of Object.values(SFX)) {
      scene.load.audio(entry.key, entry.path);
    }
  }

  play(scene: Phaser.Scene, id: SfxId, volumeScale = 1): void {
    if (this.prefs.sfxMuted) return;
    const key = SFX[id].key;
    if (!scene.cache.audio.exists(key)) return;
    scene.sound.play(key, { volume: this.sfxVolume * volumeScale });
  }

  /* ----------------------------- Musica ---------------------------- */

  /** Cambia el tema de fondo, cargandolo si hace falta. */
  playMusic(scene: Phaser.Scene, id: MusicId): void {
    if (this.current === id && this.bgm?.isPlaying) return;

    const { key, path } = MUSIC[id];
    if (scene.cache.audio.exists(key)) {
      this.startMusic(scene, id, key);
      return;
    }

    // Carga en caliente: la escena ya arranco, hay que empujar el loader a mano.
    scene.load.audio(key, path);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      // La escena puede haber cambiado mientras cargaba.
      if (scene.scene.isActive() && this.current !== id) this.startMusic(scene, id, key);
    });
    scene.load.start();
  }

  private startMusic(scene: Phaser.Scene, id: MusicId, key: string): void {
    this.stopMusic();
    this.current = id;
    this.duck = 1;
    // Se crea y reproduce siempre, aunque este muteada: asi desmutear es
    // instantaneo y no arranca el tema de cero.
    this.bgm = scene.sound.add(key, { loop: true, volume: this.targetMusicVolume });
    this.bgm.play();
  }

  stopMusic(): void {
    this.bgm?.stop();
    this.bgm?.destroy();
    this.bgm = null;
    this.current = null;
    this.duck = 1;
  }

  /** Baja el volumen del BGM sin cortarlo (para la caja de combate). */
  duckMusic(factor = 0.45): void {
    this.duck = factor;
    this.applyMusicVolume();
  }

  unduckMusic(): void {
    this.duck = 1;
    this.applyMusicVolume();
  }

  private get targetMusicVolume(): number {
    return this.prefs.musicMuted ? 0 : this.musicVolume * this.duck;
  }

  private applyMusicVolume(): void {
    const sound = this.bgm as Phaser.Sound.WebAudioSound | null;
    if (sound && 'volume' in sound) sound.volume = this.targetMusicVolume;
  }

  /* ------------------------------ Mute ----------------------------- */

  get musicMuted(): boolean {
    return this.prefs.musicMuted;
  }

  get sfxMuted(): boolean {
    return this.prefs.sfxMuted;
  }

  /** Devuelve el estado nuevo. */
  toggleMusicMuted(): boolean {
    this.prefs.musicMuted = !this.prefs.musicMuted;
    this.applyMusicVolume();
    this.savePrefs();
    return this.prefs.musicMuted;
  }

  /** Devuelve el estado nuevo. */
  toggleSfxMuted(): boolean {
    this.prefs.sfxMuted = !this.prefs.sfxMuted;
    this.savePrefs();
    return this.prefs.sfxMuted;
  }

  private savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      // Sin persistencia el mute sigue funcionando, solo no sobrevive al reload.
    }
  }
}

export const audio = new AudioSystem();
