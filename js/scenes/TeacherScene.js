/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/TeacherScene.js
   ------------------------------------------------------------
   โหมดครู (ปุ่ม "โหมดครู" มุมล่างขวาของหน้า Title)
   1) ใส่รหัสผ่าน (CONFIG.TEACHER.PASSWORD)
   2) ตารางผู้เล่นทุกคนที่บันทึกในเครื่องนี้ (แบ่งหน้า)
      ชื่อ เลขที่ ห้อง เลเวล อัตราถูกรวม อัตราถูก 5 หัวข้อ เวลาเล่น
   3) ปุ่ม "ส่งออก CSV" (มี BOM ให้ Excel อ่านภาษาไทยได้)
   4) ปุ่ม "ข้อที่ผิดบ่อย" = 5 ข้อที่ผู้เล่นทุกคนตอบผิดบ่อยที่สุด
   ========================================================== */

class TeacherScene extends OverlayScene {
  constructor() {
    super('TeacherScene');
  }

  create() {
    this.f = this._buildFrame(1200, 680, 'โหมดครู', []);
    this.body = this.add.container(0, 0);
    this.root.add(this.body);
    this._askPassword();
  }

  // ---------------- รหัสผ่าน ----------------
  _askPassword() {
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    this.body.add(this.add.text(0, -60, 'กรอกรหัสผ่านโหมดครู', this._style(22, '#3a2a1f', true)).setOrigin(0.5));
    this.pw = this.add.dom(WIDTH / 2, HEIGHT / 2, 'input');
    this.pw.node.setAttribute('type', 'password');
    this.pw.node.setAttribute('placeholder', 'รหัสผ่าน');
    this.pw.node.className = 'mitomon-input';
    this.pw.updateSize();
    this.pw.node.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._checkPassword(); });
    this.pwError = this.add.text(0, 50, '', this._style(17, '#d9434f', true)).setOrigin(0.5);
    this.body.add(this.pwError);
    this.body.add(this._button(0, 120, 220, 60, 'ui_btn_green', 'เข้าสู่โหมดครู', () => this._checkPassword()));
    this.time.delayedCall(300, () => { if (this.pw && this.pw.node) this.pw.node.focus(); });
  }

  _checkPassword() {
    if (!this.pw) return;
    if (this.pw.node.value !== CONFIG.TEACHER.PASSWORD) {
      this.pwError.setText('รหัสผ่านไม่ถูกต้อง');
      return;
    }
    this.pw.destroy();
    this.pw = null;
    this.players = SaveSystem.allPlayersRaw()
      .filter((p) => p.profile && p.profile.name)
      .map((p) => Object.assign(p, { stats: StatsSystem.compute(p.game) }))
      .sort((a, b) => String(a.profile.room).localeCompare(String(b.profile.room), 'th')
        || (parseInt(a.profile.studentNumber, 10) || 0) - (parseInt(b.profile.studentNumber, 10) || 0));
    this.page = 0;
    this.view = 'table';
    this._render();
  }

  _close() {
    if (this.pw) { this.pw.destroy(); this.pw = null; }
    super._close();
  }

  // ---------------- แดชบอร์ด ----------------
  _render() {
    this.body.removeAll(true);
    const top = this.f.top;
    const bottomY = this.f.height / 2 - 62;
    this.body.add(this._button(-360, bottomY, 250, 58, 'ui_btn_green', 'ส่งออก CSV', () => this._exportCsv(), 19));
    this.body.add(this._button(-80, bottomY, 270, 58, 'ui_btn_cream',
      this.view === 'table' ? '5 ข้อที่ผิดบ่อย' : 'กลับไปตารางผู้เล่น', () => {
        this.view = this.view === 'table' ? 'wrong' : 'table';
        this._render();
      }, 19));
    if (this.view === 'table') this._renderTable(top + 160, bottomY);
    else this._renderWrong(top + 160);
  }

  _renderTable(y0, bottomY) {
    const T = CONFIG.TEACHER;
    const cols = [
      { k: 'name', t: 'ชื่อ', x: -540, a: 0 }, { k: 'no', t: 'เลขที่', x: -290, a: 0.5 }, { k: 'room', t: 'ห้อง', x: -220, a: 0.5 },
      { k: 'lv', t: 'Lv', x: -160, a: 0.5 }, { k: 'all', t: 'ถูกรวม', x: -90, a: 0.5 },
    ];
    TOPIC_ORDER.forEach((t, i) => cols.push({ k: t, t: TOPIC_NAMES[t].replace('ระบบถ่ายทอดอิเล็กตรอน', 'ถ่ายทอดอิเล็กฯ'), x: -5 + i * 95, a: 0.5 }));
    cols.push({ k: 'time', t: 'เวลาเล่น', x: 490, a: 0.5 });
    cols.forEach((c) => this.body.add(this.add.text(c.x, y0, c.t, this._style(15, '#2e8b57', true)).setOrigin(c.a, 0)));
    if (!this.players.length) {
      this.body.add(this.add.text(0, y0 + 120, 'ยังไม่มีข้อมูลผู้เล่นในเครื่องนี้', this._style(20, '#6a5a4a', true)).setOrigin(0.5));
      return;
    }
    const pages = Math.ceil(this.players.length / T.ROWS_PER_PAGE);
    this.page = Math.min(this.page, pages - 1);
    const rows = this.players.slice(this.page * T.ROWS_PER_PAGE, (this.page + 1) * T.ROWS_PER_PAGE);
    rows.forEach((p, i) => {
      const y = y0 + 32 + i * 34;
      if (i % 2 === 0) this.body.add(this.add.rectangle(0, y + 13, 1110, 32, 0xe9dcc4, 0.6));
      const s = p.stats;
      const v = {
        name: p.profile.name.length > 20 ? `${p.profile.name.slice(0, 19)}…` : p.profile.name,
        no: p.profile.studentNumber, room: p.profile.room, lv: String(s.level),
        all: StatsSystem.pct(s.answered ? s.rate : null), time: PlayTimeSystem.format(s.playTimeMs),
      };
      TOPIC_ORDER.forEach((t) => {
        const b = s.byTopic[t];
        v[t] = StatsSystem.pct(b.rate);
        v[`${t}_low`] = b.rate != null && b.answered >= CONFIG.REPORT.MIN_ANSWERS && b.rate < CONFIG.REPORT.REVIEW_THRESHOLD;
      });
      cols.forEach((c) => this.body.add(this.add.text(c.x, y, String(v[c.k] || '-'), this._style(15, v[`${c.k}_low`] ? '#d9434f' : '#3a2a1f', c.k === 'name'))
        .setOrigin(c.a, 0)));
    });
    // แบ่งหน้า
    const info = `หน้า ${this.page + 1}/${pages}  (ผู้เล่น ${this.players.length} คน • ตัวแดง = ต่ำกว่า ${Math.round(CONFIG.REPORT.REVIEW_THRESHOLD * 100)}%)`;
    this.body.add(this.add.text(300, bottomY, info, this._style(15, '#5a4a3a', false)).setOrigin(0.5));
    if (this.page > 0) this.body.add(this._button(140, bottomY - 44, 90, 40, 'ui_btn_cream', '◀', () => { this.page -= 1; this._render(); }, 16));
    if (this.page < pages - 1) this.body.add(this._button(460, bottomY - 44, 90, 40, 'ui_btn_cream', '▶', () => { this.page += 1; this._render(); }, 16));
  }

  _renderWrong(y0) {
    const list = StatsSystem.topWrongQuestions(this.players.map((p) => p.game), CONFIG.TEACHER.TOP_WRONG_COUNT);
    this.body.add(this.add.text(0, y0, `${CONFIG.TEACHER.TOP_WRONG_COUNT} ข้อที่ผู้เล่นทุกคนตอบผิดบ่อยที่สุด`, this._style(20, '#d9434f', true)).setOrigin(0.5, 0));
    if (!list.length) {
      this.body.add(this.add.text(0, y0 + 120, 'ยังไม่มีข้อที่ตอบผิด', this._style(20, '#6a5a4a', true)).setOrigin(0.5));
      return;
    }
    let y = y0 + 44;
    list.forEach((q, i) => {
      const head = `${i + 1}. ข้อ ${q.id} (${TOPIC_NAMES[q.topic] || q.topic})  ผิด ${q.wrong} จาก ${q.attempts} ครั้ง (${Math.round((q.wrong / q.attempts) * 100)}%)`;
      this.body.add(this.add.text(-520, y, head, this._style(17, '#2e5e9a', true)));
      const text = TextUtil.wrapThai(TextUtil.formatChem(q.text), TextUtil.fontString(17, false), 1020).join('\n');
      const t = this.add.text(-500, y + 28, text, this._style(17, '#3a2a1f', false));
      this.body.add(t);
      y += 36 + t.height;
    });
  }

  // ---------------- CSV ----------------
  _exportCsv() {
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const pct = (r) => (r == null ? '' : Math.round(r * 1000) / 10);
    const header = ['ชื่อ', 'เลขที่', 'ห้อง', 'เลเวล', 'จำนวนข้อที่ตอบ', 'อัตราถูกรวม(%)']
      .concat(TOPIC_ORDER.map((t) => `${TOPIC_NAMES[t]}(%)`))
      .concat(['เวลาเล่น(นาที)', 'เหรียญตรา', 'ชนะบอส']);
    const lines = [header.map(esc).join(',')];
    this.players.forEach((p) => {
      const s = p.stats;
      const row = [p.profile.name, p.profile.studentNumber, p.profile.room, s.level, s.answered, s.answered ? pct(s.rate) : '']
        .concat(TOPIC_ORDER.map((t) => pct(s.byTopic[t].rate)))
        .concat([Math.round(s.playTimeMs / 60000), s.badges.length, s.bossDefeated ? 'ใช่' : 'ไม่']);
      lines.push(row.map(esc).join(','));
    });
    const csv = '\uFEFF' + lines.join('\r\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = CONFIG.TEACHER.CSV_FILE_NAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.warn('[Teacher] ส่งออก CSV ไม่สำเร็จ:', e);
    }
  }
}
