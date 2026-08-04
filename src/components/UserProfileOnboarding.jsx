import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function UserProfileOnboarding({ user, onComplete, darkMode }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitProfile(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          age: age ? parseInt(age, 10) : null,
          gender: gender.trim() || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        toast.error(error.message || "Failed to save profile");
      } else {
        toast.success("Profile setup complete!");
        if (onComplete) onComplete();
      }
    } catch (err) {
      toast.error("Error setting up profile");
    } finally {
      setSubmitting(false);
    }
  }

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: darkMode ? "rgba(15, 23, 42, 0.92)" : "rgba(241, 245, 249, 0.92)",
      backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: cardBg, borderRadius: "24px", border: `1px solid ${borderCol}`,
        width: "100%", maxWidth: "480px", padding: "36px", boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>👋</div>
          <h2 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            Welcome to FounderOS!
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: textMuted }}>
            Let's complete your member profile before continuing to your workspace.
          </p>
        </div>

        <form onSubmit={handleSubmitProfile}>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: darkMode ? "#cbd5e1" : "#334155" }}>
              Full Name *
            </label>
            <input
              required
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: "10px",
                border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: textMuted }}>
              Phone Number <span style={{ fontSize: "11px", fontWeight: "400" }}>(Optional - Skippable)</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 019-2834"
              style={{
                width: "100%", padding: "11px 14px", borderRadius: "10px",
                border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "28px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: textMuted }}>
                Age <span style={{ fontSize: "11px", fontWeight: "400" }}>(Optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="28"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: "10px",
                  border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                  color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: textMuted }}>
                Gender <span style={{ fontSize: "11px", fontWeight: "400" }}>(Optional)</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: "10px",
                  border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                  color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                }}
              >
                <option value="">-- Prefer not to say --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", padding: "12px", borderRadius: "12px", border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
              fontWeight: "700", fontSize: "15px", cursor: "pointer", opacity: submitting ? 0.6 : 1,
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)"
            }}
          >
            {submitting ? "Saving Profile..." : "Complete Setup & Continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
