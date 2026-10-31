# Daily Hex — calendar puzzle

A single-page calendar puzzle with 12 wooden tiles, a local timer, daily scoring, and optional group rankings. **Open `index.html` to play: no installation, Python server, build step, or internet connection is required for local play.** All player-facing HTML, CSS, JavaScript, and SVG geometry are embedded in that file. `Daily Hex.html`, when supplied separately, is a copy of the same app.

The default leaderboard is a browser-local mock. **Shared rankings require a separately hosted API.** GitHub Pages hosts the game; it does not host that API. The app supports the REST contract below. A LEADR adapter/backend is **not included** in this project, and no live leaderboard is currently configured.

## Deploy to GitHub Pages

Choose one method. Method A needs only the prebuilt HTML. Method B rebuilds the app when its source changes.

### A. Upload the prebuilt app

1. Create a repository, for example `daily-hex-calendar`, with a `main` branch. A public repository works with GitHub Free.
2. Upload **`index.html` and `.nojekyll`** to the repository root. If using `Daily Hex.html`, rename it to `index.html`. Do not upload the ZIP itself or put the files inside an extra folder.
3. Open **Settings → Pages → Build and deployment**. Set **Source** to **Deploy from a branch**, choose **main** and **/ (root)**, then **Save**.
4. Wait for deployment, then follow **Visit site**. A project URL normally looks like `https://YOUR-USERNAME.github.io/daily-hex-calendar/`.

To update, replace the root `index.html` and commit. This method does not rebuild from `app.js`, `style.css`, or `config.js`.

### B. Deploy the full source with the included workflow

1. Extract the ZIP and commit the **contents of the inner project folder** to the repository root on `main`, including `.github/workflows/pages.yml`. `package.json` must be at the root.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Under **Actions**, run **Deploy Daily Hex to GitHub Pages → Run workflow**, or push a commit to `main`.

The workflow uses Node 22, builds `index.html`, runs the tests, and publishes only `index.html` and `.nojekyll`. Development tools, including the test solver, are excluded from the published site artifact. If your branch is not `main`, update the workflow trigger. Check the workflow run for deployment failures.

Choose Method A for an HTML-only repository; choose Method B when keeping the full source. Publishing the entire source folder from a branch would also make development files available at site URLs.

These settings follow GitHub's [publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Connect a shared leaderboard

### 1. Have a compatible API available

You need an HTTPS service with:

- A read endpoint that returns today's top ten scores for one group.
- A submit endpoint that stores a completion and handles duplicate requests safely.
- CORS configured for your game's browser origin.
- The JSON contract described below.

These endpoints may be provided by your own backend or an adapter to LEADR. The example URLs in this README are placeholders. Uploading the game to Pages or entering a group code does not create the service or a LEADR board.

The current client sends no `Authorization` header and does not enable cross-origin cookies. An endpoint requiring those credentials needs client changes or an adapter that accepts this app's request contract. Keep private service/admin credentials on the backend, not in the HTML or repository.

### 2. Set the public configuration

For **Method A**, search `index.html` for `window.HEX_CONFIG` and edit that embedded configuration. For **Method B**, edit `config.js`; the workflow will embed it during the build.

```js
window.HEX_CONFIG = {
  leaderboard: {
    mode: 'rest',
    readUrl: 'https://YOUR-API-HOST/scores?group={group}&date={date}&limit=10&sort=asc',
    submitUrl: 'https://YOUR-API-HOST/scores',
    timeoutMs: 10000
  }
};
```

Replace `YOUR-API-HOST` and the paths with your service's real URLs. `{group}` and `{date}` are app placeholders: leave those tokens intact. The app URL-encodes their values. Both URLs support the placeholders; their paths may differ. `limit` and `sort` are example query parameters your backend must implement, not automatic LEADR options.

| Setting | Meaning |
| --- | --- |
| `mode` | `'mock'` keeps scores in this browser; `'rest'` uses the configured endpoints. |
| `readUrl` | GET URL for the selected group and **today's local date**. |
| `submitUrl` | POST URL for an eligible first completion. |
| `timeoutMs` | Request timeout; the supplied configuration uses 10 seconds. |

If editing source locally, run `npm run build` before uploading `index.html`. Editing `config.js` alone does not change an already-built HTML file. Rebuilding replaces direct edits to `index.html`, so keep the configuration in `config.js` when using Method B.

### 3. Implement the API contract

#### Submit: POST

