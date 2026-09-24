/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/BattleScene.js
   ------------------------------------------------------------
   ฉากต่อสู้แบบผลัดตา (เริ่มจาก WorldScene._startBattle)
   data = { monsterId, wandererIndex, mapKey, zone }

   - พื้นหลัง bg_zone{n}.png / bg_boss.png
   - สัตว์เลี้ยงซ้ายล่าง มอนสเตอร์ขวาบน มีหลอด HP ทั้งคู่
     ทั้งสองฝั่ง "หายใจ" (ยืดหด) + ลอยขึ้นลงตลอดเวลา
   - เมนู: [ตอบคำถามโจมตี] [ใช้ไอเท็ม] [หนี]  (กด 1 / 2 / 3 ได้)
   - ตอบถูก: สัตว์พุ่งชน (ภาพ attack) + เอฟเฟกต์ตามธาตุ + ตัวเลขเด้ง
             มอนสเตอร์เป็นภาพ hurt และสั่น  (คอมโบ 3 ข้อขึ้นไป x1.5)
   - ตอบผิด/หมดเวลา: มอนสเตอร์โจมตีกลับ สัตว์เป็นภาพ hurt จอสั่นเบา ๆ
   - ไอเท็ม: ยาฟื้นพลัง (HP 50%), NAD⁺ (ตัดตัวเลือกผิด 1 ข้อ),
             ออกซิเจน (ข้ามคำถาม = โจมตีปกติ), ATP (ดาเมจครั้งถัดไป x2)
   - ชนะ: มอนสเตอร์จางเป็นประกาย สรุป EXP -> กลับแผนที่เดิม
   - แพ้: ข้อความให้กำลังใจ -> กลับฟาร์ม HP เต็ม ไม่เสีย EXP
   - (เฟส 6) บอส 2 ช่วง: HP ต่ำกว่า CONFIG.BOSS.PHASE2_HP_RATIO บอส
     "ล็อกห่วงโซ่อิเล็กตรอน" ต้องตอบถูกติดกัน CHAIN_REQUIRED ข้อจึงทำดาเมจได้
     (ใช้ O₂ ปิดห่วงโซ่ได้ทันที) ชนะบอสได้เหรียญตราพิเศษ
   ตรรกะตัวเลขอยู่ใน BattleSystem, ค่าตั้งต้นอยู่ใน CONFIG.BATTLE / CONFIG.BOSS
   ========================================================== */

const BATTLE_CHEERS = [
  'ไม่เป็นไรนะ! ทุกคำตอบที่ผิดคือบทเรียนที่ทำให้เราเก่งขึ้น',
  'พักหายใจสักหน่อย แล้วกลับไปลุยใหม่ เซลล์ของเรายังมีพลังเหลือเฟือ!',
  'แม้แต่ไมโทคอนเดรียก็ต้องพักบ้าง ลองอ่านคำอธิบายแล้วสู้ใหม่นะ',
];

