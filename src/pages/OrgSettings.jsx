import React, { useState, useEffect } from 'react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import CreateOrgOnboarding from '../components/CreateOrgOnboarding';
import toast from 'react-hot-toast';

export default function OrgSettings({ user, darkMode }) {
  const { activeOrg, userRole, orgMembers, isOwner, isManager, refreshOrgData, fetchOrgMembers } = useOrg();
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite modal state
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Editing state
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  useEffect(() => {
    if (activeOrg) {
      setNewOrgName(activeOrg.name || '');
      loadMembers();
    }
  }, [activeOrg]);

  async function loadMembers() {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('*')
        .eq('org_id', activeOrg.id);

      if (!error && data) {
        setMembersList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateOrgName(e) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: newOrgName.trim() })
        .eq('id', activeOrg.id);

      if (error) throw error;
      toast.success("Organization name updated!");
      setEditingOrgName(false);
      refreshOrgData();
    } catch (err) {
      toast.error(err.message || "Failed to update org name");
    }
  }

  async function handleInviteMember(e) {
    e.preventDefault();
    if (!inviteUserId.trim() || !activeOrg) return;
    setSubmittingInvite(true);
    try {
      const { error } = await supabase.from('org_members').insert({
        org_id: activeOrg.id,
        user_id: inviteUserId.trim(),
        role: inviteRole
      });

      if (error) throw error;
      toast.success(`Member added as ${inviteRole}!`);
      setIsInviteOpen(false);
      setInviteUserId('');
      setInviteRole('employee');
      loadMembers();
    } catch (err) {
      toast.error(err.message || "Failed to add member");
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleUpdateRole(memberId, role) {
    const targetMember = membersList.find(m => m.id === memberId);
    if (targetMember && targetMember.role === 'owner' && role !== 'owner') {
      const ownerCount = membersList.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        toast.error("Cannot demote the sole Owner. Please promote another member to Owner first.");
        return;
      }
    }
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
      toast.success("Role updated!");
      loadMembers();
    } catch (err) {
      toast.error(err.message || "Failed to update role");
    }
  }

  async function handleRemoveMember(memberId) {
    const targetMember = membersList.find(m => m.id === memberId);
    if (targetMember && targetMember.role === 'owner') {
      const ownerCount = membersList.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        toast.error("Cannot remove the sole Owner. Please promote another member to Owner first.");
        return;
      }
    }
    if (!window.confirm("Are you sure you want to remove this member from the organization?")) return;
    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success("Member removed.");
      loadMembers();
    } catch (err) {
      toast.error(err.message || "Failed to remove member");
    }
  }

  const roleColors = {
    owner: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
    manager: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
    employee: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    guest: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' }
  };

  const cardStyle = {
    background: darkMode ? "rgba(30, 41, 59, 0.75)" : "#ffffff",
    border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: darkMode
      ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)"
      : "0 1px 3px rgba(0,0,0,0.05), 0 10px 24px -4px rgba(15,23,42,0.06), 0 0 0 1px rgba(226,232,240,0.8)",
    backdropFilter: "blur(12px)",
  };

  if (!activeOrg) {
    return <CreateOrgOnboarding user={user} darkMode={darkMode} />;
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a", margin: "0 0 6px" }}>
            Organization Settings
          </h1>
          <p style={{ fontSize: "14px", color: darkMode ? "#94a3b8" : "#64748b", margin: 0 }}>
            Manage members, roles, and workspace details for <span style={{ color: "#818cf8", fontWeight: "600" }}>{activeOrg.name}</span>
          </p>
        </div>
        <span style={{
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          textTransform: "uppercase",
          background: roleColors[userRole]?.bg || "rgba(99,102,241,0.15)",
          color: roleColors[userRole]?.text || "#818cf8",
          border: `1px solid ${roleColors[userRole]?.border || 'rgba(99,102,241,0.3)'}`
        }}>
          Your Role: {userRole}
        </span>
      </div>

      {/* Organization General Info */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: darkMode ? "#f1f5f9" : "#1e293b", margin: 0 }}>
            Workspace Identity
          </h3>
          {isOwner && !editingOrgName && (
            <button
              onClick={() => setEditingOrgName(true)}
              style={{
                background: "none", border: "none", color: "#818cf8", fontSize: "13px", fontWeight: "600", cursor: "pointer"
              }}
            >
              ✏️ Edit Name
            </button>
          )}
        </div>

        {editingOrgName ? (
          <form onSubmit={handleUpdateOrgName} style={{ display: "flex", gap: "12px", maxWidth: "450px" }}>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: "8px",
                border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                background: darkMode ? "#0f172a" : "#f8fafc",
                color: darkMode ? "#fff" : "#000",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", fontWeight: "600", cursor: "pointer"
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingOrgName(false)}
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "1px solid #64748b", background: "transparent", color: darkMode ? "#cbd5e1" : "#475569", cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div style={{ display: "flex", gap: "24px", fontSize: "14px" }}>
            <div>
              <span style={{ color: darkMode ? "#64748b" : "#94a3b8", display: "block", fontSize: "12px", fontWeight: "600" }}>NAME</span>
              <strong style={{ color: darkMode ? "#e2e8f0" : "#0f172a" }}>{activeOrg.name}</strong>
            </div>
            <div>
              <span style={{ color: darkMode ? "#64748b" : "#94a3b8", display: "block", fontSize: "12px", fontWeight: "600" }}>ORG ID</span>
              <code style={{ color: "#818cf8", fontSize: "12px" }}>{activeOrg.id}</code>
            </div>
            <div>
              <span style={{ color: darkMode ? "#64748b" : "#94a3b8", display: "block", fontSize: "12px", fontWeight: "600" }}>PLAN</span>
              <span style={{ color: "#22c55e", fontWeight: "600" }}>Pilot Tier</span>
            </div>
          </div>
        )}
      </div>

      {/* Members Management Card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: darkMode ? "#f1f5f9" : "#1e293b", margin: "0 0 4px" }}>
              Team Members ({membersList.length})
            </h3>
            <p style={{ fontSize: "13px", color: darkMode ? "#94a3b8" : "#64748b", margin: 0 }}>
              Users with access to this organization and their permission role (§5.1 RBAC model).
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setIsInviteOpen(true)}
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
              <span>➕</span> Add Member
            </button>
          )}
        </div>

        {/* Member Table */}
        {loading ? (
          <p style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>Loading members...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: "600", fontSize: "12px" }}>USER ID / EMAIL</th>
                  <th style={{ padding: "12px 16px", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: "600", fontSize: "12px" }}>ROLE</th>
                  <th style={{ padding: "12px 16px", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: "600", fontSize: "12px" }}>JOINED</th>
                  {isOwner && <th style={{ padding: "12px 16px", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: "600", fontSize: "12px", textAlign: "right" }}>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {membersList.map((m) => (
                  <tr key={m.id} style={{ borderBottom: darkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                      <div style={{ fontWeight: "600" }}>{m.user_id === user?.id ? `${user?.email} (You)` : m.user_id}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {isOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                            background: darkMode ? "#0f172a" : "#ffffff",
                            color: darkMode ? "#f1f5f9" : "#0f172a",
                            fontSize: "13px",
                            fontWeight: "600"
                          }}
                        >
                          <option value="owner">Owner</option>
                          <option value="manager">Manager</option>
                          <option value="employee">Employee</option>
                          <option value="guest">Guest</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          background: roleColors[m.role]?.bg || "rgba(255,255,255,0.1)",
                          color: roleColors[m.role]?.text || "#fff",
                          border: `1px solid ${roleColors[m.role]?.border || 'transparent'}`
                        }}>
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", color: darkMode ? "#94a3b8" : "#64748b", fontSize: "13px" }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    {isOwner && (
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {m.user_id !== user?.id && (
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              color: "#f87171",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer"
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div style={{
            ...cardStyle, width: "100%", maxWidth: "460px", background: darkMode ? "#0f172a" : "#ffffff", border: darkMode ? "1px solid #1e293b" : "1px solid #cbd5e1"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: darkMode ? "#f8fafc" : "#0f172a" }}>Add Team Member</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleInviteMember} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#cbd5e1" : "#475569", marginBottom: "6px" }}>
                  USER UUID
                </label>
                <input
                  type="text"
                  placeholder="Paste user auth UUID"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
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

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#cbd5e1" : "#475569", marginBottom: "6px" }}>
                  ASSIGN ROLE (§5.1 RBAC Model)
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                    background: darkMode ? "#1e293b" : "#f8fafc",
                    color: darkMode ? "#fff" : "#000",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="owner">Owner — Full org-wide control</option>
                  <option value="manager">Manager — Projects, goals, assignments, proposals</option>
                  <option value="employee">Employee — Assigned work completion & comments</option>
                  <option value="guest">Guest — Read-only on invited projects</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #64748b", background: "transparent", color: darkMode ? "#cbd5e1" : "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                >
                  {submittingInvite ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
