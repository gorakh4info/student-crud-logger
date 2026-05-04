import React from "react";
import { logger } from "../utils/logger";

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

const StudentList = ({ students, deleteStudent, selectStudent, showToast }) => {
    if (!students || students.length === 0) {
        return <p style={{ color: "#888", marginTop: 12 }}>No students found. Add one above.</p>;
    }

    return (
        <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 8 }}>Student Records ({students.length})</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Age</th>
                        <th style={thStyle}>Email</th>
                        <th style={{ ...thStyle, width: 90 }}>Fees ($)</th>
                        <th style={{ ...thStyle, width: 140 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((s) => (
                        <tr key={s.id} style={{ backgroundColor: s.fees <= 0 ? "#fff3f3" : "transparent" }}>
                            <td style={tdStyle}>{s.name}</td>
                            <td style={tdStyle}>{s.age}</td>
                            <td style={tdStyle}>{s.email}</td>
                            <td style={{ ...tdStyle, color: s.fees <= 0 ? "#e74c3c" : "#27ae60", fontWeight: 600 }}>
                                {s.fees}
                            </td>
                            <td style={tdStyle}>
                                <button
                                    onClick={() => selectStudent(s)}
                                    style={{
                                        marginRight: 6,
                                        padding: "3px 10px",
                                        borderRadius: 3,
                                        border: "1px solid #3498db",
                                        color: "#3498db",
                                        background: "none",
                                        cursor: "pointer",
                                        fontSize: 12,
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        try {
                                            deleteStudent(s.id);
                                        } catch (error) {
                                            logger.error("Delete failed", error);
                                            showToast("Failed to delete student");
                                        }
                                    }}
                                    style={{
                                        padding: "3px 10px",
                                        borderRadius: 3,
                                        border: "1px solid #e74c3c",
                                        color: "#e74c3c",
                                        background: "none",
                                        cursor: "pointer",
                                        fontSize: 12,
                                    }}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StudentList;
