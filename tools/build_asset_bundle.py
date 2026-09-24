#!/usr/bin/env python3
"""
MitoMon - tools/build_asset_bundle.py
------------------------------------------------------------
สร้างไฟล์ js/assetBundle.js ที่ฝังภาพทุกไฟล์ในรายการ ASSET_LIST
(ของ js/scenes/BootScene.js) เป็น data URI เพื่อให้ "ดับเบิลคลิก
เปิด index.html" (file://) แล้วเห็นภาพจริงได้เลย

ใช้เมื่อ: เพิ่ม/เปลี่ยนไฟล์ภาพใน assets/ แล้วต้องการให้การเปิด
แบบ file:// ใช้ภาพใหม่ด้วย (ถ้าเปิดผ่าน Live Server / GitHub Pages
ไม่ต้องรันสคริปต์นี้)

วิธีรัน (ที่โฟลเดอร์หลักของโปรเจกต์):
    python tools/build_asset_bundle.py
ต้องมี Python 3 + Pillow (pip install pillow)
ถ้ามีคำสั่ง pngquant ในเครื่อง จะใช้ลดขนาดไฟล์ภาพโปร่งใสให้เล็กลงอีก

ไฟล์ภาพต้นฉบับใน assets/ จะไม่ถูกแก้ไข
- ภาพทึบ (แผนที่/พื้นหลัง) ฝังเป็น JPEG คุณภาพสูงเพื่อลดขนาด
- ภาพโปร่งใส (ตัวละคร/ไอเท็ม/UI) ฝังเป็น PNG
"""
import base64, io, json, os, re, shutil, subprocess, sys, tempfile

try:
    from PIL import Image
except ImportError:
    sys.exit('ต้องติดตั้ง Pillow ก่อน: pip install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JPEG_QUALITY = 88


def asset_paths():
    """อ่าน path ภาพจาก BootScene.js + ข้อมูลใน pets.js/items.js"""
    boot = open(os.path.join(ROOT, 'js/scenes/BootScene.js'), encoding='utf-8').read()
    paths = set(re.findall(r"path:\s*'([^']+\.png)'", boot))
    pets = open(os.path.join(ROOT, 'js/data/pets.js'), encoding='utf-8').read()
    pet_ids = sorted(set(re.findall(r"id:\s*'(p\d)'", pets)))
    for pid in pet_ids:
        paths.add(f'assets/eggs/egg_{pid}.png')
        paths.add(f'assets/eggs/egg_{pid}_crack.png')
        for stage in (1, 2, 3):
            for pose in ('idle', 'blink', 'attack', 'hurt'):
                paths.add(f'assets/pets/{pid}_f{stage}_{pose}.png')
    monsters = open(os.path.join(ROOT, 'js/data/monsters.js'), encoding='utf-8').read()
    for key in re.findall(r"(?:idleKey|hurtKey):\s*'([^']+)'", monsters):
        paths.add(f'assets/monsters/{key}.png')
    items = open(os.path.join(ROOT, 'js/data/items.js'), encoding='utf-8').read()
    for key in re.findall(r"spriteKey:\s*'([^']+)'", items):
        paths.add(f'assets/items/{key}.png')
    return sorted(paths)


def encode(path):
    full = os.path.join(ROOT, path)
    im = Image.open(full)
    has_alpha = im.mode in ('RGBA', 'LA') or 'transparency' in im.info
    if has_alpha and im.convert('RGBA').getextrema()[3][0] == 255:
        has_alpha = False
    if not has_alpha:
        buf = io.BytesIO()
        im.convert('RGB').save(buf, 'JPEG', quality=JPEG_QUALITY, optimize=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    data = open(full, 'rb').read()
    if shutil.which('pngquant'):
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, 'q.png')
            r = subprocess.run(['pngquant', '--quality=80-98', '--speed=1', '--output', out, full],
                               capture_output=True)
            if r.returncode == 0 and os.path.exists(out):
                q = open(out, 'rb').read()
                if len(q) < len(data):
                    data = q
    return 'data:image/png;base64,' + base64.b64encode(data).decode()


def main():
    bundle, missing = {}, []
    for p in asset_paths():
        if not os.path.exists(os.path.join(ROOT, p)):
            missing.append(p)
            continue
        bundle[p] = encode(p)
    out = os.path.join(ROOT, 'js/assetBundle.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('/* สร้างอัตโนมัติด้วย tools/build_asset_bundle.py - ห้ามแก้ไขด้วยมือ\n'
                '   ใช้เฉพาะตอนดับเบิลคลิกเปิด index.html (file://) */\n')
        f.write('window.MITOMON_ASSET_BUNDLE = ')
        json.dump(bundle, f, separators=(',', ':'))
        f.write(';\n')
    size = os.path.getsize(out) / 1024 / 1024
    print(f'สร้าง js/assetBundle.js แล้ว: {len(bundle)} ภาพ, {size:.1f} MB')
    if missing:
        print('ไม่พบไฟล์ต่อไปนี้ (เกมจะแจ้งเตือนตอนเปิด):')
        for m in missing:
            print('  -', m)


if __name__ == '__main__':
    main()
