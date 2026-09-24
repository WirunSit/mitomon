/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/scenes/QuizPanel.js
   ------------------------------------------------------------
   หน้าต่างคำถามกลางจอ (ใช้ซ้ำได้ทั้งตอนเก็บไอเท็มและตอนต่อสู้)

   วิธีเรียกใช้จากฉากใดก็ได้:
     QuizPanel.open(this, {
       zone: 1,                    // 1-4 หรือ 'boss'
       context: 'item',            // 'item' | 'battle' (ใช้ในบันทึกผล)
       title: 'ตอบให้ถูกเพื่อเก็บ กลูโคส',
       eliminate: 0,               // (ไม่บังคับ) ตัดตัวเลือกผิดออกกี่ข้อ (ไอเท็ม NAD⁺)
       extra: { monsterId: 'm1' }, // (ไม่บังคับ) ข้อมูลเพิ่มที่บันทึกลง log
     }).then((result) => { ... });
   result = { correct, timedOut, questionId, topic, timeMs, entry }

   ระหว่างเปิด ฉากที่เรียกจะถูก pause และกลับมาทำงานต่อเมื่อปิด

   ขั้นตอน:
     1) ฉากหลังมืดลง กรอบ UI จริงเด้งขึ้น แสดงคำถาม + ตัวเลือก 4 ปุ่ม
        (คลิก / แตะ / กดปุ่ม 1-4) และหลอดเวลา (ถ้าเปิดใน config)
     2) ตอบถูก: ปุ่มเป็นสีเขียว + เสียง + ดาวกระจาย
        ตอบผิด/หมดเวลา: ปุ่มที่เลือกเป็นสีแดง ปุ่มที่ถูกเป็นสีเขียว
     3) แสดงคำอธิบาย (ฟิลด์ e) + ปุ่ม "เข้าใจแล้ว" เสมอ
        (กด Enter / Space ได้)
   ========================================================== */

class QuizPanel extends Phaser.Scene {
  constructor() {
    super('QuizPanel');
  }

  /** เปิดหน้าต่างคำถาม คืน Promise ที่ได้ผลการตอบ */
  static open(callerScene, options) {
    return new Promise((resolve) => {
      const mgr = callerScene.scene;
      const game = callerScene.game;
      game.registry.set('modalOpen', true);
      mgr.pause();
      mgr.launch('QuizPanel', Object.assign({}, options, {
        callerKey: callerScene.scene.key,
        onDone: (result) => {
          game.registry.set('modalOpen', false);
          mgr.resume(callerScene.scene.key);
          if (callerScene.input && callerScene.input.keyboard) callerScene.input.keyboard.resetKeys();
          resolve(result);
        },
      }));
      mgr.bringToTop('QuizPanel');
    });
  }

  init(data) {
    this.opts = data || {};
    this.answered = false;
    this.closing = false;
    this.okEnabled = false;
    this.choiceButtons = [];
    this.startTime = 0;
    this.result = null;
  }

