/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/InventoryScene.js
   ------------------------------------------------------------
   หน้าต่างกระเป๋า (เปิดด้วยปุ่ม I หรือแตะปุ่มกระเป๋ามุมขวาบน)
   - แสดงไอเท็มทุกชนิดพร้อมจำนวน แตะ/วางเมาส์ที่ช่องเพื่อดูคำอธิบาย
   - ปุ่ม "แลกยาฟื้นพลัง" ใช้กลูโคสครบ CONFIG.INVENTORY.POTION_GLUCOSE_COST ชิ้น
   - ปุ่ม "ใช้ยาฟื้นพลัง" ฟื้น HP สัตว์เลี้ยง CONFIG.INVENTORY.POTION_HEAL_HP
   ปิดด้วยปุ่ม ✕, กด I อีกครั้ง หรือ ESC
   ระหว่างเปิด ฉากแผนที่ (WorldScene) จะถูก pause

   เปิดจากที่อื่น: InventoryScene.open(this.game)
   ========================================================== */

class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  /** เปิดกระเป๋า (ไม่เปิดซ้อนถ้ามีหน้าต่างอื่นเปิดอยู่) */
  static open(game) {
    if (game.registry.get('modalOpen')) return false;
    const mgr = game.scene;
    if (!mgr.isActive('WorldScene')) return false;
    game.registry.set('modalOpen', true);
    mgr.pause('WorldScene');
    mgr.run('InventoryScene');
    mgr.bringToTop('InventoryScene');
    return true;
  }

  create() {
    const I = CONFIG.INVENTORY;
    const { WIDTH, HEIGHT, FONT_FAMILY } = CONFIG.GAME;
    const S = CONFIG.QUIZ_PANEL.PANEL_SLICE;
    this.closing = false;
    this.cx = WIDTH / 2;
    this.cy = HEIGHT / 2;
    this.font = FONT_FAMILY;

    this.dim = this.add.rectangle(this.cx, this.cy, WIDTH, HEIGHT, 0x0e0a1f, CONFIG.QUIZ_PANEL.DIM_ALPHA).setInteractive();
    this.dim.on('pointerup', (p, lx, ly, ev) => { if (ev) ev.stopPropagation(); });

    this.root = this.add.container(this.cx, this.cy);
    const panelTop = -I.PANEL_HEIGHT / 2;
    const art = CONFIG.QUIZ_PANEL.PANEL_ART_SCALE;
    const panel = this.add.nineslice(0, 0, 'ui_panel', null, I.PANEL_WIDTH / art, I.PANEL_HEIGHT / art,
      S.LEFT, S.RIGHT, S.TOP, S.BOTTOM).setScale(art);
    const badge = this.add.image(0, panelTop, 'ui_panel_badge').setOrigin(0.5, 0).setScale(art);
    const title = this.add.text(0, panelTop + I.TITLE_OFFSET_Y, 'กระเป๋าของฉัน', this._style(34, '#3a2a1f', true)).setOrigin(0.5);
    this.root.add([panel, badge, title]);

    // ปุ่มปิด
    const close = this.add.text(I.PANEL_WIDTH / 2 - I.CLOSE_OFFSET_X, panelTop + I.TITLE_OFFSET_Y, '✕', this._style(34, '#7a4a3a', true))
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this._close());
    this.root.add(close);

    this._buildSlots();

    this.descText = this.add.text(0, I.DESC_Y - this.cy, '', this._style(20, '#3a2a1f', false, { align: 'center' })).setOrigin(0.5);
    this.root.add(this.descText);

    this.craftBtn = this._makeButton(-I.BUTTON_WIDTH / 2 - 16, I.BUTTON_Y - this.cy, 'ui_btn_cream',
      `แลกยาฟื้นพลัง (กลูโคส ${I.POTION_GLUCOSE_COST} ชิ้น)`, () => this._craft());
    this.useBtn = this._makeButton(I.BUTTON_WIDTH / 2 + 16, I.BUTTON_Y - this.cy, 'ui_btn_green',
      `ใช้ยาฟื้นพลัง (+${I.POTION_HEAL_HP} HP)`, () => this._use());

    this._refresh();
    this._showDesc(null);

    this._onInv = () => this._refresh();
    this.game.events.on('inventory-changed', this._onInv);
    this.game.events.on('pet-changed', this._onInv);
    this.events.once('shutdown', () => {
      this.game.events.off('inventory-changed', this._onInv);
      this.game.events.off('pet-changed', this._onInv);
    });

    // กันปุ่ม I ที่ใช้เปิดกระเป๋า ถูกนับเป็นการกดปิดทันทีในเฟรมเดียวกัน
    this.keysReady = false;
    this.time.delayedCall(I.OPEN_MS, () => { this.keysReady = true; });
    this.input.keyboard.on('keydown-I', () => { if (this.keysReady) this._close(); });
    this.input.keyboard.on('keydown-ESC', () => { if (this.keysReady) this._close(); });

    this.root.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: I.OPEN_MS, ease: 'Back.easeOut' });
  }

  _style(size, color, bold, extra) {
    return Object.assign({
      fontFamily: this.font, fontSize: `${size}px`, color,
      fontStyle: bold ? 'bold' : 'normal',
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  _buildSlots() {
    const I = CONFIG.INVENTORY;
    const cols = I.SLOT_COLUMNS;
    const totalW = cols * I.SLOT_SIZE + (cols - 1) * I.SLOT_GAP;
    this.slots = {};
    ITEMS.forEach((it, i) => {
      const x = -totalW / 2 + I.SLOT_SIZE / 2 + (i % cols) * (I.SLOT_SIZE + I.SLOT_GAP);
      const y = I.SLOT_ROW_Y - this.cy + Math.floor(i / cols) * (I.SLOT_SIZE + I.SLOT_GAP);
      const c = this.add.container(x, y);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.8);
      bg.fillRoundedRect(-I.SLOT_SIZE / 2, -I.SLOT_SIZE / 2, I.SLOT_SIZE, I.SLOT_SIZE, 18);
      bg.lineStyle(3, 0x8fcfa8, 1);
      bg.strokeRoundedRect(-I.SLOT_SIZE / 2, -I.SLOT_SIZE / 2, I.SLOT_SIZE, I.SLOT_SIZE, 18);
      const icon = this.add.image(0, -10, it.spriteKey);
      icon.setScale(I.ICON_SIZE / Math.max(icon.width, icon.height));
      const count = this.add.text(I.SLOT_SIZE / 2 - 10, I.SLOT_SIZE / 2 - 6, '0',
        this._style(22, '#ffffff', true, { stroke: '#3a2a1f', strokeThickness: 5 })).setOrigin(1, 1);
      const name = this.add.text(0, I.SLOT_SIZE / 2 + 16, it.name, this._style(17, '#3a2a1f', true)).setOrigin(0.5);
      c.add([bg, icon, count, name]);
      c.setSize(I.SLOT_SIZE, I.SLOT_SIZE).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => this._showDesc(it));
      c.on('pointerup', () => this._showDesc(it));
      c.on('pointerout', () => this._showDesc(null));
      this.root.add(c);
      this.slots[it.id] = { container: c, icon, count };
    });
  }

  _makeButton(x, y, key, label, onClick) {
    const I = CONFIG.INVENTORY;
    const Q = CONFIG.QUIZ_PANEL;
    const scale = I.BUTTON_HEIGHT / Q.CHOICE_NATIVE_HEIGHT;
    const c = this.add.container(x, y);
    const bg = this.add.nineslice(0, 0, key, null, I.BUTTON_WIDTH / scale, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale);
    const txt = this.add.text(0, 0, label, this._style(19, '#3a2a1f', true)).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(I.BUTTON_WIDTH, I.BUTTON_HEIGHT).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => { if (c.enabled) onClick(); });
    c.on('pointerdown', () => { if (c.enabled) this.tweens.add({ targets: c, scale: 0.95, duration: 70, yoyo: true }); });
    c.enabled = true;
    this.root.add(c);
    return c;
  }

  _setEnabled(btn, on) {
    btn.enabled = on;
    btn.setAlpha(on ? 1 : 0.45);
  }

  _refresh() {
    const all = InventorySystem.getAll();
    ITEMS.forEach((it) => {
      const s = this.slots[it.id];
      const n = all[it.id] || 0;
      s.count.setText(String(n));
      s.icon.setAlpha(n > 0 ? 1 : 0.35);
    });
    this._setEnabled(this.craftBtn, InventorySystem.canCraftPotion());
    this._setEnabled(this.useBtn, InventorySystem.canUsePotion());
  }

  _showDesc(item) {
    if (item) {
      this.descText.setText(TextUtil.wrapThai(item.description, TextUtil.fontString(20, false), CONFIG.INVENTORY.PANEL_WIDTH - 200).join('\n'));
      return;
    }
    const glucose = InventorySystem.count('item_glucose');
    const cost = CONFIG.INVENTORY.POTION_GLUCOSE_COST;
    const need = Math.max(0, cost - glucose);
    this.descText.setText(InventorySystem.canCraftPotion()
      ? 'มีกลูโคสพอแลกยาฟื้นพลังแล้ว! กดปุ่มด้านล่างได้เลย'
      : `เก็บกลูโคสอีก ${need} ชิ้น จะแลกยาฟื้นพลังได้ 1 ขวด`);
  }

  _craft() {
    if (!InventorySystem.craftPotion()) return;
    SoundFx.play(this, 'pickup');
    const s = this.slots.item_potion;
    this.tweens.add({ targets: s.container, scale: 1.15, duration: 140, yoyo: true, ease: 'Back.easeOut' });
    this.game.events.emit('notify', 'แลกยาฟื้นพลังสำเร็จ! (+1 ขวด)');
    this._showDesc(null);
  }

  _use() {
    const healed = InventorySystem.usePotion();
    if (healed <= 0) return;
    SoundFx.play(this, 'correct');
    this.game.events.emit('notify', `${PetSystem.getDisplayName()} ฟื้นพลัง +${healed} HP`);
  }

  _close() {
    if (this.closing) return;
    this.closing = true;
    this.tweens.add({
      targets: this.root, scale: 0.9, alpha: 0, duration: CONFIG.INVENTORY.OPEN_MS,
      onComplete: () => {
        this.game.registry.set('modalOpen', false);
        const world = this.scene.get('WorldScene');
        this.scene.resume('WorldScene');
        if (world && world.input && world.input.keyboard) world.input.keyboard.resetKeys();
        this.scene.stop();
      },
    });
  }
}
