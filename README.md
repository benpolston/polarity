# Polarity

A two-axis political test (economic left–right, social libertarian–authoritarian) with
100 balanced policy statements and a detailed results page. Static site: plain HTML/CSS/JS,
no build step, no server, no dependencies.

## Run locally

Any static file server works, for example:

```
python -m http.server 8000
```

then open http://localhost:8000. (Opening `index.html` directly as a file mostly works too,
but clipboard copy needs `http://localhost` or HTTPS.)

## Checks (run before every deploy)

- `node test.js`: statement balance (full and quick test), unbiased scoring (agree-all = 0, corners = ±10,
  "Don't know" excluded), share-link round trips, and figure data (names, positions, types, stances).
  Exits with an error if anything fails.
- Open `tests.html` through the local server: checks that every default figure's label sits right
  beside its dot at desktop, tablet and phone widths across 81 result positions.

## Deploy

1. `node bump-version.js --site=https://your-domain.com` stamps a fresh `?v=` on every asset link in
   `index.html` (so returning visitors get the new files, not stale cached copies) and points the
   link-preview tags at your domain. Link previews in iMessage, Discord, X, Facebook and Slack need
   that absolute address; after the first run the domain is remembered, so plain
   `node bump-version.js` is enough for later deploys.
2. Commit, then upload the folder to any static host:
   - **GitHub Pages:** push to GitHub → Settings → Pages → deploy from the `main` branch, root folder.
   - **Netlify / Cloudflare Pages:** drag the folder onto the dashboard, or connect the repo
     (no build command, publish directory = repo root).

## Files

| File | What it holds |
|---|---|
| `questions.js` | Statements, topics, sections, scoring direction, consistency pairs, balance audit |
| `figures.js` | Political figures: estimated positions, types, manual stances, chart defaults |
| `core.js` | Scoring and share-link encoding (pure functions, shared with `test.js`) |
| `app.js` | Quiz, results, comparison, figures UI, chart drawing |
| `test.js`, `tests.html` | Automated checks (see above) |
| `style.css` | All styling, including the small-screen layout |
| `logo.svg` | Logo and favicon (deliberately has no position dot, so it implies no lean) |
| `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest` | Home-screen icons (the logo on an opaque background) for iPhone and Android |
| `og-image.png` | 1200×630 link-preview image (no figures or dot, so it implies no lean) |
| `bump-version.js` | Cache-busting helper for deploys |

## Editing rules that keep scoring unbiased

- Every topic must keep the same number of statements in each direction (currently 4 vs 4,
  except Labor & wages and Religion & morality at 3 vs 3, for 100 in total). `node test.js`
  checks this, and the home page flags it if the balance audit ever fails.
- Adding or removing statements also discards any test progress saved in visitors' browsers
  (it's tied to the same fingerprint), since statement ids can shift.
- Changing a statement's wording is safe. Adding or removing statements, or changing a
  direction, changes the question-set fingerprint, so share links made before the change
  stop working (they show a clear "different version" message instead of misreading answers).
- "Don't know" answers are excluded from scoring; "Neutral" scores 0.

## Privacy

Answers live only in the visitor's browser (localStorage). Share links put the answers after
the `#` in the URL, which browsers never send to the server.
