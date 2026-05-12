import {useState,useEffect} from 'react';
import {supabase} from '../supabaseClient';
import GoalCard from '../components/GoalCard'; 
import {useRef} from 'react';
import {useLocation} from "react-router-dom";
import toast from "react-hot-toast";

export default function Goals({user,goals,tasks,projects,setTasks,fetchGoals,fetchTasks,toggleTask,updateTask,updateGoal,darkMode,loading,aiInsights}){
    
    const[title,setTitle]=useState("");
    const[description,setDescription]=useState("");

    const [taskInputs,setTaskInputs]=useState({});
    const [deadlineInputs,setDeadlineInputs]=useState({});
    
    const taskInputRef=useRef(null);

    const[selectedProject,setSelectedProject]=useState("");
    const [filterProject, setFilterProject] = useState("");
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const projectFromURL = queryParams.get("project");

    useEffect(()=>{
    taskInputRef.current?.focus();
    },[]); 

    useEffect(() => {
    if(projectFromURL) {
    setFilterProject(projectFromURL);
    }
    }, [projectFromURL]);

    async function handleSubmit(e){
        e.preventDefault();
        if(!user){
            alert("you must be logged in");
            return;
        }

        const{error}=await supabase
        .from("goals")
        .insert([
            {title,
            description,
            progress:0,
            status:"active",
            user_id: user.id,
            project_id:selectedProject || null
            }
        ]);

        if(!error){
            setTitle("");
            setDescription("");
            fetchGoals();
            setSelectedProject("");
            toast.success("Goal added successfully");
        }else{
            toast.error("Failed to add goal");
        }
    }

    async function addTask(goalId){
        const title=taskInputs[goalId];
        const deadline=deadlineInputs[goalId];

        if(!title){
            return;
        }
        const {error} =await supabase
        .from("tasks")
        .insert([
            {
                title,
                goal_id: goalId,
                completed: false,
                user_id: user.id,
                deadline:deadline || null
            }
        ]);
        if(!error){
            setTaskInputs({
                ...taskInputs,
                [goalId]:""
            })
            setDeadlineInputs({
                ...deadlineInputs,
                [goalId]:""
            });
            fetchTasks();
            toast.success("Task added successfully");
        }else{
            toast.error("Failed to add task");
        }
    }



    async function deleteTask(taskId){
        const {error}=await supabase
        .from("tasks")
        .delete()
        .eq("id",taskId);

        if(!error){
            setTasks(prev=>prev.filter(task=> task.id!==taskId));
            toast.success("Task deleted successfully")
        }else{
            toast.error("Failed to delete task")
        }
    }

    async function deleteGoal(goalId){
        console.log("Deleting goal with ID:", goalId); // Debugging log
        const {error:taskError}= await supabase
        .from("tasks")
        .delete()
        .eq("goal_id",goalId);
        if(taskError){
            console.error("Error deleting tasks for goal:", taskError);
        }

        const {error:goalError}=await supabase
        .from("goals")
        .delete()
        .eq("id",goalId);
        if(goalError){
            console.error("Error deleting goal:", goalError);
        }
        if(!goalError){
            fetchGoals();
            fetchTasks();
            toast.success("Goal deleted successfully");
        }else{
            toast.error("Failed to delete goal");
        }
    }

    const buttonStyle = {
      padding: "10px 20px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      background: "#3b82f6",
      color: "white",
      fontWeight: "600",
      transition: "all 0.2s ease",
      boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)"
    };

    const inputStyle = {
        padding: "10px 14px",
        borderRadius: "8px",
        border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
        background: darkMode ? "#1e293b" : "#ffffff",
        color: darkMode ? "#f8fafc" : "#0f172a",
        outline: "none",
        width: "100%",
        maxWidth: "300px"
    };

    const selectStyle = {
        ...inputStyle,
        cursor: "pointer",
        appearance: "none",
        maxWidth: "200px"
    };

    {filterProject && (
    <p style={{ marginBottom: "10px", fontWeight: "bold" }}>
    Viewing goals for selected project
    </p>
    )}
    
    return (
    <div
    style={{
        maxWidth:"1100px",
        margin:"0 auto",
        padding:"20px"
    }}
    >
        {goals.length===0 && (
            <div style={{
                padding: "40px",
                textAlign: "center",
                background: darkMode ? "#1e293b" : "#ffffff",
                borderRadius: "16px",
                border: darkMode ? "1px dashed #334155" : "1px dashed #cbd5e1",
                marginTop: "20px",
                marginBottom: "30px"
            }}>
                <p style={{fontSize: "18px", color: darkMode ? "#94a3b8" : "#64748b", margin: 0}}>
                    No goals yet. Start by adding one 📈
                </p>
            </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
            <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "700" }}>Goals</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontWeight: "500", color: darkMode ? "#cbd5e1" : "#475569" }}>Add to Project:</span>
                <select
                style={selectStyle}
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                >
                <option value="">None</option>
                {projects.map(project => (
                    <option key={project.id} value={project.id}>
                    {project.title}
                    </option>
                ))}
                </select>
            </div>
        </div>

        <form onSubmit={handleSubmit} style={{ 
            display: "flex", 
            gap: "16px", 
            marginBottom: "30px", 
            flexWrap: "wrap",
            padding: "20px",
            background: darkMode ? "#1e293b" : "#f8fafc",
            borderRadius: "12px",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0"
        }}>
            <input 
            style={inputStyle}
            ref={taskInputRef}
            placeholder="Goal title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            />

            <input
            style={inputStyle}
            placeholder="Description"
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            />

            <button style={buttonStyle} type="submit" onMouseEnter={(e)=>e.target.style.background="#2563eb"} onMouseLeave={(e)=>e.target.style.background="#3b82f6"}>
                Add Goal
            </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span style={{ fontWeight: "500", color: darkMode ? "#cbd5e1" : "#475569" }}>Filter by Project:</span>
            <select
            style={selectStyle}
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            >
            <option value="">All Projects</option>

            {projects.map(project => (
                <option key={project.id} value={project.id}>
                {project.title}
                </option>
            ))}
            </select>
        </div>

        <ul>
        {goals
            .filter(goal =>
                filterProject ? goal.project_id === filterProject : true
            )
            .map(goal => (
                <GoalCard
                key={goal.id}
                goal={goal}
                tasks={tasks}
                taskInputs={taskInputs}
                setTaskInputs={setTaskInputs}
                addTask={addTask}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                deleteGoal={deleteGoal}
                deadlineInputs={deadlineInputs}
                setDeadlineInputs={setDeadlineInputs}
                updateTask={updateTask}
                updateGoal={updateGoal}
                darkMode={darkMode}
                aiInsights={aiInsights}
                />

            ))}
        </ul>

    </div>
    )
}