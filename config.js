// Public browser configuration only. Never place private/admin API keys here.
window.HEX_CONFIG = {
  leaderboard: {
    mode: 'rest', // 'mock' for browser-local scores, 'rest' for shared rankings
    // Cloudflare Worker + D1. Placeholders are URL-encoded.
    readUrl: 'https://daily-hex-leaderboard.michaeldelaet.workers.dev/scores?group={group}&date={date}',
    submitUrl: 'https://daily-hex-leaderboard.michaeldelaet.workers.dev/scores',
    timeoutMs: 10000
  }
};
