const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "StudInfo.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS Logs (
    Id      INTEGER PRIMARY KEY AUTOINCREMENT,
    Origin  TEXT,
    File    TEXT,
    Repo    TEXT,
    Level   TEXT    NOT NULL,
    Message TEXT    NOT NULL,
    Data    TEXT,
    Source  TEXT,
    Time    TEXT    NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS StudentFees (
    Id    INTEGER PRIMARY KEY AUTOINCREMENT,
    Name  TEXT    NOT NULL,
    Age   INTEGER NOT NULL,
    Email TEXT    NOT NULL,
    Fees  REAL
  )
`);

module.exports = db;
