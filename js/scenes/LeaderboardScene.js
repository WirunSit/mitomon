/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/LeaderboardScene.js
   ------------------------------------------------------------
   ตารางอันดับออนไลน์ 10 คนแรกของห้อง (กด T หรือปุ่มถ้วยมุมขวาบน)
   เรียงตามเลเวล แล้วตามอัตราตอบถูก (ฝั่ง Google Apps Script)
   ถ้าปิดใน config หรือเชื่อมต่อไม่ได้ จะแสดงข้อความแจ้ง เกมเล่นต่อได้ตามปกติ
   ========================================================== */

class LeaderboardScene extends OverlayScene {
  constructor() {
    super('LeaderboardScene');
  }

  create() {
    const profile = SaveSystem.loadPlayerProfile() || {};
    this.profile = profile;
    this.f = this._buildFrame(900, 620, `อันดับห้อง ${profile.room || ''}`, ['T']);
    const trophy = this.add.image(this.f.left + 110, this.f.top + 118, 'ui_trophy');
    trophy.setScale(70 / trophy.height);
    this.root.add(trophy);
    this.body = this.add.container(0, 0);
    this.root.add(this.body);
    this._load();
  }

  _msg(text, color) {
    this.body.removeAll(true);
    const lines = TextUtil.wrapThai(text, TextUtil.fontString(20, true), 700).join('\n');
    this.body.add(this.add.text(0, 0, lines, this._style(20, color || '#3a2a1f', true, { align: 'center' })).setOrigin(0.5));
  }

  _load() {
    if (!LeaderboardSystem.enabled()) {
      this._msg('ตารางอันดับออนไลน์ยังปิดอยู่\nครูเปิดได้ใน js/config.js (CONFIG.LEADERBOARD) ตามคู่มือ tools/LEADERBOARD_SETUP.md', '#6a5a4a');
      return;
    }
    this._msg('กำลังโหลดอันดับ...');
    LeaderboardSystem.fetchTop(this.profile.room).then((res) => {
      if (!this.scene.isActive()) return;
      if (!res.ok) {
        this._msg('เชื่อมต่อตารางอันดับไม่ได้ในตอนนี้ ลองใหม่ภายหลังนะ (เกมเล่นต่อได้ตามปกติ)', '#d9434f');
        const retry = this._button(0, 180, 220, 60, 'ui_btn_cream', 'ลองใหม่', () => this._load());
        this.body.add(retry);
        return;
      }
      this._table(res.rows);
    });
  }

  _table(rows) {
    this.body.removeAll(true);
    const top = this.f.top + 180;
    const cols = [
      { x: -340, t: 'อันดับ', a: 0.5 }, { x: -260, t: 'ชื่อ', a: 0 }, { x: 110, t: 'เลขที่', a: 0.5 },
      { x: 210, t: 'เลเวล', a: 0.5 }, { x: 320, t: 'ตอบถูก', a: 0.5 },
    ];
    cols.forEach((c) => this.body.add(this.add.text(c.x, top, c.t, this._style(18, '#2e8b57', true)).setOrigin(c.a, 0)));
    if (!rows.length) {
      this.body.add(this.add.text(0, top + 120, 'ยังไม่มีข้อมูลของห้องนี้', this._style(20, '#6a5a4a', true)).setOrigin(0.5));
      return;
    }
    const me = SaveSystem.playerId(this.profile);
    rows.slice(0, CONFIG.LEADERBOARD.TOP_N).forEach((r, i) => {
      const y = top + 36 + i * 34;
      const mine = r.playerId === me;
      if (mine) {
        const hl = this.add.rectangle(0, y + 14, 740, 32, 0xffe08a, 0.6);
        this.body.add(hl);
      }
      const vals = [String(i + 1), r.name, String(r.studentNumber || ''), `Lv.${r.level}`, `${r.accuracy}%`];
      vals.forEach((v, k) => this.body.add(this.add.text(cols[k].x, y, v, this._style(18, '#3a2a1f', mine || i < 3)).setOrigin(cols[k].a, 0)));
    });
  }
}