  create() {
    const Q = CONFIG.QUIZ_PANEL;
    // (เฟส 8) จอสัมผัส: ขยายปุ่มตัวเลือกให้ใหญ่พอสำหรับนิ้ว
    this.L = Object.assign({}, Q);
    if (Device.isTouch()) {
      const T = CONFIG.TOUCH_UI;
      Object.assign(this.L, {
        CHOICE_HEIGHT: T.CHOICE_HEIGHT, CHOICE_ROW_GAP: T.CHOICE_ROW_GAP,
        CHOICE_ROW1_Y: T.CHOICE_ROW1_Y, CHOICE_FONT_MAX: T.CHOICE_FONT_MAX,
      });
    }
    const { WIDTH, HEIGHT } = CONFIG.GAME;
    this.cx = WIDTH / 2;
    this.cy = HEIGHT / 2;

    this.question = QuizSystem.getQuestion(this.opts.zone != null ? this.opts.zone : 1);
    if (!this.question) {
      this._finish({ correct: false, timedOut: false, questionId: null, topic: null, timeMs: 0 });
      return;
    }

    // ---------------- ฉากหลังมืด (กันคลิกทะลุ) ----------------
    this.dim = this.add.rectangle(this.cx, this.cy, WIDTH, HEIGHT, 0x0e0a1f, Q.DIM_ALPHA).setInteractive();
    this.dim.setAlpha(0);
    this.tweens.add({ targets: this.dim, alpha: 1, duration: Q.OPEN_MS });

    // ---------------- กรอบหน้าต่าง (พิกัด local รอบจุดกึ่งกลางจอ) ----------------
    this.root = this.add.container(this.cx, this.cy);
    const S = Q.PANEL_SLICE;
    const art = Q.PANEL_ART_SCALE;
    const panel = this.add.nineslice(0, 0, 'ui_panel', null, Q.PANEL_WIDTH / art, Q.PANEL_HEIGHT / art,
      S.LEFT, S.RIGHT, S.TOP, S.BOTTOM).setScale(art);
    const panelTop = -Q.PANEL_HEIGHT / 2;
    const badge = this.add.image(0, panelTop, 'ui_panel_badge').setOrigin(0.5, 0).setScale(art);
    this.root.add([panel, badge]);

    this._buildHeader();
    this._buildQuestion();
    this._buildChoices();
    this._applyEliminate(this.opts.eliminate || 0);
    this._buildExplanation();

    // ดาวตอนตอบถูก
    this.starEmitter = this.add.particles(0, 0, 'fx_sparkle', {
      speed: { min: Q.STAR_SPEED_MIN, max: Q.STAR_SPEED_MAX },
      angle: { min: 0, max: 360 },
      rotate: { start: 0, end: 360 },
      scale: { start: Q.STAR_SCALE, end: 0 },
      lifespan: Q.STAR_LIFESPAN_MS,
      emitting: false,
    }).setDepth(100);

    // ---------------- แอนิเมชันเปิด ----------------
    this.root.setScale(0.85).setAlpha(0);
    this.tweens.add({
      targets: this.root, scale: 1, alpha: 1, duration: Q.OPEN_MS, ease: 'Back.easeOut',
      onComplete: () => this._startTimer(),
    });

    // ---------------- คีย์บอร์ด ----------------
    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (!this.answered && n >= 1 && n <= this.choiceButtons.length && !this.choiceButtons[n - 1].eliminated) this._answer(n - 1);
      else if (this.answered && (e.key === 'Enter' || e.key === ' ')) this._onOk();
    });
  }

  // ============================================================
  // ส่วนประกอบ
  // ============================================================
  _ly(screenY) { return screenY - this.cy; }

  _textStyle(size, color, extra) {
    return Object.assign({
      fontFamily: CONFIG.GAME.FONT_FAMILY,
      fontSize: `${size}px`,
      color,
      padding: { top: CONFIG.QUIZ_PANEL.TEXT_PAD_TOP, bottom: 4 },
    }, extra || {});
  }

  _buildHeader() {
    const Q = CONFIG.QUIZ_PANEL;
    const left = -Q.CONTENT_WIDTH / 2;
    const title = this.opts.title || 'ตอบคำถาม';
    this.headerText = this.add.text(left, this._ly(Q.HEADER_Y), TextUtil.formatChem(title),
      this._textStyle(Q.HEADER_FONT_SIZE, '#5a7a4a', { fontStyle: 'bold' })).setOrigin(0, 0.5);
    this.timerText = this.add.text(-left, this._ly(Q.HEADER_Y), '',
      this._textStyle(Q.HEADER_FONT_SIZE, '#5a4a3a', { fontStyle: 'bold' })).setOrigin(1, 0.5);
    this.timerBar = this.add.graphics();
    this.root.add([this.headerText, this.timerText, this.timerBar]);
    if (!CONFIG.QUIZ.TIMER_ENABLED) this.timerText.setText('ไม่จับเวลา');
    this._drawTimer(1);
  }

  _buildQuestion() {
    const Q = CONFIG.QUIZ_PANEL;
    this.questionText = this.add.text(0, this._ly(Q.QUESTION_Y + Q.QUESTION_HEIGHT / 2), '',
      this._textStyle(Q.QUESTION_FONT_MAX, '#3a2a1f', { fontStyle: 'bold', align: 'center' })).setOrigin(0.5);
    TextUtil.fitText(this.questionText, TextUtil.formatChem(this.question.text), {
      width: Q.CONTENT_WIDTH, height: Q.QUESTION_HEIGHT, maxSize: Q.QUESTION_FONT_MAX, minSize: Q.QUESTION_FONT_MIN, bold: true,
    });
    this.root.add(this.questionText);
  }

  _buildChoices() {
    const Q = this.L;
    const btnW = (Q.CONTENT_WIDTH - Q.CHOICE_COL_GAP) / 2;
    const scale = Q.CHOICE_HEIGHT / Q.CHOICE_NATIVE_HEIGHT;
    const nativeW = btnW / scale;

    this.question.choices.forEach((choice, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = (col === 0 ? -1 : 1) * (btnW + Q.CHOICE_COL_GAP) / 2;
      const y = this._ly(Q.CHOICE_ROW1_Y + row * Q.CHOICE_ROW_GAP);

      const c = this.add.container(x, y);
      const mk = (key) => this.add.nineslice(0, 0, key, null, nativeW, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale);
      const bgCream = mk('ui_btn_cream');
      const bgGreen = mk('ui_btn_green').setVisible(false);
      const bgRed = mk('ui_btn_red').setVisible(false);

      const numX = -btnW / 2 + Q.CHOICE_NUMBER_X;
      const numBg = this.add.circle(numX, 0, Q.CHOICE_NUMBER_RADIUS, 0x8fcfa8).setStrokeStyle(3, 0x4a3222);
      const numText = this.add.text(numX, 0, String(i + 1), this._textStyle(20, '#3a2a1f', { fontStyle: 'bold', padding: { top: 4, bottom: 2 } })).setOrigin(0.5);

      const textLeft = -btnW / 2 + Q.CHOICE_TEXT_PAD_LEFT;
      const textW = btnW - Q.CHOICE_TEXT_PAD_LEFT - Q.CHOICE_TEXT_PAD_RIGHT;
      const label = this.add.text(textLeft, 0, '', this._textStyle(Q.CHOICE_FONT_MAX, '#3a2a1f', { fontStyle: 'bold' })).setOrigin(0, 0.5);
      TextUtil.fitText(label, TextUtil.formatChem(choice), {
        width: textW, height: Q.CHOICE_TEXT_HEIGHT, maxSize: Q.CHOICE_FONT_MAX, minSize: Q.CHOICE_FONT_MIN,
        maxLines: Q.CHOICE_MAX_LINES, bold: true,
      });

      c.add([bgCream, bgGreen, bgRed, numBg, numText, label]);
      c.setSize(btnW, Q.CHOICE_HEIGHT);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => { if (!this.answered) this.tweens.add({ targets: c, scale: Q.CHOICE_HOVER_SCALE, duration: 90 }); });
      c.on('pointerout', () => { if (!this.answered) this.tweens.add({ targets: c, scale: 1, duration: 90 }); });
      c.on('pointerup', () => { if (!this.answered) this._answer(i); });

      this.root.add(c);
      this.choiceButtons.push({ container: c, bgCream, bgGreen, bgRed, numBg, label });
    });
  }

  /** ตัดตัวเลือกผิดออก n ข้อ (สุ่ม) ใช้กับไอเท็ม NAD⁺ */
  _applyEliminate(n) {
    if (n <= 0) return;
    const wrong = this.choiceButtons.map((_, i) => i).filter((i) => i !== this.question.correctIndex);
    Phaser.Utils.Array.Shuffle(wrong);
    wrong.slice(0, n).forEach((i) => {
      const b = this.choiceButtons[i];
      b.eliminated = true;
      b.container.disableInteractive();
      b.container.setAlpha(CONFIG.QUIZ_PANEL.CHOICE_DIM_ALPHA * 0.6);
      b.label.setText(`✕  ${b.label.text}`);
    });
  }

  _buildExplanation() {
    const Q = CONFIG.QUIZ_PANEL;
    const left = -Q.CONTENT_WIDTH / 2;
    const top = this._ly(Q.EXPLAIN_Y);

    this.explainBox = this.add.container(0, 0).setVisible(false);
    const box = this.add.graphics();
    box.fillStyle(0xffffff, 0.75);
    box.fillRoundedRect(left, top, Q.EXPLAIN_WIDTH, Q.EXPLAIN_HEIGHT, 16);
    box.lineStyle(3, 0x8fcfa8, 1);
    box.strokeRoundedRect(left, top, Q.EXPLAIN_WIDTH, Q.EXPLAIN_HEIGHT, 16);
    this.resultText = this.add.text(left + 18, top + 8, '', this._textStyle(22, '#2e8b57', { fontStyle: 'bold' }));
    this.explainText = this.add.text(left + 18, top + 42, '', this._textStyle(Q.EXPLAIN_FONT_MAX, '#3a2a1f'));
    this.explainBox.add([box, this.resultText, this.explainText]);

    // ปุ่ม "เข้าใจแล้ว" (ภาพปุ่มสีเขียวจริง แบบ 3-slice)
    const scale = Q.OK_BUTTON_HEIGHT / Q.CHOICE_NATIVE_HEIGHT;
    const okX = Q.OK_BUTTON_X - this.cx;
    const okY = this._ly(Q.OK_BUTTON_Y);
    this.okBtn = this.add.container(okX, okY).setVisible(false);
    const okBg = this.add.nineslice(0, 0, 'ui_btn_green', null, Q.OK_BUTTON_WIDTH / scale, Q.CHOICE_NATIVE_HEIGHT, Q.CHOICE_SLICE, Q.CHOICE_SLICE, 0, 0).setScale(scale);
    const okText = this.add.text(0, 0, 'เข้าใจแล้ว', this._textStyle(26, '#1f3a2a', { fontStyle: 'bold' })).setOrigin(0.5);
    this.okBtn.add([okBg, okText]);
    this.okBtn.setSize(Q.OK_BUTTON_WIDTH, Q.OK_BUTTON_HEIGHT);
    this.okBtn.setInteractive({ useHandCursor: true });
    this.okBtn.on('pointerup', () => this._onOk());

    this.root.add([this.explainBox, this.okBtn]);
  }

  // ============================================================
  // จับเวลา
  // ============================================================
  _startTimer() {
    this.startTime = this.time.now;
    if (!CONFIG.QUIZ.TIMER_ENABLED) return;
    const limitMs = CONFIG.QUIZ.TIME_LIMIT_SEC * 1000;
    this.timerEvent = this.time.addEvent({
      delay: CONFIG.QUIZ_PANEL.TIMER_TICK_MS,
      loop: true,
      callback: () => {
        if (this.answered) return;
        const left = Math.max(0, limitMs - (this.time.now - this.startTime));
        this._drawTimer(left / limitMs);
        if (left <= 0) this._answer(-1);
      },
    });
  }

  _drawTimer(ratio) {
    const Q = CONFIG.QUIZ_PANEL;
    const g = this.timerBar;
    const w = Q.CONTENT_WIDTH;
    const x = -w / 2;
    const y = this._ly(Q.TIMER_BAR_Y);
    g.clear();
    if (!CONFIG.QUIZ.TIMER_ENABLED) return;
    const secLeft = Math.ceil(ratio * CONFIG.QUIZ.TIME_LIMIT_SEC);
    const warn = secLeft <= CONFIG.QUIZ.TIMER_WARN_SEC;
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(x, y, w, Q.TIMER_BAR_HEIGHT, Q.TIMER_BAR_HEIGHT / 2);
    if (ratio > 0) {
      g.fillStyle(warn ? Q.TIMER_WARN_COLOR : Q.TIMER_COLOR, 1);
      g.fillRoundedRect(x, y, Math.max(Q.TIMER_BAR_HEIGHT, w * ratio), Q.TIMER_BAR_HEIGHT, Q.TIMER_BAR_HEIGHT / 2);
    }
    this.timerText.setText(`เวลา ${secLeft} วินาที`);
    this.timerText.setColor(warn ? '#d9434f' : '#5a4a3a');
  }

  // ============================================================
  // ตอบคำถาม
  // ============================================================
  _answer(choiceIndex) {
    if (this.answered) return;
    this.answered = true;
    if (this.timerEvent) this.timerEvent.remove();
    const Q = CONFIG.QUIZ_PANEL;

    const timeMs = this.time.now - this.startTime;
    const timedOut = choiceIndex < 0;
    const correct = !timedOut && QuizSystem.checkAnswer(this.question, choiceIndex);
    const entry = QuizSystem.record({
      prepared: this.question, choiceIndex, timeMs, context: this.opts.context, extra: this.opts.extra,
    });
    this.result = { correct, timedOut, questionId: this.question.id, topic: this.question.topic, timeMs, entry };

    const right = this.choiceButtons[this.question.correctIndex];
    this.choiceButtons.forEach((b, i) => {
      b.container.disableInteractive();
      this.tweens.add({ targets: b.container, scale: 1, duration: 90 });
      if (i !== this.question.correctIndex && i !== choiceIndex) b.container.setAlpha(Q.CHOICE_DIM_ALPHA);
    });
    right.bgCream.setVisible(false);
    right.bgGreen.setVisible(true);

    if (correct) {
      SoundFx.play(this, 'correct');
      const m = right.container.getWorldTransformMatrix();
      this.starEmitter.explode(Q.STAR_COUNT, m.tx, m.ty);
      this.tweens.add({ targets: right.container, scale: 1.08, duration: 140, yoyo: true, ease: 'Back.easeOut' });
    } else {
      SoundFx.play(this, 'wrong');
      if (!timedOut) {
        const wrong = this.choiceButtons[choiceIndex];
        wrong.bgCream.setVisible(false);
        wrong.bgRed.setVisible(true);
        const x0 = wrong.container.x;
        this.tweens.add({
          targets: wrong.container, x: x0 + Q.WRONG_SHAKE_PX, duration: Q.WRONG_SHAKE_MS,
          yoyo: true, repeat: Q.WRONG_SHAKE_REPEAT, onComplete: () => { wrong.container.x = x0; },
        });
      }
      this.tweens.add({ targets: right.container, scale: 1.05, duration: 200, yoyo: true, repeat: 1 });
    }

    this._showExplanation(correct, timedOut);
  }

  _showExplanation(correct, timedOut) {
    const Q = CONFIG.QUIZ_PANEL;
    let head;
    if (correct) head = '✔ ถูกต้อง! เก่งมาก';
    else if (timedOut) head = `⏰ หมดเวลา! คำตอบที่ถูกคือข้อ ${this.question.correctIndex + 1}`;
    else head = `✘ ยังไม่ถูก คำตอบที่ถูกคือข้อ ${this.question.correctIndex + 1}`;
    this.resultText.setText(head).setColor(correct ? '#2e8b57' : '#d9434f');

    TextUtil.fitText(this.explainText, TextUtil.formatChem(this.question.explanation), {
      width: Q.EXPLAIN_WIDTH - 36, height: Q.EXPLAIN_HEIGHT - 48, maxSize: Q.EXPLAIN_FONT_MAX, minSize: Q.EXPLAIN_FONT_MIN,
    });

    [this.explainBox, this.okBtn].forEach((o) => {
      o.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: Q.OPEN_MS });
    });
    this.time.delayedCall(Q.OK_DELAY_MS, () => { this.okEnabled = true; });
  }

  _onOk() {
    if (!this.answered || !this.okEnabled || this.closing) return;
    this.closing = true;
    SoundFx.play(this, 'click');
    const Q = CONFIG.QUIZ_PANEL;
    this.tweens.add({ targets: this.root, scale: 0.9, alpha: 0, duration: Q.CLOSE_MS, ease: 'Sine.easeIn' });
    this.tweens.add({
      targets: this.dim, alpha: 0, duration: Q.CLOSE_MS,
      onComplete: () => this._finish(this.result),
    });
  }

  _finish(result) {
    const done = this.opts.onDone;
    this.scene.stop();
    if (done) done(result);
  }
}
