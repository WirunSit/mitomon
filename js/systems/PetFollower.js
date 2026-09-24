/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/PetFollower.js
   ------------------------------------------------------------
   สัตว์เลี้ยงที่เดินตามผู้เล่นบนแผนที่ (ใช้ใน WorldScene)
   - ตามหลังผู้เล่นระยะ CONFIG.PET.FOLLOW_DISTANCE แบบนุ่มนวล (lerp)
   - ยืนนิ่ง: tween หายใจ (scaleY) + สลับ idle/blink แบบสุ่มทุก 2-4 วินาที
   - เดิน: tween เด้ง (hop) + หันซ้าย/ขวาตามทิศ
   - คลิก/แตะ: กระโดดดีใจ + หัวใจลอย
   - อัปเดตภาพอัตโนมัติเมื่อสัตว์เลี้ยงวิวัฒนาการ (อีเวนต์ pet-changed)

   โครงสร้างการแสดงผล:
     container (ตำแหน่ง = จุดเท้า)
       ├─ shadow (วงรีเงา)
       └─ sprite (origin 0.5,1) <- tween hop/jump ใช้ sprite.y, หายใจใช้ scaleY
   ========================================================== */

class PetFollower {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Sprite} player
   * @param {number} playerFeetOffsetY ระยะจากจุดกึ่งกลางสไปรต์ผู้เล่นถึงเท้า
   */
  constructor(scene, player, playerFeetOffsetY) {
    this.scene = scene;
    this.player = player;
    this.feetOffset = playerFeetOffsetY;
    this.pet = PetSystem.current;
    this.form = this.pet.form;
    this.moving = false;
    this.jumping = false;
    this.facingFlip = false;

    const P = CONFIG.PET;
    const startX = player.x - P.FOLLOW_DISTANCE;
    const startY = player.y + this.feetOffset;

    this.shadow = scene.add.ellipse(0, 0, 60, 16, 0x000000, 0.22);
    this.sprite = scene.add.sprite(0, 0, PetSystem.getTextureKey(this.pet, 'idle')).setOrigin(0.5, 1);
    this.sprite.setData('isPet', true);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => this.jumpForJoy());

    this.container = scene.add.container(startX, startY, [this.shadow, this.sprite]);
    this._applyFormScale();
    this._startIdleTween();
    this._scheduleBlink();

    // อัปเดตเมื่อสถานะสัตว์เลี้ยงเปลี่ยน (เช่น วิวัฒนาการ)
    this._onPetChanged = (pet) => this.refresh(pet);
    scene.game.events.on('pet-changed', this._onPetChanged);
    scene.events.once('shutdown', () => this.destroy());
  }

  // ============================================================
  // ขนาดตามร่าง
  // ============================================================
  _applyFormScale() {
    const P = CONFIG.PET;
    const h = P.WORLD_HEIGHT_BY_FORM[this.form - 1] || P.WORLD_HEIGHT_BY_FORM[0];
    this.baseScale = h / this.sprite.height;
    this.sprite.setScale(this.baseScale);
    this.sprite.setFlipX(this.facingFlip);
    this.shadow.setSize(this.sprite.displayWidth * 0.6, h * 0.14);
  }

  _texture(pose) {
    return PetSystem.getTextureKey(this.pet, pose);
  }

  // ============================================================
  // tween ท่ายืน / เดิน
  // ============================================================
  _stopMotionTweens() {
    if (this.breathTween) { this.breathTween.stop(); this.breathTween = null; }
    if (this.hopTween) { this.hopTween.stop(); this.hopTween = null; }
    this.sprite.y = 0;
    this.sprite.setScale(this.baseScale);
  }

  _startIdleTween() {
    this._stopMotionTweens();
    this.breathTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseScale * CONFIG.PET.BREATH_SCALE_Y,
      duration: CONFIG.PET.BREATH_MS,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _startWalkTween() {
    this._stopMotionTweens();
    this.hopTween = this.scene.tweens.add({
      targets: this.sprite,
      y: -CONFIG.PET.HOP_HEIGHT,
      duration: CONFIG.PET.HOP_MS,
      yoyo: true, repeat: -1, ease: 'Quad.easeOut',
    });
  }

  // ============================================================
  // กะพริบตาแบบสุ่ม
  // ============================================================
  _scheduleBlink() {
    const P = CONFIG.PET;
    this.blinkTimer = this.scene.time.delayedCall(Phaser.Math.Between(P.BLINK_MIN_MS, P.BLINK_MAX_MS), () => {
      if (!this.sprite || !this.sprite.active) return;
      if (!this.jumping) this.sprite.setTexture(this._texture('blink'));
      this.scene.time.delayedCall(P.BLINK_DURATION_MS, () => {
        if (this.sprite && this.sprite.active && !this.jumping) this.sprite.setTexture(this._texture('idle'));
      });
      this._scheduleBlink();
    });
  }

  // ============================================================
  // คลิก: กระโดดดีใจ + หัวใจลอย
  // ============================================================
  jumpForJoy() {
    if (this.jumping) return;
    const P = CONFIG.PET;
    this.jumping = true;
    this._stopMotionTweens();
    this.sprite.setTexture(this._texture('blink')); // ตายิ้มปิดตาตอนดีใจ

    this.scene.tweens.add({
      targets: this.sprite,
      y: -P.JUMP_HEIGHT,
      duration: P.JUMP_MS,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.jumping = false;
        this.sprite.setTexture(this._texture('idle'));
        if (this.moving) this._startWalkTween(); else this._startIdleTween();
      },
    });

    const topY = this.container.y - this.sprite.displayHeight;
    for (let i = 0; i < P.HEART_COUNT; i++) {
      const heart = this.scene.add.image(
        this.container.x + Phaser.Math.Between(-P.HEART_SPREAD, P.HEART_SPREAD),
        topY,
        'fx_heart'
      ).setScale(0).setDepth(this.container.depth + 1);
      const delay = i * P.HEART_STAGGER_MS;
      // เด้งโผล่ -> ลอยขึ้น -> ค่อย ๆ จางช่วงท้าย
      this.scene.tweens.add({ targets: heart, scale: P.HEART_SCALE, duration: P.HEART_POP_MS, delay, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: heart, y: topY - P.HEART_RISE, duration: P.HEART_MS, delay, ease: 'Sine.easeOut' });
      this.scene.tweens.add({
        targets: heart,
        alpha: 0,
        delay: delay + P.HEART_MS * P.HEART_FADE_START,
        duration: P.HEART_MS * (1 - P.HEART_FADE_START),
        onComplete: () => heart.destroy(),
      });
    }
  }

  // ============================================================
  // อัปเดตทุกเฟรม: เดินตามผู้เล่น
  // ============================================================
  update(delta) {
    const P = CONFIG.PET;
    const px = this.player.x;
    const py = this.player.y + this.feetOffset;
    const cx = this.container.x;
    const cy = this.container.y;

    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let nx = cx;
    let ny = cy;
    if (dist > P.TELEPORT_DISTANCE) {
      nx = px - P.FOLLOW_DISTANCE;
      ny = py;
    } else if (dist > P.FOLLOW_DISTANCE) {
      // จุดหมาย = อยู่บนเส้นตรงไปหาผู้เล่น ห่างผู้เล่น FOLLOW_DISTANCE
      const tx = px - (dx / dist) * P.FOLLOW_DISTANCE;
      const ty = py - (dy / dist) * P.FOLLOW_DISTANCE;
      const frames = delta / (1000 / 60);
      const k = 1 - Math.pow(1 - P.FOLLOW_LERP, frames);
      nx = cx + (tx - cx) * k;
      ny = cy + (ty - cy) * k;
    }

    const frames = Math.max(delta / (1000 / 60), 0.0001);
    const vx = (nx - cx) / frames;
    const vy = (ny - cy) / frames;
    const speed = Math.sqrt(vx * vx + vy * vy);

    this.container.setPosition(nx, ny);
    // จัดลำดับความลึกเทียบกับผู้เล่น (ผู้เล่นใช้ y กึ่งกลางตัว จึงลบ offset เท้าออก)
    this.container.setDepth(CONFIG.PLAYER.DEPTH + (ny - this.feetOffset) * 0.001);

    // หันตามทิศ
    if (Math.abs(vx) > P.FACING_DEADZONE) {
      this.facingFlip = P.SPRITE_FACES_LEFT ? vx > 0 : vx < 0;
      this.sprite.setFlipX(this.facingFlip);
    }

    const isMoving = speed > P.MOVING_SPEED_THRESHOLD;
    if (isMoving !== this.moving) {
      this.moving = isMoving;
      if (!this.jumping) {
        if (isMoving) this._startWalkTween(); else this._startIdleTween();
      }
    }
  }

  // ============================================================
  // เมื่อสถานะสัตว์เปลี่ยน (เปลี่ยนร่าง)
  // ============================================================
  refresh(pet) {
    if (!pet || !this.sprite || !this.sprite.active) return;
    this.pet = pet;
    if (pet.form !== this.form) {
      this.form = pet.form;
      this.sprite.setTexture(this._texture('idle'));
      this._applyFormScale();
      if (!this.jumping) {
        if (this.moving) this._startWalkTween(); else this._startIdleTween();
      }
    }
  }

  destroy() {
    if (this._onPetChanged) {
      this.scene.game.events.off('pet-changed', this._onPetChanged);
      this._onPetChanged = null;
    }
    if (this.blinkTimer) this.blinkTimer.remove(false);
    if (this.container && this.container.active) this.container.destroy();
  }
}
