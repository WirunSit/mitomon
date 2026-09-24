/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/DialogScene.js
   ------------------------------------------------------------
   กล่องคำพูดของ NPC (ครูเซลล์) ซ้อนบนแผนที่
   DialogScene.open(this, { speaker, title, lines: [...], portraitKey })
   ระหว่างเปิด ฉากที่เรียกจะถูก pause
   ปิดด้วยปุ่ม "เข้าใจแล้ว" / Enter / Space / E / Esc
   ========================================================== */

class DialogScene extends Phaser.Scene {
  constructor() {
    super('DialogScene');
  }

  static open(callerScene, options) {
    const game = callerScene.game;
    if (game.registry.get('modalOpen')) return Promise.resolve();
    return new Promise((resolve) => {
      const mgr = callerScene.scene;
      const key = callerScene.scene.key;
      game.registry.set('modalOpen', true);
      mgr.pause();
      mgr.launch('DialogScene', Object.assign({}, options, {
        onDone: () => {
          game.registry.set('modalOpen', false);
          mgr.resume(key);
          if (callerScene.input && callerScene.input.keyboard) callerScene.input.keyboard.resetKeys();
          resolve();
        },
      }));
      mgr.bringToTop('DialogScene');
    });
  }

  init(data) {
    this.opts = data || {};
    this.closing = false;
    this.ready = false;
  }

  _style(size, color, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY, fontSize: `${size}px`, color,
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  create() {
    const N = CONFIG.NPC;
    const Q = CONFIG.QUIZ_PANEL;
    const S = Q.PANEL_SLICE;
    const art = Q.PANEL_ART_SCALE;
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    const cx = WIDTH / 2;

    this.dim = this.add.rectangle(cx, HEIGHT / 2, WIDTH, HEIGHT, 0x0e0a1f, Q.DIM_ALPHA).setInteractive().setAlpha(0);
    this.tweens.add({ targets: this.dim, alpha: 1, duration: Q.OPEN_MS });

    this.root = this.add.container(cx, N.DIALOG_Y);
    const panel = this.add.nineslice(0, 0, 'ui_panel', null, N.DIALOG_WIDTH / art, N.DIALOG_HEIGHT / art,
      S.LEFT, S.RIGHT, S.TOP, S.BOTTOM).setScale(art);
    const top = -N.DIALOG_HEIGHT / 2;
    const left = -N.DIALOG_WIDTH / 2;
    const badge = this.add.image(0, top, 'ui_panel_badge').setOrigin(0.5, 0).setScale(art);
    this.root.add([panel, badge]);

    // ภาพครูด้านซ้าย (ยื่นออกนอกกรอบเล็กน้อย)
    const portrait = this.add.image(left + 120, N.DIALOG_HEIGHT / 2 - 40, this.opts.portraitKey || NPC_INFO.spriteKey).setOrigin(0.5, 1);
    portrait.setScale(N.PORTRAIT_HEIGHT / portrait.height);
    this.tweens.add({ targets: portrait, y: portrait.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.root.add(portrait);

    const textLeft = left + 240;
    const textW = N.DIALOG_WIDTH - 240 - 70;
    const title = this.add.text(textLeft, top + 96, `${this.opts.speaker || ''} : ${this.opts.title || ''}`,
      this._style(N.TITLE_FONT_SIZE, '#2e8b57', { fontStyle: 'bold' }));
    this.root.add(title);

    // ประโยคสรุป (มีจุดนำหน้า ตัดบรรทัดภาษาไทย + ตัวห้อยสูตรเคมี)
    const font = TextUtil.fontString(N.FONT_SIZE, false);
    const out = [];
    (this.opts.lines || []).forEach((line) => {
      const wrapped = TextUtil.wrapThai(TextUtil.formatChem(line), font, textW - 30);
      wrapped.forEach((w, i) => out.push((i === 0 ? '•  ' : '    ') + w));
    });
    const body = this.add.text(textLeft, top + 140, out.join('\n'), this._style(N.FONT_SIZE, '#3a2a1f', { lineSpacing: 6 }));
    this.root.add(body);

    // ปุ่มปิด
    const scale = Q.OK_BUTTON_HEIGHT / Q.CHOICE_NATIVE_HEIGHT * 0.8;
    const btn = this.add.container(N.DIALOG_WIDTH / 2 - 170, N.DIALOG_HEIGHT / 2 - 60);
    btn.add([
      this.add.nineslice(0, 0, 'ui_btn_green', null, Q.OK_BUTTON_WIDTH / scale * 0.8, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale),
      this.add.text(0, 0, 'เข้าใจแล้ว', this._style(22, '#1f3a2a', { fontStyle: 'bold' })).setOrigin(0.5),
    ]);
    btn.setSize(Q.OK_BUTTON_WIDTH * 0.8, Q.OK_BUTTON_HEIGHT * 0.8).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this._close());
    this.root.add(btn);

    this.root.setScale(0.9).setAlpha(0);
    this.tweens.add({
      targets: this.root, scale: 1, alpha: 1, duration: Q.OPEN_MS, ease: 'Back.easeOut',
      onComplete: () => { this.ready = true; },
    });
    this.input.keyboard.on('keydown', (e) => {
      if (['Enter', ' ', 'e', 'E', 'Escape'].indexOf(e.key) !== -1) this._close();
    });
    SoundFx.play(this, 'pickup');
  }

  _close() {
    if (!this.ready || this.closing) return;
    this.closing = true;
    SoundFx.play(this, 'click');
    const Q = CONFIG.QUIZ_PANEL;
    this.tweens.add({ targets: this.root, scale: 0.9, alpha: 0, duration: Q.CLOSE_MS });
    this.tweens.add({
      targets: this.dim, alpha: 0, duration: Q.CLOSE_MS,
      onComplete: () => {
        const done = this.opts.onDone;
        this.scene.stop();
        if (done) done();
      },
    });
  }
}
