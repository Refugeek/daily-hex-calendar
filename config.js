// Public browser configuration only. Never place private/admin API keys here.
window.HEX_CONFIG = {
  leaderboard: {
    mode: 'mock', // 'mock' or 'rest'
    // Use an HTTPS adapter to LEADR (see README). Placeholders are URL-encoded.
    readUrl: '', // e.g. https://your-api.example/scores?group={group}&date={date}&limit=10&sort=asc
    submitUrl: '', // e.g. https://your-api.example/scores
    timeoutMs: 10000
  }
};
