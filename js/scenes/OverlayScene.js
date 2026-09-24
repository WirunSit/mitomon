/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/OverlayScene.js
   ------------------------------------------------------------
   คลาสฐานของหน้าต่างซ้อน (เฟส 7): สมุดสะสม, สรุปผล, อันดับ, โหมดครู
   - OverlayScene.openOver(game, key, pauseKey, data)
       pause ฉาก pauseKey (เช่น WorldScene / TitleScene) แล้วเปิดหน้าต่าง
   - มีตัวช่วยสร้างกรอบ UI จริง (panel_body + ป้ายไมโทคอนเดรีย) ปุ่ม และข้อความ
   - ปิดด้วยปุ่ม ✕ / Esc / ปุ่มลัดเดิม แล้ว resume ฉากเดิม
   ========================================================== */

class OverlayScene extends Phaser.Scene {
  static openOver(game, key, pauseKey, data) {
    if (game.registry.get('modalOpen')) return false;
    const mgr = game.scene;
    if (pauseKey && !mgr.isActive(pauseKey)) return false;
    game.registry.set('modalOpen', true);
    if (pauseKey) mgr.pause(pauseKey);
    mgr.run(key, Object.assign({ pauseKey }, data || {}));
    mgr.bringToTop(key);
    return true;
  }

  init(data) {
    this.opts = data || {};
    this.closing = false;
    this.openedAt = 0;
  }

  _style(size, color, bold, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal',
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  /** ฉากหลังมืด + กรอบ + หัวข้อ + ปุ่มปิด คืน { root, top, left, width, height } (พิกัด local รอบกึ่งกลางจอ) */
  _buildFrame(width, height, title, closeKeys) {
    const Q = CONFIG.QUIZ_PANEL;
    const S = Q.PANEL_SLICE;
    const art = Q.PANEL_ART_SCALE;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    this.dim = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, Q.DIM_ALPHA).setInteractive();
    this.root = this.add.container(WIDTH / 2, HEIGHT / 2);
    const top = -height / 2;
    const left = -width / 2;
    this.root.add(this.add.nineslice(0, 0, 'ui_panel', null, width / art, height / art, S.LEFT, S.RIGHT, S.TOP, S.BOTTOM).setScale(art));
    this.root.add(this.add.image(0, top, 'ui_panel_badge').setOrigin(0.5, 0).setScale(art));
    this.root.add(this.add.text(0, top + 118, title, this._style(30, '#3a2a1f', true)).setOrigin(0.5));
    const close = this.add.text(width / 2 - 80, top + 118, '✕', this._style(32, '#7a4a3a', true)).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this._close());
    this.root.add(close);
    this.root.setScale(0.92).setAlpha(0);
    this.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: CONFIG.INVENTORY.OPEN_MS, ease: 'Back.easeOut' });
    // กันปุ่มที่ใช้เปิดหน้าต่างถูกนับเป็นการกดปิดทันที (ใช้เวลาจริง ไม่ขึ้นกับนาฬิกาฉาก)
    this.openedAt = Date.now();
    this.input.keyboard.on('keydown', (e) => {
      if (Date.now() - this.openedAt < CONFIG.INVENTORY.OPEN_MS) return;
      if (e.key === 'Escape' || (closeKeys || []).indexOf(e.key.toUpperCase()) !== -1) this._close();
    });
    return { top, left, width, height };
  }

  _button(x, y, w, h, key, label, onPress, fontSize) {
    const Q = CONFIG.QUIZ_PANEL;
    const scale = h / Q.CHOICE_NATIVE_HEIGHT;
    const c = this.add.container(x, y);
    const txt = this.add.text(0, 0, label, this._style(fontSize || 20, '#2a1f14', true)).setOrigin(0.5);
    c.add([this.add.nineslice(0, 0, key, null, w / scale, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale), txt]);
    c.txt = txt;
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => { SoundFx.play(this, 'click'); onPress(); });
    c.on('pointerover', () => c.setScale(1.04));
    c.on('pointerout', () => c.setScale(1));
    this.root.add(c);
    return c;
  }

  _close() {
    if (this.closing) return;
    this.closing = true;
    this.tweens.add({
      targets: this.root, scale: 0.92, alpha: 0, duration: CONFIG.INVENTORY.OPEN_MS,
      onComplete: () => {
        this.game.registry.set('modalOpen', false);
        const key = this.opts.pauseKey;
        if (key) {
          this.scene.resume(key);
          const s = this.scene.get(key);
          if (s && s.input && s.input.keyboard) s.input.keyboard.resetKeys();
          if (s && s.onOverlayClosed) s.onOverlayClosed();
        }
        this.scene.stop();
      },
    });
  }
}
