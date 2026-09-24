/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/ReportScene.js
   ------------------------------------------------------------
   หน้าสรุปผลนักเรียน (กด R หรือปุ่มกราฟมุมขวาบน)
   - กราฟแท่งอัตราตอบถูกแยก 5 หัวข้อ
   - สรุปรวม (จำนวนข้อ อัตราถูก เลเวล เวลาเล่น ผลการต่อสู้ เหรียญ)
   - "หัวข้อที่ควรทบทวน" (ต่ำกว่า CONFIG.REPORT.REVIEW_THRESHOLD หรือยังไม่เคยตอบ)
   ========================================================== */

class ReportScene extends OverlayScene {
  constructor() {
    super('ReportScene');
  }

  create() {
    const R = CONFIG.REPORT;
    const profile = SaveSystem.loadPlayerProfile() || {};
    const f = this._buildFrame(R.PANEL_WIDTH, R.PANEL_HEIGHT, `สรุปผลการเรียนรู้ของ ${profile.name || 'ฉัน'}`, ['R']);
    const s = StatsSystem.current();
    this._chart(s);
    this._summary(s, f);
  }

  _chart(s) {
    const R = CONFIG.REPORT;
    const cx = CONFIG.GAME.WIDTH / 2;
    const cy = CONFIG.GAME.HEIGHT / 2;
    const x0 = R.CHART_X - cx;
    const y0 = R.CHART_Y - cy;
    const g = this.add.graphics();
    this.root.add(g);
    this.root.add(this.add.text(x0, y0 - 74, 'อัตราตอบถูกแยกตามหัวข้อ', this._style(20, '#2e8b57', true)));
    // เส้นตาราง 0/25/50/75/100%
    for (let k = 0; k <= 4; k++) {
      const y = y0 + R.CHART_HEIGHT - (R.CHART_HEIGHT * k) / 4;
      g.lineStyle(1, 0x8a7a6a, k === 0 ? 0.9 : 0.25);
      g.lineBetween(x0, y, x0 + R.CHART_WIDTH, y);
      this.root.add(this.add.text(x0 - 8, y, `${k * 25}%`, this._style(13, '#6a5a4a', false)).setOrigin(1, 0.5));
    }
    const slot = R.CHART_WIDTH / TOPIC_ORDER.length;
    const barW = slot * 0.56;
    TOPIC_ORDER.forEach((t, i) => {
      const b = s.byTopic[t];
      const bx = x0 + slot * i + (slot - barW) / 2;
      const rate = b.rate == null ? 0 : b.rate;
      const h = Math.max(2, R.CHART_HEIGHT * rate);
      const color = b.rate == null ? R.BAR_EMPTY_COLOR : (rate < R.REVIEW_THRESHOLD ? R.BAR_LOW_COLOR : R.BAR_COLOR);
      const bar = this.add.rectangle(bx, y0 + R.CHART_HEIGHT, barW, h, color).setOrigin(0, 1).setStrokeStyle(2, 0x3b261b);
      bar.scaleY = 0;
      this.tweens.add({ targets: bar, scaleY: 1, duration: 600, delay: i * 90, ease: 'Back.easeOut' });
      const label = b.rate == null ? 'ยังไม่ตอบ' : `${Math.round(rate * 100)}%\n(${b.correct}/${b.answered})`;
      const lt = this.add.text(bx + barW / 2, y0 + R.CHART_HEIGHT - h - 6, label, this._style(14, '#3a2a1f', true, { align: 'center' })).setOrigin(0.5, 1);
      const name = TextUtil.wrapThai(TOPIC_NAMES[t], TextUtil.fontString(14, true), slot - 6).join('\n');
      const nt = this.add.text(bx + barW / 2, y0 + R.CHART_HEIGHT + 8, name, this._style(14, '#3a2a1f', true, { align: 'center' })).setOrigin(0.5, 0);
      this.root.add([bar, lt, nt]);
    });
  }

  _summary(s, f) {
    const R = CONFIG.REPORT;
    const x = R.CHART_X + R.CHART_WIDTH + 70 - CONFIG.GAME.WIDTH / 2;
    const w = f.width / 2 - x - 70;
    let y = R.CHART_Y - 74 - CONFIG.GAME.HEIGHT / 2;
    const add = (txt, size, color, bold) => {
      const lines = TextUtil.wrapThai(TextUtil.formatChem(txt), TextUtil.fontString(size, bold), w).join('\n');
      const t = this.add.text(x, y, lines, this._style(size, color, bold, { lineSpacing: 4 }));
      this.root.add(t);
      y += t.height + 4;
    };
    add('สรุปรวม', 20, '#2e8b57', true);
    add(`ตอบทั้งหมด ${s.answered} ข้อ  ถูก ${s.correct} ข้อ (${StatsSystem.pct(s.answered ? s.rate : null)})`, 17, '#3a2a1f', false);
    add(`เลเวลสัตว์เลี้ยง Lv.${s.level}   เวลาเล่นรวม ${PlayTimeSystem.format(PlayTimeSystem.getMs())}`, 17, '#3a2a1f', false);
    add(`ต่อสู้ชนะ ${s.wins} ครั้ง  แพ้ ${s.losses} ครั้ง   เหรียญตรา ${s.badges.length}/${BADGES.length}`, 17, '#3a2a1f', false);
    y += 10;
    add('หัวข้อที่ควรทบทวน', 20, '#d9434f', true);
    const review = StatsSystem.reviewTopics(s);
    if (review.length === 0) {
      add('ยอดเยี่ยม! ทุกหัวข้อตอบถูกเกิน 70% แล้ว ลองเก็บเหรียญตราให้ครบนะ', 17, '#2e8b57', false);
      return;
    }
    review.slice(0, 4).forEach((r) => {
      const why = r.reason === 'none'
        ? 'ยังไม่เคยตอบ ลองไปโซนที่สอนหัวข้อนี้'
        : `ตอบถูก ${StatsSystem.pct(r.rate)} (${r.answered} ข้อ) คุยกับครูเซลล์ในโซนนั้นเพื่อทบทวน`;
      add(`• ${TOPIC_NAMES[r.topic]}: ${why}`, 16, '#3a2a1f', false);
    });
  }
}
