"""Sound track for the promo video: an original 8-bit loop plus sound effects placed at the
moments recorded by record.cjs (events.json). Everything is synthesised, so there is no
licensing to worry about.

    python3 tools/promo/soundtrack.py <framesDir>/events.json <out.wav>
"""
import json
import sys
import wave

import numpy as np

SR = 44100
BPM = 140
BEAT = 60 / BPM
EIGHTH = BEAT / 2

NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def hz(name, octave):
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


def env(n, attack=0.005, release=0.05):
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e = np.ones(n)
    e[:min(a, n)] = np.linspace(0, 1, min(a, n))
    if r < n:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def square(f, dur, duty=0.5, f_end=None):
    n = int(dur * SR)
    freq = np.linspace(f, f_end or f, n)
    phase = np.cumsum(freq) / SR
    return np.where((phase % 1.0) < duty, 1.0, -1.0)


def triangle(f, dur):
    n = int(dur * SR)
    phase = (np.arange(n) * f / SR) % 1.0
    return 4 * np.abs(phase - 0.5) - 1


def noise(dur):
    return np.random.default_rng(7).uniform(-1, 1, int(dur * SR))


def add(track, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(track):
        return
    j = min(len(track), i + len(sig))
    track[i:j] += sig[: j - i] * gain


# --- music ---------------------------------------------------------------------------------
CHORDS = [('A', ['A', 'C', 'E']), ('F', ['F', 'A', 'C']), ('C', ['C', 'E', 'G']), ('G', ['G', 'B', 'D'])]
# lead pattern over 8 eighths (indexes into chord tones, octave offset)
PATTERNS = [
    [(0, 1), (1, 1), (2, 1), (1, 1), (0, 2), (2, 1), (1, 1), (2, 1)],
    [(2, 1), (0, 2), (1, 2), (0, 2), (2, 1), (1, 1), (0, 1), (1, 1)],
]


def music(duration):
    track = np.zeros(int(duration * SR) + SR)
    bar = 4 * BEAT
    t, b = 0.0, 0
    while t < duration:
        root, tones = CHORDS[b % 4]
        pat = PATTERNS[(b // 4) % 2]
        # lead: square arpeggio (25% duty)
        for k, (ti, oct_) in enumerate(pat):
            name = tones[ti]
            octave = 4 + oct_ + (1 if NOTE[name] < NOTE[root] else 0) - 1
            s = square(hz(name, octave), EIGHTH * 0.9, duty=0.25) * env(int(EIGHTH * 0.9 * SR), 0.003, 0.04)
            add(track, s, t + k * EIGHTH, 0.16)
        # bass: triangle roots on every beat, octave jump on the off-beat
        for k in range(4):
            s = triangle(hz(root, 2 if k % 2 == 0 else 3), BEAT * 0.85) * env(int(BEAT * 0.85 * SR), 0.004, 0.08)
            add(track, s, t + k * BEAT, 0.45)
        # drums
        for k in range(4):
            beat_t = t + k * BEAT
            if k in (0, 2):  # kick
                n = int(0.12 * SR)
                f = np.linspace(140, 45, n)
                add(track, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.linspace(1, 0, n) ** 2, beat_t, 0.7)
            else:  # snare
                add(track, noise(0.12) * np.linspace(1, 0, int(0.12 * SR)) ** 2, beat_t, 0.25)
            for h in range(2):  # closed hats
                hat = np.diff(noise(0.035), prepend=0) * np.linspace(1, 0, int(0.035 * SR))
                add(track, hat, beat_t + h * EIGHTH, 0.12)
        t += bar
        b += 1
    return track[: int(duration * SR)]


# --- sound effects -----------------------------------------------------------------------------
def sfx_whip():
    whoosh = noise(0.13)
    whoosh = np.convolve(whoosh, np.ones(6) / 6, mode='same') * np.linspace(0, 1, len(whoosh)) ** 2
    crack = np.diff(noise(0.05), prepend=0) * np.linspace(1, 0, int(0.05 * SR)) ** 3 * 2.2
    thump = np.sin(2 * np.pi * np.cumsum(np.linspace(180, 60, int(0.06 * SR))) / SR) * np.linspace(1, 0, int(0.06 * SR))
    out = np.zeros(int(0.25 * SR))
    add(out, whoosh, 0, 0.35)
    add(out, crack, 0.13, 1.0)
    add(out, thump, 0.13, 0.5)
    return out


def blips(notes, step, dur, duty=0.5, gain=1.0):
    out = np.zeros(int((step * len(notes) + dur) * SR))
    for i, (n, o) in enumerate(notes):
        s = square(hz(n, o), dur, duty) * env(int(dur * SR), 0.002, 0.03)
        add(out, s, i * step, gain)
    return out


def sfx_siren():
    out = np.zeros(int(1.0 * SR))
    for i in range(4):
        f = 880 if i % 2 == 0 else 660
        add(out, triangle(f, 0.2) * env(int(0.2 * SR), 0.01, 0.05), i * 0.22, 0.8)
    return out


def sfx_fine():
    n = int(0.3 * SR)
    saw = (np.cumsum(np.linspace(170, 110, n)) / SR) % 1.0 * 2 - 1
    return saw * env(n, 0.005, 0.1)


def sfx_rise(dur=0.9):
    n = int(dur * SR)
    s = square(200, dur, 0.5, f_end=1200) * np.linspace(0, 1, n) ** 2
    return s * env(n, 0.01, 0.05)


SFX = {
    'whip': (sfx_whip(), 0.0, 0.85),
    'coin': (blips([('B', 5), ('E', 6)], 0.06, 0.08), 0.16, 0.25),
    'fanfare': (blips([('C', 5), ('E', 5), ('G', 5), ('C', 6), ('G', 5), ('C', 6)], 0.08, 0.12), 0.0, 0.3),
    'siren': (sfx_siren(), 0.0, 0.35),
    'fine': (sfx_fine(), 0.0, 0.35),
    'blip': (blips([('A', 5), ('E', 6)], 0.035, 0.04, 0.25), 0.0, 0.2),
    'intro': (sfx_rise(), 0.0, 0.25),
    'outro': (blips([('C', 5), ('G', 5), ('C', 6), ('E', 6), ('G', 6)], 0.07, 0.35, 0.25), 0.0, 0.3),
}


def main(events_path, out_path):
    info = json.load(open(events_path))
    duration = info['duration']
    mix = music(duration)
    # music bed: fade in, duck under the title cards' speech-free moments, fade out
    n = len(mix)
    fade = np.ones(n)
    fade[: int(0.8 * SR)] = np.linspace(0, 1, int(0.8 * SR))
    fade[-int(2.5 * SR):] = np.linspace(1, 0, int(2.5 * SR))
    mix *= fade * 0.55
    fx = np.zeros(n + SR)
    last = {}
    for e in info['events']:
        sig, delay, gain = SFX.get(e['type'], (None, 0, 0))
        if sig is None:
            continue
        # avoid machine-gun stacking of the same effect within 60 ms
        if e['t'] - last.get(e['type'], -1) < 0.06:
            continue
        last[e['type']] = e['t']
        add(fx, sig, e['t'] + delay, gain)
    out = mix + fx[:n]
    out = np.tanh(out * 1.1) * 0.92  # soft clip
    pcm = (out * 32767).astype(np.int16)
    stereo = np.column_stack([pcm, pcm]).ravel()
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())
    print(f'{out_path}: {duration:.1f}s, {len(info["events"])} events')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
