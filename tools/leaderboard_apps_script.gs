/**
 * MitoMon: ผจญภัยในเซลล์ - โค้ด Google Apps Script สำหรับ Leaderboard
 * ------------------------------------------------------------------
 * วางโค้ดนี้ใน Google Sheets > ส่วนขยาย > Apps Script (ดู tools/LEADERBOARD_SETUP.md)
 *
 * รับข้อมูลจากเกม (POST) แล้วบันทึกลงชีต "Leaderboard" (1 แถวต่อผู้เล่น อัปเดตแถวเดิม)
 * และส่งอันดับกลับให้เกม (GET ?action=top&room=ม.4/1&n=10)
 * เรียงตาม เลเวล (มากไปน้อย) แล้วตาม อัตราตอบถูก (มากไปน้อย)
 */

// ถ้าตั้งรหัสห้องเรียน ต้องใส่ค่าเดียวกันใน js/config.js -> CONFIG.LEADERBOARD.CLASS_KEY
// ปล่อยว่าง '' = ไม่ตรวจรหัส
var CLASS_KEY = '';
var SHEET_NAME = 'Leaderboard';
var HEADERS = ['playerId', 'name', 'studentNumber', 'room', 'level', 'accuracy', 'answered', 'correct',
  'playMinutes', 'badges', 'bossDefeated', 'lastReason', 'updatedAt'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** เกมส่งคะแนนมาที่นี่ */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = JSON.parse(e.postData.contents);
    if (CLASS_KEY && data.key !== CLASS_KEY) return json_({ ok: false, error: 'bad key' });
    if (!data.playerId || !data.name) return json_({ ok: false, error: 'missing player' });

    var sh = getSheet_();
    var values = sh.getDataRange().getValues();
    var row = [
      String(data.playerId), String(data.name).slice(0, 60), String(data.studentNumber || ''), String(data.room || ''),
      Number(data.level) || 0, Number(data.accuracy) || 0, Number(data.answered) || 0, Number(data.correct) || 0,
      Number(data.playMinutes) || 0, Number(data.badges) || 0, data.bossDefeated ? 'TRUE' : 'FALSE',
      String(data.reason || ''), new Date(),
    ];
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === row[0]) {
        sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
        return json_({ ok: true, updated: true });
      }
    }
    sh.appendRow(row);
    return json_({ ok: true, created: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** เกมขออันดับ 10 คนแรกของห้อง */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action !== 'top') return json_({ ok: true, message: 'MitoMon leaderboard is running' });
    if (CLASS_KEY && p.key !== CLASS_KEY) return json_({ ok: false, error: 'bad key' });
    var n = Math.min(50, Number(p.n) || 10);
    var room = String(p.room || '');
    var values = getSheet_().getDataRange().getValues();
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var v = values[i];
      if (room && String(v[3]) !== room) continue;
      rows.push({ playerId: v[0], name: v[1], studentNumber: v[2], room: v[3], level: Number(v[4]), accuracy: Number(v[5]) });
    }
    rows.sort(function (a, b) { return (b.level - a.level) || (b.accuracy - a.accuracy); });
    return json_({ ok: true, rows: rows.slice(0, n) });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
