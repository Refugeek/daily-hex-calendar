import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../backend/worker.js';
import {createLeaderboard} from '../leaderboard.js';

const origin = 'https://refugeek.github.io';
const date = new Date().toISOString().slice(0, 10);
function setup(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../backend/schema.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const env = {ALLOWED_ORIGIN: origin, DB: {prepare(sql) {
    return {bind(...args) {return {
      async all() {return {results: db.prepare(sql).all(...args)};},
      async run() {return db.prepare(sql).run(...args);}
    };}};
  }}};
  const fetcher = (url, options = {}) => worker.fetch(new Request(url, {
    ...options, headers: {Origin: origin, ...options.headers}
  }), env);
  const api = createLeaderboard({mode: 'rest', readUrl: 'https://api.test/scores?group={group}&date={date}', submitUrl: 'https://api.test/scores'}, null, fetcher);
  return {api, fetcher, env};
}
const record = (n, score = n, group = 'TEST') => ({
  submission_id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}:${date}`,
  player_name: `Player ${n}`, score, date, metadata: {group, moves: 12}
});
test('backend and client store immutable scores, isolate groups/dates and rank the top ten', async t => {
  const {api, fetcher} = setup(t);
  for (let i = 1; i <= 12; i++) await api.submit(record(i));
  await api.submit(record(1, 999));
  await api.submit(record(13, 0, 'OTHER'));
  const rows = await api.list('TEST', date);
  assert.equal(rows.length, 10);
  assert.deepEqual(rows.map(row => row.score), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(rows[0], record(1));
  assert.equal((await api.list('OTHER', date)).length, 1);
  assert.equal((await api.list('EMPTY', date)).length, 0);
  const response = await fetcher('https://api.test/scores?group=TEST&date=2000-01-01');
  assert.deepEqual(await response.json(), {scores: []});
});
test('backend handles CORS and rejects malformed requests before storing scores', async t => {
  const {fetcher, env} = setup(t);
  const preflight = await fetcher('https://api.test/scores', {method: 'OPTIONS'});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Idempotency-Key/);
  const forbidden = await worker.fetch(new Request('https://api.test/scores', {headers: {Origin: 'https://other.test'}}), env);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('Access-Control-Allow-Origin'), null);
  const post = (body, key = body.submission_id) => fetcher('https://api.test/scores', {
    method: 'POST', headers: {'Content-Type': 'application/json', 'Idempotency-Key': key}, body: JSON.stringify(body)
  });
  for (const body of [
    {...record(1), score: -1}, {...record(1), score: 1.5},
    {...record(1), player_name: ' '}, {...record(1), metadata: {group: ['TEST'], moves: 1}},
    {...record(1), metadata: {group: "'; DROP TABLE scores;--", moves: 1}},
    {...record(1), date: '2000-01-01', submission_id: '00000000-0000-4000-8000-000000000001:2000-01-01'}
  ]) assert.equal((await post(body)).status, 400);
  assert.equal((await post(record(1), 'mismatch')).status, 400);
  assert.equal((await post({...record(1), extra: 'x'.repeat(4096)})).status, 400);
  assert.equal((await fetcher('https://api.test/scores?group=TEST&date=2026-02-30')).status, 400);
  assert.equal((await fetcher('https://api.test/scores', {method: 'DELETE'})).status, 405);
  assert.equal((await fetcher('https://api.test/other')).status, 404);
});
