/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/UIScene.js
   ------------------------------------------------------------
   ฉาก UI ที่ซ้อนอยู่ด้านบนฉากอื่น ๆ (เช่น WorldScene) มีหน้าที่:
   - แสดงชื่อผู้เล่นมุมซ้ายบน
   - แสดงกล่องข้อความแจ้งเตือนแบบเลื่อนเข้า-ออก (toast)
   - แสดงกรอบข้อมูลสัตว์เลี้ยง (รูปหน้า ชื่อ Lv หลอด HP หลอด EXP)
     อัปเดตอัตโนมัติเมื่อได้รับอีเวนต์ 'pet-changed' จาก PetSystem

   - (เฟส 3) ปุ่มกระเป๋ามุมขวาบน + ปุ่มลัด I เปิด InventoryScene
     ปุ่มเด้งเมื่อได้ไอเท็มใหม่ (อีเวนต์ 'inventory-changed')

   วิธีเรียกแจ้งเตือนจากฉากอื่น:
     this.game.events.emit('notify', 'ข้อความที่ต้องการแจ้ง');
   ========================================================== */

class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.notifyQueue = [];
    this.isShowingNotify = false;

    this._buildPlayerNameBadge();
    this._buildNotifyBox();
    this._buildPetPanel();
    this._buildBagButton();
    this._buildHudButtons();
    this._buildMuteButton();
    this._buildJoystick();
    this._buildMinimap();
    this._buildAutosaveBadge();

    this._onNotify = (message) => this._enqueueNotify(message);
    this.game.events.on('notify', this._onNotify);

    this._onPetChanged = (pet) => this._refreshPetPanel(pet, true);
    this.game.events.on('pet-changed', this._onPetChanged);

    this._onInventoryChanged = (all, detail) => {
      if (detail && detail.added) this._bumpBag();
    };
    this.game.events.on('inventory-changed', this._onInventoryChanged);

    this._onMapEntered = (key) => this._refreshMinimap(key);
    this._onPetForMap = () => this._refreshMinimap(this.game.registry.get('currentMapKey'));
    this._onAutosaved = (reason, ok) => this._flashAutosave(ok);
    this.game.events.on('map-entered', this._onMapEntered);
    this.game.events.on('pet-changed', this._onPetForMap);
    this.game.events.on('autosaved', this._onAutosaved);
    this._refreshMinimap(this.game.registry.get('currentMapKey'));

    this.input.keyboard.on('keydown-I', () => InventoryScene.open(this.game));
    // (เฟส 7) B = สมุดสะสม, R = สรุปผล, T = ตารางอันดับ
    this.input.keyboard.on('keydown-B', () => this._openOverlay('CollectionScene'));
    this.input.keyboard.on('keydown-R', () => this._openOverlay('ReportScene'));
    this.input.keyboard.on('keydown-T', () => this._openOverlay('LeaderboardScene'));
    this.input.keyboard.on('keydown-M', () => AudioSystem.toggle());
    this._onMuted = () => this._refreshMute();
    this.game.events.on('audio-muted', this._onMuted);
    this.events.on('sleep', () => this._releaseJoystick());
    this._onBadge = () => this._showBadgePopups();
    this.game.events.on('badge-earned', this._onBadge);
    this.events.on('wake', () => this._showBadgePopups());
    this.time.delayedCall(CONFIG.MAP.WARP_TRANSITION_MS, () => this._showBadgePopups());

    // (โหมดครู) Shift+L = เพิ่ม 1 เลเวล ใช้ได้เฉพาะ CONFIG.DEBUG.ENABLE_KEYS = true
    if (CONFIG.DEBUG.ENABLE_KEYS) {
      this.input.keyboard.on('keydown-L', (e) => {
        if (!e.shiftKey || !PetSystem.current || this.game.registry.get('modalOpen')) return;
        if (!this.scene.isActive('WorldScene')) return;
        const world = this.scene.get('WorldScene');
        if (world.battling) return;
        const r = PetSystem.debugAddLevel();
        if (r.levelsGained > 0) {
          this.game.events.emit('notify', `[โหมดครู] เพิ่มเป็น Lv.${PetSystem.current.level}`);
          ProgressionFx.play(world, r);
        } else {
          this.game.events.emit('notify', '[โหมดครู] เลเวลเต็มแล้ว');
        }
      });
    }

    this.events.once('shutdown', () => {
      this.game.events.off('notify', this._onNotify);
      this.game.events.off('pet-changed', this._onPetChanged);
      this.game.events.off('inventory-changed', this._onInventoryChanged);
      this.game.events.off('map-entered', this._onMapEntered);
      this.game.events.off('pet-changed', this._onPetForMap);
      this.game.events.off('autosaved', this._onAutosaved);
      this.game.events.off('badge-earned', this._onBadge);
      this.game.events.off('audio-muted', this._onMuted);
      this._releaseJoystick();
    });
  }

  // ============================================================
  // ปุ่มกระเป๋า (มุมขวาบน)
  // ============================================================
  _buildBagButton() {
    const I = CONFIG.INVENTORY;
    const x = CONFIG.GAME.WIDTH - I.BAG_BUTTON_MARGIN - I.BAG_BUTTON_SIZE / 2;
    const y = I.BAG_BUTTON_MARGIN + I.BAG_BUTTON_SIZE / 2;
    this.bagButton = this.add.image(x, y, 'ui_icon_bag').setDepth(1000);
    this.bagBaseScale = I.BAG_BUTTON_SIZE / Math.max(this.bagButton.width, this.bagButton.height);
    this.bagButton.setScale(this.bagBaseScale).setInteractive({ useHandCursor: true });
    this.bagButton.on('pointerover', () => this.bagButton.setScale(this.bagBaseScale * 1.08));
    this.bagButton.on('pointerout', () => this.bagButton.setScale(this.bagBaseScale));
    this.bagButton.on('pointerup', () => InventoryScene.open(this.game));
    this.add.text(x, y + I.BAG_BUTTON_SIZE / 2 + 4, 'กระเป๋า (I)', {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '15px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#2a1f4d', strokeThickness: 4, padding: { top: 6, bottom: 2 },
    }).setOrigin(0.5, 0).setDepth(1000);
  }

  // ============================================================
  // มินิแมป (มุมขวาล่าง): เส้นทาง ฟาร์ม -> โซน 1-4 -> ป้อมบอส
  // ============================================================
  _buildMinimap() {
    const M = CONFIG.MINIMAP;
    const n = M.ORDER.length;
    const w = n * M.NODE_SIZE + (n - 1) * M.NODE_GAP + M.PADDING * 2;
    const h = M.NODE_SIZE + M.PADDING * 2 + 26;
    const x0 = CONFIG.GAME.WIDTH - M.MARGIN - w;
    const y0 = CONFIG.GAME.HEIGHT - M.MARGIN - h;
    this.minimap = this.add.container(x0, y0).setDepth(1000);
    const bg = this.add.graphics();
    bg.fillStyle(0x1f1636, 0.78);
    bg.fillRoundedRect(0, 0, w, h, 14);
    bg.lineStyle(2, 0xffe08a, 0.9);
    bg.strokeRoundedRect(0, 0, w, h, 14);
    const cy = 26 + M.PADDING + M.NODE_SIZE / 2;
    const line = this.add.graphics();
    line.lineStyle(4, 0xffe08a, 0.6);
    line.lineBetween(M.PADDING + M.NODE_SIZE / 2, cy, w - M.PADDING - M.NODE_SIZE / 2, cy);
    this.minimapTitle = this.add.text(w / 2, 6, '', {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${M.TITLE_FONT_SIZE}px`, fontStyle: 'bold',
      color: '#ffe08a', padding: { top: 5, bottom: 2 },
    }).setOrigin(0.5, 0);
    this.minimap.add([bg, line, this.minimapTitle]);
    this.minimapNodes = M.ORDER.map((key, i) => {
      const x = M.PADDING + M.NODE_SIZE / 2 + i * (M.NODE_SIZE + M.NODE_GAP);
      const ring = this.add.circle(x, cy, M.NODE_SIZE / 2 + 5, 0xffffff, 0).setStrokeStyle(3, 0x7dffa8, 1).setVisible(false);
      const icon = this.add.image(x, cy, 'ui_minimap_icons', i);
      icon.setScale(M.NODE_SIZE / icon.width);
      const lock = this.add.image(x + M.NODE_SIZE / 3, cy + M.NODE_SIZE / 3, 'ui_lock');
      lock.setScale(M.LOCK_SIZE / Math.max(lock.width, lock.height));
      this.minimap.add([ring, icon, lock]);
      return { key, ring, icon, lock, baseScale: icon.scale };
    });
  }

  _refreshMinimap(currentKey) {
    if (!this.minimapNodes) return;
    const M = CONFIG.MINIMAP;
    const lv = PetSystem.current ? PetSystem.current.level : 1;
    const cur = currentKey && MAPS[currentKey] ? currentKey : null;
    this.minimapTitle.setText(cur ? `ตอนนี้อยู่ที่: ${MAPS[cur].name}` : 'แผนที่');
    this.minimapNodes.forEach((n) => {
      const need = CONFIG.ZONE_LOCK[n.key];
      const locked = !!need && lv < need;
      n.lock.setVisible(locked);
      n.icon.setAlpha(locked ? 0.45 : 1);
      this.tweens.killTweensOf(n.icon);
      n.icon.setScale(n.baseScale);
      const isCur = n.key === cur;
      n.ring.setVisible(isCur);
      if (isCur) {
        n.icon.setScale(n.baseScale * M.CURRENT_SCALE);
        this.tweens.add({ targets: n.icon, scale: n.baseScale * M.CURRENT_SCALE * 1.08, duration: M.PULSE_MS, yoyo: true, repeat: -1 });
      }
    });
  }

  _buildAutosaveBadge() {
    const M = CONFIG.MINIMAP;
    this.autosaveText = this.add.text(CONFIG.GAME.WIDTH - M.MARGIN, CONFIG.GAME.HEIGHT - M.MARGIN - (M.NODE_SIZE + M.PADDING * 2 + 26) - 8,
      'บันทึกอัตโนมัติแล้ว ✓', {
        fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '15px', fontStyle: 'bold', color: '#8fffc0',
        stroke: '#1f1636', strokeThickness: 4, padding: { top: 5, bottom: 2 },
      }).setOrigin(1, 1).setDepth(1000).setAlpha(0);
  }

  _flashAutosave(ok) {
    if (!this.autosaveText) return;
    this.autosaveText.setText(ok ? 'บันทึกอัตโนมัติแล้ว ✓' : 'บันทึกลงเครื่องไม่ได้');
    this.autosaveText.setColor(ok ? '#8fffc0' : '#ff9a9a');
    this.tweens.killTweensOf(this.autosaveText);
    this.autosaveText.setAlpha(1);
    this.tweens.add({ targets: this.autosaveText, alpha: 0, delay: CONFIG.SAVE.AUTOSAVE_NOTICE_MS, duration: 400 });
  }

  // ============================================================
  // (เฟส 7) ปุ่มลัด: สมุดสะสม / สรุปผล / อันดับ (ต่อจากปุ่มกระเป๋าไปทางซ้าย)
  // ============================================================
  _buildHudButtons() {
    const I = CONFIG.INVENTORY;
    const H = CONFIG.HUD_BUTTONS;
    const y = I.BAG_BUTTON_MARGIN + I.BAG_BUTTON_SIZE / 2;
    const x0 = CONFIG.GAME.WIDTH - I.BAG_BUTTON_MARGIN - I.BAG_BUTTON_SIZE / 2;
    [
      { key: 'ui_badge_1', label: 'สมุดสะสม (B)', scene: 'CollectionScene' },
      { key: 'ui_report_icon', label: 'สรุปผล (R)', scene: 'ReportScene' },
      { key: 'ui_trophy', label: 'อันดับ (T)', scene: 'LeaderboardScene' },
    ].forEach((b, i) => {
      const x = x0 - H.GAP * (i + 1);
      const img = this.add.image(x, y, b.key).setDepth(1000);
      const s = H.ICON_SIZE / Math.max(img.width, img.height);
      img.setScale(s).setInteractive({ useHandCursor: true });
      img.on('pointerover', () => img.setScale(s * 1.08));
      img.on('pointerout', () => img.setScale(s));
      img.on('pointerup', () => this._openOverlay(b.scene));
      this.add.text(x, y + I.BAG_BUTTON_SIZE / 2 + 4, b.label, {
        fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '14px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#2a1f4d', strokeThickness: 4, padding: { top: 6, bottom: 2 },
      }).setOrigin(0.5, 0).setDepth(1000);
    });
  }

  // ============================================================
  // (เฟส 8) ปุ่มปิด/เปิดเสียง + จอยสัมผัสเสมือน
  // ============================================================
  _buildMuteButton() {
    const I = CONFIG.INVENTORY;
    const H = CONFIG.HUD_BUTTONS;
    const x = CONFIG.GAME.WIDTH - I.BAG_BUTTON_MARGIN - I.BAG_BUTTON_SIZE / 2 - H.GAP * 4;
    const y = I.BAG_BUTTON_MARGIN + I.BAG_BUTTON_SIZE / 2;
    // ไอคอนลำโพงจริง (ui/sound_on.png / sound_off.png) เรียงแถวเดียวกับปุ่มลัดอื่น
    this.muteBtn = this.add.image(x, y, 'ui_sound_on').setDepth(1000).setInteractive({ useHandCursor: true });
    this.muteScale = H.ICON_SIZE / Math.max(this.muteBtn.width, this.muteBtn.height);
    this.muteBtn.setScale(this.muteScale);
    this.muteBtn.on('pointerover', () => this.muteBtn.setScale(this.muteScale * 1.08));
    this.muteBtn.on('pointerout', () => this.muteBtn.setScale(this.muteScale));
    this.muteBtn.on('pointerup', () => AudioSystem.toggle());
    this.muteLabel = this.add.text(x, y + I.BAG_BUTTON_SIZE / 2 + 4, '', {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '14px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#2a1f4d', strokeThickness: 4, padding: { top: 6, bottom: 2 },
    }).setOrigin(0.5, 0).setDepth(1000);
    this._refreshMute();
  }

  _refreshMute() {
    if (!this.muteBtn) return;
    this.muteBtn.setTexture(AudioSystem.muted ? 'ui_sound_off' : 'ui_sound_on');
    this.muteLabel.setText(AudioSystem.muted ? 'เสียงปิด (M)' : 'เสียงเปิด (M)');
  }

  _buildJoystick() {
    this.game.registry.set('joystick', null);
    if (!Device.isTouch()) return;
    const J = CONFIG.JOYSTICK;
    this.joyBase = this.add.image(J.X, J.Y, 'ui_joystick_base').setDepth(1500).setAlpha(J.IDLE_ALPHA);
    this.joyBase.setScale(J.BASE_SIZE / this.joyBase.width);
    this.joyKnob = this.add.image(J.X, J.Y, 'ui_joystick_knob').setDepth(1501).setAlpha(J.IDLE_ALPHA);
    this.joyKnob.setScale(J.KNOB_SIZE / this.joyKnob.width);
    const zone = this.add.zone(J.X, J.Y, J.TOUCH_AREA, J.TOUCH_AREA).setInteractive().setDepth(1502);
    this.joyPointerId = null;
    const move = (p) => {
      const dx = p.x - J.X;
      const dy = p.y - J.Y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const k = d > J.RADIUS ? J.RADIUS / d : 1;
      this.joyKnob.setPosition(J.X + dx * k, J.Y + dy * k);
      this.game.registry.set('joystick', { x: (dx * k) / J.RADIUS, y: (dy * k) / J.RADIUS });
    };
    zone.on('pointerdown', (p) => {
      this.joyPointerId = p.id;
      this.joyBase.setAlpha(J.ACTIVE_ALPHA);
      this.joyKnob.setAlpha(J.ACTIVE_ALPHA);
      move(p);
    });
    this.input.on('pointermove', (p) => { if (p.id === this.joyPointerId) move(p); });
    this.input.on('pointerup', (p) => { if (p.id === this.joyPointerId) this._releaseJoystick(); });
    this.input.addPointer(1); // รองรับแตะ 2 นิ้ว (จอย + แตะปุ่มอื่น)
  }

  _releaseJoystick() {
    this.joyPointerId = null;
    this.game.registry.set('joystick', null);
    if (!this.joyBase) return;
    const J = CONFIG.JOYSTICK;
    this.joyKnob.setPosition(J.X, J.Y);
    this.joyBase.setAlpha(J.IDLE_ALPHA);
    this.joyKnob.setAlpha(J.IDLE_ALPHA);
  }

  _openOverlay(key) {
    if (!this.scene.isActive('WorldScene')) return;
    const w = this.scene.get('WorldScene');
    if (w && w.battling) return;
    OverlayScene.openOver(this.game, key, 'WorldScene');
  }

  /** ป้ายเด้ง "ได้รับเหรียญตรา" ทีละอัน */
  _showBadgePopups() {
    if (this.badgePopupBusy || !this.scene.isActive()) return;
    const next = BadgeSystem.pending.shift();
    if (!next) return;
    this.badgePopupBusy = true;
    const B = CONFIG.BADGES;
    const cx = CONFIG.GAME.WIDTH / 2;
    const c = this.add.container(cx, -120).setDepth(2000);
    const bg = this.add.graphics();
    bg.fillStyle(0x1f1636, 0.92);
    bg.fillRoundedRect(-280, -60, 560, 120, 24);
    bg.lineStyle(4, 0xffe08a, 1);
    bg.strokeRoundedRect(-280, -60, 560, 120, 24);
    const icon = this.add.image(-210, 0, next.iconKey);
    icon.setScale(B.POPUP_ICON_SIZE / icon.height);
    const t1 = this.add.text(-140, -34, 'ได้รับเหรียญตรา!', {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '20px', fontStyle: 'bold', color: '#ffe08a', padding: { top: 6, bottom: 2 },
    });
    const t2 = this.add.text(-140, 0, next.name, {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '30px', fontStyle: 'bold', color: '#ffffff', padding: { top: 8, bottom: 2 },
    });
    c.add([bg, icon, t1, t2]);
    SoundFx.play(this, 'levelup');
    this.tweens.add({ targets: icon, angle: 360, duration: 700, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c, y: B.POPUP_Y, duration: 420, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: c, y: -120, delay: B.POPUP_MS, duration: 320, ease: 'Sine.easeIn',
          onComplete: () => { c.destroy(); this.badgePopupBusy = false; this._showBadgePopups(); },
        });
      },
    });
  }

  _bumpBag() {
    if (!this.bagButton) return;
    this.tweens.killTweensOf(this.bagButton);
    this.bagButton.setScale(this.bagBaseScale);
    this.tweens.add({
      targets: this.bagButton, scale: this.bagBaseScale * CONFIG.INVENTORY.BAG_BUMP_SCALE,
      duration: 140, yoyo: true, repeat: 1, ease: 'Back.easeOut',
    });
  }

  // ============================================================
  // กรอบข้อมูลสัตว์เลี้ยง (มุมซ้ายบน ใต้ป้ายชื่อผู้เล่น)
  // ============================================================
  _buildPetPanel() {
    const P = CONFIG.PET_PANEL;
    const font = CONFIG.GAME.FONT_FAMILY;
    const pad = 14;

    this.petPanel = this.add.container(P.X, P.Y).setDepth(1000);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a1f4d, 0.8);
    bg.fillRoundedRect(0, 0, P.WIDTH, P.HEIGHT, CONFIG.UI.PANEL_RADIUS);
    bg.lineStyle(2, 0xffe08a, 0.9);
    bg.strokeRoundedRect(0, 0, P.WIDTH, P.HEIGHT, CONFIG.UI.PANEL_RADIUS);

    // วงกลมรูปหน้า
    const faceCx = pad + P.FACE_SIZE / 2;
    const faceCy = P.HEIGHT / 2;
    this.faceBg = this.add.graphics();
    this.faceImg = this.add.image(faceCx, faceCy, '__WHITE');
    const maskG = this.make.graphics({ x: 0, y: 0 }, false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillCircle(P.X + faceCx, P.Y + faceCy, P.FACE_SIZE / 2 - 3);
    this.faceImg.setMask(maskG.createGeometryMask());
    this.faceRing = this.add.graphics();
    this.faceRing.lineStyle(3, 0xffe08a, 1);
    this.faceRing.strokeCircle(faceCx, faceCy, P.FACE_SIZE / 2 - 2);
    this._faceGeom = { cx: faceCx, cy: faceCy };

    // ข้อความ
    const tx = pad * 2 + P.FACE_SIZE;
    this.petNameText = this.add.text(tx, 10, '', {
      fontFamily: font, fontSize: `${P.NAME_FONT_SIZE}px`, fontStyle: 'bold', color: '#ffffff',
    });
    this.petLevelText = this.add.text(P.WIDTH - pad, 12, '', {
      fontFamily: font, fontSize: `${P.NAME_FONT_SIZE - 2}px`, fontStyle: 'bold', color: '#ffe08a',
    }).setOrigin(1, 0);
    this.petFormText = this.add.text(tx, 38, '', {
      fontFamily: font, fontSize: `${P.SMALL_FONT_SIZE}px`, color: '#c9b8ef',
    });

    // หลอด HP / EXP
    const labelW = 34;
    const barX = tx + labelW;
    const barW = Math.min(P.BAR_WIDTH, P.WIDTH - pad - barX);
    this._barGeom = { x: barX, w: barW, h: P.BAR_HEIGHT, hpY: 64, expY: 88 };
    const smallStyle = { fontFamily: font, fontSize: `${P.SMALL_FONT_SIZE}px`, fontStyle: 'bold', color: '#ffffff' };
    const hpLabel = this.add.text(tx, 64 + P.BAR_HEIGHT / 2, 'HP', smallStyle).setOrigin(0, 0.5);
    const expLabel = this.add.text(tx, 88 + P.BAR_HEIGHT / 2, 'EXP', smallStyle).setOrigin(0, 0.5);
    this.hpBar = this.add.graphics();
    this.expBar = this.add.graphics();
    const valueStyle = Object.assign({}, smallStyle, { fontSize: `${P.SMALL_FONT_SIZE - 2}px`, stroke: '#2a1f4d', strokeThickness: 3 });
    this.hpValueText = this.add.text(barX + barW / 2, 64 + P.BAR_HEIGHT / 2, '', valueStyle).setOrigin(0.5);
    this.expValueText = this.add.text(barX + barW / 2, 88 + P.BAR_HEIGHT / 2, '', valueStyle).setOrigin(0.5);

    this.petPanel.add([
      bg, this.faceBg, this.faceImg, this.faceRing,
      this.petNameText, this.petLevelText, this.petFormText,
      hpLabel, expLabel, this.hpBar, this.expBar, this.hpValueText, this.expValueText,
    ]);

    this._shownHpRatio = 1;
    this._shownExpRatio = 0;
    this._lastFaceKey = null;

    if (PetSystem.current) this._refreshPetPanel(PetSystem.current, false);
    else this.petPanel.setVisible(false);
  }

  _drawBar(g, y, ratio, color) {
    const b = this._barGeom;
    g.clear();
    g.fillStyle(0x140f26, 1);
    g.fillRoundedRect(b.x, y, b.w, b.h, b.h / 2);
    const fillW = Math.max(0, Math.min(1, ratio)) * b.w;
    if (fillW > 0) {
      g.fillStyle(color, 1);
      g.fillRoundedRect(b.x, y, Math.max(fillW, b.h), b.h, b.h / 2);
    }
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeRoundedRect(b.x, y, b.w, b.h, b.h / 2);
  }

  _refreshPetPanel(pet, animate) {
    if (!pet) { this.petPanel.setVisible(false); return; }
    this.petPanel.setVisible(true);
    const P = CONFIG.PET_PANEL;
    const species = PetSystem.getSpecies(pet.speciesId);
    const form = PetSystem.getFormData(pet);

    // รูปหน้า (ใช้ภาพ idle ของร่างปัจจุบัน ครอบด้วยวงกลม)
    const faceKey = PetSystem.getTextureKey(pet, 'idle');
    if (faceKey !== this._lastFaceKey) {
      this._lastFaceKey = faceKey;
      this.faceImg.setTexture(faceKey);
      this.faceImg.setOrigin(0.5, P.FACE_FOCUS_Y);
      this.faceImg.setScale((P.FACE_SIZE * P.FACE_ZOOM) / this.faceImg.width);
      this.faceBg.clear();
      this.faceBg.fillStyle(species ? species.colorHex : 0xffffff, 0.45);
      this.faceBg.fillCircle(this._faceGeom.cx, this._faceGeom.cy, P.FACE_SIZE / 2 - 2);
    }

    this.petNameText.setText(PetSystem.getDisplayName(pet));
    this.petLevelText.setText(`Lv.${pet.level}`);
    this.petFormText.setText(`${form ? form.name : ''} • ธาตุ${species ? species.element : ''}`);

    const hpRatio = pet.maxHp > 0 ? pet.hp / pet.maxHp : 0;
    const need = PetSystem.expToNext(pet.level);
    const expRatio = need > 0 ? pet.exp / need : 1;
    this.hpValueText.setText(`${pet.hp}/${pet.maxHp}`);
    this.expValueText.setText(need > 0 ? `${pet.exp}/${need}` : 'MAX');

    const hpColor = hpRatio <= P.HP_LOW_RATIO ? P.HP_LOW_COLOR : P.HP_COLOR;
    const drawAll = () => {
      this._drawBar(this.hpBar, this._barGeom.hpY, this._shownHpRatio, hpColor);
      this._drawBar(this.expBar, this._barGeom.expY, this._shownExpRatio, P.EXP_COLOR);
    };

    if (this._barTween) this._barTween.stop();
    if (!animate) {
      this._shownHpRatio = hpRatio;
      this._shownExpRatio = expRatio;
      drawAll();
      return;
    }
    const fromHp = this._shownHpRatio;
    const fromExp = this._shownExpRatio;
    this._barTween = this.tweens.addCounter({
      from: 0, to: 1, duration: P.BAR_TWEEN_MS, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const t = tw.getValue();
        this._shownHpRatio = fromHp + (hpRatio - fromHp) * t;
        this._shownExpRatio = fromExp + (expRatio - fromExp) * t;
        drawAll();
      },
    });
  }

  // ============================================================
  // ป้ายชื่อผู้เล่น (มุมซ้ายบน)
  // ============================================================
  _buildPlayerNameBadge() {
    const profile = this.registry.get('playerProfile');
    const displayName = profile && profile.name ? profile.name : 'ผู้สำรวจ';

    const paddingX = 16;
    const paddingY = 10;
    const text = this.add.text(0, 0, displayName, {
      fontFamily: CONFIG.GAME.FONT_FAMILY,
      fontSize: `${CONFIG.UI.PLAYER_NAME_FONT_SIZE}px`,
      fontStyle: 'bold',
      color: '#ffffff',
    });

    const boxW = text.width + paddingX * 2;
    const boxH = text.height + paddingY * 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x2a1f4d, 0.75);
    bg.fillRoundedRect(0, 0, boxW, boxH, CONFIG.UI.PANEL_RADIUS);
    bg.lineStyle(2, 0xffe08a, 0.9);
    bg.strokeRoundedRect(0, 0, boxW, boxH, CONFIG.UI.PANEL_RADIUS);

    text.setPosition(paddingX, paddingY);

    this.playerBadge = this.add.container(20, 16, [bg, text]);
    this.playerBadge.setDepth(1000);
  }

  // ============================================================
  // กล่องข้อความแจ้งเตือน (toast)
  // ============================================================
  _buildNotifyBox() {
    const { WIDTH } = CONFIG.GAME;

    this.notifyText = this.add.text(0, 0, '', {
      fontFamily: CONFIG.GAME.FONT_FAMILY,
      fontSize: `${CONFIG.UI.NOTIFY_FONT_SIZE}px`,
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: CONFIG.UI.NOTIFY_MAX_WIDTH - 40 },
    }).setOrigin(0.5);

    this.notifyBg = this.add.graphics();

    this.notifyContainer = this.add.container(WIDTH / 2, -80, [this.notifyBg, this.notifyText]);
    this.notifyContainer.setDepth(2000);
  }

  _enqueueNotify(message) {
    // ไม่ต่อคิวข้อความซ้ำกับตัวท้ายคิว และจำกัดความยาวคิว (ทิ้งข้อความเก่าสุด)
    if (this.notifyQueue[this.notifyQueue.length - 1] === message) return;
    this.notifyQueue.push(message);
    while (this.notifyQueue.length > CONFIG.UI.NOTIFY_MAX_QUEUE) this.notifyQueue.shift();
    if (!this.isShowingNotify) {
      this._showNextNotify();
    }
  }

  _showNextNotify() {
    if (this.notifyQueue.length === 0) {
      this.isShowingNotify = false;
      return;
    }

    this.isShowingNotify = true;
    const message = this.notifyQueue.shift();

    // (เฟส 8) ตัดบรรทัดภาษาไทยด้วย TextUtil (wordWrap ของ Phaser ตัดได้เฉพาะที่ช่องว่าง)
    this.notifyText.setText(TextUtil.wrapThai(TextUtil.formatChem(message),
      TextUtil.fontString(CONFIG.UI.NOTIFY_FONT_SIZE, false), CONFIG.UI.NOTIFY_MAX_WIDTH - 48).join('\n'));

    const paddingX = 24;
    const paddingY = 14;
    const boxW = Math.min(this.notifyText.width + paddingX * 2, CONFIG.UI.NOTIFY_MAX_WIDTH);
    const boxH = this.notifyText.height + paddingY * 2;

    this.notifyBg.clear();
    this.notifyBg.fillStyle(0x1f1636, 0.9);
    this.notifyBg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, CONFIG.UI.PANEL_RADIUS);
    this.notifyBg.lineStyle(2, 0xffe08a, 0.95);
    this.notifyBg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, CONFIG.UI.PANEL_RADIUS);

    this.notifyContainer.setY(-80);

    this.tweens.add({
      targets: this.notifyContainer,
      y: 30,
      duration: CONFIG.UI.NOTIFY_SLIDE_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        // ถ้ามีข้อความใหม่รออยู่ ให้ค้างสั้นลงเพื่อไม่ให้คิวยาวค้าง
        const hold = this.notifyQueue.length > 0 ? CONFIG.UI.NOTIFY_HOLD_BUSY_MS : CONFIG.UI.NOTIFY_HOLD_MS;
        this.time.delayedCall(hold, () => {
          this.tweens.add({
            targets: this.notifyContainer,
            y: -80,
            duration: CONFIG.UI.NOTIFY_SLIDE_MS,
            ease: 'Back.easeIn',
            onComplete: () => this._showNextNotify(),
          });
        });
      },
    });
  }
}
