import { useState } from "react";

export default function TaskItem({ task, toggleTask, deleteTask, updateTask, darkMode, isFocusTask }) {
    const today = new Date();
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [editedDeadline, setEditedDeadline] = useState(task.deadline ? task.deadline.split("T")[0] : "");

    // Semantic color for overdue / due-soon tasks
    let deadlineColor = darkMode ? "#E8D9C5" : "#2E2013";
    if (deadlineDate) {
        const diff = (deadlineDate - today) / (1000 * 60 * 60 * 24);
        if (diff < 0)   deadlineColor = "#ef4444";
        else if (diff <= 2) deadlineColor = "#f59e0b";
    }

    async function handleSave() {
        await updateTask(task.id, editedTitle, editedDeadline);
        setIsEditing(false);
    }

    const inputBase = {
        padding: "8px 12px",
        borderRadius: "6px",
        border: darkMode ? "1px solid #6E5D4B" : "1px solid #D5C2A5",
        background: darkMode ? "#2E2013" : "#ffffff",
        color: darkMode ? "#FFF8EF" : "#2E2013",
        fontSize: "14px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    };

    const btnBase = {
        padding: "6px 12px",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "13px",
        whiteSpace: "nowrap",
    };

    return (
        <li style={{
            color: deadlineColor,
            marginBottom: "10px",
            padding: "14px 16px",
            borderRadius: "12px",
            border: isFocusTask
                ? "2px solid #f59e0b"
                : (darkMode ? "1px solid #4A3C2C" : "1px solid #E8D9C5"),
            boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
            background: isFocusTask
                ? (darkMode ? "#452d08" : "#fef3c7")
                : (darkMode ? "#1E140C" : "#ffffff"),
            transition: "all 0.2s ease",
        }}>
            {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        style={inputBase}
                        placeholder="Task title"
                    />
                    <input
                        type="date"
                        value={editedDeadline}
                        onChange={(e) => setEditedDeadline(e.target.value)}
                        style={{ ...inputBase, width: "auto", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button style={{ ...btnBase, background: "#2e936f", color: "white" }} onClick={handleSave}>Save</button>
                        <button style={{ ...btnBase, background: darkMode ? "#6E5D4B" : "#E8D9C5", color: darkMode ? "#FFF8EF" : "#2E2013" }} onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                    {/* Checkbox + title */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}>
                        <span
                            style={{ cursor: "pointer", fontSize: "18px", flexShrink: 0, marginTop: "1px" }}
                            onClick={() => toggleTask(task.id, task.completed)}
                        >
                            {task.completed ? "✅" : "⬜"}
                        </span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{
                                fontWeight: task.completed ? "400" : "500",
                                fontSize: "14px",
                                textDecoration: task.completed ? "line-through" : "none",
                                color: task.completed ? (darkMode ? "#9C8B76" : "#B3A18C") : deadlineColor,
                                wordBreak: "break-word",
                            }}>
                                {task.title}
                                {isFocusTask && (
                                    <span style={{
                                        marginLeft: "8px",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        background: "#f59e0b",
                                        color: "white",
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        verticalAlign: "middle",
                                    }}>
                                        🔥 Focus
                                    </span>
                                )}
                            </span>
                            {task.deadline && (
                                <div style={{ marginTop: "3px", fontSize: "12px", fontWeight: "500", color: deadlineColor === "#ef4444" || deadlineColor === "#f59e0b" ? deadlineColor : (darkMode ? "#B3A18C" : "#9C8B76") }}>
                                    Due: {task.deadline.split("T")[0]}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                            style={{ ...btnBase, background: darkMode ? "#6E5D4B" : "#E8D9C5", color: darkMode ? "#FFF8EF" : "#2E2013" }}
                            onClick={() => setIsEditing(true)}
                        >
                            Edit
                        </button>
                        <button
                            style={{ ...btnBase, background: "#ef4444", color: "white" }}
                            onClick={() => deleteTask(task.id)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}
