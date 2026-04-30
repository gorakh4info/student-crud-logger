const express = require("express");
const cors = require("cors");
const { connect } = require("./db");
const studentsRouter = require("./routes/students");

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/students", studentsRouter);

connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
      console.log("Database connected — StudentCrudDb ready");
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });
