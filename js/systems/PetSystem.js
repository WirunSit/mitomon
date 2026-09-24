/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/PetSystem.js
   ------------------------------------------------------------
   ระบบจัดการสัตว์เลี้ยงของผู้เล่น
   สถานะที่เก็บ: { speciesId, nickname, level, exp, form, hp, maxHp }

   การใช้งาน:
     PetSystem.create('p1', 'ชื่อเล่น')   -> สร้างตัวใหม่ + บันทึก
     PetSystem.loadFromSave()             -> โหลดจาก localStorage
     PetSystem.current                    -> สถานะปัจจุบัน
     PetSystem.healFull()                 -> HP เต็ม + บันทึก
     PetSystem.addExp(n)                  -> เพิ่ม EXP / เลเวลอัป / พัฒนาร่าง (คืนรายการขั้น steps)
     PetSystem.debugAddLevel()            -> (โหมดครู) เพิ่ม 1 เลเวล

   ทุกครั้งที่สถานะเปลี่ยน ระบบจะยิงอีเวนต์ 'pet-changed'
   ผ่าน game.events (ต้องเรียก PetSystem.bindGame(game) ก่อน)
   เพื่อให้ UIScene อัปเดตกรอบข้อมูลสัตว์เลี้ยงเอง
   ========================================================== */

