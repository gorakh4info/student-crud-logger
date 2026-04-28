const logToStorage = (entry) => {
    const logs = JSON.parse(localStorage.getItem("logs")) || [];
    logs.push(entry);
    localStorage.setItem("logs", JSON.stringify(logs));
};

const REPO_NAME = "student-crud-logger";

const log = (level, message, data = null) => {
    const entry = {
        repo: REPO_NAME,
        level,
        message,
        data,
        time: new Date().toISOString(),
    };

    console[level](entry);
    logToStorage(entry);
};

export const logger = {
    info: (msg, data) => log("log", msg, data),
    warn: (msg, data) => log("warn", msg, data),
    error: (msg, data) => log("error", msg, data),
};