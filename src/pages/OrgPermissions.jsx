import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function OrgPermissions({ user, darkMode }) {
  const navigate = useNavigate();
  const { activeOrg, userRole, getMemberDisplayName } = useOrg() || {};
  const [grants, setGrants] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [scopeType, setScopeType] = useState('project'); // 'department' | 'project'
  const [scopeId, setScopeId] = useState('');
  const [grantRole, setGrantRole] = useState('manager');
  const [submitting, setSubmitting] = useState(false);

  const canManage = userRole === 'owner' || userRole === 'manager';

  useEffect(() => {
    if (activeOrg) {
      loadPermissionsData();
    }
  }, [activeOrg]);

  async function loadPermissionsData() {
    if (!activeOrg) return;
    setLoading(true);
    try {
      // 1. Fetch scoped_permissions
      const { data: grantsData } = await supabase
        .from('scoped_permissions')
        .select('*')
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: false });

      setGrants(grantsData || []);

      // 2. Fetch org_members
      const { data: memsData } = await supabase
        .from('org_members')
        .select('id, user_id, role')
        .eq('org_id', activeOrg.id);

      setMembers(memsData || []);

      // 3. Fetch departments
      const { data: deptsData } = await supabase
        .from('departments')
        .select('id, name')
        .eq('org_id', activeOrg.id);

      setDepartments(deptsData || []);

      // 4. Fetch projects
      const { data: projsData } = await supabase
        .from('projects')
        .select('id, title')
        .eq('org_id', activeOrg.id);

      setProjects(projsData || []);

    } catch (err) {
      console.error("Error loading scoped permissions data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGrantPermission(e) {
    e.preventDefault();
    if (!canManage) {
      toast.error("Permission denied: Only Owners and Managers can grant scoped permissions.");
      return;
    }

    if (!selectedUserId || !scopeId) {
      toast.error("Please select a user and target entity scope.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('scoped_permissions')
        .upsert({
          org_id: activeOrg.id,
          user_id: selectedUserId,
          scope_type: scopeType,
          scope_id: scopeId,
          role: grantRole,
          granted_by: user?.id
        }, { onConflict: 'user_id,scope_type,scope_id' });

      if (error) {
        toast.error(error.message || "Failed to grant scoped permission");
      } else {
        toast.success(`Granted ${grantRole} role for selected ${scopeType}!`);
        setShowGrantModal(false);
        setSelectedUserId('');
        setScopeId('');
        loadPermissionsData();
      }
    } catch (err) {
      toast.error("Error granting scoped permission");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeGrant(grantId) {
    if (!canManage) return;
    if (!window.confirm("Are you sure you want to revoke this scoped permission grant?")) return;

    try {
      const { error } = await supabase
        .from('scoped_permissions')
        .delete()
        .eq('id', grantId);

      if (error) {
        toast.error(error.message || "Failed to revoke permission");
      } else {
        toast.success("Scoped permission revoked.");
        loadPermissionsData();
      }
    } catch (err) {
      toast.error("Error revoking permission");
    }
  }

  const cardBg = darkMode ? "#1E140C" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#E8D9C5";
  const textMuted = darkMode ? "#B3A18C" : "#9C8B76";

  function getScopeName(type, id) {
    if (type === 'department') {
      const d = departments.find(item => item.id === id);
      return d ? `Department: ${d.name}` : `Dept (${id.slice(0, 8)})`;
    } else {
      const p = projects.find(item => item.id === id);
      return p ? `Project: ${p.title}` : `Project (${id.slice(0, 8)})`;
    }
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
            🔒 Composable Scoped Permissions
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: textMuted }}>
            Grant department-level or project-level roles (e.g., Team Lead) without changing org-wide roles.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowGrantModal(true)}
            style={{
              padding: "10px 18px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #f15e1c, #fab60a)", color: "white",
              fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(241, 94, 28, 0.3)"
            }}
          >
            + Grant Scoped Role
          </button>
        )}
      </div>

      {/* Permissions Table */}
      <div style={{ background: cardBg, borderRadius: "16px", border: `1px solid ${borderCol}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: textMuted }}>Loading scoped grants...</div>
        ) : grants.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: textMuted }}>
            No scoped permission grants active. All users currently operate under their default org-wide roles.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: darkMode ? "rgba(255,255,255,0.02)" : "#FFF8EF", borderBottom: `1px solid ${borderCol}` }}>
                <th style={{ padding: "14px 18px", color: textMuted }}>MEMBER NAME / EMAIL</th>
                <th style={{ padding: "14px 18px", color: textMuted }}>SCOPE TYPE</th>
                <th style={{ padding: "14px 18px", color: textMuted }}>TARGET ENTITY</th>
                <th style={{ padding: "14px 18px", color: textMuted }}>SCOPED ROLE</th>
                <th style={{ padding: "14px 18px", color: textMuted }}>GRANTED DATE</th>
                {canManage && <th style={{ padding: "14px 18px", textAlign: "right", color: textMuted }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                  <td style={{ padding: "14px 18px", fontWeight: "600", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                    👤 {getMemberDisplayName(g.user_id)}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{
                      padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                      background: g.scope_type === 'project' ? "rgba(241, 94, 28, 0.15)" : "rgba(46, 147, 111, 0.15)",
                      color: g.scope_type === 'project' ? "#f15e1c" : "#2e936f", textTransform: "uppercase"
                    }}>
                      {g.scope_type}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                    {getScopeName(g.scope_type, g.scope_id)}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                      background: "rgba(250, 182, 10, 0.15)", color: "#fab60a", textTransform: "uppercase"
                    }}>
                      {g.role}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", color: textMuted }}>
                    {new Date(g.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <button
                        onClick={() => handleRevokeGrant(g.id)}
                        style={{
                          padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.3)",
                          background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "12px", cursor: "pointer"
                        }}
                      >
                        Revoke
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Granting Scoped Permission */}
      {showGrantModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          overflowY: "auto"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                Grant Scoped Role
              </h2>
              <button onClick={() => setShowGrantModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleGrantPermission}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: textMuted }}>
                  SELECT TEAM MEMBER *
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="form-select"
                  style={{
                    width: "100%", padding: "10px 36px 10px 14px", borderRadius: "8px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", cursor: "pointer"
                  }}
                >
                  <option value="">-- Choose Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.user_id}>
                      {getMemberDisplayName(m.user_id)} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: textMuted }}>
                  SCOPE TYPE *
                </label>
                <select
                  value={scopeType}
                  onChange={(e) => {
                    setScopeType(e.target.value);
                    setScopeId('');
                  }}
                  className="form-select"
                  style={{
                    width: "100%", padding: "10px 36px 10px 14px", borderRadius: "8px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", cursor: "pointer"
                  }}
                >
                  <option value="project">Project Scope</option>
                  <option value="department">Department Scope</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: textMuted }}>
                  TARGET {scopeType.toUpperCase()} *
                </label>

                {scopeType === 'department' && departments.length === 0 && (
                  <div style={{
                    marginBottom: "10px", padding: "10px 12px", borderRadius: "8px",
                    background: darkMode ? "rgba(245,158,11,0.15)" : "#fffbeb",
                    border: "1px solid rgba(245,158,11,0.35)", fontSize: "12px",
                    color: darkMode ? "#fbbf24" : "#b45309"
                  }}>
                    ⚠️ No departments exist yet.{" "}
                    <button
                      type="button"
                      onClick={() => navigate('/departments')}
                      style={{
                        background: "none", border: "none", color: "#f15e1c", fontWeight: "700",
                        cursor: "pointer", textDecoration: "underline", padding: 0
                      }}
                    >
                      [+ Create Department]
                    </button>
                  </div>
                )}

                {scopeType === 'project' && projects.length === 0 && (
                  <div style={{
                    marginBottom: "10px", padding: "10px 12px", borderRadius: "8px",
                    background: darkMode ? "rgba(245,158,11,0.15)" : "#fffbeb",
                    border: "1px solid rgba(245,158,11,0.35)", fontSize: "12px",
                    color: darkMode ? "#fbbf24" : "#b45309"
                  }}>
                    ⚠️ No projects exist yet.{" "}
                    <button
                      type="button"
                      onClick={() => navigate('/projects')}
                      style={{
                        background: "none", border: "none", color: "#f15e1c", fontWeight: "700",
                        cursor: "pointer", textDecoration: "underline", padding: 0
                      }}
                    >
                      [+ Create Project]
                    </button>
                  </div>
                )}

                <select
                  required
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  className="form-select"
                  style={{
                    width: "100%", padding: "10px 36px 10px 14px", borderRadius: "8px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", cursor: "pointer"
                  }}
                >
                  <option value="">-- Choose {scopeType} --</option>
                  {scopeType === 'department'
                    ? departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                    : projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)
                  }
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: textMuted }}>
                  ELEVATED ROLE *
                </label>
                <select
                  value={grantRole}
                  onChange={(e) => setGrantRole(e.target.value)}
                  className="form-select"
                  style={{
                    width: "100%", padding: "10px 36px 10px 14px", borderRadius: "8px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", cursor: "pointer"
                  }}
                >
                  <option value="manager">Manager — Full management within scope</option>
                  <option value="employee">Employee — Work assignment within scope</option>
                  <option value="guest">Guest — Read-only access within scope</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                    background: "none", color: textMuted, fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 22px", borderRadius: "8px", border: "none",
                    background: "linear-gradient(135deg, #f15e1c, #fab60a)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? "Granting..." : "Grant Scoped Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
