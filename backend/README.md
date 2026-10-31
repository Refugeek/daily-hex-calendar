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
