/*
 * MitoMon - tools/balance_sim.js
 * จำลองการเล่น (Monte Carlo) เพื่อประมาณ "เวลาที่ใช้จนถึงเลเวลสูงสุด" ตามอัตราตอบถูก
 * อ่านค่าจริงจาก js/config.js, js/data/pets.js, js/data/monsters.js
 * วิธีรัน:  node tools/balance_sim.js            (ค่าเริ่มต้น 60%, 70%, 85%)
 *          node tools/balance_sim.js 0.5 0.9    (กำหนดอัตราเอง)
 *
 * สมมติฐานเวลาของผู้เล่น (วินาที) ปรับได้ใน SIM ด้านล่าง
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, Math };
vm.createContext(ctx);
['js/config.js', 'js/data/pets.js', 'js/data/monsters.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const (\w+) =/gm, 'var $1 ='), ctx);
});
const { CONFIG, PETS } = ctx;

const SIM = {
  RUNS: 400,
  ANSWER_CORRECT_S: 14,   // อ่านคำถาม + ตอบ + อ่านคำอธิบาย (ตอบถูก)
  ANSWER_WRONG_S: 20,     // ตอบผิดอ่านคำอธิบายนานขึ้น
  ITEM_WALK_S: 14,        // เดินไปหาไอเท็มถัดไป
  FIND_MONSTER_S: 12,     // เดินในพุ่มหญ้า/หามอนสเตอร์
  BATTLE_OVERHEAD_S: 14,  // เข้าฉาก + เปิดฉาก + สรุปผล + กลับแผนที่
  ATTACK_ANIM_S: 3,
  LEVELUP_FX_S: 4,
  EVOLUTION_S: 14,
  NEW_ZONE_S: 45,         // เดินไปโซนใหม่ + คุยครูเซลล์
  HEAL_TRIP_BASE_S: 35,   // กลับไปพักที่ฟาร์ม (บวกตามระยะโซน)
  HEAL_TRIP_PER_ZONE_S: 15,
  BATTLE_SHARE: 0.6,      // สัดส่วนกิจกรรมที่เลือกต่อสู้ (ที่เหลือเก็บไอเท็ม)
  HEAL_BELOW: 0.35,       // HP ต่ำกว่านี้ก่อนสู้ -> ใช้ยาหรือกลับไปพัก
};

function expToNext(l) { return CONFIG.EXP.EXP_BASE + CONFIG.EXP.EXP_STEP * (l - 1); }
function maxHp(sp, l) { return Math.round(sp.baseHP + (l - 1) * CONFIG.PET_STATS.HP_PER_LEVEL); }
function atk(sp, l) { return Math.round(sp.baseATK + l * CONFIG.PET_STATS.ATK_PER_LEVEL); }
function roll(base) {
  const v = CONFIG.BATTLE.DAMAGE_VARIANCE;
  return Math.max(CONFIG.BATTLE.MIN_DAMAGE, Math.round(base * (1 + (Math.random() * 2 - 1) * v)));
}
function zoneFor(level) {
  const L = CONFIG.ZONE_LOCK;
  if (level >= L.boss) return 'boss';
  if (level >= L.zone4) return 4;
  if (level >= L.zone3) return 3;
  if (level >= L.zone2) return 2;
  return 1;
}

function runOnce(p, sp) {
  const s = { lv: 1, exp: 0, hp: maxHp(sp, 1), t: 0, glucose: 0, potions: 0, zone: 1, boss: false, form: 1 };
  const answer = () => {
    const ok = Math.random() < p;
    s.t += ok ? SIM.ANSWER_CORRECT_S : SIM.ANSWER_WRONG_S;
    return ok;
  };
  const gain = (n) => {
    if (s.lv >= CONFIG.EXP.MAX_LEVEL) return;
    s.exp += n;
    while (s.lv < CONFIG.EXP.MAX_LEVEL && s.exp >= expToNext(s.lv)) {
      s.exp -= expToNext(s.lv);
      s.lv += 1;
      s.hp = maxHp(sp, s.lv);
      s.t += SIM.LEVELUP_FX_S;
      if (s.lv === CONFIG.EXP.EVOLVE_LEVEL_STAGE_2 || s.lv === CONFIG.EXP.EVOLVE_LEVEL_STAGE_3) s.t += SIM.EVOLUTION_S;
    }
  };
  const heal = () => {
    const mh = maxHp(sp, s.lv);
    if (s.potions > 0) { s.potions -= 1; s.hp = Math.min(mh, s.hp + CONFIG.INVENTORY.POTION_HEAL_HP); s.t += 3; return; }
    s.t += SIM.HEAL_TRIP_BASE_S + SIM.HEAL_TRIP_PER_ZONE_S * (s.zone === 'boss' ? 5 : s.zone);
    s.hp = mh;
  };
  const battle = (monId) => {
    const st = CONFIG.MONSTER.STATS[monId];
    const B = CONFIG.BATTLE;
    let mhp = st.HP;
    let combo = 0;
    let phase = 1;
    let chain = 0;
    s.t += SIM.BATTLE_OVERHEAD_S;
    while (mhp > 0) {
      const ok = answer();
      s.t += SIM.ATTACK_ANIM_S;
      if (ok) {
        combo += 1;
        if (monId === 'boss' && phase === 2) {
          chain += 1;
          if (chain < CONFIG.BOSS.CHAIN_REQUIRED) continue;
          chain = 0;
        }
        let d = roll(atk(sp, s.lv));
        if (combo >= B.COMBO_THRESHOLD) d = Math.round(d * B.COMBO_MULTIPLIER);
        mhp -= d;
        if (monId === 'boss' && phase === 1 && mhp <= st.HP * CONFIG.BOSS.PHASE2_HP_RATIO) phase = 2;
      } else {
        combo = 0; chain = 0;
        s.hp -= roll(st.ATK);
        if (s.hp <= 0) { heal(); return false; }  // แพ้ -> กลับฟาร์ม HP เต็ม ไม่เสีย EXP
      }
    }
    gain(st.EXP);
    return true;
  };
  let guard = 0;
  while (s.lv < CONFIG.EXP.MAX_LEVEL && guard++ < 20000) {
    const z = zoneFor(s.lv);
    if (z !== s.zone) { s.zone = z; s.t += SIM.NEW_ZONE_S; }
    if (s.hp < maxHp(sp, s.lv) * SIM.HEAL_BELOW) heal();
    if (s.zone === 'boss' && !s.boss && s.hp >= maxHp(sp, s.lv) * 0.9) {
      if (battle('boss')) s.boss = true; else continue;
      continue;
    }
    if (Math.random() < SIM.BATTLE_SHARE) {
      s.t += SIM.FIND_MONSTER_S;
      battle(s.zone === 'boss' ? 'm4' : `m${s.zone}`);
    } else {
      s.t += SIM.ITEM_WALK_S;
      if (answer()) {
        gain(CONFIG.ITEM.EXP_ON_CORRECT);
        if (Math.random() < 0.45) { s.glucose += 1; if (s.glucose >= CONFIG.INVENTORY.POTION_GLUCOSE_COST) { s.glucose -= CONFIG.INVENTORY.POTION_GLUCOSE_COST; s.potions += 1; } }
      }
    }
  }
  return s.t / 60;
}

function stats(arr) {
  arr.sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const q = (x) => arr[Math.floor(x * (arr.length - 1))];
  return { mean, p10: q(0.1), p90: q(0.9) };
}

const rates = process.argv.slice(2).map(Number).filter((x) => x > 0 && x <= 1);
const list = rates.length ? rates : [0.6, 0.7, 0.85];
console.log(`EXP รวมถึง Lv${CONFIG.EXP.MAX_LEVEL}: ${Array.from({ length: CONFIG.EXP.MAX_LEVEL - 1 }, (_, i) => expToNext(i + 1)).reduce((a, b) => a + b, 0)}`);
console.log('อัตราถูก | เฉลี่ย (นาที) | 10%-90% ของผู้เล่น (นาที)');
list.forEach((p) => {
  const all = [];
  PETS.forEach((sp) => { for (let i = 0; i < SIM.RUNS / PETS.length; i++) all.push(runOnce(p, sp)); });
  const r = stats(all);
  console.log(`  ${Math.round(p * 100)}%   |   ${r.mean.toFixed(1)}      |   ${r.p10.toFixed(1)} - ${r.p90.toFixed(1)}`);
});