The app sends milliseconds as a JSON number; **lower is better**:

```http
POST /scores
Content-Type: application/json
Idempotency-Key: device-uuid:2026-10-30
```

```json
{
  "player_name": "Alex",
  "score": 45812,
  "date": "2026-10-30",
  "metadata": {
    "group": "TEAM-MARKETING",
    "moves": 19
  },
  "submission_id": "device-uuid:2026-10-30"
}
```

`device-uuid` represents the app's randomly generated browser ID. `date` is the player's local calendar date at completion. Groups are uppercase, contain letters/numbers/hyphens/underscores, and have a maximum of 48 characters. Player names are trimmed and limited to 32 characters.

The backend should validate the fields, store the original result, and treat a repeated `submission_id` / `Idempotency-Key` as success without adding another row or replacing the score. Return **HTTP 204 with no body**, or another successful 2xx status with valid JSON. An empty HTTP 200 response is not supported because the client attempts to parse it as JSON.

The app does not send its internal `submitted` flag. The browser completion lock is not server-side identity; enforce any stronger player/date policy in the backend. Group codes select a leaderboard; they do not authenticate players.

#### Read: GET

For the configuration above, a request looks like:

```http
GET /scores?group=TEAM-MARKETING&date=2026-10-30&limit=10&sort=asc
```

Return **HTTP 200** with either a JSON array or this wrapper:

```json
{
  "scores": [
    {
      "player_name": "Alex",
      "score": 45812,
      "date": "2026-10-30",
      "metadata": {
        "group": "TEAM-MARKETING",
        "moves": 19
      },
      "submission_id": "device-uuid:2026-10-30"
    }
  ]
}
```

Filter by **group and date first**, sort by numeric score ascending, then return at most ten rows. Return `[]` or `{ "scores": [] }` for an empty leaderboard.

The browser also filters and sorts defensively. It discards rows with a mismatched date/group, a non-string player name, or a score that is not a finite, nonnegative JSON number. Preserve `submission_id` to highlight the current browser's entry. A provider response shaped as `{ "data": [...] }` must be converted by your adapter; the app does not accept that wrapper directly.

#### CORS

For a game at `https://YOUR-USERNAME.github.io/daily-hex-calendar/`, its origin is **`https://YOUR-USERNAME.github.io`**, without the repository path. Use your custom-domain origin instead if applicable.

Handle the browser's OPTIONS preflight with a successful response, for example HTTP 204, and these headers:

```http
Access-Control-Allow-Origin: https://YOUR-USERNAME.github.io
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Idempotency-Key
Vary: Origin
```

Also return `Access-Control-Allow-Origin` on actual GET/POST responses, including errors. If supporting multiple origins, validate the incoming origin and return one matching allowed origin. Do not put a comma-separated list in that header. For local HTTP testing, allow the exact local origin and port separately. Using the hosted game is preferable to enabling an opaque `null` file origin.

### 4. If the backend is LEADR

LEADR's client API has a different authentication and score contract. Its current documentation describes sessions with a game ID and SHA-256 client fingerprint, bearer tokens, and a single-use nonce for score submissions. Boards use UUIDs, and scores use `value`. See the [LEADR quick start](https://docs.leadr.gg/latest/quick-start/) and [client API reference](https://docs.leadr.gg/latest/api/client-api/); follow the version used by your service.

Recommended adapter setup:

1. Create your LEADR game and boards with ascending score order and millisecond units.
2. Store the service configuration and any private administrative credentials on the adapter host.
3. Maintain a `(group, date) → board UUID` mapping. Provision daily/group boards ahead of time or through a backend provisioning process.
4. Handle LEADR sessions, token refresh, and mutation nonces in the adapter.
5. Translate the requests/results using the table below and enforce idempotency before forwarding a submission.
6. Publish the adapter's HTTPS GET/POST URLs in `HEX_CONFIG`, then verify CORS and the normalized response.

| App field | LEADR mapping in the adapter |
| --- | --- |
| `score` | Numeric `value`, in milliseconds. |
| `player_name` | `player_name`. |
| Group + date | Resolve the appropriate `board_id`. |
| `metadata.moves` | Preserve in score metadata. |
| `date`, group, `submission_id` | Preserve in metadata and/or adapter storage; restore these fields in GET results. |

