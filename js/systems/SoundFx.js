/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/SoundFx.js
   ------------------------------------------------------------
   เสียงเอฟเฟกต์สั้น ๆ สังเคราะห์ด้วย WebAudio (ไม่ต้องมีไฟล์เสียง)
   SoundFx.play(scene, 'correct' | 'wrong' | 'pickup' | 'click' | 'attack' | 'levelup' | 'hatch')
   ปิด/เปิด และความดังตั้งค่าที่ CONFIG.SOUND
   ========================================================== */

const SoundFx = {
  /** เล่นโน้ตไล่เสียงตามรายการความถี่ (ใช้กับเลเวลอัป/พัฒนาร่าง) */
  playNotes(scene, notes, type) {
    if (typeof AudioSystem !== 'undefined' && AudioSystem.muted) return;
    this._notes(scene, notes, type || 'triangle');
  },

  /**
   * เล่นเสียงประกอบ kind: 'correct' | 'wrong' | 'attack' | 'levelup' | 'hatch' | 'pickup' | 'click'
   * (เฟส 8) ใช้ไฟล์ใน assets/audio ก่อน ถ้าไม่มีไฟล์จึงสังเคราะห์เสียงแทน
   */
  play(scene, kind) {
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playSfx(kind)) return;
    if (kind === 'attack') kind = 'pickup';
    if (kind === 'hit') kind = 'wrong';
    if (kind === 'evolve') { this._notes(scene, CONFIG.EVOLUTION.NOTES_RISE, 'triangle'); return; }
    if (kind === 'levelup' || kind === 'hatch') { this._notes(scene, CONFIG.LEVELUP.NOTES, 'triangle'); return; }
    this._synth(scene, kind);
  },

  _synth(scene, kind) {
    if (!CONFIG.SOUND.ENABLED || !scene || !scene.sound) return;
    const ctx = scene.sound.context;               // มีเฉพาะ WebAudioSoundManager
    if (!ctx || typeof ctx.createOscillator !== 'function') return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();

    const map = {
      correct: { notes: CONFIG.SOUND.CORRECT_NOTES, type: 'triangle' },
      wrong: { notes: CONFIG.SOUND.WRONG_NOTES, type: 'sawtooth' },
      pickup: { notes: CONFIG.SOUND.PICKUP_NOTES, type: 'sine' },
      click: { notes: CONFIG.SOUND.CLICK_NOTES, type: 'sine' },
    };
    const def = map[kind];
    if (!def) return;
    this._notes(scene, def.notes, def.type);
  },

  _notes(scene, notes, type) {
    if (!CONFIG.SOUND.ENABLED || !scene || !scene.sound) return;
    const ctx = scene.sound.context;
    if (!ctx || typeof ctx.createOscillator !== 'function') return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const def = { notes, type };
    const noteSec = CONFIG.SOUND.NOTE_MS / 1000;
    const start = ctx.currentTime;
    def.notes.forEach((freq, i) => {
      const t0 = start + i * noteSec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = def.type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(CONFIG.SOUND.VOLUME, t0 + noteSec * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + noteSec * 0.95);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + noteSec);
    });
  },
};
