/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - config.js
   ------------------------------------------------------------
   ไฟล์นี้เป็น "แหล่งความจริงเดียว" (single source of truth)
   สำหรับค่าตัวเลขทุกค่าที่ใช้ปรับสมดุลเกม (game balance)
   ห้ามฝังตัวเลข (magic number) ไว้ในไฟล์อื่นโดยตรง
   ให้เพิ่มค่าคอนฟิกใหม่ ๆ ไว้ในไฟล์นี้เสมอ แล้วอ้างอิงจากที่อื่น

   หมวดที่มีคอมเมนต์ "ใช้ในเฟสถัดไป" คือค่าที่ยังไม่ถูกใช้งานจริง
   ในเฟสปัจจุบัน แต่เตรียมโครงไว้ล่วงหน้าให้ระบบในอนาคตเรียกใช้ได้
   ========================================================== */

const CONFIG = {

  // ------------------------------------------------------------
  // ค่าพื้นฐานของหน้าต่างเกม
  // ------------------------------------------------------------
  GAME: {
    WIDTH: 1280,
    HEIGHT: 720,
    BACKGROUND_COLOR: '#0e0a1f',
    FONT_FAMILY: '"Kanit", "Mali", sans-serif',
  },

  // ------------------------------------------------------------
  // ผู้เล่น / การเคลื่อนที่บนแผนที่โลก (WorldScene)
  // ------------------------------------------------------------
  PLAYER: {
    START_SPEED: 220,          // ความเร็วเดิน (px/วินาที)
    BODY_RADIUS: 20,           // รัศมี physics body ของผู้เล่น (วงกลม)
    BODY_OFFSET_X: 36,         // ระยะ offset ของ body ให้อยู่กึ่งกลางเท้าสไปรต์ (= 112/2 - BODY_RADIUS)
    BODY_OFFSET_Y: 145,        // (คำนวณจากภาพจริงขนาด 112x192 - บริเวณเท้า/ข้อเท้า)
    CLICK_MOVE_STOP_DISTANCE: 6, // ระยะที่ถือว่า "ถึงจุดหมาย" แล้วเมื่อคลิกเดิน
    WALK_FRAME_SWAP_MS: 160,   // ความถี่การสลับเฟรม player_side <-> player_walk ตอนเดินด้านข้าง
    WALK_BOUNCE_SCALE: 1.06,   // สเกลสูงสุดตอนเด้งขณะเดิน (squash/stretch)
    WALK_BOUNCE_DURATION_MS: 180,
    SPRITE_SCALE: 1,
    DEPTH: 10,
  },

  // ------------------------------------------------------------
  // แผนที่ (ขนาดภาพพื้นหลังแต่ละฉาก ต้องตรงกับไฟล์ภาพจริง)
  // ------------------------------------------------------------
  MAP: {
    FARM:  { WIDTH: 1536, HEIGHT: 1024 },
    ZONE1: { WIDTH: 1536, HEIGHT: 1024 },
    ZONE2: { WIDTH: 1536, HEIGHT: 1024 },
    ZONE3: { WIDTH: 1536, HEIGHT: 1024 },
    ZONE4: { WIDTH: 1536, HEIGHT: 1024 },
    BOSS: { WIDTH: 1536, HEIGHT: 1024 },
    BOSS:  { WIDTH: 1536, HEIGHT: 1024 }, // ใช้ในเฟสถัดไป
    WARP_TRANSITION_MS: 300,   // ระยะเวลา fade out/in ตอนวาร์ป
  },

  // ------------------------------------------------------------
  // กล่องข้อความแจ้งเตือน + UI ทั่วไป (UIScene)
  // ------------------------------------------------------------
  UI: {
    NOTIFY_SLIDE_MS: 260,      // เวลาที่ใช้เลื่อนเข้า/ออก
    NOTIFY_HOLD_MS: 2200,      // เวลาที่ค้างแสดงข้อความ
    NOTIFY_MAX_WIDTH: 560,
    NOTIFY_MAX_QUEUE: 2,       // ข้อความรอคิวได้สูงสุดเท่านี้ (เก่าสุดถูกทิ้ง)
    NOTIFY_HOLD_BUSY_MS: 900,  // ถ้ามีข้อความรอคิว ให้ข้อความปัจจุบันค้างสั้นลง
    NOTIFY_FONT_SIZE: 20,
    PLAYER_NAME_FONT_SIZE: 22,
    PANEL_RADIUS: 14,
  },

  // ------------------------------------------------------------
  // กรอบข้อมูลสัตว์เลี้ยงมุมจอ (UIScene)
  // ------------------------------------------------------------
  PET_PANEL: {
    X: 20,
    Y: 66,                     // อยู่ใต้ป้ายชื่อผู้เล่น
    WIDTH: 340,
    HEIGHT: 116,
    FACE_SIZE: 84,             // เส้นผ่านศูนย์กลางวงกลมรูปหน้า
    FACE_ZOOM: 1.35,           // ขยายภาพให้เห็นเฉพาะช่วงหน้า (เทียบความกว้างวงกลม)
    FACE_FOCUS_Y: 0.4,         // ตำแหน่งแนวตั้งของภาพที่ถือเป็น "หน้า" (0=บน, 1=ล่าง)
    BAR_WIDTH: 210,
    BAR_HEIGHT: 14,
    BAR_TWEEN_MS: 350,         // เวลาที่หลอด HP/EXP เลื่อนไปค่าใหม่
    HP_COLOR: 0xff6b7a,
    HP_LOW_COLOR: 0xff3b3b,
    HP_LOW_RATIO: 0.3,         // ต่ำกว่าสัดส่วนนี้ หลอด HP เปลี่ยนเป็นสีเตือน
    EXP_COLOR: 0x7fd6ff,
    NAME_FONT_SIZE: 20,
    SMALL_FONT_SIZE: 14,
  },

  // ------------------------------------------------------------
  // ฉากฟักไข่ (HatchScene)
  // ------------------------------------------------------------
  HATCH: {
    NEST_X: 640,
    NEST_Y: 420,
    NEST_DISPLAY_WIDTH: 1000,
    // ตำแหน่งแนวนอนของหลุมทั้ง 5 บนรัง (สัดส่วนจากความกว้างรัง, วัดจากภาพจริง)
    EGG_SLOT_RATIOS: [0.178, 0.333, 0.496, 0.656, 0.814],
    EGG_SLOT_Y_OFFSET: -30,    // ยกไข่ขึ้นจากกึ่งกลางรังเล็กน้อยให้ดูนั่งในหลุม
    EGG_DISPLAY_HEIGHT: 130,
    EGG_HOVER_SCALE: 1.08,
    EGG_SELECTED_SCALE: 1.18,
    EGG_WOBBLE_ANGLE: 4,       // องศาการโยกเบา ๆ ตอนรอเลือก
    EGG_WOBBLE_MIN_MS: 700,
    EGG_WOBBLE_MAX_MS: 1100,
    HATCH_EGG_X: 640,
    HATCH_EGG_Y: 380,
    HATCH_EGG_HEIGHT: 260,     // ขนาดไข่ตอนย้ายมากลางจอเพื่อฟัก
    MOVE_TO_CENTER_MS: 600,
    TAPS_TO_HATCH: 5,
    CRACK_AT_TAP: 3,           // แตะครั้งที่เท่านี้ เปลี่ยนเป็นภาพไข่ร้าว
    SHAKE_BASE_ANGLE: 6,       // องศาการสั่นครั้งแรก
    SHAKE_STEP_ANGLE: 4,       // สั่นแรงขึ้นครั้งละเท่านี้
    SHAKE_MS: 55,
    SHAKE_REPEAT: 3,
    TAP_SPARKS: 6,             // ประกายเล็กตอนแตะแต่ละครั้ง
    FLASH_MS: 450,
    STAR_BURST_COUNT: 40,
    STAR_SPEED_MIN: 150,
    STAR_SPEED_MAX: 420,
    STAR_LIFESPAN_MS: 1100,
    STAR_SCALE: 0.28,
    PET_REVEAL_HEIGHT: 230,
    PET_REVEAL_Y: 400,         // ตำแหน่งเท้าของสัตว์เลี้ยงตอนปรากฏ
    PET_JOY_JUMPS: 3,
    PET_JOY_JUMP_HEIGHT: 40,
    PET_JOY_JUMP_MS: 200,
    NICKNAME_MAX_LENGTH: 12,
    HINT_FONT_SIZE: 20,
    HINT_BOX_WIDTH: 720,
  },

  // ------------------------------------------------------------
  // สัตว์เลี้ยงในโลก (PetFollower ใน WorldScene)
  // ------------------------------------------------------------
  PET: {
    WORLD_HEIGHT_BY_FORM: [90, 115, 140], // ความสูงบนแผนที่ของร่าง 1/2/3 (px)
    SPRITE_FACES_LEFT: true,   // ภาพต้นฉบับหันซ้าย -> เดินไปขวาต้อง flipX
    FOLLOW_DISTANCE: 90,       // ระยะที่สัตว์ตามหลังผู้เล่น
    FOLLOW_SIDE_OFFSET: 34,    // ยืนเยื้องข้างผู้เล่นเล็กน้อยไม่ให้ทับตัว
    FOLLOW_LERP: 0.12,         // ความนุ่มนวลในการตาม (ต่อเฟรมที่ 60fps)
    MOVING_SPEED_THRESHOLD: 0.5, // px/เฟรม ขั้นต่ำที่ถือว่า "กำลังเดิน"
    FACING_DEADZONE: 0.8,      // px/เฟรม กันการหันกลับไปมาตอนเกือบหยุด
    TELEPORT_DISTANCE: 400,    // ห่างเกินนี้ให้วาร์ปมาใกล้ผู้เล่นทันที
    BLINK_MIN_MS: 2000,
    BLINK_MAX_MS: 4000,
    BLINK_DURATION_MS: 170,
    BREATH_SCALE_Y: 1.05,
    BREATH_MS: 900,
    HOP_HEIGHT: 10,
    HOP_MS: 150,
    JUMP_HEIGHT: 45,
    JUMP_MS: 220,
    HEART_COUNT: 3,
    HEART_SCALE: 0.22,
    HEART_RISE: 80,
    HEART_SPREAD: 40,
    HEART_MS: 1000,
    HEART_POP_MS: 250,         // เวลาหัวใจเด้งขยายตอนโผล่
    HEART_FADE_START: 0.6,     // เริ่มจางเมื่อผ่านไปสัดส่วนนี้ของ HEART_MS
    HEART_STAGGER_MS: 120,     // หัวใจแต่ละดวงโผล่ห่างกัน
  },

  // ------------------------------------------------------------
  // จุดพักฟื้น (heal point)
  // ------------------------------------------------------------
  HEAL: {
    RING_WIDTH: 140,           // ความกว้างวงแหวนบนพื้น (px)
    RING_PULSE_SCALE: 1.12,
    RING_PULSE_MS: 900,
    SPARKLE_COUNT: 12,
    SPARKLE_SCALE: 0.15,
    SPARKLE_SPEED_MIN: 40,
    SPARKLE_SPEED_MAX: 120,
    SPARKLE_LIFESPAN_MS: 900,
    SPARKLE_RISE_OFFSET: 40,   // จุดปล่อยประกายเหนือเท้าสัตว์เลี้ยง
  },

  // ------------------------------------------------------------
  // ระบบค่าประสบการณ์และเลเวล (PetSystem)
  // ------------------------------------------------------------
  EXP: {
    MAX_LEVEL: 15,
    EVOLVE_LEVEL_STAGE_2: 5,
    EVOLVE_LEVEL_STAGE_3: 10,
    // EXP ที่ต้องใช้จากเลเวล L ไป L+1 = EXP_BASE + EXP_STEP x (L - 1)
    EXP_BASE: 20,
    EXP_STEP: 10,
  },

  // ------------------------------------------------------------
  // ค่าพลังสัตว์เลี้ยง: ค่าเริ่มต้นของแต่ละสายพันธุ์อยู่ใน
  // js/data/pets.js (baseHP = HP เลเวล 1, baseATK = atkBase)
  //   maxHP = baseHP + HP_PER_LEVEL x (level - 1)   (เลเวลอัปแต่ละครั้ง +HP_PER_LEVEL)
  //   ATK   = baseATK + level x ATK_PER_LEVEL
  // ------------------------------------------------------------
  PET_STATS: {
    BASE_HP: 30,               // ค่าสำรองถ้าข้อมูลสายพันธุ์ไม่มี baseHP
    BASE_ATK: 6,               // ค่าสำรองถ้าข้อมูลสายพันธุ์ไม่มี baseATK
    HP_PER_LEVEL: 5,          // (เฟส 8: ปรับจาก 4 ตามผลจำลองสมดุล)
    ATK_PER_LEVEL: 1.5,
    HEAL_FULL_ON_LEVEL_UP: true,
  },

  // ------------------------------------------------------------
  // เอฟเฟกต์เลเวลอัป (LevelUpScene)
  // ------------------------------------------------------------
  LEVELUP: {
    DIM_ALPHA: 0.55,
    PET_HEIGHT_BY_FORM: [210, 245, 280],
    PET_Y: 470,                // ตำแหน่งเท้าสัตว์เลี้ยง
    JUMP_HEIGHT: 70,
    JUMP_MS: 230,
    JUMP_COUNT: 3,
    RING_Y_OFFSET: 6,
    RING_SCALE_FROM: 0.3,
    RING_SCALE_TO: 0.9,
    RING_MS: 900,
    BANNER_Y: 150,
    BANNER_DROP_MS: 380,
    TITLE_FONT_SIZE: 52,
    DETAIL_Y: 560,             // ข้อความรายละเอียด (เลเวล/ค่าพลังที่เพิ่ม)
    DETAIL_FONT_SIZE: 24,
    SPARKLES: 36,
    HOLD_MS: 1700,             // ค้างแต่ละขั้นก่อนเล่นขั้นถัดไป (แตะจอเพื่อข้ามได้)
    FADE_MS: 220,
    NOTES: [523, 659, 784, 1047], // เสียงเลเวลอัป (Hz)
  },

  // ------------------------------------------------------------
  // ฉากพัฒนาร่าง (EvolutionScene)
  // ------------------------------------------------------------
  EVOLUTION: {
    PET_HEIGHT_FROM: 240,      // ความสูงเงาร่างเดิม
    PET_HEIGHT_TO: 280,        // ความสูงร่างใหม่
    PET_Y: 400,                // ตำแหน่งเท้า
    INTRO_MS: 700,             // จอมืด + ร่างเดิมกลายเป็นเงาขาว
    BLINK_TOTAL_MS: 3000,      // ช่วงกะพริบสลับร่าง
    BLINK_START_MS: 420,       // ช่วงสลับแรกสุด
    BLINK_MIN_MS: 45,          // ช่วงสลับเร็วสุด
    BLINK_ACCEL: 0.8,          // คูณช่วงเวลาทุกครั้ง (น้อยกว่า 1 = เร็วขึ้นเรื่อย ๆ)
    FLASH_MS: 600,
    GLOW_SCALE: 3.2,
    GLOW_MS: 700,
    REVEAL_MS: 500,
    SPARKLES: 60,
    TITLE_Y: 56,
    TITLE_FONT_SIZE: 34,
    NAME_Y: 440,
    NAME_FONT_SIZE: 40,
    DESC_Y: 484,
    DESC_FONT_SIZE: 22,
    DESC_WIDTH: 860,
    FACT_DELAY_MS: 1200,       // หน่วงก่อนแสดง "ความรู้ประจำร่าง"
    FACT_PANEL_Y: 522,         // ขอบบนกล่องความรู้ประจำร่าง
    FACT_PANEL_WIDTH: 900,
    FACT_PANEL_HEIGHT: 118,
    FACT_FONT_SIZE: 22,
    BUTTON_Y: 678,
    NOTES_RISE: [392, 523, 659, 784, 1047, 1319],
  },

  // ------------------------------------------------------------
  // ฉากฉลองเลเวลเต็ม + ใบประกาศ (MaxLevelScene)
  // ------------------------------------------------------------
  CERTIFICATE: {
    CELEBRATE_MS: 2600,        // ช่วงฉลอง "เลเวลเต็ม!" ก่อนแสดงใบประกาศ
    CONFETTI_EVERY_MS: 120,
    CONFETTI_PER_BURST: 6,
    FRAME_WIDTH: 1100,
    FRAME_HEIGHT: 700,
    FRAME_SCALE: 0.86,         // ขนาดใบประกาศบนจอ
    FRAME_CENTER_Y: 330,
    PET_HEIGHT: 220,
    TITLE_FONT_SIZE: 44,
    BODY_FONT_SIZE: 26,
    SMALL_FONT_SIZE: 20,
    BUTTON_Y: 678,
    BUTTON_WIDTH: 280,
    BUTTON_HEIGHT: 64,
    FILE_NAME: 'MitoMon_ใบประกาศ.png',
  },

  // ------------------------------------------------------------
  // เวลาเล่นรวม (PlayTimeSystem)
  // ------------------------------------------------------------
  PLAYTIME: {
    TICK_MS: 5000,             // บันทึกเวลาเล่นทุก ๆ กี่มิลลิวินาที
    MAX_TICK_MS: 15000,        // นับไม่เกินเท่านี้ต่อครั้ง (กันนับตอนเครื่องหลับ)
  },

  // ------------------------------------------------------------
  // มอนสเตอร์: ค่าพลัง + การเจอ (ชื่อ/ภาพอยู่ใน js/data/monsters.js)
  // ------------------------------------------------------------
  MONSTER: {
    STATS: {
      m1:   { HP: 30,  ATK: 6,  EXP: 18 },   // เจลลี่ไพรูเวต (โซน 1)
      m2:   { HP: 45,  ATK: 8,  EXP: 28 },   // ผีหมอก CO₂ (โซน 2)
      m3:   { HP: 60,  ATK: 10, EXP: 38 },   // ค้างคาวอิเล็กตรอน (โซน 3)
      m4:   { HP: 70,  ATK: 12, EXP: 45 },   // สไลม์แลกติก (โซน 4)
      boss: { HP: 250, ATK: 15, EXP: 150 },  // ราชาตัวยับยั้ง (ป้อมบอส)
    },
    // --- เจอในพุ่มหญ้า/เขตอันตราย (dangerZones ใน maps.js) ---
    ENCOUNTER_CHANCE_PER_STEP: 0.08, // โอกาสเจอต่อ 1 ก้าวในเขตอันตราย
    STEP_DISTANCE: 36,         // เดินครบกี่พิกเซลนับเป็น 1 ก้าว
    SAFE_AFTER_BATTLE_SEC: 5,  // ช่วงปลอดภัยหลังจบการต่อสู้ (ชนะ/หนี)
    SAFE_ON_ENTER_SEC: 2,      // ช่วงปลอดภัยตอนเพิ่งเข้าแผนที่
    // --- มอนสเตอร์เดินเตร่บนแผนที่ (wanderers ใน maps.js) ---
    WANDER_HEIGHT: 84,         // ความสูงบนแผนที่ (px)
    WANDER_SPEED: 55,          // px/วินาที
    WANDER_PAUSE_MIN_MS: 600,
    WANDER_PAUSE_MAX_MS: 1800,
    WANDER_BOB_PX: 5,
    WANDER_BOB_MS: 420,
    WANDER_TOUCH_DISTANCE: 52, // ระยะเท้าผู้เล่นถึงมอนสเตอร์ที่ถือว่าชน
    WANDER_RESPAWN_SEC: 40,    // ชนะแล้ว มอนสเตอร์ตัวนั้นเกิดใหม่ในอีกกี่วินาที
    WANDER_SHADOW_ALPHA: 0.25,
    EXCLAIM_MS: 520,           // เวลาแสดง "!" เหนือหัวผู้เล่นก่อนเข้าต่อสู้
  },

  // ------------------------------------------------------------
  // ฉากต่อสู้ (BattleScene)
  // ------------------------------------------------------------
  BATTLE: {
    // --- เอฟเฟกต์เข้าฉาก ---
    TRANSITION_FLASH_COUNT: 2,
    TRANSITION_FLASH_MS: 130,
    TRANSITION_SPIN_MS: 700,
    TRANSITION_SPIN_TURNS: 1.25,  // จำนวนรอบที่กล้องหมุน
    TRANSITION_ZOOM: 2.4,
    INTRO_MS: 600,             // มอนสเตอร์/สัตว์เลื่อนเข้าฉาก
    VORTEX_SCALE: 5,           // วงหมุนตอนเปิดฉาก
    // --- ตำแหน่ง (เท้าตัวละครบนลานหินในภาพพื้นหลัง) ---
    PET_X: 372,
    PET_Y: 590,
    PET_HEIGHT_BY_FORM: [190, 225, 260],
    MONSTER_X: 1020,
    MONSTER_Y: 330,
    MONSTER_HEIGHT: 230,
    BOSS_HEIGHT: 320,
    SHADOW_WIDTH_RATIO: 0.55,
    SHADOW_HEIGHT: 34,
    SHADOW_ALPHA: 0.3,
    // --- ท่าทางมีชีวิต ---
    BREATH_SCALE: 1.045,
    BREATH_MS: 950,
    FLOAT_PX: 10,
    FLOAT_MS: 1300,
    // --- สูตรดาเมจ ---
    DAMAGE_VARIANCE: 0.1,      // ±10%
    COMBO_THRESHOLD: 3,        // ตอบถูกติดกันกี่ข้อขึ้นไปจึงเป็นคอมโบ
    COMBO_MULTIPLIER: 1.5,
    ATP_MULTIPLIER: 2,
    MIN_DAMAGE: 1,
    FLEE_CHANCE: 0.7,
    BOSS_CAN_FLEE: false,
    // --- ไอเท็มในการต่อสู้ ---
    POTION_HEAL_RATIO: 0.5,    // ยาฟื้น HP ร้อยละของ HP สูงสุด
    NAD_ELIMINATE: 1,          // NAD⁺ ตัดตัวเลือกผิดออกกี่ข้อ
    ITEM_USE_ENDS_TURN: false, // true = ใช้ยา/NAD⁺/ATP แล้วมอนสเตอร์ได้โจมตี
    // --- แอนิเมชันโจมตี ---
    DASH_MS: 200,
    DASH_RATIO: 0.72,          // พุ่งไปกี่ส่วนของระยะถึงเป้าหมาย
    RETURN_MS: 260,
    HIT_SHAKE_PX: 14,
    HIT_SHAKE_MS: 45,
    HIT_SHAKE_REPEAT: 4,
    HURT_SHOW_MS: 520,
    CAMERA_SHAKE_MS: 220,
    CAMERA_SHAKE_INTENSITY: 0.008,
    FX_SCALE: 0.9,
    FX_MS: 420,
    FX_PARTICLES: 18,
    DAMAGE_FONT_SIZE: 46,
    DAMAGE_RISE: 80,
    DAMAGE_MS: 950,
    COMBO_FONT_SIZE: 54,
    MESSAGE_HOLD_MS: 900,      // เวลาค้างข้อความก่อนเปลี่ยนตา
    // --- UI ---
    HP_BAR_WIDTH: 300,
    HP_BAR_HEIGHT: 18,
    HP_TWEEN_MS: 420,
    HP_COLOR: 0x5cc98a,
    HP_MID_COLOR: 0xffc94a,
    HP_LOW_COLOR: 0xff5b5b,
    HP_MID_RATIO: 0.5,
    HP_LOW_RATIO: 0.25,
    ENEMY_PANEL: { X: 40, Y: 34, W: 470, H: 100 },
    PET_PANEL: { X: 770, Y: 444, W: 470, H: 118 },
    MESSAGE_Y: 600,
    MESSAGE_WIDTH: 820,
    MESSAGE_X: 790,
    MENU_Y: 666,
    MENU_BUTTON_WIDTH: 340,
    MENU_BUTTON_HEIGHT: 78,
    MENU_GAP: 26,
    ITEM_MENU_Y: 470,
    ITEM_BUTTON_WIDTH: 520,
    ITEM_BUTTON_HEIGHT: 66,
    ITEM_BUTTON_GAP: 10,
    BUFF_Y: 96,                // แถวสถานะบัฟ (ใต้หลอด HP สัตว์เลี้ยง)
    RESULT_PANEL_WIDTH: 700,
    RESULT_PANEL_HEIGHT: 520,
    VICTORY_FADE_MS: 900,
    VICTORY_SPARKLES: 46,
    END_FADE_MS: 400,
    // --- เอฟเฟกต์ตามธาตุของสัตว์เลี้ยง ---
    ELEMENT_FX: {
      p1: { TEXTURE: 'fx_burst', TINT: 0xffd23f, PARTICLE: 'fx_sparkle', PARTICLE_TINT: 0xfff1a8 }, // กลูโคส
      p2: { TEXTURE: 'fx_burst', TINT: 0xff7a3d, PARTICLE: 'fx_sparkle', PARTICLE_TINT: 0xffb070 }, // ไมโท (ไฟ)
      p3: { TEXTURE: 'fx_burst', TINT: 0x7fd6ff, PARTICLE: 'item_oxygen', PARTICLE_TINT: 0xffffff }, // ออกซิเจน (ฟอง)
      p4: { TEXTURE: 'fx_burst', TINT: 0xb6ff5c, PARTICLE: 'fx_sparkle', PARTICLE_TINT: 0xfaff9e }, // พลังงาน (สายฟ้า)
      p5: { TEXTURE: 'fx_vortex', TINT: 0xffe2b0, PARTICLE: 'item_oxygen', PARTICLE_TINT: 0xffe9c2 }, // หมัก (ฟองฟู่)
    },
    MONSTER_FX_TINT: 0xc070ff,
  },

  // ------------------------------------------------------------
  // ระบบคำถาม (QuizSystem)
  // ------------------------------------------------------------
  QUIZ: {
    TIMER_ENABLED: true,       // false = ไม่จับเวลา
    TIME_LIMIT_SEC: 30,        // เวลาต่อข้อ หมดเวลาถือว่าตอบผิด
    TIMER_WARN_SEC: 10,        // เหลือเวลาน้อยกว่านี้ หลอดเวลาเปลี่ยนเป็นสีเตือน
    CURRENT_ZONE_RATIO: 0.7,   // โอกาสสุ่มจากคำถามของโซนปัจจุบัน (ที่เหลือสุ่มจากโซนก่อนหน้า)
    PREVIOUS_ZONE_SCOPE: 'all', // 'all' = ทุกโซนก่อนหน้า, 'adjacent' = เฉพาะโซนก่อนหน้า 1 โซน
    NO_REPEAT_WINDOW: 5,       // ห้ามถามข้อซ้ำภายในจำนวนข้อล่าสุดนี้
    LOG_MAX_ENTRIES: 2000,     // จำนวนบันทึกการตอบสูงสุดที่เก็บไว้ในเครื่อง
    CORRECT_EXP_BONUS: 5,      // (สำรองไว้ให้ระบบต่อสู้)
  },

  // ------------------------------------------------------------
  // หน้าต่างคำถาม (QuizPanel)
  // ------------------------------------------------------------
  QUIZ_PANEL: {
    DIM_ALPHA: 0.62,           // ความมืดของฉากหลัง
    PANEL_WIDTH: 1100,
    PANEL_HEIGHT: 700,
    PANEL_SLICE: { LEFT: 140, RIGHT: 140, TOP: 140, BOTTOM: 135 }, // nine-slice ของ ui/panel_body.png
    PANEL_ART_SCALE: 0.78,     // ย่อลายกรอบ/ใบไม้/ป้ายหัวกรอบ (ขนาดกรอบรวมยังเท่า PANEL_WIDTH x PANEL_HEIGHT)
    OPEN_MS: 260,
    CLOSE_MS: 200,
    CONTENT_WIDTH: 960,        // ความกว้างพื้นที่เนื้อหาภายในกรอบ
    HEADER_Y: 136,             // แถวหัวเรื่อง/เวลา (พิกัดจอ)
    HEADER_FONT_SIZE: 20,
    TIMER_BAR_Y: 160,
    TIMER_BAR_HEIGHT: 10,
    TIMER_COLOR: 0x5cc98a,
    TIMER_WARN_COLOR: 0xff6b6b,
    TIMER_TICK_MS: 100,        // ความถี่การอัปเดตหลอดเวลา
    QUESTION_Y: 178,           // ขอบบนกล่องคำถาม
    QUESTION_HEIGHT: 118,
    QUESTION_FONT_MAX: 30,
    QUESTION_FONT_MIN: 19,
    CHOICE_ROW1_Y: 354,        // กึ่งกลางแถวปุ่มตัวเลือกแถวที่ 1
    CHOICE_ROW_GAP: 104,       // ระยะห่างกึ่งกลางแถว 1 -> 2
    CHOICE_COL_GAP: 20,        // ช่องว่างระหว่างคอลัมน์
    CHOICE_NATIVE_HEIGHT: 125, // ความสูงจริงของภาพปุ่ม
    CHOICE_HEIGHT: 94,         // ความสูงที่แสดงผล
    CHOICE_SLICE: 62,          // ความกว้างหัวท้ายปุ่มแบบ 3-slice (พิกเซลของภาพจริง)
    CHOICE_NUMBER_X: 40,       // ตำแหน่งวงกลมเลขข้อ (วัดจากขอบซ้ายปุ่ม)
    CHOICE_NUMBER_RADIUS: 18,
    CHOICE_TEXT_PAD_LEFT: 70,  // เว้นที่ด้านซ้ายสำหรับวงกลมเลขข้อ
    CHOICE_TEXT_PAD_RIGHT: 28,
    CHOICE_TEXT_HEIGHT: 70,
    CHOICE_FONT_MAX: 22,
    CHOICE_FONT_MIN: 14,
    CHOICE_MAX_LINES: 2,
    CHOICE_HOVER_SCALE: 1.03,
    CHOICE_DIM_ALPHA: 0.5,     // ตัวเลือกที่ไม่เกี่ยวข้องหลังตอบ
    EXPLAIN_Y: 522,            // ขอบบนกล่องคำอธิบาย
    EXPLAIN_HEIGHT: 120,
    EXPLAIN_WIDTH: 700,
    EXPLAIN_FONT_MAX: 21,
    EXPLAIN_FONT_MIN: 14,
    OK_BUTTON_X: 1000,         // กึ่งกลางปุ่ม "เข้าใจแล้ว"
    OK_BUTTON_Y: 582,
    OK_BUTTON_WIDTH: 240,
    OK_BUTTON_HEIGHT: 76,
    OK_DELAY_MS: 350,          // หน่วงก่อนกด "เข้าใจแล้ว" ได้ (กันกดพลาด)
    STAR_COUNT: 26,
    STAR_SCALE: 0.32,
    STAR_SPEED_MIN: 140,
    STAR_SPEED_MAX: 380,
    STAR_LIFESPAN_MS: 900,
    WRONG_SHAKE_PX: 10,
    WRONG_SHAKE_MS: 50,
    WRONG_SHAKE_REPEAT: 3,
    LINE_SPACING: 6,           // ระยะห่างบรรทัดเพิ่มเติม (สระบน/วรรณยุกต์ไทยไม่ชนกัน)
    TEXT_PAD_TOP: 8,           // padding ของ Text กันสระบน/วรรณยุกต์ถูกตัด
  },

  // ------------------------------------------------------------
  // ไอเท็มบนแผนที่ (WorldScene + InventorySystem)
  // ------------------------------------------------------------
  ITEM: {
    EXP_ON_CORRECT: 9,         // EXP ที่ได้เมื่อตอบถูกแล้วเก็บไอเท็ม (เฟส 8: ปรับจาก 6 ตามผลจำลองสมดุล tools/balance_sim.js)
    RESPAWN_WRONG_SEC: 30,     // ตอบผิด -> ไอเท็มหาย แล้วเกิดใหม่ในอีกกี่วินาที
    RESPAWN_CORRECT_SEC: 45,   // ตอบถูก -> เก็บแล้ว ไอเท็มจุดเดิมเกิดใหม่ในอีกกี่วินาที
    WORLD_SIZE: 58,            // ขนาดไอเท็มบนแผนที่ (px ด้านที่ยาวที่สุด)
    FLOAT_HEIGHT: 12,          // ลอยขึ้นลงกี่พิกเซล
    FLOAT_MS: 900,
    HOVER_ABOVE_GROUND: 34,    // ตัวไอเท็มลอยเหนือเงาบนพื้น
    SHADOW_WIDTH: 46,
    SHADOW_HEIGHT: 14,
    SHADOW_ALPHA: 0.28,
    PICKUP_WIDTH: 70,          // ขนาดกรอบชน (บนพื้น)
    PICKUP_HEIGHT: 50,
    SPARKLE_EVERY_MS: 520,     // ความถี่ประกายรอบไอเท็ม
    SPARKLE_SCALE: 0.1,
    SPARKLE_LIFESPAN_MS: 700,
    SPARKLE_SPREAD: 26,
    APPEAR_MS: 380,
    COLLECT_MS: 520,           // เวลาแอนิเมชันเก็บไอเท็ม
    COLLECT_RISE: 70,
    VANISH_MS: 420,            // เวลาแอนิเมชันไอเท็มหาย (ตอบผิด)
    CHECK_RESPAWN_MS: 500,     // ตรวจรอบการเกิดใหม่ทุก ๆ กี่มิลลิวินาที
    DEPTH: 10,                 // ฐานเดียวกับผู้เล่น (เรียงหน้า-หลังตามแกน y)
    MAP_NAME_DELAY_MS: 150,    // หน่วงก่อนแจ้งชื่อแผนที่ตอนเข้าแผนที่
  },

  // ------------------------------------------------------------
  // กระเป๋า (InventoryScene)
  // ------------------------------------------------------------
  INVENTORY: {
    POTION_GLUCOSE_COST: 3,    // ใช้กลูโคสกี่ชิ้นแลกยาฟื้นพลัง 1 ขวด
    POTION_HEAL_HP: 25,        // ยาฟื้นพลัง 1 ขวดฟื้น HP เท่าไร
    PANEL_WIDTH: 960,
    PANEL_HEIGHT: 600,
    TITLE_OFFSET_Y: 146,       // ระยะหัวข้อ "กระเป๋าของฉัน" จากขอบบนกรอบ
    CLOSE_OFFSET_X: 100,       // ระยะปุ่มปิดจากขอบขวากรอบ
    SLOT_SIZE: 112,
    SLOT_GAP: 16,
    SLOT_COLUMNS: 6,
    SLOT_ROW_Y: 300,           // กึ่งกลางแถวช่องไอเท็ม (พิกัดจอ)
    ICON_SIZE: 72,
    DESC_Y: 426,
    BUTTON_Y: 540,
    BUTTON_WIDTH: 340,
    BUTTON_HEIGHT: 76,
    BAG_BUTTON_SIZE: 76,       // ปุ่มกระเป๋ามุมขวาบนของจอ
    BAG_BUTTON_MARGIN: 20,
    BAG_BUMP_SCALE: 1.25,      // ปุ่มกระเป๋าเด้งเมื่อได้ของใหม่
    OPEN_MS: 220,
  },

  // ------------------------------------------------------------
  // เสียงเอฟเฟกต์ (สังเคราะห์ด้วย WebAudio ไม่ต้องใช้ไฟล์เสียง)
  // ------------------------------------------------------------
  SOUND: {
    ENABLED: true,
    VOLUME: 0.18,
    CORRECT_NOTES: [659, 784, 1047], // Hz
    WRONG_NOTES: [220, 175],
    PICKUP_NOTES: [880, 1175],
    CLICK_NOTES: [520],
    NOTE_MS: 110,
  },

  // ------------------------------------------------------------
  // หน้าจอชื่อเกม (TitleScene)
  // ------------------------------------------------------------
  TITLE: {
    LOGO_Y: 78,
    LOGO_HEIGHT: 130,
    SUBTITLE_Y: 166,
    BG_DIM_ALPHA: 0.3,
    FORM_PANEL_Y: 364,         // กึ่งกลางกรอบพื้นหลังฟอร์ม
    FORM_PANEL_WIDTH: 540,
    FORM_PANEL_HEIGHT: 344,
    BUTTON_Y: 492,             // แถวปุ่ม "เล่นต่อ" / "เริ่มใหม่"
    BUTTON_WIDTH: 236,
    BUTTON_HEIGHT: 62,
    BUTTON_GAP: 18,
    STATUS_Y: 444,             // ข้อความสถานะ/แจ้งเตือนใต้ช่องกรอก
    CHIPS_TITLE_Y: 566,        // "ผู้เล่นในเครื่องนี้"
    CHIPS_Y: 604,
    CHIP_ROW_GAP: 42,
    CHIP_PER_ROW: 3,
    CHIP_WIDTH: 250,
    CHIP_FONT_SIZE: 16,
    CONFIRM_WIDTH: 640,
    CONFIRM_HEIGHT: 330,
    FORM_PANEL_ALPHA: 0.72,
    PARADE_Y: 712,             // (เฟส 8) เท้าสัตว์ 5 ตัวที่เดินผ่านหน้าจอ
    PARADE_HEIGHT: 96,
    PARADE_SPACING: 150,
    PARADE_SPEED: 70,          // px/วินาที
    PARADE_HOP_PX: 10,
    PARADE_HOP_MS: 260,
  },

  // ------------------------------------------------------------
  // การโหลดไฟล์ (BootScene)
  // ------------------------------------------------------------
  BOOT: {
    FONT_WAIT_MS: 2500,        // รอฟอนต์ Google Fonts โหลดไม่เกินเท่านี้
  },

  // ------------------------------------------------------------
  // ปุ่มทดสอบสำหรับครู/ผู้พัฒนา (ใน WorldScene)
  //   F2 = แสดงกรอบสิ่งกีดขวาง/ประตู/จุดพักฟื้น
  //   F3 = ลด HP สัตว์เลี้ยง (ไว้ทดสอบจุดพักฟื้น)
  //   F4 = เพิ่ม EXP สัตว์เลี้ยง (ไว้ทดสอบหลอด EXP/เลเวล/วิวัฒนาการ)
  // ------------------------------------------------------------
  DEBUG: {
    ENABLE_KEYS: true,         // สวิตช์โหมดครู/ทดสอบ (false = ปิดปุ่ม F2-F5 และ Shift+L ทั้งหมด)
                               // F5 = บังคับเจอมอนสเตอร์ของแผนที่ปัจจุบัน (ทดสอบ BattleScene)
                               // Shift+L = เพิ่ม 1 เลเวล (ทดสอบเลเวลอัป/พัฒนาร่าง/ใบประกาศ)
    HP_DAMAGE: 10,
    EXP_GAIN: 15,
  },

  // ------------------------------------------------------------
  // การบันทึกเกม
  // ------------------------------------------------------------
  SAVE: {
    STORAGE_KEY: 'mitomon_saves_v2',   // บันทึกแยกตามผู้เล่น { lastPlayerId, players: { id: {...} } }
    LEGACY_KEY: 'mitomon_save_v1',     // เซฟรูปแบบเก่า (เฟส 1-5) จะถูกย้ายเข้าระบบใหม่อัตโนมัติ
    PLAYER_CHIPS_MAX: 6,               // จำนวนผู้เล่นที่แสดงเป็นปุ่มลัดในหน้า Title
    AUTOSAVE_NOTICE_MS: 1400,          // เวลาแสดงสัญลักษณ์ "บันทึกอัตโนมัติ"
  },

  // ------------------------------------------------------------
  // เฟส 6: ล็อกโซนตามเลเวล (เลเวลขั้นต่ำที่ต้องมีเพื่อเข้าแผนที่)
  // ------------------------------------------------------------
  ZONE_LOCK: {
    zone2: 4,
    zone3: 7,
    zone4: 10,
    boss: 13,
  },

  // ประตูวาร์ป (ภาพ ui/portal.png ซ้อนบนวงประตูในแผนที่)
  PORTAL_FX: {
    SCALE: 0.36,
    ALPHA: 0.8,
    OPEN_TINT: 0x7fe8ff,
    LOCKED_TINT: 0xff3b3b,     // เลเวลไม่ถึง = แสงสีแดง
    CLOSED_TINT: 0x8a8a8a,     // ประตูที่ยังปิด (ไม่ขึ้นกับเลเวล)
    SPIN_MS: 5000,
    PULSE_MS: 850,
    LOCK_ICON_SIZE: 46,
    LABEL_OFFSET_Y: -64,
    LABEL_FONT_SIZE: 18,
    DEPTH: 3,
    NOTIFY_COOLDOWN_MS: 1800,
  },

  // NPC ครูเซลล์ (ข้อความอยู่ใน js/data/npc.js)
  NPC: {
    HEIGHT: 150,               // ความสูงบนแผนที่
    TALK_DISTANCE: 120,        // ระยะที่คุยได้ (px จากเท้าผู้เล่น)
    BOB_PX: 4,
    BOB_MS: 900,
    HINT_OFFSET_Y: 14,         // ป้าย "กด E คุย" เหนือหัว
    DIALOG_WIDTH: 1000,
    DIALOG_HEIGHT: 400,
    DIALOG_Y: 400,             // กึ่งกลางกล่องคำพูด
    PORTRAIT_HEIGHT: 330,
    FONT_SIZE: 21,
    TITLE_FONT_SIZE: 26,
  },

  // บอส (ป้อมบอส + BattleScene)
  BOSS: {
    WORLD_HEIGHT: 190,         // ความสูงบอสบนแผนที่
    TOUCH_DISTANCE: 95,
    PHASE2_HP_RATIO: 0.5,      // HP ต่ำกว่านี้ -> ช่วงที่ 2 "ล็อกห่วงโซ่อิเล็กตรอน"
    CHAIN_REQUIRED: 2,         // ช่วงที่ 2 ต้องตอบถูกติดกันกี่ข้อจึงทำดาเมจได้
    OXYGEN_COMPLETES_CHAIN: true, // ใช้ O₂ ในช่วงที่ 2 = ปิดห่วงโซ่ได้ทันที (ตัวรับอิเล็กตรอนตัวสุดท้าย)
    PHASE_PANEL_WIDTH: 820,
    PHASE_PANEL_HEIGHT: 440,
    CHAIN_Y: 150,              // แถวแสดงสถานะห่วงโซ่ (ใต้แผง HP บอส)
  },

  // ------------------------------------------------------------
  // เฟส 7: เหรียญตรา / รายงาน / โหมดครู / Leaderboard
  // ------------------------------------------------------------
  BADGES: {
    TOPIC_CORRECT_TARGET: 10,  // ตอบถูกหัวข้อนั้นครบกี่ครั้งจึงได้เหรียญ
    POPUP_MS: 2600,            // เวลาแสดงป้ายเด้ง "ได้รับเหรียญตรา"
    POPUP_Y: 150,
    POPUP_ICON_SIZE: 96,
    BOOK_ICON_SIZE: 130,       // ขนาดเหรียญในสมุดสะสม
  },

  REPORT: {
    REVIEW_THRESHOLD: 0.7,     // อัตราถูกต่ำกว่านี้ = "หัวข้อที่ควรทบทวน"
    MIN_ANSWERS: 3,            // ต้องตอบหัวข้อนั้นอย่างน้อยกี่ข้อจึงประเมินได้
    CHART_X: 150,              // กราฟแท่ง (พิกัดจอ): มุมซ้ายของพื้นที่กราฟ
    CHART_Y: 262,
    CHART_WIDTH: 540,
    CHART_HEIGHT: 250,
    BAR_COLOR: 0x5cc98a,
    BAR_LOW_COLOR: 0xff8a6b,
    BAR_EMPTY_COLOR: 0xc9c2b8,
    PANEL_WIDTH: 1160,
    PANEL_HEIGHT: 660,
  },

  TEACHER: {
    PASSWORD: 'mitomon2569',   // รหัสผ่านเข้าโหมดครู (เปลี่ยนก่อนใช้จริง!)
    ROWS_PER_PAGE: 9,
    TOP_WRONG_COUNT: 5,
    CSV_FILE_NAME: 'MitoMon_คะแนนนักเรียน.csv',
  },

  LEADERBOARD: {
    ENABLED: true,             // true = ส่งคะแนนไป Google Sheets (ต้องใส่ URL ด้านล่าง)
    URL: 'https://script.google.com/macros/s/AKfycbwWmB-O2e5O3cOuotIvrTjNuLlbDc5gTpvPgYx-hoRHqQHJQcOfOfjE_fYfOfMw2GjHPg/exec',                   // URL ของ Apps Script Web App (ลงท้ายด้วย /exec) ดูวิธีตั้งค่า tools/LEADERBOARD_SETUP.md
    CLASS_KEY: '',             // (ไม่บังคับ) รหัสห้องเรียน ต้องตรงกับ CLASS_KEY ในโค้ด Apps Script
    TIMEOUT_MS: 8000,
    TOP_N: 10,
  },

  // ------------------------------------------------------------
  // เฟส 8: เสียง (ไฟล์ใน assets/audio/*.mp3 ถ้าไม่มีไฟล์ เกมเล่นต่อได้ ใช้เสียงสังเคราะห์แทน)
  // ------------------------------------------------------------
  AUDIO: {
    ENABLED: true,
    FOLDER: 'assets/audio/',
    EXT: '.mp3',
    BGM_VOLUME: 0.35,
    SFX_VOLUME: 0.7,
    FADE_MS: 600,
    // ชื่อไฟล์ BGM: bgm_title, bgm_farm, bgm_zone1-4, bgm_boss, bgm_battle
    // ชื่อไฟล์เสียงประกอบ (kind -> ไฟล์)
    SFX: {
      correct: 'sfx_correct',
      wrong: 'sfx_wrong',
      attack: 'sfx_attack',
      levelup: 'sfx_levelup',
      hatch: 'sfx_hatch',
      click: 'sfx_click',
      pickup: 'sfx_pickup',
      hit: 'sfx_hit',          // มอนสเตอร์โจมตีโดน
      evolve: 'sfx_evolve',    // พัฒนาร่าง
    },
  },

  // ------------------------------------------------------------
  // เฟส 8: จอยสัมผัสเสมือน (แสดงเฉพาะอุปกรณ์จอสัมผัส)
  // ------------------------------------------------------------
  JOYSTICK: {
    FORCE_SHOW: false,         // true = แสดงทุกอุปกรณ์ (ไว้ทดสอบบนคอม)
    X: 150,                    // กึ่งกลางฐานจอย (พิกัดจอ)
    Y: 580,
    BASE_SIZE: 190,
    KNOB_SIZE: 90,
    RADIUS: 70,                // ระยะที่ปุ่มเลื่อนได้ไกลสุด
    DEADZONE: 0.18,
    TOUCH_AREA: 280,           // พื้นที่แตะรอบจอย (ใหญ่กว่าภาพ)
    IDLE_ALPHA: 0.55,
    ACTIVE_ALPHA: 0.9,
  },

  // ขนาดปุ่มตัวเลือกคำถามบนจอสัมผัส (ใหญ่ขึ้นสำหรับนิ้ว)
  TOUCH_UI: {
    CHOICE_HEIGHT: 104,
    CHOICE_ROW_GAP: 112,
    CHOICE_ROW1_Y: 356,
    CHOICE_FONT_MAX: 24,
    MENU_BUTTON_HEIGHT: 86,
  },

  // ------------------------------------------------------------
  // เฟส 8: บทช่วยสอน (ครั้งแรกหลังฟักไข่ ข้ามได้)
  // ------------------------------------------------------------
  TUTORIAL: {
    ENABLED: true,
    MOVE_TARGET: { x: 900, y: 600 },   // จุดที่ให้เดินไป (ฟาร์ม)
    MOVE_REACH: 70,
    ITEM_POS: { x: 1060, y: 610 },     // ไอเท็มฝึก
    MONSTER_ID: 'm1',
    MONSTER_HP: 10,            // มอนสเตอร์ฝึกอ่อนลง
    MONSTER_ATK: 2,
    BUBBLE_X: 600,             // กล่องคำพูดครูเซลล์ วางกลางล่าง (ไม่ทับแถบ HUD ด้านบน/มินิแมป/จอย)
    BUBBLE_Y: 628,
    BUBBLE_WIDTH: 660,
    STEP_DELAY_MS: 600,
  },

  // ปุ่มลัดมุมขวาบน (ต่อจากปุ่มกระเป๋าไปทางซ้าย)
  HUD_BUTTONS: {
    GAP: 88,
    ICON_SIZE: 64,
  },

  // มินิแมปมุมขวาล่าง
  MINIMAP: {
    NODE_SIZE: 38,
    NODE_GAP: 12,
    MARGIN: 18,
    PADDING: 12,
    TITLE_FONT_SIZE: 15,
    CURRENT_SCALE: 1.25,
    PULSE_MS: 700,
    LOCK_SIZE: 20,
    ORDER: ['farm', 'zone1', 'zone2', 'zone3', 'zone4', 'boss'], // ลำดับเส้นทาง = ลำดับเฟรมใน ui/minimap_icons.png
  },
};

// เผื่อในอนาคตมีการใช้งานแบบโมดูล (ปัจจุบันใช้ global เท่านั้น)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
