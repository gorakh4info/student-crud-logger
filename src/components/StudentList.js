import React from "react";
import { logger } from "../utils/logger";

const StudentList = ({ students, deleteStudent, selectStudent }) => {
    if (!students) {
        logger.error("Students is null");
        return <p>No students found</p>;
    }

    return (
        <div>
            {students.map((s, index) => (
                <div key={index}>
                    {s.name} - {s.age}

                    <button onClick={() => selectStudent(s)}>Edit</button>

                    <button
                        onClick={() => {
                            try {
                                deleteStudent(s.id);
                            } catch (error) {
                                logger.error("Delete failed", error);
                            }
                        }}
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
};

export default StudentList;