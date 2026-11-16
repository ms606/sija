-- Sync storage for one learner's progress (see the Sija Sync Plan).

-- One row: the learner's progress as base64 text of gzip-compressed JSON. The
-- Worker stores and returns it without opening it; devices merge and check it
-- themselves. Text, not BLOB: D1 moves a BLOB through the Worker as an array of
-- numbers, one per byte, which costs CPU; one long string costs almost nothing.
CREATE TABLE sync (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  version    INTEGER NOT NULL,
  doc        TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Connected devices. Only the SHA-256 of each session cookie is stored.
CREATE TABLE sessions (
  token_hash   TEXT PRIMARY KEY,
  device_name  TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

-- Wrong passphrases, for rate limiting. Rows older than 15 minutes are deleted.
CREATE TABLE connect_failures (
  ip TEXT    NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX connect_failures_ip_at ON connect_failures (ip, at);
