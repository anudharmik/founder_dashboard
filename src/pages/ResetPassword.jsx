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

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Password updated successfully! Redirecting...");
      setTimeout(() => window.location.href = "/", 2000);
    }
    
    setLoading(false);
  }

  return (
    <div className="login-wrapper">
      <style>{`
        .login-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #f3f4f6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 9999;
        }

        .login-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          padding: 40px;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          color: #1f2937;
        }

        .login-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .login-title {
          margin: 0 0 8px;
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }

        .login-subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }

        .form-input {
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #111827;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }

        .form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .login-btn {
          margin-top: 8px;
          padding: 12px;
          border-radius: 6px;
          border: none;
          background: #3b82f6;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease-in-out;
        }

        .login-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-msg {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
          margin-bottom: 16px;
        }
        
        .success-msg {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
          margin-bottom: 16px;
        }
      `}</style>
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Reset Password</h1>
          <p className="login-subtitle">Enter your new password below.</p>
        </div>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}
        {successMsg && <div className="success-msg">{successMsg}</div>}

        <form className="login-form" onSubmit={handleReset}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
