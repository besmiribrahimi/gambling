"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./authModal.module.css";

export const AuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, loginUser, balance, inventory, wagerHistory, setIsAdminOpen } = useWallet();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");
  const [roblox, setRoblox] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Secret Admin sequence listener
  const [keyBuffer, setKeyBuffer] = useState("");

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const char = e.key.toLowerCase();
      if (["s", "h", "j"].includes(char)) {
        setKeyBuffer((prev) => {
          const next = (prev + char).slice(-3);
          if (next === "shj") {
            setIsAuthOpen(false);
            setIsAdminOpen(true);
            return "";
          }
          return next;
        });
      } else {
        setKeyBuffer("");
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [setIsAuthOpen, setIsAdminOpen]);

  if (!isAuthOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { username, password }
        : {
            username,
            discord,
            roblox,
            password,
            guestBalance: balance,
            guestInventory: inventory,
            guestHistory: wagerHistory
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      loginUser(data.user);
      setIsAuthOpen(false);
      setUsername("");
      setDiscord("");
      setRoblox("");
      setPassword("");
      sound.playWin();

      if (data.user.role === "admin") {
        sound.playJackpot();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="modal-auth" className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: "460px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <img
            src="/logo.png"
            alt="WarWager Logo"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "12px",
              border: "2px solid rgba(255, 215, 0, 0.6)",
              boxShadow: "0 0 16px rgba(255, 215, 0, 0.35)",
              objectFit: "cover"
            }}
          />
        </div>
        <h2 className={styles.title}>{isLogin ? "Member Sign In" : "Register Protected Account"}</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", textAlign: "center", marginTop: "-0.4rem", marginBottom: "0.6rem" }}>
          {isLogin
            ? "Access your cloud balance, VIP rakeback vault & tournament positions"
            : `Create an account to claim your 1,000 $ War Bonds welcome bonus!`}
        </p>

        {!isLogin && (
          <div style={{
            background: "rgba(0, 240, 255, 0.06)",
            border: "1px solid rgba(0, 240, 255, 0.25)",
            borderRadius: "6px",
            padding: "0.6rem 0.8rem",
            marginBottom: "0.75rem",
            fontSize: "0.74rem",
            lineHeight: 1.4,
            color: "var(--color-text-secondary)"
          }}>
            <div style={{ color: "var(--color-primary)", fontWeight: 800, marginBottom: "0.2rem" }}>
              🔒 100% Privacy Guarantee & Security:
            </div>
            <div>• Your Roblox & Discord handles are <strong>encrypted and hidden</strong> — they will NEVER be shown anywhere on public leaderboards or chat.</div>
            <div style={{ marginTop: "0.2rem", color: "#ffd700" }}>
              💡 <strong>Tip:</strong> Choose a site username different from your Discord name for complete anonymity.
            </div>
          </div>
        )}
        
        <form className={styles.form} onSubmit={handleSubmit}>
          {errorMsg && <div className={styles.error}>{errorMsg}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Site Username (Public Persona)</label>
            <input
              id="input-auth-username"
              type="text"
              className={styles.inputBox}
              placeholder={isLogin ? "Enter your username..." : "Choose a unique username..."}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  Discord Username <span style={{ color: "#00f0ff", fontSize: "0.7rem" }}>(Private • For Verification)</span>
                </label>
                <input
                  id="input-auth-discord"
                  type="text"
                  className={styles.inputBox}
                  placeholder="e.g. your_discord_handle"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  Roblox Username <span style={{ color: "#00f0ff", fontSize: "0.7rem" }}>(Private • Hidden)</span>
                </label>
                <input
                  id="input-auth-roblox"
                  type="text"
                  className={styles.inputBox}
                  placeholder="e.g. RobloxPlayer123"
                  value={roblox}
                  onChange={(e) => setRoblox(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password PIN</label>
            <input
              id="input-auth-password"
              type="password"
              className={styles.inputBox}
              placeholder={isLogin ? "Enter password..." : "Choose password (min. 5 chars)..."}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div style={{
              background: "rgba(255, 170, 0, 0.08)",
              border: "1px dashed rgba(255, 170, 0, 0.4)",
              borderRadius: "6px",
              padding: "0.55rem 0.75rem",
              fontSize: "0.72rem",
              color: "#ffaa00",
              lineHeight: 1.35
            }}>
              ⚠️ <strong>Verification Notice:</strong> Newly registered accounts are initially unverified. To get verified, message <strong>hangugeoreulgusahalsu</strong> on Discord with a screenshot of your profile.
            </div>
          )}

          <button id="btn-auth-submit" className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Authenticating..." : isLogin ? "Sign In to Account" : "Register & Get 1,000 $ Bonus"}
          </button>
        </form>

        <div className={styles.toggleLink}>
          {isLogin ? "Need a new account?" : "Already registered?"}
          <span 
            id="link-auth-toggle"
            className={styles.toggleAction}
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
          >
            {isLogin ? "Create Account" : "Sign In"}
          </span>
        </div>

        <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setIsAuthOpen(false)}
            style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", fontSize: "0.75rem", cursor: "pointer" }}
          >
            Close ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
