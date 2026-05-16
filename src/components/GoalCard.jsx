import TaskList from "./TaskList";
import "../App.css";
import { useState } from "react";

export default function GoalCard({ goal, tasks, taskInputs, setTaskInputs, addTask, toggleTask, deleteTask, deleteGoal, deadlineInputs, setDeadlineInputs, updateTask, updateGoal, darkMode, aiInsights }) {
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editedGoalTitle, setEditedGoalTitle] = useState(goal.title);
    const [editedGoalDescription, setEditedGoalDescription] = useState(goal.description);

    const goalTasks = tasks.filter(task => task.goal_id === goal.id);
    const completedTasks = goalTasks.filter(task => task.completed);
    const progress = goalTasks.length === 0
        ? 0
        : Math.round((completedTasks.length / goalTasks.length) * 100);

    async function handleSaveGoal() {
        await updateGoal(goal.id, editedGoalTitle, editedGoalDescription);
        setIsEditingGoal(false);
    }

    const inputBase = {
        padding: "10px 14px",
        borderRadius: "8px",
        border: darkMode ? "1px solid #475569" : "1px solid #cbd5e1",
        background: darkMode ? "#1e293b" : "#ffffff",
        color: darkMode ? "#f8fafc" : "#0f172a",
        outline: "none",
        fontSize: "14px",
        width: "100%",
        boxSizing: "border-box",
    };

    const btnBase = {
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "13px",
        whiteSpace: "nowrap",
    };

    return (
        <div style={{
            marginBottom: "24px",
            padding: "24px",
            borderRadius: "16px",
            background: darkMode ? "#1e293b" : "#ffffff",
            color: darkMode ? "#e2e8f0" : "#111827",
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.05)",
            border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)",
            transition: "all 0.3s ease",
        }}>
            {isEditingGoal ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                    <input
                        style={inputBase}
                        value={editedGoalTitle}
                        onChange={(e) => setEditedGoalTitle(e.target.value)}
                        placeholder="Goal title"
                    />
                    <textarea
                        style={{ ...inputBase, minHeight: "72px", resize: "vertical" }}
                        value={editedGoalDescription}
                        onChange={(e) => setEditedGoalDescription(e.target.value)}
                        placeholder="Description"
                    />
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button style={{ ...btnBase, background: "#10b981", color: "white" }} onClick={handleSaveGoal}>Save</button>
                        <button style={{ ...btnBase, background: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f8fafc" : "#0f172a" }} onClick={() => setIsEditingGoal(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                        <div>
                            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                                {goal.title}
                            </h2>
                            {goal.description && (
                                <p style={{ margin: 0, fontSize: "13px", color: darkMode ? "#64748b" : "#94a3b8", lineHeight: "1.5" }}>
                                    {goal.description}
                                </p>
                            )}
                        </div>
                        <button
                            style={{ ...btnBase, background: darkMode ? "#334155" : "#f1f5f9", color: darkMode ? "#94a3b8" : "#64748b", flexShrink: 0 }}
                            onClick={() => setIsEditingGoal(true)}
                        >
                            ✏️ Edit
                        </button>
                    </div>
                </div>
            )}

            {/* Progress bar */}
            <div style={{ height: "8px", background: darkMode ? "#334155" : "#e2e8f0", borderRadius: "8px", margin: "16px 0 8px 0", overflow: "hidden" }}>
                <div style={{
                    width: `${progress}%`,
                    background: "linear-gradient(to right, #22c55e, #10b981)",
                    height: "100%",
                    borderRadius: "8px",
                    transition: "width 0.5s ease-out",
                }} />
            </div>
            <p style={{ fontSize: "13px", fontWeight: "600", color: darkMode ? "#94a3b8" : "#64748b", marginBottom: "20px" }}>
                {progress}% complete · {completedTasks.length}/{goalTasks.length} tasks
            </p>

            {/* Add task row — stacks on mobile */}
            <div style={{
                marginBottom: "24px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "flex-end",
                background: darkMode ? "#334155" : "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
            }}>
                <input
                    style={{ ...inputBase, flex: "1 1 160px", minWidth: 0 }}
                    placeholder="New task title…"
                    value={taskInputs[goal.id] || ""}
                    onChange={(e) => setTaskInputs({ ...taskInputs, [goal.id]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(goal.id); } }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "0 1 auto" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: darkMode ? "#cbd5e1" : "#475569", whiteSpace: "nowrap" }}>Deadline:</span>
                    <input
                        style={{ ...inputBase, width: "auto", cursor: "pointer" }}
                        type="date"
                        value={deadlineInputs[goal.id] || ""}
                        onChange={(e) => setDeadlineInputs({ ...deadlineInputs, [goal.id]: e.target.value })}
                    />
                </div>
                <button
                    style={{ ...btnBase, background: "#10b981", color: "white", boxShadow: "0 2px 6px rgba(16,185,129,0.3)", flex: "0 0 auto" }}
                    onClick={() => addTask(goal.id)}
                >
                    + Add Task
                </button>
            </div>

            {/* Task list */}
            <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                <span>📝</span> Tasks
            </h3>
            <TaskList
                tasks={tasks}
                goalId={goal.id}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                updateTask={updateTask}
                darkMode={darkMode}
                aiInsights={aiInsights}
            />

            {/* Delete goal */}
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button
                    style={{
                        ...btnBase,
                        background: "transparent",
                        border: "1px solid rgba(239,68,68,0.35)",
                        color: "#ef4444",
                        padding: "8px 18px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ef4444"; }}
                    onClick={() => deleteGoal(goal.id)}
                >
                    Delete Goal
                </button>
            </div>
        </div>
    );
}
