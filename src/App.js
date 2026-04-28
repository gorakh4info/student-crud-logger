import React, { useEffect, useState } from "react";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import { logger } from "./utils/logger";

function App() {
  const [students, setStudents] = useState(null); // ISSUE
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("students"));
      setStudents(data);
      logger.info("Loaded students", data);
    } catch (error) {
      logger.error("Load failed", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("students", JSON.stringify(students));
    } catch (error) {
      logger.error("Save failed", error);
    }
  }, [students]);

  const addStudent = (student) => {
    try {
      setStudents([...students, student]); // ISSUE
    } catch (error) {
      logger.error("Add failed", error);
    }
  };

  const deleteStudent = (id) => {
    try {
      const updated = students.filter((s) => s.id !== id);
      setStudents(updated);
    } catch (error) {
      logger.error("Delete failed", error);
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
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Student CRUD App</h1>

      <StudentForm
        addStudent={addStudent}
        selectedStudent={selectedStudent}
        updateStudent={updateStudent}
      />

      <StudentList
        students={students}
        deleteStudent={deleteStudent}
        selectStudent={setSelectedStudent}
      />
    </div>
  );
}

export default App;