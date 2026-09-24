/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/AudioSystem.js
   ------------------------------------------------------------
   เพลงประกอบ (BGM) ต่อโซน + เสียงประกอบจากไฟล์ assets/audio/*.mp3
   ใช้ HTMLAudioElement โดยตรง จึงเล่นได้ทั้งเปิดผ่านเว็บและดับเบิลคลิก (file://)
   - ไฟล์หาย/เล่นไม่ได้ -> เงียบสำหรับ BGM และใช้เสียงสังเคราะห์ (SoundFx) แทนสำหรับเสียงประกอบ
   - ปิด/เปิดเสียงด้วยปุ่มบนจอหรือกด M (จำค่าไว้ในเครื่อง)
   - เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้เล่นแตะจอ/กดปุ่ม จึงรอ "ปลดล็อก" ครั้งแรกก่อน
   ========================================================== */

const AudioSystem = {
  muted: false,
  _missing: {},
  _sfx: {},
  _bgm: null,
  _bgmKey: null,
  _unlocked: false,
  _game: null,

  init(game) {
    this._game = game;
    this.muted = !!SaveSystem.getSetting('muted', false);
    if (!CONFIG.AUDIO.ENABLED) return;
    Object.values(CONFIG.AUDIO.SFX).forEach((key) => this._loadSfx(key));
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;
      if (this._bgmKey) this._startBgm(this._bgmKey);
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { once: false, passive: true }));
  },

  _src(key) {
    return CONFIG.AUDIO.FOLDER + key + CONFIG.AUDIO.EXT;
  },

  _loadSfx(key) {
    try {
      const a = new Audio();
      a.preload = 'auto';
      a.addEventListener('error', () => { this._missing[key] = true; });
      a.src = this._src(key);
      this._sfx[key] = a;
    } catch (e) {
      this._missing[key] = true;
    }
  },

  /** เล่นเสียงประกอบ คืน true ถ้าเล่นจากไฟล์ได้ (false = ให้ผู้เรียกใช้เสียงสังเคราะห์แทน) */
  playSfx(kind) {
    if (this.muted || !CONFIG.AUDIO.ENABLED) return true; // ปิดเสียง = ไม่ต้องใช้เสียงสำรองด้วย
    const key = CONFIG.AUDIO.SFX[kind];
    const base = key && this._sfx[key];
    if (!base || this._missing[key]) return false;
    try {
      const a = base.cloneNode();
      a.volume = CONFIG.AUDIO.SFX_VOLUME;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  },

  /** เปลี่ยนเพลงประกอบ (เรียกซ้ำด้วย key เดิมจะไม่เริ่มใหม่) */
  playBgm(key) {
    if (!CONFIG.AUDIO.ENABLED || key === this._bgmKey) return;
    this._bgmKey = key;
    this._stopBgm();
    if (this._unlocked && !this.muted) this._startBgm(key);
  },

  _startBgm(key) {
    if (this.muted || this._missing[key]) return;
    try {
      const a = new Audio(this._src(key));
      a.loop = true;
      a.volume = 0;
      a.addEventListener('error', () => { this._missing[key] = true; });
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      this._bgm = a;
      this._fade(a, CONFIG.AUDIO.BGM_VOLUME);
    } catch (e) {
      this._missing[key] = true;
    }
  },

  _stopBgm() {
    const a = this._bgm;
    this._bgm = null;
    if (!a) return;
    this._fade(a, 0, () => { try { a.pause(); a.src = ''; } catch (e) { /* ไม่เป็นไร */ } });
  },

  _fade(a, to, done) {
    const steps = 12;
    const from = a.volume;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      try { a.volume = Math.max(0, Math.min(1, from + ((to - from) * i) / steps)); } catch (e) { /* ไม่เป็นไร */ }
      if (i >= steps) { clearInterval(iv); if (done) done(); }
    }, CONFIG.AUDIO.FADE_MS / steps);
  },

  setMuted(m) {
    this.muted = !!m;
    SaveSystem.setSetting('muted', this.muted);
    if (this.muted) this._stopBgm();
    else if (this._bgmKey && this._unlocked) this._startBgm(this._bgmKey);
    if (this._game) this._game.events.emit('audio-muted', this.muted);
  },

  toggle() {
    this.setMuted(!this.muted);
    return this.muted;
  },
};
