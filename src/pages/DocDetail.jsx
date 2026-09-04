import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../supabaseClient';
import DocEditor from '../components/DocEditor';
import toast from 'react-hot-toast';

export default function DocDetail({ user, darkMode }) {
  const { id: projectId, docId } = useParams();
  const navigate = useNavigate();
  const { activeOrg, userRole, getMemberDisplayName } = useOrg() || {};

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [editsList, setEditsList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Unsaved changes window reload / close guard
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function handleBackNavigation(targetPath) {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave without saving?")) {
        navigate(targetPath);
      }
    } else {
      navigate(targetPath);
    }
  }

  useEffect(() => {
    if (docId && projectId && activeOrg) {
      loadDocAndHistory();
    }
  }, [docId, projectId, activeOrg]);

  async function loadDocAndHistory() {
    setLoading(true);
    try {
      // 1. Fetch document
      const { data: docData, error } = await supabase
        .from('project_docs')
        .select('*')
        .eq('id', docId)
        .single();

      if (error || !docData) {
        toast.error("Document not found or access denied");
        navigate(`/projects/${projectId}/docs`);
        return;
      }

      setDoc(docData);
      setTitle(docData.title || '');
      setHtmlContent(docData.content || '');

      // 2. Fetch version history (project_doc_edits)
      const { data: historyData } = await supabase
        .from('project_doc_edits')
        .select('*')
        .eq('doc_id', docId)
        .order('edited_at', { ascending: false });

      setEditsList(historyData || []);

      // 3. Evaluate effective permissions
      if (userRole === 'owner' || userRole === 'manager') {
        setCanEdit(true);
      } else {
        const { data: hasScoped } = await supabase.rpc('has_effective_role', {
          p_user_id: user?.id,
          p_entity_type: 'project',
          p_entity_id: projectId,
          p_required_role: 'manager'
        });
        setCanEdit(!!hasScoped);
      }

    } catch (err) {
      console.error("Error loading document:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDoc() {
    if (!canEdit) {
      toast.error("Permission denied: You cannot edit this document.");
      return;
    }

    setSaving(true);
    try {
      const nowStr = new Date().toISOString();

      // 1. Update project_docs
      const { error: docError } = await supabase
        .from('project_docs')
        .update({
          title: title.trim() || 'Untitled Document',
          content: htmlContent,
          updated_by: user?.id,
          updated_at: nowStr
        })
        .eq('id', docId);

      if (docError) {
        toast.error(docError.message || "Failed to save document");
        return;
      }

      // 2. Log version history entry in project_doc_edits
      await supabase
        .from('project_doc_edits')
        .insert({
          doc_id: docId,
          editor_id: user?.id,
          edited_at: nowStr
        });

      toast.success("Document saved successfully!");
      setIsDirty(false);

      // Refresh version history list
      const { data: updatedHistory } = await supabase
        .from('project_doc_edits')
        .select('*')
        .eq('doc_id', docId)
        .order('edited_at', { ascending: false });

      setEditsList(updatedHistory || []);

    } catch (err) {
      toast.error("Error saving document");
    } finally {
      setSaving(false);
    }
  }

  const cardBg = darkMode ? "#1E140C" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#E8D9C5";
  const textMuted = darkMode ? "#B3A18C" : "#9C8B76";

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px", color: textMuted }}>Loading document...</div>;
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <Link
          to={`/projects/${projectId}/docs`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#f15e1c", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}
        >
          ← Back to Project Docs List
        </Link>

        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            padding: "6px 14px", borderRadius: "8px", border: `1px solid ${borderCol}`,
            background: showHistory ? "rgba(241, 94, 28, 0.15)" : (darkMode ? "#2E2013" : "#FFF8EF"),
            color: showHistory ? "#f15e1c" : textMuted, fontWeight: "600", fontSize: "12.5px", cursor: "pointer"
          }}
        >
          📜 Version History ({editsList.length})
        </button>
      </div>

      {/* Editor Main Section + History Sidebar Layout */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {/* Title Header Bar */}
          <div style={{
            background: cardBg, borderRadius: "16px", border: `1px solid ${borderCol}`,
            padding: "20px 24px", marginBottom: "20px", display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
          }}>
            <input
              disabled={!canEdit}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Document Title"
              style={{
                fontSize: "22px", fontWeight: "800", background: "none", border: "none",
                color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", width: "100%"
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "12px", shrink: 0 }}>
              {isDirty && (
                <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "600" }}>
                  ● Unsaved changes
                </span>
              )}

              {canEdit && (
                <button
                  onClick={handleSaveDoc}
                  disabled={saving}
                  style={{
                    padding: "9px 20px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #2e936f, #24785a)", color: "white",
                    fontWeight: "700", fontSize: "13.5px", cursor: "pointer", opacity: saving ? 0.6 : 1,
                    boxShadow: "0 4px 12px rgba(46, 147, 111, 0.3)"
                  }}
                >
                  {saving ? "Saving..." : "💾 Save Document"}
                </button>
              )}
            </div>
          </div>

          {/* Rich Text Editor */}
          <DocEditor
            content={htmlContent}
            onChange={(newHtml) => {
              setHtmlContent(newHtml);
              setIsDirty(true);
            }}
            editable={canEdit}
            darkMode={darkMode}
          />
        </div>

        {/* Version History Side Drawer */}
        {showHistory && (
          <div style={{
            width: "300px", background: cardBg, borderRadius: "16px", border: `1px solid ${borderCol}`,
            padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", shrink: 0
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                📜 Edit Audit Log
              </h3>
              <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer" }}>✕</button>
            </div>

            {editsList.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: textMuted, margin: 0 }}>
                No save history logged for this document yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "500px", overflowY: "auto" }}>
                {editsList.map((edit, idx) => (
                  <div
                    key={edit.id}
                    style={{
                      padding: "10px 12px", borderRadius: "8px",
                      background: darkMode ? "#2E2013" : "#FFF8EF", border: `1px solid ${borderCol}`,
                      fontSize: "12px"
                    }}
                  >
                    <div style={{ fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013", marginBottom: "2px" }}>
                      Edit #{editsList.length - idx}
                    </div>
                    <div style={{ color: textMuted, fontSize: "11px" }}>
                      Editor: 👤 {getMemberDisplayName ? getMemberDisplayName(edit.editor_id) : edit.editor_id.slice(0, 8) + '...'}
                    </div>
                    <div style={{ color: textMuted, fontSize: "11px", marginTop: "2px" }}>
                      {new Date(edit.edited_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
