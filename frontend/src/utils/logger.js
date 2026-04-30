const REPO_NAME = "student-crud-logger";

const logToStorage = (entry) => {
    const logs = JSON.parse(localStorage.getItem("logs")) || [];
    logs.push(entry);
    localStorage.setItem("logs", JSON.stringify(logs));
};

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

// Capture compile-time ESLint errors that CRA pipes through console.error,
// and any other console.error calls not going through the logger.
const _originalConsoleError = console.error;
console.error = (...args) => {
    _originalConsoleError(...args);
    const message = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ");
    // Avoid re-logging entries already written by log() above
    if (typeof args[0] === "object" && args[0]?.repo === REPO_NAME) return;
    logToStorage({
        repo: REPO_NAME,
        level: "error",
        message,
        data: null,
        time: new Date().toISOString(),
        source: "console.error",
    });
};

// Capture uncaught runtime errors (e.g. ReferenceError from undefined variables)
window.onerror = (message, source, lineno, colno, error) => {
    logToStorage({
        repo: REPO_NAME,
        level: "error",
        message: String(message),
        data: { source, lineno, colno, stack: error?.stack ?? null },
        time: new Date().toISOString(),
        source: "window.onerror",
    });
};

// Capture unhandled Promise rejections
window.addEventListener("unhandledrejection", (event) => {
    logToStorage({
        repo: REPO_NAME,
        level: "error",
        message: String(event.reason),
        data: { stack: event.reason?.stack ?? null },
        time: new Date().toISOString(),
        source: "unhandledrejection",
    });
});

export const logger = {
    info: (msg, data) => log("log", msg, data),
    warn: (msg, data) => log("warn", msg, data),
    error: (msg, data) => log("error", msg, data),
};
