import React, { useCallback, useEffect, useRef, useState } from "react";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import Toast from "./components/Toast";
import { logger } from "./utils/logger";
import { sendFeesDueEmail, isEmailConfigured } from "./utils/emailService";

const CRON_INTERVAL_MS = 15000;

const modalOverlay = {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const thStyle = {
    textAlign: "left",
    padding: "8px 12px",
    backgroundColor: "#f4f4f4",
    borderBottom: "2px solid #ddd",
    fontSize: 13,
};

const tdStyle = {
    padding: "8px 12px",
    borderBottom: "1px solid #eee",
    fontSize: 14,
};

function DisplayModal({ students, onClose }) {
    return (
        <div style={modalOverlay} onClick={onClose}>
            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: 8,
                    padding: 24,
                    width: "90%",
                    maxWidth: 700,
                    maxHeight: "80vh",
                    overflow: "auto",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>All Student Records ({students ? students.length : 0})</h2>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}
                    >
                        ×
                    </button>
                </div>

                {!students || students.length === 0 ? (
                    <p style={{ color: "#888" }}>No student records found.</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Age</th>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Fees ($)</th>
                                <th style={thStyle}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s, i) => (
                                <tr key={s.id} style={{ backgroundColor: s.fees <= 0 ? "#fff3f3" : "transparent" }}>
                                    <td style={tdStyle}>{i + 1}</td>
                                    <td style={tdStyle}>{s.name}</td>
                                    <td style={tdStyle}>{s.age}</td>
                                    <td style={tdStyle}>{s.email}</td>
                                    <td style={{ ...tdStyle, color: s.fees <= 0 ? "#e74c3c" : "#27ae60", fontWeight: 600 }}>
                                        {s.fees}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: "2px 8px",
                                            borderRadius: 12,
                                            fontSize: 12,
                                            backgroundColor: s.fees <= 0 ? "#fde8e8" : "#e8fde8",
                                            color: s.fees <= 0 ? "#e74c3c" : "#27ae60",
                                            fontWeight: 600,
                                        }}>
                                            {s.fees <= 0 ? "Fees Due" : "Paid"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function App() {
    const [students, setStudents] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [toast, setToast] = useState({ message: "", type: "error" });
    const [cronActive, setCronActive] = useState(false);
    const [cronLogs, setCronLogs] = useState([]);
    const [showDisplay, setShowDisplay] = useState(false);

    // Refs to avoid stale closures inside setInterval
    const cronRef = useRef(null);
    const studentsRef = useRef(students);
    const cronCheckRef = useRef(null);

    useEffect(() => {
        studentsRef.current = students;
    }, [students]);

    useEffect(() => {
        return () => {
            if (cronRef.current) clearInterval(cronRef.current);
        };
    }, []);

    const showToast = useCallback((message, type = "error") => {
        setToast({ message, type });
    }, []);

    const closeToast = useCallback(() => {
        setToast((t) => ({ ...t, message: "" }));
    }, []);

    useEffect(() => {
        try {
            const data = JSON.parse(localStorage.getItem("students"));
            setStudents(data || []);
            logger.info("Loaded students", data);
        } catch (error) {
            logger.error("Load failed", error);
            showToast("Failed to load students from storage");
            setStudents([]);
        }
    }, [showToast]);

    useEffect(() => {
        if (students === null) return;
        try {
            localStorage.setItem("students", JSON.stringify(students));
        } catch (error) {
            logger.error("Save failed", error);
            showToast("Failed to save students to storage");
        }
    }, [students, showToast]);

    const addStudent = (student) => {
        try {
            setStudents((prev) => [...(prev || []), student]);
            logger.info("Student added", student);
        } catch (error) {
            logger.error("Add failed", error);
            showToast("Failed to add student");
        }
    };

    const deleteStudent = (id) => {
        try {
            if (id === undefined || id === null) {
                logger.error("Delete failed: id is not present", { id });
                showToast("Delete failed: student id is missing");
                return;
            }
            setStudents((prev) => prev.filter((s) => s.id !== id));
            showToast("Student deleted", "info");
            logger.info("Student deleted", { id });
        } catch (error) {
            logger.error("Delete failed", error);
            showToast("Failed to delete student");
        }
    };

    const updateStudent = (student) => {
        try {
            setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
            logger.info("Student updated", student);
        } catch (error) {
            logger.error("Update failed", error);
            showToast("Failed to update student");
        }
    };

    // Plain function, NOT useCallback — ref is updated every render so the
    // setInterval always calls the latest version with a fresh new Date().
    const pushLog = (message, color) => {
        const entry = {
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            message,
            color: color || "#d4d4d4",
        };
        setCronLogs((prev) => [entry, ...prev].slice(0, 50));
        logger.info("Cron", { message });
    };
    const pushLogRef = useRef(pushLog);
    pushLogRef.current = pushLog;

    // Also wrap showToast in a ref so cronCheckRef can always reach the latest.
    const showToastRef = useRef(showToast);
    showToastRef.current = showToast;

    // Re-assigned every render so setInterval always calls the latest closure.
    cronCheckRef.current = async () => {
        const current = studentsRef.current;
        if (!current || current.length === 0) {
            pushLogRef.current("No students in list — nothing to check.");
            return;
        }

        const due = current.filter((s) => s.fees <= 0);

        if (due.length === 0) {
            pushLogRef.current("Check complete — no students with fees ≤ 0.", "#6fcf97");
            return;
        }

        await Promise.all(
            due.map(async (s) => {
                const result = await sendFeesDueEmail(s);
                if (result.simulated) {
                    pushLogRef.current(
                        `[Simulated] Email → ${s.email} (${s.name}) | Fees: $${s.fees}`,
                        "#f2994a"
                    );
                } else if (result.success) {
                    pushLogRef.current(
                        `Email sent → ${s.email} (${s.name}) | Fees: $${s.fees}`,
                        "#6fcf97"
                    );
                } else {
                    pushLogRef.current(
                        `Email FAILED → ${s.email} | ${result.error}`,
                        "#eb5757"
                    );
                }
            })
        );

        showToastRef.current(`Notified ${due.length} student(s) with fees due`, "info");
        logger.info("Cron check done", { notified: due.length });
    };

    const startCron = useCallback(() => {
        if (cronRef.current) return;
        pushLogRef.current("Cron job started.", "#56ccf2");
        // Run first check immediately, then on interval
        cronCheckRef.current();
        cronRef.current = setInterval(() => cronCheckRef.current(), CRON_INTERVAL_MS);
        setCronActive(true);
        showToastRef.current("Cron job started — checking every 15s", "info");
        logger.info("Cron job started");
    }, []);

    const stopCron = useCallback(() => {
        if (cronRef.current) {
            clearInterval(cronRef.current);
            cronRef.current = null;
        }
        setCronActive(false);
        pushLogRef.current("Cron job stopped.", "#eb5757");
        showToastRef.current("Cron job stopped", "info");
        logger.info("Cron job stopped");
    }, []);

    const downloadLogs = () => {
        const logs = localStorage.getItem("logs") || "[]";
        const blob = new Blob([logs], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `student-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        logger.info("Logs downloaded");
    };

    return (
        <div style={{ padding: 20, maxWidth: 900, fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h1 style={{ margin: 0 }}>Student CRUD App</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                        fontSize: 12,
                        padding: "3px 10px",
                        borderRadius: 12,
                        backgroundColor: isEmailConfigured ? "#e8fde8" : "#fff3cd",
                        color: isEmailConfigured ? "#27ae60" : "#856404",
                        border: `1px solid ${isEmailConfigured ? "#b7dfb8" : "#ffc107"}`,
                    }}>
                        {isEmailConfigured ? "Email: EmailJS configured" : "Email: simulated (set .env.local)"}
                    </span>
                    <button
                        onClick={downloadLogs}
                        style={{ padding: "6px 14px", borderRadius: 4, border: "1px solid #aaa", cursor: "pointer", fontSize: 13 }}
                    >
                        Download Logs
                    </button>
                </div>
            </div>

            <StudentForm
                addStudent={addStudent}
                selectedStudent={selectedStudent}
                updateStudent={updateStudent}
                showToast={showToast}
                onDisplay={() => setShowDisplay(true)}
                onStart={startCron}
                onStop={stopCron}
                cronActive={cronActive}
            />

            <StudentList
                students={students}
                deleteStudent={deleteStudent}
                selectStudent={setSelectedStudent}
                showToast={showToast}
            />

            {cronLogs.length > 0 && (
                <div style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <h3 style={{ margin: 0 }}>Cron Activity Log</h3>
                        <button
                            onClick={() => setCronLogs([])}
                            style={{ background: "none", border: "1px solid #ccc", borderRadius: 3, cursor: "pointer", fontSize: 12, padding: "2px 8px" }}
                        >
                            Clear
                        </button>
                    </div>
                    <div style={{
                        maxHeight: 220,
                        overflowY: "auto",
                        backgroundColor: "#1e1e1e",
                        borderRadius: 6,
                        padding: "10px 14px",
                    }}>
                        {cronLogs.map((entry) => (
                            <div key={entry.id} style={{ fontFamily: "monospace", fontSize: 13, marginBottom: 4, color: entry.color }}>
                                <span style={{ color: "#666", marginRight: 8 }}>[{entry.time}]</span>
                                {entry.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showDisplay && (
                <DisplayModal students={students} onClose={() => setShowDisplay(false)} />
            )}

            <Toast message={toast.message} type={toast.type} onClose={closeToast} />
        </div>
    );
}

export default App;