class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  init(data) {
    this.data0 = data || {};
    this.state = BattleSystem.create(this.data0.monsterId || 'm1', this.data0.zone || 1);
    if (this.data0.tutorial) {
      // (เฟส 8) มอนสเตอร์ฝึกของบทช่วยสอน: อ่อนลง และสัตว์เลี้ยงไม่หมดแรง
      const T = CONFIG.TUTORIAL;
      this.state.tutorial = true;
      this.state.monster = Object.assign({}, this.state.monster, { hp: T.MONSTER_HP, atk: T.MONSTER_ATK });
      this.state.monsterHp = T.MONSTER_HP;
    }
    this.busy = true;
    this.ended = false;
  }

  create() {
    const B = CONFIG.BATTLE;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const m = this.state.monster;
    const pet = PetSystem.current;

    // ---------------- พื้นหลัง ----------------
    const bgKey = (m.isBoss || this.state.zone === 'boss') ? 'bg_boss' : `bg_zone${this.state.zone}`;
    AudioSystem.playBgm(m.isBoss || this.state.zone === 'boss' ? 'bgm_boss' : 'bgm_battle');
    this.state.phase = 1;
    this.state.chain = 0;
    this.add.image(WIDTH / 2, HEIGHT / 2, bgKey).setDisplaySize(WIDTH, HEIGHT);

    // ---------------- ตัวละคร ----------------
    const monH = m.isBoss ? B.BOSS_HEIGHT : B.MONSTER_HEIGHT;
    this.monster = this._makeFighter(B.MONSTER_X, B.MONSTER_Y, m.idleKey, monH, false);
    const petH = B.PET_HEIGHT_BY_FORM[pet.form - 1] || B.PET_HEIGHT_BY_FORM[0];
    this.petKeyBase = `${pet.speciesId}_f${pet.form}`;
    this.pet = this._makeFighter(B.PET_X, B.PET_Y, `${this.petKeyBase}_idle`, petH, CONFIG.PET.SPRITE_FACES_LEFT);
    this._startBlink();

    // ---------------- UI ----------------
    this._buildEnemyPanel();
    this._buildChainUi();
    this._buildPetPanel();
    this._buildMessage();
    this._buildMenu();
    this._buildItemMenu();

    this.fxParticles = {};

    this.input.keyboard.on('keydown', (e) => {
      if (this.busy || this.ended) return;
      if (this.itemMenu.visible) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= this.itemButtons.length) this.itemButtons[n - 1].press();
        if (e.key === 'Escape') this._hideItemMenu(true);
        return;
      }
      if (e.key === '1') this._onAttack();
      else if (e.key === '2') this._showItemMenu();
      else if (e.key === '3') this._onFlee();
    });

    this._intro();
  }

  // ============================================================
  // ตัวละคร (container ที่เท้า + ภาพ origin ล่างกลาง)
  // ============================================================
  _makeFighter(x, y, key, height, flip) {
    const B = CONFIG.BATTLE;
    const c = this.add.container(x, y);
    const sprite = this.add.image(0, 0, key).setOrigin(0.5, 1).setFlipX(flip);
    const scale = height / sprite.height;
    sprite.setScale(scale);
    const shadow = this.add.ellipse(0, 0, sprite.displayWidth * B.SHADOW_WIDTH_RATIO, B.SHADOW_HEIGHT, 0x000000, B.SHADOW_ALPHA);
    c.add([shadow, sprite]);
    const f = { c, sprite, shadow, baseScale: scale, homeX: x, homeY: y, height };
    // หายใจ (ยืดหด) + ลอยขึ้นลง
    f.breath = this.tweens.add({
      targets: sprite, scaleY: scale * B.BREATH_SCALE, scaleX: scale / B.BREATH_SCALE,
      duration: B.BREATH_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    f.float = this.tweens.add({
      targets: sprite, y: -B.FLOAT_PX, duration: B.FLOAT_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, B.FLOAT_MS),
    });
    f.shadowPulse = this.tweens.add({
      targets: shadow, scaleX: 0.85, duration: B.FLOAT_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    return f;
  }

  _startBlink() {
    const P = CONFIG.PET;
    const loop = () => {
      this.time.delayedCall(Phaser.Math.Between(P.BLINK_MIN_MS, P.BLINK_MAX_MS), () => {
        if (this.ended) return;
        if (this.pet.sprite.texture.key === `${this.petKeyBase}_idle`) {
          this.pet.sprite.setTexture(`${this.petKeyBase}_blink`);
          this.time.delayedCall(P.BLINK_DURATION_MS, () => {
            if (this.pet.sprite.texture.key === `${this.petKeyBase}_blink`) this.pet.sprite.setTexture(`${this.petKeyBase}_idle`);
          });
        }
        loop();
      });
    };
    loop();
  }

  // ============================================================
  // แผงข้อมูล + หลอด HP
  // ============================================================
  _style(size, color, bold, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color,
      fontStyle: bold ? 'bold' : 'normal', padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  _panelBg(p) {
    const g = this.add.graphics();
    g.fillStyle(0x1f1636, 0.82);
    g.fillRoundedRect(p.X, p.Y, p.W, p.H, 18);
    g.lineStyle(3, 0xffe08a, 0.9);
    g.strokeRoundedRect(p.X, p.Y, p.W, p.H, 18);
    return g;
  }

  _makeHpBar(x, y) {
    const B = CONFIG.BATTLE;
    const g = this.add.graphics();
    const txt = this.add.text(x + B.HP_BAR_WIDTH + 12, y + B.HP_BAR_HEIGHT / 2, '', this._style(18, '#ffffff', true)).setOrigin(0, 0.5);
    this.add.text(x - 8, y + B.HP_BAR_HEIGHT / 2, 'HP', this._style(18, '#ffe08a', true)).setOrigin(1, 0.5);
    return { g, txt, x, y, shown: null };
  }

  _drawHp(bar, hp, max, animate) {
    const B = CONFIG.BATTLE;
    const draw = (v) => {
      const r = Math.max(0, Math.min(1, v / max));
      const color = r <= B.HP_LOW_RATIO ? B.HP_LOW_COLOR : (r <= B.HP_MID_RATIO ? B.HP_MID_COLOR : B.HP_COLOR);
      bar.g.clear();
      bar.g.fillStyle(0x000000, 0.45);
      bar.g.fillRoundedRect(bar.x, bar.y, B.HP_BAR_WIDTH, B.HP_BAR_HEIGHT, B.HP_BAR_HEIGHT / 2);
      if (r > 0) {
        bar.g.fillStyle(color, 1);
        bar.g.fillRoundedRect(bar.x, bar.y, Math.max(B.HP_BAR_HEIGHT, B.HP_BAR_WIDTH * r), B.HP_BAR_HEIGHT, B.HP_BAR_HEIGHT / 2);
      }
      bar.txt.setText(`${Math.round(v)}/${max}`);
    };
    if (!animate || bar.shown == null) {
      bar.shown = hp;
      draw(hp);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const obj = { v: bar.shown };
      bar.shown = hp;
      this.tweens.add({
        targets: obj, v: hp, duration: B.HP_TWEEN_MS, ease: 'Cubic.easeOut',
        onUpdate: () => draw(obj.v), onComplete: () => { draw(hp); resolve(); },
      });
    });
  }

  _buildEnemyPanel() {
    const p = CONFIG.BATTLE.ENEMY_PANEL;
    const m = this.state.monster;
    this._panelBg(p);
    this.add.text(p.X + 22, p.Y + 14, TextUtil.formatChem(m.name), this._style(26, '#ffffff', true));
    if (m.isBoss) this.add.text(p.X + p.W - 22, p.Y + 16, 'บอส', this._style(20, '#ff9a9a', true)).setOrigin(1, 0);
    this.enemyHp = this._makeHpBar(p.X + 60, p.Y + 62);
    this._drawHp(this.enemyHp, this.state.monsterHp, m.hp, false);
  }

  _buildPetPanel() {
    const p = CONFIG.BATTLE.PET_PANEL;
    const pet = PetSystem.current;
    this._panelBg(p);
    this.add.text(p.X + 22, p.Y + 12, PetSystem.getDisplayName(), this._style(26, '#ffffff', true));
    this.add.text(p.X + p.W - 22, p.Y + 14, `Lv.${pet.level}`, this._style(22, '#ffe08a', true)).setOrigin(1, 0);
    this.petHp = this._makeHpBar(p.X + 60, p.Y + 58);
    this._drawHp(this.petHp, pet.hp, pet.maxHp, false);
    this.buffText = this.add.text(p.X + 22, p.Y + CONFIG.BATTLE.BUFF_Y - 10, '', this._style(17, '#8fffc0', true));
    this._refreshBuffs();
  }

  _refreshBuffs() {
    const s = this.state;
    const parts = [];
    if (s.combo > 0) parts.push(`ตอบถูกติดกัน ${s.combo}`);
    if (s.nadPending) parts.push('NAD⁺ พร้อม');
    if (s.atpPending) parts.push(`ATP x${CONFIG.BATTLE.ATP_MULTIPLIER}`);
    this.buffText.setText(parts.join('  •  '));
  }

  // ============================================================
  // ข้อความ
  // ============================================================
  _buildMessage() {
    const B = CONFIG.BATTLE;
    this.msgBg = this.add.graphics();
    this.msgText = this.add.text(B.MESSAGE_X, B.MESSAGE_Y, '', this._style(24, '#ffffff', true, {
      stroke: '#1f1636', strokeThickness: 6, align: 'center',
    })).setOrigin(0.5).setDepth(50);
  }

  _say(text) {
    const B = CONFIG.BATTLE;
    const lines = TextUtil.wrapThai(TextUtil.formatChem(text), TextUtil.fontString(24, true), B.MESSAGE_WIDTH);
    this.msgText.setText(lines.join('\n'));
    this.msgText.setAlpha(0);
    this.tweens.add({ targets: this.msgText, alpha: 1, duration: 150 });
  }

  _wait(ms) {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  // ============================================================
  // เมนูหลัก
  // ============================================================
  _makeButton(x, y, w, h, key, label, onPress) {
    const Q = CONFIG.QUIZ_PANEL;
    const scale = h / Q.CHOICE_NATIVE_HEIGHT;
    const c = this.add.container(x, y);
    const bg = this.add.nineslice(0, 0, key, null, w / scale, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale);
    const txt = this.add.text(0, 0, label, this._style(22, '#2a1f14', true)).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.enabled = true;
    c.txt = txt;
    c.press = () => {
      if (!c.enabled || (this.busy && !c.ignoreBusy)) return;
      SoundFx.play(this, 'click');
      this.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
      onPress();
    };
    c.on('pointerup', () => c.press());
    c.on('pointerover', () => { if (c.enabled) c.setScale(1.04); });
    c.on('pointerout', () => c.setScale(1));
    c.setEnabled = (on) => { c.enabled = on; c.setAlpha(on ? 1 : 0.45); };
    return c;
  }

  _buildMenu() {
    const B = Object.assign({}, CONFIG.BATTLE);
    if (Device.isTouch()) B.MENU_BUTTON_HEIGHT = CONFIG.TOUCH_UI.MENU_BUTTON_HEIGHT; // (เฟส 8) ปุ่มใหญ่ขึ้นสำหรับนิ้ว
    const cx = CONFIG.GAME.WIDTH / 2;
    const step = B.MENU_BUTTON_WIDTH + B.MENU_GAP;
    const fleeLabel = BattleSystem.canFlee(this.state)
      ? `3  หนี (${Math.round(B.FLEE_CHANCE * 100)}%)` : '3  หนีไม่ได้';
    this.menuButtons = [
      this._makeButton(cx - step, B.MENU_Y, B.MENU_BUTTON_WIDTH, B.MENU_BUTTON_HEIGHT, 'ui_btn_green', '1  ตอบคำถามโจมตี', () => this._onAttack()),
      this._makeButton(cx, B.MENU_Y, B.MENU_BUTTON_WIDTH, B.MENU_BUTTON_HEIGHT, 'ui_btn_cream', '2  ใช้ไอเท็ม', () => this._showItemMenu()),
      this._makeButton(cx + step, B.MENU_Y, B.MENU_BUTTON_WIDTH, B.MENU_BUTTON_HEIGHT, 'ui_btn_red', fleeLabel, () => this._onFlee()),
    ];
    this.menuButtons[2].setEnabled(BattleSystem.canFlee(this.state));
    this._setMenuVisible(false);
  }

  _setMenuVisible(on) {
    this.menuButtons.forEach((b) => b.setVisible(on));
  }

  _showMenu() {
    if (this.ended) return;
    this.busy = false;
    this._refreshBuffs();
    this._say(`จะทำอย่างไรต่อดี? (${PetSystem.getDisplayName()} พร้อมแล้ว)`);
    this._setMenuVisible(true);
    this.menuButtons.forEach((b) => {
      b.setAlpha(0);
      this.tweens.add({ targets: b, alpha: b.enabled ? 1 : 0.45, duration: 180 });
    });
  }

  _lockMenu() {
    this.busy = true;
    this._setMenuVisible(false);
  }

  // ============================================================
  // เมนูไอเท็ม
  // ============================================================
  _buildItemMenu() {
    const B = CONFIG.BATTLE;
    const cx = CONFIG.GAME.WIDTH / 2;
    this.itemMenu = this.add.container(0, 0).setDepth(60).setVisible(false);
    const dim = this.add.rectangle(cx, CONFIG.GAME.HEIGHT / 2, CONFIG.GAME.WIDTH, CONFIG.GAME.HEIGHT, 0x0e0a1f, 0.5).setInteractive();
    this.itemMenu.add(dim);
    const defs = [
      { id: 'item_potion', label: () => `ยาฟื้นพลัง  (ฟื้น HP ${Math.round(B.POTION_HEAL_RATIO * 100)}%)` },
      { id: 'item_nad', label: () => `NAD⁺  (ตัดตัวเลือกผิด ${B.NAD_ELIMINATE} ข้อ)` },
      { id: 'item_oxygen', label: () => 'ออกซิเจน O₂  (ข้ามคำถาม โจมตีปกติ)' },
      { id: 'item_atp', label: () => `ATP  (ดาเมจครั้งถัดไป x${B.ATP_MULTIPLIER})` },
    ];
    const totalH = (defs.length + 1) * (B.ITEM_BUTTON_HEIGHT + B.ITEM_BUTTON_GAP);
    let y = B.ITEM_MENU_Y - totalH / 2;
    this.itemButtons = defs.map((d, i) => {
      const btn = this._makeButton(cx, y, B.ITEM_BUTTON_WIDTH, B.ITEM_BUTTON_HEIGHT, 'ui_btn_cream', '', () => this._useItem(d.id));
      btn.txt.setFontSize(20);
      const icon = this.add.image(-B.ITEM_BUTTON_WIDTH / 2 + 44, 0, d.id);
      icon.setScale((B.ITEM_BUTTON_HEIGHT * 0.62) / Math.max(icon.width, icon.height));
      btn.add(icon);
      btn.def = d;
      btn.num = i + 1;
      y += B.ITEM_BUTTON_HEIGHT + B.ITEM_BUTTON_GAP;
      this.itemMenu.add(btn);
      return btn;
    });
    const back = this._makeButton(cx, y, B.ITEM_BUTTON_WIDTH * 0.6, B.ITEM_BUTTON_HEIGHT, 'ui_btn_red', 'ย้อนกลับ (Esc)', () => this._hideItemMenu(true));
    this.itemMenu.add(back);
  }

  _itemUsable(id) {
    const s = this.state;
    const pet = PetSystem.current;
    if (InventorySystem.count(id) <= 0) return false;
    if (id === 'item_potion') return pet.hp < pet.maxHp;
    if (id === 'item_nad') return !s.nadPending;
    if (id === 'item_atp') return !s.atpPending;
    return true;
  }

  _showItemMenu() {
    if (this.busy || this.ended) return;
    this._setMenuVisible(false);
    this.itemButtons.forEach((b) => {
      b.txt.setText(`${b.num}  ${TextUtil.formatChem(b.def.label())}   มี ${InventorySystem.count(b.def.id)}`);
      b.setEnabled(this._itemUsable(b.def.id));
    });
    this.itemMenu.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.itemMenu, alpha: 1, duration: 150 });
    this._say('เลือกไอเท็มที่จะใช้');
  }

  _hideItemMenu(backToMenu) {
    this.itemMenu.setVisible(false);
    if (backToMenu) this._showMenu();
  }

  async _useItem(id) {
    if (this.busy || this.ended || !this._itemUsable(id) || !InventorySystem.consume(id, 1)) return;
    const B = CONFIG.BATTLE;
    this._hideItemMenu(false);
    this._lockMenu();
    BattleSystem.noteItem(this.state, id);
    const name = TextUtil.formatChem(getItemData(id).name);

    if (id === 'item_oxygen') {
      if (this._chainLocked() && CONFIG.BOSS.OXYGEN_COMPLETES_CHAIN) {
        this.state.chain = 0;
        this._refreshChainUi();
        this._say(`ใช้ ${name}! O₂ รับอิเล็กตรอนตัวสุดท้าย ห่วงโซ่ครบทันที!`);
      } else {
        this._say(`ใช้ ${name}! ข้ามคำถามแล้วโจมตีเลย`);
      }
      await this._wait(B.MESSAGE_HOLD_MS * 0.6);
      await this._petAttack(false);
      await this._checkBossPhase();
      this._afterTurn();
      return;
    }

    if (id === 'item_potion') {
      const pet = PetSystem.current;
      const heal = Math.ceil(pet.maxHp * B.POTION_HEAL_RATIO);
      const before = pet.hp;
      PetSystem.changeHp(heal);
      const got = pet.hp - before;
      SoundFx.play(this, 'correct');
      const ring = this.add.image(this.pet.c.x, this.pet.c.y - 10, 'fx_heal_ring').setScale(0.5).setDepth(40);
      this.tweens.add({ targets: ring, scale: 0.9, alpha: 0, duration: 800, onComplete: () => ring.destroy() });
      this._popNumber(this.pet.c.x, this.pet.c.y - this.pet.height, `+${got}`, '#7dffa8');
      this._say(`ใช้ ${name}! ${PetSystem.getDisplayName()} ฟื้น HP +${got}`);
      await this._drawHp(this.petHp, pet.hp, pet.maxHp, true);
    } else if (id === 'item_nad') {
      this.state.nadPending = true;
      SoundFx.play(this, 'pickup');
      this._sparkleAt(this.pet.c.x, this.pet.c.y - this.pet.height / 2, 0x9fd8ff);
      this._say(`ใช้ ${name}! คำถามถัดไปจะตัดตัวเลือกผิดออก ${B.NAD_ELIMINATE} ข้อ`);
    } else if (id === 'item_atp') {
      this.state.atpPending = true;
      SoundFx.play(this, 'pickup');
      this._sparkleAt(this.pet.c.x, this.pet.c.y - this.pet.height / 2, 0xffd23f);
      this._say(`ใช้ ${name}! การโจมตีครั้งถัดไปแรงขึ้น x${B.ATP_MULTIPLIER}`);
    }
    this._refreshBuffs();
    await this._wait(B.MESSAGE_HOLD_MS);
    if (B.ITEM_USE_ENDS_TURN) {
      await this._monsterAttack();
      this._afterTurn();
    } else {
      this._showMenu();
    }
  }

  // ============================================================
  // การกระทำหลัก
  // ============================================================
  _onAttack() {
    if (this.busy || this.ended) return;
    this._lockMenu();
    const s = this.state;
    const eliminate = s.nadPending ? CONFIG.BATTLE.NAD_ELIMINATE : 0;
    s.nadPending = false;
    this._refreshBuffs();
    this._say('ตอบคำถามให้ถูกเพื่อโจมตี!');
    QuizPanel.open(this, {
      zone: s.monster.isBoss ? 'boss' : s.zone,
      context: 'battle',
      title: `ตอบให้ถูกเพื่อโจมตี "${s.monster.name}"`,
      eliminate,
      extra: { monsterId: s.monster.id },
    }).then(async (res) => {
      s.turns += 1;
      if (res && res.correct) {
        s.correct += 1;
        if (this._chainLocked()) {
          s.chain += 1;
          if (s.chain < CONFIG.BOSS.CHAIN_REQUIRED) {
            s.combo += 1; // ตอบถูกยังนับคอมโบ แม้ยังไม่ทำดาเมจ
            s.maxCombo = Math.max(s.maxCombo, s.combo);
            this._refreshBuffs();
            await this._chainLink();
            this._afterTurn();
            return;
          }
          s.chain = 0;
          this._refreshChainUi();
          this._say('ส่งอิเล็กตรอนครบห่วงโซ่! โจมตีได้แล้ว');
          await this._wait(CONFIG.BATTLE.MESSAGE_HOLD_MS * 0.6);
        }
        await this._petAttack(true);
        await this._checkBossPhase();
      } else {
        s.wrong += 1;
        BattleSystem.breakCombo(s);
        if (this._chainLocked() && s.chain > 0) {
          s.chain = 0;
          this._refreshChainUi();
        }
        this._refreshBuffs();
        this._say(res && res.timedOut ? 'หมดเวลา! มอนสเตอร์ได้โอกาสโจมตี' : 'ตอบผิด! มอนสเตอร์โจมตีกลับ');
        await this._wait(CONFIG.BATTLE.MESSAGE_HOLD_MS * 0.6);
        await this._monsterAttack();
      }
      this._afterTurn();
    });
  }

  async _onFlee() {
    if (this.busy || this.ended) return;
    const B = CONFIG.BATTLE;
    if (!BattleSystem.canFlee(this.state)) {
      this._say('หนีจากบอสไม่ได้! ต้องสู้ให้ถึงที่สุด');
      return;
    }
    this._lockMenu();
    this._say('พยายามหนี...');
    this.tweens.add({ targets: this.pet.c, x: this.pet.homeX - 40, duration: 200, yoyo: true });
    await this._wait(B.MESSAGE_HOLD_MS * 0.7);
    if (BattleSystem.rollFlee()) {
      this._say('หนีสำเร็จ!');
      BattleSystem.record(this.state, 'flee', 0);
      this.tweens.add({ targets: this.pet.c, x: -200, duration: 500, ease: 'Cubic.easeIn' });
      await this._wait(B.MESSAGE_HOLD_MS);
      this._returnToMap('flee');
    } else {
      this._say('หนีไม่พ้น! มอนสเตอร์ขวางไว้');
      await this._wait(B.MESSAGE_HOLD_MS * 0.7);
      await this._monsterAttack();
      this._afterTurn();
    }
  }

  // ============================================================
  // เฟส 6: บอส 2 ช่วง "ล็อกห่วงโซ่อิเล็กตรอน"
  // ============================================================
  _chainLocked() {
    return this.state.monster.isBoss && this.state.phase === 2 && this.state.monsterHp > 0;
  }

  _buildChainUi() {
    const p = CONFIG.BATTLE.ENEMY_PANEL;
    this.chainText = this.add.text(p.X + 12, CONFIG.BOSS.CHAIN_Y, '', this._style(20, '#ffd6ff', true, {
      stroke: '#3a1060', strokeThickness: 6,
    })).setVisible(false);
  }

  _refreshChainUi() {
    if (!this.chainText) return;
    const on = this._chainLocked();
    this.chainText.setVisible(on);
    if (!on) return;
    const need = CONFIG.BOSS.CHAIN_REQUIRED;
    const dots = Array.from({ length: need }, (_, i) => (i < this.state.chain ? '●' : '○')).join(' ');
    this.chainText.setText(`ห่วงโซ่ถูกล็อก! ตอบถูกติดกัน ${need} ข้อ  ${dots}`);
  }

  /** ตอบถูกระหว่างห่วงโซ่ถูกล็อก แต่ยังไม่ครบ -> ยังไม่ทำดาเมจ */
  async _chainLink() {
    const s = this.state;
    this._refreshChainUi();
    SoundFx.play(this, 'pickup');
    this._sparkleAt(this.pet.c.x + 140, this.pet.c.y - this.pet.height / 2, 0xffe08a);
    this.tweens.add({ targets: this.chainText, scale: 1.15, duration: 140, yoyo: true });
    this._say(`ส่งอิเล็กตรอนต่อได้ ${s.chain}/${CONFIG.BOSS.CHAIN_REQUIRED}! ตอบถูกอีก ${CONFIG.BOSS.CHAIN_REQUIRED - s.chain} ข้อเพื่อทำดาเมจ`);
    await this._wait(CONFIG.BATTLE.MESSAGE_HOLD_MS * 1.2);
  }

  /** เช็กว่าบอสเข้าช่วงที่ 2 หรือยัง (HP ต่ำกว่าเกณฑ์) */
  async _checkBossPhase() {
    const s = this.state;
    if (!s.monster.isBoss || s.phase !== 1 || s.monsterHp <= 0) return;
    if (s.monsterHp > s.monster.hp * CONFIG.BOSS.PHASE2_HP_RATIO) return;
    s.phase = 2;
    s.chain = 0;
    s.reachedPhase2 = true;
    this.cameras.main.shake(CONFIG.BATTLE.CAMERA_SHAKE_MS * 2, CONFIG.BATTLE.CAMERA_SHAKE_INTENSITY * 1.5);
    this.monster.sprite.setTint(0xc070ff);
    this._say(`${s.monster.name} ล็อกห่วงโซ่อิเล็กตรอน!`);
    await this._wait(CONFIG.BATTLE.MESSAGE_HOLD_MS);
    await new Promise((resolve) => {
      this._infoPanel('บอสล็อกห่วงโซ่อิเล็กตรอน!', '#8a2be2', [
        'ราชาตัวยับยั้งขัดขวางการส่งอิเล็กตรอน เหมือนสารยับยั้งที่ทำให้ห่วงโซ่หยุดทำงาน',
        `ตั้งแต่นี้ต้องตอบถูกติดกัน ${CONFIG.BOSS.CHAIN_REQUIRED} ข้อ (ส่งอิเล็กตรอนครบห่วงโซ่) จึงจะทำดาเมจได้`,
        'ถ้าตอบผิด ห่วงโซ่จะขาดและต้องเริ่มนับใหม่ และบอสจะโจมตีกลับ',
        CONFIG.BOSS.OXYGEN_COMPLETES_CHAIN ? 'เคล็ดลับ: ใช้ออกซิเจน (O₂) ปิดห่วงโซ่แล้วโจมตีได้ทันที' : '',
      ].filter(Boolean), 'เข้าใจแล้ว!', resolve);
    });
    this._refreshChainUi();
  }

  /** แผงอธิบาย (ไม่จบการต่อสู้) */
  _infoPanel(title, color, lines, buttonLabel, onClose) {
    const B = CONFIG.BOSS;
    const S = CONFIG.QUIZ_PANEL.PANEL_SLICE;
    const art = CONFIG.QUIZ_PANEL.PANEL_ART_SCALE;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const dim = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, 0.6).setDepth(100).setInteractive();
    const c = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(101);
    const top = -B.PHASE_PANEL_HEIGHT / 2;
    const panel = this.add.nineslice(0, 0, 'ui_panel', null, B.PHASE_PANEL_WIDTH / art, B.PHASE_PANEL_HEIGHT / art, S.LEFT, S.RIGHT, S.TOP, S.BOTTOM).setScale(art);
    const badge = this.add.image(0, top, 'ui_panel_badge').setOrigin(0.5, 0).setScale(art);
    const t = this.add.text(0, top + 128, title, this._style(32, color, true)).setOrigin(0.5);
    const out = [];
    lines.forEach((l) => {
      TextUtil.wrapThai(TextUtil.formatChem(l), TextUtil.fontString(20, false), B.PHASE_PANEL_WIDTH - 150)
        .forEach((w, i) => out.push((i === 0 ? '•  ' : '    ') + w));
    });
    const body = this.add.text(-B.PHASE_PANEL_WIDTH / 2 + 70, top + 160, out.join('\n'), this._style(20, '#3a2a1f', false, { lineSpacing: 4 }));
    c.add([panel, badge, t, body]);
    const btn = this._makeButton(0, B.PHASE_PANEL_HEIGHT / 2 - 62, 260, 66, 'ui_btn_green', buttonLabel, () => {
      btn.disableInteractive();
      this.tweens.add({ targets: [c, dim], alpha: 0, duration: 200, onComplete: () => { c.destroy(); dim.destroy(); onClose(); } });
    });
    btn.ignoreBusy = true; // ระหว่างนี้เมนูถูกล็อก (busy) แต่ปุ่มนี้ต้องกดได้
    c.add(btn);
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  _afterTurn() {
    if (this.ended) return;
    if (this.state.monsterHp <= 0) this._victory();
    else if (PetSystem.current.hp <= 0) this._defeat();
    else this._showMenu();
  }

  // ============================================================
  // แอนิเมชันโจมตี
  // ============================================================
  _dash(f, target, texture) {
    const B = CONFIG.BATTLE;
    return new Promise((resolve) => {
      if (texture) f.sprite.setTexture(texture);
      const tx = f.homeX + (target.homeX - f.homeX) * B.DASH_RATIO;
      const ty = f.homeY + (target.homeY - f.homeY) * B.DASH_RATIO;
      this.tweens.add({
        targets: f.c, x: tx, y: ty, duration: B.DASH_MS, ease: 'Quad.easeIn',
        onComplete: () => {
          resolve();
          this.tweens.add({ targets: f.c, x: f.homeX, y: f.homeY, duration: B.RETURN_MS, ease: 'Quad.easeOut' });
        },
      });
    });
  }

  _hitShake(f, hurtKey, idleKey) {
    const B = CONFIG.BATTLE;
    f.sprite.setTexture(hurtKey);
    f.sprite.setTintFill(0xffffff);
    this.time.delayedCall(80, () => f.sprite.clearTint());
    this.tweens.add({
      targets: f.sprite, x: B.HIT_SHAKE_PX, duration: B.HIT_SHAKE_MS, yoyo: true, repeat: B.HIT_SHAKE_REPEAT,
      onComplete: () => { f.sprite.x = 0; },
    });
    this.time.delayedCall(B.HURT_SHOW_MS, () => { if (!this.ended || f === this.pet) f.sprite.setTexture(idleKey); });
  }

  _popNumber(x, y, text, color, big) {
    const B = CONFIG.BATTLE;
    const t = this.add.text(x, y, text, this._style(big ? B.COMBO_FONT_SIZE : B.DAMAGE_FONT_SIZE, color, true, {
      stroke: '#1f1636', strokeThickness: 8,
    })).setOrigin(0.5).setDepth(80).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, y: y - B.DAMAGE_RISE, alpha: 0, delay: 250, duration: B.DAMAGE_MS, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _sparkleAt(x, y, tint) {
    const e = this.add.particles(x, y, 'fx_sparkle', {
      speed: { min: 80, max: 260 }, angle: { min: 0, max: 360 }, scale: { start: 0.25, end: 0 },
      lifespan: 700, tint, emitting: false,
    }).setDepth(70);
    e.explode(CONFIG.BATTLE.FX_PARTICLES);
    this.time.delayedCall(900, () => e.destroy());
  }

  _elementFx(x, y) {
    const B = CONFIG.BATTLE;
    const def = B.ELEMENT_FX[PetSystem.current.speciesId] || B.ELEMENT_FX.p1;
    const img = this.add.image(x, y, def.TEXTURE).setTint(def.TINT).setDepth(70).setScale(0.2);
    this.tweens.add({
      targets: img, scale: B.FX_SCALE, alpha: 0, angle: 90, duration: B.FX_MS, ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
    const e = this.add.particles(x, y, def.PARTICLE, {
      speed: { min: 120, max: 340 }, angle: { min: 0, max: 360 },
      scale: { start: def.PARTICLE === 'fx_sparkle' ? 0.25 : 0.22, end: 0 },
      lifespan: 650, tint: def.PARTICLE_TINT, emitting: false,
    }).setDepth(71);
    e.explode(B.FX_PARTICLES);
    this.time.delayedCall(900, () => e.destroy());
  }

  /** สัตว์เลี้ยงโจมตี (fromCorrect = มาจากการตอบถูก นับคอมโบ) */
  async _petAttack(fromCorrect) {
    const B = CONFIG.BATTLE;
    const s = this.state;
    const r = BattleSystem.petAttack(s, fromCorrect);
    this._refreshBuffs();
    SoundFx.play(this, 'attack');
    await this._dash(this.pet, this.monster, `${this.petKeyBase}_attack`);
    const hitX = this.monster.c.x;
    const hitY = this.monster.c.y - this.monster.height / 2;
    this._elementFx(hitX, hitY);
    this._hitShake(this.monster, s.monster.hurtKey, s.monster.idleKey);
    this._popNumber(hitX, hitY - 40, `-${r.damage}`, r.usedAtp ? '#ffd23f' : '#ffffff');
    if (r.isCombo) this._popNumber(hitX - 20, hitY - 120, `คอมโบ! x${s.combo}`, '#ff9af0', true);
    else if (r.usedAtp) this._popNumber(hitX - 20, hitY - 120, `ATP x${B.ATP_MULTIPLIER}!`, '#ffd23f', true);
    this.time.delayedCall(B.RETURN_MS, () => this.pet.sprite.setTexture(`${this.petKeyBase}_idle`));
    let msg = `${PetSystem.getDisplayName()} โจมตี! ${s.monster.name} เสีย HP ${r.damage}`;
    if (r.isCombo) msg = `คอมโบ! ${msg}`;
    this._say(msg);
    await this._drawHp(this.enemyHp, s.monsterHp, s.monster.hp, true);
    await this._wait(B.MESSAGE_HOLD_MS);
  }

  async _monsterAttack() {
    const B = CONFIG.BATTLE;
    const s = this.state;
    const r = BattleSystem.monsterAttack(s);
    await this._dash(this.monster, this.pet, null);
    SoundFx.play(this, 'hit'); // เสียงโดนตีตอนมอนสเตอร์พุ่งถึงตัว
    const hitX = this.pet.c.x;
    const hitY = this.pet.c.y - this.pet.height / 2;
    const burst = this.add.image(hitX, hitY, 'fx_burst').setTint(B.MONSTER_FX_TINT).setDepth(70).setScale(0.2);
    this.tweens.add({ targets: burst, scale: B.FX_SCALE, alpha: 0, duration: B.FX_MS, onComplete: () => burst.destroy() });
    this._hitShake(this.pet, `${this.petKeyBase}_hurt`, `${this.petKeyBase}_idle`);
    this.cameras.main.shake(B.CAMERA_SHAKE_MS, B.CAMERA_SHAKE_INTENSITY);
    this._popNumber(hitX, hitY - 40, `-${r.damage}`, '#ff6b6b');
    this._say(`${s.monster.name} โจมตี! ${PetSystem.getDisplayName()} เสีย HP ${r.damage}`);
    const pet = PetSystem.current;
    await this._drawHp(this.petHp, pet.hp, pet.maxHp, true);
    await this._wait(B.MESSAGE_HOLD_MS);
  }

  // ============================================================
  // เปิดฉาก / ชนะ / แพ้ / กลับแผนที่
  // ============================================================
  async _intro() {
    const B = CONFIG.BATTLE;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    this.cameras.main.fadeIn(B.INTRO_MS);
    const vortex = this.add.image(WIDTH / 2, HEIGHT / 2, 'fx_vortex').setScale(B.VORTEX_SCALE).setDepth(90).setAlpha(0.9);
    this.tweens.add({
      targets: vortex, scale: 0, angle: 540, alpha: 0, duration: B.INTRO_MS * 1.4, ease: 'Cubic.easeIn',
      onComplete: () => vortex.destroy(),
    });
    this.monster.c.x = WIDTH + 300;
    this.pet.c.x = -300;
    this.tweens.add({ targets: this.monster.c, x: this.monster.homeX, duration: B.INTRO_MS, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.pet.c, x: this.pet.homeX, duration: B.INTRO_MS, ease: 'Back.easeOut' });
    const m = this.state.monster;
    this._say(m.isBoss ? `${m.name} ปรากฏตัวแล้ว!` : `${m.name} โผล่ออกมา!`);
    await this._wait(B.INTRO_MS + B.MESSAGE_HOLD_MS);
    this._showMenu();
  }

  _resultPanel(title, titleColor, lines, buttonLabel, buttonKey, onPress, imageKey) {
    const B = CONFIG.BATTLE;
    const S = CONFIG.QUIZ_PANEL.PANEL_SLICE;
    const art = CONFIG.QUIZ_PANEL.PANEL_ART_SCALE;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const dim = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, 0.55).setDepth(100).setInteractive();
    const c = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(101);
    const panel = this.add.nineslice(0, 0, 'ui_panel', null, B.RESULT_PANEL_WIDTH / art, B.RESULT_PANEL_HEIGHT / art,
      S.LEFT, S.RIGHT, S.TOP, S.BOTTOM).setScale(art);
    const top = -B.RESULT_PANEL_HEIGHT / 2;
    const badge = this.add.image(0, top, 'ui_panel_badge').setOrigin(0.5, 0).setScale(art);
    const t = this.add.text(0, top + 130, title, this._style(40, titleColor, true)).setOrigin(0.5);
    const body = this.add.text(0, top + 168, '', this._style(22, '#3a2a1f', false, { align: 'center' })).setOrigin(0.5, 0);
    const wrapped = [];
    lines.forEach((l) => wrapped.push(...TextUtil.wrapThai(TextUtil.formatChem(l), TextUtil.fontString(22, false), B.RESULT_PANEL_WIDTH - 140)));
    body.setText(wrapped.join('\n')).setLineSpacing(4);
    c.add([panel, badge, t, body]);
    if (imageKey) {
      const im = this.add.image(0, B.RESULT_PANEL_HEIGHT / 2 - 160, imageKey);
      im.setScale(90 / im.height);
      c.add(im);
      this.tweens.add({ targets: im, scale: im.scale * 1.1, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const btn = this._makeButton(0, B.RESULT_PANEL_HEIGHT / 2 - 70, 300, 72, buttonKey, buttonLabel, () => {
      btn.disableInteractive();
      onPress();
    });
    c.add(btn);
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
    this.input.keyboard.once('keydown-ENTER', () => btn.press());
    dim.setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 280 });
  }

  async _victory() {
    const B = CONFIG.BATTLE;
    this.ended = true;
    this.busy = false;
    const s = this.state;
    const m = s.monster;
    SoundFx.play(this, 'pickup');
    [this.monster.breath, this.monster.float].forEach((tw) => tw.stop());
    this._sparkleAt(this.monster.c.x, this.monster.c.y - this.monster.height / 2, 0xfff1a8);
    const e = this.add.particles(this.monster.c.x, this.monster.c.y - this.monster.height / 2, 'fx_sparkle', {
      speed: { min: 40, max: 200 }, angle: { min: 200, max: 340 }, scale: { start: 0.3, end: 0 },
      lifespan: 1000, emitting: false,
    }).setDepth(72);
    e.explode(B.VICTORY_SPARKLES);
    this.tweens.add({
      targets: this.monster.c, alpha: 0, scaleX: 1.25, scaleY: 1.25, y: this.monster.homeY - 40,
      duration: B.VICTORY_FADE_MS, ease: 'Sine.easeIn',
    });
    this._say(`ชนะ ${m.name} แล้ว!`);
    this.tweens.add({ targets: this.pet.c, y: this.pet.homeY - 30, duration: 180, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    await this._wait(B.VICTORY_FADE_MS);

    const r = PetSystem.addExp(m.exp);
    BattleSystem.record(s, 'win', m.exp);
    // เลเวลอัป/พัฒนาร่าง/เลเวลเต็ม เล่นก่อนแสดงสรุปผล (เฟส 5)
    await ProgressionFx.play(this, r);
    const lines = [`ได้รับ EXP +${m.exp}`];
    if (r.levelsGained > 0) lines.push(`${PetSystem.getDisplayName()} เลเวลอัปเป็น Lv.${PetSystem.current.level}!`);
    if (r.evolved) lines.push(`พัฒนาร่างเป็น "${PetSystem.getFormData().name}"!`);
    lines.push(`ตอบถูก ${s.correct} / ${s.correct + s.wrong} ข้อ   คอมโบสูงสุด ${s.maxCombo}`);
    let badgeKey = null;
    if (m.isBoss) {
      SaveSystem.saveGame({ bossDefeated: true });
      const fresh = BadgeSystem.checkAll(); // (เฟส 7) เหรียญ "ผู้พิชิตตัวยับยั้ง"
      const bossBadge = fresh.find((b) => b.id === 'boss');
      if (bossBadge) {
        lines.unshift(`ได้รับเหรียญตราพิเศษ "${bossBadge.name}"!`);
        badgeKey = bossBadge.iconKey;
      }
      LeaderboardSystem.submit('boss'); // จบเกม -> ส่งคะแนน (ส่งไม่สำเร็จก็เล่นต่อได้)
    }
    this._resultPanel(m.isBoss ? 'ปราบบอสสำเร็จ!' : 'ชนะแล้ว!', '#2e8b57', lines, 'กลับแผนที่', 'ui_btn_green',
      () => this._returnToMap('win'), badgeKey);
  }

  async _defeat() {
    const B = CONFIG.BATTLE;
    this.ended = true;
    this.busy = false;
    const s = this.state;
    [this.pet.breath, this.pet.float].forEach((tw) => tw.stop());
    this.pet.sprite.setTexture(`${this.petKeyBase}_hurt`);
    this.tweens.add({ targets: this.pet.c, angle: -12, alpha: 0.5, duration: 600 });
    this._say(`${PetSystem.getDisplayName()} หมดแรงแล้ว...`);
    BattleSystem.record(s, 'lose', 0);
    await this._wait(B.MESSAGE_HOLD_MS);
    const cheer = BATTLE_CHEERS[Math.floor(Math.random() * BATTLE_CHEERS.length)];
    this._resultPanel('ไม่เป็นไรนะ!', '#d9434f',
      [cheer, 'กลับไปพักที่ฟาร์ม HP จะเต็มเหมือนเดิม และไม่เสีย EXP'],
      'กลับฟาร์ม', 'ui_btn_cream', () => this._returnToFarm());
  }

  _returnToMap(result) {
    const B = CONFIG.BATTLE;
    this.ended = true;
    this.cameras.main.fadeOut(B.END_FADE_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.wake('UIScene');
      this.scene.wake('WorldScene', { result, wandererIndex: this.data0.wandererIndex });
      this.scene.stop();
    });
  }

  _returnToFarm() {
    const B = CONFIG.BATTLE;
    this.cameras.main.fadeOut(B.END_FADE_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      PetSystem.healFull();
      WorldScene.setSafe(CONFIG.MONSTER.SAFE_AFTER_BATTLE_SEC, false);
      this.scene.wake('UIScene');
      this.scene.stop('WorldScene');
      this.scene.start('WorldScene', { mapKey: 'farm' });
    });
  }
}
