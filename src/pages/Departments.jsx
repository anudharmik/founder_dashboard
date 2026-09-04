import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import { calculateDepartmentProgress, calculateProjectProgress } from '../utils/rollupEngine';
import toast from 'react-hot-toast';

export default function Departments({ darkMode }) {
  const navigate = useNavigate();
  const { activeOrg, isOwner, canManageDepartments } = useOrg();
  const [departments, setDepartments] = useState([]);
  const [projectCounts, setProjectCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      fetchDepartments();
    }
  }, [activeOrg]);

  async function fetchDepartments() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*, projects(*, goals(id, weight, progress_computed, progress_override))')
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepartments(data || []);

      const counts = {};
      (data || []).forEach(d => {
        counts[d.id] = d.projects ? d.projects.length : 0;
      });
      setProjectCounts(counts);
    } catch (err) {
      console.error("Fetch departments error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!deptName.trim() || !activeOrg) return;
    setSubmitting(true);
    try {
      if (editingDeptId) {
        const { error } = await supabase
          .from('departments')
          .update({ name: deptName.trim() })
          .eq('id', editingDeptId);
        if (error) throw error;
        toast.success("Department updated!");
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({
            org_id: activeOrg.id,
            name: deptName.trim()
          });
        if (error) throw error;
        toast.success("Department created!");
      }
      setIsModalOpen(false);
      setDeptName('');
      setEditingDeptId(null);
      fetchDepartments();
    } catch (err) {
      toast.error(err.message || "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(deptId, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure? Deleting a department will affect associated projects.")) return;
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deptId);
      if (error) throw error;
      toast.success("Department deleted.");
      fetchDepartments();
    } catch (err) {
      toast.error(err.message || "Failed to delete department");
    }
  }

  function handleOpenEdit(dept, e) {
    e.stopPropagation();
    setEditingDeptId(dept.id);
    setDeptName(dept.name);
    setIsModalOpen(true);
  }

  const cardStyle = {
    background: darkMode ? "rgba(30,41,59,0.7)" : "#ffffff",
    border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E8D9C5",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.25)" : "0 4px 20px rgba(0,0,0,0.05)",
    backdropFilter: "blur(12px)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  if (!activeOrg) {
    return (
      <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ color: darkMode ? "#FFF8EF" : "#2E2013" }}>Departments</h2>
        <p style={{ color: darkMode ? "#B3A18C" : "#9C8B76" }}>Please select or create an organization first.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013", margin: "0 0 6px" }}>
            Departments
          </h1>
          <p style={{ fontSize: "14px", color: darkMode ? "#B3A18C" : "#9C8B76", margin: 0 }}>
            Organizational units for grouping projects and strategic goals within {activeOrg.name}.
          </p>
        </div>

        {canManageDepartments && (
          <button
            onClick={() => { setEditingDeptId(null); setDeptName(''); setIsModalOpen(true); }}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #f15e1c, #fab60a)",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(241, 94, 28, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>➕</span> New Department
          </button>
        )}
      </div>

      {/* Grid of Department Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={cardStyle}>
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 22, width: "60%", marginBottom: 12, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 14, width: "40%", marginBottom: 20, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 8, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px" }}>
          <span style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}>🏢</span>
          <h3 style={{ margin: "0 0 8px", color: darkMode ? "#FFF3E2" : "#1E140C" }}>No Departments Created Yet</h3>
          <p style={{ fontSize: "13px", color: darkMode ? "#B3A18C" : "#9C8B76", margin: "0 0 20px" }}>
            {canManageDepartments ? "Create your first department to start structuring projects and teams." : "No departments exist in this organization yet."}
          </p>
          {canManageDepartments && (
            <button
              onClick={() => { setEditingDeptId(null); setDeptName(''); setIsModalOpen(true); }}
              style={{
                padding: "10px 20px", borderRadius: "10px", border: "none", background: "#f15e1c", color: "#fff", fontWeight: "700", cursor: "pointer"
              }}
            >
              Add Department
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {departments.map((dept) => (
            <div
              key={dept.id}
              style={cardStyle}
              onClick={() => navigate(`/departments/${dept.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = darkMode ? "0 8px 28px rgba(0,0,0,0.4)" : "0 8px 28px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = cardStyle.boxShadow;
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "10px",
                    background: "rgba(241, 94, 28, 0.15)", border: "1px solid rgba(241, 94, 28, 0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px"
                  }}>
                    🏢
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                      {dept.name}
                    </h3>
                    <span style={{ fontSize: "11px", color: darkMode ? "#9C8B76" : "#B3A18C" }}>
                      Created {new Date(dept.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {canManageDepartments && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={(e) => handleOpenEdit(dept, e)}
                      title="Edit Department"
                      style={{ background: "none", border: "none", color: "#f15e1c", cursor: "pointer", fontSize: "14px" }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => handleDelete(dept.id, e)}
                      title="Delete Department"
                      style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "14px" }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {/* Department Progress Bar */}
              {(() => {
                const deptProgress = calculateDepartmentProgress(dept.projects || []);
                return (
                  <div style={{ marginTop: "12px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: darkMode ? "#D5C2A5" : "#6E5D4B" }}>
                      <span>Department Progress</span>
                      <span style={{ color: "#f15e1c", fontWeight: "700" }}>{deptProgress}%</span>
                    </div>
                    <div style={{ height: "6px", background: darkMode ? "#2E2013" : "#E8D9C5", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${Math.min(100, Math.max(0, deptProgress))}%`,
                        background: "linear-gradient(90deg, #f15e1c, #fab60a)", borderRadius: "10px", transition: "width 0.3s ease"
                      }} />
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #FFF3E2" }}>
                <span style={{ fontSize: "13px", color: darkMode ? "#B3A18C" : "#9C8B76" }}>
                  Projects: <strong style={{ color: "#f15e1c" }}>{projectCounts[dept.id] || 0}</strong>
                </span>
                <span style={{ fontSize: "12px", color: "#f15e1c", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                  View Projects →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating / Editing Department */}
      {isModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div style={{
            background: darkMode ? "#2E2013" : "#ffffff",
            border: darkMode ? "1px solid #1E140C" : "1px solid #D5C2A5",
            borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "420px"
          }}>
            <h3 style={{ margin: "0 0 16px", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
              {editingDeptId ? "Edit Department" : "Create New Department"}
            </h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#D5C2A5" : "#6E5D4B", marginBottom: "6px" }}>
                  DEPARTMENT NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Product, Growth"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: darkMode ? "1px solid #4A3C2C" : "1px solid #D5C2A5",
                    background: darkMode ? "#1E140C" : "#FFF8EF",
                    color: darkMode ? "#fff" : "#000",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #9C8B76", background: "transparent", color: darkMode ? "#D5C2A5" : "#6E5D4B", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#f15e1c", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                >
                  {submitting ? "Saving..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
