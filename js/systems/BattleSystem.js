/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/BattleSystem.js
   ------------------------------------------------------------
   ตรรกะการต่อสู้แบบผลัดตา (ไม่มีภาพ) ใช้คู่กับ BattleScene
   - ตอบถูก = สัตว์เลี้ยงโจมตี, ตอบผิด = มอนสเตอร์โจมตี
   - ดาเมจสัตว์ = ATK ของสัตว์ ± DAMAGE_VARIANCE
       ตอบถูกติดกัน >= COMBO_THRESHOLD ข้อ -> x COMBO_MULTIPLIER ("คอมโบ!")
       ใช้ ATP ไว้ -> ครั้งถัดไป x ATP_MULTIPLIER
   - ดาเมจมอนสเตอร์ = ATK ของมอนสเตอร์ ± DAMAGE_VARIANCE
   ค่าทั้งหมดอยู่ใน CONFIG.BATTLE และ CONFIG.MONSTER.STATS
   ========================================================== */

const BattleSystem = {
  /** เริ่มการต่อสู้ใหม่ คืน state ของการต่อสู้ */
  create(monsterId, zone) {
    const monster = getMonsterData(monsterId);
    return {
      monster,
      zone,
      monsterHp: monster.hp,
      combo: 0,
      maxCombo: 0,
      turns: 0,
      correct: 0,
      wrong: 0,
      damageDealt: 0,
      damageTaken: 0,
      itemsUsed: {},
      nadPending: false,
      atpPending: false,
      startTime: Date.now(),
    };
  },

  petAtk() {
    const p = PetSystem.current;
    return p ? PetSystem.calcAtk(p.speciesId, p.level) : 1;
  },

  rollDamage(base) {
    const v = CONFIG.BATTLE.DAMAGE_VARIANCE;
    const dmg = Math.round(base * (1 + Phaser.Math.FloatBetween(-v, v)));
    return Math.max(CONFIG.BATTLE.MIN_DAMAGE, dmg);
  },

  /**
   * สัตว์เลี้ยงโจมตี
   * fromCorrectAnswer = true ถ้ามาจากการตอบถูก (นับคอมโบ)
   * คืน { damage, isCombo, usedAtp, defeated }
   */
  petAttack(state, fromCorrectAnswer) {
    const B = CONFIG.BATTLE;
    if (fromCorrectAnswer) {
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
    }
    let dmg = this.rollDamage(this.petAtk());
    const isCombo = fromCorrectAnswer && state.combo >= B.COMBO_THRESHOLD;
    if (isCombo) dmg = Math.round(dmg * B.COMBO_MULTIPLIER);
    const usedAtp = state.atpPending;
    if (usedAtp) {
      dmg = Math.round(dmg * B.ATP_MULTIPLIER);
      state.atpPending = false;
    }
    state.monsterHp = Math.max(0, state.monsterHp - dmg);
    state.damageDealt += dmg;
    return { damage: dmg, isCombo, usedAtp, defeated: state.monsterHp <= 0 };
  },

  /** มอนสเตอร์โจมตี (หัก HP สัตว์เลี้ยงจริง) คืน { damage, fainted } */
  monsterAttack(state) {
    let dmg = this.rollDamage(state.monster.atk);
    // (เฟส 8) บทช่วยสอน: สัตว์เลี้ยงไม่หมดแรง (เหลือ HP อย่างน้อย 1)
    if (state.tutorial) dmg = Math.min(dmg, Math.max(0, PetSystem.current.hp - 1));
    PetSystem.changeHp(-dmg);
    state.damageTaken += dmg;
    return { damage: dmg, fainted: PetSystem.current.hp <= 0 };
  },

  /** ตอบผิด/หมดเวลา: คอมโบหาย */
  breakCombo(state) {
    state.combo = 0;
  },

  canFlee(state) {
    return !state.monster.isBoss || CONFIG.BATTLE.BOSS_CAN_FLEE;
  },

  rollFlee() {
    return Math.random() < CONFIG.BATTLE.FLEE_CHANCE;
  },

  noteItem(state, itemId) {
    state.itemsUsed[itemId] = (state.itemsUsed[itemId] || 0) + 1;
  },

  /** บันทึกสรุปการต่อสู้ลง log ของ QuizSystem */
  record(state, result, expGained) {
    return QuizSystem.recordBattle({
      monsterId: state.monster.id,
      zone: state.zone,
      result,
      turns: state.turns,
      correct: state.correct,
      wrong: state.wrong,
      maxCombo: state.maxCombo,
      damageDealt: state.damageDealt,
      damageTaken: state.damageTaken,
      itemsUsed: state.itemsUsed,
      expGained: expGained || 0,
      durationMs: Date.now() - state.startTime,
    });
  },
};
