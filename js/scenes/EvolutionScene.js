/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/EvolutionScene.js
   ------------------------------------------------------------
   ฉากพัฒนาร่าง (Lv.EVOLVE_LEVEL_STAGE_2 / _3) เรียกจาก LevelUpScene
   data = { step: { fromForm, toForm, ... }, onDone }

   ลำดับ:
   1) จอมืด -> ร่างเดิมกลายเป็นเงาขาว
   2) กะพริบสลับกับเงาร่างใหม่ เร็วขึ้นเรื่อย ๆ ~BLINK_TOTAL_MS
   3) แสงระเบิด (จอขาววาบ + evolve_glow ขยาย)
   4) ร่างใหม่ปรากฏพร้อมชื่อร่างและคำบรรยาย
   5) "ความรู้ประจำร่าง" 1 ประโยคเกี่ยวกับธาตุ (pets.js -> forms[].fact)
   6) ปุ่ม "เยี่ยมเลย!" (หรือ Enter/Space) เพื่อกลับ
   ========================================================== */

class EvolutionScene extends Phaser.Scene {
  constructor() {
    super('EvolutionScene');
  }

  init(data) {
    this.step = data.step;
    this.onDone = data.onDone;
    this.finished = false;
    this.canClose = false;
  }

  _style(size, color, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: 'bold', align: 'center',
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  create() {
    const E = CONFIG.EVOLUTION;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const pet = PetSystem.current;
    this.species = PetSystem.getSpecies(pet.speciesId);
    this.oldForm = this.species.forms[this.step.fromForm - 1];
    this.newForm = this.species.forms[this.step.toForm - 1];
    this.cx = WIDTH / 2;

    this.bg = this.add.rectangle(this.cx, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 1).setInteractive().setAlpha(0);
    this.tweens.add({ targets: this.bg, alpha: 1, duration: E.INTRO_MS / 2 });

    this.glow = this.add.image(this.cx, E.PET_Y - E.PET_HEIGHT_FROM / 2, 'fx_evolve_glow').setAlpha(0).setScale(0.8);

    const oldName = pet.nickname || this.oldForm.name;
    this.title = this.add.text(this.cx, E.TITLE_Y, `อะไรกันนะ? ${oldName} กำลังเปลี่ยนแปลง!`,
      this._style(E.TITLE_FONT_SIZE, '#ffffff')).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.title, alpha: 1, duration: E.INTRO_MS });

    const flip = CONFIG.PET.SPRITE_FACES_LEFT;
    this.oldImg = this.add.image(this.cx, E.PET_Y, `${pet.speciesId}_f${this.step.fromForm}_idle`).setOrigin(0.5, 1).setFlipX(flip);
    this.oldImg.setScale(E.PET_HEIGHT_FROM / this.oldImg.height).setAlpha(0);
    this.newImg = this.add.image(this.cx, E.PET_Y, `${pet.speciesId}_f${this.step.toForm}_idle`).setOrigin(0.5, 1).setFlipX(flip);
    this.newImg.setScale(E.PET_HEIGHT_TO / this.newImg.height).setVisible(false).setTintFill(0xffffff);

    // 1) ร่างเดิมปรากฏ แล้วกลายเป็นเงาขาว
    this.tweens.add({
      targets: this.oldImg, alpha: 1, duration: E.INTRO_MS / 2, delay: E.INTRO_MS / 4,
      onComplete: () => {
        this.oldImg.setTintFill(0xffffff);
        this.tweens.add({ targets: this.glow, alpha: 0.35, duration: E.INTRO_MS / 2 });
        this.time.delayedCall(E.INTRO_MS / 2, () => this._blinkPhase());
      },
    });

