const express = require("express");
const router = express.Router();
const { sql, connect } = require("../db");

// GET all students
router.get("/", async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query(`
      SELECT Id as id, Name as name, Age as age, Email as email, Fees as fees
      FROM StudentFees
      ORDER BY Id
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /students failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST create a student
router.post("/", async (req, res) => {
  const { name, age, email, fees } = req.body;
  try {
    const pool = await connect();
    const result = await pool
      .request()
      .input("name", sql.NVarChar(100), name)
      .input("age", sql.Int, parseInt(age))
      .input("email", sql.NVarChar(200), email)
      .input("fees", sql.Decimal(10, 2), parseFloat(fees))
      .query(`
        INSERT INTO StudentFees (Name, Age, Email, Fees)
        OUTPUT INSERTED.Id as id, INSERTED.Name as name,
               INSERTED.Age as age, INSERTED.Email as email,
               INSERTED.Fees as fees
        VALUES (@name, @age, @email, @fees)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("POST /students failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT update a student
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, age, email, fees } = req.body;
  try {
    const pool = await connect();
    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .input("name", sql.NVarChar(100), name)
      .input("age", sql.Int, parseInt(age))
      .input("email", sql.NVarChar(200), email)
      .input("fees", sql.Decimal(10, 2), parseFloat(fees))
      .query(`
        UPDATE StudentFees
        SET Name = @name, Age = @age, Email = @email, Fees = @fees
        OUTPUT INSERTED.Id as id, INSERTED.Name as name,
               INSERTED.Age as age, INSERTED.Email as email,
               INSERTED.Fees as fees
        WHERE Id = @id
      `);
    if (!result.recordset.length)
      return res.status(404).json({ error: "Student not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(`PUT /students/${id} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a student
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await connect();
    await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .query("DELETE FROM StudentFees WHERE Id = @id");
    res.status(204).send();
  } catch (err) {
    console.error(`DELETE /students/${id} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
