/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/data/monsters.js
   ------------------------------------------------------------
   ข้อมูลมอนสเตอร์ประจำโซน + บอส (ชื่อ ภาพ คำบรรยาย)
   ค่าพลังทุกตัว (HP / ATK / EXP) อยู่ที่ CONFIG.MONSTER.STATS
   ชื่อไฟล์ภาพ: assets/monsters/{id}_idle.png, {id}_hurt.png

   ใช้งาน: getMonsterData('m1') -> ข้อมูล + ค่าพลังจาก config
   ========================================================== */

const MONSTERS = [
  {
    id: 'm1',
    name: 'เจลลี่ไพรูเวต',
    zone: 1,
    idleKey: 'm1_idle',
    hurtKey: 'm1_hurt',
    desc: 'เจลลี่ส้มจอมซนจากไซโทซอล เกิดจากกลูโคสที่ถูกแตกครึ่ง',
  },
  {
    id: 'm2',
    name: 'ผีหมอก CO₂',
    zone: 2,
    idleKey: 'm2_idle',
    hurtKey: 'm2_hurt',
    desc: 'หมอกลอยวนในหุบเขาเมทริกซ์ ถูกปล่อยออกมาระหว่างวัฏจักรเครบส์',
  },
  {
    id: 'm3',
    name: 'ค้างคาวอิเล็กตรอน',
    zone: 3,
    idleKey: 'm3_idle',
    hurtKey: 'm3_hurt',
    desc: 'บินไวเหมือนอิเล็กตรอนที่ถูกส่งต่อไปตามหน้าผาคริสตี',
  },
  {
    id: 'm4',
    name: 'สไลม์แลกติก',
    zone: 4,
    idleKey: 'm4_idle',
    hurtKey: 'm4_hurt',
    desc: 'สไลม์เปรี้ยวจากถ้ำหมักบ่ม ชอบโผล่มาตอนออกซิเจนไม่พอ',
  },
  {
    id: 'boss',
    name: 'ราชาตัวยับยั้ง',
    zone: 'boss',
    idleKey: 'boss_idle',
    hurtKey: 'boss_hurt',
    isBoss: true,
    desc: 'ราชาหินผู้ล่ามโซ่ขวางการสร้างพลังงานของเซลล์',
  },
];

/** คืนข้อมูลมอนสเตอร์ + ค่าพลังจาก config ({ ...data, hp, atk, exp }) */
function getMonsterData(monsterId) {
  const m = MONSTERS.find((x) => x.id === monsterId);
  if (!m) return null;
  const s = CONFIG.MONSTER.STATS[monsterId];
  return Object.assign({}, m, { hp: s.HP, atk: s.ATK, exp: s.EXP });
}

/** มอนสเตอร์ประจำโซน (1-4 หรือ 'boss') */
function getMonsterForZone(zone) {
  const m = MONSTERS.find((x) => x.zone === zone);
  return m ? m.id : MONSTERS[0].id;
}
