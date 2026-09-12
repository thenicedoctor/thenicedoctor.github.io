"""Split single-country polygons into the partitioned states of the Cold War.

The map data has one shape per present-day country, so East and West Germany, the two Vietnams and
the two Yemens could not be shown. This cuts those shapes along an approximated historical border
and writes the pieces to src/data/split-polygons.json for the game to use in the relevant eras.

The cut lines are hand-approximated from well-known geography, not surveyed boundary data. The
inner-German border in particular was intricate; this follows its general course (Baltic near
Lübeck, along the Elbe, west around Thuringia, to the Czech border near Hof) at roughly a dozen
points. Areas are checked against the historical figures so a bad line fails loudly.
"""
from pathlib import Path
import json, math

ROOT = Path(__file__).resolve().parents[2]
GEO = json.loads((ROOT / 'src' / 'data' / 'map-data.json').read_text())

# Each cut is a polyline running right through the country, ordered so that "left" and "right"
# are consistent. Points are [lon, lat]; the line must extend past the country on both ends.
CUTS = {
 'DEU': {
  # Follows the inner-German border's general course, fitted to this map's simplified outline:
  # into Lübeck Bay, along the Elbe, west around the Harz and Thuringia, out at the Czech border.
  'line': [[10.90, 55.30], [11.15, 54.15], [11.42, 53.40], [11.48, 52.95], [11.00, 52.60],
           [10.60, 52.20], [10.25, 51.80], [10.02, 51.30], [9.98, 50.95], [10.20, 50.60],
           [10.70, 50.40], [11.40, 50.32], [12.00, 50.30], [12.80, 49.85]],
  'left':  {'id': 'DEW', 'name': 'West Germany', 'lon': 8.5, 'lat': 50.5, 'anchor': [6.96, 50.94]},
  'right': {'id': 'DEE', 'name': 'East Germany', 'lon': 12.8, 'lat': 52.4, 'anchor': [13.40, 52.52]},
  # Historical land areas in km^2, used only to sanity-check the cut.
  'check': {'left': 248_000, 'right': 108_000, 'tolerance': .10}},
 'VNM': {
  # The 17th parallel, the demarcation line agreed at Geneva in 1954.
  'line': [[101.50, 17.00], [110.50, 17.00]],
  'left':  {'id': 'VNN', 'name': 'North Vietnam', 'lon': 105.8, 'lat': 21.0, 'anchor': [105.85, 21.03]},
  'right': {'id': 'VNS', 'name': 'South Vietnam', 'lon': 106.7, 'lat': 11.0, 'anchor': [106.70, 10.78]},
  'check': {'left': 158_000, 'right': 173_000, 'tolerance': .10}},
 'YEM': {
  # North Yemen was the compact western highlands; the border ran east of Ta'izz, north of Aden
  # and Lahij, then turned north through the desert to the Saudi frontier.
  'line': [[42.20, 12.55], [43.60, 12.85], [44.35, 13.35], [44.95, 13.62], [45.60, 14.10],
           [46.10, 14.62], [46.60, 15.45], [47.00, 16.40], [47.40, 17.60], [47.65, 19.60]],
  'left':  {'id': 'YEN', 'name': 'North Yemen', 'lon': 44.2, 'lat': 15.4, 'anchor': [44.21, 15.35]},
  'right': {'id': 'YES', 'name': 'South Yemen', 'lon': 48.5, 'lat': 14.6, 'anchor': [45.04, 12.79]},
  'check': {'left': 195_000, 'right': 333_000, 'tolerance': .18}},
}

def contains(ring, p):
    """Ray casting: is point p inside this ring?"""
    inside = False
    n = len(ring)
    for i in range(n):
        (x1, y1), (x2, y2) = ring[i], ring[(i+1) % n]
        if (y1 > p[1]) != (y2 > p[1]):
            xin = x1 + (p[1]-y1) * (x2-x1) / (y2-y1)
            if p[0] < xin: inside = not inside
    return inside

def nearest(p, q):
    return math.hypot(p[0]-q[0], p[1]-q[1])

def assign(piece, spec):
    """Which state a piece belongs to: the one whose anchor city it contains,
    or failing that (islands, offshore rings) the nearer anchor."""
    for key in ('left', 'right'):
        if contains(piece, spec[key]['anchor']): return key
    mid = [sum(x[0] for x in piece)/len(piece), sum(x[1] for x in piece)/len(piece)]
    return min(('left', 'right'), key=lambda k: nearest(mid, spec[k]['anchor']))

