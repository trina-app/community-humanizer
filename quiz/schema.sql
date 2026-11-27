-- One row per answer. No IP, no user agent: a random session id from a cookie, the pair, and whether it was right.
CREATE TABLE IF NOT EXISTS answers (
  session TEXT NOT NULL,
  qid TEXT NOT NULL,
  lang TEXT NOT NULL,
  kind TEXT NOT NULL,
  correct INTEGER NOT NULL,
  ms INTEGER NOT NULL,
  created INTEGER NOT NULL,
  UNIQUE (session, qid)
);
CREATE INDEX IF NOT EXISTS answers_qid ON answers (qid);
