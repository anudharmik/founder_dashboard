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
        <>
        <h1>Analytics</h1>
        {!selectedGoal && <p>Please select a goal</p>}
        {selectedGoal && (
            <GoalChart tasks={filteredTasks}/>
        )}
        <select
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

        <h2 style={{ marginTop: "40px" }}>All Goals Progress</h2>
        <GoalProgressChart goals={goals} tasks={tasks} />

        <h2 style={{ marginTop: "40px" }}>Weekly Progress</h2>
        <WeeklyChart tasks={tasks} />
        
        </>
    )
}