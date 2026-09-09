# Continuous integration

Two workflows are provided here but **not yet installed**, because the credential used to push
this repository did not carry the `workflow` OAuth scope. Enabling them takes one command and one
commit.

| File | What it does |
|---|---|
| [`ci.yml`](ci.yml) | Runs all six engine suites on Node 20, then rebuilds the whole chain from `src/base/` and fails if the result does not match `dist/sovereign-v7.html` byte for byte |
| [`pages.yml`](pages.yml) | Deploys the site through the Pages Actions pipeline instead of branch publishing |

## Enabling `ci.yml`

```bash
gh auth refresh -s workflow          # opens a browser, one time
mkdir -p .github/workflows
git mv docs/ci/ci.yml .github/workflows/ci.yml
git commit -m "Enable CI" && git push
```

The badge for the README, once it is running:

```markdown
[![tests](https://github.com/thenicedoctor/thenicedoctor.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/thenicedoctor/thenicedoctor.github.io/actions/workflows/ci.yml)
```

## About `pages.yml`

This repository is a **user Pages site**, so GitHub serves it from the repository root on `main`.
That works today with no workflow at all, which is why the site is live.

`pages.yml` is only worth installing if you would rather keep the published files in a subdirectory
(say `web/`) and have Actions publish that directory. If you install it, also switch
**Settings → Pages → Source** from *Deploy from a branch* to *GitHub Actions*, and move the site
files into whichever directory the workflow's `path:` points at.

Until then, leave it here.

## Reproducibility check, by hand

`ci.yml`'s second job is the important one, and it runs locally too:

```bash
rm -rf build
python3 src/build/build-v4.py
python3 src/build/build-v5.py
python3 src/build/build-v6.py
python3 src/build/build-v7.py
cmp build/v7.html dist/sovereign-v7.html && echo "reproduced exactly"
```

If that fails, `dist/` is stale: someone edited a shipped file by hand, or changed an addon without
rebuilding.
