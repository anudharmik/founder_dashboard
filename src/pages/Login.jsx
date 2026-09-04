import { useState } from "react";
import { supabase } from "../supabaseClient";

const FEATURES = [
  { icon: "🎯", title: "Goal Tracking", desc: "Set and monitor goals with real-time progress tracking across all your projects." },
  { icon: "✅", title: "Task Management", desc: "Organize tasks with deadlines, priority sorting, and instant completion feedback." },
  { icon: "🤖", title: "AI Insights", desc: "Gemini-powered recommendations that tell you what to focus on every day." },
  { icon: "📊", title: "Analytics", desc: "Visual charts showing weekly trends, goal completion, and productivity scores." },
];

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [orgName, setOrgName] = useState("");

  async function handleSubmit(e) {
    try {
      e.preventDefault();
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setErrorMsg(error.message);
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setErrorMsg(error.message);
        } else {
          // If session or user is created immediately (or when email confirmation is disabled/auto-confirmed)
          const newUserId = data.user?.id;
          if (newUserId) {
            try {
              const nameToUse = orgName.trim() || `${email.split('@')[0]}'s Org`;
              const { data: orgData, error: orgErr } = await supabase
                .from("organizations")
                .insert({ name: nameToUse })
                .select()
                .single();

              if (!orgErr && orgData) {
                await supabase.from("org_members").upsert({
                  org_id: orgData.id,
                  user_id: newUserId,
                  role: "owner"
                }, { onConflict: "org_id, user_id" });
              }
            } catch (createErr) {
              console.warn("Org scaffolding on signup notice:", createErr);
            }
          }
          setSuccessMsg("Account created! You can now sign in.");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setErrorMsg(error.message);
        else setSuccessMsg("Password reset link sent to your email!");
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleMode(newMode) {
    setMode(newMode);
    setErrorMsg("");
    setSuccessMsg("");
  }

  const modeTitle = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password";
  const modeSub = mode === "signin"
    ? "Sign in to your command center"
    : mode === "signup"
    ? "Start building smarter today"
    : "We'll send you a reset link";
  const btnLabel = mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link";

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: "#080f1e",
      position: "fixed", inset: 0, zIndex: 9999,
      overflow: "hidden",
    }}>
      <style>{`
        /* Animated background blobs */
        .login-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 8s ease-in-out infinite;
          pointer-events: none;
        }

        /* Left panel — feature list */
        .login-left {
          display: none;
          flex: 1;
          padding: 60px 56px;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 900px) {
          .login-left { display: flex; }
        }

        /* Right panel — form */
        .login-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px 24px;
          position: relative;
          z-index: 2;
          flex: 1;
          min-width: 0;
          overflow-y: auto;
        }
        @media (min-width: 900px) {
          .login-right {
            flex: 0 0 460px;
            border-left: 1px solid rgba(255,255,255,0.06);
            background: rgba(255,255,255,0.02);
            backdrop-filter: blur(20px);
          }
        }

        /* Inputs */
        .login-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
          font-family: inherit;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
          background: rgba(99,102,241,0.06);
        }
        .login-input::placeholder { color: rgba(148,163,184,0.4); }

        /* Submit button */
        .login-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.5);
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Toggle buttons */
        .toggle-btn {
          background: none; border: none;
          color: #818cf8; font-size: 13px;
          cursor: pointer; padding: 0;
          font-family: inherit; font-weight: 600;
          transition: color 0.15s ease;
        }
        .toggle-btn:hover { color: #a5b4fc; text-decoration: underline; }

        /* Feature card */
        .feature-item {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.18s ease;
          animation: slideUp 0.4s ease both;
        }
        .feature-item:hover {
          background: rgba(255,255,255,0.07);
          transform: translateX(4px);
        }
        .feature-item:nth-child(1) { animation-delay: 0.1s; }
        .feature-item:nth-child(2) { animation-delay: 0.18s; }
        .feature-item:nth-child(3) { animation-delay: 0.26s; }
        .feature-item:nth-child(4) { animation-delay: 0.34s; }

        /* Password toggle */
        .pw-wrap { position: relative; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 0;
          color: rgba(148,163,184,0.5); font-size: 14px; line-height: 1;
          transition: color 0.15s ease;
        }
        .pw-toggle:hover { color: rgba(148,163,184,0.9); }
      `}</style>

      {/* Background blobs */}
      <div className="login-blob" style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent)', top: '-100px', left: '-100px', animationDelay: '0s' }} />
      <div className="login-blob" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent)', bottom: '-80px', left: '30%', animationDelay: '3s' }} />
      <div className="login-blob" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(236,72,153,0.2), transparent)', top: '30%', right: '-60px', animationDelay: '6s' }} />

      {/* ── LEFT PANEL ── */}
      <div className="login-left">
        {/* Brand */}
        <div style={{ marginBottom: '48px', animation: 'slideUp 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: '900', color: 'white',
              boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
            }}>F</div>
            <span style={{
              fontSize: '22px', fontWeight: '900',
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Founder OS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '900', color: '#f1f5f9', margin: '0 0 12px', letterSpacing: '-1px', lineHeight: 1.15 }}>
            The OS for{" "}
            <span style={{
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>ambitious</span>{" "}founders
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(148,163,184,0.7)', lineHeight: '1.6', margin: 0, maxWidth: '420px' }}>
            Manage goals, track tasks, and get AI-driven focus recommendations — all in one place.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-item">
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>{f.icon}</div>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>{f.title}</p>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(148,163,184,0.65)', lineHeight: '1.5' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ marginTop: '48px', fontSize: '12px', color: 'rgba(100,116,139,0.6)', animation: 'fadeIn 0.6s 0.5s ease both', opacity: 0 }}>
          Built for founders who ship fast ⚡
        </p>
      </div>

      {/* ── RIGHT PANEL — FORM ── */}
      <div className="login-right">
        <div style={{ width: '100%', maxWidth: '380px', animation: 'slideUp 0.4s ease' }}>
          {/* Mobile brand */}
          <div style={{ textAlign: 'center', marginBottom: '32px', display: 'block' }}>
            <p style={{
              fontSize: '18px', fontWeight: '900',
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: '0 0 6px',
            }}>Founder OS</p>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#f1f5f9', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
              {modeTitle}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(100,116,139,0.8)', margin: 0 }}>{modeSub}</p>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', padding: '11px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px', animation: 'slideDown 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>⚠️</span> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              color: '#4ade80', padding: '11px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px', animation: 'slideDown 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>✅</span> {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === "signup" && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.7)', marginBottom: '7px' }}>
                  Organization Name
                </label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.7)', marginBottom: '7px' }}>
                Email
              </label>
              <input
                className="login-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.7)', marginBottom: '7px' }}>
                  Password
                </label>
                <div className="pw-wrap">
                  <input
                    className="login-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    style={{ paddingRight: '40px' }}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
            )}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Processing...</> : btnLabel}
            </button>
          </form>

          {/* Mode toggles */}
          <div style={{ textAlign: 'center', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mode === "signin" && (
              <>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(100,116,139,0.7)' }}>
                  Don't have an account?{" "}
                  <button type="button" className="toggle-btn" onClick={() => toggleMode("signup")}>Sign up free</button>
                </p>
                <button type="button" className="toggle-btn" style={{ fontSize: '12px', color: 'rgba(100,116,139,0.6)' }} onClick={() => toggleMode("forgot")}>
                  Forgot password?
                </button>
              </>
            )}
            {mode === "signup" && (
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(100,116,139,0.7)' }}>
                Already have an account?{" "}
                <button type="button" className="toggle-btn" onClick={() => toggleMode("signin")}>Sign in</button>
              </p>
            )}
            {mode === "forgot" && (
              <button type="button" className="toggle-btn" style={{ color: 'rgba(100,116,139,0.7)', fontSize: '13px' }} onClick={() => toggleMode("signin")}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}