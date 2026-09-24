/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/QuizSystem.js
   ------------------------------------------------------------
   ระบบสุ่ม/ตรวจ/บันทึกคำถามจากคลัง QUESTIONS
   ใช้ร่วมกันทั้งตอนเก็บไอเท็มและตอนต่อสู้ (ผ่าน QuizPanel)

   กติกาการสุ่ม getQuestion(zone):
     - zone 1        : สุ่มจากคำถามของโซน 1 เท่านั้น
     - zone 2-4      : CURRENT_ZONE_RATIO (70%) จากโซนนั้น
                       ที่เหลือ (30%) จากโซนก่อนหน้า
                       (PREVIOUS_ZONE_SCOPE 'all' = ทุกโซนก่อนหน้า,
                        'adjacent' = เฉพาะโซนก่อนหน้า 1 โซน)
     - zone 'boss'   : สุ่มจากทุกข้อ
     - ห้ามซ้ำกับ NO_REPEAT_WINDOW ข้อล่าสุด (ถ้าคลังในกลุ่มนั้น
       หมดจริง ๆ จะผ่อนเงื่อนไขเพื่อไม่ให้เกมค้าง)
     - สลับตำแหน่งตัวเลือกทุกครั้ง และคำนวณตำแหน่งคำตอบที่ถูก
       หลังสลับใหม่เสมอ (correctIndex)

   บันทึกทุกการตอบลง SaveSystem (game.quiz.log):
     { type: 'answer', questionId, topic, zone, context, correct,
       timedOut, timeMs, timestamp, ...extra (เช่น monsterId) }
   (เฟส 4) สถิติการต่อสู้บันทึกใน log เดียวกัน:
     { type: 'battle', monsterId, zone, result: 'win'|'lose'|'flee',
       turns, correct, wrong, maxCombo, damageDealt, damageTaken,
       itemsUsed: {...}, expGained, durationMs, timestamp }
   ========================================================== */

