/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/WorldScene.js
   ------------------------------------------------------------
   ฉากหลักสำหรับสำรวจแผนที่ (ใช้ซ้ำได้กับทุกแผนที่ใน MAPS โดย
   ส่ง data: { mapKey, spawnX, spawnY } ตอนเริ่ม/วาร์ปฉาก)

   ฟีเจอร์ในเฟสนี้:
   - แสดงพื้นหลังแผนที่ + กล้องติดตามผู้เล่นแบบไม่เลยขอบแผนที่
   - เดินด้วยลูกศร/WASD หรือคลิก/แตะเพื่อเดินไปยังจุดนั้น
   - สไปรต์ผู้เล่นเปลี่ยนตามทิศ (down/up/side + flipX) และมี
     tween เด้งตอนเดิน (squash/stretch) + สลับเฟรมเดินด้านข้าง
   - สิ่งกีดขวางแบบกรอบมองไม่เห็น (กด F2 เพื่อแสดง debug)
   - ประตูวาร์ประหว่างแผนที่ (บางประตูอาจ "ล็อก" ไว้สำหรับเฟส
     ถัดไป)
   เฟส 2:
   - สัตว์เลี้ยงเดินตามผู้เล่น (PetFollower) คลิกแล้วกระโดดดีใจ
   - จุดพักฟื้น (healPoints ใน maps.js) เดินแตะแล้ว HP เต็ม
   - ปุ่มทดสอบ F3 = ลด HP, F4 = เพิ่ม EXP (ดู CONFIG.DEBUG)
   เฟส 3:
   - ไอเท็มลอยบนแผนที่ (ITEM_SPAWNS ใน items.js) ลอยขึ้นลง + ประกาย
   - เดินชนไอเท็ม -> QuizPanel ตอบถูก = ได้ไอเท็ม + EXP,
     ตอบผิด = ไอเท็มหาย แล้วเกิดใหม่ตาม CONFIG.ITEM
   - เปิดโซน 2-4 (แจ้งชื่อแผนที่ทุกครั้งที่เข้า)
   เฟส 4:
   - เดินในพุ่มหญ้า (dangerZones) ทุกก้าวมีโอกาสเจอมอนสเตอร์
   - มอนสเตอร์มองเห็นได้เดินเตร่ (wanderers) เดินชนแล้วเข้าต่อสู้
   - เข้าฉากต่อสู้: "!" + จอกะพริบ + กล้องหมุนซูม -> BattleScene
     (ฉากนี้ sleep ไว้ แล้ว wake กลับมาที่ตำแหน่งเดิมหลังจบ)
   - ช่วงปลอดภัยหลังต่อสู้ CONFIG.MONSTER.SAFE_AFTER_BATTLE_SEC
   - F5 = บังคับเข้าต่อสู้ (ทดสอบ)
   เฟส 6:
   - ประตูล็อกตามเลเวล (CONFIG.ZONE_LOCK): แสงสีแดง + "ต้องการ Lv X"
   - ครูเซลล์ยืนหน้าประตู เดินเข้าใกล้แล้วกด E / แตะ เพื่อฟังสรุปความรู้
   - ป้อมบอส: บอสยืนกลางลาน เดินชนแล้วเข้าต่อสู้บอส
   - บันทึกอัตโนมัติทุกครั้งที่เข้าแผนที่/จบการต่อสู้/เลเวลอัป
   เฟส 5:
   - ได้ EXP จากไอเท็ม/ปุ่มทดสอบ -> ProgressionFx (เลเวลอัป/พัฒนาร่าง/เลเวลเต็ม)
   ========================================================== */

class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  init(data) {
    this.mapKey = (data && data.mapKey) || 'farm';
    this.spawnOverride = (data && data.spawnX != null && data.spawnY != null)
      ? { x: data.spawnX, y: data.spawnY }
      : null;

