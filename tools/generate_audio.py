#!/usr/bin/env python3
"""
MitoMon - tools/generate_audio.py
------------------------------------------------------------
สร้างไฟล์เสียงทั้งหมดของเกม (BGM ต่อโซน + เสียงประกอบ) ด้วยการสังเคราะห์เสียง
ผลงานเสียงทั้งหมดสร้างใหม่จากสคริปต์นี้ จึงใช้/แจกจ่ายได้อิสระ (ไม่มีลิขสิทธิ์บุคคลที่สาม)

รัน:  pip install numpy lameenc
      python tools/generate_audio.py
ผลลัพธ์: assets/audio/*.mp3  (mono 22050 Hz)

ถ้าต้องการใช้เสียงจากเว็บไซต์ฟรี (Kenney.nl / Pixabay / freesound) ให้วางไฟล์ .mp3
ทับชื่อเดิมได้เลย (ดูรายชื่อใน CONFIG.AUDIO ของ js/config.js)
"""
import os
import numpy as np
import lameenc

SR = 22050
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def note_hz(n):  # MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, a=0.005, d=0.1, s=0.6, r=0.15, length=None):
    length = length or n
    t = np.arange(n) / SR
    e = np.ones(n) * s
    ai = int(a * SR); di = int(d * SR); ri = int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if di: e[ai:ai + di] = np.linspace(1, s, len(e[ai:ai + di]))
    if ri and ri < n: e[-ri:] *= np.linspace(1, 0, ri)
    return e


def osc(kind, f, n, phase=0.0):
    t = np.arange(n) / SR
    x = 2 * np.pi * f * t + phase
    if kind == 'sine': return np.sin(x)
    if kind == 'tri': return 2 / np.pi * np.arcsin(np.sin(x))
    if kind == 'square': return np.tanh(np.sin(x) * 3) * 0.7
    if kind == 'saw': return 2 * ((f * t) % 1) - 1
    if kind == 'bell': return np.sin(x) + 0.4 * np.sin(2.76 * x) * np.exp(-t * 6) + 0.2 * np.sin(5.4 * x) * np.exp(-t * 9)
    if kind == 'marimba': return (np.sin(x) + 0.3 * np.sin(4 * x) * np.exp(-t * 20)) * np.exp(-t * 7)
    raise ValueError(kind)


def tone(midi, dur, kind='tri', vol=0.3, a=0.005, d=0.08, s=0.5, r=0.08):
    n = max(1, int(dur * SR))
    return osc(kind, note_hz(midi), n) * env(n, a, d, s, r) * vol


def noise(dur, vol=0.2, decay=30.0, hp=True):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    if hp: x = np.diff(np.concatenate([[0], x]))
    return x * np.exp(-np.arange(n) / SR * decay) * vol


def kick(vol=0.5):
    n = int(0.18 * SR); t = np.arange(n) / SR
    f = 110 * np.exp(-t * 25) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * vol


def mix_at(buf, x, start):
    i = int(start * SR)
    if i >= len(buf): return
    end = min(len(buf), i + len(x))
    buf[i:end] += x[:end - i]


def lowpass(x, alpha=0.2):
    y = np.zeros_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc); y[i] = acc
    return y