    this.input.keyboard.on('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && this.canClose) this._close();
    });
  }

  // 2) กะพริบสลับเร็วขึ้นเรื่อย ๆ
  _blinkPhase() {
    const E = CONFIG.EVOLUTION;
    let elapsed = 0;
    let interval = E.BLINK_START_MS;
    let showNew = false;
    const tick = () => {
      showNew = !showNew;
      this.newImg.setVisible(showNew);
      this.oldImg.setVisible(!showNew);
      elapsed += interval;
      interval = Math.max(E.BLINK_MIN_MS, interval * E.BLINK_ACCEL);
      if (elapsed < E.BLINK_TOTAL_MS) this.time.delayedCall(interval, tick);
      else this._burst();
    };
    this.time.delayedCall(interval, tick);
    this.tweens.add({ targets: this.glow, scale: 1.4, alpha: 0.6, duration: E.BLINK_TOTAL_MS, ease: 'Sine.easeIn' });
  }

  // 3) แสงระเบิด  4) ร่างใหม่ปรากฏ
  _burst() {
    const E = CONFIG.EVOLUTION;
    this.cameras.main.flash(E.FLASH_MS, 255, 255, 255);
    SoundFx.play(this, 'evolve');
    this.oldImg.setVisible(false);
    this.newImg.setVisible(true).clearTint();
    const s = this.newImg.scale;
    this.newImg.setScale(s * 0.7);
    this.tweens.add({ targets: this.newImg, scale: s, duration: E.REVEAL_MS, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.glow, scale: E.GLOW_SCALE, alpha: 0, duration: E.GLOW_MS, ease: 'Cubic.easeOut' });
    const sp = this.add.particles(this.cx, E.PET_Y - E.PET_HEIGHT_TO / 2, 'fx_sparkle', {
      speed: { min: 150, max: 420 }, angle: { min: 0, max: 360 }, scale: { start: 0.3, end: 0 }, lifespan: 1100, emitting: false,
    });
    sp.explode(E.SPARKLES);
    const ring = this.add.image(this.cx, E.PET_Y, 'fx_levelup_ring').setScale(0.3);
    this.children.moveBelow(ring, this.newImg);
    this.tweens.add({ targets: ring, scale: 0.85, duration: 700, ease: 'Back.easeOut' });

    // ท่าทางมีชีวิตหลังพัฒนาร่าง
    this.tweens.add({
      targets: this.newImg, scaleY: s * 1.04, scaleX: s / 1.04, duration: 900, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: E.REVEAL_MS,
    });

    const oldName = PetSystem.current.nickname || this.oldForm.name;
    this.title.setText(`ยินดีด้วย! ${oldName} พัฒนาร่างเป็น`);
    const name = this.add.text(this.cx, E.NAME_Y, this.newForm.name, this._style(E.NAME_FONT_SIZE, '#ffe08a', {
      stroke: '#4a2f7a', strokeThickness: 8,
    })).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: name, scale: 1, duration: 360, ease: 'Back.easeOut', delay: E.REVEAL_MS / 2 });
    const desc = this.add.text(this.cx, E.DESC_Y, TextUtil.wrapThai(this.newForm.desc, TextUtil.fontString(E.DESC_FONT_SIZE, false), E.DESC_WIDTH).join('\n'),
      this._style(E.DESC_FONT_SIZE, '#ffffff', { fontStyle: 'normal' })).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: desc, alpha: 1, duration: 400, delay: E.REVEAL_MS });

    this.time.delayedCall(E.FACT_DELAY_MS, () => this._showFact());
  }

  // 5) ความรู้ประจำร่าง  6) ปุ่มปิด
  _showFact() {
    const E = CONFIG.EVOLUTION;
    const Q = CONFIG.QUIZ_PANEL;
    const w = E.FACT_PANEL_WIDTH;
    const h = E.FACT_PANEL_HEIGHT;
    const x = this.cx - w / 2;
    const y = E.FACT_PANEL_Y;
    const c = this.add.container(0, 0).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0xfff6e6, 0.97);
    g.fillRoundedRect(x, y, w, h, 18);
    g.lineStyle(4, 0x8fcfa8, 1);
    g.strokeRoundedRect(x, y, w, h, 18);
    const head = this.add.text(x + 24, y + 10, `ความรู้ประจำร่าง • ธาตุ${this.species.element}`, this._style(20, '#2e8b57', { align: 'left' }));
    const fact = this.add.text(x + 24, y + 44, '', this._style(E.FACT_FONT_SIZE, '#3a2a1f', { fontStyle: 'normal', align: 'left' }));
    TextUtil.fitText(fact, TextUtil.formatChem(this.newForm.fact || ''), {
      width: w - 48, height: h - 54, maxSize: E.FACT_FONT_SIZE, minSize: 15,
    });
    c.add([g, head, fact]);

    const scale = Q.OK_BUTTON_HEIGHT / Q.CHOICE_NATIVE_HEIGHT;
    const bw = Q.OK_BUTTON_WIDTH;
    const btn = this.add.container(this.cx, E.BUTTON_Y);
    const bg = this.add.nineslice(0, 0, 'ui_btn_green', null, bw / scale, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale * 0.8);
    const bt = this.add.text(0, 0, 'เยี่ยมเลย!', this._style(24, '#1f3a2a')).setOrigin(0.5);
    btn.add([bg, bt]);
    btn.setSize(bw * 0.8, Q.OK_BUTTON_HEIGHT * 0.8).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this._close());
    c.add(btn);
    this.tweens.add({ targets: c, alpha: 1, duration: 350, onComplete: () => { this.canClose = true; } });
  }

  _close() {
    if (this.finished || !this.canClose) return;
    this.finished = true;
    SoundFx.play(this, 'click');
    this.cameras.main.fadeOut(CONFIG.LEVELUP.FADE_MS * 2, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const done = this.onDone;
      this.scene.stop();
      if (done) done();
    });
  }
}
