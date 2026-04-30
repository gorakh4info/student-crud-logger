const express = require("express");
const cors = require("cors");
const studentsRouter = require("./routes/students");

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/students", studentsRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log("SQLite database: StudInfo.db");
});
