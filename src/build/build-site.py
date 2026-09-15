"""Assemble the public website from the shipped game build.

Same convention as the game build scripts: exact-string replacements, every anchor asserted,
nothing hand-edited. Re-run to reproduce site/ byte for byte.
"""
from pathlib import Path
import re, datetime, hashlib, json, urllib.request
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT          # a user Pages site is served from the repository root
ORIGIN = 'https://thenicedoctor.github.io'
TODAY = datetime.date.today().isoformat()

(SITE / 'play').mkdir(parents=True, exist_ok=True)

# Images are rendered from the game's own map polygons; keep them in step with the site.
import subprocess

# Paths are relative to the repository root so the chain runs the same locally and in CI.
ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'; BUILD.mkdir(exist_ok=True)
SRC = ROOT / 'src'

for script in ('make-og.py', 'make-hero.py'):
    subprocess.run(['python3', str(Path(__file__).resolve().parent / script)], check=True)
game = (ROOT / 'dist' / 'sovereign-v15.html').read_text()

def rep(a, b, count=1):
    global game
    assert game.count(a) == count, (game.count(a), a[:100])
    game = game.replace(a, b)

# --- head metadata for the play page -------------------------------------------------
head = f'''<link rel="canonical" href="{ORIGIN}/play/">
<meta name="description" content="Play Sovereign in your browser: lead any of 204 countries through fiscal policy, central banking, city management, trade and diplomacy. Free, no sign-up, runs offline.">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#101619">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sovereign">
<meta property="og:title" content="Play Sovereign — Political Sandbox">
<meta property="og:description" content="Lead any of 204 countries through economic policy, central banking, city management and diplomacy. Free, in your browser.">
<meta property="og:url" content="{ORIGIN}/play/">
<meta property="og:image" content="{ORIGIN}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{ORIGIN}/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-180.png">
</head>'''
rep('</head>', head)

# --- the brand mark links home, so /play/ is not a dead end for crawlers or readers ---
rep('<header><div class="brand"><div class="logo"><span>♜</span></div><div><strong>SOVEREIGN</strong><div class="eyebrow">Political sandbox · V15</div></div></div>',
    '<header><a class="brand homelink" href="/" title="Sovereign home"><div class="logo"><span>♜</span></div>'
    '<div><strong>SOVEREIGN</strong><div class="eyebrow">Political sandbox · V15</div></div></a>')
rep('</style>', '.homelink{text-decoration:none;color:inherit}.homelink:hover strong{color:var(--accent)}\n</style>')

(SITE / 'play' / 'index.html').write_text(game)

# --- crawl files ----------------------------------------------------------------------
# dist/ and src/ hold every earlier build of the game. Pages serves them, but they are
# near-copies of /play/ with no canonical link, so keep crawlers on the real page.
(SITE / 'robots.txt').write_text(f'''User-agent: *
Disallow: /dist/
Disallow: /src/

Sitemap: {ORIGIN}/sitemap.xml
''')

# --- sitemap --------------------------------------------------------------------------
# Crawlers only read robots.txt and the sitemap at the domain root, so this file has to
# speak for every page on the domain, including project sites published from other
# repositories under the same account, whose own sitemaps nothing points to.
#
# Only <loc>, <lastmod> and images are emitted. Google and Bing both ignore <changefreq>
# and <priority>; lastmod is used, but only while it stays accurate.

def local_lastmod(rel):
    """The day this page last changed: today if this build changed it, else its last commit."""
    committed = subprocess.run(['git', 'show', f'HEAD:{rel}'], cwd=ROOT, capture_output=True).stdout
    if committed and committed == (SITE / rel).read_bytes():
        return subprocess.run(['git', 'log', '-1', '--format=%cs', '--', rel], cwd=ROOT,
                              capture_output=True, text=True).stdout.strip() or TODAY
    return TODAY

def project_lastmod(repo, path='index.html'):
    """Last commit to a page in another public repository; None if GitHub is unreachable."""
    url = f'https://api.github.com/repos/thenicedoctor/{repo}/commits?path={path}&per_page=1'
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'site-build'}),
                                    timeout=10) as r:
            return json.load(r)[0]['commit']['committer']['date'][:10]
    except (OSError, ValueError, KeyError, IndexError) as e:
        print(f'  note: no lastmod for /{repo}/ ({e.__class__.__name__}); listed without one')
        return None

# (path, lastmod, images on the page)
sitemap_pages = [
    ('/',                  local_lastmod('index.html'),         ['/hero.png']),
    ('/play/',             local_lastmod('play/index.html'),    []),
    ('/communist-values/', project_lastmod('communist-values'), []),
]

def sitemap_entry(path, lastmod, images):
    parts = [f'<loc>{escape(ORIGIN + path)}</loc>']
    if lastmod:
        parts.append(f'<lastmod>{lastmod}</lastmod>')
    parts += [f'<image:image><image:loc>{escape(ORIGIN + i)}</image:loc></image:image>' for i in images]
    return '  <url>' + ''.join(parts) + '</url>\n'

(SITE / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    + ''.join(sitemap_entry(*page) for page in sitemap_pages)
    + '</urlset>\n')

# IndexNow: a hosted key lets Bing, Yandex and others accept URL submissions without an account.
key = hashlib.sha256(b'sovereign-thenicedoctor-2026-09-09').hexdigest()[:32]
(SITE / f'{key}.txt').write_text(key)
(SITE / 'indexnow-key.txt').write_text(key)

(SITE / 'favicon.svg').write_text(
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
 '<rect width="24" height="24" rx="4" fill="#101619"/>'
 '<g fill="none" stroke="#e8bd71" stroke-width="1.7" stroke-linejoin="round">'
 '<path d="M12 3.6 19 7.6v8l-7 4-7-4v-8z"/><path d="M12 8.4v7.2M9 11.4h6"/></g></svg>')

(SITE / '404.html').write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — Sovereign</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px;
background:#101619;color:#e9eeeb;font:16px/1.6 Inter,ui-sans-serif,-apple-system,"Segoe UI",sans-serif}}
h1{{font-size:30px;margin:0 0 10px;font-weight:560}}p{{color:#97a5a5;margin:0 0 24px}}
a{{display:inline-block;padding:12px 26px;border-radius:9px;background:#e8bd71;color:#1a1408;
text-decoration:none;font-weight:560}}</style></head>
<body><main><h1>That page does not exist</h1>
<p>The world map, however, still does.</p>
<a href="/">Go to Sovereign</a></main></body></html>''')

# GitHub Pages runs Jekyll unless told not to; this keeps the files exactly as built.
(SITE / '.nojekyll').write_text('')

# The repository README is hand-maintained; the site build must not overwrite it.


SITE_FILES = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'og.png', 'hero.png',
              'favicon.svg', 'icon-180.png', 'icon-512.png', '.nojekyll',
              'indexnow-key.txt', f'{key}.txt', 'play/index.html']
print('Site built at the repository root:')
for name in SITE_FILES:
    f = SITE / name
    print(f'  {name:24} {f.stat().st_size:>9,} bytes' if f.exists() else f'  {name:24}   MISSING')
print('indexnow key:', key)
