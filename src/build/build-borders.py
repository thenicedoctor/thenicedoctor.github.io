"""Compute the land-border graph from the map polygons.

Neighbouring countries in this data share exact vertices, so two polygons that share two or more
points have a common land border. The shared points, ordered along the border, are what the game
draws a front line on.

Output: src/data/borders.json — {"AAA:BBB": [[lon,lat], ...]} with ids sorted, so a lookup is
just pair(a,b). Sea borders and maritime neighbours are not included: this is a land-war model.
"""
from pathlib import Path
import json, math
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[2]
GEO = json.loads((ROOT / 'src' / 'data' / 'map-data.json').read_text())

# Every vertex, and which countries touch it.
owners = defaultdict(set)
for g in GEO:
    for ring in g['polygons']:
        for lon, lat in ring:
            owners[(round(lon, 6), round(lat, 6))].add(g['id'])

shared = defaultdict(list)
for point, ids in owners.items():
    if len(ids) < 2: continue
    ordered = sorted(ids)
    for i in range(len(ordered)):
        for j in range(i + 1, len(ordered)):
            shared[ordered[i] + ':' + ordered[j]].append(list(point))

# Two shared vertices make a border segment; a single touching point does not.
borders = {}
for key, points in shared.items():
    if len(points) < 2: continue
    # Order the points along the border so a line drawn through them does not zig-zag:
    # walk a nearest-neighbour chain from the westernmost point.
    remaining = points[:]
    chain = [remaining.pop(min(range(len(remaining)), key=lambda i: remaining[i][0]))]
    while remaining:
        last = chain[-1]
        k = min(range(len(remaining)),
                key=lambda i: math.hypot(remaining[i][0]-last[0], remaining[i][1]-last[1]))
        chain.append(remaining.pop(k))
    borders[key] = [[round(p[0], 3), round(p[1], 3)] for p in chain]

path = ROOT / 'src' / 'data' / 'borders.json'
path.write_text(json.dumps(borders, separators=(',', ':')))

deg = defaultdict(int)
for key in borders:
    a, b = key.split(':')
    deg[a] += 1; deg[b] += 1
print(f'{len(borders)} land borders between {len(deg)} countries, '
      f'{path.stat().st_size:,} bytes')
print('  most neighbours:', ', '.join(f'{k} {v}' for k, v in sorted(deg.items(), key=lambda x: -x[1])[:6]))
for probe in ('DEU:FRA', 'DEU:POL', 'MEX:USA', 'ARG:BRA', 'IND:PAK', 'CHN:RUS'):
    print(f'  {probe}: {len(borders.get(probe, []))} border points')
