import React, { useCallback, useEffect, useState } from "react";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import Toast from "./components/Toast";
import { logger } from "./utils/logger";

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

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("students"));
      if (data) setStudents(data);
      logger.info("Loaded students", data);
    } catch (error) {
      logger.error("Load failed", error);
      showToast("Failed to load students from storage");
    }
  }, [showToast]);

  useEffect(() => {
    try {
      if (students && students.length > 0) {
        localStorage.setItem("students", JSON.stringify(students));
      }
    } catch (error) {
      logger.error("Save failed", error);
      showToast("Failed to save students to storage");
    }
  }, [students, showToast]);

  const addStudent = (student) => {
    try {
      setStudents([...students, student]);
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
      const updated = students.filter((s) => s.id !== id);
      setStudents(updated);
    } catch (error) {
      logger.error("Delete failed", error);
      showToast("Failed to delete student");
    }
  };

  const updateStudent = (student) => {
    try {
      const updated = students.map((s) =>
        s.id === student.id ? student : s
      );
      setStudents(updated);
    } catch (error) {
      logger.error("Update failed", error);
      showToast("Failed to update student");
    }
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
      <h1>Student CRUD App</h1>

      <button onClick={downloadLogs} style={{ marginBottom: 16 }}>
        Download Logs
      </button>

      <StudentForm
        addStudent={addStudent}
        selectedStudent={selectedStudent}
        updateStudent={updateStudent}
        showToast={showToast}
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