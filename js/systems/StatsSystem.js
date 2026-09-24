/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/StatsSystem.js
   ------------------------------------------------------------
   คำนวณสถิติจากข้อมูลเกม (game) ของผู้เล่นคนใดก็ได้
   ใช้ร่วมกันใน: หน้าสรุปผลนักเรียน (R), โหมดครู, CSV, Leaderboard
   ========================================================== */

const StatsSystem = {
  /** สถิติของข้อมูลเกม 1 คน (game = SaveSystem.loadGame() หรือเซฟของผู้เล่นอื่น) */
  compute(game) {
    const g = game || {};
    const log = (g.quiz && Array.isArray(g.quiz.log)) ? g.quiz.log : [];
    const answers = log.filter((e) => e.type !== 'battle' && e.topic);
    const battles = log.filter((e) => e.type === 'battle');
    const byTopic = {};
    TOPIC_ORDER.forEach((t) => { byTopic[t] = { answered: 0, correct: 0, rate: null }; });
    let correct = 0;
    answers.forEach((e) => {
      if (!byTopic[e.topic]) byTopic[e.topic] = { answered: 0, correct: 0, rate: null };
      byTopic[e.topic].answered += 1;
      if (e.correct) { byTopic[e.topic].correct += 1; correct += 1; }
    });
    Object.keys(byTopic).forEach((t) => {
      const b = byTopic[t];
      b.rate = b.answered > 0 ? b.correct / b.answered : null;
    });
    const pet = g.pet || null;
    return {
      level: pet ? pet.level : 0,
      speciesId: pet ? pet.speciesId : null,
      answered: answers.length,
      correct,
      rate: answers.length > 0 ? correct / answers.length : 0,
      byTopic,
      wins: battles.filter((b) => b.result === 'win').length,
      losses: battles.filter((b) => b.result === 'lose').length,
      playTimeMs: g.playTimeMs || 0,
      bossDefeated: !!g.bossDefeated,
      badges: Array.isArray(g.badges) ? g.badges.slice() : [],
    };
  },

  current() {
    return this.compute(SaveSystem.loadGame());
  },

  /** หัวข้อที่ควรทบทวน: [{ topic, rate, answered, reason: 'low' | 'none' }] เรียงจากแย่สุด */
  reviewTopics(stats) {
    const R = CONFIG.REPORT;
    const out = [];
    TOPIC_ORDER.forEach((t) => {
      const b = stats.byTopic[t];
      if (!b || b.answered === 0) out.push({ topic: t, rate: null, answered: 0, reason: 'none' });
      else if (b.answered >= R.MIN_ANSWERS && b.rate < R.REVIEW_THRESHOLD) out.push({ topic: t, rate: b.rate, answered: b.answered, reason: 'low' });
    });
    return out.sort((a, b) => {
      if (a.reason !== b.reason) return a.reason === 'low' ? -1 : 1;
      return (a.rate || 0) - (b.rate || 0);
    });
  },

  pct(rate) {
    return rate == null ? '-' : `${Math.round(rate * 100)}%`;
  },

  /** ข้อที่ตอบผิดบ่อยที่สุดจากผู้เล่นทุกคน [{ id, topic, text, wrong, attempts }] */
  topWrongQuestions(games, n) {
    const agg = {};
    games.forEach((g) => {
      const log = (g && g.quiz && Array.isArray(g.quiz.log)) ? g.quiz.log : [];
      log.forEach((e) => {
        if (e.type === 'battle' || e.questionId == null) return;
        if (!agg[e.questionId]) agg[e.questionId] = { id: e.questionId, wrong: 0, attempts: 0 };
        agg[e.questionId].attempts += 1;
        if (!e.correct) agg[e.questionId].wrong += 1;
      });
    });
    return Object.values(agg)
      .filter((a) => a.wrong > 0)
      .sort((a, b) => (b.wrong - a.wrong) || (b.wrong / b.attempts - a.wrong / a.attempts))
      .slice(0, n)
      .map((a) => {
        const q = QUESTIONS.find((x) => x.id === a.id);
        return Object.assign(a, { topic: q ? q.topic : '', text: q ? q.q : `(ข้อ ${a.id})` });
      });
  },
};
