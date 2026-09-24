/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/LeaderboardSystem.js
   ------------------------------------------------------------
   ส่งคะแนนไป Google Apps Script Web App (Google Sheets) และดึงอันดับ
   ตั้งค่าใน CONFIG.LEADERBOARD (ENABLED / URL / CLASS_KEY)
   โค้ดฝั่ง Google อยู่ที่ tools/leaderboard_apps_script.gs
   วิธีตั้งค่าทีละขั้น: tools/LEADERBOARD_SETUP.md

   ปลอดภัยต่อเกม: ทุกคำสั่งห่อ try/catch + timeout ถ้าส่งไม่สำเร็จ
   จะแค่ console.warn แล้วเกมเล่นต่อได้ตามปกติ
   ส่งแบบ Content-Type: text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script
   ========================================================== */

const LeaderboardSystem = {
  enabled() {
    const L = CONFIG.LEADERBOARD;
    return !!(L.ENABLED && L.URL);
  },

  _fetch(url, options) {
    const L = CONFIG.LEADERBOARD;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, L.TIMEOUT_MS);
    return fetch(url, Object.assign({}, options, ctrl ? { signal: ctrl.signal } : {}))
      .then((r) => r.json())
      .finally(() => clearTimeout(timer));
  },

  /** ส่งคะแนนผู้เล่นปัจจุบัน reason = 'levelup' | 'boss' | 'maxlevel' */
  submit(reason) {
    if (!this.enabled()) return Promise.resolve(false);
    try {
      const profile = SaveSystem.loadPlayerProfile();
      if (!profile || !profile.name) return Promise.resolve(false);
      const s = StatsSystem.current();
      const body = {
        action: 'submit',
        key: CONFIG.LEADERBOARD.CLASS_KEY,
        playerId: SaveSystem.playerId(profile),
        name: profile.name,
        studentNumber: profile.studentNumber,
        room: profile.room,
        level: s.level,
        accuracy: Math.round(s.rate * 1000) / 10,
        answered: s.answered,
        correct: s.correct,
        playMinutes: Math.round(s.playTimeMs / 60000),
        badges: s.badges.length,
        bossDefeated: s.bossDefeated,
        reason,
      };
      return this._fetch(CONFIG.LEADERBOARD.URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      }).then((res) => !!(res && res.ok)).catch((e) => {
        console.warn('[Leaderboard] ส่งคะแนนไม่สำเร็จ (เกมเล่นต่อได้ตามปกติ):', e);
        return false;
      });
    } catch (e) {
      console.warn('[Leaderboard] ส่งคะแนนไม่สำเร็จ:', e);
      return Promise.resolve(false);
    }
  },

  /** ดึงอันดับของห้อง คืน { ok, rows: [{rank,name,studentNumber,level,accuracy}], error } */
  fetchTop(room) {
    if (!this.enabled()) return Promise.resolve({ ok: false, error: 'disabled', rows: [] });
    try {
      const L = CONFIG.LEADERBOARD;
      const url = `${L.URL}?action=top&room=${encodeURIComponent(room || '')}&n=${L.TOP_N}&key=${encodeURIComponent(L.CLASS_KEY || '')}`;
      return this._fetch(url, { method: 'GET' })
        .then((res) => (res && res.ok ? { ok: true, rows: res.rows || [] } : { ok: false, error: (res && res.error) || 'bad', rows: [] }))
        .catch((e) => ({ ok: false, error: String(e), rows: [] }));
    } catch (e) {
      return Promise.resolve({ ok: false, error: String(e), rows: [] });
    }
  },
};
