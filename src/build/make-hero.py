"""Render the landing page's product shot: the real V6 layout, real map polygons,
and the values a fresh Brazil game actually shows on Easy."""
import json
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BG, PANEL, RAISED, LINE, TEXT, MUTED, ACCENT, GREEN = (
    '#101619', '#192024', '#20292d', '#303b3e', '#e9eeeb', '#97a5a5', '#e8bd71', '#8bb8a4')
W, H, SS = 1280, 760, 2

def font(px, bold=False):
    for p in (['/System/Library/Fonts/SFNSDisplay.ttf'] if bold else
              ['/System/Library/Fonts/SFNSText.ttf']) + \
             ['/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf']:
        try: return ImageFont.truetype(p, px)
        except OSError: continue
    return ImageFont.load_default(px)

img = Image.new('RGB', (W * SS, H * SS), BG)
d = ImageDraw.Draw(img)
S = lambda v: int(v * SS)

RAIL, HEAD, STAT, PANEL_W = 76, 62, 84, 360
MAP = (RAIL, HEAD + STAT, W - PANEL_W, H)

# ---- map -----------------------------------------------------------------------------
d.rectangle([S(MAP[0]), S(MAP[1]), S(MAP[2]), S(MAP[3])], fill='#141c20')
geo = json.loads((ROOT / 'src' / 'data' / 'map-data.json').read_text())
scale = 3.05 * SS
cx, cy = S((MAP[0] + MAP[2]) / 2) - 20 * SS, S((MAP[1] + MAP[3]) / 2) + 6 * SS
def proj(lon, lat): return cx + lon * scale, cy - lat * scale
clip = Image.new('RGB', (W * SS, H * SS), '#141c20')
cd = ImageDraw.Draw(clip)
for c in geo:
    fill = ACCENT if c['id'] == 'BRA' else '#2b393e'
    edge = '#c9a463' if c['id'] == 'BRA' else '#3b4b51'
    for poly in c['polygons']:
        if len(poly) < 3: continue
        pts = [proj(*p) for p in poly]
        xs = [p[0] for p in pts]
        if max(xs) - min(xs) > W * SS * 0.7: continue
        cd.polygon(pts, fill=fill, outline=edge)
img.paste(clip.crop((S(MAP[0]), S(MAP[1]), S(MAP[2]), S(MAP[3]))), (S(MAP[0]), S(MAP[1])))

def text(xy, s, f, fill=TEXT):
    d.text((S(xy[0]), S(xy[1])), s, font=f, fill=fill)
def box(x, y, w, h, fill=PANEL, outline=LINE):
    d.rectangle([S(x), S(y), S(x + w), S(y + h)], fill=fill, outline=outline, width=SS)

# ---- header --------------------------------------------------------------------------
box(0, 0, W, HEAD, BG)
d.line([(0, S(HEAD)), (S(W), S(HEAD))], fill=LINE, width=SS)
box(20, 14, 34, 34, RAISED)
d.polygon([(S(37), S(19)), (S(46), S(24)), (S(46), S(34)), (S(37), S(39)), (S(28), S(34)), (S(28), S(24))], outline=ACCENT, width=SS)
d.line([(S(37), S(24)), (S(37), S(34))], fill=ACCENT, width=SS)
d.line([(S(33), S(28)), (S(41), S(28))], fill=ACCENT, width=SS)
text((64, 15), 'SOVEREIGN', font(15, True))
text((64, 35), 'POLITICAL SANDBOX · V6', font(10), MUTED)
text((470, 15), 'September 2026', font(16, True))
text((470, 36), 'SIMULATION PAUSED', font(10), MUTED)
for i, (lab, on) in enumerate([('play', False), ('1x', True), ('3x', False), ('12x', False), ('step', False)]):
    x = 700 + i * 46
    box(x, 16, 38, 30, RAISED, ACCENT if on else LINE)
    if lab == 'play':
        d.polygon([(S(x + 15), S(24)), (S(x + 15), S(38)), (S(x + 25), S(31))], fill=TEXT)
    elif lab == 'step':
        d.polygon([(S(x + 13), S(24)), (S(x + 13), S(38)), (S(x + 22), S(31))], fill=TEXT)
        d.rectangle([S(x + 24), S(24), S(x + 26), S(38)], fill=TEXT)
    else:
        w = d.textlength(lab, font=font(12))
        d.text((S(x + 19) - w / 2, S(23)), lab, font=font(12), fill=ACCENT if on else TEXT)

# ---- nav rail ------------------------------------------------------------------------
box(0, HEAD, RAIL, H - HEAD, BG)
d.line([(S(RAIL), S(HEAD)), (S(RAIL), S(H))], fill=LINE, width=SS)
for i, name in enumerate(['Overview', 'Cities', 'Parties', 'Policies', 'Economy', 'Growth',
                          'Central', 'Trade', 'Diplomacy', 'Military', 'Dispatch']):
    y = HEAD + 12 + i * 58
    if i == 0:
        box(6, y - 4, 64, 52, RAISED, ACCENT)
    d.rectangle([S(30), S(y + 6), S(46), S(y + 22)], outline=ACCENT if i == 0 else MUTED, width=SS)
    w = d.textlength(name, font=font(9))
    d.text((S(38) - w / 2, S(y + 30)), name, font=font(9), fill=ACCENT if i == 0 else MUTED)

