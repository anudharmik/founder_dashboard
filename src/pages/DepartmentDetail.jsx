import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import { calculateDepartmentProgress, calculateProjectProgress } from '../utils/rollupEngine';

export default function DepartmentDetail({ user, darkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, canManageProjects } = useOrg();
  const [department, setDepartment] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && activeOrg) {
      loadDepartmentDetails();
    }
  }, [id, activeOrg]);

  async function loadDepartmentDetails() {
    setLoading(true);
    try {
      // Fetch department info
      const { data: deptData, error: deptErr } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();

      if (deptErr) throw deptErr;
      setDepartment(deptData);

      // Fetch projects in this department with goals for rollup computation
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*, goals(id, weight, progress_computed, progress_override)')
        .eq('department_id', id)
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;
      setProjects(projData || []);
    } catch (err) {
      console.error("Error loading department details:", err);
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    background: darkMode ? "rgba(30,41,59,0.7)" : "#ffffff",
    border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.25)" : "0 4px 20px rgba(0,0,0,0.05)",
    backdropFilter: "blur(12px)",
  };

  if (loading) {
    return (
      <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
        <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 28, width: 220, marginBottom: 20, borderRadius: 6 }} />
        <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 140, borderRadius: 16, marginBottom: 28 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={cardStyle}>
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 20, width: "60%", marginBottom: 12, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 14, width: "80%", marginBottom: 16, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 8, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ color: darkMode ? "#f8fafc" : "#0f172a" }}>Department Not Found</h2>
        <button
          onClick={() => navigate('/departments')}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", marginTop: "12px" }}
        >
          ← Back to Departments
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Navigation breadcrumb */}
      <button
        onClick={() => navigate('/departments')}
        style={{ background: "none", border: "none", color: "#818cf8", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginBottom: "16px", padding: 0 }}
      >
        ← Back to Departments
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px"
            }}>
              🏢
            </div>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a", margin: 0 }}>
                {department.name}
              </h1>
              <p style={{ fontSize: "13px", color: darkMode ? "#94a3b8" : "#64748b", margin: 0 }}>
                Department in {activeOrg?.name} • Created {new Date(department.created_at).toLocaleDateString()}
              </p>

              {/* Department Progress Gauge */}
              {(() => {
                const deptProgress = calculateDepartmentProgress(projects);
                return (
                  <div style={{ marginTop: "14px", minWidth: "280px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: darkMode ? "#cbd5e1" : "#475569" }}>
                      <span>Department Progress</span>
                      <span style={{ color: "#6366f1", fontSize: "14px" }}>{deptProgress}%</span>
                    </div>
                    <div style={{ height: "7px", background: darkMode ? "#0f172a" : "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${Math.min(100, Math.max(0, deptProgress))}%`,
                        background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: "10px", transition: "width 0.3s ease"
                      }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {canManageProjects && (
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
            }}
          >
            ➕ Manage Projects
          </button>
        )}
      </div>

      {/* Projects List in Department */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", color: darkMode ? "#f1f5f9" : "#1e293b", margin: "0 0 16px" }}>
          Department Projects ({projects.length})
        </h3>

        {projects.length === 0 ? (
          <p style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "14px" }}>
            No projects have been assigned to this department yet.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects`)}
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                  border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
                  cursor: "pointer",
                  transition: "all 0.18s ease"
                }}
              >
                <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                  📁 {p.title}
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: darkMode ? "#94a3b8" : "#64748b", lineHeight: "1.4" }}>
                  {p.description || "No description provided."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
