/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/MaxLevelScene.js
   ------------------------------------------------------------
   ฉากฉลอง "เลเวลเต็ม!" + ใบประกาศ (เรียกจาก LevelUpScene เมื่อถึง
   CONFIG.EXP.MAX_LEVEL) data = { onDone }
   ใบประกาศแสดง: ชื่อนักเรียน เลขที่ ห้อง, ชื่อสัตว์และร่าง,
   อัตราตอบถูก (QuizSystem), เวลาเล่นรวม (PlayTimeSystem), วันที่
   ปุ่ม "บันทึกเป็นภาพ" = ดาวน์โหลดใบประกาศเป็นไฟล์ PNG
   ========================================================== */

class MaxLevelScene extends Phaser.Scene {
  constructor() {
    super('MaxLevelScene');
  }

  init(data) {
    this.onDone = data && data.onDone;
    this.closing = false;
  }

  _style(size, color, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: 'bold', align: 'center',
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  create() {
    const C = CONFIG.CERTIFICATE;
    const L = CONFIG.LEVELUP;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const pet = PetSystem.current;
    this.cx = WIDTH / 2;

    this.add.image(this.cx, HEIGHT / 2, 'title_bg').setDisplaySize(WIDTH, HEIGHT).setInteractive();
    this.add.rectangle(this.cx, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, 0.4);

    // พลุประกาย/หัวใจ/ไอเท็มโปรยลงมา
    this.confetti = ['fx_sparkle', 'fx_heart', 'item_atp', 'item_glucose'].map((key) => this.add.particles(0, -40, key, {
      x: { min: 0, max: WIDTH }, speedY: { min: 120, max: 260 }, speedX: { min: -60, max: 60 },
      rotate: { min: 0, max: 360 }, scale: { min: 0.12, max: 0.28 }, lifespan: 4200,
      frequency: C.CONFETTI_EVERY_MS, quantity: Math.ceil(C.CONFETTI_PER_BURST / 4),
    }));

    // ป้าย + สัตว์กระโดด
    this.party = this.add.container(0, 0);
    const banner = this.add.container(this.cx, 150);
    banner.add([
      this.add.image(0, 0, 'ui_levelup_banner').setScale(1.1),
      this.add.text(0, 28, 'เลเวลเต็ม!', this._style(54, '#1f3a2a', { stroke: '#ffffff', strokeThickness: 6 })).setOrigin(0.5),
    ]);
    banner.setScale(0);
    this.tweens.add({ targets: banner, scale: 1, duration: 500, ease: 'Back.easeOut' });
    const ring = this.add.image(this.cx, 560, 'fx_levelup_ring').setScale(0.9);
    const img = this.add.image(this.cx, 555, PetSystem.getTextureKey(pet, 'blink')).setOrigin(0.5, 1).setFlipX(CONFIG.PET.SPRITE_FACES_LEFT);
    img.setScale(L.PET_HEIGHT_BY_FORM[2] / img.height);
    this.tweens.add({ targets: img, y: 555 - L.JUMP_HEIGHT, duration: L.JUMP_MS, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    const sub = this.add.text(this.cx, 620, `${PetSystem.getDisplayName()} ถึง Lv.${CONFIG.EXP.MAX_LEVEL} แล้ว! สุดยอดนักวิทยาศาสตร์เซลล์`,
      this._style(26, '#ffffff', { stroke: '#1f1636', strokeThickness: 6 })).setOrigin(0.5);
    this.party.add([banner, ring, img, sub]);
    SoundFx.play(this, 'levelup');

    this.time.delayedCall(C.CELEBRATE_MS, () => this._showCertificate());
    SaveSystem.saveGame({ maxLevelCelebrated: true });
  }

  _showCertificate() {
    const C = CONFIG.CERTIFICATE;
    this.tweens.add({ targets: this.party, alpha: 0, duration: 300, onComplete: () => this.party.setVisible(false) });

    const profile = SaveSystem.loadPlayerProfile() || {};
    const pet = PetSystem.current;
    const stats = QuizSystem.getStats();
    const pct = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
    const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const cert = this.add.container(this.cx, C.FRAME_CENTER_Y).setDepth(10);
    cert.add(this.add.image(0, 0, 'ui_certificate_frame'));
    cert.add(this.add.text(40, -190, 'ใบประกาศเกียรติคุณ', this._style(C.TITLE_FONT_SIZE, '#8a5a12')).setOrigin(0.5));
    cert.add(this.add.text(40, -132, 'มอบให้ไว้เพื่อแสดงว่า', this._style(C.SMALL_FONT_SIZE, '#5a4a3a', { fontStyle: 'normal' })).setOrigin(0.5));
    cert.add(this.add.text(40, -90, profile.name || 'นักผจญภัยในเซลล์', this._style(C.TITLE_FONT_SIZE - 4, '#2e5e9a')).setOrigin(0.5));
    cert.add(this.add.text(40, -44, `เลขที่ ${profile.studentNumber || '-'}   ห้อง ${profile.room || '-'}`,
      this._style(C.SMALL_FONT_SIZE, '#5a4a3a', { fontStyle: 'normal' })).setOrigin(0.5));
    const form = PetSystem.getFormData(pet);
    const body = [
      pet.nickname
        ? `ได้ฝึก "${pet.nickname}" (${form ? form.name : ''}) จนถึงเลเวลสูงสุด Lv.${pet.level}`
        : `ได้ฝึก "${form ? form.name : ''}" จนถึงเลเวลสูงสุด Lv.${pet.level}`,
      `อัตราตอบถูก ${pct}%  (${stats.correct} จาก ${stats.answered} ข้อ)`,
      `เวลาเล่นรวม ${PlayTimeSystem.format(PlayTimeSystem.getMs())}`,
    ];
    const wrapped = [];
    body.forEach((l) => wrapped.push(...TextUtil.wrapThai(l, TextUtil.fontString(C.BODY_FONT_SIZE - 2, true), 560)));
    cert.add(this.add.text(40, 4, wrapped.join('\n'), this._style(C.BODY_FONT_SIZE - 2, '#3a2a1f', { lineSpacing: 8 })).setOrigin(0.5, 0));
    cert.add(this.add.text(-400, 262, `ให้ไว้ ณ วันที่ ${date}`, this._style(C.SMALL_FONT_SIZE, '#5a4a3a', { fontStyle: 'normal', align: 'left' })).setOrigin(0, 0.5));
    cert.add(this.add.text(40, 262, 'MitoMon: ผจญภัยในเซลล์', this._style(C.SMALL_FONT_SIZE, '#2e8b57')).setOrigin(0, 0.5));
    const petImg = this.add.image(-345, 230, PetSystem.getTextureKey(pet, 'idle')).setOrigin(0.5, 1).setFlipX(CONFIG.PET.SPRITE_FACES_LEFT);
    petImg.setScale(C.PET_HEIGHT / petImg.height);
    cert.add(petImg);
    cert.setScale(0).setAlpha(0);
    this.tweens.add({ targets: cert, scale: C.FRAME_SCALE, alpha: 1, duration: 500, ease: 'Back.easeOut' });
    this.cert = cert;

    // ปุ่ม
    this.buttons = [
      this._button(this.cx - C.BUTTON_WIDTH / 2 - 14, 'ui_btn_cream', 'บันทึกเป็นภาพ', () => this._saveImage()),
      this._button(this.cx + C.BUTTON_WIDTH / 2 + 14, 'ui_btn_green', 'ปิด', () => this._close()),
    ];
  }

  _button(x, key, label, onPress) {
    const C = CONFIG.CERTIFICATE;
    const Q = CONFIG.QUIZ_PANEL;
    const scale = C.BUTTON_HEIGHT / Q.CHOICE_NATIVE_HEIGHT;
    const c = this.add.container(x, C.BUTTON_Y).setDepth(20);
    c.add([
      this.add.nineslice(0, 0, key, null, C.BUTTON_WIDTH / scale, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale),
      this.add.text(0, 0, label, this._style(22, '#2a1f14')).setOrigin(0.5),
    ]);
    c.setSize(C.BUTTON_WIDTH, C.BUTTON_HEIGHT).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => { SoundFx.play(this, 'click'); onPress(); });
    return c;
  }

  /** ถ่ายภาพเฉพาะใบประกาศแล้วดาวน์โหลดเป็น PNG */
  _saveImage() {
    const C = CONFIG.CERTIFICATE;
    const w = Math.round(C.FRAME_WIDTH * C.FRAME_SCALE);
    const h = Math.round(C.FRAME_HEIGHT * C.FRAME_SCALE);
    const x = Math.round(this.cx - w / 2);
    const y = Math.round(C.FRAME_CENTER_Y - h / 2);
    this.confetti.forEach((e) => e.setVisible(false));
    this.game.renderer.snapshotArea(x, y, w, h, (image) => {
      this.confetti.forEach((e) => e.setVisible(true));
      try {
        const a = document.createElement('a');
        a.href = image.src;
        a.download = C.FILE_NAME;
        document.body.appendChild(a);
        a.click();
        a.remove();
        this.game.events.emit('notify', 'บันทึกใบประกาศแล้ว (ดูในโฟลเดอร์ดาวน์โหลด)');
      } catch (e) {
        window.open(image.src, '_blank');
      }
    });
  }

  _close() {
    if (this.closing) return;
    this.closing = true;
    this.cameras.main.fadeOut(CONFIG.LEVELUP.FADE_MS * 2, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const done = this.onDone;
      this.scene.stop();
      if (done) done();
    });
  }
}
