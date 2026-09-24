/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/data/badges.js
   ------------------------------------------------------------
   เหรียญตรา 5 อัน (ภาพ assets/ui/badge_1-5.png, ยังไม่ได้ = badge_locked.png)
   type:
     'hatch'  = ฟักไข่สำเร็จ (มีสัตว์เลี้ยง)
     'topic'  = ตอบคำถามหัวข้อ topic ถูกครบ CONFIG.BADGES.TOPIC_CORRECT_TARGET ครั้ง
     'boss'   = ชนะบอส (game.bossDefeated)
   ========================================================== */

const BADGES = [
  { id: 'hatch', name: 'นักฟักไข่', iconKey: 'ui_badge_1', type: 'hatch', desc: 'ฟักไข่สำเร็จ ได้สัตว์เลี้ยงตัวแรก' },
  { id: 'glycolysis', name: 'เซียนไกลโคลิซิส', iconKey: 'ui_badge_2', type: 'topic', topic: 'glycolysis', desc: 'ตอบคำถามหัวข้อไกลโคลิซิสถูก' },
  { id: 'krebs', name: 'นักปั่นเครบส์', iconKey: 'ui_badge_3', type: 'topic', topic: 'krebs', desc: 'ตอบคำถามหัวข้อวัฏจักรเครบส์ถูก' },
  { id: 'etc', name: 'เจ้าแห่งอิเล็กตรอน', iconKey: 'ui_badge_4', type: 'topic', topic: 'etc', desc: 'ตอบคำถามหัวข้อระบบถ่ายทอดอิเล็กตรอนถูก' },
  { id: 'boss', name: 'ผู้พิชิตตัวยับยั้ง', iconKey: 'ui_badge_5', type: 'boss', desc: 'ชนะราชาตัวยับยั้งที่ป้อมบอส' },
];

/** ชื่อหัวข้อภาษาไทย (ใช้ในรายงาน/โหมดครู/CSV) เรียงตามลำดับเนื้อหา */
const TOPIC_NAMES = {
  overview: 'ภาพรวม',
  glycolysis: 'ไกลโคลิซิส',
  krebs: 'วัฏจักรเครบส์',
  etc: 'ระบบถ่ายทอดอิเล็กตรอน',
  fermentation: 'การหมัก',
};
const TOPIC_ORDER = ['overview', 'glycolysis', 'krebs', 'etc', 'fermentation'];
