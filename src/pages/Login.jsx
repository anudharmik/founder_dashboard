import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mode, setMode] = useState("signin");

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
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setErrorMsg(error.message);
        else setSuccessMsg("Account created! You can now sign in.");
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
    ? "Sign in to your Founder OS"
    : mode === "signup"
    ? "Get started with your command center"
    : "We'll send you a link to reset your password";

  return (
    <div className="lw">
      <style>{`
        .lw {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #0f172a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          padding: 20px;
          box-sizing: border-box;
          position: fixed;
          inset: 0;
          z-index: 9999;
        }
        .lw::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.12) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 70%, rgba(139,92,246,0.08) 0%, transparent 60%);
          pointer-events: none;
        }
        .lc {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 40px;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
          position: relative;
        }
        .lbrand {
          text-align: center;
          margin-bottom: 32px;
        }
        .lbrand-name {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 6px;
        }
        .ltitle {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 4px;
          letter-spacing: -0.3px;
        }
        .lsub {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }
        .lform {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .fgroup {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .flabel {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .finput {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: #0f172a;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
        }
        .finput:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .finput::placeholder { color: #334155; }
        .lbtn {
          margin-top: 6px;
          padding: 11px;
          border-radius: 8px;
          border: none;
          background: #6366f1;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
          box-shadow: 0 2px 8px rgba(99,102,241,0.35);
        }
        .lbtn:hover:not(:disabled) { background: #4f46e5; }
        .lbtn:disabled { opacity: 0.5; cursor: not-allowed; }
        .lerr {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
          margin-bottom: 4px;
        }
        .lsuc {
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.25);
          color: #4ade80;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
          margin-bottom: 4px;
        }
        .ltoggle {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tbtn {
          background: none;
          border: none;
          color: #818cf8;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }
        .tbtn:hover { text-decoration: underline; }
      `}</style>

      <div className="lc">
        <div className="lbrand">
          <p className="lbrand-name">Founder OS</p>
          <h1 className="ltitle">{modeTitle}</h1>
          <p className="lsub">{modeSub}</p>
        </div>

        {errorMsg && <div className="lerr">{errorMsg}</div>}
        {successMsg && <div className="lsuc">{successMsg}</div>}

        <form className="lform" onSubmit={handleSubmit}>
          <div className="fgroup">
            <label className="flabel">Email</label>
            <input className="finput" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {mode !== "forgot" && (
            <div className="fgroup">
              <label className="flabel">Password</label>
              <input className="finput" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}

          <button className="lbtn" type="submit" disabled={loading}>
            {loading ? "Processing..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
          </button>
        </form>

        <div className="ltoggle">
          {mode === "signin" && (
            <>
              <div>No account? <button type="button" className="tbtn" onClick={() => toggleMode("signup")}>Sign up</button></div>
              <div><button type="button" className="tbtn" onClick={() => toggleMode("forgot")}>Forgot password?</button></div>
            </>
          )}
          {mode === "signup" && (
            <div>Already have one? <button type="button" className="tbtn" onClick={() => toggleMode("signin")}>Sign in</button></div>
          )}
          {mode === "forgot" && (
            <div><button type="button" className="tbtn" onClick={() => toggleMode("signin")}>Back to sign in</button></div>
          )}
        </div>
      </div>
    </div>
  );
}