def seg_intersect(p1, p2, p3, p4):
    d = (p2[0]-p1[0])*(p4[1]-p3[1]) - (p2[1]-p1[1])*(p4[0]-p3[0])
    if abs(d) < 1e-12: return None
    t = ((p3[0]-p1[0])*(p4[1]-p3[1]) - (p3[1]-p1[1])*(p4[0]-p3[0])) / d
    u = ((p3[0]-p1[0])*(p2[1]-p1[1]) - (p3[1]-p1[1])*(p2[0]-p1[0])) / d
    if 0 <= t <= 1 and 0 <= u <= 1:
        return [p1[0] + t*(p2[0]-p1[0]), p1[1] + t*(p2[1]-p1[1])], u
    return None

def cut_ring(ring, line):
    """Cut a simple ring with a polyline that crosses it exactly twice."""
    ring = ring[:-1] if ring[0] == ring[-1] else ring[:]
    n = len(ring)
    crossings = []          # (index in ring, point, position along the whole line)
    for i in range(n):
        a, b = ring[i], ring[(i+1) % n]
        for j, (c, d) in enumerate(zip(line, line[1:])):
            hit = seg_intersect(a, b, c, d)
            if hit:
                crossings.append((i, hit[0], j + hit[1]))
                break
    if len(crossings) != 2:
        return None, len(crossings)
    crossings.sort(key=lambda c: c[0])
    (i1, p1, t1), (i2, p2, t2) = crossings

    def line_between(ta, tb):
        """The stretch of cut line between two positions, as points."""
        lo, hi = (ta, tb) if ta < tb else (tb, ta)
        pts = []
        for k in range(int(math.floor(lo)) + 1, int(math.ceil(hi))):
            if 0 < k < len(line): pts.append(line[k])
        return pts if ta < tb else pts[::-1]

    arc_a = ring[i1+1:i2+1]                       # points strictly between the crossings
    arc_b = ring[i2+1:] + ring[:i1+1]             # the rest
    piece_a = [p1] + arc_a + [p2] + line_between(t2, t1)
    piece_b = [p2] + arc_b + [p1] + line_between(t1, t2)
    return (piece_a, piece_b), 2

def area_km2(ring):
    """Rough spherical area of a small polygon, good enough to sanity-check a cut."""
    if len(ring) < 3: return 0
    lat0 = sum(p[1] for p in ring) / len(ring)
    k = 111.32
    pts = [(p[0]*k*math.cos(math.radians(lat0)), p[1]*k) for p in ring]
    s = sum(pts[i][0]*pts[(i+1) % len(pts)][1] - pts[(i+1) % len(pts)][0]*pts[i][1]
            for i in range(len(pts)))
    return abs(s) / 2

out = {}
for cid, spec in CUTS.items():
    country = next(g for g in GEO if g['id'] == cid)
    left_rings, right_rings, unsplit = [], [], 0
    for ring in country['polygons']:
        pieces, count = cut_ring(ring, spec['line'])
        if pieces is None:
            print(f'    {cid}: a ring crossed {count} time(s), not 2 — assigned whole')
            (left_rings if assign(ring, spec) == 'left' else right_rings).append(ring)
            unsplit += 1
            continue
        for piece in pieces:
            (left_rings if assign(piece, spec) == 'left' else right_rings).append(piece)
    la, ra = sum(map(area_km2, left_rings)), sum(map(area_km2, right_rings))
    chk, tol = spec['check'], spec['check']['tolerance']
    for label, got, want in (('left', la, chk['left']), ('right', ra, chk['right'])):
        err = abs(got - want) / want
        status = 'ok' if err <= tol else 'OUT OF TOLERANCE'
        print(f"  {cid} {label:5} {spec[label]['name']:15} {got:8,.0f} km2  "
              f"(historical {want:,}; {err*100:4.1f}% off) {status}")
        assert err <= tol, f'{cid} {label} cut is {err*100:.0f}% off the historical area'
    out[cid] = {
     'left':  {**spec['left'],  'polygons': left_rings},
     'right': {**spec['right'], 'polygons': right_rings}}
    if unsplit: print(f"  {cid}: {unsplit} ring(s) assigned whole")

path = ROOT / 'src' / 'data' / 'split-polygons.json'
path.write_text(json.dumps(out, separators=(',', ':')))
print('wrote', path.relative_to(ROOT), f'{path.stat().st_size:,} bytes')
