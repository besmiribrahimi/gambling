"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./userSettings.module.css";

const AVATARS = ["⚡", "👑", "🥷", "💎", "🐍", "💀", "🛡️", "🚀", "🔥", "🎯"];

type SettingsTab = "profile" | "security" | "preferences" | "limits" | "history";

export const UserSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, balance, wagerHistory, vipTier, totalWagered, setIsAuthOpen, setIsAdminOpen } = useWallet();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile Form state
  const [avatar, setAvatar] = useState("⚡");
  const [discord, setDiscord] = useState("");
  const [roblox, setRoblox] = useState("");
  const [bio, setBio] = useState("WarWager high-roller & trench veteran.");

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
  const [loading, setLoading] = useState(false);

  // Load profile on open
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
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

  if (!user) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal} style={{ maxWidth: "480px", textAlign: "center", padding: "2.5rem 2rem", alignItems: "center" }}>
          <div style={{ fontSize: "3.2rem", marginBottom: "0.5rem" }}>🔒</div>
          <h2 style={{ fontFamily: "var(--font-family-title)", fontSize: "1.4rem", color: "#fff", marginBottom: "0.5rem" }}>
            Member Settings Locked
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            Anonymous guests cannot modify settings or customize player avatars. Create a free account or sign in to unlock your personal profile, cloud vault, and claim 1,000 $ War Bonds!
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              className={styles.saveBtn}
              style={{ alignSelf: "center" }}
              onClick={() => { onClose(); setIsAuthOpen(true); sound.playClick(); }}
            >
              Sign In / Register
            </button>
            <button
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "6px", padding: "0.75rem 1.2rem", fontWeight: 700, cursor: "pointer" }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      if (!user) {
        setFeedback({ text: "Sign in to save profile settings.", isError: true });
        return;
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord, roblox, avatar, bio })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");

      setFeedback({ text: "Profile settings successfully saved!", isError: false });
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
    if (wagerHistory.length === 0) {
      setFeedback({ text: "No wager history available to export.", isError: true });
      return;
    }

    let fileContent = "";
    let mimeType = "";
    let fileName = `warwager_ledger_${Date.now()}`;

    if (format === "json") {
      fileContent = JSON.stringify(wagerHistory, null, 2);
      mimeType = "application/json";
      fileName += ".json";
    } else {
      const headers = ["ID", "Game Type", "Description", "Amount ($)", "Result", "Payout ($)", "Timestamp"];
      const rows = wagerHistory.map((w) => [
        w.id,
        w.type,
        `"${w.description.replace(/"/g, '""')}"`,
        w.amount,
        w.result,
        w.payout,
        `"${w.date}"`
      ]);
      fileContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      mimeType = "text/csv";
      fileName += ".csv";
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setFeedback({ text: `Exported ${wagerHistory.length} transaction records as ${format.toUpperCase()}!`, isError: false });
  };

  const wonWagers = wagerHistory.filter((w) => w.result === "win").length;
  const lostWagers = wagerHistory.filter((w) => w.result === "lose").length;

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
                {user?.role === "admin" ? (
                  <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(255, 0, 85, 0.25)", color: "#ff0055", border: "1px solid #ff0055", fontWeight: 900 }}>
                    ⚡ ADMIN
                  </span>
                ) : user?.isVerified ? (
                  <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(0, 230, 118, 0.2)", color: "var(--color-success)", border: "1px solid var(--color-success)", fontWeight: 900 }}>
                    🛡️ VERIFIED MEMBER
                  </span>
                ) : (
                  <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(255, 170, 0, 0.2)", color: "#ffaa00", border: "1px solid #ffaa00", fontWeight: 900 }}>
                    ⚠️ UNVERIFIED
                  </span>
                )}
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
            🔒 Security & PIN
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
            className={`${styles.navTabBtn} ${activeTab === "history" ? styles.navTabActive : ""}`}
            onClick={() => { setActiveTab("history"); setFeedback(null); sound.playClick(); }}
          >
            📜 Betting Ledger
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
              {/* Discord Verification Guide Banner */}
              {user && !user.isVerified && user.role !== "admin" && (
                <div style={{
                  background: "rgba(255, 170, 0, 0.08)",
                  border: "1.5px dashed rgba(255, 170, 0, 0.5)",
                  borderRadius: "8px",
                  padding: "0.9rem 1.1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ffaa00", fontWeight: 800, fontSize: "0.88rem" }}>
                    <span>⚠️</span>
                    <span>ACCOUNT UNVERIFIED • DISCORD VERIFICATION REQUIRED</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.45 }}>
                    To verify your account, join our Discord server and message <strong>hangugeoreulgusahalsu</strong> with a screenshot (SC) of this profile!
                  </p>
                </div>
              )}

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
                  <label className={styles.fieldLabel}>
                    Linked Discord Handle <span style={{ color: "#00f0ff", fontSize: "0.68rem" }}>(🔒 Private • Hidden)</span>
                  </label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="e.g. trenchmaster#1337"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Linked Roblox Username <span style={{ color: "#00f0ff", fontSize: "0.68rem" }}>(🔒 Private • Hidden)</span>
                  </label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="e.g. VerdunSentry"
                    value={roblox}
                    onChange={(e) => setRoblox(e.target.value)}
                  />
                </div>
              </div>

              <div style={{
                background: "rgba(0, 240, 255, 0.05)",
                border: "1px solid rgba(0, 240, 255, 0.2)",
                borderRadius: "6px",
                padding: "0.6rem 0.8rem",
                fontSize: "0.74rem",
                color: "var(--color-text-secondary)",
                lineHeight: 1.4
              }}>
                🔒 <strong>Privacy Guarantee:</strong> Your Roblox and Discord usernames are securely encrypted. They are strictly private and will never be shown on public leaderboards, live games, or chat feeds.
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
                {loading ? "Saving Details..." : "Save Profile Details"}
              </button>
            </form>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === "security" && (
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>Change Password PIN</h3>
                <p className={styles.sectionSubtitle}>Update your authentication passcode for enhanced security</p>
              </div>

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
                  <label className={styles.fieldLabel}>Confirm New Password</label>
                  <input
                    type="password"
                    className={styles.fieldInput}
                    placeholder="Re-enter new password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? "Updating PIN..." : "Update Password PIN"}
              </button>
            </form>
          )}

          {/* TAB 3: Preferences */}
          {activeTab === "preferences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>Sound Effects Volume</h3>
                <p className={styles.sectionSubtitle}>Adjust the procedural Web Audio casino synthesizer volume</p>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--color-primary)" }}
                  />
                  <span style={{ fontWeight: 800, minWidth: "45px", textAlign: "right", color: "var(--color-primary)" }}>
                    {volume}%
                  </span>
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
                        color: oddsFormat === fmt ? "#000" : "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer"
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

          {/* TAB 5: Betting History & Ledger Export */}
          {activeTab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 className={styles.sectionTitle}>Player History & Ledger Export</h3>
                <p className={styles.sectionSubtitle}>Review your transaction summary and download complete betting records</p>
              </div>

              {/* Stats overview card */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "0.75rem"
              }}>
                <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", padding: "0.8rem", borderRadius: "6px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", display: "block" }}>Total Transactions</span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>{wagerHistory.length}</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,230,118,0.2)", padding: "0.8rem", borderRadius: "6px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-success)", display: "block" }}>Wagers Won</span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-success)" }}>{wonWagers}</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,23,68,0.2)", padding: "0.8rem", borderRadius: "6px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-danger)", display: "block" }}>Wagers Lost</span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-danger)" }}>{lostWagers}</span>
                </div>
              </div>

              {/* Ledger Data Export */}
              <div style={{ marginTop: "0.5rem" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff", marginBottom: "0.6rem" }}>
                  Download Complete Transaction Ledger
                </h4>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    className={styles.saveBtn}
                    style={{ background: "rgba(0, 240, 255, 0.15)", color: "#00f0ff", border: "1px solid rgba(0, 240, 255, 0.4)", flex: 1, minWidth: "180px" }}
                    onClick={() => handleExportHistory("json")}
                  >
                    📥 Download JSON Ledger
                  </button>
                  <button
                    className={styles.saveBtn}
                    style={{ background: "rgba(0, 230, 118, 0.15)", color: "#00e676", border: "1px solid rgba(0, 230, 118, 0.4)", flex: 1, minWidth: "180px" }}
                    onClick={() => handleExportHistory("csv")}
                  >
                    📊 Download CSV Spreadsheet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Overseer Quick Launch Banner */}
          {user?.role === "admin" && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(255, 0, 85, 0.25)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ff0055", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  ⚡ Overseer Clearance Active
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                  Open Command Center to manage citizens, treasury, and locks
                </span>
              </div>
              <button
                onClick={() => { onClose(); setIsAdminOpen(true); sound.playJackpot(); }}
                style={{
                  background: "rgba(255, 0, 85, 0.15)",
                  border: "1.5px solid #ff0055",
                  color: "#ff0055",
                  padding: "0.45rem 0.9rem",
                  borderRadius: "6px",
                  fontWeight: 900,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: "0 0 12px rgba(255, 0, 85, 0.3)"
                }}
              >
                Launch Admin Panel ⚡
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
