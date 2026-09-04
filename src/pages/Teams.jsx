import React, { useState, useEffect } from 'react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Teams({ darkMode }) {
  const { activeOrg, isOwner, isManager, canManageTeams, orgMembers } = useOrg();
  const [teams, setTeams] = useState([]);
  const [teamMembersMap, setTeamMembersMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Departments state
  const [departments, setDepartments] = useState([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [submittingDept, setSubmittingDept] = useState(false);

  // New/Edit Team Modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Manage Team Members Modal
  const [activeTeamForMembers, setActiveTeamForMembers] = useState(null);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');

  useEffect(() => {
    if (activeOrg) {
      fetchTeams();
    }
  }, [activeOrg]);

  async function fetchTeams() {
    setLoading(true);
    try {
      // Fetch departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .eq('org_id', activeOrg.id);
      setDepartments(deptData || []);

      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (teamErr) throw teamErr;
      setTeams(teamData || []);

      // Fetch team_members mapping
      const { data: tmData } = await supabase
        .from('team_members')
        .select('*');

      if (tmData) {
        const map = {};
        tmData.forEach(tm => {
          if (!map[tm.team_id]) map[tm.team_id] = [];
          map[tm.team_id].push(tm.user_id);
        });
        setTeamMembersMap(map);
      }
    } catch (err) {
      console.error("Fetch teams error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDepartment(e) {
    e.preventDefault();
    if (!deptName.trim() || !activeOrg) return;
    setSubmittingDept(true);
    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          org_id: activeOrg.id,
          name: deptName.trim()
        });
      if (error) throw error;
      toast.success("Department created!");
      setIsDeptModalOpen(false);
      setDeptName('');
      fetchTeams();
    } catch (err) {
      toast.error(err.message || "Failed to create department");
    } finally {
      setSubmittingDept(false);
    }
  }

  async function handleSaveTeam(e) {
    e.preventDefault();
    if (!teamName.trim() || !activeOrg) return;
    setSubmittingTeam(true);
    try {
      if (editingTeamId) {
        const { error } = await supabase
          .from('teams')
          .update({ name: teamName.trim() })
          .eq('id', editingTeamId);
        if (error) throw error;
        toast.success("Team updated!");
      } else {
        const { error } = await supabase
          .from('teams')
          .insert({
            org_id: activeOrg.id,
            name: teamName.trim()
          });
        if (error) throw error;
        toast.success("Team created!");
      }
      setIsTeamModalOpen(false);
      setTeamName('');
      setEditingTeamId(null);
      fetchTeams();
    } catch (err) {
      toast.error(err.message || "Failed to save team");
    } finally {
      setSubmittingTeam(false);
    }
  }

  async function handleDeleteTeam(teamId) {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      if (error) throw error;
      toast.success("Team deleted.");
      fetchTeams();
    } catch (err) {
      toast.error(err.message || "Failed to delete team");
    }
  }

  async function handleAddMemberToTeam(e) {
    e.preventDefault();
    if (!selectedUserIdToAdd || !activeTeamForMembers) return;
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: activeTeamForMembers.id,
          user_id: selectedUserIdToAdd
        });

      if (error) throw error;
      toast.success("Member added to team!");
      setSelectedUserIdToAdd('');
      fetchTeams();
    } catch (err) {
      toast.error(err.message || "Failed to add member to team");
    }
  }

  async function handleRemoveMemberFromTeam(teamId, userId) {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success("Member removed from team.");
      fetchTeams();
    } catch (err) {
      toast.error(err.message || "Failed to remove member");
    }
  }

  const cardStyle = {
    background: darkMode ? "rgba(30,41,59,0.7)" : "#ffffff",
    border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E8D9C5",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.25)" : "0 4px 20px rgba(0,0,0,0.05)",
    backdropFilter: "blur(12px)",
  };

  if (!activeOrg) {
    return (
      <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ color: darkMode ? "#FFF8EF" : "#2E2013" }}>Teams</h2>
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
            Cross-Functional Teams
          </h1>
          <p style={{ fontSize: "14px", color: darkMode ? "#B3A18C" : "#9C8B76", margin: 0 }}>
            Manage teams and assign members to cross-functional projects in {activeOrg.name}.
          </p>
        </div>

        {canManageTeams && (
          <button
            onClick={() => { setEditingTeamId(null); setTeamName(''); setIsTeamModalOpen(true); }}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "#cf4a11",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(207,74,17,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>👥</span> Create Team
          </button>
        )}
      </div>

      {/* Department Prerequisite Warning Banner */}
      {departments.length === 0 && (
        <div style={{
          marginBottom: "24px", padding: "16px 20px", borderRadius: "14px",
          background: darkMode ? "rgba(250,182,10,0.12)" : "#fffbeb",
          border: "1px solid rgba(250,182,10,0.35)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
          boxShadow: "0 4px 12px rgba(250,182,10,0.08)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px" }}>🏢</span>
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: "700", color: darkMode ? "#fab60a" : "#b45309" }}>
                You need a Department first
              </div>
              <div style={{ fontSize: "13px", color: darkMode ? "#D5C2A5" : "#6E5D4B" }}>
                Teams structure members across departments. Create at least one department before defining teams.
              </div>
            </div>
          </div>
          {canManageTeams && (
            <button
              onClick={() => { setDeptName(''); setIsDeptModalOpen(true); }}
              style={{
                padding: "9px 18px", borderRadius: "10px", border: "none",
                background: "#cf4a11", color: "#ffffff",
                fontWeight: "700", fontSize: "13px", cursor: "pointer",
                boxShadow: "0 4px 12px rgba(207,74,17,0.3)"
              }}
            >
              + Create Department Now
            </button>
          )}
        </div>
      )}

      {/* Grid of Teams */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={cardStyle}>
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 22, width: "55%", marginBottom: 12, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 14, width: "35%", marginBottom: 20, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 32, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px" }}>
          <span style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}>👥</span>
          <h3 style={{ margin: "0 0 8px", color: darkMode ? "#FFF3E2" : "#1E140C" }}>No Teams Created</h3>
          <p style={{ fontSize: "13px", color: darkMode ? "#B3A18C" : "#9C8B76", margin: "0 0 20px" }}>
            {canManageTeams ? "Create cross-functional teams to group members across departments." : "No teams exist in this organization."}
          </p>
          {canManageTeams && (
            <button
              onClick={() => { setEditingTeamId(null); setTeamName(''); setIsTeamModalOpen(true); }}
              style={{
                padding: "10px 20px", borderRadius: "10px", border: "none", background: "#cf4a11", color: "#fff", fontWeight: "700", cursor: "pointer"
              }}
            >
              Add Team
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {teams.map((t) => {
            const memberIds = teamMembersMap[t.id] || [];

            return (
              <div key={t.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                      {t.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: darkMode ? "#B3A18C" : "#9C8B76" }}>
                      🏢 Department ID: {t.department_id ? t.department_id.substring(0, 8) : 'Unassigned'}
                    </p>
                  </div>
                  {canManageTeams && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => { setEditingTeamId(t.id); setTeamName(t.name); setIsTeamModalOpen(true); }}
                        title="Edit Team"
                        style={{ background: "none", border: "none", color: "#f15e1c", cursor: "pointer", fontSize: "14px" }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id)}
                        title="Delete Team"
                        style={{ background: "none", border: "none", color: "#C13E1A", cursor: "pointer", fontSize: "14px" }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {/* Team Members Preview */}
                <div style={{ margin: "16px 0", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {memberIds.length === 0 ? (
                    <span style={{ fontSize: "12px", color: darkMode ? "#9C8B76" : "#B3A18C", italic: true }}>No members assigned</span>
                  ) : (
                    memberIds.map(uid => (
                      <span
                        key={uid}
                        style={{
                          fontSize: "11px", padding: "4px 8px", borderRadius: "12px",
                          background: darkMode ? "rgba(241,94,28,0.15)" : "#FFF3E2",
                          color: darkMode ? "#fab60a" : "#cf4a11",
                          border: darkMode ? "1px solid rgba(241,94,28,0.3)" : "1px solid #F0DFC9",
                          fontFamily: "monospace"
                        }}
                      >
                        {uid.substring(0, 8)}...
                      </span>
                    ))
                  )}
                </div>

                {canManageTeams && (
                  <button
                    onClick={() => setActiveTeamForMembers(t)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #F0DFC9",
                      background: darkMode ? "rgba(255,255,255,0.04)" : "#FFF3E2",
                      color: darkMode ? "#FFF3E2" : "#2E2013",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      marginTop: "8px"
                    }}
                  >
                    ⚙️ Manage Members ({memberIds.length})
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Team Modal */}
      {isTeamModalOpen && (
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
              {editingTeamId ? "Edit Team" : "Create New Team"}
            </h3>

            {departments.length === 0 && (
              <div style={{
                marginBottom: "16px", padding: "12px 14px", borderRadius: "10px",
                background: darkMode ? "rgba(250,182,10,0.15)" : "#fffbeb",
                border: "1px solid rgba(250,182,10,0.35)", fontSize: "12.5px",
                color: darkMode ? "#fab60a" : "#b45309"
              }}>
                ⚠️ You need a Department first before creating a Team.{" "}
                <button
                  type="button"
                  onClick={() => { setDeptName(''); setIsDeptModalOpen(true); }}
                  style={{
                    background: "none", border: "none", color: "#f15e1c", fontWeight: "700",
                    cursor: "pointer", textDecoration: "underline", padding: 0
                  }}
                >
                  [+ Create one now]
                </button>
              </div>
            )}

            <form onSubmit={handleSaveTeam}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#D5C2A5" : "#6E5D4B", marginBottom: "6px" }}>
                  TEAM NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Squad, Core API, Growth Sprint"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
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
                  onClick={() => setIsTeamModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #9C8B76", background: "transparent", color: darkMode ? "#D5C2A5" : "#6E5D4B", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#cf4a11", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                >
                  {submittingTeam ? "Saving..." : "Save Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Department Modal (Inline resolution) */}
      {isDeptModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div style={{
            background: darkMode ? "#2E2013" : "#ffffff",
            border: darkMode ? "1px solid #1E140C" : "1px solid #D5C2A5",
            borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "420px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "18px", fontWeight: "800" }}>
                Create New Department
              </h3>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                style={{ background: "none", border: "none", color: "#9C8B76", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveDepartment}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#D5C2A5" : "#6E5D4B", marginBottom: "6px" }}>
                  DEPARTMENT NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Product, Growth"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                  autoFocus
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
                  onClick={() => setIsDeptModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #9C8B76", background: "transparent", color: darkMode ? "#D5C2A5" : "#6E5D4B", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDept}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#cf4a11", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                >
                  {submittingDept ? "Saving..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Team Members Modal */}
      {activeTeamForMembers && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
          overflowY: "auto"
        }}>
          <div style={{
            background: darkMode ? "#2E2013" : "#ffffff",
            border: darkMode ? "1px solid #1E140C" : "1px solid #D5C2A5",
            borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                Manage Members: {activeTeamForMembers.name}
              </h3>
              <button
                onClick={() => setActiveTeamForMembers(null)}
                style={{ background: "none", border: "none", color: "#9C8B76", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Add Member Form */}
            <form onSubmit={handleAddMemberToTeam} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <select
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                className="form-select"
                style={{
                  flex: 1, padding: "8px 36px 8px 12px", borderRadius: "8px",
                  border: darkMode ? "1px solid #4A3C2C" : "1px solid #D5C2A5",
                  background: darkMode ? "#1E140C" : "#FFF8EF",
                  color: darkMode ? "#fff" : "#000",
                  cursor: "pointer"
                }}
              >
                <option value="">Select Org Member to Add...</option>
                {orgMembers
                  .filter(m => !(teamMembersMap[activeTeamForMembers.id] || []).includes(m.user_id))
                  .map(m => (
                    <option key={m.id} value={m.user_id}>
                      {m.user_id} ({m.role})
                    </option>
                  ))}
              </select>
              <button
                type="submit"
                disabled={!selectedUserIdToAdd}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#cf4a11", color: "#fff", fontWeight: "700", cursor: "pointer" }}
              >
                Add
              </button>
            </form>

            {/* Existing Team Members List */}
            <h4 style={{ fontSize: "14px", color: darkMode ? "#D5C2A5" : "#6E5D4B", margin: "0 0 10px" }}>
              Current Team Members ({ (teamMembersMap[activeTeamForMembers.id] || []).length })
            </h4>
            <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {(teamMembersMap[activeTeamForMembers.id] || []).map(uid => (
                <div
                  key={uid}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: "8px",
                    background: darkMode ? "rgba(255,255,255,0.03)" : "#FFF8EF",
                    border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #E8D9C5"
                  }}
                >
                  <span style={{ fontSize: "13px", color: darkMode ? "#FFF3E2" : "#2E2013", fontFamily: "monospace" }}>
                    {uid}
                  </span>
                  <button
                    onClick={() => handleRemoveMemberFromTeam(activeTeamForMembers.id, uid)}
                    style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
