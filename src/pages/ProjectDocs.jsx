import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function ProjectDocs({ user, darkMode }) {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { activeOrg, userRole } = useOrg() || {};

  const [project, setProject] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  // New Doc Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (projectId && activeOrg) {
      loadProjectAndDocs();
    }
  }, [projectId, activeOrg]);

  async function loadProjectAndDocs() {
    setLoading(true);
    try {
      // 1. Fetch Project details
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      setProject(projData);

      // 2. Fetch Project Docs
      const { data: docsData } = await supabase
        .from('project_docs')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

      setDocs(docsData || []);

      // 3. Evaluate effective role for write access
      if (userRole === 'owner' || userRole === 'manager') {
        setCanEdit(true);
      } else {
        // Check scoped permissions
        const { data: hasScoped } = await supabase.rpc('has_effective_role', {
          p_user_id: user?.id,
          p_entity_type: 'project',
          p_entity_id: projectId,
          p_required_role: 'manager'
        });
        setCanEdit(!!hasScoped);
      }

    } catch (err) {
      console.error("Error loading project docs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDoc(e) {
    e.preventDefault();
    if (!canEdit) {
      toast.error("Permission denied: You need Manager role on this project to create docs.");
      return;
    }

    if (!newDocTitle.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    setCreating(true);
    try {
      const { data: newDoc, error } = await supabase
        .from('project_docs')
        .insert({
          org_id: activeOrg.id,
          project_id: projectId,
          title: newDocTitle.trim(),
          content: '<p>Start typing your project document content here...</p>',
          created_by: user?.id,
          updated_by: user?.id
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message || "Failed to create document");
      } else {
        toast.success("Document created!");
        setShowCreateModal(false);
        setNewDocTitle('');
        navigate(`/projects/${projectId}/docs/${newDoc.id}`);
      }
    } catch (err) {
      toast.error("Error creating document");
    } finally {
      setCreating(false);
    }
  }

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  function stripHtml(html) {
    if (!html) return 'Empty document';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || 'Empty document';
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back Link */}
      <Link
        to={`/projects/${projectId}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#818cf8", fontSize: "13px", fontWeight: "600", textDecoration: "none", marginBottom: "16px" }}
      >
        ← Back to {project ? project.title : "Project"}
      </Link>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: "rgba(99,102,241,0.15)", color: "#818cf8", textTransform: "uppercase" }}>
              📄 Documentation
            </span>
            <span style={{ fontSize: "13px", color: textMuted }}>
              {project ? project.title : ''}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            Project Knowledge & Specs
          </h1>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "10px 20px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
              fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)"
            }}
          >
            + New Document
          </button>
        )}
      </div>

      {/* Docs Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: textMuted }}>Loading project documentation...</div>
      ) : docs.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "56px 20px", background: cardBg, borderRadius: "20px",
          border: `1px dashed ${borderCol}`
        }}>
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>📄</div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            No documentation pages created yet
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: "14px", color: textMuted, maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
            Keep your team aligned by creating specs, technical architecture docs, and meeting notes.
          </p>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 20px", borderRadius: "8px", border: "none",
                background: "#6366f1", color: "white", fontWeight: "600", fontSize: "13.5px", cursor: "pointer"
              }}
            >
              + Create First Document
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {docs.map(doc => (
            <div
              key={doc.id}
              onClick={() => navigate(`/projects/${projectId}/docs/${doc.id}`)}
              style={{
                background: cardBg, borderRadius: "16px", border: `1px solid ${borderCol}`,
                padding: "20px", cursor: "pointer", display: "flex", flexDirection: "column",
                justify: "space-between", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", transition: "all 0.15s ease"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                    📄 {doc.title}
                  </h3>
                </div>

                <p style={{
                  margin: "0 0 16px", fontSize: "13px", color: textMuted,
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden"
                }}>
                  {stripHtml(doc.content)}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", color: textMuted, borderTop: `1px solid ${borderCol}`, paddingTop: "12px" }}>
                <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                <span style={{ color: "#6366f1", fontWeight: "600" }}>View & Edit →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Document Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "450px", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                Create New Document
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateDoc}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12.5px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Document Title *
                </label>
                <input
                  required
                  autoFocus
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Architecture Overview, API Spec"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: textMuted, fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: creating ? 0.6 : 1
                  }}
                >
                  {creating ? "Creating..." : "Create Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
