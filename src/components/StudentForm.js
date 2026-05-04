import React, { useState, useEffect } from "react";
import { logger } from "../utils/logger";

const StudentForm = ({
    addStudent,
    selectedStudent,
    updateStudent,
    showToast,
    onDisplay,
    onStart,
    onStop,
    cronActive,
}) => {
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [email, setEmail] = useState("");
    const [fees, setFees] = useState("");

    useEffect(() => {
        if (selectedStudent) {
            setName(selectedStudent.name);
            setAge(selectedStudent.age);
            setEmail(selectedStudent.email || "");
            setFees(selectedStudent.fees !== undefined ? String(selectedStudent.fees) : "");
        } else {
            setName("");
            setAge("");
            setEmail("");
            setFees("");
        }
    }, [selectedStudent]);

    const handleSubmit = (e) => {
        e.preventDefault();

        try {
            if (!name || !age || !email || fees === "") {
                logger.warn("Empty fields submitted", { name, age, email, fees });
                showToast("All fields are required", "warn");
                return;
            }

            const feesNum = parseFloat(fees);
            if (isNaN(feesNum)) {
                showToast("Fees must be a valid number", "warn");
                return;
            }

            const student = {
                id: selectedStudent ? selectedStudent.id : Date.now(),
                name,
                age,
                email,
                fees: feesNum,
            };

            if (selectedStudent) {
                updateStudent(student);
                showToast("Student updated successfully", "info");
            } else {
                addStudent(student);
                showToast("Student added successfully", "info");
            }

            setName("");
            setAge("");
            setEmail("");
            setFees("");
        } catch (error) {
            logger.error("Form error", error);
            showToast("Failed to submit form");
        }
    };

    const btnBase = {
        padding: "6px 14px",
        marginRight: 8,
        borderRadius: 4,
        border: "1px solid #ccc",
        cursor: "pointer",
        fontSize: 14,
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <input
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc" }}
                />
                <input
                    placeholder="Age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", width: 80 }}
                />
                <input
                    placeholder="Email ID"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", width: 200 }}
                />
                <input
                    placeholder="Fees"
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", width: 100 }}
                />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
                <button
                    type="submit"
                    style={{ ...btnBase, backgroundColor: "#3498db", color: "#fff", border: "none" }}
                >
                    {selectedStudent ? "Update" : "Save"}
                </button>
                <button
                    type="button"
                    onClick={onDisplay}
                    style={{ ...btnBase, backgroundColor: "#8e44ad", color: "#fff", border: "none" }}
                >
                    Display
                </button>
                <button
                    type="button"
                    onClick={onStart}
                    disabled={cronActive}
                    style={{
                        ...btnBase,
                        backgroundColor: cronActive ? "#95a5a6" : "#27ae60",
                        color: "#fff",
                        border: "none",
                        cursor: cronActive ? "not-allowed" : "pointer",
                    }}
                >
                    Start
                </button>
                <button
                    type="button"
                    onClick={onStop}
                    disabled={!cronActive}
                    style={{
                        ...btnBase,
                        backgroundColor: !cronActive ? "#95a5a6" : "#e74c3c",
                        color: "#fff",
                        border: "none",
                        cursor: !cronActive ? "not-allowed" : "pointer",
                        marginRight: 0,
                    }}
                >
                    Stop
                </button>
                {cronActive && (
                    <span style={{ marginLeft: 12, fontSize: 13, color: "#27ae60" }}>
                        ● Cron running (every 15s)
                    </span>
                )}
            </div>
        </form>
    );
};

export default StudentForm;
