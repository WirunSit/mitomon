/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/SaveSystem.js
   ------------------------------------------------------------
   ระบบบันทึก/โหลดข้อมูลผ่าน localStorage (เฟส 6: แยกตามผู้เล่น)

   โครงสร้างใน localStorage (CONFIG.SAVE.STORAGE_KEY):
   {
     lastPlayerId: 'สมหญิง ใจดี|ม.4/3|12',
     players: {
       '<playerId>': { profile: {name, studentNumber, room}, game: {...}, updatedAt }
     }
   }
   playerId = ชื่อ|ห้อง|เลขที่ -> เครื่องเดียวใช้ได้หลายคน ชื่อซ้ำต่างห้องก็ไม่ชนกัน

   ทุกคำสั่ง localStorage ห่อด้วย try/catch ถ้าเบราว์เซอร์ห้ามบันทึก
   (เช่นโหมดไม่ระบุตัวตน/พื้นที่เต็ม) เกมยังเล่นต่อได้ด้วยข้อมูลในหน่วยความจำ
   และแจ้งเตือนผู้เล่น 1 ครั้ง

   API เดิม (ใช้กับ "ผู้เล่นปัจจุบัน"):
     savePlayerProfile, loadPlayerProfile, saveGame, loadGame, clearGame, clearAll
   API ใหม่:
     setCurrentPlayer(profile), listPlayers(), hasSave(profile),
     deletePlayer(profile), autoSave(reason, extra), bindGame(game)
   ========================================================== */

