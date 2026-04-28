import React, { useState, useEffect } from "react";
import { logger } from "../utils/logger";

const StudentForm = ({ addStudent, selectedStudent, updateStudent, showToast }) => {
    const [name, setName] = useState("");
    const [age, setAge] = useState("");

    useEffect(() => {
        if (selectedStudent) {
            setName(selectedStudent.name);
            setAge(selectedStudent.age);
        }
    }, [selectedStudent]);

    const handleSubmit = (e) => {
        e.preventDefault();

        try {
            if (!name || !age) {
                logger.warn("Empty fields submitted", { name, age });
                showToast("Name and age are required", "warn");
                return;
            }

            const student = {
                id: Date.now(), // ISSUE: new ID on update
                name,
                age,
            };

            if (selectedStudent) {
                updateStudent(student);
            } else {
                addStudent(student);
            }

            setName("");
            setAge("");
        } catch (error) {
            logger.error("Form error", error);
            showToast("Failed to submit form");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
            />
            <button type="submit">Save</button>
        </form>
    );
};

export default StudentForm;
