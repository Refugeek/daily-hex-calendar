CREATE TABLE IF NOT EXISTS scores (
  submission_id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 0),
  puzzle_date TEXT NOT NULL,
  group_code TEXT NOT NULL,
  moves INTEGER NOT NULL CHECK(moves >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS scores_ranking
  ON scores(group_code, puzzle_date, score, created_at, submission_id);