const SaveSystem = {
  _memory: null,       // สำเนาในหน่วยความจำ (ใช้ต่อได้แม้ localStorage ใช้ไม่ได้)
  _currentId: null,
  _game: null,
  _warned: false,

  bindGame(game) {
    this._game = game;
  },

  playerId(profile) {
    const p = profile || {};
    return [p.name, p.room, p.studentNumber].map((v) => String(v || '').trim().replace(/\s+/g, ' ')).join('|');
  },

  // ---------------- อ่าน/เขียน localStorage (ห่อ try/catch ทุกคำสั่ง) ----------------
  _storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      this._warn(e);
      return null;
    }
  },

  _storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      this._warn(e);
      return false;
    }
  },

  _storageRemove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (e) {
      this._warn(e);
      return false;
    }
  },

  _warn(e) {
    console.warn('[SaveSystem] ใช้งาน localStorage ไม่ได้:', e);
    if (!this._warned && this._game) {
      this._warned = true;
      this._game.events.emit('notify', 'บันทึกลงเครื่องไม่ได้ (ความคืบหน้าจะหายเมื่อปิดหน้าเว็บ)');
    }
  },

  _readAll() {
    if (this._memory) return this._memory;
    let data = null;
    const raw = this._storageGet(CONFIG.SAVE.STORAGE_KEY);
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.warn('[SaveSystem] ข้อมูลบันทึกเสียหาย เริ่มใหม่:', e);
      }
    }
    if (!data || typeof data !== 'object') data = {};
    if (!data.players) data.players = {};
    this._migrateLegacy(data);
    this._memory = data;
    if (!this._currentId && data.lastPlayerId && data.players[data.lastPlayerId]) this._currentId = data.lastPlayerId;
    return data;
  },

  _writeAll() {
    const data = this._readAll();
    try {
      return this._storageSet(CONFIG.SAVE.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      this._warn(e);
      return false;
    }
  },

  /** ย้ายเซฟรูปแบบเก่า (เฟส 1-5) เข้าระบบแยกผู้เล่น */
  _migrateLegacy(data) {
    const raw = this._storageGet(CONFIG.SAVE.LEGACY_KEY);
    if (!raw) return;
    try {
      const old = JSON.parse(raw);
      if (old && old.profile && old.profile.name) {
        const id = this.playerId(old.profile);
        if (!data.players[id]) {
          data.players[id] = { profile: old.profile, game: old.game || {}, updatedAt: Date.now() };
          data.lastPlayerId = data.lastPlayerId || id;
        }
      }
    } catch (e) {
      console.warn('[SaveSystem] ย้ายเซฟเก่าไม่สำเร็จ:', e);
    }
    this._storageRemove(CONFIG.SAVE.LEGACY_KEY);
    try {
      this._storageSet(CONFIG.SAVE.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      this._warn(e);
    }
  },

  _slot(create) {
    const data = this._readAll();
    if (!this._currentId) return null;
    if (!data.players[this._currentId] && create) {
      data.players[this._currentId] = { profile: {}, game: {}, updatedAt: Date.now() };
    }
    return data.players[this._currentId] || null;
  },

  // ---------------- ผู้เล่น ----------------
  /** เลือกผู้เล่นปัจจุบัน (สร้างช่องบันทึกใหม่ถ้ายังไม่มี) */
  setCurrentPlayer(profile) {
    const data = this._readAll();
    this._currentId = this.playerId(profile);
    const slot = this._slot(true);
    slot.profile = {
      name: profile.name || '',
      studentNumber: profile.studentNumber || '',
      room: profile.room || '',
    };
    slot.updatedAt = Date.now();
    data.lastPlayerId = this._currentId;
    return this._writeAll();
  },

  /** รายชื่อผู้เล่นในเครื่องนี้ (ล่าสุดก่อน) [{ id, profile, level, updatedAt }] */
  listPlayers() {
    const data = this._readAll();
    return Object.keys(data.players).map((id) => {
      const s = data.players[id];
      return { id, profile: s.profile || {}, level: s.game && s.game.pet ? s.game.pet.level : 0, updatedAt: s.updatedAt || 0 };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /** ผู้เล่นคนนี้มีสัตว์เลี้ยงบันทึกไว้หรือไม่ */
  hasSave(profile) {
    const data = this._readAll();
    const s = data.players[this.playerId(profile)];
    return !!(s && s.game && s.game.pet);
  },

  getSaveSummary(profile) {
    const data = this._readAll();
    const s = data.players[this.playerId(profile)];
    return s && s.game ? s.game : null;
  },

  /** การตั้งค่าของเครื่องนี้ (ไม่ผูกกับผู้เล่น) เช่น ปิด/เปิดเสียง */
  getSetting(key, fallback) {
    const data = this._readAll();
    return data.settings && key in data.settings ? data.settings[key] : fallback;
  },

  setSetting(key, value) {
    const data = this._readAll();
    data.settings = Object.assign({}, data.settings, { [key]: value });
    return this._writeAll();
  },

  /** ข้อมูลดิบของผู้เล่นทุกคนในเครื่อง [{ id, profile, game }] (ใช้ในโหมดครู) */
  allPlayersRaw() {
    const data = this._readAll();
    return Object.keys(data.players).map((id) => ({
      id, profile: data.players[id].profile || {}, game: data.players[id].game || {},
    }));
  },

  deletePlayer(profile) {
    const data = this._readAll();
    const id = this.playerId(profile);
    delete data.players[id];
    if (data.lastPlayerId === id) data.lastPlayerId = null;
    if (this._currentId === id) this._currentId = null;
    return this._writeAll();
  },

  // ---------------- API เดิม (ผู้เล่นปัจจุบัน) ----------------
  savePlayerProfile(profile) {
    return this.setCurrentPlayer(profile);
  },

  loadPlayerProfile() {
    const slot = this._slot(false);
    return slot ? slot.profile : null;
  },

  saveGame(gameData) {
    const slot = this._slot(true);
    if (!slot) return false;
    slot.game = Object.assign({}, slot.game, gameData, { savedAt: Date.now() });
    slot.updatedAt = Date.now();
    return this._writeAll();
  },

  loadGame() {
    const slot = this._slot(false);
    return slot ? slot.game || null : null;
  },

  clearGame() {
    const slot = this._slot(false);
    if (slot) slot.game = {};
    return this._writeAll();
  },

  clearAll() {
    this._memory = { players: {} };
    this._currentId = null;
    return this._storageRemove(CONFIG.SAVE.STORAGE_KEY);
  },

  /**
   * บันทึกอัตโนมัติ (เปลี่ยนโซน / จบการต่อสู้ / เลเวลอัป)
   * บันทึก extra ลงเกม แล้วแจ้ง UIScene ให้แสดงสัญลักษณ์บันทึก
   */
  autoSave(reason, extra) {
    const ok = this.saveGame(extra || {});
    if (this._game) this._game.events.emit('autosaved', reason, ok);
    return ok;
  },
};