# ---- stat strip ----------------------------------------------------------------------
box(RAIL, HEAD, W - RAIL - PANEL_W, STAT, BG)
d.line([(S(RAIL), S(HEAD + STAT)), (S(W - PANEL_W), S(HEAD + STAT))], fill=LINE, width=SS)
for i, (lab, val, sub, col) in enumerate([
        ('GDP · national output', '$2.30T', '+2.4%', GREEN),
        ('Population', '213.0M', '', MUTED),
        ('Public approval', '62%', 'Supportive', GREEN),
        ('Political capital', '65', '/ 100', MUTED)]):
    x = RAIL + 22 + i * 210
    if i: d.line([(S(x - 22), S(HEAD + 16)), (S(x - 22), S(HEAD + STAT - 16))], fill=LINE, width=SS)
    text((x, HEAD + 15), lab, font(10.5), MUTED)
    text((x, HEAD + 33), val, font(24, True))
    if sub: text((x + d.textlength(val, font=font(24, True)) / SS + 8, HEAD + 42), sub, font(11), col)

# ---- map overlay chrome --------------------------------------------------------------
text((RAIL + 24, MAP[1] + 20), 'A world of possibilities.', font(22, True))
text((RAIL + 24, MAP[1] + 52), 'PLAYING AS BRAZIL · TIME IS PAUSED', font(10), MUTED)
box(RAIL + 22, MAP[1] + 76, 190, 34, RAISED)
text((RAIL + 34, MAP[1] + 85), 'Political control', font(12))
d.line([(S(RAIL + 188), S(MAP[1] + 90)), (S(RAIL + 193), S(MAP[1] + 95)), (S(RAIL + 198), S(MAP[1] + 90))], fill=MUTED, width=SS)
box(RAIL + 22, H - 54, 250, 30, '#1a2226')
d.ellipse([S(RAIL + 34), S(H - 43), S(RAIL + 42), S(H - 35)], fill=ACCENT)
text((RAIL + 48, H - 46), 'Your nation', font(11), MUTED)
d.ellipse([S(RAIL + 130), S(H - 43), S(RAIL + 138), S(H - 35)], fill='#5c6b6b')
text((RAIL + 144, H - 46), 'Independent', font(11), MUTED)

# ---- right panel ---------------------------------------------------------------------
px = W - PANEL_W
box(px, HEAD, PANEL_W, H - HEAD, PANEL)
text((px + 22, HEAD + 18), 'YOUR NATION', font(10), MUTED)
d.rectangle([S(px + 22), S(HEAD + 44), S(px + 46), S(HEAD + 60)], fill='#2a9d54')
d.polygon([(S(px + 34), S(HEAD + 46)), (S(px + 44), S(HEAD + 52)), (S(px + 34), S(HEAD + 58)), (S(px + 24), S(HEAD + 52))], fill='#f3d02f')
d.ellipse([S(px + 31), S(HEAD + 49), S(px + 37), S(HEAD + 55)], fill='#1c3f8f')
text((px + 56, HEAD + 40), 'Brazil', font(23, True))
text((px + 22, HEAD + 74), 'Hybrid institutions', font(11), MUTED)
box(px + 20, HEAD + 96, PANEL_W - 42, 32, RAISED)
text((px + 32, HEAD + 105), 'Brazil', font(12))
d.line([(S(px + 300), S(HEAD + 110)), (S(px + 305), S(HEAD + 115)), (S(px + 310), S(HEAD + 110))], fill=MUTED, width=SS)

y = HEAD + 150
text((px + 22, y), 'National outlook', font(15, True))
y += 30
for lab, val, col in [('Stability', '75 / 100', TEXT), ('Public approval', '62%', TEXT),
                      ('Inflation', '4.5%', TEXT), ('Government debt', '0.0% of GDP', GREEN),
                      ('Economic trajectory', '+2.4%', GREEN)]:
    text((px + 22, y), lab, font(12), MUTED)
    w = d.textlength(val, font=font(12, True))
    d.text((S(px + PANEL_W - 22) - w, S(y)), val, font=font(12, True), fill=col)
    d.line([(S(px + 22), S(y + 24)), (S(px + PANEL_W - 22), S(y + 24))], fill=LINE, width=SS)
    y += 36

y += 14
text((px + 22, y), 'ECONOMIC POLICY PROFILE', font(9.5), MUTED)
box(px + 20, y + 20, PANEL_W - 42, 74, RAISED, ACCENT)
text((px + 34, y + 32), 'Social liberal', font(15, True), ACCENT)
text((px + 34, y + 56), 'Open markets, public services', font(11), MUTED)
text((px + 34, y + 72), 'and moderate redistribution.', font(11), MUTED)

y += 118
box(px + 20, y, PANEL_W - 42, 36, RAISED)
text((px + 34, y + 10), 'Shape domestic policy', font(12))
d.line([(S(px + 298), S(y + 18)), (S(px + 312), S(y + 18))], fill=ACCENT, width=SS)
d.line([(S(px + 307), S(y + 13)), (S(px + 312), S(y + 18)), (S(px + 307), S(y + 23))], fill=ACCENT, width=SS)

img.resize((W, H), Image.LANCZOS).save(ROOT / 'hero.png', optimize=True)
print('hero.png', (ROOT / 'hero.png').stat().st_size, 'bytes')
