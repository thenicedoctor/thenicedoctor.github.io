"""Render the site's social-preview image and icons from the game's own map polygons."""
import json, math
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BG, PANEL, LINE, TEXT, MUTED, ACCENT = '#101619', '#1b2429', '#36434a', '#e9eeeb', '#97a5a5', '#e8bd71'
W, H, SS = 1200, 630, 2                       # supersample for clean polygon edges

def font(size, bold=False):
    for name in (['/System/Library/Fonts/SFNSDisplay.ttf'] if bold else []) + [
            '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf']:
        try: return ImageFont.truetype(name, size)
        except OSError: continue
    return ImageFont.load_default(size)

geo = json.loads((ROOT / 'src' / 'data' / 'map-data.json').read_text())
img = Image.new('RGB', (W * SS, H * SS), BG)
d = ImageDraw.Draw(img)

# Equirectangular projection, centred so the landmasses fill the card.
SCALE, CX, CY = 3.75 * SS, W * SS * 0.5, H * SS * 0.52
def project(lon, lat):
    return CX + lon * SCALE, CY - lat * SCALE * 1.02

for country in geo:
    for poly in country['polygons']:
        if len(poly) < 3:
            continue
        pts = [project(*p) for p in poly]
        xs = [p[0] for p in pts]
        if max(xs) - min(xs) > W * SS * 0.7:       # skip antimeridian-wrapped rings
            continue
        d.polygon(pts, fill='#28353a', outline='#3c4c52')

# Darken the map behind the text so the type stays legible.
veil = Image.new('RGBA', img.size, (16, 22, 25, 0))
ImageDraw.Draw(veil).rectangle([0, 0, img.size[0], img.size[1]], fill=(16, 22, 25, 168))
img = Image.alpha_composite(img.convert('RGBA'), veil).convert('RGB')
img = img.resize((W, H), Image.LANCZOS)
d = ImageDraw.Draw(img)

# Emblem
d.polygon([(64, 60), (86, 73), (86, 99), (64, 112), (42, 99), (42, 73)], outline=ACCENT, width=2)
d.line([(64, 74), (64, 98)], fill=ACCENT, width=2)
d.line([(54, 83), (74, 83)], fill=ACCENT, width=2)

d.text((104, 68), 'SOVEREIGN', font=font(25, True), fill=TEXT)
d.text((104, 98), 'POLITICAL SANDBOX', font=font(15), fill=MUTED)

d.text((64, 196), 'Run a country.', font=font(74, True), fill=TEXT)
d.text((64, 278), 'Watch the economy answer.', font=font(74, True), fill=ACCENT)

d.text((64, 392), 'A free browser strategy game. Fiscal and monetary policy, a modelled',
       font=font(24), fill=MUTED)
d.text((64, 426), 'central bank, named cities, trade and diplomacy — month by month.',
       font=font(24), fill=MUTED)

# Stat strip
stats = [('204', 'countries'), ('1,198', 'named cities'), ('63', 'policy controls'), ('Free', 'no sign-up')]
x, top = 64, 500
for i, (big, small) in enumerate(stats):
    d.rectangle([x, top, x + 252, top + 78], fill=PANEL, outline=LINE)
    d.text((x + 20, top + 14), big, font=font(30, True), fill=ACCENT)
    d.text((x + 20, top + 50), small, font=font(15), fill=MUTED)
    x += 268


img.save(ROOT / 'og.png', optimize=True)

# Square app icon reusing the emblem.
for size in (180, 512):
    ic = Image.new('RGB', (size, size), BG)
    k = ImageDraw.Draw(ic)
    s, c = size * 0.30, size / 2
    k.polygon([(c, c - s), (c + s * .87, c - s * .5), (c + s * .87, c + s * .5),
               (c, c + s), (c - s * .87, c + s * .5), (c - s * .87, c - s * .5)],
              outline=ACCENT, width=max(2, size // 38))
    k.line([(c, c - s * .45), (c, c + s * .45)], fill=ACCENT, width=max(2, size // 38))
    k.line([(c - s * .38, c - s * .05), (c + s * .38, c - s * .05)], fill=ACCENT, width=max(2, size // 38))
    ic.save(ROOT / f'icon-{size}.png', optimize=True)

print('og.png', (ROOT / 'og.png').stat().st_size, 'bytes')
