const express = require("express");
const cors = require("cors");
const studentsRouter = require("./routes/students");
const logsRouter = require("./routes/logs");

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3002" }));
app.use(express.json());

app.use("/api/students", studentsRouter);
app.use("/api/logs", logsRouter);

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log("SQLite database: StudInfo.db");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use.\n` +
      `Run this to free it:  for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /PID %a /F`
    );
  } else {
    console.error("Server error:", { name: err.name, message: err.message, stack: err.stack });
  }
  process.exit(1);
});
