const express = require("express");
const router = express.Router();
const db = require("../db");
const fs = require("fs");
const path = require("path");

const EXPORT_DIR = path.join(__dirname, "..", "..", "logs");

// POST /api/logs — store a log entry sent from the frontend
router.post("/", (req, res) => {
  const { origin, file, repo, level, message, data, source, time } = req.body;
  try {
    db.prepare(`
      INSERT INTO Logs (Origin, File, Repo, Level, Message, Data, Source, Time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      origin ?? null,
      file ?? null,
      repo ?? null,
      level,
      message,
      data !== undefined && data !== null ? JSON.stringify(data) : null,
      source ?? null,
      time
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("POST /logs failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logs/export — write filtered logs to C:\V2\logger\
router.post("/export", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM Logs ORDER BY Id").all();
    const logs = rows.map((r) => {
      let parsedData = null;
      try { parsedData = r.Data ? JSON.parse(r.Data) : null; } catch { parsedData = { _parseError: true, raw: r.Data }; }
      return { ...r, data: parsedData };
    });

    const filtered = logs.filter((entry) => {
      const isCronEntry = /cron/i.test(entry.Message || "");
      const level = entry.Level || entry.level;
      return !isCronEntry || level === "error";
    });

    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    const filename = `student-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filepath = path.join(EXPORT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(filtered, null, 2), "utf8");

    res.json({ ok: true, path: filepath, filename });
  } catch (err) {
    console.error("POST /logs/export failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs — fetch all logs (optionally filter by level)
router.get("/", (req, res) => {
  try {
    const { level } = req.query;
    const rows = level
      ? db.prepare("SELECT * FROM Logs WHERE Level = ? ORDER BY Id").all(level)
      : db.prepare("SELECT * FROM Logs ORDER BY Id").all();

    const logs = rows.map((r) => {
      let parsedData = null;
      try {
        parsedData = r.Data ? JSON.parse(r.Data) : null;
      } catch {
        parsedData = { _parseError: true, raw: r.Data };
      }
      return { ...r, data: parsedData };
    });
    res.json(logs);
  } catch (err) {
    console.error("GET /logs failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs — clear all logs
router.delete("/", (req, res) => {
  try {
    db.prepare("DELETE FROM Logs").run();
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /logs failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
