/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/TutorialScene.js
   ------------------------------------------------------------
   บทช่วยสอน ~1 นาที (ครั้งแรกหลังฟักไข่ ที่ฟาร์ม) ข้ามได้ทุกเมื่อ
   1) ครูเซลล์พาเดินไปจุดลูกศร
   2) เก็บไอเท็มฝึก (ตอบคำถาม 1 ข้อ)
   3) ต่อสู้ 1 ครั้งกับมอนสเตอร์ฝึก (อ่อน และสัตว์เลี้ยงไม่หมดแรง)
   4) สรุปปุ่มลัด แล้วเริ่มผจญภัย
   บันทึก game.tutorialDone = true เมื่อจบหรือกดข้าม
   ฉากนี้วางซ้อนบนแผนที่โดยไม่ pause (ผู้เล่นเดินได้) และซ่อนตัวระหว่างต่อสู้
   ========================================================== */

class TutorialScene extends Phaser.Scene {
  constructor() {
    super('TutorialScene');
  }

  init() {
    this.step = null;
    this.finished = false;
  }

  _style(size, color, bold, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal',
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  create() {
    const T = CONFIG.TUTORIAL;
    this.world = this.scene.get('WorldScene');

    // กล่องคำพูดครูเซลล์ กลางล่างของจอ (ไม่ทับ HUD ด้านบน มินิแมป และจอยสัมผัส)
    const w = T.BUBBLE_WIDTH;
    this.bubbleW = w;
    this.bubble = this.add.container(T.BUBBLE_X, T.BUBBLE_Y);
    const bg = this.add.graphics();
    bg.fillStyle(0xfff6e6, 0.97);
    bg.fillRoundedRect(-w / 2, -58, w, 116, 20);
    bg.lineStyle(4, 0x8fcfa8, 1);
    bg.strokeRoundedRect(-w / 2, -58, w, 116, 20);
    const face = this.add.image(-w / 2 + 50, 50, NPC_INFO.spriteKey).setOrigin(0.5, 1);
    face.setScale(120 / face.height);
    this.text = this.add.text(-w / 2 + 110, 0, '', this._style(19, '#3a2a1f', false, { lineSpacing: 4 })).setOrigin(0, 0.5);
    this.bubble.add([bg, face, this.text]);

    this.skipBtn = this.add.text(T.BUBBLE_X + w / 2 - 8, T.BUBBLE_Y - 64, 'ข้ามบทช่วยสอน ▶', this._style(15, '#ffffff', true, {
      backgroundColor: '#7a4a3a', padding: { x: 10, y: 4, top: 6 },
    })).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    this.skipBtn.on('pointerup', () => this._finish(true));

    this.actionBtn = this.add.text(T.BUBBLE_X, T.BUBBLE_Y - 64, '', this._style(20, '#1f3a2a', true, {
      backgroundColor: '#8fe0b0', padding: { x: 18, y: 8, top: 10 },
    })).setOrigin(0.5, 1).setInteractive({ useHandCursor: true }).setVisible(false);
    this.actionBtn.on('pointerup', () => { if (this.onAction) this.onAction(); });

    this._onItemDone = (correct) => this._afterItem(correct);
    this._onWake = () => this._afterBattle();
    this.world.events.on('tutorial-item-done', this._onItemDone);
    this.world.events.on('wake', this._onWake);
    this.events.once('shutdown', () => {
      this.world.events.off('tutorial-item-done', this._onItemDone);
      this.world.events.off('wake', this._onWake);
      this._clearMarker();
    });

    this._say('สวัสดีจ้ะ! ครูเซลล์เอง มาฝึกกันสั้น ๆ นะ\nลองเดินไปที่วงแสงสีทอง (ลูกศร/WASD, แตะจอ หรือใช้จอยมุมซ้ายล่าง)');
    this._placeMarker(T.MOVE_TARGET);
    this.step = 'move';
  }

  _say(msg) {
    const lines = [];
    msg.split('\n').forEach((l) => lines.push(...TextUtil.wrapThai(TextUtil.formatChem(l), TextUtil.fontString(19, false), this.bubbleW - 150)));
    this.text.setText(lines.join('\n'));
    this.bubble.setScale(0.96);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 200, ease: 'Back.easeOut' });
  }

  _action(label, fn) {
    this.onAction = fn;
    this.actionBtn.setText(label).setVisible(!!label);
  }

  _placeMarker(pos) {
    this._clearMarker();
    const w = this.world;
    const ring = w.add.image(pos.x, pos.y, 'fx_levelup_ring').setScale(0.35).setDepth(2);
    w.tweens.add({ targets: ring, scale: 0.45, alpha: 0.6, duration: 600, yoyo: true, repeat: -1 });
    const arrow = w.add.text(pos.x, pos.y - 90, '▼', this._style(48, '#ffd23f', true, { stroke: '#3a2a1f', strokeThickness: 6 }))
      .setOrigin(0.5).setDepth(9000);
    w.tweens.add({ targets: arrow, y: pos.y - 110, duration: 450, yoyo: true, repeat: -1 });
    this.marker = [ring, arrow];
  }

  _clearMarker() {
    (this.marker || []).forEach((o) => { if (o.scene) { o.scene.tweens.killTweensOf(o); o.destroy(); } });
    this.marker = null;
  }

  update() {
    if (this.finished || !this.world) return;
    // ซ่อนระหว่างต่อสู้ / ตอนหน้าต่างอื่นเปิดทับ
    const battle = this.scene.isActive('BattleScene');
    this.cameras.main.setVisible(!battle);
    if (this.step === 'move' && this.world.player && this.world.scene.isActive()) {
      const f = this.world.player.body.center;
      const t = CONFIG.TUTORIAL.MOVE_TARGET;
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < CONFIG.TUTORIAL.MOVE_REACH) this._toItem();
    }
  }

  _toItem() {
    const T = CONFIG.TUTORIAL;
    this.step = 'item';
    SoundFx.play(this, 'pickup');
    this.world.spawnTutorialItem(T.ITEM_POS);
    this._placeMarker(T.ITEM_POS);
    this._say('เก่งมาก! เห็นกลูโคสที่ลอยอยู่ไหม? เดินไปชนแล้ว "ตอบคำถามให้ถูก" เพื่อเก็บไอเท็มและได้ EXP');
  }

  _afterItem(correct) {
    this.step = 'battle-intro';
    this._clearMarker();
    this._say(correct
      ? 'ถูกต้อง! ได้ทั้งไอเท็มและ EXP แล้ว\nต่อไปมาลองต่อสู้กัน: ตอบถูก = สัตว์เลี้ยงโจมตี, ตอบผิด = มอนสเตอร์โจมตีกลับ'
      : 'ไม่เป็นไร! อ่านคำอธิบายแล้วจำไว้ ครั้งหน้าจะเก็บได้แน่\nต่อไปมาลองต่อสู้กัน: ตอบถูก = สัตว์เลี้ยงโจมตี, ตอบผิด = มอนสเตอร์โจมตีกลับ');
    this.time.delayedCall(CONFIG.TUTORIAL.STEP_DELAY_MS, () => this._action('เริ่มต่อสู้ฝึก!', () => this._startBattle()));
  }

  _startBattle() {
    if (this.step !== 'battle-intro' || this.world.battling) return;
    this.step = 'battle';
    this._action('', null);
    this.world._startBattle(CONFIG.TUTORIAL.MONSTER_ID, null, { tutorial: true });
  }

  _afterBattle() {
    if (this.step !== 'battle') return;
    this.step = 'done';
    this.time.delayedCall(CONFIG.TUTORIAL.STEP_DELAY_MS, () => {
      this._say('ยอดเยี่ยม! พร้อมผจญภัยแล้ว\nประตูขวาของฟาร์มไปป่าไซโทซอล • คุยกับครูเซลล์ได้ทุกโซน (กด E)\nI = กระเป๋า  B = สมุดสะสม  R = สรุปผล  M = ปิด/เปิดเสียง');
      this._action('เริ่มผจญภัย!', () => this._finish(false));
    });
  }

  _finish(skipped) {
    if (this.finished) return;
    this.finished = true;
    SaveSystem.saveGame({ tutorialDone: true });
    if (skipped) this.game.events.emit('notify', 'ข้ามบทช่วยสอนแล้ว คุยกับครูเซลล์ได้ทุกเมื่อ (กด E)');
    this.tweens.add({
      targets: [this.bubble, this.skipBtn, this.actionBtn], alpha: 0, duration: 250,
      onComplete: () => this.scene.stop(),
    });
  }
}
