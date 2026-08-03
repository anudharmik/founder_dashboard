import React, { useState, useEffect } from 'react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Teams({ darkMode }) {
  const { activeOrg, isOwner, isManager, canManageTeams, orgMembers } = useOrg();
  const [teams, setTeams] = useState([]);
  const [teamMembersMap, setTeamMembersMap] = useState({});
  const [loading, setLoading] = useState(true);

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
    border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.25)" : "0 4px 20px rgba(0,0,0,0.05)",
    backdropFilter: "blur(12px)",
  };

  if (!activeOrg) {
    return (
      <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ color: darkMode ? "#f8fafc" : "#0f172a" }}>Teams</h2>
        <p style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>Please select or create an organization first.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a", margin: "0 0 6px" }}>
            Cross-Functional Teams
          </h1>
          <p style={{ fontSize: "14px", color: darkMode ? "#94a3b8" : "#64748b", margin: 0 }}>
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
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>👥</span> Create Team
          </button>
        )}
      </div>

      {/* Grid of Teams */}
      {loading ? (
        <p style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>Loading teams...</p>
      ) : teams.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px" }}>
          <span style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}>👥</span>
          <h3 style={{ margin: "0 0 8px", color: darkMode ? "#f1f5f9" : "#1e293b" }}>No Teams Created</h3>
          <p style={{ fontSize: "13px", color: darkMode ? "#94a3b8" : "#64748b", margin: "0 0 20px" }}>
            {canManageTeams ? "Create cross-functional teams to group members across departments." : "No teams exist in this organization."}
          </p>
          {canManageTeams && (
            <button
              onClick={() => { setEditingTeamId(null); setTeamName(''); setIsTeamModalOpen(true); }}
              style={{
                padding: "10px 20px", borderRadius: "10px", border: "none", background: "#6366f1", color: "#fff", fontWeight: "700", cursor: "pointer"
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                      👥 {t.name}
                    </h3>
                    <span style={{ fontSize: "12px", color: darkMode ? "#94a3b8" : "#64748b" }}>
                      {memberIds.length} {memberIds.length === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>

                  {canManageTeams && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => { setEditingTeamId(t.id); setTeamName(t.name); setIsTeamModalOpen(true); }}
                        title="Edit Team Name"
                        style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontSize: "14px" }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id)}
                        title="Delete Team"
                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "14px" }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {/* Team Members Preview */}
                <div style={{ margin: "16px 0", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {memberIds.length === 0 ? (
                    <span style={{ fontSize: "12px", color: darkMode ? "#64748b" : "#94a3b8", italic: true }}>No members assigned</span>
                  ) : (
                    memberIds.map(uid => (
                      <span
                        key={uid}
                        style={{
                          fontSize: "11px", padding: "4px 8px", borderRadius: "12px",
                          background: darkMode ? "rgba(99,102,241,0.15)" : "#e0e7ff",
                          color: darkMode ? "#a5b4fc" : "#4338ca",
                          border: darkMode ? "1px solid rgba(99,102,241,0.3)" : "1px solid #c7d2fe",
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
                      border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1",
                      background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
                      color: darkMode ? "#f1f5f9" : "#334155",
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
            background: darkMode ? "#0f172a" : "#ffffff",
            border: darkMode ? "1px solid #1e293b" : "1px solid #cbd5e1",
            borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "420px"
          }}>
            <h3 style={{ margin: "0 0 16px", color: darkMode ? "#f8fafc" : "#0f172a" }}>
              {editingTeamId ? "Edit Team" : "Create New Team"}
            </h3>
            <form onSubmit={handleSaveTeam}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#cbd5e1" : "#475569", marginBottom: "6px" }}>
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
                    border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                    background: darkMode ? "#1e293b" : "#f8fafc",
                    color: darkMode ? "#fff" : "#000",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #64748b", background: "transparent", color: darkMode ? "#cbd5e1" : "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                >
                  {submittingTeam ? "Saving..." : "Save Team"}
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
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div style={{
            background: darkMode ? "#0f172a" : "#ffffff",
            border: darkMode ? "1px solid #1e293b" : "1px solid #cbd5e1",
            borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "500px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: darkMode ? "#f8fafc" : "#0f172a" }}>
                Manage Members: {activeTeamForMembers.name}
              </h3>
              <button
                onClick={() => setActiveTeamForMembers(null)}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Add Member Form */}
            <form onSubmit={handleAddMemberToTeam} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <select
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "8px",
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  background: darkMode ? "#1e293b" : "#f8fafc",
                  color: darkMode ? "#fff" : "#000",
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
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", fontWeight: "700", cursor: "pointer" }}
              >
                Add
              </button>
            </form>

            {/* Existing Team Members List */}
            <h4 style={{ fontSize: "14px", color: darkMode ? "#cbd5e1" : "#475569", margin: "0 0 10px" }}>
              Current Team Members ({ (teamMembersMap[activeTeamForMembers.id] || []).length })
            </h4>
            <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {(teamMembersMap[activeTeamForMembers.id] || []).map(uid => (
                <div
                  key={uid}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: "8px",
                    background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0"
                  }}
                >
                  <span style={{ fontSize: "13px", color: darkMode ? "#f1f5f9" : "#0f172a", fontFamily: "monospace" }}>
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
