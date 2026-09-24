/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/ProgressionFx.js
   ------------------------------------------------------------
   ตัวเรียกเอฟเฟกต์ความก้าวหน้าหลังได้ EXP (ใช้จากทุกฉาก)
     const r = PetSystem.addExp(n);
     ProgressionFx.play(this, r).then(() => { ...ทำต่อ... });

   ลำดับ: เลเวลอัปทีละขั้น (LevelUpScene) -> ถ้าขั้นนั้นถึงเลเวล
   พัฒนาร่าง เล่น EvolutionScene ต่อทันที -> ถ้าถึง Lv สูงสุด
   เล่น MaxLevelScene (ฉลอง + ใบประกาศ) เป็นลำดับสุดท้าย
   ระหว่างเล่น ฉากที่เรียกจะถูก pause
   ========================================================== */

const ProgressionFx = {
  play(callerScene, result) {
    if (!result || !result.steps || result.steps.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      const game = callerScene.game;
      const mgr = callerScene.scene;
      const key = callerScene.scene.key;
      const wasModal = game.registry.get('modalOpen');
      game.registry.set('modalOpen', true);
      mgr.pause();
      mgr.launch('LevelUpScene', {
        steps: result.steps,
        onDone: () => {
          game.registry.set('modalOpen', !!wasModal);
          SaveSystem.autoSave('levelup');
          // (เฟส 7) ส่งคะแนนขึ้น Leaderboard ออนไลน์ (ไม่รอผล ส่งไม่ได้ก็เล่นต่อได้)
          LeaderboardSystem.submit(result.reachedMax ? 'maxlevel' : 'levelup');
          mgr.resume(key);
          if (callerScene.input && callerScene.input.keyboard) callerScene.input.keyboard.resetKeys();
          resolve();
        },
      });
      mgr.bringToTop('LevelUpScene');
    });
  },
};
