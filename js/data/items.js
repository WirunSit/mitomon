/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/data/items.js
   ------------------------------------------------------------
   1) ITEMS        ข้อมูลไอเท็มทั้งหมด (ชื่อ คำอธิบาย ภาพ)
   2) ITEM_SPAWNS  จุดเกิดไอเท็มบนแต่ละแผนที่ (พิกัดพิกเซลของ
                   ภาพแผนที่ 1536x1024 = ตำแหน่ง "พื้น" ใต้ไอเท็ม)

   เดินชนไอเท็ม -> ต้องตอบคำถาม (QuizPanel) ให้ถูกจึงได้ไอเท็ม
   ค่าตัวเลข (EXP, เวลาเกิดใหม่, ขนาด) อยู่ใน CONFIG.ITEM
   ค่าการแลกยาฟื้นพลังอยู่ใน CONFIG.INVENTORY

   ปรับจุดเกิด: เปิดเกมแล้วกด F2 ในแผนที่ จะเห็นกรอบสีเหลือง
   ของจุดเกิดไอเท็ม เทียบกับภาพแล้วแก้ตัวเลขในไฟล์นี้
   ========================================================== */

const ITEMS = [
  {
    id: 'item_glucose',
    name: 'กลูโคส',
    spriteKey: 'item_glucose',
    description: 'น้ำตาลโมเลกุลเดี่ยว วัตถุดิบหลักของการหายใจระดับเซลล์ สะสมครบแล้วนำไปแลกยาฟื้นพลังได้',
    onMap: true,
  },
  {
    id: 'item_nad',
    name: 'NAD⁺',
    spriteKey: 'item_nad',
    description: 'ตัวรับอิเล็กตรอน เมื่อรับอิเล็กตรอนและ H⁺ แล้วจะกลายเป็น NADH',
    onMap: true,
  },
  {
    id: 'item_oxygen',
    name: 'ออกซิเจน (O₂)',
    spriteKey: 'item_oxygen',
    description: 'ตัวรับอิเล็กตรอนตัวสุดท้ายของระบบถ่ายทอดอิเล็กตรอน',
    onMap: true,
  },
  {
    id: 'item_atp',
    name: 'ATP',
    spriteKey: 'item_atp',
    description: 'สารพลังงานสูงที่เซลล์นำไปใช้ได้ทันที',
    onMap: true,
  },
  {
    id: 'item_fadh2',
    name: 'FADH₂',
    spriteKey: 'item_fadh2',
    description: 'ตัวพาอิเล็กตรอนที่ได้จากวัฏจักรเครบส์ นำอิเล็กตรอนไปส่งให้ระบบถ่ายทอดอิเล็กตรอน',
    onMap: true,
  },
  {
    id: 'item_potion',
    name: 'ยาฟื้นพลัง',
    spriteKey: 'item_potion',
    description: 'ดื่มแล้วฟื้นฟู HP ให้สัตว์เลี้ยง ได้จากการนำกลูโคสมาแลก',
    onMap: false,
    usable: true,
  },
];

/**
 * จุดเกิดไอเท็มของแต่ละแผนที่ (key ตรงกับ MAPS)
 * x, y = ตำแหน่งบนพื้น (ตัวไอเท็มจะลอยเหนือจุดนี้เล็กน้อย)
 * ฟาร์ม (farm) เป็นฐานทัพ ไม่มีไอเท็ม
 */
const ITEM_SPAWNS = {
  zone1: [
    { itemId: 'item_glucose', x: 343, y: 446 },
    { itemId: 'item_glucose', x: 640, y: 560 },
    { itemId: 'item_nad',     x: 880, y: 731 },
    { itemId: 'item_atp',     x: 1143, y: 537 },
    { itemId: 'item_glucose', x: 800, y: 470 },
  ],
  zone2: [
    { itemId: 'item_glucose', x: 343, y: 429 },
    { itemId: 'item_nad',     x: 800, y: 246 },
    { itemId: 'item_fadh2',   x: 549, y: 503 },
    { itemId: 'item_atp',     x: 1143, y: 503 },
    { itemId: 'item_glucose', x: 783, y: 697 },
  ],
  zone3: [
    { itemId: 'item_oxygen',  x: 343, y: 432 },
    { itemId: 'item_glucose', x: 571, y: 486 },
    { itemId: 'item_atp',     x: 817, y: 549 },
    { itemId: 'item_fadh2',   x: 1131, y: 509 },
    { itemId: 'item_nad',     x: 731, y: 246 },
  ],
  zone4: [
    { itemId: 'item_glucose', x: 366, y: 432 },
    { itemId: 'item_nad',     x: 686, y: 263 },
    { itemId: 'item_glucose', x: 800, y: 594 },
    { itemId: 'item_atp',     x: 1029, y: 486 },
    { itemId: 'item_oxygen',  x: 1200, y: 503 },
  ],
  boss: [
    { itemId: 'item_potion',  x: 430, y: 445 },
    { itemId: 'item_oxygen',  x: 1100, y: 450 },
    { itemId: 'item_atp',     x: 768, y: 612 },
    { itemId: 'item_nad',     x: 766, y: 262 },
  ],
};

/** หาไอเท็มจาก id (คืน null ถ้าไม่พบ) */
function getItemData(itemId) {
  return ITEMS.find((it) => it.id === itemId) || null;
}
