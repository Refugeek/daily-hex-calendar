const GROUP = /^[A-Z0-9_-]{1,48}$/;
const ID = /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-f0-9]{32}):\d{4}-\d{2}-\d{2}$/i;
function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date;
}
async function readBody(request) {
  if (!request.body) throw new Error('Empty request');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new Error('Request too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = new Headers({'Vary': 'Origin', 'Cache-Control': 'no-store'});
    if (origin === env.ALLOWED_ORIGIN) headers.set('Access-Control-Allow-Origin', origin);
    const respond = (status, body) => {
      if (body === undefined) return new Response(null, {status, headers});
      const jsonHeaders = new Headers(headers);
      jsonHeaders.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(body), {status, headers: jsonHeaders});
    };
    if (origin && origin !== env.ALLOWED_ORIGIN) return respond(403, {error: 'Origin not allowed'});
    const url = new URL(request.url);
    if (url.pathname !== '/scores') return respond(404, {error: 'Not found'});
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
      headers.set('Access-Control-Max-Age', '86400');
      return respond(204);
    }
    if (!['GET', 'POST'].includes(request.method)) {
      headers.set('Allow', 'GET, POST, OPTIONS');
      return respond(405, {error: 'Method not allowed'});
    }
    try {
      if (request.method === 'GET') {
        const group = url.searchParams.get('group'), date = url.searchParams.get('date');
        if (!GROUP.test(group || '') || !validDate(date)) return respond(400, {error: 'Invalid group or date'});
        const {results} = await env.DB.prepare(
          'SELECT submission_id, player_name, score, puzzle_date, group_code, moves FROM scores WHERE group_code = ? AND puzzle_date = ? ORDER BY score ASC, created_at ASC, submission_id ASC LIMIT 10'
        ).bind(group, date).all();
        return respond(200, {scores: results.map(row => ({
          submission_id: row.submission_id, player_name: row.player_name, score: row.score,
          date: row.puzzle_date, metadata: {group: row.group_code, moves: row.moves}
        }))});
      }
      if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return respond(415, {error: 'Use application/json'});
      }
      let record;
      try { record = await readBody(request); }
      catch { return respond(400, {error: 'Invalid JSON or request exceeds 4096 bytes'}); }
      const {submission_id: id, player_name: player, score, date, metadata} = record || {};
      if (typeof id !== 'string' || !ID.test(id) || !validDate(date) || !id.endsWith(`:${date}`) ||
          request.headers.get('Idempotency-Key') !== id || typeof player !== 'string' ||
          player !== player.trim() || player.length < 1 || player.length > 32 || /[\u0000-\u001f\u007f]/.test(player) ||
          !Number.isSafeInteger(score) || score < 0 || typeof metadata?.group !== 'string' || !GROUP.test(metadata.group) ||
          !Number.isSafeInteger(metadata?.moves) || metadata.moves < 0) {
        return respond(400, {error: 'Invalid score fields or idempotency key'});
      }
      // A player's local date can differ from UTC by one day. Reject stale and future dates.
      const utcDay = Math.floor(Date.now() / 86400000);
      const puzzleDay = Date.parse(`${date}T00:00:00Z`) / 86400000;
      if (Math.abs(utcDay - puzzleDay) > 1) return respond(400, {error: 'Only current daily scores are accepted'});
      await env.DB.prepare(
        'INSERT INTO scores (submission_id, player_name, score, puzzle_date, group_code, moves) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING'
      ).bind(id, player, score, date, metadata.group, metadata.moves).run();
      return respond(204);
    } catch (error) {
      console.error('Leaderboard database request failed', error);
      return respond(503, {error: 'Leaderboard temporarily unavailable. Please retry.'});
    }
  }
};
