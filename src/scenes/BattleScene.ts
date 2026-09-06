import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, BATTLE_BOX, DEPTH, IFRAMES_MS } from '../config/GameConfig';
import { FONT_FAMILY, Palette, css } from '../config/Palette';
import { BattleBox } from '../combat/BattleBox';
import { BattleMenu, type BattleChoice } from '../combat/BattleMenu';
import { TimingBar } from '../combat/TimingBar';
import { getEnemy } from '../data/enemies';
import { audio } from '../systems/AudioSystem';
import { enemyAnim, enemyIdleTexture } from '../systems/AnimationFactory';
import { gameState } from '../systems/GameState';
import { InputController } from '../systems/InputController';
import { DialogueBox } from '../ui/DialogueBox';
import { HealthBar } from '../ui/HealthBar';
import type { BattleSceneData, EnemyDef } from '../types';

type Phase = 'intro' | 'menu' | 'fight' | 'text' | 'dodge' | 'ending';

/**
 * Caja de combate 1v1, estilo Undertale.
 *
 * Ciclo de un turno:
 *   MENU -> el jugador elige FIGHT o ACT
 *     FIGHT -> barra de timing; cuanto mas centrado el golpe, mas dano
 *     ACT   -> TALK o CHECK; texto, sin dano
 *   -> FASE DE ESQUIVE: el enemigo dispara su patron durante N segundos
 *      mientras el Explorer se mueve dentro de la caja
 *   -> vuelta al MENU
 *
 * Termina cuando el HP del enemigo llega a 0 (victoria, se vuelve a la sala) o
 * cuando el del jugador llega a 0 (Game Over).
 */
export class BattleScene extends Phaser.Scene {
  private battle!: BattleSceneData;
  private def!: EnemyDef;

  private input$!: InputController;
  private box!: BattleBox;
  private menu!: BattleMenu;
  private timingBar!: TimingBar;
  private dialogue!: DialogueBox;

  private enemySprite!: Phaser.GameObjects.Sprite;
  private enemyBar!: HealthBar;
  private playerBar!: HealthBar;
  private phaseLabel!: Phaser.GameObjects.Text;

  private phase: Phase = 'intro';
  private enemyHp = 0;
  private talkIndex = 0;
  private invulnerableUntil = 0;

  constructor() {
    super('Battle');
  }

  init(data: BattleSceneData): void {
    this.battle = data;
    this.def = getEnemy(data.enemy);
    this.enemyHp = this.def.maxHp;
    this.phase = 'intro';
    this.talkIndex = 0;
    this.invulnerableUntil = 0;
  }

  create(): void {
    this.input$ = new InputController(this);

    this.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, Palette.black, 1)
      .setOrigin(0, 0)
      .setDepth(DEPTH.overlay - 1);

    this.createEnemy();
    this.createBars();

    this.box = new BattleBox(this, BASE_WIDTH / 2, 345, BATTLE_BOX.width, BATTLE_BOX.height);
    this.box.setPlayerVisible(false);

    this.timingBar = new TimingBar(this, BASE_WIDTH / 2 - 230, 328, { width: 460 });

    this.dialogue = new DialogueBox(this, {
      x: (BASE_WIDTH - BATTLE_BOX.width) / 2,
      y: 262,
      width: BATTLE_BOX.width,
      height: 166,
    });

    this.menu = new BattleMenu(
      this,
      BASE_WIDTH / 2 - 150,
      BASE_HEIGHT - 44,
      (choice) => this.onChoice(choice),
      () => audio.play(this, 'uiMove'),
    );

