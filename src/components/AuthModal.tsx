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

      // If user is admin, open admin center notification
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
      <div className={styles.modal}>
        <h2 className={styles.title}>{isLogin ? "Member Sign In" : "Register Permanent Account"}</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", textAlign: "center", marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
          {isLogin
            ? "Access your cloud balance, VIP rakeback vault & tournament positions"
            : `Convert your anonymous session and transfer ${balance.toLocaleString()} $ War Bonds to VPS MongoDB`}
        </p>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          {errorMsg && <div className={styles.error}>{errorMsg}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
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
                <label className={styles.label}>Discord Username</label>
                <input
                  id="input-auth-discord"
                  type="text"
                  className={styles.inputBox}
                  placeholder="e.g. kaiser#1337"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Roblox Username</label>
                <input
                  id="input-auth-roblox"
                  type="text"
                  className={styles.inputBox}
                  placeholder="e.g. TrenchRaider"
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

          <button id="btn-auth-submit" className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Authenticating..." : isLogin ? "Sign In to Account" : "Register & Save Progress"}
          </button>
        </form>

        <div className={styles.toggleLink}>
          {isLogin ? "Playing anonymously?" : "Already registered?"}
          <span 
            id="link-auth-toggle"
            className={styles.toggleAction}
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
          >
            {isLogin ? "Create Account & Transfer Balance" : "Sign In"}
          </span>
        </div>

        <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
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
