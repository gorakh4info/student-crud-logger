const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "StudInfo.db"));

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
