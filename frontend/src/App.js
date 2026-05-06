import React, { useCallback, useEffect, useRef, useState } from "react";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import Toast from "./components/Toast";
import { logger } from "./utils/logger";
import StackTrace from "stacktrace-js";
import { sendFeesDueEmail, isEmailConfigured } from "./emailService";

const API = "http://localhost:5000/api/students";
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
        logger.error("Add failed", err);
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
        const blob = 


  // Function to start the cron job
  const startCron = useCallback(() => {
    if (!pushLogRef.current) {
      // This ensures pushLogRef.current is assigned before it's used.
      // The previous error occurred because pushLogRef.current was null initially.
      pushLogRef.current = logger.push;
    }
    if (cronRef.current) return; // Already running

    // Start the cron job
    cronRef.current = setInterval(() => {
      console.log("Cron job running...");
      // Simulate checking emails and sending notifications
      isEmailConfigured().then((configured) => {
        if (configured) {
          students.forEach(async (student) => {
            // Simulate checking for fees due
            const daysUntilDue = Math.floor(
              (new Date(student.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilDue <= 7 && daysUntilDue >= 0) {
              try {
                await sendFeesDueEmail(student.email, student.name, daysUntilDue);
                const logMessage = `Fees due for ${student.name} in ${daysUntilDue} days. Email sent.`;
                pushLogRef.current("info", logMessage, "cron");
              } catch (emailError) {
                const errorLogMessage = `Failed to send fees due email for ${student.name}: ${emailError.message}`;
                pushLogRef.current("error", errorLogMessage, "cron", emailError);
              }
            }
          });
        } else {
          const logMessage = "Email is not configured. Skipping fee notifications.";
          pushLogRef.current("warn", logMessage, "cron");
        }
      });
    }, CRON_INTERVAL_MS);

    setCronActive(true);
    console.log("Cron job started.");
  }, [students]);

  // Function to stop the cron job
  const stopCron = useCallback(() => {
    if (cronRef.current) {
      clearInterval(cronRef.current);
      cronRef.current = null;
      setCronActive(false);
      console.log("Cron job stopped.");
    }
  }, []);

  // Effect to handle cron check interval (optional, for demonstration)
  useEffect(() => {
    // This interval is just to demonstrate the cron check, not essential for the core functionality
    cronCheckRef.current = setInterval(() => {
      if (cronActive) {
        console.log("Cron job is active.");
      } else {
        console.log("Cron job is inactive.");
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (cronCheckRef.current) clearInterval(cronCheckRef.current);
    };
  }, [cronActive]);

  // Initial setup for pushLogRef
  useEffect(() => {
    // Assign logger.push to pushLogRef.current when the component mounts.
    // This ensures it's available for startCron.
    pushLogRef.current = logger.push;
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Student Management</h1>
      <StudentForm
        addStudent={addStudent}
        selectedStudent={selectedStudent}
        updateStudent={updateStudent}
        setSelectedStudent={setSelectedStudent}
      />
      <StudentList
        students={students}
        onDelete={deleteStudent}
        onEdit={(student) => setSelectedStudent(student)}
      />
      <div className="mt-4">
        <button
          onClick={startCron}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
          disabled={cronActive}
        >
          Start Cron
        </button>
        <button
          onClick={stopCron}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2"
          disabled={!cronActive}
        >
          Stop Cron
        </button>
        <p>Cron Status: {cronActive ? "Active" : "Inactive"}</p>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </div>
  );
}

export default App;
