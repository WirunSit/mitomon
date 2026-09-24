/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/LevelUpScene.js
   ------------------------------------------------------------
   ฉากซ้อนแสดงเลเวลอัป (เรียกผ่าน ProgressionFx.play)
   data = { steps: [...จาก PetSystem.addExp], onDone }
   แต่ละขั้น: ฉากหลังมืดลง + ป้าย "LEVEL UP!" + วงแสงใต้เท้า
             + สัตว์กระโดด + บอก HP/ATK ที่เพิ่ม และ "HP ฟื้นเต็ม"
   ถ้าขั้นนั้นพัฒนาร่าง -> เล่น EvolutionScene ต่อ แล้วค่อยไปขั้นถัดไป
   ถ้าขั้นสุดท้ายถึงเลเวลเต็ม -> เล่น MaxLevelScene
   แตะจอ / กด Enter / Space เพื่อข้ามช่วงค้างของแต่ละขั้นได้
   ========================================================== */

class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUpScene');
  }

  init(data) {
    this.steps = (data && data.steps) || [];
    this.onDone = data && data.onDone;
    this.index = 0;
    this.skip = null;
  }

  create() {
    const L = CONFIG.LEVELUP;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    this.dim = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, L.DIM_ALPHA).setInteractive();
    this.dim.setAlpha(0);
    this.tweens.add({ targets: this.dim, alpha: 1, duration: L.FADE_MS });
    this.dim.on('pointerup', () => { if (this.skip) this.skip(); });
    this.input.keyboard.on('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && this.skip) this.skip();
    });
    this._run();
  }

  async _run() {
    for (this.index = 0; this.index < this.steps.length; this.index++) {
      const step = this.steps[this.index];
      await this._playStep(step);
      if (step.evolved) await this._runOverlay('EvolutionScene', { step });
      if (step.maxed) await this._runOverlay('MaxLevelScene', {});
    }
    this.tweens.add({
      targets: this.dim, alpha: 0, duration: CONFIG.LEVELUP.FADE_MS,
      onComplete: () => {
        const done = this.onDone;
        this.scene.stop();
        if (done) done();
      },
    });
  }

  _runOverlay(key, data) {
    return new Promise((resolve) => {
      this.scene.launch(key, Object.assign({}, data, { onDone: resolve }));
      this.scene.bringToTop(key);
    });
  }

  _wait(ms) {
    return new Promise((resolve) => {
      const ev = this.time.delayedCall(ms, () => { this.skip = null; resolve(); });
      this.skip = () => { ev.remove(false); this.skip = null; resolve(); };
    });
  }

  _style(size, color, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: 'bold',
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 }, align: 'center',
    }, extra || {});
  }

  async _playStep(step) {
    const L = CONFIG.LEVELUP;
    const { WIDTH } = CONFIG.GAME;
    const pet = PetSystem.current;
    const objs = [];
    const cx = WIDTH / 2;

    // วงแสงใต้เท้า
    const ring = this.add.image(cx, L.PET_Y + L.RING_Y_OFFSET, 'fx_levelup_ring').setScale(L.RING_SCALE_FROM);
    objs.push(ring);
    this.tweens.add({ targets: ring, scale: L.RING_SCALE_TO, duration: L.RING_MS, ease: 'Back.easeOut' });
    this.tweens.add({ targets: ring, alpha: 0.55, duration: L.RING_MS / 2, yoyo: true, repeat: -1, delay: L.RING_MS });

    // สัตว์เลี้ยง (ร่างก่อนพัฒนา ถ้าขั้นนี้พัฒนาร่าง จะไปเปลี่ยนใน EvolutionScene)
    const key = `${pet.speciesId}_f${step.fromForm}_blink`;
    const img = this.add.image(cx, L.PET_Y, key).setOrigin(0.5, 1);
    const h = L.PET_HEIGHT_BY_FORM[step.fromForm - 1] || L.PET_HEIGHT_BY_FORM[0];
    const s = h / img.height;
    img.setScale(s).setFlipX(CONFIG.PET.SPRITE_FACES_LEFT);
    objs.push(img);
    this.tweens.add({
      targets: img, y: L.PET_Y - L.JUMP_HEIGHT, duration: L.JUMP_MS, yoyo: true, repeat: L.JUMP_COUNT - 1, ease: 'Quad.easeOut',
      onYoyo: () => { img.setScale(s * 1.08, s * 0.92); },
      onRepeat: () => { img.setScale(s); },
      onComplete: () => { img.setScale(s); img.setTexture(`${pet.speciesId}_f${step.fromForm}_idle`); },
    });

    // ประกาย
    const sp = this.add.particles(cx, L.PET_Y - h / 2, 'fx_sparkle', {
      speed: { min: 120, max: 320 }, angle: { min: 0, max: 360 }, scale: { start: 0.28, end: 0 },
      lifespan: 900, emitting: false,
    });
    objs.push(sp);
    sp.explode(L.SPARKLES);

    // ป้าย LEVEL UP!
    const banner = this.add.container(cx, -120);
    const bImg = this.add.image(0, 0, 'ui_levelup_banner');
    const bText = this.add.text(0, 26, 'LEVEL UP!', this._style(L.TITLE_FONT_SIZE, '#1f3a2a', {
      stroke: '#ffffff', strokeThickness: 6,
    })).setOrigin(0.5);
    banner.add([bImg, bText]);
    objs.push(banner);
    this.tweens.add({ targets: banner, y: L.BANNER_Y, duration: L.BANNER_DROP_MS, ease: 'Back.easeOut' });

    // รายละเอียด
    const lines = [
      `${pet.nickname || PetSystem.getSpecies(pet.speciesId).forms[step.fromForm - 1].name}  Lv.${step.fromLevel}  →  Lv.${step.toLevel}`,
      `HP สูงสุด +${step.hpGain}   ATK +${step.atkGain}   HP ฟื้นเต็ม!`,
    ];
    const detail = this.add.text(cx, L.DETAIL_Y, lines.join('\n'), this._style(L.DETAIL_FONT_SIZE, '#ffffff', {
      stroke: '#1f1636', strokeThickness: 6, lineSpacing: 6,
    })).setOrigin(0.5, 0).setAlpha(0);
    objs.push(detail);
    this.tweens.add({ targets: detail, alpha: 1, duration: 250, delay: L.BANNER_DROP_MS });

    SoundFx.play(this, 'levelup');
    await this._wait(L.HOLD_MS);

    await new Promise((resolve) => {
      this.tweens.add({
        targets: objs.filter((o) => o.setAlpha), alpha: 0, duration: L.FADE_MS,
        onComplete: () => { objs.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); }); resolve(); },
      });
    });
  }
}