const PetSystem = {
  current: null,
  _game: null,

  bindGame(game) {
    this._game = game;
  },

  _emitChanged(detail) {
    if (this._game) this._game.events.emit('pet-changed', this.current, detail || {});
  },

  // ---------------- ข้อมูลสายพันธุ์ ----------------
  getSpecies(speciesId) {
    return PETS.find((p) => p.id === speciesId) || null;
  },

  /** ร่างที่ควรเป็นตามเลเวล (1-3) */
  formForLevel(level) {
    if (level >= CONFIG.EXP.EVOLVE_LEVEL_STAGE_3) return 3;
    if (level >= CONFIG.EXP.EVOLVE_LEVEL_STAGE_2) return 2;
    return 1;
  },

  getFormData(pet) {
    const p = pet || this.current;
    if (!p) return null;
    const species = this.getSpecies(p.speciesId);
    return species ? species.forms[p.form - 1] : null;
  },

  /** texture key ตามกติกาชื่อไฟล์ เช่น p2_f3_attack */
  getTextureKey(pet, pose) {
    const p = pet || this.current;
    return `${p.speciesId}_f${p.form}_${pose || 'idle'}`;
  },

  getDisplayName(pet) {
    const p = pet || this.current;
    if (!p) return '';
    if (p.nickname) return p.nickname;
    const form = this.getFormData(p);
    return form ? form.name : '';
  },

  // ---------------- สูตรค่าพลัง ----------------
  calcMaxHp(speciesId, level) {
    const s = this.getSpecies(speciesId);
    const base = s && s.baseHP != null ? s.baseHP : CONFIG.PET_STATS.BASE_HP;
    return Math.round(base + (level - 1) * CONFIG.PET_STATS.HP_PER_LEVEL);
  },

  /** ATK = atkBase (baseATK ของสายพันธุ์) + level x ATK_PER_LEVEL */
  calcAtk(speciesId, level) {
    const s = this.getSpecies(speciesId);
    const base = s && s.baseATK != null ? s.baseATK : CONFIG.PET_STATS.BASE_ATK;
    return Math.round(base + level * CONFIG.PET_STATS.ATK_PER_LEVEL);
  },

  /** EXP ที่ต้องใช้เพื่อขึ้นจากเลเวลนี้ไปเลเวลถัดไป */
  expToNext(level) {
    if (level >= CONFIG.EXP.MAX_LEVEL) return 0;
    return CONFIG.EXP.EXP_BASE + CONFIG.EXP.EXP_STEP * (level - 1);
  },

  // ---------------- สร้าง / โหลด / บันทึก ----------------
  create(speciesId, nickname) {
    const maxHp = this.calcMaxHp(speciesId, 1);
    this.current = {
      speciesId,
      nickname: (nickname || '').trim(),
      level: 1,
      exp: 0,
      form: 1,
      hp: maxHp,
      maxHp,
    };
    this.save();
    this._emitChanged({ created: true });
    return this.current;
  },

  loadFromSave() {
    const game = SaveSystem.loadGame();
    if (!game || !game.pet || !this.getSpecies(game.pet.speciesId)) {
      this.current = null;
      return null;
    }
    const p = Object.assign({}, game.pet);
    // ซ่อมค่าที่อาจขาดหาย/ผิดรูปแบบจากเซฟเก่า
    p.level = Math.max(1, Math.min(CONFIG.EXP.MAX_LEVEL, p.level || 1));
    p.form = this.formForLevel(p.level);
    p.maxHp = this.calcMaxHp(p.speciesId, p.level);
    p.hp = Math.max(0, Math.min(p.maxHp, p.hp != null ? p.hp : p.maxHp));
    p.exp = Math.max(0, p.exp || 0);
    this.current = p;
    return p;
  },

  save() {
    if (!this.current) return false;
    return SaveSystem.saveGame({ pet: this.current });
  },

  // ---------------- การเปลี่ยนแปลงสถานะ ----------------
  healFull() {
    if (!this.current) return false;
    const wasFull = this.current.hp >= this.current.maxHp;
    this.current.hp = this.current.maxHp;
    this.save();
    this._emitChanged({ healed: !wasFull });
    return !wasFull;
  },

  /** ปรับ HP (ค่าลบ = โดนโจมตี) ใช้ในเฟสต่อสู้ */
  changeHp(delta) {
    if (!this.current) return;
    this.current.hp = Math.max(0, Math.min(this.current.maxHp, this.current.hp + delta));
    this.save();
    this._emitChanged({ hpDelta: delta });
  },

  /**
   * เพิ่ม EXP คืนค่า
   * { levelsGained, evolved, newForm, reachedMax,
   *   steps: [{ fromLevel, toLevel, fromForm, toForm, evolved, hpGain, atkGain, maxed }] }
   * steps ใช้เล่นเอฟเฟกต์เลเวลอัป/พัฒนาร่างทีละขั้นให้ถูกลำดับ (ProgressionFx)
   * ทุกครั้งที่เลเวลอัป HP จะฟื้นเต็ม (CONFIG.PET_STATS.HEAL_FULL_ON_LEVEL_UP)
   */
  addExp(amount) {
    const p = this.current;
    const result = { levelsGained: 0, evolved: false, newForm: p ? p.form : 1, reachedMax: false, steps: [] };
    if (!p || amount <= 0 || p.level >= CONFIG.EXP.MAX_LEVEL) return result;

    p.exp += amount;
    while (p.level < CONFIG.EXP.MAX_LEVEL && p.exp >= this.expToNext(p.level)) {
      p.exp -= this.expToNext(p.level);
      const fromLevel = p.level;
      const fromForm = p.form;
      const oldMax = p.maxHp;
      const oldAtk = this.calcAtk(p.speciesId, fromLevel);
      p.level += 1;
      p.maxHp = this.calcMaxHp(p.speciesId, p.level);
      p.hp = CONFIG.PET_STATS.HEAL_FULL_ON_LEVEL_UP ? p.maxHp : Math.min(p.maxHp, p.hp + (p.maxHp - oldMax));
      p.form = this.formForLevel(p.level);
      const step = {
        fromLevel,
        toLevel: p.level,
        fromForm,
        toForm: p.form,
        evolved: p.form !== fromForm,
        hpGain: p.maxHp - oldMax,
        atkGain: this.calcAtk(p.speciesId, p.level) - oldAtk,
        maxed: p.level >= CONFIG.EXP.MAX_LEVEL,
      };
      result.steps.push(step);
      result.levelsGained += 1;
      if (step.evolved) result.evolved = true;
      if (step.maxed) result.reachedMax = true;
    }
    if (p.level >= CONFIG.EXP.MAX_LEVEL) p.exp = 0;
    result.newForm = p.form;
    this.save();
    this._emitChanged(result);
    return result;
  },

  /** (โหมดครู) เพิ่ม 1 เลเวลทันที คืนผลแบบเดียวกับ addExp */
  debugAddLevel() {
    const p = this.current;
    if (!p || p.level >= CONFIG.EXP.MAX_LEVEL) return { levelsGained: 0, steps: [] };
    return this.addExp(Math.max(1, this.expToNext(p.level) - p.exp));
  },
};
