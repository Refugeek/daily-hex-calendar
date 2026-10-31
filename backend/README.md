# Daily Hex leaderboard

A Cloudflare Worker with a D1 database implements the game's `/scores` API.
Scores are stored once per browser submission ID and ranked by group, date, and
elapsed milliseconds (ascending). Group codes are public leaderboard identifiers,
not passwords. Anyone who knows a group code can read its rankings.

## Deploy

Use Node 22 or newer and run these commands in this directory:

```sh
npm ci
npx wrangler login
npx wrangler d1 create daily-hex-leaderboard
```

Set the returned database ID in `wrangler.jsonc`, then run:

```sh
npx wrangler d1 execute daily-hex-leaderboard --remote --file schema.sql
npx wrangler deploy
```

Keep `ALLOWED_ORIGIN` set to the game's origin (`https://refugeek.github.io`).
Set the root `config.js` to REST mode with the deployed Worker URL, rebuild with
`npm run build` in the project root, and push to GitHub to deploy the game.
Worker changes are deployed separately with `npx wrangler deploy` here.

## Tests

Run `npm test` in the project root. Backend integration tests use an in-memory
SQLite database and the real browser API client. No Cloudflare account is needed
for these tests.

## Data and limits

The database stores player names, group codes, elapsed times, move counts,
puzzle dates, browser-generated submission IDs, and creation timestamps. No
email addresses or login credentials are collected by the game. Scores remain
stored until the owner deletes them. Treat player names and group codes as
public; use nicknames rather than personal information.

The API accepts current local dates (within one day of UTC), validates request
fields, limits JSON bodies to 4 KiB, and never overwrites an existing result.
The browser reports its own times. This is a casual leaderboard, not verified
competition timing; CORS does not authenticate players or stop non-browser
clients. Database access uses a Worker binding, so no private keys are shipped
to players.

Use Cloudflare's free Workers plan for this deployment. Monitor usage in the
Cloudflare dashboard before expanding traffic. No paid services are required
by this code.

## Capacity estimate: 100 daily players

Checked 2026-10-31. Assume each player makes 20 API requests per day including
date availability checks, rankings, a score submission and its CORS preflight:
about 2,000 Worker requests/day, or 2% of the Free plan's 100,000/day allowance.
This is a traffic assumption, not measured production usage. Even 100 requests
per player/day would be 10% of that allowance. The game HTML and images are
hosted on GitHub Pages and do not consume Worker requests. The stopwatch and
session autosave are browser-local and do not query Cloudflare.

Rankings use the `(group_code, puzzle_date, score, created_at, submission_id)`
index and return at most ten rows. A planning allowance of 50,000 rows read/day
is 1% of D1's five million/day allowance. One hundred scores/day should require
roughly 300 row writes including the primary-key and ranking indexes, compared
with 100,000/day allowed. Actual row counts are visible in D1 metrics.

A local SQLite sizing run with the actual schema, 36,500 scores and maximum
player/group string lengths occupied about 14.7 MB (one year at 100 scores/day,
including indexes). Cloudflare page allocation may differ; D1 Free permits
500 MB per database and 5 GB across the account. Storage is not an immediate
constraint at this traffic level. Worker Free also has a 10 ms CPU limit per
request; this small endpoint performs one database query and no puzzle solving,
and database wait time is not CPU time. Check Worker CPU/error metrics if the
endpoint grows in complexity.

Normal human use is comfortably within the free quotas. They are shared with
other resources on the account. The public endpoint currently has no abuse
rate limiter: automated traffic or aggressive repeated refreshes could exhaust
the quota despite only 100 legitimate players. CORS is not abuse protection.
Exceeding Free daily request/read/write quotas causes service errors until the
quota resets; the game itself remains playable and failed scores stay on the
browser for retry. Review Workers requests/errors and D1 row metrics after launch.

Sources: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