Dedicated group/day boards simplify isolation. If using a shared board instead, the adapter must guarantee filtering **before** taking the top ten, including pagination where necessary. Merely pointing `readUrl` and `submitUrl` at LEADR's raw score endpoint will not satisfy this app's contract. The adapter described here must be implemented and hosted separately.

### 5. Check the connection

1. Deploy the configured HTML. Reload it and open **My group**; enter your name and a shared code such as `TEAM-MARKETING`.
2. Open **Leaderboard**. Its caption should identify the group leaderboard rather than “Local mock.” An empty list is valid for a new group/day.
3. In the browser's Network panel, confirm the GET URL contains the expected group/date and returns the normalized JSON above.
4. Use the API smoke tests below with a **dedicated test group**, then check that the test result appears in that group. Repeating the same POST should produce only one row.
5. For an end-to-end game submission, use a dedicated test browser profile that has not completed today's puzzle. Complete it normally, then verify the POST and ranking. Do not reset real players' completion flags for routine testing.

Example smoke requests; replace the host, origin, and example date with your deployment's values. Use a unique submission ID for each new test result, but reuse it when testing duplicate handling:

```sh
curl -i -X OPTIONS 'https://YOUR-API-HOST/scores' \
  -H 'Origin: https://YOUR-USERNAME.github.io' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,idempotency-key'

curl -i -X POST 'https://YOUR-API-HOST/scores' \
  -H 'Origin: https://YOUR-USERNAME.github.io' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: smoke-test-2026-10-30-001' \
  --data '{"player_name":"API test","score":60000,"date":"2026-10-30","metadata":{"group":"API-TEST","moves":12},"submission_id":"smoke-test-2026-10-30-001"}'

curl -i 'https://YOUR-API-HOST/scores?group=API-TEST&date=2026-10-30&limit=10&sort=asc' \
  -H 'Origin: https://YOUR-USERNAME.github.io'
```

`curl` does not enforce browser CORS rules, so also verify the hosted browser request. Test rows are real writes to your API: use an isolated test group/backend.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Old UI or configuration after a deploy | Confirm the deployment succeeded, reload, and check the published HTML contains the new `HEX_CONFIG`. For source edits, rebuild or use Method B. |
| Pages 404 | Confirm `index.html` is at the publishing root, the branch/source setting matches your method, and deployment succeeded. Use the project URL, including the repository path. |
| Leaderboard still says “Local mock” | The deployed HTML still has `mode: 'mock'`; changing a separate `config.js` without rebuilding does not update it. |
| Empty list despite stored scores | Check uppercase group, the player's local date, number-valued scores, and response wrapper. The UI always requests today's leaderboard, even during past-date practice. |
| “Expected an array of scores” | Return an array or `{ "scores": [...] }`, not an unconverted provider response. |
| Request fails in the browser but works in curl | Inspect OPTIONS and CORS headers, HTTPS, and the exact allowed origin. |
| POST succeeds server-side but the app reports failure | Use HTTP 204 or valid JSON for another successful status; preserve idempotency so retries cannot duplicate the row. |
| No POST after a completion | Check that it is today's first eligible attempt, not a restart or already-recorded day, and that player/group details exist. Check the completion dialog for a saved pending result. |
| “Retry saved score” appears | Fix the endpoint/network issue, then use that button in Leaderboard. Only today's pending result is exposed by this retry UI. |
| Switched from mock to REST but no score was uploaded | Mock scores are not migrated. An already-completed day's browser lock remains in place; use a test profile for testing, or wait for a fresh daily attempt. |

No production API credentials or service were supplied, so a live LEADR connection has not been verified. REST payloads and errors are covered by automated tests with a simulated endpoint.

## Playing and daily scoring

- Fit all 12 pieces, covering 47 of the board's 50 cells. Leave only the selected weekday, month, and day visible.
- Drag with mouse, pen, or touch; alternatively select a tile and tap its anchor cell. Invalid placements return to the previous position.
- Rotate 60° using **R**, the rotate button, mouse wheel, right-click, or double-click/double-tap. Drag placed tiles to move them; return one using the tray, **Return tile**, or Delete/Backspace.
- Keyboard: Tab to a tile, Enter to select, arrows to navigate board cells, R to rotate, Enter to place, Escape to cancel selection.
- Dates stop at today. Past dates are practice; future dates are unavailable. **Random**, beside the date picker, loads a different playable date from the preceding ten years, excluding today. It skips the unavailable date combination and uses the normal confirmation before replacing an active puzzle.
- **Pause** stops the timer and fully conceals the board and tray. **Resume** restores play. Pausing persists across reloads; Escape cannot uncover the puzzle. Pause becomes available after the timer starts and is disabled after completion.
- There is no solution link or solver in the player HTML.

