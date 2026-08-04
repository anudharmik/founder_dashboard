import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectDocs from "./pages/ProjectDocs";
import DocDetail from "./pages/DocDetail";
import GoalDetail from "./pages/GoalDetail";
import Analytics from "./pages/Analytics";
import Departments from "./pages/Departments";
import DepartmentDetail from "./pages/DepartmentDetail";
import Teams from "./pages/Teams";
import OrgSettings from "./pages/OrgSettings";
import Billing from "./pages/Billing";
import ResetPassword from "./pages/ResetPassword";
import ReminderModal from "./components/reminder/ReminderModal";
import CreateOrgOnboarding from "./components/CreateOrgOnboarding";
import UserProfileOnboarding from "./components/UserProfileOnboarding";
import { OrgProvider, useOrg } from "./context/OrgContext";
import { Toaster } from "react-hot-toast";

function AppContent({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable ||
        e.target.closest('[contenteditable="true"]') ||
        e.target.closest('.ProseMirror')
      ) {
        return;
      }

      if (e.key === "g") navigate("/goals");
      if (e.key === "t") navigate("/tasks");
      if (e.key === "d") navigate("/");
      if (e.key === "n") navigate("/goals");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  return children;
}

function MainAppContent({ user, darkMode, setDarkMode }) {
  const { activeOrg, userRole, isEmployee, isGuest, loadingOrg } = useOrg() || {};

  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [aiInsights, setAiInsights] = useState({ focusToday: [], risk: "", insight: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  const lastFetchedHashRef = useRef(null);

  if (!loadingOrg && !activeOrg) {
    return <CreateOrgOnboarding user={user} darkMode={darkMode} />;
  }

  const scopeKey = isEmployee ? `emp_${user?.id}` : (isGuest ? 'guest' : 'org');
  const cacheKeyHash = activeOrg ? `aiInsightsHash_${activeOrg.id}_${scopeKey}` : null;
  const cacheKeyData = activeOrg ? `aiInsightsCache_${activeOrg.id}_${scopeKey}` : null;

  function buildTasksHash(taskList) {
    if (!taskList || !activeOrg?.id || isGuest) return "";
    const taskStr = taskList
      .map(t => `${t.id}|${t.title}|${t.completed ? '1' : '0'}|${t.deadline || ''}`)
      .sort()
      .join('##');
    return `${activeOrg.id}:${scopeKey}:${taskStr}`;
  }

  async function fetchAIInsights(hash, taskSet) {
    if (!taskSet || !taskSet.length || isGuest || !activeOrg?.id) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: taskSet }),
      });
      if (!res.ok) throw new Error("Failed to fetch AI insights");
      const data = await res.json();
      setAiInsights(data);
      if (cacheKeyData && cacheKeyHash) {
        sessionStorage.setItem(cacheKeyData, JSON.stringify(data));
        sessionStorage.setItem(cacheKeyHash, hash);
      }
      lastFetchedHashRef.current = hash;
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setAiLoading(false);
    }
  }

  function refreshAIInsights() {
    if (isGuest || !activeOrg?.id) return;
    const taskSet = isEmployee
      ? tasks.filter(t => t.assignee_id === user?.id)
      : tasks;
    lastFetchedHashRef.current = null;
    if (cacheKeyHash) sessionStorage.removeItem(cacheKeyHash);
    if (cacheKeyData) sessionStorage.removeItem(cacheKeyData);
    fetchAIInsights(buildTasksHash(taskSet), taskSet);
  }

  useEffect(() => {
    if (user && activeOrg) {
      fetchGoals();
      fetchTasks();
      fetchProjects();
    } else {
      setGoals([]);
      setTasks([]);
      setProjects([]);
      setLoading(false);
    }
  }, [user, activeOrg]);

  useEffect(() => {
    if (isGuest || !activeOrg?.id || tasks.length === 0) {
      setAiInsights({ focusToday: [], risk: "", insight: "" });
      return;
    }

    const taskSet = isEmployee
      ? tasks.filter(t => t.assignee_id === user?.id)
      : tasks;

    if (taskSet.length === 0) {
      setAiInsights({ focusToday: [], risk: "", insight: "" });
      return;
    }

    const hash = buildTasksHash(taskSet);
    if (!hash) return;

    if (lastFetchedHashRef.current === hash) return;

    const cachedHash    = cacheKeyHash ? sessionStorage.getItem(cacheKeyHash) : null;
    const cachedInsights = cacheKeyData ? sessionStorage.getItem(cacheKeyData) : null;

    if (cachedHash === hash && cachedInsights) {
      try {
        setAiInsights(JSON.parse(cachedInsights));
        lastFetchedHashRef.current = hash;
        return;
      } catch (err) {
        // fallback
      }
    }

    fetchAIInsights(hash, taskSet);
  }, [tasks, activeOrg?.id, userRole, user?.id]);

  async function fetchGoals() {
    if (!activeOrg?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("org_id", activeOrg.id)
      .order("created_at", { ascending: false });

    setGoals(data || []);
    setLoading(false);
  }

  async function fetchTasks() {
    if (!activeOrg?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("org_id", activeOrg.id)
      .order("created_at", { ascending: false });

    setTasks(data || []);
    setLoading(false);
  }

  async function fetchProjects() {
    if (!activeOrg?.id) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("org_id", activeOrg.id)
      .order("created_at", { ascending: false });

    setProjects(data || []);
  }

  async function toggleTask(taskId, completed) {
    const newCompleted = !completed;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              completed: newCompleted,
              completed_at: completedAt
            }
          : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        completed: newCompleted,
        completed_at: completedAt
      })
      .eq("id", taskId);

    if (error) {
      fetchTasks();
    }
  }

  async function updateTask(taskId, newTitle, newDeadline) {
    const { error } = await supabase
      .from("tasks")
      .update({
        title: newTitle,
        deadline: newDeadline || null
      })
      .eq("id", taskId);

    if (!error) {
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, title: newTitle, deadline: newDeadline || null }
            : task
        )
      );
    } else {
      fetchTasks();
    }
  }

  async function updateGoal(goalId, newTitle, newDescription) {
    const { error } = await supabase
      .from("goals")
      .update({
        title: newTitle,
        description: newDescription
      })
      .eq("id", goalId);

    if (!error) {
      setGoals(prev =>
        prev.map(goal =>
          goal.id === goalId ? { ...goal, title: newTitle, description: newDescription } : goal
        )
      );
    } else {
      fetchGoals();
    }
  }

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f3f4f6",
      color: darkMode ? "white" : "black",
      minHeight: "100vh",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      transition: "all 0.3s ease"
    }}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: darkMode ? "#1e293b" : "#ffffff",
            color: darkMode ? "#e2e8f0" : "#111827",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
            borderRadius: "10px"
          },
          error: { style: { border: "1px solid #ef4444" } },
          success: { style: { border: "1px solid #22c55e" } },
        }}
      />

      <button
        onClick={() => setDarkMode(!darkMode)}
        aria-label="Toggle dark mode"
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "10px 18px",
          borderRadius: "30px",
          border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
          background: darkMode ? "rgba(30,41,59,0.85)" : "rgba(255,255,255,0.9)",
          color: darkMode ? "#f1f5f9" : "#0f172a",
          boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.12)",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "13px",
          zIndex: 1000,
          transition: "all 0.2s ease",
          backdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "-0.1px",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      >
        <span style={{ fontSize: "15px" }}>{darkMode ? "☀️" : "🌙"}</span>
        {darkMode ? "Light" : "Dark"}
      </button>

      <BrowserRouter>
        <Layout darkMode={darkMode} onOpenReminders={() => setIsReminderOpen(true)}>
          <div style={{ flex: 1 }}>
            <AppContent>
              <Routes>
                <Route path="/" element={<Dashboard user={user} goals={goals} tasks={tasks} darkMode={darkMode} loading={loading} aiInsights={aiInsights} aiLoading={aiLoading} refreshAIInsights={refreshAIInsights} />} />
                <Route path="/departments" element={<Departments darkMode={darkMode} />} />
                <Route path="/departments/:id" element={<DepartmentDetail user={user} darkMode={darkMode} />} />
                <Route path="/teams" element={<Teams darkMode={darkMode} />} />
                <Route path="/projects" element={<Projects darkMode={darkMode} />} />
                <Route path="/projects/:id" element={<ProjectDetail darkMode={darkMode} />} />
                <Route path="/projects/:id/docs" element={<ProjectDocs user={user} darkMode={darkMode} />} />
                <Route path="/projects/:id/docs/:docId" element={<DocDetail user={user} darkMode={darkMode} />} />
                <Route path="/goals" element={<Goals user={user} goals={goals} tasks={tasks} projects={projects} setTasks={setTasks} fetchGoals={fetchGoals} fetchTasks={fetchTasks} toggleTask={toggleTask} updateTask={updateTask} updateGoal={updateGoal} darkMode={darkMode} loading={loading} aiInsights={aiInsights} />} />
                <Route path="/goals/:id" element={<GoalDetail darkMode={darkMode} />} />
                <Route path="/tasks" element={<Tasks user={user} tasks={tasks} goals={goals} toggleTask={toggleTask} darkMode={darkMode} loading={loading} />} />
                <Route path="/analytics" element={<Analytics user={user} goals={goals} tasks={tasks} darkMode={darkMode} loading={loading} />} />
                <Route path="/settings/org" element={<OrgSettings user={user} darkMode={darkMode} />} />
                <Route path="/settings/billing" element={<Billing darkMode={darkMode} />} />
              </Routes>
            </AppContent>
          </div>
        </Layout>
        <ReminderModal
          isOpen={isReminderOpen}
          onClose={() => setIsReminderOpen(false)}
          user={user}
          darkMode={darkMode}
        />
      </BrowserRouter>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [needsProfileOnboarding, setNeedsProfileOnboarding] = useState(false);

  useEffect(() => {
    async function checkProfile(u) {
      if (!u) {
        setNeedsProfileOnboarding(false);
        return;
      }
      try {
        const { data } = await supabase.from('profiles').select('id').eq('id', u.id).single();
        if (!data) {
          setNeedsProfileOnboarding(true);
        } else {
          setNeedsProfileOnboarding(false);
        }
      } catch (err) {
        setNeedsProfileOnboarding(true);
      }
    }

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user || null;
      setUser(u);
      checkProfile(u);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      checkProfile(u);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isResetPath = window.location.pathname === '/reset-password';

  if (isResetPath) {
    return <ResetPassword />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <OrgProvider user={user}>
      {needsProfileOnboarding && (
        <UserProfileOnboarding
          user={user}
          darkMode={darkMode}
          onComplete={() => setNeedsProfileOnboarding(false)}
        />
      )}
      <MainAppContent user={user} darkMode={darkMode} setDarkMode={setDarkMode} />
    </OrgProvider>
  );
}
