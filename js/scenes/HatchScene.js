/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/HatchScene.js
   ------------------------------------------------------------
   ฉากเลือกและฟักไข่ (เข้าครั้งแรกหลังกรอกชื่อ)
   ขั้นตอน (this.phase):
     'select'  : ไข่ 5 ใบบนรัง โยกเบา ๆ วางเมาส์/แตะเพื่อดูคำใบ้นิสัย
     'hatching': แตะไข่ TAPS_TO_HATCH ครั้ง สั่นแรงขึ้นทุกครั้ง
                 ครั้งที่ CRACK_AT_TAP เปลี่ยนเป็นไข่ร้าว
                 ครั้งสุดท้าย แสงวาบ + ดาวกระจาย -> สัตว์ร่าง 1 ปรากฏ
     'naming'  : ตั้งชื่อเล่น (หรือใช้ชื่อเดิม) -> บันทึก -> ไปฟาร์ม
   ========================================================== */

class HatchScene extends Phaser.Scene {
  constructor() {
    super('HatchScene');
  }

  init() {
    this.phase = 'select';
    this.selectedIndex = -1;
    this.taps = 0;
    this.eggs = [];
    this.wobbleTweens = [];
  }

  create() {
    const { WIDTH, HEIGHT, FONT_FAMILY } = CONFIG.GAME;
    const H = CONFIG.HATCH;

    this.cameras.main.fadeIn(CONFIG.MAP.WARP_TRANSITION_MS);

    // ---------------- พื้นหลัง ----------------
    this.add.image(WIDTH / 2, HEIGHT / 2, 'bg_hatch').setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, 0.25);

    this.titleText = this.add.text(WIDTH / 2, 64, 'เลือกไข่ MitoMon ของคุณ', {
      fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: 'bold',
      color: '#ffe08a', stroke: '#4a2f7a', strokeThickness: 8,
    }).setOrigin(0.5);

    this.subText = this.add.text(WIDTH / 2, 116, 'วางเมาส์หรือแตะที่ไข่เพื่อดูคำใบ้นิสัย แล้วกดยืนยัน', {
      fontFamily: FONT_FAMILY, fontSize: '22px', color: '#ffffff',
      stroke: '#3a2a5d', strokeThickness: 5,
    }).setOrigin(0.5);

    // ---------------- รังฟักไข่ ----------------
    this.nest = this.add.image(H.NEST_X, H.NEST_Y, 'ui_nest');
    this.nest.setScale(H.NEST_DISPLAY_WIDTH / this.nest.width);

