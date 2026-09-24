/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/PlayTimeSystem.js
   ------------------------------------------------------------
   นับ "เวลาเล่นรวม" ของผู้เล่น (ใช้ในใบประกาศเลเวลเต็ม)
   - นับเฉพาะตอนแท็บเกมเปิดอยู่ (document.hidden = ไม่นับ)
   - บันทึกลง SaveSystem (game.playTimeMs) ทุก CONFIG.PLAYTIME.TICK_MS
   ========================================================== */

const PlayTimeSystem = {
  _total: null,
  _last: 0,
  _timer: null,

  _ensureLoaded() {
    if (this._total != null) return;
    const g = SaveSystem.loadGame();
    this._total = (g && g.playTimeMs) || 0;
  },

  start() {
    this._ensureLoaded();
    this._last = Date.now();
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), CONFIG.PLAYTIME.TICK_MS);
    document.addEventListener('visibilitychange', () => { this._last = Date.now(); });
  },

  _tick() {
    const now = Date.now();
    const dt = Math.min(CONFIG.PLAYTIME.MAX_TICK_MS, now - this._last);
    this._last = now;
    if (document.hidden || !PetSystem.current) return;
    this._ensureLoaded();
    this._total += dt;
    SaveSystem.saveGame({ playTimeMs: this._total });
  },

  getMs() {
    this._ensureLoaded();
    return this._total;
  },

  /** ข้อความภาษาไทย เช่น "1 ชั่วโมง 25 นาที" */
  format(ms) {
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h} ชั่วโมง ${m} นาที` : `${m} นาที`;
  },

  reset() {
    this._total = 0;
    this._last = Date.now();
  },
};
