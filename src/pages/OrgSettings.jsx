import React, { useState, useEffect } from 'react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import CreateOrgOnboarding from '../components/CreateOrgOnboarding';
import OrgPermissions from './OrgPermissions';
import toast from 'react-hot-toast';

export default function OrgSettings({ user, darkMode }) {
  const { activeOrg, userRole, orgMembers, isOwner, isManager, refreshOrgData, fetchOrgMembers, getMemberDisplayName } = useOrg();
  const [activeSettingsTab, setActiveSettingsTab] = useState('members'); // 'members' | 'permissions'
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invitations state
  const [invitesList, setInvitesList] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [inviteFilter, setInviteFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'revoked'
  const [inviteSearch, setInviteSearch] = useState('');

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
      loadInvites();
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

  async function loadInvites() {
    if (!activeOrg) return;
    setLoadingInvites(true);
    try {
      const { data, error } = await supabase
        .from('org_invites')
        .select('*')
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInvitesList(data);
      }
    } catch (err) {
      console.error("Failed to load invites:", err);
    } finally {
      setLoadingInvites(false);
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
    const inputVal = inviteUserId.trim();
    if (!inputVal || !activeOrg) return;
    setSubmittingInvite(true);
    try {
      const isEmail = inputVal.includes('@');
      if (isEmail) {
        const { error } = await supabase.from('org_invites').insert({
          org_id: activeOrg.id,
          email: inputVal.toLowerCase(),
          role: inviteRole,
          invited_by: user.id,
          status: 'pending'
        });
        if (error) throw error;
        toast.success(`Invitation sent to ${inputVal} as ${inviteRole}!`);
      } else {
        const { error } = await supabase.from('org_members').insert({
          org_id: activeOrg.id,
          user_id: inputVal,
          role: inviteRole
        });
        if (error) throw error;
        toast.success(`Member added as ${inviteRole}!`);
      }

      setIsInviteOpen(false);
      setInviteUserId('');
      setInviteRole('employee');
      loadMembers();
      loadInvites();
    } catch (err) {
      toast.error(err.message || "Failed to add member / send invite");
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleRevokeInvite(inviteId) {
    if (!window.confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      const { error } = await supabase
        .from('org_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);

      if (error) throw error;
      toast.success("Invitation revoked");
      loadInvites();
    } catch (err) {
      toast.error(err.message || "Failed to revoke invitation");
    }
  }

  async function handleResendInvite(invite) {
    try {
      const { error } = await supabase
        .from('org_invites')
        .update({ created_at: new Date().toISOString(), status: 'pending' })
        .eq('id', invite.id);

      if (error) throw error;
      toast.success(`Invitation resent to ${invite.email}!`);
      loadInvites();
    } catch (err) {
      toast.error(err.message || "Failed to resend invitation");
    }
  }

  async function handleCopyInviteLink(token) {
    const inviteUrl = `${window.location.origin}/login?invite_token=${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
    } catch (err) {
      toast.error("Could not copy link to clipboard");
    }
  }

  async function handleDeleteInvite(inviteId) {
    if (!window.confirm("Delete this invitation record?")) return;
    try {
      const { error } = await supabase
        .from('org_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      toast.success("Invitation removed");
      loadInvites();
    } catch (err) {
      toast.error(err.message || "Failed to delete invite");
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
    manager: { bg: 'rgba(250, 182, 10, 0.15)', text: '#fab60a', border: 'rgba(250, 182, 10, 0.3)' },
    employee: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    guest: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' }
  };

  const cardStyle = {
    background: darkMode ? "rgba(30, 41, 59, 0.75)" : "#ffffff",
    border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E8D9C5",
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
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013", margin: "0 0 6px" }}>
            Organization Settings
          </h1>
          <p style={{ fontSize: "14px", color: darkMode ? "#B3A18C" : "#9C8B76", margin: 0 }}>
            Manage members, roles, and workspace details for <span style={{ color: "#f15e1c", fontWeight: "600" }}>{activeOrg.name}</span>
          </p>
        </div>
        <span style={{
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          textTransform: "uppercase",
          background: roleColors[userRole]?.bg || "rgba(241, 94, 28, 0.15)",
          color: roleColors[userRole]?.text || "#f15e1c",
          border: `1px solid ${roleColors[userRole]?.border || 'rgba(241, 94, 28, 0.3)'}`
        }}>
          Your Role: {userRole}
        </span>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: darkMode ? "1px solid #4A3C2C" : "1px solid #E8D9C5" }}>
        <button
          onClick={() => setActiveSettingsTab('members')}
          style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: activeSettingsTab === 'members' ? "2px solid #f15e1c" : "2px solid transparent",
            color: activeSettingsTab === 'members' ? "#f15e1c" : (darkMode ? "#B3A18C" : "#9C8B76"),
            fontWeight: activeSettingsTab === 'members' ? "700" : "500", fontSize: "14px", cursor: "pointer"
          }}
        >
          👥 Members & Workspace
        </button>
        <button
          onClick={() => setActiveSettingsTab('permissions')}
          style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: activeSettingsTab === 'permissions' ? "2px solid #f15e1c" : "2px solid transparent",
            color: activeSettingsTab === 'permissions' ? "#f15e1c" : (darkMode ? "#B3A18C" : "#9C8B76"),
            fontWeight: activeSettingsTab === 'permissions' ? "700" : "500", fontSize: "14px", cursor: "pointer"
          }}
        >
          🔒 Scoped Permissions (RBAC)
        </button>
      </div>

      {activeSettingsTab === 'permissions' ? (
        <OrgPermissions user={user} darkMode={darkMode} />
      ) : (
        <>

      {/* Organization General Info */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: darkMode ? "#FFF3E2" : "#1E140C", margin: 0 }}>
            Workspace Identity
          </h3>
          {isOwner && !editingOrgName && (
            <button
              onClick={() => setEditingOrgName(true)}
              style={{
                background: "none", border: "none", color: "#f15e1c", fontSize: "13px", fontWeight: "600", cursor: "pointer"
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
                border: darkMode ? "1px solid #4A3C2C" : "1px solid #D5C2A5",
                background: darkMode ? "#2E2013" : "#FFF8EF",
                color: darkMode ? "#fff" : "#000",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "none", background: "#f15e1c", color: "#fff", fontWeight: "600", cursor: "pointer"
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingOrgName(false)}
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "1px solid #9C8B76", background: "transparent", color: darkMode ? "#D5C2A5" : "#6E5D4B", cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div style={{ display: "flex", gap: "24px", fontSize: "14px" }}>
            <div>
              <span style={{ color: darkMode ? "#9C8B76" : "#B3A18C", display: "block", fontSize: "12px", fontWeight: "600" }}>NAME</span>
              <strong style={{ color: darkMode ? "#E8D9C5" : "#2E2013" }}>{activeOrg.name}</strong>
            </div>
            <div>
              <span style={{ color: darkMode ? "#9C8B76" : "#B3A18C", display: "block", fontSize: "12px", fontWeight: "600" }}>ORG ID</span>
              <code style={{ color: "#f15e1c", fontSize: "12px" }}>{activeOrg.id}</code>
            </div>
            <div>
              <span style={{ color: darkMode ? "#9C8B76" : "#B3A18C", display: "block", fontSize: "12px", fontWeight: "600" }}>PLAN</span>
              <span style={{ color: "#22c55e", fontWeight: "600" }}>Pilot Tier</span>
            </div>
          </div>
        )}
      </div>

      {/* Members Management Card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: darkMode ? "#FFF3E2" : "#1E140C", margin: "0 0 4px" }}>
              Team Members ({membersList.length})
            </h3>
            <p style={{ fontSize: "13px", color: darkMode ? "#B3A18C" : "#9C8B76", margin: 0 }}>
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
              <span>➕</span> Add Member
            </button>
          )}
        </div>

        {/* Member Table */}
        {loading ? (
          <p style={{ color: darkMode ? "#B3A18C" : "#9C8B76" }}>Loading members...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E8D9C5" }}>
                  <th style={{ padding: "12px 16px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "12px" }}>USER ID / EMAIL</th>
                  <th style={{ padding: "12px 16px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "12px" }}>ROLE</th>
                  <th style={{ padding: "12px 16px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "12px" }}>JOINED</th>
                  {isOwner && <th style={{ padding: "12px 16px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "12px", textAlign: "right" }}>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {membersList.map((m) => (
                  <tr key={m.id} style={{ borderBottom: darkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid #FFF3E2" }}>
                    <td style={{ padding: "14px 16px", color: darkMode ? "#FFF3E2" : "#2E2013" }}>
                      <div style={{ fontWeight: "600" }}>
                        {getMemberDisplayName(m.user_id)}{m.user_id === user?.id ? " (You)" : ""}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {isOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                          className="form-select"
                          style={{
                            padding: "4px 30px 4px 10px",
                            borderRadius: "6px",
                            border: darkMode ? "1px solid #4A3C2C" : "1px solid #D5C2A5",
                            background: darkMode ? "#2E2013" : "#ffffff",
                            color: darkMode ? "#FFF3E2" : "#2E2013",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer"
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
                    <td style={{ padding: "14px 16px", color: darkMode ? "#B3A18C" : "#9C8B76", fontSize: "13px" }}>
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

      {/* Invitations & Invitees Management Card */}
      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: darkMode ? "#FFF3E2" : "#1E140C", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📩</span> Sent Invitations & Invitees ({invitesList.length})
            </h3>
            <p style={{ fontSize: "13px", color: darkMode ? "#B3A18C" : "#9C8B76", margin: 0 }}>
              Track users invited to this workspace and their platform joining status.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {isOwner && (
              <button
                onClick={() => setIsInviteOpen(true)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#f15e1c",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>➕</span> Invite Someone
              </button>
            )}
          </div>
        </div>

        {/* Summary Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: darkMode ? "rgba(15, 23, 42, 0.6)" : "#FFF8EF", border: darkMode ? "1px solid #4A3C2C" : "1px solid #E8D9C5" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: darkMode ? "#B3A18C" : "#9C8B76", textTransform: "uppercase" }}>Total Sent</span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013", marginTop: "2px" }}>{invitesList.length}</div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: darkMode ? "rgba(245, 158, 11, 0.1)" : "#fffbeb", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase" }}>Pending Join ⏳</span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#fbbf24", marginTop: "2px" }}>{invitesList.filter(i => i.status === 'pending').length}</div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: darkMode ? "rgba(34, 197, 94, 0.1)" : "#f0fdf4", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#22c55e", textTransform: "uppercase" }}>Joined Platform ✅</span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#4ade80", marginTop: "2px" }}>{invitesList.filter(i => i.status === 'accepted').length}</div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: darkMode ? "rgba(239, 68, 68, 0.1)" : "#fef2f2", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#ef4444", textTransform: "uppercase" }}>Revoked 🚫</span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#f87171", marginTop: "2px" }}>{invitesList.filter(i => i.status === 'revoked').length}</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {['all', 'pending', 'accepted', 'revoked'].map((st) => (
              <button
                key={st}
                onClick={() => setInviteFilter(st)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "capitalize",
                  cursor: "pointer",
                  border: inviteFilter === st ? "1px solid #f15e1c" : (darkMode ? "1px solid #4A3C2C" : "1px solid #D5C2A5"),
                  background: inviteFilter === st ? "#f15e1c" : "transparent",
                  color: inviteFilter === st ? "#ffffff" : (darkMode ? "#B3A18C" : "#9C8B76")
                }}
              >
                {st === 'all' ? 'All Invites' : st === 'accepted' ? 'Joined ✅' : st === 'pending' ? 'Pending ⏳' : 'Revoked 🚫'}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search invitees..."
            value={inviteSearch}
            onChange={(e) => setInviteSearch(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              border: darkMode ? "1px solid #4A3C2C" : "1px solid #D5C2A5",
              background: darkMode ? "#2E2013" : "#ffffff",
              color: darkMode ? "#FFF8EF" : "#2E2013",
              minWidth: "200px"
            }}
          />
        </div>

        {/* Invites Table */}
        {loadingInvites ? (
          <p style={{ color: darkMode ? "#B3A18C" : "#9C8B76", fontSize: "14px" }}>Loading invitations...</p>
        ) : invitesList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: darkMode ? "#B3A18C" : "#9C8B76" }}>
            <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>📩</span>
            <p style={{ margin: 0, fontSize: "14px" }}>No invitations have been sent yet.</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.8 }}>Use the "Add Member" button above to invite team members by email.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E8D9C5" }}>
                  <th style={{ padding: "10px 14px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "11px" }}>INVITEE EMAIL</th>
                  <th style={{ padding: "10px 14px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "11px" }}>ASSIGNED ROLE</th>
                  <th style={{ padding: "10px 14px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "11px" }}>INVITED BY</th>
                  <th style={{ padding: "10px 14px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "11px" }}>SENT DATE</th>
                  <th style={{ padding: "10px 14px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "11px" }}>JOINING STATUS</th>
                  <th style={{ padding: "10px 14px", color: darkMode ? "#B3A18C" : "#9C8B76", fontWeight: "600", fontSize: "11px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {invitesList
                  .filter(inv => inviteFilter === 'all' || inv.status === inviteFilter)
                  .filter(inv => !inviteSearch || inv.email.toLowerCase().includes(inviteSearch.toLowerCase()) || inv.role.toLowerCase().includes(inviteSearch.toLowerCase()))
                  .map((inv) => {
                    const statusConfig = {
                      pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', label: '⏳ Pending (Awaiting Join)' },
                      accepted: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', label: '✅ Joined Platform' },
                      revoked: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', label: '🚫 Revoked' }
                    };
                    const currentStatus = statusConfig[inv.status] || statusConfig.pending;

                    return (
                      <tr key={inv.id} style={{ borderBottom: darkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid #FFF3E2" }}>
                        <td style={{ padding: "12px 14px", color: darkMode ? "#FFF3E2" : "#2E2013", fontWeight: "600" }}>
                          {inv.email}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            background: roleColors[inv.role]?.bg || "rgba(255,255,255,0.1)",
                            color: roleColors[inv.role]?.text || "#fff",
                            border: `1px solid ${roleColors[inv.role]?.border || 'transparent'}`
                          }}>
                            {inv.role}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", color: darkMode ? "#B3A18C" : "#9C8B76" }}>
                          {inv.invited_by ? getMemberDisplayName(inv.invited_by) : 'System'}
                        </td>
                        <td style={{ padding: "12px 14px", color: darkMode ? "#B3A18C" : "#9C8B76" }}>
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "700",
                            background: currentStatus.bg,
                            color: currentStatus.text,
                            border: `1px solid ${currentStatus.border}`
                          }}>
                            {currentStatus.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            {inv.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleCopyInviteLink(inv.token)}
                                  title="Copy Invite Acceptance Link"
                                  style={{
                                    background: "rgba(241, 94, 28, 0.1)",
                                    border: "1px solid rgba(241, 94, 28, 0.3)",
                                    color: "#f15e1c",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    cursor: "pointer"
                                  }}
                                >
                                  📋 Copy Link
                                </button>
                                <button
                                  onClick={() => handleResendInvite(inv)}
                                  title="Resend Invite"
                                  style={{
                                    background: "rgba(59, 130, 246, 0.1)",
                                    border: "1px solid rgba(59, 130, 246, 0.3)",
                                    color: "#60a5fa",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    cursor: "pointer"
                                  }}
                                >
                                  🔄 Resend
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  title="Revoke Invite"
                                  style={{
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    color: "#f87171",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    cursor: "pointer"
                                  }}
                                >
                                  🚫 Revoke
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteInvite(inv.id)}
                              title="Delete Invite Record"
                              style={{
                                background: "rgba(100, 116, 139, 0.1)",
                                border: "1px solid rgba(100, 116, 139, 0.3)",
                                color: darkMode ? "#B3A18C" : "#9C8B76",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                cursor: "pointer"
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            ...cardStyle, width: "100%", maxWidth: "460px", background: darkMode ? "#2E2013" : "#ffffff", border: darkMode ? "1px solid #1E140C" : "1px solid #D5C2A5"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: darkMode ? "#FFF8EF" : "#2E2013" }}>Add Team Member</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                style={{ background: "none", border: "none", color: "#9C8B76", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleInviteMember} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#D5C2A5" : "#6E5D4B", marginBottom: "6px" }}>
                  USER EMAIL OR UUID
                </label>
                <input
                  type="text"
                  placeholder="e.g. colleague@example.com or User UUID"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
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

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: darkMode ? "#D5C2A5" : "#6E5D4B", marginBottom: "6px" }}>
                  ASSIGN ROLE (§5.1 RBAC Model)
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="form-select"
                  style={{
                    width: "100%", padding: "10px 36px 10px 14px", borderRadius: "8px",
                    border: darkMode ? "1px solid #4A3C2C" : "1px solid #D5C2A5",
                    background: darkMode ? "#1E140C" : "#FFF8EF",
                    color: darkMode ? "#fff" : "#000",
                    boxSizing: "border-box",
                    cursor: "pointer"
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
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #9C8B76", background: "transparent", color: darkMode ? "#D5C2A5" : "#6E5D4B", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#f15e1c", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                >
                  {submittingInvite ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
