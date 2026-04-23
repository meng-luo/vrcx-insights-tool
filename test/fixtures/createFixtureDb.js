import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

export function runSql(dbPath, sql) {
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(sql);
  } finally {
    db.close();
  }
}

export function createFixtureDb(dbPath) {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  runSql(
    dbPath,
    `
    CREATE TABLE configs (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE gamelog_location (
      id INTEGER PRIMARY KEY,
      created_at TEXT,
      location TEXT,
      world_id TEXT,
      world_name TEXT,
      time INTEGER,
      group_name TEXT
    );
    CREATE TABLE gamelog_join_leave (
      id INTEGER PRIMARY KEY,
      created_at TEXT,
      type TEXT,
      display_name TEXT,
      location TEXT,
      user_id TEXT,
      time INTEGER
    );
    CREATE TABLE usrself_friend_log_current (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      trust_level TEXT,
      friend_number INTEGER
    );
    CREATE TABLE usrself_feed_gps (
      id INTEGER PRIMARY KEY,
      created_at TEXT,
      user_id TEXT,
      display_name TEXT,
      location TEXT,
      world_name TEXT,
      previous_location TEXT,
      time INTEGER,
      group_name TEXT
    );
    CREATE TABLE usrself_feed_online_offline (
      id INTEGER PRIMARY KEY,
      created_at TEXT,
      user_id TEXT,
      display_name TEXT,
      type TEXT,
      location TEXT,
      world_name TEXT,
      time INTEGER,
      group_name TEXT
    );
    CREATE TABLE usrself_mutual_graph_friends (
      friend_id TEXT PRIMARY KEY
    );
    CREATE TABLE usrself_mutual_graph_links (
      friend_id TEXT,
      mutual_id TEXT,
      PRIMARY KEY (friend_id, mutual_id)
    );
    CREATE TABLE usrself_mutual_graph_meta (
      friend_id TEXT PRIMARY KEY,
      last_fetched_at TEXT,
      opted_out INTEGER DEFAULT 0
    );

    INSERT INTO configs (key, value) VALUES ('config:lastuserloggedin', 'usr_self');

    INSERT INTO usrself_friend_log_current (user_id, display_name, trust_level, friend_number) VALUES
      ('usr_friend_a', 'Friend A', 'Trusted User', 1),
      ('usr_friend_b', 'Friend B', 'Trusted User', 2),
      ('usr_friend_c', 'Friend C', 'Known User', 3),
      ('usr_friend_d', 'Friend D', 'User', 4);

    INSERT INTO gamelog_location (created_at, location, world_id, world_name, time, group_name) VALUES
      ('2026-04-10T10:00:00.000Z', 'wrld_1:100~hidden(usr_host)~region(jp)', 'wrld_1', 'World One', 3600000, '');

    INSERT INTO gamelog_join_leave (created_at, type, display_name, location, user_id, time) VALUES
      ('2026-04-10T11:00:00.000Z', 'OnPlayerLeft', 'Self', 'wrld_1:100~hidden(usr_host)~region(jp)', 'usr_self', 3600000),
      ('2026-04-10T11:00:00.000Z', 'OnPlayerLeft', 'Friend A', 'wrld_1:100~hidden(usr_host)~region(jp)', 'usr_friend_a', 2400000),
      ('2026-04-10T11:00:00.000Z', 'OnPlayerLeft', 'Friend B', 'wrld_1:100~hidden(usr_host)~region(jp)', 'usr_friend_b', 1800000),
      ('2026-04-10T11:00:00.000Z', 'OnPlayerLeft', 'Stranger', 'wrld_1:100~hidden(usr_host)~region(jp)', 'usr_stranger', 1200000);

    INSERT INTO usrself_mutual_graph_friends (friend_id) VALUES
      ('usr_friend_a'),
      ('usr_friend_b');

    INSERT INTO usrself_mutual_graph_links (friend_id, mutual_id) VALUES
      ('usr_friend_a', 'usr_friend_b'),
      ('usr_friend_a', 'usr_friend_c'),
      ('usr_friend_a', 'usr_non_friend'),
      ('usr_friend_b', 'usr_friend_a'),
      ('usr_friend_b', 'usr_friend_c'),
      ('usr_friend_b', 'usr_friend_d');

    INSERT INTO usrself_mutual_graph_meta (friend_id, last_fetched_at, opted_out) VALUES
      ('usr_friend_a', '2026-04-10T12:00:00.000Z', 0),
      ('usr_friend_b', '2026-04-10T12:05:00.000Z', 0);
    `
  );
}
