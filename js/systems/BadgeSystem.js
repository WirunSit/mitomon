/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/BadgeSystem.js
   ------------------------------------------------------------
   ตรวจ/มอบเหรียญตรา (js/data/badges.js) บันทึกใน game.badges
   BadgeSystem.checkAll() -> คืนรายการเหรียญที่เพิ่งได้ และเก็บไว้ใน
   pending ให้ UIScene แสดงป้ายเด้ง (UIScene อาจยังไม่เปิด/กำลังหลับ
   ระหว่างต่อสู้ จึงเก็บเป็นคิวไว้ก่อน) + ยิงอีเวนต์ 'badge-earned'
   ========================================================== */

const BadgeSystem = {
  pending: [],
  _game: null,

  bindGame(game) {
    this._game = game;
  },

  earnedIds() {
    const g = SaveSystem.loadGame();
    return g && Array.isArray(g.badges) ? g.badges.slice() : [];
  },

  /** ความคืบหน้าของเหรียญ { done, current, target } */
  progress(badge, stats) {
    const s = stats || StatsSystem.current();
    if (badge.type === 'hatch') return { done: !!PetSystem.current || !!s.speciesId, current: s.speciesId ? 1 : 0, target: 1 };
    if (badge.type === 'boss') return { done: s.bossDefeated, current: s.bossDefeated ? 1 : 0, target: 1 };
    const t = CONFIG.BADGES.TOPIC_CORRECT_TARGET;
    const c = s.byTopic[badge.topic] ? s.byTopic[badge.topic].correct : 0;
    return { done: c >= t, current: Math.min(c, t), target: t };
  },

  checkAll() {
    if (!SaveSystem.loadGame()) return [];
    const earned = this.earnedIds();
    const stats = StatsSystem.current();
    const fresh = BADGES.filter((b) => earned.indexOf(b.id) === -1 && this.progress(b, stats).done);
    if (fresh.length === 0) return [];
    SaveSystem.saveGame({ badges: earned.concat(fresh.map((b) => b.id)) });
    fresh.forEach((b) => this.pending.push(b));
    if (this._game) this._game.events.emit('badge-earned');
    return fresh;
  },

  takePending() {
    const out = this.pending.slice();
    this.pending.length = 0;
    return out;
  },
};
