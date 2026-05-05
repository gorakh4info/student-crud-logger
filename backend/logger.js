const db = require("./db");

const REPO_NAME = "student-crud-logger";

const logError = (message, err, file) => {
    try {
        db.prepare(`
            INSERT INTO Logs (Origin, File, Repo, Level, Message, Data, Source, Time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            "backend",
            file,
            REPO_NAME,
            "error",
            message,
            JSON.stringify({
                name: err?.name,
                message: err?.message,
                stack: err?.stack,
                ...Object.fromEntries(
                    Object.entries(err ?? {}).filter(
                        ([k]) => !["name", "message", "stack"].includes(k)
                    )
                ),
            }),
            "backend",
            new Date().toISOString()
        );
    } catch (logErr) {
        console.error("Failed to write error to Logs table:", logErr.message);
    }
};

module.exports = { logError };
