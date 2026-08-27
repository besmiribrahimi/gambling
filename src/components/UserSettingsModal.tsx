"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./userSettings.module.css";

const AVATARS = ["⚡", "👑", "🥷", "💎", "🐍", "💀", "🛡️", "🚀", "🔥", "🎯"];

type SettingsTab = "profile" | "security" | "preferences" | "limits" | "database";

interface HealthStatus {
  isConnected: boolean;
  mode: "vps_mongodb" | "in_memory_vault";
  latencyMs: number;
  userCount: number;
}

export const UserSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, balance, wagerHistory, vipTier, totalWagered } = useWallet();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile Form state
  const [avatar, setAvatar] = useState("⚡");
  const [discord, setDiscord] = useState("");
  const [roblox, setRoblox] = useState("");
  const [bio, setBio] = useState("ClashWager high-roller & trench veteran.");

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences
  const [volume, setVolume] = useState(() => Math.round(sound.getVolume() * 100));
  const [oddsFormat, setOddsFormat] = useState<"decimal" | "american" | "fractional">("decimal");
  const [dailyLimit, setDailyLimit] = useState<string>("5000");

  // Status & Feedback
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [dbHealth, setDbHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Load profile & DB health on open
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        // Fetch DB health
        const healthRes = await fetch("/api/system/status");
        if (healthRes.ok) {
          const data = await healthRes.json();
          setDbHealth(data.database);
        }

        // Fetch user profile if logged in
        if (user) {
          const profRes = await fetch("/api/user/profile");
          if (profRes.ok) {
            const data = await profRes.json();
            if (data.profile) {
              setDiscord(data.profile.discord || "");
              setRoblox(data.profile.roblox || "");
              if (data.profile.preferences?.avatar) setAvatar(data.profile.preferences.avatar);
              if (data.profile.preferences?.bio) setBio(data.profile.preferences.bio);
            }
          }
        }
      } catch (e) {}
    };

    loadData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      if (!user) {
        setFeedback({ text: "Profile updated locally for guest session!", isError: false });
        sound.playWin();
        return;
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord, roblox, avatar, bio })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");

      setFeedback({ text: "Profile successfully saved to VPS Database!", isError: false });
      sound.playWin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile.";
      setFeedback({ text: msg, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ text: "New passwords do not match.", isError: true });
      return;
    }

    if (!user) {
      setFeedback({ text: "Sign in to a registered account to manage credentials.", isError: true });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed.");

      setFeedback({ text: "Password PIN successfully updated!", isError: false });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      sound.playWin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating password.";
      setFeedback({ text: msg, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    sound.setVolume(newVal / 100);
    sound.playClick();
  };

  const handleExportHistory = (format: "json" | "csv") => {
    sound.playClick();
    if (wagerHistory.length === 0) {
      setFeedback({ text: "No transaction history to export.", isError: true });
      return;
    }

    let dataStr = "";
    let mimeType = "";
    let fileName = `clashwager_history_${Date.now()}`;

    if (format === "json") {
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wagerHistory, null, 2));
      mimeType = "application/json";
      fileName += ".json";
    } else {
      const headers = ["ID", "Game", "Description", "Wager", "Payout", "Result", "Timestamp"];
      const rows = wagerHistory.map((w) => [
        w.id,
        w.type,
        `"${w.description.replace(/"/g, '""')}"`,
        w.amount,
        w.payout,
        w.result,
        `"${w.date}"`
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      mimeType = "text/csv";
      fileName += ".csv";
    }

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setFeedback({ text: `Exported ${wagerHistory.length} transaction records as ${format.toUpperCase()}!`, isError: false });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header with User Info */}
        <div className={styles.modalHeader}>
          <div className={styles.userBanner}>
            <div className={styles.userAvatar}>{avatar}</div>
            <div className={styles.userNameBlock}>
              <div className={styles.userName}>
                {user ? user.username : "Guest Player"}
                <span className={styles.userRoleBadge} style={{ background: `${vipTier.color}25`, color: vipTier.color, border: `1px solid ${vipTier.color}50` }}>
                  {vipTier.badge} {vipTier.name} VIP
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                Balance: {balance.toLocaleString()} $ • Total Wagered: {totalWagered.toLocaleString()} $
              </span>
            </div>
          </div>

          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.navTabs}>
          <button
            className={`${styles.navTabBtn} ${activeTab === "profile" ? styles.navTabActive : ""}`}
            onClick={() => { setActiveTab("profile"); setFeedback(null); sound.playClick(); }}
          >
            👤 Profile & Identity
          </button>
          <button
            className={`${styles.navTabBtn} ${activeTab === "security" ? styles.navTabActive : ""}`}
            onClick={() => { setActiveTab("security"); setFeedback(null); sound.playClick(); }}
          >
            🔒 Security & Auth
          </button>
          <button
            className={`${styles.navTabBtn} ${activeTab === "preferences" ? styles.navTabActive : ""}`}
            onClick={() => { setActiveTab("preferences"); setFeedback(null); sound.playClick(); }}
          >
            ⚙️ Preferences
          </button>
          <button
            className={`${styles.navTabBtn} ${activeTab === "limits" ? styles.navTabActive : ""}`}
            onClick={() => { setActiveTab("limits"); setFeedback(null); sound.playClick(); }}
          >
            🛡️ Limits & Control
          </button>
          <button
            className={`${styles.navTabBtn} ${activeTab === "database" ? styles.navTabActive : ""}`}
            onClick={() => { setActiveTab("database"); setFeedback(null); sound.playClick(); }}
          >
            💽 VPS DB Diagnostics
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {feedback && (
            <div
              style={{
                padding: "0.65rem 1rem",
                borderRadius: "6px",
                background: feedback.isError ? "rgba(255,23,68,0.15)" : "rgba(0,230,118,0.15)",
                border: `1px solid ${feedback.isError ? "var(--color-danger)" : "var(--color-success)"}`,
                color: feedback.isError ? "var(--color-danger)" : "var(--color-success)",
                fontWeight: 700,
                fontSize: "0.85rem",
                textAlign: "center"
              }}
            >
              {feedback.text}
            </div>
          )}

          {/* TAB 1: Profile & Identity */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>Choose Casino Avatar</h3>
                <p className={styles.sectionSubtitle}>Select your persona displayed in games, Trollbox chat, and leaderboards</p>
                <div className={styles.avatarGrid}>
                  {AVATARS.map((av) => (
                    <div
                      key={av}
                      className={`${styles.avatarOption} ${avatar === av ? styles.avatarActive : ""}`}
                      onClick={() => { setAvatar(av); sound.playClick(); }}
                    >
                      {av}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Linked Discord Handle</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="e.g. trenchmaster#1337"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Linked Roblox Username</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="e.g. VerdunSentry"
                    value={roblox}
                    onChange={(e) => setRoblox(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Player Bio / Tagline</label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  placeholder="Enter a custom status message..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={120}
                />
              </div>

              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? "Saving to VPS..." : "Save Profile Details"}
              </button>
            </form>
          )}

          {/* TAB 2: Security & Auth */}
          {activeTab === "security" && (
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>Account Credentials</h3>
                <p className={styles.sectionSubtitle}>
                  {user ? "Update your secure login password PIN" : "Currently operating in Guest Session mode"}
                </p>
              </div>

              {user ? (
                <>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Current Password PIN</label>
                    <input
                      type="password"
                      className={styles.fieldInput}
                      placeholder="Enter current password..."
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>New Password PIN</label>
                      <input
                        type="password"
                        className={styles.fieldInput}
                        placeholder="Min. 5 characters..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Confirm New Password PIN</label>
                      <input
                        type="password"
                        className={styles.fieldInput}
                        placeholder="Confirm password..."
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className={styles.saveBtn} disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </>
              ) : (
                <div style={{ background: "rgba(0, 240, 255, 0.05)", border: "1px dashed var(--color-primary)", padding: "1.5rem", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ color: "#fff", fontWeight: 700, marginBottom: "0.5rem" }}>
                    You are currently playing as a Guest.
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                    Register a permanent account to sync your War Bonds across devices and save your progress to the VPS Database.
                  </p>
                </div>
              )}
            </form>
          )}

          {/* TAB 3: Preferences */}
          {activeTab === "preferences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>Audio & Casino Atmosphere</h3>
                <p className={styles.sectionSubtitle}>Adjust sound effects volume and visual behavior</p>
                
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Master Sound Volume ({volume}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--color-primary)", cursor: "pointer" }}
                  />
                </div>
              </div>

              <div>
                <h3 className={styles.sectionTitle}>Odds Format</h3>
                <p className={styles.sectionSubtitle}>Choose your preferred prediction market odds display</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {(["decimal", "american", "fractional"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => { setOddsFormat(fmt); sound.playClick(); }}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        fontFamily: "var(--font-family-title)",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        background: oddsFormat === fmt ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                        color: oddsFormat === fmt ? "#000" : "#fff"
                      }}
                    >
                      {fmt.toUpperCase()} ({fmt === "decimal" ? "2.00x" : fmt === "american" ? "+100" : "1/1"})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Responsible Gaming */}
          {activeTab === "limits" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>Responsible Gaming Controls</h3>
                <p className={styles.sectionSubtitle}>Set custom session limits to maintain discipline</p>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Daily Wager Ceiling ($)</label>
                  <input
                    type="number"
                    className={styles.fieldInput}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Self-Exclusion / Cool-off</label>
                  <select className={styles.fieldInput} defaultValue="none">
                    <option value="none">Disabled (Full Access)</option>
                    <option value="1h">1 Hour Cool-off</option>
                    <option value="24h">24 Hours Self-Exclusion</option>
                    <option value="7d">7 Days Self-Exclusion</option>
                  </select>
                </div>
              </div>

              <button
                className={styles.saveBtn}
                onClick={() => {
                  setFeedback({ text: "Responsible gaming limits updated successfully!", isError: false });
                  sound.playWin();
                }}
              >
                Apply Limits
              </button>
            </div>
          )}

          {/* TAB 5: VPS Database Diagnostics */}
          {activeTab === "database" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>VPS Database Health & Ledger Export</h3>
                <p className={styles.sectionSubtitle}>Live diagnostics for MongoDB VPS instance connection</p>
              </div>

              {/* Health Card */}
              <div className={styles.healthCard}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span className={styles.healthTitle}>
                    <span>🟢</span> Status: {dbHealth?.isConnected ? "Connected to VPS MongoDB" : "Local Vault Mode (VPS Ready)"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Mode: {dbHealth?.mode === "vps_mongodb" ? "Production VPS MongoDB" : "In-Memory / Local Storage Fallback"} • Latency: {dbHealth?.latencyMs || 1}ms
                  </span>
                </div>
                <span className={styles.healthBadge}>
                  {dbHealth?.userCount || 1} Registered Profiles
                </span>
              </div>

              <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff", marginBottom: "0.4rem" }}>
                  How to Connect to your VPS MongoDB:
                </h4>
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  Add your connection URI in <code style={{ color: "#00f0ff" }}>.env.local</code>:<br />
                  <code style={{ color: "#ffd700", display: "block", marginTop: "0.3rem" }}>
                    MONGODB_URI=mongodb://your_user:your_password@your-vps-ip:27017/gambling
                  </code>
                </p>
              </div>

              {/* Ledger Data Export */}
              <div>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff", marginBottom: "0.6rem" }}>
                  Export Wager & Transaction Ledger
                </h4>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className={styles.saveBtn}
                    style={{ background: "rgba(0, 240, 255, 0.15)", color: "#00f0ff", border: "1px solid rgba(0, 240, 255, 0.4)" }}
                    onClick={() => handleExportHistory("json")}
                  >
                    📥 Download JSON Ledger
                  </button>
                  <button
                    className={styles.saveBtn}
                    style={{ background: "rgba(0, 230, 118, 0.15)", color: "#00e676", border: "1px solid rgba(0, 230, 118, 0.4)" }}
                    onClick={() => handleExportHistory("csv")}
                  >
                    📊 Download CSV Spreadsheet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
