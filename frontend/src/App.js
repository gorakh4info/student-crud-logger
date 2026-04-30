import React, { useCallback, useEffect, useState } from "react";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import Toast from "./components/Toast";
import { logger } from "./utils/logger";

const API = "http://localhost:5000/api/students";

function App() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "error" });

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, message: "" }));
  }, []);

  // Load all students from the API on mount
  useEffect(() => {
    fetch(API)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch students");
        return res.json();
      })
      .then((data) => {
        setStudents(data);
        logger.info("Loaded students", data);
      })
      .catch((error) => {
        logger.error("Load failed", error.message);
        showToast("Failed to load students from server");
      });
  }, [showToast]);

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
      .catch((error) => {
        logger.error("Add failed", error.message);
        showToast("Failed to add student");
      });
  };

  const deleteStudent = (id) => {
    if (id === undefined || id === null) {
      logger.error("Delete failed: id is not present", { id });
      showToast("Delete failed: student id is missing");
      return;
    }
    fetch(`${API}/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed");
        setStudents((prev) => prev.filter((s) => s.id !== id));
        logger.info("Deleted student", { id });
      })
      .catch((error) => {
        logger.error("Delete failed", error.message);
        showToast("Failed to delete student");
      });
  };

  const updateStudent = (student) => {
    if (!student) {
      logger.error("Update failed: student is not defined", { student });
      showToast("Update failed: student is not defined");
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
      .catch((error) => {
        logger.error("Update failed", error.message);
        showToast("Failed to update student");
      });
  };

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
    <div style={{ padding: 20 }}>
      <h1>Student Info</h1>

      <button onClick={downloadLogs} style={{ marginBottom: 16 }}>
        Download Logs
      </button>

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

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </div>
  );
}

export default App;
