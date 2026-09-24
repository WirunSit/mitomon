/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/BootScene.js
   ------------------------------------------------------------
   ฉากแรกสุดของเกม มีหน้าที่:
   1) โหลดภาพจริงทั้งหมดที่เกมใช้ (ไม่มีระบบวาดภาพจำลองแล้ว)
      พร้อมหลอดโหลดภาษาไทย
      - เปิดผ่านเว็บ (http/https เช่น Live Server, GitHub Pages)
        -> โหลดจากไฟล์ในโฟลเดอร์ assets/ ตามปกติ
      - ดับเบิลคลิกเปิด index.html ตรง ๆ (file://)
        -> เบราว์เซอร์ห้ามโหลดไฟล์ภาพด้วย XHR จึงใช้ภาพที่ฝังไว้ใน
           js/assetBundle.js (window.MITOMON_ASSET_BUNDLE) แทน
           ภาพชุดเดียวกันทุกไฟล์ สร้างด้วย tools/build_asset_bundle.py
   2) (เฟส 8) ถ้ามีไฟล์ภาพที่หาไม่เจอ จะสร้าง "ภาพสำรอง" เฉพาะไฟล์นั้น
      (กรอบสี + ชื่อไฟล์) ให้เกมเล่นต่อได้ ภาพจริงที่มีอยู่ยังใช้ตามปกติ
      และแจ้งรายชื่อไฟล์ที่หายใน Console + ข้อความเตือนในหน้า Title
   3) รอฟอนต์ภาษาไทยจาก Google Fonts โหลดเสร็จก่อนเข้าเกม
      (ไม่เกิน CONFIG.BOOT.FONT_WAIT_MS) เพื่อให้วัดความกว้าง
      ข้อความสำหรับตัดบรรทัดได้ถูกต้อง

   เมื่อเพิ่ม asset ใหม่ในเฟสถัดไป ให้เพิ่มรายการใน ASSET_LIST
   แล้วรัน tools/build_asset_bundle.py ใหม่ (ถ้าต้องการเปิดแบบ file://)
   ========================================================== */

const PET_POSES = ['idle', 'blink', 'attack', 'hurt'];

/** รายการภาพทั้งหมด: { key, path } */
const ASSET_LIST = (() => {
  const list = [
    { key: 'player_down', path: 'assets/player/player_down.png' },
    { key: 'player_up', path: 'assets/player/player_up.png' },
    { key: 'player_side', path: 'assets/player/player_side.png' },
    { key: 'player_walk', path: 'assets/player/player_walk.png' },

    { key: 'map_farm', path: 'assets/maps/map_farm.png' },
    { key: 'map_zone1', path: 'assets/maps/map_zone1.png' },
    { key: 'map_zone2', path: 'assets/maps/map_zone2.png' },
    { key: 'map_zone3', path: 'assets/maps/map_zone3.png' },
    { key: 'map_zone4', path: 'assets/maps/map_zone4.png' },

    { key: 'ui_nest', path: 'assets/ui/nest.png' },
    { key: 'bg_hatch', path: 'assets/ui/bg_hatch.png' },
    { key: 'title_bg', path: 'assets/ui/title_bg.png' },
    { key: 'ui_logo', path: 'assets/ui/logo.png' },
    { key: 'ui_panel', path: 'assets/ui/panel_body.png' },
    { key: 'ui_panel_badge', path: 'assets/ui/panel_badge.png' },
    { key: 'ui_btn_cream', path: 'assets/ui/btn_cream.png' },
    { key: 'ui_btn_green', path: 'assets/ui/btn_green.png' },
    { key: 'ui_btn_red', path: 'assets/ui/btn_red.png' },
    { key: 'ui_icon_bag', path: 'assets/ui/icon_bag.png' },

    { key: 'fx_heart', path: 'assets/fx/fx_heart.png' },
    { key: 'fx_sparkle', path: 'assets/fx/fx_sparkle.png' },
    { key: 'fx_heal_ring', path: 'assets/fx/fx_heal_ring.png' },
    { key: 'fx_burst', path: 'assets/fx/fx_burst.png' },
    { key: 'fx_vortex', path: 'assets/fx/fx_vortex.png' },

    // เลเวลอัป / พัฒนาร่าง / ใบประกาศ (เฟส 5)
    { key: 'fx_evolve_glow', path: 'assets/fx/evolve_glow.png' },
    { key: 'fx_levelup_ring', path: 'assets/fx/levelup_ring.png' },
    { key: 'ui_levelup_banner', path: 'assets/ui/levelup_banner.png' },
    { key: 'ui_certificate_frame', path: 'assets/ui/certificate_frame.png' },

    // โลกเกม: บอส/NPC/ประตู/มินิแมป (เฟส 6)
    { key: 'map_boss', path: 'assets/maps/map_boss.png' },
    { key: 'npc_teacher_cell', path: 'assets/npc/teacher_cell.png' },
    { key: 'ui_portal', path: 'assets/ui/portal.png' },
    { key: 'ui_lock', path: 'assets/ui/lock.png' },
    { key: 'ui_minimap_icons', path: 'assets/ui/minimap_icons.png', frame: { w: 96, h: 96 } },

    // เหรียญตรา / รายงาน / อันดับ (เฟส 7)
    { key: 'ui_badge_1', path: 'assets/ui/badge_1.png' },
    { key: 'ui_badge_2', path: 'assets/ui/badge_2.png' },
    { key: 'ui_badge_3', path: 'assets/ui/badge_3.png' },
    { key: 'ui_badge_4', path: 'assets/ui/badge_4.png' },
    { key: 'ui_badge_5', path: 'assets/ui/badge_5.png' },
    { key: 'ui_badge_locked', path: 'assets/ui/badge_locked.png' },
    { key: 'ui_report_icon', path: 'assets/ui/report_icon.png' },
    { key: 'ui_trophy', path: 'assets/ui/trophy.png' },

    // จอยสัมผัส (เฟส 8)
    { key: 'ui_joystick_base', path: 'assets/ui/joystick_base.png' },
    { key: 'ui_joystick_knob', path: 'assets/ui/joystick_knob.png' },
    { key: 'ui_sound_on', path: 'assets/ui/sound_on.png' },
    { key: 'ui_sound_off', path: 'assets/ui/sound_off.png' },

    // ฉากต่อสู้ (เฟส 4)
    { key: 'bg_zone1', path: 'assets/battle/bg_zone1.png' },
    { key: 'bg_zone2', path: 'assets/battle/bg_zone2.png' },
    { key: 'bg_zone3', path: 'assets/battle/bg_zone3.png' },
    { key: 'bg_zone4', path: 'assets/battle/bg_zone4.png' },
    { key: 'bg_boss', path: 'assets/battle/bg_boss.png' },
  ];

  // มอนสเตอร์ (idle + hurt)
  MONSTERS.forEach((m) => {
    list.push({ key: m.idleKey, path: `assets/monsters/${m.idleKey}.png` });
    list.push({ key: m.hurtKey, path: `assets/monsters/${m.hurtKey}.png` });
  });

  // ไอเท็ม
  ITEMS.forEach((it) => list.push({ key: it.spriteKey, path: `assets/items/${it.spriteKey}.png` }));

  // ไข่ + ไข่ร้าว + สัตว์เลี้ยง 5 ตัว x 3 ร่าง x 4 ท่า
  PETS.forEach((pet) => {
    list.push({ key: `egg_${pet.id}`, path: `assets/eggs/egg_${pet.id}.png` });
    list.push({ key: `egg_${pet.id}_crack`, path: `assets/eggs/egg_${pet.id}_crack.png` });
    pet.forms.forEach((form) => {
      PET_POSES.forEach((pose) => {
        const key = `${pet.id}_f${form.stage}_${pose}`;
        list.push({ key, path: `assets/pets/${key}.png` });
      });
    });
  });
  return list;
})();

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  init() {
    this.failed = [];
    this.bundle = (typeof window !== 'undefined' && window.MITOMON_ASSET_BUNDLE) || null;
    this.isFileProtocol = window.location.protocol === 'file:';
  }

  preload() {
    this._createLoadingUI();

    // เปิดแบบ file:// -> ใช้ภาพที่ฝังไว้ (โหลดใน create)
    if (this.isFileProtocol) return;

    this.load.on('loaderror', (file) => this.failed.push(file.key));
    this.load.on('progress', (v) => this._setProgress(v));
    ASSET_LIST.forEach((a) => {
      if (a.frame) this.load.spritesheet(a.key, a.path, { frameWidth: a.frame.w, frameHeight: a.frame.h });
      else this.load.image(a.key, a.path);
    });
  }

  create() {
    const loadStep = this.isFileProtocol ? this._loadFromBundle() : Promise.resolve();
    loadStep
      .then(() => this._waitForFonts())
      .then(() => {
        if (this.failed.length > 0) this._makePlaceholders();
        this._destroyLoadingUI();
        AudioSystem.init(this.game);
        PetSystem.bindGame(this.game);
        SaveSystem.bindGame(this.game);
        BadgeSystem.bindGame(this.game);
        InventorySystem.bindGame(this.game);
        PlayTimeSystem.start();
        this.scene.start('TitleScene');
      });
  }

  // ============================================================
  // โหลดภาพจาก js/assetBundle.js (โหมด file://)
  // ============================================================
  _loadFromBundle() {
    if (!this.bundle) {
      console.error('[BootScene] ไม่พบ js/assetBundle.js สำหรับการเปิดแบบดับเบิลคลิก');
      this.failed = ASSET_LIST.map((a) => a.key);
      return Promise.resolve();
    }
    let done = 0;
    const total = ASSET_LIST.length;
    const jobs = ASSET_LIST.map((a) => new Promise((resolve) => {
      const data = this.bundle[a.path];
      const finish = () => { done += 1; this._setProgress(done / total); resolve(); };
      if (!data) { this.failed.push(a.key); finish(); return; }
      const img = new Image();
      img.onload = () => {
        if (!this.textures.exists(a.key)) {
          if (a.frame) this.textures.addSpriteSheet(a.key, img, { frameWidth: a.frame.w, frameHeight: a.frame.h });
          else this.textures.addImage(a.key, img);
        }
        finish();
      };
      img.onerror = () => { this.failed.push(a.key); finish(); };
      img.src = data;
    }));
    return Promise.all(jobs);
  }

  _waitForFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const fams = ['Kanit', 'Mali'];
    const loads = [];
    fams.forEach((f) => {
      loads.push(document.fonts.load(`400 24px "${f}"`, 'ทดสอบ'));
      loads.push(document.fonts.load(`bold 24px "${f}"`, 'ทดสอบ'));
    });
    const timeout = new Promise((r) => setTimeout(r, CONFIG.BOOT.FONT_WAIT_MS));
    return Promise.race([Promise.all(loads).catch(() => null), timeout]);
  }

  // ============================================================
  // UI หลอดโหลด (ภาษาไทย)
  // ============================================================
  _createLoadingUI() {
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const barW = 520;
    const barH = 28;
    this._bar = { x: WIDTH / 2 - barW / 2, y: HEIGHT / 2 + 20, w: barW, h: barH };

    this.cameras.main.setBackgroundColor(CONFIG.GAME.BACKGROUND_COLOR);

    this.loadingTitle = this.add.text(WIDTH / 2, HEIGHT / 2 - 70, 'MitoMon: ผจญภัยในเซลล์', {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '40px', fontStyle: 'bold', color: '#ffe08a',
      padding: { top: 8, bottom: 4 },
    }).setOrigin(0.5);

    this.loadingBoxOutline = this.add.graphics();
    this.loadingBoxOutline.lineStyle(3, 0xffe08a, 1);
    this.loadingBoxOutline.strokeRoundedRect(this._bar.x - 4, this._bar.y - 4, barW + 8, barH + 8, 10);

    this.loadingBar = this.add.graphics();

    this.loadingText = this.add.text(WIDTH / 2, this._bar.y + barH + 30, 'กำลังโหลด... 0%', {
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: '22px', color: '#ffffff',
      padding: { top: 6, bottom: 4 },
    }).setOrigin(0.5);
  }

  _setProgress(value) {
    const b = this._bar;
    this.loadingBar.clear();
    this.loadingBar.fillStyle(0xffe08a, 1);
    this.loadingBar.fillRoundedRect(b.x, b.y, Math.max(b.h, b.w * value), b.h, 8);
    this.loadingText.setText(`กำลังโหลด... ${Math.round(value * 100)}%`);
  }

  _destroyLoadingUI() {
    [this.loadingTitle, this.loadingBoxOutline, this.loadingBar, this.loadingText].forEach((o) => {
      if (o) o.destroy();
    });
  }

  // ============================================================
  // หน้าจอแจ้งไฟล์ภาพที่หาไม่เจอ
  // ============================================================
  // ============================================================
  // ภาพสำรองเฉพาะไฟล์ที่หาย (เฟส 8) — เกมเล่นต่อได้ ไม่พัง
  // ============================================================
  _placeholderSize(key) {
    const sizes = {
      title_bg: [1280, 720], bg_hatch: [1280, 720], ui_panel: [1359, 431], ui_panel_badge: [350, 122],
      ui_btn_cream: [436, 125], ui_btn_green: [436, 125], ui_btn_red: [436, 125], ui_nest: [1100, 404],
      ui_logo: [760, 264], ui_levelup_banner: [640, 174], ui_certificate_frame: [1100, 700],
      ui_minimap_icons: [576, 96], ui_joystick_base: [220, 220], ui_joystick_knob: [110, 110],
      npc_teacher_cell: [203, 400],
    };
    if (sizes[key]) return sizes[key];
    if (key.indexOf('map_') === 0) return [CONFIG.MAP.FARM.WIDTH, CONFIG.MAP.FARM.HEIGHT];
    if (key.indexOf('bg_') === 0) return [CONFIG.GAME.WIDTH, CONFIG.GAME.HEIGHT];
    if (key.indexOf('player_') === 0) return [112, 192];
    if (/^p\d_f\d_/.test(key) || /^m\d_|^boss_/.test(key)) return [256, 256];
    if (key.indexOf('egg_') === 0) return [180, 220];
    return [128, 128];
  }

  _makePlaceholders() {
    const byKey = {};
    ASSET_LIST.forEach((a) => { byKey[a.key] = a; });
    const missing = Array.from(new Set(this.failed));
    missing.forEach((key) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      const [w, h] = this._placeholderSize(key);
      let hash = 0;
      for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
      const color = Phaser.Display.Color.HSLToColor((hash % 360) / 360, 0.45, 0.6).color;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(color, key.indexOf('map_') === 0 || key.indexOf('bg_') === 0 ? 1 : 0.9);
      g.fillRoundedRect(2, 2, w - 4, h - 4, Math.min(24, w / 6, h / 6));
      g.lineStyle(4, 0x3b261b, 1);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, Math.min(24, w / 6, h / 6));
      const rt = this.make.renderTexture({ width: w, height: h }, false);
      rt.draw(g, 0, 0);
      const label = this.make.text({
        x: w / 2, y: h / 2, text: key,
        style: { fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${Math.max(12, Math.min(28, w / 8))}px`, color: '#2a1f14', align: 'center', wordWrap: { width: w - 10 } },
      }, false).setOrigin(0.5);
      rt.draw(label);
      rt.saveTexture(key);
      const a = byKey[key];
      if (a && a.frame) {
        const tex = this.textures.get(key);
        const n = Math.floor(w / a.frame.w);
        for (let i = 0; i < n; i++) tex.add(i, 0, i * a.frame.w, 0, a.frame.w, a.frame.h);
      }
      g.destroy();
      label.destroy();
    });
    this.registry.set('missingAssets', missing.map((k) => (byKey[k] ? byKey[k].path : k)));
    console.warn('[BootScene] ไฟล์ภาพหาย ใช้ภาพสำรองแทน:', this.registry.get('missingAssets'));
  }
}
