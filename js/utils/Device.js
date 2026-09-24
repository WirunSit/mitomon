/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/utils/Device.js
   ตรวจชนิดอุปกรณ์ (จอสัมผัส) ใช้ตัดสินใจแสดงจอยสัมผัส/ขยายปุ่ม
   ========================================================== */

const Device = {
  isTouch() {
    if (CONFIG.JOYSTICK.FORCE_SHOW) return true;
    try {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
    } catch (e) {
      return false;
    }
  },
};