const QuizSystem = {
  _recent: [],     // id ของคำถามล่าสุด (ใหม่สุดอยู่ท้าย)
  _log: [],
  _loaded: false,

  // ---------------- โหลด/บันทึก ----------------
  _ensureLoaded() {
    if (this._loaded) return;
    this._loaded = true;
    const game = SaveSystem.loadGame();
    const q = game && game.quiz ? game.quiz : {};
    this._recent = Array.isArray(q.recent) ? q.recent.slice(-CONFIG.QUIZ.NO_REPEAT_WINDOW) : [];
    this._log = Array.isArray(q.log) ? q.log : [];
  },

  _save() {
    SaveSystem.saveGame({ quiz: { recent: this._recent, log: this._log } });
  },

  /** ล้างสถานะในหน่วยความจำ (ใช้หลังผู้เล่นกด "เริ่มใหม่") */
  reset() {
    this._recent = [];
    this._log = [];
    this._loaded = false;
  },

  // ---------------- การสุ่มคำถาม ----------------
  _zoneNumber(zone) {
    if (zone === 'boss') return 'boss';
    const n = parseInt(zone, 10);
    return Number.isFinite(n) ? n : 1;
  },

  _poolsFor(zone) {
    const z = this._zoneNumber(zone);
    if (z === 'boss') return { main: QUESTIONS.slice(), prev: [] };
    const main = QUESTIONS.filter((q) => q.zone === z);
    let prev = [];
    if (z > 1) {
      prev = CONFIG.QUIZ.PREVIOUS_ZONE_SCOPE === 'adjacent'
        ? QUESTIONS.filter((q) => q.zone === z - 1)
        : QUESTIONS.filter((q) => q.zone < z);
    }
    return { main, prev };
  },

  _notRecent(pool) {
    return pool.filter((q) => this._recent.indexOf(q.id) === -1);
  },

  _pick(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  },

  /**
   * สุ่มคำถาม 1 ข้อสำหรับโซนที่กำหนด แล้วเตรียมให้พร้อมแสดงผล
   * คืนค่า: { id, topic, zone, text, choices[4], correctIndex, explanation, askedZone }
   */
  getQuestion(zone) {
    this._ensureLoaded();
    const { main, prev } = this._poolsFor(zone);

    const usePrev = prev.length > 0 && Math.random() >= CONFIG.QUIZ.CURRENT_ZONE_RATIO;
    const first = usePrev ? prev : main;
    const second = usePrev ? main : prev;

    // ลำดับการผ่อนเงื่อนไข: กลุ่มที่สุ่มได้ (ไม่ซ้ำ) -> อีกกลุ่ม (ไม่ซ้ำ) -> ทั้งหมด (ไม่ซ้ำ) -> ทั้งหมด
    const candidates = [
      this._notRecent(first),
      this._notRecent(second),
      this._notRecent(main.concat(prev)),
      main.concat(prev),
      QUESTIONS.slice(),
    ];
    const pool = candidates.find((p) => p.length > 0);
    if (!pool) return null;

    const q = this._pick(pool);
    this._remember(q.id);
    return this._prepare(q, zone);
  },

  _remember(id) {
    this._recent.push(id);
    while (this._recent.length > CONFIG.QUIZ.NO_REPEAT_WINDOW) this._recent.shift();
  },

  /** สลับตัวเลือก (Fisher-Yates) และติดตามตำแหน่งคำตอบที่ถูกหลังสลับ */
  _prepare(q, askedZone) {
    const order = q.c.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    return {
      id: q.id,
      topic: q.topic,
      zone: q.zone,
      askedZone,
      text: q.q,
      choices: order.map((orig) => q.c[orig]),
      originalIndexes: order,              // ตัวเลือกที่ i มาจากตัวเลือกเดิมลำดับที่ order[i]
      correctIndex: order.indexOf(q.a),
      explanation: q.e,
    };
  },

  // ---------------- ตรวจคำตอบ + บันทึก ----------------
  checkAnswer(prepared, choiceIndex) {
    return !!prepared && choiceIndex === prepared.correctIndex;
  },

  /**
   * บันทึกผลการตอบ 1 ครั้ง
   * info = { prepared, choiceIndex (-1 = หมดเวลา), timeMs, context: 'item'|'battle' }
   */
  record(info) {
    this._ensureLoaded();
    const p = info.prepared;
    const timedOut = info.choiceIndex == null || info.choiceIndex < 0;
    const entry = {
      type: 'answer',
      questionId: p.id,
      topic: p.topic,
      zone: p.askedZone,
      context: info.context || 'item',
      correct: !timedOut && this.checkAnswer(p, info.choiceIndex),
      timedOut,
      chosenOriginalIndex: timedOut ? null : p.originalIndexes[info.choiceIndex],
      timeMs: Math.max(0, Math.round(info.timeMs || 0)),
      timestamp: Date.now(),
    };
    if (info.extra) Object.assign(entry, info.extra);
    this._pushLog(entry);
    // (เฟส 7) ตรวจเหรียญตราหัวข้อ เช่น "เซียนไกลโคลิซิส"
    if (typeof BadgeSystem !== 'undefined') BadgeSystem.checkAll();
    return entry;
  },

  /** บันทึกสรุปการต่อสู้ 1 ครั้ง (ใช้ log เดียวกับการตอบคำถาม) */
  recordBattle(summary) {
    this._ensureLoaded();
    const entry = Object.assign({ type: 'battle', timestamp: Date.now() }, summary);
    this._pushLog(entry);
    return entry;
  },

  _pushLog(entry) {
    this._log.push(entry);
    while (this._log.length > CONFIG.QUIZ.LOG_MAX_ENTRIES) this._log.shift();
    this._save();
  },

  getLog() {
    this._ensureLoaded();
    return this._log.slice();
  },

  /** สรุปผลรวมและรายหัวข้อ (เตรียมไว้ใช้กับ leaderboard/รายงานครู) */
  getStats() {
    this._ensureLoaded();
    const byTopic = {};
    let correct = 0;
    const answers = this._log.filter((e) => e.type !== 'battle');
    answers.forEach((e) => {
      if (!byTopic[e.topic]) byTopic[e.topic] = { answered: 0, correct: 0 };
      byTopic[e.topic].answered += 1;
      if (e.correct) { byTopic[e.topic].correct += 1; correct += 1; }
    });
    return { answered: answers.length, correct, byTopic };
  },

  /** สรุปสถิติการต่อสู้ทั้งหมด */
  getBattleStats() {
    this._ensureLoaded();
    const battles = this._log.filter((e) => e.type === 'battle');
    const count = (r) => battles.filter((b) => b.result === r).length;
    return { battles: battles.length, wins: count('win'), losses: count('lose'), flees: count('flee') };
  },
};