The date follows the player's local calendar. The timer begins on the first tile pickup/selection and freezes on the final valid placement. Scores use integer milliseconds; the display shows tenths. Time away counts unless paused. Reload restores today's compatible saved board and timer; a paused reload stays concealed.

Moves count successful placements, on-board rotations, and returns. Rotations of unplaced tiles and invalid drops do not count.

Only today's first eligible completion can be recorded. The browser sets `hasCompletedToday_<YYYY-MM-DD> = true` at completion, before network submission, and saves the immutable result separately. If player/group details are missing, the saved time can be submitted after entering them. Once a result has been submitted, changing the profile does not submit it to another group.

Restarts, repeat completions, past dates, and the unavailable date are unranked. At local midnight the previous day's challenge becomes practice; choose Today for the new daily puzzle. Failed submissions can be retried without creating another attempt; the current UI retries only today's saved result.

Names, groups, sessions, scores, and completion flags use browser storage. Storage unavailability degrades to practice play. File-origin storage behavior varies by browser; moving or renaming the HTML can change its storage area. The completion lock is local to that browser/device, not a shared identity or server-side anti-cheat system.

### Local mock mode

The supplied `HEX_CONFIG` uses `mode: 'mock'` with empty endpoint URLs. Enter a player/group in **My group** to use the local leaderboard. It filters by group/date, sorts ascending, shows ten entries, and highlights this browser's result. There are no seeded rankings. It does not share scores across devices, and mock results are not automatically migrated when switching to REST.

### Board and tile reference

The board uses explicit photographed labels and row offsets; the wooden frame has six straight sides. All twelve tile shapes have fixed handedness. Repeated shapes are intentional: E/I, F/L, and G/H match; J and K are opposite-handed hooks. Cell counts are `5, 3, 4, 5, 3, 4, 4, 4, 3, 4, 4, 4`.

**Tuesday, February 1 has no rotation-only solution with this set.** All other 2,561 valid weekday/month/day combinations are solvable. The game identifies the exception and excludes it from official eligibility; 2022-02-01 is a past-date example.

The development checks confirm this exception using exhaustive search; an independent set-based check also confirmed it. This supersedes an earlier all-dates-solvable result for an inaccurate substitute tile set. `tools/photo-trace.svg` and `tools/geometry-reference.json` contain the tracing evidence and are not runtime assets.

## Development and verification

The source files are provided for editing. Opening `index.html` does not load those separate files. To regenerate it after source changes, use Node 20+ from the project folder:

```sh
npm run build
npm test
npm run verify:dates
```

No package installation is needed. The shipped HTML is already built. The included workflow uses Node 22.

Fourteen automated checks cover game geometry/rotation, dates, placement and win rules, score eligibility, mock isolation/deduplication/ranking, REST behavior, fixed/chiral shapes, the unsolvable exception, closed tile boundaries, and self-contained packaging without a solution generator. Exhaustive date verification checks all 2,562 combinations and expects exactly the one documented impossibility.

Browser checks have covered fitted-tile rendering, a complete playthrough, pause/resume and paused reload, future-date rejection, random-date practice selection and active-game confirmation, and help text. First-press R rotation was also verified after date selection, on today’s puzzle, with uppercase R, and with keyboard-only tile selection; ordinary name-field typing remains unaffected. Direct `file://` UI launch could not be automated because the browser automation tool blocks that protocol; the embedded app was tested over local HTTP and checked for external runtime dependencies. Live API deployment remains unverified.

| File | Purpose |
| --- | --- |
| `index.html` | Complete standalone app; the only game file required for Pages. |
| `.nojekyll` | Included marker for static publishing. |
| `index.template.html`, `style.css`, `app.js` | Readable interface sources. |
| `engine.js`, `geometry.js` | Game rules, placement validation, and exact tile outlines. |
| `leaderboard.js`, `config.js` | Mock/REST transport and public endpoint configuration. |
| `tools/build.mjs` | Optional authoring-time bundler. |
| `tools/solver.js` | Development-only date verification; excluded from player HTML and the workflow's site artifact. |
| `tests/` | Automated checks and exhaustive date verification. |
| `.github/workflows/pages.yml` | Source-based GitHub Pages deployment. |
