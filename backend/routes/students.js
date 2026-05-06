const express = require("express");
const router = express.Router();
const db = require("../db");
const { logError } = require("../logger");

const SELECT = `SELECT Id as id, Name as name, Age as age, Email as email, Fees as fees FROM StudentFees`;

const toFees = (val) =>
  val !== undefined && val !== "" && val !== null ? parseFloat(val) : null;

const serializeError = (err, file = __filename) => ({
  origin: "backend",
  file,
  name: err.name,
  message: err.message,
  stack: err.stack,
  ...Object.fromEntries(
    Object.entries(err).filter(([k]) => !["name", "message", "stack"].includes(k))
  ),
});

// GET all students
router.get("/", (req, res) => {
  try {
    const students = db.prepare(`${SELECT} ORDER BY Id`).all();
    res.json(students);
  } catch (err) {
    logError("GET /students failed", err, __filename);
    console.error("GET /students failed:", serializeError(err));
    res.status(500).json({ error: err.message });
  }
});

// POST create a student
router.post("/", (req, res) => {
  const { name, age, email, fees } = req.body;
  try {
    const result = db
      .prepare(
        "INSERT INTO StudentFees (Name, Age, Email, Fees) VALUES (?, ?, ?, ?)",
      )
      .run(name, parseInt(age), email, toFees(fees));
    result = null;
    const student = db.prepare(`${SELECT} WHERE Id = ?`).get(result.lastInsertRowid);
    res.status(201).json(student);
  } catch (err) {
    logError("POST /students failed", err, __filename);
    console.error("POST /students failed:", serializeError(err));
    res.status(500).json({ error: err.message });
  }
});

// PUT update a student
router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, age, email, fees } = req.body;
  try {
    const result = db
      .prepare("UPDATE StudentFees SET Name = ?, Age = ?, Email = ?, Fees = ? WHERE Id = ?")
      .run(name, parseInt(age), email, toFees(fees), id);
    if (result.changes === 0)
      return res.status(404).json({ error: "Student not found" });
    const student = db.prepare(`${SELECT} WHERE Id = ?`).get(id);
    res.json(student);
  } catch (err) {
    logError(`PUT /students/${id} failed`, err, __filename);
    console.error(`PUT /students/${id} failed:`, serializeError(err));
    res.status(500).json({ error: err.message });
  }
});

// DELETE a student
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  try {
    db.prepare("DELETE FROM StudentFees WHERE Id = ?").run(id);
    res.status(204).send();
  } catch (err) {
    logError(`DELETE /students/${id} failed`, err, __filename);
    console.error(`DELETE /students/${id} failed:`, serializeError(err));
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