    // วงแสงใต้ไข่ที่เลือก
    this.selectGlow = this.add.ellipse(0, 0, 150, 60, 0xfff3b0, 0.55).setVisible(false);
    this.tweens.add({ targets: this.selectGlow, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // ---------------- ไข่ 5 ใบ ----------------
    const nestLeft = H.NEST_X - H.NEST_DISPLAY_WIDTH / 2;
    PETS.forEach((pet, i) => {
      const x = nestLeft + H.EGG_SLOT_RATIOS[i] * H.NEST_DISPLAY_WIDTH;
      const y = H.NEST_Y + H.EGG_SLOT_Y_OFFSET;
      const egg = this.add.image(x, y, `egg_${pet.id}`).setOrigin(0.5, 0.75);
      egg.baseScale = H.EGG_DISPLAY_HEIGHT / egg.height;
      egg.setScale(egg.baseScale);
      egg.petIndex = i;
      egg.setInteractive({ useHandCursor: true });

      egg.on('pointerover', () => this._onEggHover(i, true));
      egg.on('pointerout', () => this._onEggHover(i, false));
      egg.on('pointerdown', () => {
        if (this.phase === 'select') this._selectEgg(i);
        else if (this.phase === 'hatching' && i === this.selectedIndex) this._tapEgg();
      });

      // โยกเบา ๆ (ความเร็ว/จังหวะสุ่มให้ไม่พร้อมกัน)
      const wob = this.tweens.add({
        targets: egg,
        angle: { from: -H.EGG_WOBBLE_ANGLE, to: H.EGG_WOBBLE_ANGLE },
        duration: Phaser.Math.Between(H.EGG_WOBBLE_MIN_MS, H.EGG_WOBBLE_MAX_MS),
        delay: Phaser.Math.Between(0, H.EGG_WOBBLE_MIN_MS),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.wobbleTweens.push(wob);
      this.eggs.push(egg);
    });

    // ---------------- กล่องคำใบ้ ----------------
    this.hintPanel = this.add.graphics();
    this.hintText = this.add.text(WIDTH / 2, 590, '', {
      fontFamily: FONT_FAMILY, fontSize: `${H.HINT_FONT_SIZE}px`, color: '#3a2a5d',
      align: 'center', wordWrap: { width: H.HINT_BOX_WIDTH - 40 },
    }).setOrigin(0.5);
    this._setHint(null);

    // ---------------- ปุ่มยืนยัน ----------------
    this.confirmBtn = this._makeButton(WIDTH / 2, 672, 'ยืนยันเลือกไข่ใบนี้', 0x5cc98a, () => this._confirmEgg());
    this.confirmBtn.setVisible(false);

    // ---------------- ข้อความนับการแตะ ----------------
    this.tapText = this.add.text(WIDTH / 2, 640, '', {
      fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#4a2f7a', strokeThickness: 7,
    }).setOrigin(0.5).setVisible(false);

    // ---------------- ตัวปล่อยอนุภาค (ดาว/ประกาย) ----------------
    this.starEmitter = this.add.particles(0, 0, 'fx_sparkle', {
      speed: { min: H.STAR_SPEED_MIN, max: H.STAR_SPEED_MAX },
      angle: { min: 0, max: 360 },
      rotate: { start: 0, end: 360 },
      scale: { start: H.STAR_SCALE, end: 0 },
      lifespan: H.STAR_LIFESPAN_MS,
      emitting: false,
    }).setDepth(50);
    this.tapEmitter = this.add.particles(0, 0, 'fx_sparkle', {
      speed: { min: H.STAR_SPEED_MIN / 2, max: H.STAR_SPEED_MAX / 2 },
      angle: { min: 200, max: 340 },
      scale: { start: H.STAR_SCALE / 2, end: 0 },
      lifespan: H.STAR_LIFESPAN_MS / 2,
      emitting: false,
    }).setDepth(50);
  }

  // ============================================================
  // ขั้นเลือกไข่
  // ============================================================
  _onEggHover(i, isOver) {
    if (this.phase !== 'select') return;
    const egg = this.eggs[i];
    if (i !== this.selectedIndex) {
      this.tweens.add({
        targets: egg,
        scale: egg.baseScale * (isOver ? CONFIG.HATCH.EGG_HOVER_SCALE : 1),
        duration: 150,
      });
    }
    if (isOver) this._setHint(PETS[i]);
    else this._setHint(this.selectedIndex >= 0 ? PETS[this.selectedIndex] : null);
  }

  _selectEgg(i) {
    this.selectedIndex = i;
    this.eggs.forEach((egg, j) => {
      const s = j === i ? CONFIG.HATCH.EGG_SELECTED_SCALE : 1;
      this.tweens.add({ targets: egg, scale: egg.baseScale * s, duration: 180, ease: 'Back.easeOut' });
    });
    const egg = this.eggs[i];
    this.selectGlow.setPosition(egg.x, egg.y + 10).setVisible(true);
    this._setHint(PETS[i]);
    this.confirmBtn.setVisible(true);
  }

  _setHint(pet) {
    const { WIDTH } = CONFIG.GAME;
    const H = CONFIG.HATCH;
    const msg = pet
      ? `ไข่ธาตุ "${pet.element}"\n${pet.hint}`
      : 'แต่ละใบมีนิสัยไม่เหมือนกัน ลองดูคำใบ้ทุกใบก่อนตัดสินใจนะ';
    // (เฟส 8) ตัดบรรทัดภาษาไทยด้วย TextUtil
    this.hintText.setText(TextUtil.wrapThai(msg, TextUtil.fontString(CONFIG.HATCH.HINT_FONT_SIZE, false), CONFIG.HATCH.HINT_BOX_WIDTH - 48).join('\n'));
    const boxW = H.HINT_BOX_WIDTH;
    const boxH = this.hintText.height + 26;
    this.hintPanel.clear();
    this.hintPanel.fillStyle(0xfff8e8, 0.95);
    this.hintPanel.fillRoundedRect(WIDTH / 2 - boxW / 2, this.hintText.y - boxH / 2, boxW, boxH, CONFIG.UI.PANEL_RADIUS);
    this.hintPanel.lineStyle(3, 0x5cc98a, 1);
    this.hintPanel.strokeRoundedRect(WIDTH / 2 - boxW / 2, this.hintText.y - boxH / 2, boxW, boxH, CONFIG.UI.PANEL_RADIUS);
  }

  _confirmEgg() {
    if (this.phase !== 'select' || this.selectedIndex < 0) return;
    this.phase = 'hatching';
    const H = CONFIG.HATCH;
    const egg = this.eggs[this.selectedIndex];
    const pet = PETS[this.selectedIndex];

    this.confirmBtn.setVisible(false);
    this.selectGlow.setVisible(false);
    this.hintPanel.setVisible(false);
    this.hintText.setVisible(false);
    this.wobbleTweens.forEach((t) => t.stop());

    // ไข่ใบอื่นจางหาย รังจางลง
    this.eggs.forEach((e, j) => {
      if (j === this.selectedIndex) return;
      e.disableInteractive();
      this.tweens.add({ targets: e, alpha: 0, y: e.y + 30, duration: 400 });
    });
    this.tweens.add({ targets: this.nest, alpha: 0.25, duration: 400 });

    this.titleText.setText(`ไข่ธาตุ "${pet.element}"`);
    this.subText.setText('แตะที่ไข่เพื่อช่วยให้ฟักออกมา!');

    egg.setAngle(0);
    this.tweens.add({
      targets: egg,
      x: H.HATCH_EGG_X,
      y: H.HATCH_EGG_Y,
      scale: H.HATCH_EGG_HEIGHT / egg.height,
      duration: H.MOVE_TO_CENTER_MS,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        egg.baseScale = H.HATCH_EGG_HEIGHT / egg.height;
        this._updateTapText();
        this.tapText.setVisible(true);
        // เด้งเบา ๆ ชวนให้แตะ
        this.idlePulse = this.tweens.add({
          targets: egg, scaleY: egg.baseScale * 1.04, duration: 500, yoyo: true, repeat: -1,
        });
      },
    });
  }

  // ============================================================
  // ขั้นฟักไข่
  // ============================================================
  _updateTapText() {
    this.tapText.setText(`แตะไข่ ${CONFIG.HATCH.TAPS_TO_HATCH} ครั้งเพื่อฟัก! (${this.taps}/${CONFIG.HATCH.TAPS_TO_HATCH})`);
  }

  _tapEgg() {
    const H = CONFIG.HATCH;
    if (this.phase !== 'hatching' || this.taps >= H.TAPS_TO_HATCH || !this.tapText.visible) return;

    const egg = this.eggs[this.selectedIndex];
    const pet = PETS[this.selectedIndex];
    this.taps += 1;
    this._updateTapText();

    if (this.idlePulse) { this.idlePulse.stop(); this.idlePulse = null; }
    if (this.shakeTween) this.shakeTween.stop();
    egg.setScale(egg.baseScale);

    // สั่นแรงขึ้นตามจำนวนครั้ง
    const amp = H.SHAKE_BASE_ANGLE + (this.taps - 1) * H.SHAKE_STEP_ANGLE;
    this.shakeTween = this.tweens.add({
      targets: egg,
      angle: { from: -amp, to: amp },
      duration: H.SHAKE_MS,
      yoyo: true,
      repeat: H.SHAKE_REPEAT,
      onComplete: () => egg.setAngle(0),
    });
    this.tweens.add({ targets: egg, scaleX: egg.baseScale * 1.06, scaleY: egg.baseScale * 0.94, duration: 80, yoyo: true });
    this.tapEmitter.explode(H.TAP_SPARKS, egg.x, egg.y - egg.displayHeight * 0.5);

    if (this.taps === H.CRACK_AT_TAP) {
      egg.setTexture(`egg_${pet.id}_crack`);
      egg.baseScale = H.HATCH_EGG_HEIGHT / egg.height;
      egg.setScale(egg.baseScale);
    }

    if (this.taps >= H.TAPS_TO_HATCH) {
      this.time.delayedCall(H.SHAKE_MS * (H.SHAKE_REPEAT + 1) * 2, () => this._hatch());
    }
  }

  _hatch() {
    const H = CONFIG.HATCH;
    const egg = this.eggs[this.selectedIndex];
    const pet = PETS[this.selectedIndex];
    const form = pet.forms[0];

    egg.disableInteractive();
    this.tapText.setVisible(false);

    // แสงวาบ + ดาวกระจาย
    this.cameras.main.flash(H.FLASH_MS, 255, 255, 255);
    SoundFx.play(this, 'hatch');
    this.starEmitter.explode(H.STAR_BURST_COUNT, egg.x, egg.y - egg.displayHeight * 0.4);
    this.tweens.add({ targets: egg, scale: egg.baseScale * 1.4, alpha: 0, duration: 300, onComplete: () => egg.setVisible(false) });

    // สัตว์เลี้ยงร่าง 1 ปรากฏ
    const sprite = this.add.image(H.HATCH_EGG_X, H.PET_REVEAL_Y, `${pet.id}_f1_idle`).setOrigin(0.5, 1);
    const petScale = H.PET_REVEAL_HEIGHT / sprite.height;
    sprite.setScale(0);
    this.revealSprite = sprite;
    this.revealBaseScale = petScale;

    this.tweens.add({
      targets: sprite,
      scale: petScale,
      duration: 450,
      delay: 150,
      ease: 'Back.easeOut',
      onComplete: () => this._joyJumps(sprite, pet),
    });

    this.titleText.setText(`ยินดีด้วย! ได้ "${form.name}"`);
    this.subText.setText(`ธาตุ ${pet.element} - ${form.desc}`);
  }

  _joyJumps(sprite, pet) {
    const H = CONFIG.HATCH;
    const baseY = sprite.y;
    sprite.setTexture(`${pet.id}_f1_blink`); // ยิ้มตาปิดตอนดีใจ
    this.tweens.add({
      targets: sprite,
      y: baseY - H.PET_JOY_JUMP_HEIGHT,
      duration: H.PET_JOY_JUMP_MS,
      ease: 'Quad.easeOut',
      yoyo: true,
      repeat: H.PET_JOY_JUMPS - 1,
      onComplete: () => {
        sprite.y = baseY;
        sprite.setTexture(`${pet.id}_f1_idle`);
        this._startRevealIdle(sprite, pet);
        this._showNaming(pet);
      },
    });
  }

  /** หายใจ + กะพริบตาระหว่างรอตั้งชื่อ */
  _startRevealIdle(sprite, pet) {
    const P = CONFIG.PET;
    this.tweens.add({
      targets: sprite, scaleY: this.revealBaseScale * P.BREATH_SCALE_Y,
      duration: P.BREATH_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const blink = () => {
      if (!sprite.active) return;
      sprite.setTexture(`${pet.id}_f1_blink`);
      this.time.delayedCall(P.BLINK_DURATION_MS, () => {
        if (sprite.active) sprite.setTexture(`${pet.id}_f1_idle`);
      });
      this.time.delayedCall(Phaser.Math.Between(P.BLINK_MIN_MS, P.BLINK_MAX_MS), blink);
    };
    this.time.delayedCall(Phaser.Math.Between(P.BLINK_MIN_MS, P.BLINK_MAX_MS), blink);
  }

  // ============================================================
  // ขั้นตั้งชื่อเล่น
  // ============================================================
  _showNaming(pet) {
    const { WIDTH } = CONFIG.GAME;
    const H = CONFIG.HATCH;
    const form = pet.forms[0];
    this.phase = 'naming';

    const panel = this.add.graphics();
    panel.fillStyle(0xfff8e8, 0.96);
    panel.fillRoundedRect(WIDTH / 2 - 330, 440, 660, 250, CONFIG.UI.PANEL_RADIUS);
    panel.lineStyle(3, 0x5cc98a, 1);
    panel.strokeRoundedRect(WIDTH / 2 - 330, 440, 660, 250, CONFIG.UI.PANEL_RADIUS);

    this.add.text(WIDTH / 2, 474, `ตั้งชื่อเล่นให้ ${form.name}`, {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '24px', fontStyle: 'bold', color: '#3a2a5d',
    }).setOrigin(0.5);

    const input = this.add.dom(WIDTH / 2, 530, 'input');
    input.node.setAttribute('type', 'text');
    input.node.setAttribute('placeholder', form.name);
    input.node.setAttribute('maxlength', String(H.NICKNAME_MAX_LENGTH));
    input.node.className = 'mitomon-input';
    this.nameInput = input;

    this.add.text(WIDTH / 2, 572, `ไม่เกิน ${H.NICKNAME_MAX_LENGTH} ตัวอักษร (ถ้าไม่ตั้ง จะใช้ชื่อ "${form.name}")`, {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '16px', color: '#7a6a9d',
    }).setOrigin(0.5);

    this._makeButton(WIDTH / 2 - 130, 632, 'ตั้งชื่อนี้', 0x5cc98a, () => this._finish(pet, input.node.value));
    this._makeButton(WIDTH / 2 + 130, 632, 'ใช้ชื่อเดิม', 0x9a86d6, () => this._finish(pet, ''));

    input.node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._finish(pet, input.node.value);
    });
  }

  _finish(pet, nickname) {
    if (this.phase !== 'naming') return;
    this.phase = 'done';
    const clean = (nickname || '').trim().slice(0, CONFIG.HATCH.NICKNAME_MAX_LENGTH);
    PetSystem.create(pet.id, clean);

    this.cameras.main.fadeOut(CONFIG.MAP.WARP_TRANSITION_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('WorldScene', { mapKey: 'farm' });
    });
  }

  // ============================================================
  // ปุ่มทั่วไป (Graphics + Text + Zone ใน Container)
  // ============================================================
  _makeButton(x, y, label, color, onClick) {
    const w = 240;
    const h = 56;
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      bg.lineStyle(3, hover ? 0xffffff : 0xffe08a, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    };
    draw(false);
    const text = this.add.text(0, 0, label, {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '22px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#3a2a5d', strokeThickness: 4,
    }).setOrigin(0.5);
    const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    const btn = this.add.container(x, y, [bg, text, zone]).setDepth(40);

    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerdown', () => this.tweens.add({ targets: btn, scale: 0.94, duration: 70, yoyo: true }));
    zone.on('pointerup', () => { if (btn.visible) onClick(); });
    return btn;
  }
}
