import {useState} from "react";
import GoalChart from "../components/GoalChart";
import GoalProgressChart from "../components/GoalProgressChart"
import WeeklyChart from "../components/WeeklyChart";

export default function Analytics({goals,tasks}){
    const [selectedGoal,setSelectedGoal]=useState("");

    const filteredTasks=tasks.filter(
        task=>task.goal_id===selectedGoal
    );

    return (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
        <h1 style={{ margin: "0 0 24px 0", fontSize: "32px", fontWeight: "700" }}>Analytics</h1>
        
        <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px", 
            marginBottom: "24px",
            background: "var(--card-bg, #ffffff)",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
            <span style={{ fontWeight: "500" }}>Select Goal:</span>
            <select
                style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    outline: "none",
                    cursor: "pointer",
                    minWidth: "200px"
                }}
                value={selectedGoal}
                onChange={(e)=>setSelectedGoal(e.target.value)}
            >
                <option value="">Select Goal</option>
                {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                    {goal.title}
                    </option>
                ))}
            </select>
        </div>

        <div style={{
            padding: "24px",
            borderRadius: "16px",
            background: "var(--card-bg, #ffffff)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            marginBottom: "32px"
        }}>
            <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Goal Specific Progress</h2>
            {!selectedGoal && <p style={{ color: "#64748b" }}>Please select a goal to view its tasks progress.</p>}
            {selectedGoal && (
                <GoalChart tasks={filteredTasks}/>
            )}
        </div>

        <div style={{
            padding: "24px",
            borderRadius: "16px",
            background: "var(--card-bg, #ffffff)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            marginBottom: "32px"
        }}>
            <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>All Goals Progress</h2>
            <GoalProgressChart goals={goals} tasks={tasks} />
        </div>

        <div style={{
            padding: "24px",
            borderRadius: "16px",
            background: "var(--card-bg, #ffffff)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            marginBottom: "32px"
        }}>
            <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Weekly Progress</h2>
            <WeeklyChart tasks={tasks} />
        </div>
        </div>
    )
}