def save(name, x, peak=0.85):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    pcm = (x * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(64); enc.set_in_sample_rate(SR); enc.set_channels(1); enc.set_quality(2)
    data = enc.encode(pcm.tobytes()) + enc.flush()
    with open(os.path.join(OUT, name + '.mp3'), 'wb') as f:
        f.write(data)
    print(f'{name}.mp3  {len(x) / SR:.1f}s  {len(data) // 1024} KB')


# ============================================================ SFX
def sfx():
    b = np.zeros(int(0.7 * SR))
    for i, m in enumerate([84, 88, 91, 96]): mix_at(b, tone(m, 0.35, 'bell', 0.35, s=0.3, r=0.2), i * 0.07)
    save('sfx_correct', b)

    b = np.zeros(int(0.6 * SR))
    mix_at(b, tone(52, 0.22, 'square', 0.3, s=0.7), 0)
    mix_at(b, tone(47, 0.32, 'square', 0.3, s=0.7, r=0.15), 0.18)
    save('sfx_wrong', lowpass(b, 0.25))

    b = np.zeros(int(0.5 * SR)); n = int(0.25 * SR); t = np.arange(n) / SR
    sweep = rng.standard_normal(n) * np.sin(np.pi * t / t[-1]) * 0.4
    mix_at(b, lowpass(sweep, 0.35), 0)
    mix_at(b, kick(0.8), 0.2); mix_at(b, noise(0.15, 0.35, 25), 0.2)
    save('sfx_attack', b)

    b = np.zeros(int(0.45 * SR))
    mix_at(b, kick(0.9), 0); mix_at(b, lowpass(noise(0.2, 0.5, 18, False), 0.3), 0.01)
    save('sfx_hit', b)

    b = np.zeros(int(1.6 * SR))
    for i, m in enumerate([72, 76, 79, 84, 88, 91]): mix_at(b, tone(m, 0.4, 'tri', 0.28, s=0.4, r=0.2), i * 0.09)
    for m in [84, 88, 91, 96]: mix_at(b, tone(m, 0.9, 'bell', 0.18, s=0.35, r=0.6), 0.56)
    for k in range(8): mix_at(b, tone(96 + (k % 4) * 3, 0.12, 'sine', 0.08), 0.7 + k * 0.08)
    save('sfx_levelup', b)

    b = np.zeros(int(1.8 * SR))
    for s0 in (0.0, 0.35): mix_at(b, noise(0.06, 0.6, 60), s0)
    mix_at(b, noise(0.12, 0.7, 30), 0.75)
    for i, m in enumerate([79, 84, 88, 91, 96]): mix_at(b, tone(m, 0.7, 'bell', 0.25, s=0.3, r=0.4), 0.8 + i * 0.06)
    save('sfx_hatch', b)

    b = np.zeros(int(0.12 * SR)); mix_at(b, tone(88, 0.08, 'sine', 0.4, s=0.2, r=0.04), 0)
    save('sfx_click', b)

    b = np.zeros(int(0.4 * SR))
    mix_at(b, tone(88, 0.08, 'square', 0.25, s=0.6), 0); mix_at(b, tone(95, 0.3, 'square', 0.25, s=0.5, r=0.2), 0.07)
    save('sfx_pickup', lowpass(b, 0.4))

    n = int(2.6 * SR); t = np.arange(n) / SR
    f = 300 * 2 ** (t * 1.6)
    sw = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.2 * np.minimum(1, t * 2)
    b = sw + 0.0
    for k in range(20): mix_at(b, tone(84 + int(rng.integers(0, 16)), 0.15, 'bell', 0.07), 0.2 + k * 0.11)
    save('sfx_evolve', b)


# ============================================================ BGM
SCALES = {'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10],
          'mixo': [0, 2, 4, 5, 7, 9, 10], 'penta': [0, 2, 4, 7, 9]}


def chord_tones(root, mode, degree):
    sc = SCALES[mode]
    return [root + sc[(degree + k) % 7] + 12 * ((degree + k) // 7) for k in (0, 2, 4)]


def bgm(name, root, mode, bpm, prog, lead='tri', pad='sine', bass='tri', drums=True, bars_per_chord=1,
        density=0.7, lead_oct=12, seed=1, arp=True, swing=0.0):
    r = np.random.default_rng(seed)
    beat = 60 / bpm
    bar = beat * 4
    total_bars = len(prog) * bars_per_chord * 2  # วนโปรเกรสชัน 2 รอบ
    length = total_bars * bar
    buf = np.zeros(int((length + 2) * SR))
    sc = SCALES[mode]
    motif = None
    for bi in range(total_bars):
        deg = prog[(bi // bars_per_chord) % len(prog)]
        ch = chord_tones(root, mode, deg)
        t0 = bi * bar
        # pad
        for m in ch: mix_at(buf, tone(m, bar, pad, 0.06, a=0.08, d=0.2, s=0.8, r=0.3), t0)
        # bass
        for k in range(2): mix_at(buf, tone(ch[0] - 12, beat * 1.8, bass, 0.22, s=0.6, r=0.1), t0 + k * beat * 2)
        # arpeggio
        if arp:
            for k in range(8):
                m = ch[k % 3] + 12
                mix_at(buf, tone(m, beat * 0.45, 'sine', 0.05, s=0.3, r=0.05), t0 + k * beat / 2)
        # melody: motif ที่ซ้ำ + แปรผัน ให้ฟังเป็นทำนอง
        if motif is None or bi % 4 == 0:
            motif = []
            for k in range(8):
                if r.random() < density:
                    idx = int(r.integers(0, 7))
                    motif.append((k, idx))
        for k, idx in motif:
            m = root + lead_oct + sc[idx % len(sc)]
            if m % 12 not in [(c % 12) for c in ch] and r.random() < 0.5:
                m = ch[int(r.integers(0, 3))] + lead_oct
            st = t0 + k * beat / 2 + (swing * beat / 2 if k % 2 else 0)
            mix_at(buf, tone(m, beat * 0.5, lead, 0.12, s=0.5, r=0.06), st)
        # drums
        if drums:
            for k in range(4):
                if k in (0, 2): mix_at(buf, kick(0.28), t0 + k * beat)
                if k in (1, 3): mix_at(buf, noise(0.12, 0.12, 25), t0 + k * beat)
                mix_at(buf, noise(0.03, 0.05, 90), t0 + k * beat + beat / 2)
    # ต่อหางเสียงกลับไปต้นเพลงให้วนได้เนียน
    n = int(length * SR)
    tail = buf[n:]
    buf = buf[:n].copy()
    buf[:len(tail)] += tail
    save(name, buf, 0.7)


def all_bgm():
    bgm('bgm_title', 60, 'major', 88, [0, 5, 3, 4], lead='bell', drums=False, bars_per_chord=2, density=0.5, seed=11)
    bgm('bgm_farm', 67, 'major', 108, [0, 3, 4, 0, 5, 3, 4, 4], lead='tri', density=0.75, seed=3)
    bgm('bgm_zone1', 65, 'major', 104, [0, 5, 1, 4], lead='marimba', density=0.8, seed=5, swing=0.2)
    bgm('bgm_zone2', 57, 'mixo', 100, [0, 6, 3, 0], lead='tri', density=0.7, seed=8)
    bgm('bgm_zone3', 64, 'minor', 118, [0, 5, 2, 6], lead='square', density=0.75, seed=13)
    bgm('bgm_zone4', 62, 'dorian', 92, [0, 3, 0, 4], lead='marimba', density=0.6, seed=21, swing=0.25)
    bgm('bgm_boss', 60, 'minor', 132, [0, 5, 6, 4], lead='saw', bass='square', density=0.85, seed=17)
    bgm('bgm_battle', 57, 'minor', 140, [0, 3, 5, 4], lead='square', density=0.85, seed=19)


if __name__ == '__main__':
    sfx()
    all_bgm()
