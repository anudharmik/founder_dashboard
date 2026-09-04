import TaskList from "./TaskList";
import "../App.css";
import { useState } from "react";
import { Link } from "react-router-dom";

const ACCENTS = ["#f15e1c", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#fab60a"];

export default function GoalCard({ goal, tasks, taskInputs, setTaskInputs, addTask, toggleTask, deleteTask, deleteGoal, deadlineInputs, setDeadlineInputs, updateTask, updateGoal, darkMode, aiInsights = { focusToday: [] }, accentIndex = 0 }) {
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editedGoalTitle, setEditedGoalTitle] = useState(goal.title);
    const [editedGoalDescription, setEditedGoalDescription] = useState(goal.description);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const accent = ACCENTS[accentIndex % ACCENTS.length];

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
        borderRadius: "10px",
        border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid #E8D9C5",
        background: darkMode ? "rgba(15,23,42,0.8)" : "#ffffff",
        color: darkMode ? "#FFF8EF" : "#2E2013",
        outline: "none",
        fontSize: "14px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "inherit",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    };

    const btnBase = {
        padding: "8px 16px", borderRadius: "8px", border: "none",
        cursor: "pointer", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap",
        fontFamily: "inherit",
    };

    return (
        <div
            className="stagger-item"
            style={{
                marginBottom: "20px", padding: "0",
                borderRadius: "16px",
                background: darkMode ? "#1E140C" : "#ffffff",
                color: darkMode ? "#E8D9C5" : "#2E2013",
                boxShadow: darkMode
                    ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)"
                    : "0 1px 3px rgba(0,0,0,0.05), 0 10px 24px -4px rgba(15,23,42,0.06), 0 0 0 1px rgba(226,232,240,0.8)",
                border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E8D9C5",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                overflow: "hidden",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = darkMode
                    ? "0 8px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(241, 94, 28, 0.4)"
                    : "0 12px 32px -4px rgba(241, 94, 28, 0.18), 0 2px 6px rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = darkMode
                    ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)"
                    : "0 1px 3px rgba(0,0,0,0.05), 0 10px 24px -4px rgba(15,23,42,0.06), 0 0 0 1px rgba(226,232,240,0.8)";
            }}
        >
            {/* Accent left stripe */}
            <div style={{ position: "absolute", display: "none" }}></div>
            <div style={{ display: "flex" }}>
                <div style={{ width: "4px", background: `linear-gradient(to bottom, ${accent}, ${accent}60)`, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "24px" }}>

                    {/* Goal header / edit */}
                    {isEditingGoal ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", animation: "slideDown 0.2s ease" }}>
                            <input
                                style={inputBase}
                                value={editedGoalTitle}
                                onChange={(e) => setEditedGoalTitle(e.target.value)}
                                placeholder="Goal title"
                                onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}25`; }}
                                onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.12)" : "#E8D9C5"; e.target.style.boxShadow = "none"; }}
                            />
                            <textarea
                                style={{ ...inputBase, minHeight: "72px", resize: "vertical" }}
                                value={editedGoalDescription}
                                onChange={(e) => setEditedGoalDescription(e.target.value)}
                                placeholder="Description"
                                onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}25`; }}
                                onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.12)" : "#E8D9C5"; e.target.style.boxShadow = "none"; }}
                            />
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <button
                                    style={{ ...btnBase, background: "linear-gradient(135deg, #2e936f, #24785a)", color: "white", boxShadow: "0 2px 8px rgba(46, 147, 111, 0.35)" }}
                                    onClick={handleSaveGoal}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                                >Save Changes</button>
                                <button
                                    style={{ ...btnBase, background: darkMode ? "#4A3C2C" : "#FFF3E2", color: darkMode ? "#FFF8EF" : "#2E2013" }}
                                    onClick={() => setIsEditingGoal(false)}
                                >Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: "700", color: darkMode ? "#FFF3E2" : "#2E2013" }}>
                                        <Link to={`/goals/${goal.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                                            {goal.title}
                                        </Link>
                                    </h2>
                                    {goal.description && (
                                        <p style={{ margin: 0, fontSize: "13px", color: darkMode ? "#9C8B76" : "#B3A18C", lineHeight: "1.5" }}>
                                            {goal.description}
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                    {goal.project_id && (
                                        <Link
                                            to={`/projects/${goal.project_id}/docs`}
                                            style={{
                                                ...btnBase,
                                                background: darkMode ? "rgba(241, 94, 28, 0.18)" : "#FFF3E2",
                                                color: "#f15e1c",
                                                textDecoration: "none",
                                                fontSize: "12px",
                                                fontWeight: "700",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                        >
                                            📄 Project Docs
                                        </Link>
                                    )}
                                    <Link
                                        to={`/goals/${goal.id}`}
                                        style={{
                                            ...btnBase,
                                            background: darkMode ? "rgba(255,255,255,0.06)" : "#FFF3E2",
                                            color: darkMode ? "#D5C2A5" : "#6E5D4B",
                                            textDecoration: "none",
                                            fontSize: "12px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}
                                    >
                                        🎯 View Details →
                                    </Link>
                                    <button
                                        style={{
                                            ...btnBase, background: darkMode ? "#4A3C2C" : "#FFF3E2",
                                            color: darkMode ? "#B3A18C" : "#9C8B76", flexShrink: 0, fontSize: "12px",
                                        }}
                                        onClick={() => setIsEditingGoal(true)}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#6E5D4B" : "#E8D9C5"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? "#4A3C2C" : "#FFF3E2"; }}
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div style={{ marginBottom: "6px" }}>
                        <div style={{ height: "6px", background: darkMode ? "#2E2013" : "#FFF3E2", borderRadius: "6px", overflow: "hidden" }}>
                            <div style={{
                                width: `${progress}%`, height: "100%",
                                background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
                                borderRadius: "6px", transition: "width 0.6s ease-out",
                            }} />
                        </div>
                        <p style={{ fontSize: "12px", fontWeight: "600", color: darkMode ? "#9C8B76" : "#B3A18C", margin: "6px 0 20px", display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: accent }}>{progress}% complete</span>
                            <span>{completedTasks.length}/{goalTasks.length} tasks</span>
                        </p>
                    </div>

                    {/* Add task row */}
                    <div style={{
                        marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "8px",
                        alignItems: "flex-end",
                        background: darkMode ? "rgba(15,23,42,0.5)" : "#FFF8EF",
                        padding: "14px 16px", borderRadius: "12px",
                        border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #FFF3E2",
                    }}>
                        <input
                            style={{ ...inputBase, flex: "1 1 160px", minWidth: 0, width: "auto" }}
                            placeholder="New task…"
                            value={taskInputs[goal.id] || ""}
                            onChange={(e) => setTaskInputs({ ...taskInputs, [goal.id]: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(goal.id); } }}
                            onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}25`; }}
                            onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.12)" : "#E8D9C5"; e.target.style.boxShadow = "none"; }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "500", color: darkMode ? "#B3A18C" : "#9C8B76", whiteSpace: "nowrap" }}>Deadline</span>
                            <input
                                style={{ ...inputBase, width: "auto", cursor: "pointer" }}
                                type="date"
                                value={deadlineInputs[goal.id] || ""}
                                onChange={(e) => setDeadlineInputs({ ...deadlineInputs, [goal.id]: e.target.value })}
                                onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}25`; }}
                                onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.12)" : "#E8D9C5"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                        <button
                            style={{
                                ...btnBase, background: "linear-gradient(135deg, #2e936f, #24785a)",
                                color: "white", boxShadow: "0 2px 8px rgba(46, 147, 111, 0.3)",
                                transition: "all 0.18s ease",
                            }}
                            onClick={() => addTask(goal.id)}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(46, 147, 111, 0.4)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(46, 147, 111, 0.3)"; }}
                        >
                            + Add Task
                        </button>
                    </div>

                    {/* Task list */}
                    <h3 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", color: darkMode ? "#B3A18C" : "#9C8B76", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        📝 Tasks
                    </h3>
                    <TaskList
                        tasks={tasks} goalId={goal.id} toggleTask={toggleTask}
                        deleteTask={deleteTask} updateTask={updateTask}
                        darkMode={darkMode} aiInsights={aiInsights}
                    />

                    {/* Delete goal */}
                    <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center" }}>
                        {confirmDelete ? (
                            <>
                                <span style={{ fontSize: "13px", color: darkMode ? "#B3A18C" : "#9C8B76" }}>Sure?</span>
                                <button
                                    style={{ ...btnBase, background: "#ef4444", color: "white", padding: "6px 14px", fontSize: "12px" }}
                                    onClick={() => deleteGoal(goal.id)}
                                >Yes, delete</button>
                                <button
                                    style={{ ...btnBase, background: darkMode ? "#4A3C2C" : "#FFF3E2", color: darkMode ? "#B3A18C" : "#9C8B76", padding: "6px 14px", fontSize: "12px" }}
                                    onClick={() => setConfirmDelete(false)}
                                >Cancel</button>
                            </>
                        ) : (
                            <button
                                style={{
                                    ...btnBase, background: "transparent",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    color: "rgba(239,68,68,0.7)", padding: "6px 16px", fontSize: "12px",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; e.currentTarget.style.color = "#ef4444"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; e.currentTarget.style.color = "rgba(239,68,68,0.7)"; }}
                                onClick={() => setConfirmDelete(true)}
                            >
                                Delete Goal
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
