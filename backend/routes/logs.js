const express = require("express");
const router = express.Router();
const db = require("../db");

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

// GET /api/logs — fetch all logs (optionally filter by level)
router.get("/", (req, res) => {
  try {
    const { level } = req.query;
    const rows = level
      ? db.prepare("SELECT * FROM Logs WHERE Level = ? ORDER BY Id").all(level)
      : db.prepare("SELECT * FROM Logs ORDER BY Id").all();

    const logs = rows.map((r) => ({
      ...r,
      data: r.Data ? JSON.parse(r.Data) : null,
    }));
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
