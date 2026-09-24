/* ==========================================================
   MitoMon: ผจญภัยในเซลล์ - js/systems/InventorySystem.js
   ------------------------------------------------------------
   กระเป๋าไอเท็มของผู้เล่น (บันทึกลง SaveSystem: game.inventory)
   และสถานะการเกิดใหม่ของไอเท็มบนแผนที่ (เก็บในหน่วยความจำ)

   การใช้งาน:
     InventorySystem.add('item_glucose', 1)
     InventorySystem.count('item_glucose')
     InventorySystem.craftPotion()   -> แลกกลูโคสเป็นยาฟื้นพลัง
     InventorySystem.usePotion()     -> ใช้ยา ฟื้น HP สัตว์เลี้ยง
   ทุกครั้งที่ของในกระเป๋าเปลี่ยน จะยิงอีเวนต์ 'inventory-changed'
   ผ่าน game.events (ต้องเรียก bindGame(game) ก่อน)
   ========================================================== */

const InventorySystem = {
  _items: null,
  _game: null,
  _spawnState: {},   // { 'zone1:0': เวลาที่จะเกิดใหม่ (Date.now ms) }

  bindGame(game) {
    this._game = game;
  },

  _ensureLoaded() {
    if (this._items) return;
    const game = SaveSystem.loadGame();
    this._items = {};
    ITEMS.forEach((it) => { this._items[it.id] = 0; });
    if (game && game.inventory) {
      Object.keys(game.inventory).forEach((k) => {
        if (k in this._items) this._items[k] = Math.max(0, parseInt(game.inventory[k], 10) || 0);
      });
    }
  },

  _saveAndEmit(detail) {
    SaveSystem.saveGame({ inventory: this._items });
    if (this._game) this._game.events.emit('inventory-changed', this.getAll(), detail || {});
  },

  /** ล้างสถานะในหน่วยความจำ (หลังกด "เริ่มใหม่") */
  reset() {
    this._items = null;
    this._spawnState = {};
  },

  getAll() {
    this._ensureLoaded();
    return Object.assign({}, this._items);
  },

  count(itemId) {
    this._ensureLoaded();
    return this._items[itemId] || 0;
  },

  add(itemId, amount) {
    this._ensureLoaded();
    if (!(itemId in this._items)) return false;
    this._items[itemId] += amount;
    this._saveAndEmit({ added: itemId, amount });
    return true;
  },

  /** ใช้ไอเท็ม n ชิ้น (ในการต่อสู้) คืน false ถ้ามีไม่พอ */
  consume(itemId, amount) {
    this._ensureLoaded();
    const n = amount || 1;
    if ((this._items[itemId] || 0) < n) return false;
    this._items[itemId] -= n;
    this._saveAndEmit({ consumed: itemId, amount: n });
    return true;
  },

  canCraftPotion() {
    return this.count('item_glucose') >= CONFIG.INVENTORY.POTION_GLUCOSE_COST;
  },

  craftPotion() {
    if (!this.canCraftPotion()) return false;
    this._items.item_glucose -= CONFIG.INVENTORY.POTION_GLUCOSE_COST;
    this._items.item_potion += 1;
    this._saveAndEmit({ crafted: 'item_potion' });
    return true;
  },

  canUsePotion() {
    const pet = PetSystem.current;
    return this.count('item_potion') > 0 && !!pet && pet.hp < pet.maxHp;
  },

  /** ใช้ยาฟื้นพลัง 1 ขวด คืนค่า HP ที่ฟื้นได้จริง (0 = ใช้ไม่ได้) */
  usePotion() {
    if (!this.canUsePotion()) return 0;
    const pet = PetSystem.current;
    const before = pet.hp;
    this._items.item_potion -= 1;
    PetSystem.changeHp(CONFIG.INVENTORY.POTION_HEAL_HP);
    this._saveAndEmit({ used: 'item_potion' });
    return pet.hp - before;
  },

  // ---------------- สถานะการเกิดใหม่ของไอเท็มบนแผนที่ ----------------
  _spawnKey(mapKey, index) {
    return `${mapKey}:${index}`;
  },

  isSpawnAvailable(mapKey, index) {
    const t = this._spawnState[this._spawnKey(mapKey, index)];
    return !t || Date.now() >= t;
  },

  setSpawnCooldown(mapKey, index, seconds) {
    this._spawnState[this._spawnKey(mapKey, index)] = Date.now() + seconds * 1000;
  },
};
