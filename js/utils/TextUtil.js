/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/utils/TextUtil.js
   ------------------------------------------------------------
   ตัวช่วยจัดข้อความภาษาไทยสำหรับ Phaser.Text
   1) formatChem(str)  แปลงสูตรเคมีที่พิมพ์แบบธรรมดาให้เป็น
      ตัวห้อย/ตัวยก เช่น CO2 -> CO₂, H2O -> H₂O, NAD+ -> NAD⁺
      (ใช้ตอน "แสดงผล" เท่านั้น ไม่แก้ข้อมูลในคลังคำถาม
       ข้อความที่เป็นตัวห้อย Unicode อยู่แล้วจะไม่เปลี่ยน)
   2) wrapThai(str, font, maxWidth)  ตัดบรรทัดภาษาไทยที่ไม่มี
      ช่องว่างคั่นคำ โดยใช้ Intl.Segmenter ('th') แยกคำ
      (ถ้าเบราว์เซอร์ไม่รองรับ จะตัดตามกลุ่มตัวอักษรโดยไม่แยก
       สระบน/ล่าง/วรรณยุกต์ออกจากพยัญชนะ)
   3) fitText(textObj, str, opts)  หาขนาดฟอนต์ใหญ่สุดที่
      ข้อความพอดีกรอบ (กว้าง x สูง) แล้วตั้งค่าให้ Text
   ========================================================== */

const TextUtil = {
  _canvas: null,
  _segmenter: undefined,

  // ---------------- สูตรเคมี ----------------
  _SUB: { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' },

  formatChem(str) {
    if (!str) return '';
    const sub = (d) => d.split('').map((ch) => this._SUB[ch] || ch).join('');
    let s = String(str);
    // ตัวพาอิเล็กตรอน/ไอออนที่พบบ่อย
    s = s.replace(/NAD\+/g, 'NAD⁺').replace(/\bH\+/g, 'H⁺');
    s = s.replace(/FADH2\b/g, 'FADH₂');
    // สูตรที่ประกอบด้วยธาตุ C H O N P S ตามด้วยตัวเลข เช่น C6H12O6, CO2, H2O, O2, C2H5OH
    // (ตัวเลขนำหน้า เช่น 6 ใน 6CO2 คือสัมประสิทธิ์ ไม่ทำเป็นตัวห้อย)
    s = s.replace(/\b(\d*)((?:(?:C|H|O|N|P|S)\d*)+(?:OH)?)\b/g, (m, coef, formula) => (
      /\d/.test(formula) ? coef + formula.replace(/\d+/g, sub) : m
    ));
    return s;
  },

  // ---------------- วัดความกว้างข้อความ ----------------
  _ctx(font) {
    if (!this._canvas) this._canvas = document.createElement('canvas');
    const ctx = this._canvas.getContext('2d');
    ctx.font = font;
    return ctx;
  },

  fontString(sizePx, bold) {
    return `${bold ? 'bold ' : ''}${sizePx}px ${CONFIG.GAME.FONT_FAMILY}`;
  },

  // ---------------- แยกคำ ----------------
  _segments(str) {
    if (this._segmenter === undefined) {
      try {
        this._segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter)
          ? new Intl.Segmenter('th', { granularity: 'word' })
          : null;
      } catch (e) {
        this._segmenter = null;
      }
    }
    if (this._segmenter) {
      return Array.from(this._segmenter.segment(str), (s) => s.segment);
    }
    // สำรอง: รวมสระบน/ล่าง/วรรณยุกต์เข้ากับตัวอักษรก่อนหน้า
    const out = [];
    const combining = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
    for (const ch of str) {
      if (out.length && combining.test(ch)) out[out.length - 1] += ch;
      else out.push(ch);
    }
    return out;
  },

  /** ตัดข้อความเป็นบรรทัด (คืนอาเรย์ของบรรทัด) */
  wrapThai(str, font, maxWidth) {
    const ctx = this._ctx(font);
    const lines = [];
    String(str).split('\n').forEach((para) => {
      let line = '';
      this._segments(para).forEach((seg) => {
        const test = line + seg;
        if (line && ctx.measureText(test).width > maxWidth) {
          lines.push(line.replace(/\s+$/, ''));
          line = seg.replace(/^\s+/, '');
          // คำเดียวยาวเกินบรรทัด -> หั่นเป็นตัวอักษร
          while (ctx.measureText(line).width > maxWidth && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        } else {
          line = test;
        }
      });
      lines.push(line.replace(/\s+$/, ''));
    });
    return lines;
  },

  /**
   * ใส่ข้อความลง Text ให้พอดีกรอบ
   * opts = { width, height, maxSize, minSize, maxLines?, bold?, lineSpacing? }
   */
  fitText(textObj, str, opts) {
    const spacing = opts.lineSpacing != null ? opts.lineSpacing : CONFIG.QUIZ_PANEL.LINE_SPACING;
    let size = opts.maxSize;
    let lines = [];
    for (; size >= opts.minSize; size--) {
      lines = this.wrapThai(str, this.fontString(size, opts.bold), opts.width);
      const h = lines.length * (size * 1.5 + spacing);
      if (h <= opts.height && (!opts.maxLines || lines.length <= opts.maxLines)) break;
    }
    size = Math.max(size, opts.minSize);
    textObj.setFontSize(size);
    textObj.setLineSpacing(spacing);
    textObj.setText(lines.join('\n'));
    return size;
  },
};
