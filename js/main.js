/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/main.js
   ------------------------------------------------------------
   จุดเริ่มต้นเกม: ตั้งค่า Phaser.Game และรายชื่อฉากที่ใช้งาน
   ในเฟสปัจจุบัน (เฟส 3 เพิ่ม QuizPanel + InventoryScene, เฟส 4 เพิ่ม BattleScene)
   (เฟสถัดไปให้เพิ่ม BattleScene เข้าไปในอาเรย์
   scene ด้านล่างเมื่อพัฒนาเสร็จ)
   ========================================================== */

const gameConfig = {
  type: Phaser.AUTO,
  width: CONFIG.GAME.WIDTH,
  height: CONFIG.GAME.HEIGHT,
  backgroundColor: CONFIG.GAME.BACKGROUND_COLOR,
  parent: 'game-container',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },

  // จำเป็นสำหรับ this.add.dom(...) ที่ใช้ในฟอร์มกรอกชื่อ-เลขที่-ห้อง
  dom: {
    createContainer: true,
  },

  scene: [
    BootScene,
    TitleScene,
    HatchScene,
    WorldScene,
    UIScene,
    BattleScene,     // ฉากต่อสู้ (เฟส 4)
    QuizPanel,       // หน้าต่างคำถาม (ซ้อนบนสุด ใช้ทั้งเก็บไอเท็ม/ต่อสู้)
    InventoryScene,  // หน้าต่างกระเป๋า
    LevelUpScene,    // เลเวลอัป (เฟส 5)
    EvolutionScene,  // พัฒนาร่าง (เฟส 5)
    MaxLevelScene,   // เลเวลเต็ม + ใบประกาศ (เฟส 5)
    DialogScene,     // กล่องคำพูดครูเซลล์ (เฟส 6)
    CollectionScene, // สมุดสะสมเหรียญตรา (เฟส 7)
    ReportScene,     // สรุปผลนักเรียน (เฟส 7)
    LeaderboardScene, // ตารางอันดับออนไลน์ (เฟส 7)
    TeacherScene,    // โหมดครู (เฟส 7)
    TutorialScene,   // บทช่วยสอน (เฟส 8)
  ],
};

window.addEventListener('load', () => {
  window.mitomonGame = new Phaser.Game(gameConfig);
});
