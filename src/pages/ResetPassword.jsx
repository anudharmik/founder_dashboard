import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const queryParams = new URLSearchParams(window.location.search);
    const tokenHash = queryParams.get("token_hash");

    if (tokenHash) {
      // Verify token_hash first to authenticate the user session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

      if (verifyError) {
        setErrorMsg(verifyError.message);
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Password updated! Redirecting...");
      setTimeout(() => (window.location.href = "/"), 2000);
    }

    setLoading(false);
  }

  return (
    <div className="lw">
      <style>{`
        .lw {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #2E2013;
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
          background: radial-gradient(ellipse at 30% 40%, rgba(241, 94, 28, 0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .lc {
          background: #1E140C;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 40px;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
          position: relative;
        }
        .lbrand-name {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 6px;
          text-align: center;
          display: block;
        }
        .ltitle {
          font-size: 22px;
          font-weight: 700;
          color: #FFF3E2;
          margin: 0 0 4px;
          text-align: center;
        }
        .lsub {
          font-size: 13px;
          color: #9C8B76;
          margin: 0 0 28px;
          text-align: center;
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
          color: #B3A18C;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .finput {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: #2E2013;
          color: #FFF3E2;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
        }
        .finput:focus {
          border-color: #f15e1c;
          box-shadow: 0 0 0 3px rgba(241,94,28,0.18);
        }
        .lbtn {
          margin-top: 6px;
          padding: 11px;
          border-radius: 8px;
          border: none;
          background: #f15e1c;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
          box-shadow: 0 2px 8px rgba(241,94,28,0.35);
        }
        .lbtn:hover:not(:disabled) { background: #cf4a11; }
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
      `}</style>

      <div className="lc">
        <span className="lbrand-name">ASTRAV</span>
        <h1 className="ltitle">Reset Password</h1>
        <p className="lsub">Enter your new password below.</p>

        {errorMsg && <div className="lerr">{errorMsg}</div>}
        {successMsg && <div className="lsuc">{successMsg}</div>}

        <form className="lform" onSubmit={handleReset}>
          <div className="fgroup">
            <label className="flabel">New Password</label>
            <input className="finput" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <button className="lbtn" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