    this.phaseLabel = this.add
      .text(BASE_WIDTH / 2, 528, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: css(Palette.grey),
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.box.destroy();
      this.menu.destroy();
      this.timingBar.destroy();
      this.dialogue.destroy();
    });

    this.showText([`${this.def.name} te bloquea el paso.`], () => this.toMenu());
  }

  /* ------------------------------ setup ------------------------------ */

  private createEnemy(): void {
    this.enemySprite = this.add
      .sprite(BASE_WIDTH / 2, 108, enemyIdleTexture(this.def.id), 0)
      .setScale(this.def.battleScale)
      .setDepth(DEPTH.overlay);
    if (this.def.tint !== undefined) this.enemySprite.setTint(this.def.tint);
    this.enemySprite.play(enemyAnim(this.def.id, 'idle'));

    // Depth por encima de la caja de combate: la caja se dibuja despues y, con
    // la misma profundidad, taparia el nombre y la barra del enemigo.
    this.add
      .text(BASE_WIDTH / 2, 176, this.def.name, {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: css(Palette.white),
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui + 3);
  }

  private createBars(): void {
    this.enemyBar = new HealthBar(this, BASE_WIDTH / 2 - 110, 194, { width: 220, height: 12 });
    this.enemyBar.setDepth(DEPTH.ui + 3);
    this.enemyBar.set(this.enemyHp, this.def.maxHp);

    this.playerBar = new HealthBar(this, 30, BASE_HEIGHT - 46, { width: 190 });
    this.playerBar.set(gameState.hp, gameState.maxHp);

    this.add
      .text(30, BASE_HEIGHT - 68, 'THE EXPLORER', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: css(Palette.grey),
      })
      .setDepth(DEPTH.ui);
  }

  /* ------------------------------ update ------------------------------ */

  override update(time: number): void {
    switch (this.phase) {
      case 'intro':
      case 'text':
        if (this.input$.justAction()) this.dialogue.advance();
        break;

      case 'menu':
        if (this.input$.justLeft()) this.menu.move(-1);
        if (this.input$.justRight()) this.menu.move(1);
        if (this.input$.justCancel()) this.menu.cancel();
        if (this.input$.justAction()) this.menu.confirm();
        break;

      case 'fight':
        if (this.input$.justAction() && this.timingBar.isRunning) this.resolveFight();
        break;

      case 'dodge':
        this.box.update(this.input$.move);
        this.playerBar.set(gameState.hp, gameState.maxHp);
        this.enemySprite.setAlpha(time < this.invulnerableUntil ? 0.85 : 1);
        break;

      case 'ending':
        if (this.input$.justAction()) this.dialogue.advance();
        break;
    }
  }

  /* ------------------------------ fases ------------------------------ */

  private toMenu(): void {
    if (this.enemyHp <= 0 || gameState.isDead) return;
    this.phase = 'menu';
    this.box.setPlayerVisible(false);
    this.timingBar.hide();
    this.menu.open();
    this.phaseLabel.setText('Flechas: elegir   E/ESPACIO: confirmar   X: volver');
  }

  private onChoice(choice: BattleChoice): void {
    audio.play(this, 'uiClick');
    if (choice.type === 'fight') {
      this.startFight();
      return;
    }
    if (choice.option === 'CHECK') {
      this.showText(this.def.check.split('\n'), () => this.startDodge());
      return;
    }
    const line = this.def.talk[this.talkIndex % this.def.talk.length] ?? '...';
    this.talkIndex++;
    this.showText([line], () => this.startDodge());
  }

  private startFight(): void {
    this.phase = 'fight';
    this.phaseLabel.setText('E/ESPACIO para golpear. Cuanto mas al centro, mas dano.');
    this.timingBar.start();
  }

  private resolveFight(): void {
    const result = this.timingBar.stop();
    this.phase = 'text';

    if (!result.hit) {
      audio.play(this, 'error', 0.5);
      this.time.delayedCall(650, () => {
        this.timingBar.hide();
        this.showText(['Fallaste. El enemigo lo nota. Es peor que el dano.'], () => this.startDodge());
      });
      return;
    }

    // El dano base sale del EnemyDef y se escala por la precision: un golpe al
    // borde de la zona hace poco, uno perfecto hace el doble del base.
    const damage = Math.max(1, Math.round(this.def.fightBaseDamage * (0.6 + result.accuracy * 1.4)));
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.enemyBar.set(this.enemyHp, this.def.maxHp);

    audio.play(this, 'slash');
    this.time.delayedCall(120, () => audio.play(this, 'hit'));
    this.showDamageNumber(damage);
    this.shakeEnemy();

    this.time.delayedCall(700, () => {
      this.timingBar.hide();
      if (this.enemyHp <= 0) {
        this.victory();
        return;
      }
      this.startDodge();
    });
  }

  private startDodge(): void {
    if (this.enemyHp <= 0 || gameState.isDead) return;

    this.phase = 'dodge';
    this.menu.close();
    this.phaseLabel.setText('ESQUIVA. WASD / flechas.');
    this.enemySprite.play(enemyAnim(this.def.id, 'attack'), true);
    this.enemySprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.enemySprite.play(enemyAnim(this.def.id, 'idle'), true);
    });

    this.box.start(
      this.def.pattern,
      this.def.dodgeSeconds * 1000,
      (bullet) => this.onBulletHit(bullet),
      () => this.toMenu(),
    );
  }

  private onBulletHit(bullet: Phaser.Physics.Arcade.Image): void {
    bullet.destroy();
    if (this.time.now < this.invulnerableUntil) return;
    this.invulnerableUntil = this.time.now + IFRAMES_MS;

    gameState.damage(this.def.bulletDamage);
    this.playerBar.set(gameState.hp, gameState.maxHp);
    audio.play(this, 'playerHurt');
    this.cameras.main.shake(140, 0.006);

    const sprite = this.box.playerSprite;
    this.tweens.add({
      targets: sprite,
      alpha: 0.2,
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => sprite.setAlpha(1),
    });

    if (gameState.isDead) this.defeat();
  }

  /* ----------------------------- desenlace ---------------------------- */

  private victory(): void {
    this.phase = 'ending';
    this.box.stop();
    this.box.setPlayerVisible(false);
    this.menu.close();
    this.phaseLabel.setText('');
    gameState.markDefeated(this.battle.spawnUid);
    gameState.gameCleared ||= this.def.id === 'king';

    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0,
      y: this.enemySprite.y + 24,
      duration: 700,
    });

    // Derrotar al Rey termina el juego: en vez de volver a la sala, se va a la
    // pantalla de final.
    if (gameState.gameCleared) {
      audio.stopMusic();
      this.showText([this.def.defeat, 'Se hace un silencio que no estaba antes.'], () => {
        this.scene.stop('Room');
        this.scene.stop('Hud');
        this.scene.start('Ending');
      });
      return;
    }

    this.showText([this.def.defeat, 'Seguis vivo. Eso ya es algo.'], () => {
      this.scene.stop();
      this.scene.resume('Room', { defeatedUid: this.battle.spawnUid });
    });
  }

  private defeat(): void {
    this.phase = 'ending';
    this.box.stop();
    this.box.setPlayerVisible(false);
    this.menu.close();
    this.phaseLabel.setText('');
    audio.play(this, 'playerDeath');
    audio.stopMusic();

    this.time.delayedCall(500, () => {
      this.scene.stop('Room');
      this.scene.stop('Hud');
      this.scene.start('GameOver');
    });
  }

  /* ------------------------------ helpers ----------------------------- */

  private showText(lines: string[], onDone: () => void): void {
    const previous = this.phase;
    this.phase = previous === 'ending' ? 'ending' : 'text';
    this.menu.close();
    this.box.setPlayerVisible(false);
    this.dialogue.show(lines, onDone);
  }

  private showDamageNumber(damage: number): void {
    const text = this.add
      .text(this.enemySprite.x, this.enemySprite.y + 20, `-${damage}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: css(Palette.danger),
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui + 5);

    this.tweens.add({
      targets: text,
      y: text.y - 46,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private shakeEnemy(): void {
    this.enemySprite.setTint(Palette.danger);
    this.tweens.add({
      targets: this.enemySprite,
      x: this.enemySprite.x + 10,
      duration: 45,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.enemySprite.x = BASE_WIDTH / 2;
        // Devolver el tinte propio del enemigo, no dejarlo sin tinte.
        if (this.def.tint !== undefined) this.enemySprite.setTint(this.def.tint);
        else this.enemySprite.clearTint();
      },
    });
  }
}
