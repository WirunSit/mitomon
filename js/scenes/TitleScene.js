/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/TitleScene.js
   ------------------------------------------------------------
   หน้าจอชื่อเกม (ภาพจริง ui/title_bg.png + ui/logo.png)
   (เฟส 8) สัตว์ 5 ตัวเดินขบวนผ่านหน้าจอ, เพลง bgm_title, ปุ่มเสียง (M)
   ฟอร์มกรอก ชื่อ-เลขที่-ห้อง แล้วเลือก:
   - [เล่นต่อ]  โหลดข้อมูลของผู้เล่นคนนี้ แล้วกลับไปยังแผนที่ล่าสุด
                (ยังไม่ฟักไข่ -> ไป HatchScene)
   - [เริ่มใหม่] ถ้ามีข้อมูลเดิม จะมีกล่องยืนยันก่อนลบ แล้วไปฟักไข่ใหม่
   (เฟส 6) บันทึกแยกตามผู้เล่น (ชื่อ|ห้อง|เลขที่) เครื่องเดียวใช้หลายคนได้
   ปุ่มลัด "ผู้เล่นในเครื่องนี้" ด้านล่าง แตะเพื่อกรอกข้อมูลให้อัตโนมัติ
   ========================================================== */

class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const T = CONFIG.TITLE;
    this.busy = false;

    this.cameras.main.setBackgroundColor(CONFIG.GAME.BACKGROUND_COLOR);
    this.cameras.main.fadeIn(CONFIG.MAP.WARP_TRANSITION_MS);

    // ---------------- พื้นหลังภาพจริง + โลโก้ ----------------
    this.add.image(WIDTH / 2, HEIGHT / 2, 'title_bg').setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, T.BG_DIM_ALPHA);
    this._buildDecoration();
    this._buildParade();
    AudioSystem.playBgm('bgm_title');

    const formBg = this.add.graphics();
    formBg.fillStyle(0x1f1636, T.FORM_PANEL_ALPHA);
    formBg.fillRoundedRect(WIDTH / 2 - T.FORM_PANEL_WIDTH / 2, T.FORM_PANEL_Y - T.FORM_PANEL_HEIGHT / 2,
      T.FORM_PANEL_WIDTH, T.FORM_PANEL_HEIGHT, 20);
    formBg.lineStyle(3, 0xffe08a, 0.8);
    formBg.strokeRoundedRect(WIDTH / 2 - T.FORM_PANEL_WIDTH / 2, T.FORM_PANEL_Y - T.FORM_PANEL_HEIGHT / 2,
      T.FORM_PANEL_WIDTH, T.FORM_PANEL_HEIGHT, 20);

    const logo = this.add.image(WIDTH / 2, T.LOGO_Y, 'ui_logo');
    logo.setScale(T.LOGO_HEIGHT / logo.height);
    this.tweens.add({ targets: logo, y: T.LOGO_Y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(WIDTH / 2, T.SUBTITLE_Y, 'ผจญภัยในเซลล์', this._style(30, '#ffffff', true, {
      stroke: '#4a2f7a', strokeThickness: 6,
    })).setOrigin(0.5);

    // ---------------- ฟอร์ม ----------------
    const formTopY = 250;
    const rowGap = 62;
    this.add.text(WIDTH / 2, formTopY - 34, 'กรอกข้อมูลก่อนเริ่มผจญภัย', this._style(20, '#c9b8ef', false)).setOrigin(0.5);
    this.nameInput = this._createTextInput(WIDTH / 2, formTopY, 'ชื่อ-นามสกุล');
    this.numberInput = this._createTextInput(WIDTH / 2, formTopY + rowGap, 'เลขที่');
    this.roomInput = this._createTextInput(WIDTH / 2, formTopY + rowGap * 2, 'ห้อง เช่น ม.4/1');
    [this.nameInput, this.numberInput, this.roomInput].forEach((d) => d.node.addEventListener('input', () => this._updateStatus()));

    const last = SaveSystem.loadPlayerProfile();
    if (last) this._fillForm(last);

    this.statusText = this.add.text(WIDTH / 2, T.STATUS_Y, '', this._style(17, '#c9b8ef', true)).setOrigin(0.5);

    // ---------------- ปุ่ม ----------------
    const half = T.BUTTON_WIDTH / 2 + T.BUTTON_GAP / 2;
    this.continueBtn = this._button(WIDTH / 2 - half, T.BUTTON_Y, 'ui_btn_green', 'เล่นต่อ', () => this._onContinue());
    this.newBtn = this._button(WIDTH / 2 + half, T.BUTTON_Y, 'ui_btn_cream', 'เริ่มใหม่', () => this._onNewGame());

    this._buildPlayerChips();
    this._updateStatus();

    // (เฟส 8) ปุ่มเสียง มุมบนซ้าย + แจ้งเตือนภาพหาย (ใช้ภาพสำรองอยู่)
    // ไอคอนลำโพงจริง (ui/sound_on.png / sound_off.png)
    this.muteBtn = this.add.image(50, 44, 'ui_sound_on').setInteractive({ useHandCursor: true });
    this.muteScale = 52 / Math.max(this.muteBtn.width, this.muteBtn.height);
    this.muteBtn.setScale(this.muteScale);
    this.muteLabel = this.add.text(50, 74, '', this._style(14, '#ffffff', true, {
      stroke: '#2a1f4d', strokeThickness: 4,
    })).setOrigin(0.5, 0);
    const refreshMute = () => {
      this.muteBtn.setTexture(AudioSystem.muted ? 'ui_sound_off' : 'ui_sound_on');
      this.muteLabel.setText(AudioSystem.muted ? 'เสียงปิด (M)' : 'เสียงเปิด (M)');
    };
    this.muteBtn.on('pointerover', () => this.muteBtn.setScale(this.muteScale * 1.08));
    this.muteBtn.on('pointerout', () => this.muteBtn.setScale(this.muteScale));
    this.muteBtn.on('pointerup', () => { AudioSystem.toggle(); refreshMute(); });
    refreshMute();
    this.input.keyboard.on('keydown-M', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return; // กำลังพิมพ์ชื่อ
      AudioSystem.toggle();
      refreshMute();
    });
    const missing = this.registry.get('missingAssets') || [];
    if (missing.length) {
      this.add.text(WIDTH / 2, HEIGHT - 8, `คำเตือน: ไฟล์ภาพหาย ${missing.length} ไฟล์ (ใช้ภาพสำรองอยู่) ดูรายชื่อใน Console (F12)`,
        this._style(15, '#ff9a9a', true, { backgroundColor: '#1f1636', padding: { x: 10, y: 4, top: 6 } })).setOrigin(0.5, 1).setDepth(50);
    }

    // (เฟส 7) ปุ่มโหมดครู มุมล่างขวา
    const tb = this.add.text(WIDTH - 20, HEIGHT - 16, 'โหมดครู', this._style(16, '#ffe08a', true, {
      backgroundColor: '#2a1f4d', padding: { x: 14, y: 6, top: 8 },
    })).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    tb.on('pointerup', () => {
      if (this.busy) return;
      [this.nameInput, this.numberInput, this.roomInput].forEach((d) => d.setVisible(false));
      OverlayScene.openOver(this.game, 'TeacherScene', 'TitleScene');
    });
  }

  _style(size, color, bold, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal',
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 }, align: 'center',
    }, extra || {});
  }

  _button(x, y, key, label, onPress, w, h) {
    const T = CONFIG.TITLE;
    const Q = CONFIG.QUIZ_PANEL;
    const bw = w || T.BUTTON_WIDTH;
    const bh = h || T.BUTTON_HEIGHT;
    const scale = bh / Q.CHOICE_NATIVE_HEIGHT;
    const c = this.add.container(x, y);
    c.add([
      this.add.nineslice(0, 0, key, null, bw / scale, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale),
      this.add.text(0, 0, label, this._style(24, '#2a1f14', true)).setOrigin(0.5),
    ]);
    c.setSize(bw, bh).setInteractive({ useHandCursor: true });
    c.enabled = true;
    c.on('pointerover', () => { if (c.enabled) c.setScale(1.04); });
    c.on('pointerout', () => c.setScale(1));
    c.on('pointerup', () => {
      if (!c.enabled || this.busy) return;
      this.tweens.add({ targets: c, scale: 0.95, duration: 70, yoyo: true });
      onPress();
    });
    c.setEnabled = (on) => { c.enabled = on; c.setAlpha(on ? 1 : 0.45); };
    return c;
  }

  // ============================================================
  // ช่องกรอกข้อความ (HTML DOM Element ฝังในฉาก Phaser)
  // ============================================================
  _createTextInput(x, y, placeholder) {
    const dom = this.add.dom(x, y, 'input');
    dom.node.setAttribute('type', 'text');
    dom.node.setAttribute('placeholder', placeholder);
    dom.node.setAttribute('maxlength', '40');
    dom.node.className = 'mitomon-input';
    dom.updateSize(); // วัดขนาดใหม่หลังใส่ CSS ให้ช่องกรอกอยู่กึ่งกลางพอดี
    return dom;
  }

  /** เรียกโดย OverlayScene เมื่อปิดโหมดครู */
  onOverlayClosed() {
    [this.nameInput, this.numberInput, this.roomInput].forEach((d) => d.setVisible(true));
  }

  _readForm() {
    return {
      name: this.nameInput.node.value.trim(),
      studentNumber: this.numberInput.node.value.trim(),
      room: this.roomInput.node.value.trim(),
    };
  }

  _fillForm(p) {
    this.nameInput.node.value = p.name || '';
    this.numberInput.node.value = p.studentNumber || '';
    this.roomInput.node.value = p.room || '';
  }

  _formComplete(p) {
    return !!(p.name && p.studentNumber && p.room);
  }

  /** อัปเดตข้อความสถานะ + เปิด/ปิดปุ่ม "เล่นต่อ" ตามข้อมูลที่กรอก */
  _updateStatus() {
    const p = this._readForm();
    if (!this._formComplete(p)) {
      this.statusText.setText('กรอกชื่อ เลขที่ และห้อง ให้ครบ').setColor('#c9b8ef');
      this.continueBtn.setEnabled(false);
      return;
    }
    const g = SaveSystem.getSaveSummary(p);
    if (g && g.pet) {
      const sp = PetSystem.getSpecies(g.pet.speciesId);
      const form = sp ? sp.forms[(g.pet.form || 1) - 1] : null;
      const where = g.location && MAPS[g.location.mapKey] ? ` • ${MAPS[g.location.mapKey].name}` : '';
      this.statusText.setText(`พบข้อมูลเดิม: ${g.pet.nickname || (form ? form.name : '')} Lv.${g.pet.level}${where}`).setColor('#8fffc0');
      this.continueBtn.setEnabled(true);
    } else {
      this.statusText.setText('ผู้เล่นใหม่ กด "เริ่มใหม่" เพื่อเลือกไข่').setColor('#ffe08a');
      this.continueBtn.setEnabled(false);
    }
  }

  _showError(message) {
    this.statusText.setText(message).setColor('#ff8a8a');
    this.tweens.add({
      targets: this.statusText, x: { from: CONFIG.GAME.WIDTH / 2 - 8, to: CONFIG.GAME.WIDTH / 2 + 8 },
      duration: 60, yoyo: true, repeat: 3, onComplete: () => this.statusText.setX(CONFIG.GAME.WIDTH / 2),
    });
  }

  // ============================================================
  // ปุ่มลัดผู้เล่นในเครื่องนี้
  // ============================================================
  _buildPlayerChips() {
    const T = CONFIG.TITLE;
    const players = SaveSystem.listPlayers().filter((p) => p.profile && p.profile.name).slice(0, CONFIG.SAVE.PLAYER_CHIPS_MAX);
    if (players.length === 0) return;
    const { WIDTH } = CONFIG.GAME;
    this.add.text(WIDTH / 2, T.CHIPS_TITLE_Y, 'ผู้เล่นในเครื่องนี้ (แตะเพื่อเลือก)', this._style(16, '#ffe08a', true, {
      stroke: '#1f1636', strokeThickness: 4,
    })).setOrigin(0.5);
    players.forEach((pl, i) => {
      const row = Math.floor(i / T.CHIP_PER_ROW);
      const col = i % T.CHIP_PER_ROW;
      const inRow = Math.min(T.CHIP_PER_ROW, players.length - row * T.CHIP_PER_ROW);
      const x = WIDTH / 2 + (col - (inRow - 1) / 2) * (T.CHIP_WIDTH + 10);
      const y = T.CHIPS_Y + row * T.CHIP_ROW_GAP;
      const label = `${pl.profile.name} (${pl.profile.room})${pl.level ? `  Lv.${pl.level}` : ''}`;
      const t = this.add.text(x, y, label, this._style(T.CHIP_FONT_SIZE, '#ffffff', true, {
        backgroundColor: '#3a2a6b', padding: { x: 12, y: 6, top: 8 }, fixedWidth: T.CHIP_WIDTH,
      })).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#5a44a0'));
      t.on('pointerout', () => t.setBackgroundColor('#3a2a6b'));
      t.on('pointerup', () => { this._fillForm(pl.profile); this._updateStatus(); });
    });
  }

  // ============================================================
  // เล่นต่อ / เริ่มใหม่
  // ============================================================
  /** เปลี่ยนผู้เล่นปัจจุบัน แล้วล้างสถานะเดิมในหน่วยความจำทุกระบบ */
  _switchPlayer(profile) {
    SaveSystem.setCurrentPlayer(profile);
    PetSystem.current = null;
    QuizSystem.reset();
    InventorySystem.reset();
    PlayTimeSystem._total = null;
    PlayTimeSystem.reset();
    PlayTimeSystem._total = null;
    WorldScene._wanderRespawn = {};
    WorldScene._safeUntil = 0;
    this.registry.set('playerProfile', profile);
    PetSystem.loadFromSave();
  }

  _onContinue() {
    const p = this._readForm();
    if (!this._formComplete(p)) { this._showError('กรุณากรอกชื่อ เลขที่ และห้อง ให้ครบก่อน'); return; }
    if (!SaveSystem.hasSave(p)) { this._showError('ยังไม่มีข้อมูลของผู้เล่นนี้ กด "เริ่มใหม่" เพื่อเริ่มผจญภัย'); return; }
    this._switchPlayer(p);
    const g = SaveSystem.loadGame() || {};
    let mapKey = g.location && MAPS[g.location.mapKey] ? g.location.mapKey : 'farm';
    const need = CONFIG.ZONE_LOCK[mapKey];
    if (need && PetSystem.current && PetSystem.current.level < need) mapKey = 'farm';
    this._go(() => {
      if (PetSystem.current) this.scene.start('WorldScene', { mapKey });
      else this.scene.start('HatchScene');
    });
  }

  _onNewGame() {
    const p = this._readForm();
    if (!this._formComplete(p)) { this._showError('กรุณากรอกชื่อ เลขที่ และห้อง ให้ครบก่อน'); return; }
    const start = () => {
      SaveSystem.deletePlayer(p);
      this._switchPlayer(p);
      this._go(() => this.scene.start('HatchScene'));
    };
    if (SaveSystem.hasSave(p)) this._confirm(p, start);
    else start();
  }

  _go(fn) {
    this.busy = true;
    this.cameras.main.fadeOut(CONFIG.MAP.WARP_TRANSITION_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', fn);
  }

  /** กล่องยืนยันก่อนลบข้อมูลเดิม */
  _confirm(profile, onYes) {
    const T = CONFIG.TITLE;
    const Q = CONFIG.QUIZ_PANEL;
    const S = Q.PANEL_SLICE;
    const art = Q.PANEL_ART_SCALE;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    this.busy = true;
    const inputs = [this.nameInput, this.numberInput, this.roomInput];
    inputs.forEach((d) => d.setVisible(false)); // DOM อยู่เหนือ canvas ต้องซ่อนไว้

    const dim = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, 0.7).setInteractive().setDepth(100);
    const c = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(101);
    const top = -T.CONFIRM_HEIGHT / 2;
    c.add(this.add.nineslice(0, 0, 'ui_panel', null, T.CONFIRM_WIDTH / art, T.CONFIRM_HEIGHT / art, S.LEFT, S.RIGHT, S.TOP, S.BOTTOM).setScale(art));
    c.add(this.add.image(0, top, 'ui_panel_badge').setOrigin(0.5, 0).setScale(art));
    c.add(this.add.text(0, top + 120, 'ยืนยันการเริ่มใหม่?', this._style(28, '#d9434f', true)).setOrigin(0.5));
    const g = SaveSystem.getSaveSummary(profile);
    const lv = g && g.pet ? `Lv.${g.pet.level}` : '';
    const msg = TextUtil.wrapThai(`ข้อมูลของ "${profile.name}" (สัตว์เลี้ยง ${lv} ไอเท็ม และเหรียญตรา) จะถูกลบทั้งหมด และกลับไปเลือกไข่ใหม่`,
      TextUtil.fontString(19, false), T.CONFIRM_WIDTH - 120).join('\n');
    c.add(this.add.text(0, top + 158, msg, this._style(19, '#3a2a1f', false)).setOrigin(0.5, 0));
    const close = () => {
      dim.destroy();
      c.destroy();
      inputs.forEach((d) => d.setVisible(true));
      this.busy = false;
    };
    const yes = this._button(-130, T.CONFIRM_HEIGHT / 2 - 64, 'ui_btn_red', 'ยืนยันลบ', () => {}, 220, 58);
    const no = this._button(130, T.CONFIRM_HEIGHT / 2 - 64, 'ui_btn_cream', 'ยกเลิก', () => {}, 220, 58);
    // ปุ่มในกล่องยืนยันต้องกดได้แม้ busy
    yes.removeAllListeners('pointerup');
    no.removeAllListeners('pointerup');
    yes.on('pointerup', () => { close(); onYes(); });
    no.on('pointerup', () => close());
    c.add([yes, no]);
    c.setScale(0.85);
    this.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.easeOut' });
  }

  // ============================================================
  // (เฟส 8) ขบวนสัตว์เลี้ยง 5 ตัวเดินผ่านหน้าจอ (ร่างแรก + กะพริบตา)
  // ============================================================
  _buildParade() {
    const T = CONFIG.TITLE;
    const { WIDTH } = CONFIG.GAME;
    this.parade = PETS.map((pet, i) => {
      const img = this.add.image(T.PARADE_SPACING * (PETS.length - i), T.PARADE_Y, `${pet.id}_f1_idle`).setOrigin(0.5, 1);
      const s = T.PARADE_HEIGHT / img.height;
      img.setScale(s).setFlipX(CONFIG.PET.SPRITE_FACES_LEFT); // สร้างหลังพื้นหลัง จึงอยู่เหนือพื้นหลังแต่ใต้ฟอร์ม
      this.tweens.add({
        targets: img, y: T.PARADE_Y - T.PARADE_HOP_PX, duration: T.PARADE_HOP_MS, yoyo: true, repeat: -1,
        ease: 'Quad.easeOut', delay: i * 90,
      });
      this.tweens.add({ targets: img, angle: { from: -4, to: 4 }, duration: T.PARADE_HOP_MS * 2, yoyo: true, repeat: -1, delay: i * 90 });
      this.time.addEvent({
        delay: Phaser.Math.Between(CONFIG.PET.BLINK_MIN_MS, CONFIG.PET.BLINK_MAX_MS), loop: true,
        callback: () => {
          img.setTexture(`${pet.id}_f1_blink`);
          this.time.delayedCall(CONFIG.PET.BLINK_DURATION_MS, () => img.setTexture(`${pet.id}_f1_idle`));
        },
      });
      return img;
    });
    this.paradeWidth = WIDTH + T.PARADE_SPACING * (PETS.length + 1);
  }

  update(time, delta) {
    if (!this.parade) return;
    const T = CONFIG.TITLE;
    this.parade.forEach((img) => {
      img.x += (T.PARADE_SPEED * delta) / 1000;
      if (img.x > CONFIG.GAME.WIDTH + T.PARADE_SPACING) img.x -= this.paradeWidth;
    });
  }

  // ============================================================
  // พื้นหลังตกแต่ง (วงกลมเรืองแสงลอยตัว)
  // ============================================================
  _buildDecoration() {
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const colors = [0x6b4fb0, 0x3fa9a0, 0xe0a63e];
    for (let i = 0; i < 10; i++) {
      const r = Phaser.Math.Between(10, 26);
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const circle = this.add.circle(x, y, r, colors[i % colors.length], 0.18);
      this.tweens.add({
        targets: circle, y: y - Phaser.Math.Between(30, 80), duration: Phaser.Math.Between(2500, 4500),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }
}