    this.moveTarget = null;
    this.currentDirection = 'down';
    this.isMoving = false;
    this.isMovingPrev = false;
    this.walkFrameTimer = 0;
    this.walkFrameToggle = false;
    this.isWarping = false;
    this.lockedNotifyCooldown = false;
    this.inHealZone = false;
    this.petFollower = null;
    this.itemObjects = [];
    this.itemBusy = false;
    this.itemCheckTimer = 0;
    this.battling = false;
    this.stepAccum = 0;
    this.lastFeet = null;
    this.wanderers = [];
    this.lowHpNotified = false;
    WorldScene.setSafe(CONFIG.MONSTER.SAFE_ON_ENTER_SEC, true);
  }

  // ============================================================
  // ช่วงปลอดภัย (ไม่เจอมอนสเตอร์) + สถานะมอนสเตอร์เดินเตร่ (ข้ามการ restart ฉาก)
  // ============================================================
  static setSafe(seconds, onlyExtend) {
    const until = Date.now() + seconds * 1000;
    if (!onlyExtend || until > (WorldScene._safeUntil || 0)) WorldScene._safeUntil = until;
  }

  static isSafe() {
    return Date.now() < (WorldScene._safeUntil || 0);
  }

  create() {
    const mapData = MAPS[this.mapKey];
    if (!mapData) {
      console.error(`[WorldScene] ไม่พบข้อมูลแผนที่: ${this.mapKey}`);
      return;
    }
    this.mapData = mapData;

    this.cameras.main.setBackgroundColor(CONFIG.GAME.BACKGROUND_COLOR);
    this.cameras.main.fadeIn(CONFIG.MAP.WARP_TRANSITION_MS);

    // ---------------- พื้นหลังแผนที่ ----------------
    this.add.image(0, 0, mapData.imageKey).setOrigin(0, 0).setDepth(0);

    // ---------------- ขอบเขตโลก + กล้อง ----------------
    this.physics.world.setBounds(0, 0, mapData.width, mapData.height);
    this.cameras.main.setBounds(0, 0, mapData.width, mapData.height);

    // ---------------- ผู้เล่น ----------------
    const spawn = this.spawnOverride || mapData.playerStart;
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player_down');
    this.player.setDepth(CONFIG.PLAYER.DEPTH);
    this.player.body.setCircle(
      CONFIG.PLAYER.BODY_RADIUS,
      CONFIG.PLAYER.BODY_OFFSET_X,
      CONFIG.PLAYER.BODY_OFFSET_Y
    );
    this.player.body.setCollideWorldBounds(true);

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    // ---------------- สิ่งกีดขวาง ----------------
    this.obstaclesGroup = this.physics.add.staticGroup();
    mapData.obstacles.forEach((o) => {
      const rect = this.add.rectangle(o.x + o.width / 2, o.y + o.height / 2, o.width, o.height);
      rect.setVisible(false);
      this.physics.add.existing(rect, true);
      this.obstaclesGroup.add(rect);
    });
    this.physics.add.collider(this.player, this.obstaclesGroup);

    // ---------------- ประตูวาร์ป ----------------
    this.portalsGroup = this.physics.add.staticGroup();
    mapData.portals.forEach((p) => {
      const zone = this.add.rectangle(p.x + p.width / 2, p.y + p.height / 2, p.width, p.height);
      zone.setVisible(false);
      zone.setData('portal', p);
      this.physics.add.existing(zone, true);
      this.portalsGroup.add(zone);
    });
    this.physics.add.overlap(this.player, this.portalsGroup, this._onPortalOverlap, null, this);
    this._buildPortalVisuals();

    // ---------------- ครูเซลล์ + บอส (เฟส 6) ----------------
    this._buildNpc();
    this._buildBoss();

    // อัปเดตประตูเมื่อเลเวลเปลี่ยน
    this._onPetChangedPortals = () => this._refreshPortalVisuals();
    this.game.events.on('pet-changed', this._onPetChangedPortals);
    this.events.once('shutdown', () => this.game.events.off('pet-changed', this._onPetChangedPortals));

    // บันทึกอัตโนมัติ + แจ้งมินิแมป
    SaveSystem.autoSave('map', { location: { mapKey: this.mapKey } });
    AudioSystem.playBgm(`bgm_${this.mapKey}`); // (เฟส 8) เพลงประจำโซน
    BadgeSystem.checkAll(); // (เฟส 7) เช่น "นักฟักไข่" หลังฟักไข่ครั้งแรก
    this.game.registry.set('currentMapKey', this.mapKey);
    this.game.events.emit('map-entered', this.mapKey);

    // ---------------- จุดพักฟื้น ----------------
    this._buildHealPoints(mapData);

    // ---------------- ไอเท็มบนแผนที่ ----------------
    this._buildItems();

    // ---------------- มอนสเตอร์เดินเตร่ + กลับจากฉากต่อสู้ ----------------
    this._buildWanderers();
    this.events.on('wake', this._onWakeFromBattle, this);
    this.events.once('shutdown', () => this.events.off('wake', this._onWakeFromBattle, this));

    // ---------------- สัตว์เลี้ยงเดินตาม ----------------
    if (!PetSystem.current) PetSystem.loadFromSave();
    if (PetSystem.current) {
      const feetOffset = CONFIG.PLAYER.BODY_OFFSET_Y + CONFIG.PLAYER.BODY_RADIUS - this.player.height / 2;
      this.petFollower = new PetFollower(this, this.player, feetOffset);
    }

    // ---------------- อินพุต ----------------
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });

    this.input.on('pointerdown', (pointer, currentlyOver) => {
      // คลิกโดนสัตว์เลี้ยง -> ให้สัตว์กระโดดดีใจอย่างเดียว ไม่สั่งผู้เล่นเดิน
      if (currentlyOver && currentlyOver.some((o) => o.getData && o.getData('isPet'))) return;
      // แตะครูเซลล์ตอนอยู่ใกล้ -> คุย (ไม่เดิน)
      if (currentlyOver && currentlyOver.some((o) => o.getData && o.getData('isNpc')) && this._npcNear()) return;
      this.moveTarget = { x: pointer.worldX, y: pointer.worldY };
    });

    // ---------------- Debug (กด F2 เพื่อแสดงกรอบสิ่งกีดขวาง/ประตู) ----------------
    this._buildDebugOverlay(mapData);
    this.input.keyboard.on('keydown-F2', () => {
      this.debugContainer.setVisible(!this.debugContainer.visible);
    });
    if (CONFIG.DEBUG.ENABLE_KEYS) {
      this.input.keyboard.on('keydown-F3', () => {
        if (!PetSystem.current) return;
        PetSystem.changeHp(-CONFIG.DEBUG.HP_DAMAGE);
        this.game.events.emit('notify', `[ทดสอบ] ลด HP ${CONFIG.DEBUG.HP_DAMAGE}`);
      });
      this.input.keyboard.on('keydown-F4', () => {
        if (!PetSystem.current) return;
        const r = PetSystem.addExp(CONFIG.DEBUG.EXP_GAIN);
        let msg = `[ทดสอบ] +EXP ${CONFIG.DEBUG.EXP_GAIN}`;
        if (r.levelsGained > 0) msg += ` เลเวลอัปเป็น Lv.${PetSystem.current.level}!`;
        this.game.events.emit('notify', msg);
        ProgressionFx.play(this, r);
      });
      this.input.keyboard.on('keydown-F5', () => {
        if (this.battling || !PetSystem.current) return;
        this._startBattle(this._zoneMonster(), null);
      });
    }

    // ---------------- UIScene (ซ้อนด้านบน แสดงชื่อผู้เล่น/แจ้งเตือน) ----------------
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    // (เฟส 8) บทช่วยสอนครั้งแรก (ฟาร์ม, ยังไม่เคยผ่าน, เลเวลต่ำ)
    const g0 = SaveSystem.loadGame() || {};
    if (CONFIG.TUTORIAL.ENABLED && this.mapKey === 'farm' && PetSystem.current && !g0.tutorialDone
      && PetSystem.current.level <= 2 && !this.scene.isActive('TutorialScene')) {
      this.scene.launch('TutorialScene');
      this.scene.bringToTop('TutorialScene');
    }

    // แจ้งชื่อแผนที่ (หน่วงเล็กน้อยให้ UIScene พร้อมรับอีเวนต์)
    this.time.delayedCall(CONFIG.ITEM.MAP_NAME_DELAY_MS, () => {
      if (mapData.name) this.game.events.emit('notify', `เข้าสู่ ${mapData.name}`);
    });
  }

  update(time, delta) {
    if (!this.player) return;
    this._handleMovement(delta);
    if (this.petFollower) this.petFollower.update(delta);
    this._checkHealZone();
    this._updateItems(delta);
    this._updateWanderers(delta);
    this._checkGrassEncounter();
    this._updateNpc();
    this._checkBossTouch();
  }

  // ============================================================
  // เฟส 6: สถานะประตู (เปิด / ล็อกตามเลเวล / ปิด)
  // ============================================================
  /** คืน { state: 'open' | 'level' | 'closed', level } */
  static portalState(portal) {
    if (portal.locked || !portal.target) return { state: 'closed' };
    if (portal.requires === 'bossDefeated') {
      const g = SaveSystem.loadGame();
      if (!g || !g.bossDefeated) return { state: 'closed' };
    }
    const need = CONFIG.ZONE_LOCK[portal.target.mapKey];
    const lv = PetSystem.current ? PetSystem.current.level : 1;
    if (need && lv < need) return { state: 'level', level: need };
    return { state: 'open' };
  }

  _buildPortalVisuals() {
    const F = CONFIG.PORTAL_FX;
    this.portalVisuals = this.mapData.portals.map((p) => {
      const x = p.x + p.width / 2;
      const y = p.y + p.height / 2;
      const glow = this.add.image(x, y, 'ui_portal').setScale(F.SCALE).setAlpha(F.ALPHA).setDepth(F.DEPTH)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: glow, angle: 360, duration: F.SPIN_MS, repeat: -1 });
      this.tweens.add({ targets: glow, alpha: F.ALPHA * 0.55, duration: F.PULSE_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const lock = this.add.image(x, y, 'ui_lock').setDepth(F.DEPTH + 1);
      lock.setScale(F.LOCK_ICON_SIZE / Math.max(lock.width, lock.height));
      const label = this.add.text(x, y + F.LABEL_OFFSET_Y, '', {
        fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${F.LABEL_FONT_SIZE}px`, fontStyle: 'bold',
        color: '#ffffff', stroke: '#8a1020', strokeThickness: 5, padding: { top: 6, bottom: 2 },
      }).setOrigin(0.5).setDepth(F.DEPTH + 1);
      return { portal: p, glow, lock, label };
    });
    this._refreshPortalVisuals();
  }

  _refreshPortalVisuals() {
    const F = CONFIG.PORTAL_FX;
    (this.portalVisuals || []).forEach((v) => {
      const st = WorldScene.portalState(v.portal);
      // เปิด = แสงฟ้าแบบเรืองแสง (ADD), ล็อก = แสงสีแดงทึบ (NORMAL) ให้เห็นชัดบนวงประตูสีฟ้า
      v.glow.setBlendMode(st.state === 'open' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
      if (st.state === 'open') {
        v.glow.setTint(F.OPEN_TINT);
        v.lock.setVisible(false);
        v.label.setVisible(false);
      } else if (st.state === 'level') {
        v.glow.setTint(F.LOCKED_TINT);
        v.lock.setVisible(true);
        v.label.setVisible(true).setText(`ต้องการ Lv ${st.level}`);
      } else {
        v.glow.setTint(F.CLOSED_TINT);
        v.lock.setVisible(true);
        v.label.setVisible(false);
      }
    });
  }

  // ============================================================
  // เฟส 6: ครูเซลล์ (NPC)
  // ============================================================
  _buildNpc() {
    const pos = this.mapData.npc;
    const dialog = NPC_DIALOGS[this.mapKey];
    this.npc = null;
    if (!pos || !dialog) return;
    const N = CONFIG.NPC;
    const img = this.add.image(pos.x, pos.y, NPC_INFO.spriteKey).setOrigin(0.5, 1);
    const scale = N.HEIGHT / img.height;
    img.setScale(scale).setDepth(CONFIG.PLAYER.DEPTH + pos.y * 0.001);
    this.tweens.add({ targets: img, scaleY: scale * 1.03, duration: N.BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const shadow = this.add.ellipse(pos.x, pos.y, img.displayWidth * 0.7, 16, 0x000000, 0.25).setDepth(1);
    const hint = this.add.text(pos.x, pos.y - N.HEIGHT - N.HINT_OFFSET_Y, `${NPC_INFO.name}\nกด E / แตะเพื่อคุย`, {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', align: 'center',
      stroke: '#2a1f4d', strokeThickness: 5, padding: { top: 6, bottom: 2 },
    }).setOrigin(0.5, 1).setDepth(9000).setVisible(false);
    this.tweens.add({ targets: hint, y: hint.y - N.BOB_PX, duration: N.BOB_MS, yoyo: true, repeat: -1 });
    img.setInteractive({ useHandCursor: true });
    img.setData('isNpc', true);
    img.on('pointerup', () => { if (this._npcNear()) this._talkNpc(); });
    this.npc = { img, shadow, hint, pos, dialog };
    this.input.keyboard.on('keydown-E', () => { if (this._npcNear()) this._talkNpc(); });
  }

  _npcNear() {
    if (!this.npc || this.battling || this.isWarping || this.game.registry.get('modalOpen')) return false;
    const f = this._feet();
    return Phaser.Math.Distance.Between(f.x, f.y, this.npc.pos.x, this.npc.pos.y) < CONFIG.NPC.TALK_DISTANCE;
  }

  _talkNpc() {
    this.moveTarget = null;
    this.player.body.setVelocity(0, 0);
    DialogScene.open(this, {
      speaker: NPC_INFO.name,
      title: this.npc.dialog.title,
      lines: this.npc.dialog.lines,
      portraitKey: NPC_INFO.spriteKey,
    });
  }

  _updateNpc() {
    if (!this.npc) return;
    this.npc.hint.setVisible(this._npcNear());
  }

  // ============================================================
  // เฟส 6: บอสบนแผนที่ป้อมบอส
  // ============================================================
  _buildBoss() {
    this.bossSprite = null;
    const pos = this.mapData.boss;
    if (!pos) return;
    const B = CONFIG.BOSS;
    const data = getMonsterData('boss');
    const img = this.add.image(pos.x, pos.y, data.idleKey).setOrigin(0.5, 1);
    const scale = B.WORLD_HEIGHT / img.height;
    img.setScale(scale).setDepth(CONFIG.PLAYER.DEPTH + pos.y * 0.001);
    this.tweens.add({ targets: img, scaleY: scale * 1.05, scaleX: scale * 0.97, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.ellipse(pos.x, pos.y, img.displayWidth * 0.7, 26, 0x000000, 0.3).setDepth(1);
    const g = SaveSystem.loadGame();
    const label = (g && g.bossDefeated) ? `${data.name} (ท้าสู้อีกครั้งได้)` : data.name;
    this.add.text(pos.x, pos.y - B.WORLD_HEIGHT - 6, label, {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '18px', fontStyle: 'bold', color: '#ffd6ff',
      stroke: '#3a1060', strokeThickness: 5, padding: { top: 6, bottom: 2 },
    }).setOrigin(0.5, 1).setDepth(9000);
    this.bossSprite = { img, pos };
  }

  _checkBossTouch() {
    if (!this.bossSprite || !this._canEncounter()) return;
    const f = this._feet();
    if (Phaser.Math.Distance.Between(f.x, f.y, this.bossSprite.pos.x, this.bossSprite.pos.y) < CONFIG.BOSS.TOUCH_DISTANCE) {
      this._startBattle('boss', null);
    }
  }

  /** มอนสเตอร์ของแผนที่นี้ (maps.js -> monsterId หรือประจำโซน) */
  _zoneMonster() {
    return this.mapData.monsterId || getMonsterForZone(this.mapData.quizZone || 1);
  }

  // ============================================================
  // การเจอมอนสเตอร์ในพุ่มหญ้า (dangerZones)
  // ============================================================
  _feet() {
    return this.player.body.center;
  }

  _inDangerZone(x, y) {
    return (this.mapData.dangerZones || []).some((z) => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height);
  }

  _canEncounter() {
    if (this.battling || this.isWarping || this.itemBusy || WorldScene.isSafe()) return false;
    if (this.game.registry.get('modalOpen')) return false;
    const pet = PetSystem.current;
    if (!pet) return false;
    if (pet.hp <= 0) {
      if (!this.lowHpNotified) {
        this.lowHpNotified = true;
        this.game.events.emit('notify', `${PetSystem.getDisplayName()} หมดแรงอยู่ กลับไปพักที่จุดพักฟื้นในฟาร์มก่อนนะ`);
      }
      return false;
    }
    return true;
  }

  _checkGrassEncounter() {
    const f = this._feet();
    const pos = { x: f.x, y: f.y };
    if (!this.lastFeet) { this.lastFeet = pos; return; }
    const moved = Phaser.Math.Distance.Between(pos.x, pos.y, this.lastFeet.x, this.lastFeet.y);
    this.lastFeet = pos;
    if (!this.isMoving || !this._inDangerZone(pos.x, pos.y)) return;
    this.stepAccum += moved;
    while (this.stepAccum >= CONFIG.MONSTER.STEP_DISTANCE) {
      this.stepAccum -= CONFIG.MONSTER.STEP_DISTANCE;
      if (this._canEncounter() && Math.random() < CONFIG.MONSTER.ENCOUNTER_CHANCE_PER_STEP) {
        this.stepAccum = 0;
        this._startBattle(this._zoneMonster(), null);
        return;
      }
    }
  }

  // ============================================================
  // มอนสเตอร์เดินเตร่บนแผนที่ (wanderers)
  // ============================================================
  _wanderKey(i) { return `${this.mapKey}:${i}`; }

  _wanderAvailable(i) {
    const t = (WorldScene._wanderRespawn || {})[this._wanderKey(i)];
    return !t || Date.now() >= t;
  }

  _buildWanderers() {
    this.wanderAreas = this.mapData.quizZone ? (this.mapData.wanderers || []) : [];
    this.wanderAreas.forEach((area, i) => {
      this.wanderers[i] = null;
      if (this._wanderAvailable(i)) this._spawnWanderer(i, false);
    });
  }

  _randomInArea(a) {
    return { x: Phaser.Math.Between(a.x, a.x + a.width), y: Phaser.Math.Between(a.y, a.y + a.height) };
  }

  _spawnWanderer(i, animate) {
    const M = CONFIG.MONSTER;
    const area = this.wanderAreas[i];
    const data = getMonsterData(this._zoneMonster());
    const p = this._randomInArea(area);
    const sprite = this.add.image(p.x, p.y, data.idleKey).setOrigin(0.5, 1);
    const baseScale = M.WANDER_HEIGHT / sprite.height;
    sprite.setScale(baseScale);
    const shadow = this.add.ellipse(p.x, p.y, sprite.displayWidth * 0.7, 16, 0x000000, M.WANDER_SHADOW_ALPHA).setDepth(1);
    const w = {
      i, area, data, sprite, shadow, baseScale, x: p.x, y: p.y, target: null,
      pauseUntil: this.time.now + Phaser.Math.Between(M.WANDER_PAUSE_MIN_MS, M.WANDER_PAUSE_MAX_MS),
      bob: { v: 0 },
    };
    w.bobTween = this.tweens.add({
      targets: w.bob, v: M.WANDER_BOB_PX, duration: M.WANDER_BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    w.squash = this.tweens.add({
      targets: sprite, scaleY: baseScale * 1.06, scaleX: baseScale * 0.96,
      duration: M.WANDER_BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    if (animate) {
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: CONFIG.ITEM.APPEAR_MS });
    }
    this.wanderers[i] = w;
    this._placeWanderer(w);
  }

  _placeWanderer(w) {
    w.sprite.setPosition(w.x, w.y - w.bob.v);
    w.sprite.setDepth(CONFIG.PLAYER.DEPTH + w.y * 0.001);
    w.shadow.setPosition(w.x, w.y);
  }

  _removeWanderer(i) {
    const w = this.wanderers[i];
    if (!w) return;
    this.wanderers[i] = null;
    w.bobTween.stop();
    w.squash.stop();
    w.sprite.destroy();
    w.shadow.destroy();
  }

  _updateWanderers(delta) {
    const M = CONFIG.MONSTER;
    if (!this.wanderAreas) return;
    const f = this._feet();
    this.wanderAreas.forEach((area, i) => {
      let w = this.wanderers[i];
      if (!w) {
        if (this._wanderAvailable(i)) this._spawnWanderer(i, true);
        return;
      }
      if (!this.battling) {
        if (!w.target && this.time.now >= w.pauseUntil) w.target = this._randomInArea(area);
        if (w.target) {
          const dx = w.target.x - w.x;
          const dy = w.target.y - w.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const stepPx = (M.WANDER_SPEED * delta) / 1000;
          if (dist <= stepPx) {
            w.x = w.target.x; w.y = w.target.y; w.target = null;
            w.pauseUntil = this.time.now + Phaser.Math.Between(M.WANDER_PAUSE_MIN_MS, M.WANDER_PAUSE_MAX_MS);
          } else {
            w.x += (dx / dist) * stepPx;
            w.y += (dy / dist) * stepPx;
            if (Math.abs(dx) > 1) w.sprite.setFlipX(dx > 0); // ภาพต้นฉบับหันซ้าย
          }
        }
      }
      this._placeWanderer(w);
      if (Phaser.Math.Distance.Between(f.x, f.y, w.x, w.y) < M.WANDER_TOUCH_DISTANCE && this._canEncounter()) {
        this._startBattle(w.data.id, i);
      }
    });
  }

  // ============================================================
  // เข้าฉากต่อสู้ / กลับจากฉากต่อสู้
  // ============================================================
  _startBattle(monsterId, wandererIndex, extra) {
    if (this.battling) return;
    this.battling = true;
    const B = CONFIG.BATTLE;
    this.moveTarget = null;
    this.player.body.setVelocity(0, 0);
    this.isMoving = false;
    this._updateBounceTween();
    this.isMovingPrev = false;

    // "!" เหนือหัวผู้เล่น
    const ex = this.add.text(this.player.x, this.player.y - this.player.height / 2 - 10, '!', {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '56px', fontStyle: 'bold',
      color: '#ff5b5b', stroke: '#ffffff', strokeThickness: 8, padding: { top: 6, bottom: 2 },
    }).setOrigin(0.5, 1).setDepth(9000).setScale(0);
    this.tweens.add({ targets: ex, scale: 1, duration: 160, ease: 'Back.easeOut' });

    const cam = this.cameras.main;
    this.time.delayedCall(CONFIG.MONSTER.EXCLAIM_MS, () => {
      ex.destroy();
      for (let k = 0; k < B.TRANSITION_FLASH_COUNT; k++) {
        this.time.delayedCall(k * B.TRANSITION_FLASH_MS * 2, () => cam.flash(B.TRANSITION_FLASH_MS, 255, 255, 255));
      }
      this.time.delayedCall(B.TRANSITION_FLASH_COUNT * B.TRANSITION_FLASH_MS * 2, () => {
        cam.stopFollow();
        this.tweens.add({
          targets: cam, rotation: Math.PI * 2 * B.TRANSITION_SPIN_TURNS, zoom: B.TRANSITION_ZOOM,
          duration: B.TRANSITION_SPIN_MS, ease: 'Cubic.easeIn',
        });
        cam.fade(B.TRANSITION_SPIN_MS, 0, 0, 0, true); // force: เผื่อกำลัง fade-in อยู่
        cam.once('camerafadeoutcomplete', () => {
          this.scene.sleep('UIScene');
          this.scene.launch('BattleScene', {
            monsterId,
            wandererIndex,
            mapKey: this.mapKey,
            zone: this.mapData.quizZone || 1,
            tutorial: !!(extra && extra.tutorial),
          });
          this.scene.sleep();
        });
      });
    });
  }

  _onWakeFromBattle(sys, data) {
    const cam = this.cameras.main;
    this.tweens.killTweensOf(cam);
    cam.setRotation(0);
    cam.setZoom(1);
    cam.resetFX();
    cam.startFollow(this.player, true, 0.09, 0.09);
    cam.fadeIn(CONFIG.MAP.WARP_TRANSITION_MS);
    if (this.input.keyboard) this.input.keyboard.resetKeys();
    this.moveTarget = null;
    this.stepAccum = 0;
    this.lastFeet = null;
    this.battling = false;
    WorldScene.setSafe(CONFIG.MONSTER.SAFE_AFTER_BATTLE_SEC, false);
    this._refreshPortalVisuals();
    SaveSystem.autoSave('battle', { location: { mapKey: this.mapKey } });
    AudioSystem.playBgm(`bgm_${this.mapKey}`);
    // กลับจากสู้บอส: ถอยผู้เล่นออกจากตัวบอส กันชนซ้ำทันที
    if (this.bossSprite) {
      const f = this._feet();
      const bp = this.bossSprite.pos;
      if (Phaser.Math.Distance.Between(f.x, f.y, bp.x, bp.y) < CONFIG.BOSS.TOUCH_DISTANCE * 2) {
        const feetDy = CONFIG.PLAYER.BODY_OFFSET_Y + CONFIG.PLAYER.BODY_RADIUS - this.player.height / 2;
        this.player.body.reset(bp.x - CONFIG.BOSS.TOUCH_DISTANCE * 2, bp.y - feetDy);
      }
    }
    if (data && data.result === 'win' && data.wandererIndex != null) {
      this._removeWanderer(data.wandererIndex);
      WorldScene._wanderRespawn = WorldScene._wanderRespawn || {};
      WorldScene._wanderRespawn[this._wanderKey(data.wandererIndex)] = Date.now() + CONFIG.MONSTER.WANDER_RESPAWN_SEC * 1000;
    }
  }

  // ============================================================
  // ไอเท็มบนแผนที่ + ตอบคำถามเพื่อเก็บ
  // ============================================================
  _buildItems() {
    const I = CONFIG.ITEM;
    this.itemSpawns = (ITEM_SPAWNS[this.mapKey] || []).slice();
    this.itemsGroup = this.physics.add.staticGroup();
    this.itemSparkles = this.add.particles(0, 0, 'fx_sparkle', {
      speed: { min: 10, max: 40 },
      angle: { min: 240, max: 300 },
      scale: { start: I.SPARKLE_SCALE, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: I.SPARKLE_LIFESPAN_MS,
      emitting: false,
    }).setDepth(CONFIG.PLAYER.DEPTH + this.mapData.height * 0.001 + 1);

    this.itemSpawns.forEach((sp, i) => {
      this.itemObjects[i] = null;
      if (InventorySystem.isSpawnAvailable(this.mapKey, i)) this._spawnItem(i, false);
    });
    this.physics.add.overlap(this.player, this.itemsGroup, this._onItemOverlap, null, this);
  }

  _spawnItem(i, animate) {
    const I = CONFIG.ITEM;
    const sp = this.itemSpawns[i];
    const data = getItemData(sp.itemId);
    if (!data) return;

    const depth = I.DEPTH + sp.y * 0.001;
    const shadow = this.add.ellipse(sp.x, sp.y, I.SHADOW_WIDTH, I.SHADOW_HEIGHT, 0x000000, I.SHADOW_ALPHA).setDepth(1);
    const img = this.add.image(sp.x, sp.y - I.HOVER_ABOVE_GROUND, data.spriteKey).setDepth(depth);
    const baseScale = I.WORLD_SIZE / Math.max(img.width, img.height);
    img.setScale(baseScale);

    const floatTween = this.tweens.add({
      targets: img, y: img.y - I.FLOAT_HEIGHT, duration: I.FLOAT_MS,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const shadowTween = this.tweens.add({
      targets: shadow, scaleX: 0.8, alpha: I.SHADOW_ALPHA * 0.6, duration: I.FLOAT_MS,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const sparkleEvent = this.time.addEvent({
      delay: I.SPARKLE_EVERY_MS, loop: true,
      callback: () => {
        if (!img.active) return;
        this.itemSparkles.emitParticleAt(
          img.x + Phaser.Math.Between(-I.SPARKLE_SPREAD, I.SPARKLE_SPREAD),
          img.y + Phaser.Math.Between(-I.SPARKLE_SPREAD, I.SPARKLE_SPREAD), 1);
      },
    });

    const zone = this.add.rectangle(sp.x, sp.y, I.PICKUP_WIDTH, I.PICKUP_HEIGHT).setVisible(false);
    zone.setData('spawnIndex', i);
    this.physics.add.existing(zone, true);
    this.itemsGroup.add(zone);

    if (animate) {
      img.setScale(0);
      shadow.setAlpha(0);
      this.tweens.add({ targets: img, scale: baseScale, duration: I.APPEAR_MS, ease: 'Back.easeOut' });
      this.tweens.add({ targets: shadow, alpha: I.SHADOW_ALPHA, duration: I.APPEAR_MS });
    }
    this.itemObjects[i] = { img, shadow, zone, floatTween, shadowTween, sparkleEvent, data, baseScale };
  }

  _removeItem(i, collected) {
    const I = CONFIG.ITEM;
    const obj = this.itemObjects[i];
    if (!obj) return;
    this.itemObjects[i] = null;
    this.itemsGroup.remove(obj.zone, true, true);
    obj.sparkleEvent.remove();
    obj.floatTween.stop();
    obj.shadowTween.stop();
    this.tweens.add({ targets: obj.shadow, alpha: 0, duration: I.VANISH_MS, onComplete: () => obj.shadow.destroy() });
    if (collected) {
      this.itemSparkles.explode(CONFIG.HEAL.SPARKLE_COUNT, obj.img.x, obj.img.y);
      this.tweens.add({
        targets: obj.img, y: obj.img.y - I.COLLECT_RISE, scale: obj.baseScale * 1.4, alpha: 0,
        duration: I.COLLECT_MS, ease: 'Back.easeIn', onComplete: () => obj.img.destroy(),
      });
    } else {
      obj.img.setTint(0x777777);
      this.tweens.add({
        targets: obj.img, scaleX: 0, scaleY: obj.baseScale * 1.3, alpha: 0, angle: 25,
        duration: I.VANISH_MS, ease: 'Sine.easeIn', onComplete: () => obj.img.destroy(),
      });
    }
  }

  _updateItems(delta) {
    if (!this.itemSpawns || this.itemSpawns.length === 0) return;
    this.itemCheckTimer += delta;
    if (this.itemCheckTimer < CONFIG.ITEM.CHECK_RESPAWN_MS) return;
    this.itemCheckTimer = 0;
    this.itemSpawns.forEach((sp, i) => {
      if (sp.done) return; // ไอเท็มฝึกของบทช่วยสอนที่ใช้แล้ว
      if (!this.itemObjects[i] && InventorySystem.isSpawnAvailable(this.mapKey, i)) this._spawnItem(i, true);
    });
  }

  _onItemOverlap(player, zone) {
    if (this.itemBusy || this.isWarping || this.battling) return;
    const i = zone.getData('spawnIndex');
    const obj = this.itemObjects[i];
    if (!obj) return;
    this.itemBusy = true;
    this.moveTarget = null;
    this.player.body.setVelocity(0, 0);

    const name = obj.data.name;
    QuizPanel.open(this, {
      zone: this.mapData.quizZone || 1,
      context: 'item',
      title: `ตอบให้ถูกเพื่อเก็บ "${name}"`,
    }).then((res) => this._onItemQuizDone(i, obj.data, res));
  }

  _onItemQuizDone(i, data, res) {
    const I = CONFIG.ITEM;
    if (res && res.correct) {
      SoundFx.play(this, 'pickup');
      this._removeItem(i, true);
      InventorySystem.setSpawnCooldown(this.mapKey, i, I.RESPAWN_CORRECT_SEC);
      InventorySystem.add(data.id, 1);
      let msg = `ได้รับ ${data.name} +1  และ EXP +${I.EXP_ON_CORRECT}`;
      if (PetSystem.current) {
        const r = PetSystem.addExp(I.EXP_ON_CORRECT);
        this.game.events.emit('notify', msg);
        ProgressionFx.play(this, r); // เลเวลอัป/พัฒนาร่าง/เลเวลเต็ม (ถ้ามี)
      } else {
        this.game.events.emit('notify', msg);
      }
    } else {
      this._removeItem(i, false);
      InventorySystem.setSpawnCooldown(this.mapKey, i, I.RESPAWN_WRONG_SEC);
      if (!this.itemSpawns[i].tutorial) {
        this.game.events.emit('notify', `${data.name} หายไปแล้ว... จะกลับมาในอีก ${I.RESPAWN_WRONG_SEC} วินาที`);
      }
    }
    this.itemBusy = false;
    if (this.itemSpawns[i] && this.itemSpawns[i].tutorial) {
      this.itemSpawns[i].done = true;
      this.events.emit('tutorial-item-done', !!(res && res.correct));
    }
  }

  /** (เฟส 8) วางไอเท็มฝึกของบทช่วยสอน */
  spawnTutorialItem(pos) {
    const i = this.itemSpawns.push({ itemId: 'item_glucose', x: pos.x, y: pos.y, tutorial: true }) - 1;
    this.itemObjects[i] = null;
    this._spawnItem(i, true);
  }

  // ============================================================
  // จุดพักฟื้น
  // ============================================================
  _buildHealPoints(mapData) {
    this.healGroup = this.physics.add.staticGroup();
    (mapData.healPoints || []).forEach((h) => {
      const cx = h.x + h.width / 2;
      const cy = h.y + h.height / 2;

      const zone = this.add.rectangle(cx, cy, h.width, h.height).setVisible(false);
      this.physics.add.existing(zone, true);
      this.healGroup.add(zone);

      // วงแหวนเรืองแสงเต้นเป็นจังหวะ (วางบนพื้น ต่ำกว่าตัวละคร)
      const ring = this.add.image(cx, h.y + h.height, 'fx_heal_ring').setOrigin(0.5, 1).setDepth(1);
      const base = CONFIG.HEAL.RING_WIDTH / ring.width;
      ring.setScale(base);
      this.tweens.add({
        targets: ring, scale: base * CONFIG.HEAL.RING_PULSE_SCALE, alpha: 0.7,
        duration: CONFIG.HEAL.RING_PULSE_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.add.text(cx, h.y - 6, 'จุดพักฟื้น', {
        fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '18px', fontStyle: 'bold',
        color: '#fff3b0', stroke: '#3a2a5d', strokeThickness: 5,
      }).setOrigin(0.5, 1).setDepth(2);
    });
  }

  _checkHealZone() {
    if (!this.healGroup || this.healGroup.getLength() === 0) return;
    const inside = this.physics.overlap(this.player, this.healGroup);
    if (inside && !this.inHealZone) this._onEnterHeal();
    this.inHealZone = inside;
  }

  _onEnterHeal() {
    const pet = PetSystem.current;
    if (!pet) return;
    const name = PetSystem.getDisplayName();
    if (PetSystem.healFull()) {
      this.game.events.emit('notify', `พักฟื้นเรียบร้อย! HP ของ ${name} เต็มแล้ว`);
      const target = this.petFollower ? this.petFollower.container : this.player;
      const emitter = this.add.particles(0, 0, 'fx_sparkle', {
        speed: { min: CONFIG.HEAL.SPARKLE_SPEED_MIN, max: CONFIG.HEAL.SPARKLE_SPEED_MAX },
        angle: { min: 220, max: 320 },
        scale: { start: CONFIG.HEAL.SPARKLE_SCALE, end: 0 },
        lifespan: CONFIG.HEAL.SPARKLE_LIFESPAN_MS, emitting: false,
      }).setDepth(100);
      emitter.explode(CONFIG.HEAL.SPARKLE_COUNT, target.x, target.y - CONFIG.HEAL.SPARKLE_RISE_OFFSET);
      this.time.delayedCall(CONFIG.HEAL.SPARKLE_LIFESPAN_MS * 2, () => emitter.destroy());
    } else {
      this.game.events.emit('notify', `${name} แข็งแรงดีอยู่แล้ว (HP เต็ม)`);
    }
  }

  // ============================================================
  // การเคลื่อนที่ + แอนิเมชันทิศทาง
  // ============================================================
  _handleMovement(delta) {
    const speed = CONFIG.PLAYER.START_SPEED;
    let vx = 0;
    let vy = 0;

    const left = this.cursorKeys.left.isDown || this.wasdKeys.left.isDown;
    const right = this.cursorKeys.right.isDown || this.wasdKeys.right.isDown;
    const up = this.cursorKeys.up.isDown || this.wasdKeys.up.isDown;
    const down = this.cursorKeys.down.isDown || this.wasdKeys.down.isDown;

    const keyboardActive = left || right || up || down;
    // (เฟส 8) จอยสัมผัสเสมือน (UIScene เขียนค่าไว้ใน registry 'joystick')
    const joy = this.game.registry.get('joystick');
    const joyActive = !keyboardActive && joy && (joy.x * joy.x + joy.y * joy.y) > CONFIG.JOYSTICK.DEADZONE * CONFIG.JOYSTICK.DEADZONE;

    if (joyActive) {
      this.moveTarget = null;
      vx = joy.x;
      vy = joy.y;
    } else if (keyboardActive) {
      this.moveTarget = null; // ยกเลิกจุดหมายที่คลิกไว้ทันทีที่กดปุ่มเอง
      if (left) vx -= 1;
      if (right) vx += 1;
      if (up) vy -= 1;
      if (down) vy += 1;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x;
      const dy = this.moveTarget.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= CONFIG.PLAYER.CLICK_MOVE_STOP_DISTANCE) {
        this.moveTarget = null;
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    // normalize เผื่อเดินทแยง (คีย์บอร์ด) ให้ความเร็วเท่ากันทุกทิศ
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      const scale = joyActive ? Math.min(1, len) : 1; // จอยเอียงน้อย = เดินช้า
      vx = (vx / len) * speed * scale;
      vy = (vy / len) * speed * scale;
    }

    this.player.body.setVelocity(vx, vy);
    this.player.setDepth(CONFIG.PLAYER.DEPTH + this.player.y * 0.001);

    this.isMoving = (vx !== 0 || vy !== 0);
    this._updateFacing(vx, vy);
    this._updateSprite(delta);
    this._updateBounceTween();

    this.isMovingPrev = this.isMoving;
  }

  _updateFacing(vx, vy) {
    if (vx !== 0 && Math.abs(vx) >= Math.abs(vy) * 0.8) {
      this.currentDirection = 'side';
      this.player.setFlipX(vx < 0);
    } else if (vy < 0) {
      this.currentDirection = 'up';
    } else if (vy > 0) {
      this.currentDirection = 'down';
    }
    // ถ้าหยุดนิ่ง (vx=vy=0) ให้คงทิศเดิมไว้ (ไม่เปลี่ยนภาพ)
  }

  _updateSprite(delta) {
    if (this.currentDirection === 'side') {
      if (this.isMoving) {
        this.walkFrameTimer += delta;
        if (this.walkFrameTimer >= CONFIG.PLAYER.WALK_FRAME_SWAP_MS) {
          this.walkFrameTimer = 0;
          this.walkFrameToggle = !this.walkFrameToggle;
        }
        this.player.setTexture(this.walkFrameToggle ? 'player_walk' : 'player_side');
      } else {
        this.walkFrameTimer = 0;
        this.walkFrameToggle = false;
        this.player.setTexture('player_side');
      }
    } else if (this.currentDirection === 'up') {
      this.player.setTexture('player_up');
    } else {
      this.player.setTexture('player_down');
    }
  }

  _updateBounceTween() {
    if (this.isMoving && !this.isMovingPrev) {
      // เริ่มเดิน -> เริ่ม tween เด้ง (squash/stretch) วนซ้ำ
      if (this.bounceTween) this.bounceTween.stop();
      this.player.setScale(1, 1);
      this.bounceTween = this.tweens.add({
        targets: this.player,
        scaleY: CONFIG.PLAYER.WALK_BOUNCE_SCALE,
        scaleX: 2 - CONFIG.PLAYER.WALK_BOUNCE_SCALE,
        duration: CONFIG.PLAYER.WALK_BOUNCE_DURATION_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!this.isMoving && this.isMovingPrev) {
      // หยุดเดิน -> คืนสเกลปกติ
      if (this.bounceTween) {
        this.bounceTween.stop();
        this.bounceTween = null;
      }
      this.player.setScale(1, 1);
    }
  }

  // ============================================================
  // ประตูวาร์ป
  // ============================================================
  _onPortalOverlap(player, zoneObject) {
    const portal = zoneObject.getData('portal');
    if (!portal) return;

    const st = WorldScene.portalState(portal);
    if (st.state !== 'open') {
      if (!this.lockedNotifyCooldown) {
        this.lockedNotifyCooldown = true;
        const msg = st.state === 'level'
          ? `ต้องการ Lv ${st.level} ขึ้นไป จึงจะเข้า${MAPS[portal.target.mapKey].name}ได้ (ตอนนี้ Lv ${PetSystem.current ? PetSystem.current.level : 1})`
          : (portal.message || 'ประตูนี้ยังไม่เปิดใช้งาน');
        this.game.events.emit('notify', msg);
        this.time.delayedCall(CONFIG.PORTAL_FX.NOTIFY_COOLDOWN_MS, () => { this.lockedNotifyCooldown = false; });
      }
      return;
    }

    if (this.isWarping || this.battling) return;
    this.isWarping = true;
    this._warpTo(portal.target);
  }

  _warpTo(target) {
    this.moveTarget = null;
    this.player.body.setVelocity(0, 0);

    this.cameras.main.fadeOut(CONFIG.MAP.WARP_TRANSITION_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ mapKey: target.mapKey, spawnX: target.spawnX, spawnY: target.spawnY });
    });
  }

  // ============================================================
  // Debug overlay (กรอบสิ่งกีดขวาง/ประตู) - กด F2 เพื่อสลับการแสดง
  // ============================================================
  _buildDebugOverlay(mapData) {
    const g = this.add.graphics();
    const texts = [];

    mapData.obstacles.forEach((o) => {
      g.lineStyle(2, 0xff4d4d, 0.9);
      g.strokeRect(o.x, o.y, o.width, o.height);
    });

    mapData.portals.forEach((p) => {
      g.lineStyle(2, p.locked ? 0x888888 : 0x4dd2ff, 0.9);
      g.strokeRect(p.x, p.y, p.width, p.height);

      const label = p.locked ? 'ล็อก' : `→ ${p.target.mapKey}`;
      const t = this.add.text(p.x + p.width / 2, p.y + p.height / 2, label, {
        fontFamily: CONFIG.GAME.FONT_FAMILY,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      texts.push(t);
    });

    (mapData.healPoints || []).forEach((h) => {
      g.lineStyle(2, 0x4dff88, 0.9);
      g.strokeRect(h.x, h.y, h.width, h.height);
    });

    (mapData.dangerZones || []).forEach((z) => {
      g.lineStyle(2, 0xff9a3d, 0.9);
      g.strokeRect(z.x, z.y, z.width, z.height);
    });
    (mapData.wanderers || []).forEach((z) => {
      g.lineStyle(2, 0xc070ff, 0.9);
      g.strokeRect(z.x, z.y, z.width, z.height);
    });

    (ITEM_SPAWNS[mapData.key] || []).forEach((sp) => {
      g.lineStyle(2, 0xffe04d, 0.9);
      g.strokeRect(sp.x - CONFIG.ITEM.PICKUP_WIDTH / 2, sp.y - CONFIG.ITEM.PICKUP_HEIGHT / 2,
        CONFIG.ITEM.PICKUP_WIDTH, CONFIG.ITEM.PICKUP_HEIGHT);
    });

    this.debugContainer = this.add.container(0, 0, [g, ...texts]);
    this.debugContainer.setDepth(9999);
    this.debugContainer.setVisible(false);
  }
}
