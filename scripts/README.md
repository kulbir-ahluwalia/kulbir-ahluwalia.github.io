# Site checks

Tooling that keeps kulbir-singh-ahluwalia.com honest and unbroken. Nothing here is published
(`scripts/` is listed under `exclude:` in `_config.yml`).

| Script | What it checks | Exit status |
|---|---|---|
| `check_claims.py` | R1: a paper marked in preparation / under review / submitted is described as accepted, published, to appear, in proceedings or presented at (its own entry, news, announcement, promo card, bio, other `_data` files, `index.html`, `cv.html`). R2: "PhD candidate" in any published file while `CANDIDACY_CONFIRMED = False`. R3 (warning): award-type words to confirm. R4 (warning): news that says accepted/presented without a link. R5: news or the enabled announcement bar states a plan, work in progress, a submission under review, or internal detail (machine, day, TA runs, points). R6: placeholder text (to be finalized, TBD, TODO) in a publication. Y1: YAML that does not parse. | 0 clean, 1 errors, 3 PyYAML missing |
| `check_site.py` | On a built site: internal links and assets exist (GitHub Pages rules), `#anchors` exist, no unrendered Liquid, no repo tooling published; `--src .` also parses `_config.yml` and `_data/*.yml`; `--external` probes outside URLs. | 0 clean, 1 errors |
| `screenshot.py` | Serves the built site locally and saves full-page desktop (1440x900) and mobile (390x844) PNGs of `/` and `/cv.html`, plus the News and Publications sections; prints console errors and local 404s. | 0, or 3 if Playwright is missing |

```bash
pip install pyyaml                       # the only Python dependency of the two checkers
python3 scripts/check_claims.py          # --strict to fail on warnings, --only FILE for one file
bundle exec jekyll build
python3 scripts/check_site.py _site --src .
python3 scripts/screenshot.py _site /tmp/shots
```

Silence one deliberate finding by putting `claims-ok` on that line (a YAML or HTML comment).
Once the preliminary exam is passed, set `CANDIDACY_CONFIRMED = True` at the top of `check_claims.py`.

## Hooks

- Git: `git config core.hooksPath .githooks` (once per clone). The pre-commit hook runs the YAML parse
  and the claims check in about a second; `git commit --no-verify` skips it once.
- Claude Code: `.claude/settings.json` runs `.claude/hooks/check_claims.sh` after every Edit/Write of a
  content file and reports violations back to Claude (exit 2). It does nothing if python3 or PyYAML is missing.
- CI: `.github/workflows/content_checks.yml` builds the site and runs both checkers on every push and PR.
  Deployment is separate: GitHub Pages builds and publishes `main` itself.
