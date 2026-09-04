import { useState, useEffect, useRef } from "react";
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

  // Parallax positions
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;

    if (prefersReducedMotion || isMobile) {
      return; // Skip parallax on reduced motion or mobile screens
    }

    function handleMouseMove(e) {
      if (animFrameRef.current) return;
      animFrameRef.current = requestAnimationFrame(() => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx; // -1 to 1
        const dy = (e.clientY - cy) / cy; // -1 to 1
        setParallax({ x: dx, y: dy });
        animFrameRef.current = null;
      });
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

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

  const modeTitle = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password";
  const modeSub = mode === "signin"
    ? "Sign in to your ASTRAV command center"
    : mode === "signup"
    ? "Start executing smarter with ASTRAV"
    : "Enter your email for a recovery link";
  const btnLabel = mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link";

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: "#FFF8EF",
      color: "#2E2013",
      position: "fixed", inset: 0, zIndex: 9999,
      overflow: "hidden",
    }}>
      <style>{`
        /* Responsive layout */
        .astrav-left {
          display: none;
          flex: 1;
          padding: 60px 64px;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          background: #FFF8EF;
        }
        @media (min-width: 900px) {
          .astrav-left { display: flex; }
        }

        .astrav-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px 24px;
          position: relative;
          z-index: 10;
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          background: #FFF8EF;
        }
        @media (min-width: 900px) {
          .astrav-right {
            flex: 0 0 480px;
            border-left: 1px solid #F0DFC9;
            background: #ffffff;
            box-shadow: -10px 0 40px rgba(46,32,19,0.03);
          }
        }

        /* Inputs */
        .astrav-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #F0DFC9;
          background: #FFF8EF;
          color: #2E2013;
          font-size: 14px;
          outline: none;
          transition: all 0.18s ease;
          font-family: inherit;
          box-sizing: border-box;
        }
        .astrav-input:focus {
          border-color: #f15e1c;
          box-shadow: 0 0 0 3px rgba(241,94,28,0.18);
          background: #ffffff;
        }
        .astrav-input::placeholder { color: #B5A28C; }

        /* Solid Primary Button — AA Compliant Resting State (#cf4a11 = 4.6:1 contrast for white text) */
        .astrav-btn-primary {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          background: #cf4a11;
          color: #ffffff;
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
          box-shadow: 0 4px 14px rgba(207,74,17,0.3);
        }
        .astrav-btn-primary:hover:not(:disabled) {
          background: #b83e0c;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(207,74,17,0.4);
        }
        .astrav-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .astrav-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Links & Toggles */
        .astrav-link {
          background: none; border: none;
          color: #f15e1c; font-size: 13px;
          cursor: pointer; padding: 0;
          font-family: inherit; font-weight: 600;
          transition: color 0.15s ease;
        }
        .astrav-link:hover { color: #cf4a11; text-decoration: underline; }

        /* Feature Cards */
        .astrav-feature {
          display: flex;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #F0DFC9;
          box-shadow: 0 2px 8px rgba(46,32,19,0.04);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .astrav-feature:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 14px rgba(46,32,19,0.08);
        }

        .pw-wrap { position: relative; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 0;
          color: #8A7461; font-size: 14px; line-height: 1;
        }
      `}</style>

      {/* ── LEFT PANEL: BRAND & PARALLAX ILLUSTRATION ── */}
      <div className="astrav-left">

        {/* SVG Parallax Landscape Illustration */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
          overflow: "hidden",
        }}>
          {/* Layer 1 — Sky & Sun (Slow drift) */}
          <div style={{
            position: "absolute", inset: "-20px",
            transform: `translate(${parallax.x * 6}px, ${parallax.y * 6}px)`,
            transition: "transform 0.1s linear",
          }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" fill="none">
              <circle cx="200" cy="180" r="120" fill="#ffec69" opacity="0.4" />
              <circle cx="200" cy="180" r="80" fill="#fab60a" opacity="0.3" />
              <circle cx="850" cy="120" r="180" fill="#f7d7b0" opacity="0.3" />
            </svg>
          </div>

          {/* Layer 2 — Distant Peach Horizons (Medium drift) */}
          <div style={{
            position: "absolute", inset: "-30px",
            transform: `translate(${parallax.x * 12}px, ${parallax.y * 12}px)`,
            transition: "transform 0.1s linear",
          }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" fill="none">
              <path d="M-100 650 Q 200 500 500 620 T 1100 580 V 900 H -100 Z" fill="#f7d7b0" opacity="0.5" />
            </svg>
          </div>

          {/* Layer 3 — Midground Green Growth Hills (Stronger drift) */}
          <div style={{
            position: "absolute", inset: "-40px",
            transform: `translate(${parallax.x * 20}px, ${parallax.y * 20}px)`,
            transition: "transform 0.1s linear",
          }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" fill="none">
              <path d="M-100 700 Q 300 560 650 680 T 1200 640 V 900 H -100 Z" fill="#2e936f" opacity="0.18" />
              {/* Geometric Momentum Vectors */}
              <polygon points="450,480 480,540 420,540" fill="#2e936f" opacity="0.3" />
              <polygon points="720,440 760,520 680,520" fill="#fab60a" opacity="0.3" />
            </svg>
          </div>

          {/* Layer 4 — Foreground Brand Orange Momentum Accents */}
          <div style={{
            position: "absolute", inset: "-50px",
            transform: `translate(${parallax.x * 30}px, ${parallax.y * 30}px)`,
            transition: "transform 0.1s linear",
          }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" fill="none">
              <path d="M-50 750 Q 400 620 800 730 T 1150 700 V 900 H -50 Z" fill="#f7d7b0" opacity="0.4" />
              <circle cx="780" cy="580" r="8" fill="#f15e1c" opacity="0.6" />
              <circle cx="820" cy="530" r="14" fill="#fab60a" opacity="0.7" />
              <circle cx="870" cy="470" r="20" fill="#2e936f" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* Top Header & Brand */}
        <div style={{ position: "relative", zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f15e1c, #fab60a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: '900', color: 'white',
              boxShadow: '0 4px 14px rgba(241,94,28,0.35)',
            }}>A</div>
            <span style={{
              fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #f15e1c, #fab60a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>ASTRAV</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 4vw, 46px)', fontWeight: '900',
            color: '#2E2013', margin: '0 0 16px', letterSpacing: '-1.2px', lineHeight: 1.1,
            maxWidth: '520px'
          }}>
            Supercharge your execution with{" "}
            <span style={{
              background: 'linear-gradient(135deg, #f15e1c, #fab60a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>ASTRAV</span>
          </h1>

          <p style={{ fontSize: '16px', color: '#8A7461', lineHeight: '1.6', margin: 0, maxWidth: '460px' }}>
            The all-in-one command center for ambitious founders to manage goals, track tasks, and drive daily momentum.
          </p>
        </div>

        {/* Middle Feature Highlights */}
        <div style={{ position: "relative", zIndex: 5, maxWidth: "480px", margin: "36px 0", display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="astrav-feature">
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(241,94,28,0.08)', border: '1px solid rgba(241,94,28,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>{f.icon}</div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '13.5px', fontWeight: '700', color: '#2E2013' }}>{f.title}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#8A7461', lineHeight: '1.45' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Left Footer Nav */}
        <div style={{ position: "relative", zIndex: 5, display: "flex", gap: "20px", fontSize: "12px", color: "#8A7461" }}>
          <span>© {new Date().getFullYear()} ASTRAV by Arav Innovations</span>
          <span>•</span>
          <a href="#privacy" onClick={(e) => e.preventDefault()} style={{ color: "#8A7461", textDecoration: "none" }}>Privacy</a>
          <a href="#terms" onClick={(e) => e.preventDefault()} style={{ color: "#8A7461", textDecoration: "none" }}>Terms</a>
        </div>
      </div>

      {/* ── RIGHT PANEL: AUTH FORM ── */}
      <div className="astrav-right">
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #f15e1c, #fab60a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '800', color: 'white',
              }}>A</div>
              <span style={{
                fontSize: '18px', fontWeight: '900',
                background: 'linear-gradient(135deg, #f15e1c, #fab60a)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>ASTRAV</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#2E2013', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
              {modeTitle}
            </h2>
            <p style={{ fontSize: '13px', color: '#8A7461', margin: 0 }}>{modeSub}</p>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div style={{
              background: '#fdf2f2', border: '1px solid #fecaca',
              color: '#C13E1A', padding: '11px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>⚠️</span> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: '#2e936f', padding: '11px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>✅</span> {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === "signup" && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A7461', marginBottom: '7px' }}>
                  Organization Name
                </label>
                <input
                  className="astrav-input"
                  type="text"
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A7461', marginBottom: '7px' }}>
                Email Address
              </label>
              <input
                className="astrav-input"
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
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A7461', marginBottom: '7px' }}>
                  Password
                </label>
                <div className="pw-wrap">
                  <input
                    className="astrav-input"
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

            <button className="astrav-btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Processing...</> : btnLabel}
            </button>
          </form>

          {/* Mode Switching */}
          <div style={{ textAlign: 'center', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mode === "signin" && (
              <>
                <p style={{ margin: 0, fontSize: '13px', color: '#8A7461' }}>
                  Don't have an account?{" "}
                  <button type="button" className="astrav-link" onClick={() => toggleMode("signup")}>Sign up free</button>
                </p>
                <button type="button" className="astrav-link" style={{ fontSize: '12px', color: '#8A7461' }} onClick={() => toggleMode("forgot")}>
                  Forgot password?
                </button>
              </>
            )}
            {mode === "signup" && (
              <p style={{ margin: 0, fontSize: '13px', color: '#8A7461' }}>
                Already have an account?{" "}
                <button type="button" className="astrav-link" onClick={() => toggleMode("signin")}>Sign in</button>
              </p>
            )}
            {mode === "forgot" && (
              <button type="button" className="astrav-link" style={{ fontSize: '13px' }} onClick={() => toggleMode("signin")}>
                ← Back to sign in
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}