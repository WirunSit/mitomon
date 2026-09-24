/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/CollectionScene.js
   ------------------------------------------------------------
   "สมุดสะสม" เหรียญตรา 5 อัน (กด B หรือปุ่มเหรียญมุมขวาบน)
   ได้แล้ว = ภาพเหรียญสี, ยังไม่ได้ = badge_locked + ความคืบหน้า
   ========================================================== */

class CollectionScene extends OverlayScene {
  constructor() {
    super('CollectionScene');
  }

  create() {
    const B = CONFIG.BADGES;
    const W = 1100;
    const H = 560;
    const f = this._buildFrame(W, H, 'สมุดสะสมเหรียญตรา', ['B']);
    const earned = BadgeSystem.earnedIds();
    const stats = StatsSystem.current();
    const step = (W - 160) / BADGES.length;
    BADGES.forEach((b, i) => {
      const x = f.left + 80 + step * (i + 0.5);
      const y = f.top + 250;
      const has = earned.indexOf(b.id) !== -1;
      const icon = this.add.image(x, y, has ? b.iconKey : 'ui_badge_locked');
      icon.setScale(B.BOOK_ICON_SIZE / icon.height);
      if (has) this.tweens.add({ targets: icon, scale: icon.scale * 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 150 });
      const name = this.add.text(x, y + 84, b.name, this._style(20, has ? '#2e8b57' : '#6a5a4a', true, { align: 'center' })).setOrigin(0.5, 0);
      const p = BadgeSystem.progress(b, stats);
      const target = b.type === 'topic' ? `${b.desc} ${CONFIG.BADGES.TOPIC_CORRECT_TARGET} ครั้ง` : b.desc;
      const descLines = TextUtil.wrapThai(target, TextUtil.fontString(15, false), step - 20).join('\n');
      const desc = this.add.text(x, y + 118, descLines, this._style(15, '#5a4a3a', false, { align: 'center' })).setOrigin(0.5, 0);
      const status = has ? 'ได้รับแล้ว ✓' : (b.type === 'topic' ? `ความคืบหน้า ${p.current}/${p.target}` : 'ยังไม่ได้รับ');
      const st = this.add.text(x, y + 190, status, this._style(16, has ? '#2e8b57' : '#b0603a', true, { align: 'center' })).setOrigin(0.5, 0);
      this.root.add([icon, name, desc, st]);
    });
    this.root.add(this.add.text(0, f.top + H - 70, `สะสมแล้ว ${earned.length} / ${BADGES.length} เหรียญ`,
      this._style(22, '#3a2a1f', true)).setOrigin(0.5));
  }
}
