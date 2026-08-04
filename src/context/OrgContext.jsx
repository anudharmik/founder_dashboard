import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const OrgContext = createContext();

export function OrgProvider({ children, user }) {
  const [activeOrg, setActiveOrg] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'owner' | 'manager' | 'employee' | 'guest'
  const [userOrgs, setUserOrgs] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // Load user organizations when authenticated
  useEffect(() => {
    if (user) {
      fetchUserOrganizations();
    } else {
      setActiveOrg(null);
      setUserRole(null);
      setUserOrgs([]);
      setOrgMembers([]);
      setLoadingOrg(false);
    }
  }, [user]);

  // Fetch all organizations the logged-in user belongs to
  async function fetchUserOrganizations() {
    setLoadingOrg(true);
    try {
      // Auto-claim any pending invites matching the logged-in user's email
      if (user?.email) {
        try {
          const { data: pendingInvites } = await supabase
            .from('org_invites')
            .select('token')
            .eq('email', user.email.toLowerCase())
            .eq('status', 'pending');

          if (pendingInvites && pendingInvites.length > 0) {
            for (const inv of pendingInvites) {
              await supabase.rpc('accept_org_invite', { p_token: inv.token });
            }
          }
        } catch (inviteErr) {
          console.warn("Notice: org_invites auto-claim check skipped:", inviteErr.message);
        }
      }

      const { data: memberRows, error } = await supabase
        .from('org_members')
        .select(`
          id,
          role,
          department_id,
          org_id,
          organizations ( id, name, created_at )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.warn("Notice: org_members fetch error (table may not be migrated yet):", error.message);
        // Fallback for single-tenant mode prior to migration execution
        setLoadingOrg(false);
        return;
      }

      if (memberRows && memberRows.length > 0) {
        const orgsList = memberRows.map(m => ({
          ...m.organizations,
          memberId: m.id,
          role: m.role,
          departmentId: m.department_id
        })).filter(o => o && o.id);

        setUserOrgs(orgsList);

        // Retain current selection if valid, else pick first org
        const currentStoredId = localStorage.getItem('active_org_id');
        const selected = orgsList.find(o => o.id === currentStoredId) || orgsList[0];

        if (selected) {
          setActiveOrg(selected);
          setUserRole(selected.role);
          localStorage.setItem('active_org_id', selected.id);
          fetchOrgMembers(selected.id);
        }
      } else {
        setUserOrgs([]);
        setActiveOrg(null);
        setUserRole(null);
      }
    } catch (err) {
      console.error("Failed to load user orgs:", err);
    } finally {
      setLoadingOrg(false);
    }
  }

  const [profilesMap, setProfilesMap] = useState({});

  // Fetch all members for an active organization & their profiles
  async function fetchOrgMembers(orgId) {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('*')
        .eq('org_id', orgId);

      if (!error && data) {
        setOrgMembers(data);

        // Fetch profiles for member user_ids
        const userIds = data.map(m => m.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

          if (profs) {
            const pMap = {};
            profs.forEach(p => { pMap[p.id] = p; });
            setProfilesMap(pMap);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch org members & profiles:", err);
    }
  }

  // Switch active organization
  function switchOrg(orgId) {
    const target = userOrgs.find(o => o.id === orgId);
    if (target) {
      setActiveOrg(target);
      setUserRole(target.role);
      localStorage.setItem('active_org_id', target.id);
      fetchOrgMembers(target.id);
    }
  }

  // Helper to resolve display name (Full Name -> Email -> Truncated UUID)
  function getMemberDisplayName(userId) {
    if (!userId) return 'Unassigned';
    const prof = profilesMap[userId];
    if (prof && prof.full_name) return prof.full_name;
    if (user && user.id === userId && user.email) return user.email;
    return `${userId.slice(0, 8)}...`;
  }

  // Helper flags matching RBAC matrix (§5.2)
  const isOwner = userRole === 'owner';
  const isManager = userRole === 'manager';
  const isEmployee = userRole === 'employee';
  const isGuest = userRole === 'guest';

  // Permission checks
  const canManageOrg = isOwner;
  const canManageDepartments = isOwner;
  const canManageTeams = isOwner || isManager;
  const canManageProjects = isOwner || isManager;
  const canManageGoals = isOwner || isManager;
  const canOverrideProgress = isOwner || isManager;
  const canAssignWork = isOwner || isManager;
  const canApproveTask = isOwner || isManager;
  const canRequestAITasks = isOwner || isManager;

  const value = {
    activeOrg,
    userRole,
    userOrgs,
    orgMembers,
    loadingOrg,
    switchOrg,
    refreshOrgData: fetchUserOrganizations,
    fetchOrgMembers,
    isOwner,
    isManager,
    isEmployee,
    isGuest,
    canManageOrg,
    canManageDepartments,
    canManageTeams,
    canManageProjects,
    canManageGoals,
    canOverrideProgress,
    canAssignWork,
    canApproveTask,
    canRequestAITasks,
    profilesMap,
    getMemberDisplayName
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
