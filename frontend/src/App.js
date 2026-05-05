import React, { useCallback, useEffect, useRef, useState } from "react";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import Toast from "./components/Toast";
import { logger } from "./utils/logger";
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
  // Initialize pushLogRef with a function to update cronLogs
  const pushLogRef = useRef((logEntry) => {
    setCronLogs((prev) => [...prev, logEntry]);
  });

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
        logger.error("Load failed", err.message);
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
        logger.info("Added student", created);
      })
      .catch((err) => {
        logger.error("Add failed", err.message);
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
        logger.error("Delete failed", err.message);
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
        setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        logger.info("Updated student", updated);
      })
      .catch((err) => {
        logger.error("Update failed", err.message);
        showToast("Failed to update student");
      });
  };

  const downloadLogs = () => {
    const all = JSON.parse(localStorage.getItem("logs") || "[]");
    // For completeCron activity entries, keep only errors.
    // All other log entries are included as-is.
    const filtered = all.filter((entry) => {
      const isCronEntry = /cron/i.test(entry.message || "");
      return !isCronEntry || entry.level === "error";
    });
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document
