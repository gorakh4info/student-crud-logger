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

// Migration: if Fees was created with NOT NULL, recreate the table without it.
// SQLite does not support ALTER COLUMN, so we rename → recreate → copy → drop.
const feesCol = db.prepare("PRAGMA table_info(StudentFees)").all().find((c) => c.name === "Fees");
if (feesCol && feesCol.notnull === 1) {
  db.exec(`
    ALTER TABLE StudentFees RENAME TO _StudentFees_old;
    CREATE TABLE StudentFees (
      Id    INTEGER PRIMARY KEY AUTOINCREMENT,
      Name  TEXT    NOT NULL,
      Age   INTEGER NOT NULL,
      Email TEXT    NOT NULL,
      Fees  REAL
    );
    INSERT INTO StudentFees SELECT * FROM _StudentFees_old;
    DROP TABLE _StudentFees_old;
  `);
  console.log("Migrated StudentFees: Fees column is now nullable");
}

module.exports = db;
