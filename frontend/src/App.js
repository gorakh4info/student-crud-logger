import React, { useCallback, useEffect, useRef, useState } from "react";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import Toast from "./components/Toast";
import { logger, logError } from "./utils/logger";
import StackTrace from "stacktrace-js";
import { sendFeesDueEmail, isEmailConfigured } from "./emailService";

const API = "http://localhost:5000/api/students";
const __filename = "src/App.js";
const CRON_INTERVAL_MS = 150000; // 30 seconds

function App() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "error" });
  const [cronActive, setCronActive] = useState(false);
  const [cronLogs, setCronLogs] = useState([]);

  // Refs so setInterval always calls the latest function closure
  const cronRef = useRef(null);
  const cronCheckRef = useRef(null);
  const pushLogRef = useRef(null);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, message: "" }));
  }, []);

  // Load students on mount
  useEffect(() => {
    fetch(API)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch students");
        return res.json();
      })
      .then((data) => {
        setStudents(data);
      })
      .catch((err) => {
        logger.error("Load failed", err);
        showToast("Failed to load students from server");
      });
  }, [showToast]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (cronRef.current) clearInterval(cronRef.current);
    };
  }, []);

  const addStudent = (student) => {
    if (!student) {
      logError("Failed to add student", null, __filename);
      showToast("Failed to add student");
      return false;
    }
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(student),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Add failed");
        return res.json();
      })
      .then((created) => {
        setStudents((prev) => [...prev, created]);
      })
      .catch((err) => {
        logError("Failed to add student", err, __filename);
        showToast("Failed to add student");
      });
  };

  const deleteStudent = (id) => {
    if (id === undefined || id === null) {
      showToast("Delete failed: student id is missing");
      return;
    }
    fetch(`${API}/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed");
        setStudents((prev) => prev.filter((s) => s.id !== id));
        logger.info("Deleted student", { id });
      })
      .catch((err) => {
        logger.error("Delete failed", err);
        showToast("Failed to delete student");
      });
  };

  const updateStudent = (student) => {
    if (!student) {
      showToast("Update failed: student not defined");
      return;
    }
    fetch(`${API}/${student.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(student),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Update failed");
        return res.json();
      })
      .then((updated) => {
        setStudents((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        logger.info("Updated student", updated);
      })
      .catch((err) => {
        logger.error("Update failed", err);
        showToast("Failed to update student");
      });
  };

  const downloadLogs = () => {
    fetch("http://localhost:5000/api/logs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch logs");
        return res.json();
      })
      .then((all) => {
        // For completeCron activity entries, keep only errors.
        const filtered = all.filter((entry) => {
          const isCronEntry = /cron/i.test(entry.Message || entry.message || "");
          const level = entry.Level || entry.level;
          return !isCronEntry || level === "error";
        });
        const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `student-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        logger.info("Logs downloaded");
      })
      .catch((err) => {
        logger.error("Failed to download logs", err);
        showToast("Failed to download logs");
      });
  };

  const deleteLogs = () => {
    if (!window.confirm("Delete all logs from the database? This cannot be undone.")) return;
    fetch("http://localhost:5000/api/logs", { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete logs");
        showToast("All logs deleted", "info");
        logger.info("All logs deleted");
      })
      .catch((err) => {
        logger.error("Failed to delete logs", err);
        showToast("Failed to delete logs");
      });
  };

  // ─── Cron helpers (plain functions re-assigned every render via ref) ─────────
  // This pattern ensures setInterval always executes the latest closure,
  // giving a fresh new Date() on every tick with no stale state.

  const pushLog = (message, color = "#d4d4d4") => {
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      message,
      color,
    };
    setCronLogs((prev) => [entry, ...prev].slice(0, 100));
    logger.info("Cron", { message });
  };
  pushLogRef.current = pushLog;

  // Fetches fresh DB data every tick — does NOT use stale React state
  cronCheckRef.current = async () => {
    pushLogRef.current("Fetching students from database…", "#888");
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const allStudents = await res.json();

      const due = allStudents.filter((s) => Number(s.fees) <= 0);

      if (due.length === 0) {
        pushLogRef.current(
          "Check complete — no students with fees ≤ 0.",
          "#6fcf97",
        );
        return;
      }

      pushLogRef.current(
        `Found ${due.length} student(s) with fees ≤ 0. Sending emails…`,
        "#f2994a",
      );
      await Promise.all(
        due.map(async (s) => {
          const result = await sendFeesDueEmail(s);
          if (result.success) {
            pushLogRef.current(
              `✓ Email sent   → ${s.email}  (${s.name})  | Fees: $${s.fees}`,
              "#6fcf97",
            );
            logger.info("Email sent", { email: s.email, fees: s.fees });
          } else if (result.simulated) {
            pushLogRef.current(
              `⚠ Simulated    → ${s.email}  (${s.name})  | Fees: $${s.fees}  [configure .env]`,
              "#f2994a",
            );
          } else {
            pushLogRef.current(
              `✗ Email FAILED → ${s.email}  | ${result.error}`,
              "#eb5757",
            );
            logger.error("Email failed", {
              email: s.email,
              error: result.error,
            });
          }
        }),
      );

      showToast(
        `Notified ${due.length} student(s) with outstanding fees`,
        "info",
      );
    } catch (err) {
      pushLogRef.current(`✗ Error: ${err.message}`, "#eb5757");
      logger.error("Cron check error", err);
    }
  };

  // ─── Start / Stop ─────────────────────────────────────────────────────────────

  // async so we can await StackTrace.fromError() for source-map resolution
  // const startCron = useCallback(async () => {
  //  if (cronRef.current) return;
  //  pushLogRef.current("─── Cron job started ───", "#56ccf2");
  //  cronCheckRef.current(); // run immediately
  //  cronRef.current = setInterval(() => cronCheckRef.current(), CRON_INTERVAL_MS);
  //  setCronActive(true);
  //  logger.info("Cron job started", {
  //    startedAt,
  //    intervalMs: CRON_INTERVAL_MS,
  //  });
  //  showToast("Cron job started — checking every 30s", "info");
  //}, [showToast]);

  const startCron = useCallback(async () => {
    if (cronRef.current) return;

    const startedAt = new Date().toISOString();

    try {
      pushLogRef.current = null;
      pushLogRef.current("─── Cron job started ───", "#56ccf2");
    } catch (err) {
      try {
        // Resolve err's stack (the actual TypeError) via source map → App.js:N
        const resolvedFrames = await StackTrace.fromError(err);
        const frame =
          resolvedFrames.find(
            (f) =>
              f.fileName?.includes("App.js") ||
              f.functionName?.includes("startCron"),
          ) ?? resolvedFrames[0];

        const resolvedStack =
          err.toString() +
          "\n" +
          resolvedFrames
            .map(
              (f) =>
                `    at ${f.functionName || "<anonymous>"} (${f.fileName}:${f.lineNumber}:${f.columnNumber})`,
            )
            .join("\n");

        logger.errorAt("startCron: UI log function unavailable", {
          event: "CRON_START_ERROR",
          errorName: err.name,
          errorMessage: err.message,
          fileName: frame?.fileName ?? null,
          lineNumber: frame?.lineNumber ?? null,
          resolvedStack,
          startedAt,
        }, frame?.fileName ?? null);
        showToast(
          `Error at ${frame?.fileName}:${frame?.lineNumber} — ${err.message}`,
          "error",
        );
      } catch {
        logger.error("startCron: UI log Error 1", {
          event: "CRON_START_ERROR",
          errorName: err.name,
          errorMessage: err.message,
          note: "source map unavailable; raw stack omitted",
          startedAt,
        });
        showToast(`Error: ${err.message}`, "error");
      }
    }

    // Cron still starts — setCronActive(true) triggers a re-render which
    // re-assigns pushLogRef.current = pushLog, so all subsequent ticks log fine.
    cronCheckRef.current();
    cronRef.current = setInterval(() => cronCheckRef.current(), CRON_INTERVAL_MS);
    setCronActive(true);
    logger.info("Cron job started", { startedAt, intervalMs: CRON_INTERVAL_MS });
    showToast("Cron job started — checking every 30s", "info");
  }, [showToast]);

  const stopCron = useCallback(() => {
    if (cronRef.current) {
      clearInterval(cronRef.current);
      cronRef.current = null;
    }
    setCronActive(false);
    pushLogRef.current("─── Cron job stopped ───", "#eb5757");
    showToast("Cron job stopped", "info");
    logger.info("Cron job stopped");
  }, [showToast]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  const btnStyle = (color, disabled) => ({
    padding: "6px 16px",
    borderRadius: 4,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: disabled ? "#c8c8c8" : color,
    color: "#fff",
  });

  return (
    <div style={{ padding: 24, maxWidth: 960, fontFamily: "sans-serif" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0 }}>Student Info</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Email status badge */}
          <span
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 12,
              backgroundColor: isEmailConfigured ? "#e8fde8" : "#fff3cd",
              color: isEmailConfigured ? "#27ae60" : "#856404",
              border: `1px solid ${isEmailConfigured ? "#b7dfb8" : "#ffc107"}`,
            }}
          >
            {isEmailConfigured
              ? "EmailJS: configured"
              : "EmailJS: not configured (see .env)"}
          </span>

          <button
            onClick={downloadLogs}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              border: "1px solid #aaa",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Download Logs
          </button>

          <button
            onClick={deleteLogs}
            style={{ padding: "6px 14px", borderRadius: 4, border: "1px solid #e74c3c", color: "#e74c3c", cursor: "pointer", fontSize: 14, background: "none" }}
          >
            Delete All Logs
          </button>

          <button
            onClick={startCron}
            disabled={cronActive}
            style={btnStyle("#27ae60", cronActive)}
          >
            Start
          </button>

          <button
            onClick={stopCron}
            disabled={!cronActive}
            style={btnStyle("#e74c3c", !cronActive)}
          >
            Stop
          </button>

          {cronActive && (
            <span style={{ fontSize: 13, color: "#27ae60" }}>
              ● running (30s)
            </span>
          )}
        </div>
      </div>

      <StudentForm
        addStudent={addStudent}
        selectedStudent={selectedStudent}
        updateStudent={updateStudent}
        showToast={showToast}
        onSaved={() => setSelectedStudent(null)}
      />

      <StudentList
        students={students}
        deleteStudent={deleteStudent}
        selectStudent={setSelectedStudent}
        showToast={showToast}
      />

      {/* Cron activity log */}
      {cronLogs.length > 0 && (
        <div
          style={{ marginTop: 28, borderTop: "1px solid #ddd", paddingTop: 16 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>Cron Activity Log</h3>
            <button
              onClick={() => setCronLogs([])}
              style={{
                fontSize: 12,
                padding: "2px 10px",
                borderRadius: 3,
                border: "1px solid #ccc",
                cursor: "pointer",
                background: "none",
              }}
            >
              Clear
            </button>
          </div>
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              backgroundColor: "#1e1e1e",
              borderRadius: 6,
              padding: "10px 14px",
            }}
          >
            {cronLogs.map((entry) => (
              <div
                key={entry.id}
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  marginBottom: 4,
                  color: entry.color,
                }}
              >
                <span style={{ color: "#555", marginRight: 10 }}>
                  [{entry.time}]
                </span>
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </div>
  );
}

export default App;
