"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./admin.module.css";

interface AdminUserData {
  id: string;
  username: string;
  discord?: string;
  roblox?: string;
  balance: number;
  role?: "admin" | "user";
  isVerified?: boolean;
  isBanned?: boolean;
  createdAt?: string;
  history?: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    result: string;
    payout: number;
    date: string;
  }>;
  inventory?: Array<{
    id: string;
    name: string;
    rarity: string;
    value: number;
  }>;
}

export const AdminModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, matches, resolveMatch } = useWallet();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"metrics" | "users" | "airdrop" | "matches" | "export">("users");
  const [rosterFilter, setRosterFilter] = useState<"all" | "pending" | "verified" | "banned">("all");

  // Admin login form state
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [pass1, setPass1] = useState("super_long_admin_password_layer_one_987654321_clashwager");
  const [pass2, setPass2] = useState("super_long_admin_password_layer_two_123456789_clashwager");
  const [pass3, setPass3] = useState("macaj");
  const [usePasscodes, setUsePasscodes] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin Data state
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [circulatingBalance, setCirculatingBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState("");
  const [airdropAmount, setAirdropAmount] = useState<number>(1000);
  const [inspectedUser, setInspectedUser] = useState<AdminUserData | null>(null);
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Match Form
  const [newMatchGame, setNewMatchGame] = useState("Entrenched League V");
  const [newMatchTeamA, setNewMatchTeamA] = useState("");
  const [newMatchTeamB, setNewMatchTeamB] = useState("");
  const [newMatchOddsA, setNewMatchOddsA] = useState("1.75");
  const [newMatchOddsB, setNewMatchOddsB] = useState("2.10");
  const [newMatchQuestion, setNewMatchQuestion] = useState("");

  // Fetch admin check on open
  const checkAuth = useCallback(async () => {
    try {
      if (user?.role === "admin") {
        setIsAuthorized(true);
        fetchUsers();
        return;
      }

      const res = await fetch("/api/admin/check");
      const data = await res.json();
      if (data.authorized) {
        setIsAuthorized(true);
        fetchUsers();
      } else {
        setIsAuthorized(false);
      }
    } catch (e) {
      setIsAuthorized(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen, checkAuth]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setCirculatingBalance(data.circulatingBalance || 0);
      }
    } catch (e) {}
  };

  if (!isOpen) return null;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    try {
      const payload = usePasscodes
        ? { pass1, pass2, pass3 }
        : { username: adminUsername, password: adminPassword, pass1, pass2, pass3 };

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed.");

      setIsAuthorized(true);
      fetchUsers();
      sound.playJackpot();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Invalid credentials.";
      setAuthError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async (targetId: string, customAmt?: number) => {
    const amt = customAmt !== undefined ? customAmt : parseInt(newBalanceInput);
    if (isNaN(amt) || amt < 0) {
      setMsg({ text: "Please enter a valid balance amount.", isError: true });
      return;
    }

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust-balance",
          userId: targetId,
          amount: amt
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update balance.");

      setMsg({ text: `Balance for ${targetId} set to ${amt.toLocaleString()} War Bonds!`, isError: false });
      setSelectedUserId(null);
      setNewBalanceInput("");
      fetchUsers();
      sound.playWin();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  const handleQuickAdd = async (targetId: string, addAmt: number) => {
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick-add",
          userId: targetId,
          amount: addAmt
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant funds.");

      setMsg({ text: `Granted +${addAmt.toLocaleString()} $ to player ${targetId}!`, isError: false });
      fetchUsers();
      sound.playJackpot();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  const handleAirdropAll = async () => {
    if (airdropAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "airdrop-all",
          amount: airdropAmount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Airdrop failed.");

      setMsg({ text: `🎉 Massive Airdrop Success! Granted ${airdropAmount.toLocaleString()} $ to ${data.updatedCount} players!`, isError: false });
      fetchUsers();
      sound.playJackpot();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Airdrop error.";
      setMsg({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerification = async (targetId: string, currentVerification: boolean) => {
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-verification",
          userId: targetId,
          isVerified: !currentVerification
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update verification status.");

      setMsg({
        text: `Player ${targetId} is now ${!currentVerification ? "VERIFIED ✅" : "UNVERIFIED ⚠️"}!`,
        isError: false
      });
      fetchUsers();
      sound.playWin();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  const handleToggleBan = async (targetId: string, currentBan: boolean) => {
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-ban",
          userId: targetId,
          isBanned: !currentBan
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle ban.");

      setMsg({ text: `User ${targetId} ban state updated!`, isError: false });
      fetchUsers();
      sound.playClick();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  const handleToggleRole = async (targetId: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-role",
          userId: targetId,
          role: nextRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change role.");

      setMsg({ text: `User ${targetId} role updated to ${nextRole.toUpperCase()}!`, isError: false });
      fetchUsers();
      sound.playJackpot();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    sound.playClick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadRosterBackup = () => {
    const jsonStr = JSON.stringify(users, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warwager_roster_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMsg({ text: `Exported complete database roster (${users.length} users) to JSON backup!`, isError: false });
  };

  const pendingCount = users.filter((u) => !u.isVerified && u.role !== "admin").length;
  const verifiedCount = users.filter((u) => u.isVerified || u.role === "admin").length;
  const bannedCount = users.filter((u) => u.isBanned).length;

  const filteredUsers = users.filter((u) => {
    if (rosterFilter === "pending" && (u.isVerified || u.role === "admin")) return false;
    if (rosterFilter === "verified" && (!u.isVerified && u.role !== "admin")) return false;
    if (rosterFilter === "banned" && !u.isBanned) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.discord && u.discord.toLowerCase().includes(q)) ||
      (u.roblox && u.roblox.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <img
              src="/logo.png"
              alt="WarWager Insignia"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "1.5px solid rgba(255, 0, 85, 0.8)",
                boxShadow: "0 0 12px rgba(255, 0, 85, 0.5)",
                objectFit: "cover"
              }}
            />
            <span>WARWAGER OVERSEER COMMAND CENTER</span>
            <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", borderRadius: "4px", background: "rgba(0, 240, 255, 0.15)", color: "#00f0ff", border: "1px solid #00f0ff", fontWeight: 800 }}>
              LEVEL 5 OVERSEER
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close Admin Panel">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalBody}>
          {!isAuthorized ? (
            /* Admin Gate Login */
            <div className={styles.loginBox}>
              <div style={{ fontSize: "3rem" }}>🔐</div>
              <h3 style={{ fontFamily: "var(--font-family-title)", fontSize: "1.4rem", color: "#ff0055", margin: 0 }}>
                Restricted Overseer Clearance
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>
                Sign in with your master Overseer Credentials to manage MongoDB Atlas.
              </p>

              {authError && (
                <div style={{ padding: "0.5rem", background: "rgba(255,23,68,0.2)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", borderRadius: "4px", fontSize: "0.8rem" }}>
                  {authError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
                {!usePasscodes ? (
                  <>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800 }}>Admin Username</label>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="e.g. admin"
                        required
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.55rem", color: "#fff", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800 }}>Admin Password PIN</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter master password..."
                        required
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.55rem", color: "#fff", fontSize: "0.85rem" }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800 }}>Master Passcode 1</label>
                      <input
                        type="password"
                        value={pass1}
                        onChange={(e) => setPass1(e.target.value)}
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.55rem", color: "#fff", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800 }}>Master Passcode 2</label>
                      <input
                        type="password"
                        value={pass2}
                        onChange={(e) => setPass2(e.target.value)}
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.55rem", color: "#fff", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800 }}>Security Layer PIN</label>
                      <input
                        type="password"
                        value={pass3}
                        onChange={(e) => setPass3(e.target.value)}
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.55rem", color: "#fff", fontSize: "0.85rem" }}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span
                    onClick={() => setUsePasscodes(!usePasscodes)}
                    style={{ fontSize: "0.72rem", color: "#00f0ff", cursor: "pointer", textDecoration: "underline" }}
                  >
                    {usePasscodes ? "Use Username / Password instead" : "Use Secret Passcodes instead"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #ff0055 0%, #bd00ff 100%)",
                    color: "#fff",
                    fontFamily: "var(--font-family-title)",
                    fontWeight: 900,
                    padding: "0.8rem",
                    borderRadius: "6px",
                    textTransform: "uppercase",
                    marginTop: "0.5rem",
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(255, 0, 85, 0.4)",
                    border: "none"
                  }}
                >
                  {loading ? "Authenticating..." : "Unlock Admin Command Center"}
                </button>
              </form>
            </div>
          ) : (
            /* Authorized Admin Console */
            <>
              {/* Top Navigation Tabs */}
              <div className={styles.tabNav}>
                <button
                  className={`${styles.tabBtn} ${activeTab === "users" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("users"); sound.playClick(); }}
                >
                  👥 Player Database ({users.length}) {pendingCount > 0 && <span style={{ background: "#ffaa00", color: "#000", padding: "0.1rem 0.4rem", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 900 }}>{pendingCount} PENDING</span>}
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === "metrics" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("metrics"); sound.playClick(); }}
                >
                  📊 Server Telemetry
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === "airdrop" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("airdrop"); sound.playClick(); }}
                >
                  🎁 Mass Airdrop Hub
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === "matches" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("matches"); sound.playClick(); }}
                >
                  🎯 Esports Markets ({matches.filter((m) => m.status === "live").length})
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === "export" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("export"); sound.playClick(); }}
                >
                  💽 DB Backups
                </button>
              </div>

              {/* Status Message Alert */}
              {msg && (
                <div style={{
                  padding: "0.65rem 1rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: msg.isError ? "rgba(255,23,68,0.15)" : "rgba(0,230,118,0.15)",
                  border: `1px solid ${msg.isError ? "var(--color-danger)" : "var(--color-success)"}`,
                  color: msg.isError ? "var(--color-danger)" : "var(--color-success)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span>{msg.text}</span>
                  <span onClick={() => setMsg(null)} style={{ cursor: "pointer", marginLeft: "1rem" }}>✕</span>
                </div>
              )}

              {/* TAB 1: User Database & Verification */}
              {activeTab === "users" && (
                <div>
                  {/* Search and Subfilters */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button
                        onClick={() => setRosterFilter("all")}
                        style={{
                          padding: "0.4rem 0.8rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          background: rosterFilter === "all" ? "var(--color-primary)" : "rgba(255,255,255,0.06)",
                          color: rosterFilter === "all" ? "#000" : "#fff",
                          border: "none"
                        }}
                      >
                        All Players ({users.length})
                      </button>
                      <button
                        onClick={() => setRosterFilter("pending")}
                        style={{
                          padding: "0.4rem 0.8rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          background: rosterFilter === "pending" ? "#ffaa00" : "rgba(255, 170, 0, 0.1)",
                          color: rosterFilter === "pending" ? "#000" : "#ffaa00",
                          border: "1px solid rgba(255, 170, 0, 0.3)"
                        }}
                      >
                        ⚠️ Pending Verification ({pendingCount})
                      </button>
                      <button
                        onClick={() => setRosterFilter("verified")}
                        style={{
                          padding: "0.4rem 0.8rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          background: rosterFilter === "verified" ? "var(--color-success)" : "rgba(0, 230, 118, 0.1)",
                          color: rosterFilter === "verified" ? "#000" : "var(--color-success)",
                          border: "1px solid rgba(0, 230, 118, 0.3)"
                        }}
                      >
                        🛡️ Verified ({verifiedCount})
                      </button>
                      <button
                        onClick={() => setRosterFilter("banned")}
                        style={{
                          padding: "0.4rem 0.8rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          background: rosterFilter === "banned" ? "#ff0055" : "rgba(255, 0, 85, 0.1)",
                          color: rosterFilter === "banned" ? "#fff" : "#ff0055",
                          border: "1px solid rgba(255, 0, 85, 0.3)"
                        }}
                      >
                        🚫 Banned ({bannedCount})
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search player, discord, roblox..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ minWidth: "240px" }}
                      />
                      <button
                        onClick={fetchUsers}
                        style={{ background: "rgba(0, 240, 255, 0.12)", border: "1px solid rgba(0, 240, 255, 0.4)", color: "var(--color-primary)", borderRadius: "6px", padding: "0 0.9rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <table className={styles.userTable}>
                      <thead>
                        <tr>
                          <th>Player & Role</th>
                          <th>Private Handles (Discord / Roblox)</th>
                          <th>Balance ($)</th>
                          <th>Verification</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} style={u.isBanned ? { opacity: 0.5, background: "rgba(255,23,68,0.06)" } : {}}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ fontWeight: 800, color: u.role === "admin" ? "#ff0055" : "#fff", fontSize: "0.92rem" }}>
                                  {u.username}
                                </span>
                                {u.role === "admin" && (
                                  <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(255,0,85,0.2)", color: "#ff0055", border: "1px solid #ff0055", fontWeight: 900 }}>
                                    ⚡ ADMIN
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                                ID: {u.id}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "#00f0ff", fontWeight: 700 }}>
                                <span>💬 {u.discord || "Not set"}</span>
                                {u.discord && (
                                  <button
                                    onClick={() => handleCopy(u.discord || "", `dc_${u.id}`)}
                                    style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "0.65rem" }}
                                  >
                                    {copiedKey === `dc_${u.id}` ? "✅" : "📋"}
                                  </button>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                                <span>🎮 {u.roblox || "Not set"}</span>
                                {u.roblox && (
                                  <button
                                    onClick={() => handleCopy(u.roblox || "", `rbx_${u.id}`)}
                                    style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "0.65rem" }}
                                  >
                                    {copiedKey === `rbx_${u.id}` ? "✅" : "📋"}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ fontWeight: 800, color: "var(--color-primary)" }}>
                              {selectedUserId === u.id ? (
                                <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                  <input
                                    type="number"
                                    value={newBalanceInput}
                                    onChange={(e) => setNewBalanceInput(e.target.value)}
                                    placeholder="New $"
                                    style={{ width: "85px", padding: "0.25rem 0.4rem", background: "rgba(0,0,0,0.6)", border: "1px solid #00f0ff", color: "#fff", borderRadius: "4px", fontSize: "0.75rem" }}
                                  />
                                  <button
                                    onClick={() => handleAdjustBalance(u.id)}
                                    style={{ background: "#00f0ff", color: "#000", border: "none", borderRadius: "3px", padding: "0.25rem 0.45rem", fontWeight: 900, cursor: "pointer", fontSize: "0.7rem" }}
                                  >
                                    SET
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  <span style={{ fontSize: "0.95rem" }}>{u.balance.toLocaleString()} $</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                                background: u.isVerified || u.role === "admin" ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 170, 0, 0.15)",
                                color: u.isVerified || u.role === "admin" ? "var(--color-success)" : "#ffaa00",
                                border: `1px solid ${u.isVerified || u.role === "admin" ? "var(--color-success)" : "#ffaa00"}`
                              }}>
                                {u.isVerified || u.role === "admin" ? "🛡️ VERIFIED" : "⚠️ UNVERIFIED"}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                color: u.isBanned ? "var(--color-danger)" : "var(--color-success)"
                              }}>
                                {u.isBanned ? "🚫 BANNED" : "🟢 ACTIVE"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "0.3rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                {u.role !== "admin" && (
                                  <button
                                    onClick={() => handleToggleVerification(u.id, !!u.isVerified)}
                                    style={{
                                      background: u.isVerified ? "rgba(255, 170, 0, 0.15)" : "rgba(0, 230, 118, 0.2)",
                                      border: `1px solid ${u.isVerified ? "#ffaa00" : "var(--color-success)"}`,
                                      color: u.isVerified ? "#ffaa00" : "var(--color-success)",
                                      borderRadius: "4px",
                                      padding: "0.25rem 0.5rem",
                                      fontSize: "0.72rem",
                                      fontWeight: 800,
                                      cursor: "pointer"
                                    }}
                                  >
                                    {u.isVerified ? "Unverify" : "Verify ✅"}
                                  </button>
                                )}

                                <button
                                  onClick={() => handleQuickAdd(u.id, 5000)}
                                  title="Quick Add +5,000 War Bonds"
                                  style={{ background: "rgba(255, 215, 0, 0.15)", border: "1px solid rgba(255, 215, 0, 0.4)", color: "#ffd700", borderRadius: "4px", padding: "0.25rem 0.45rem", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                                >
                                  +5k $
                                </button>

                                <button
                                  className={styles.actionBtn}
                                  onClick={() => {
                                    setSelectedUserId(selectedUserId === u.id ? null : u.id);
                                    setNewBalanceInput(u.balance.toString());
                                  }}
                                >
                                  {selectedUserId === u.id ? "Cancel" : "Custom $"}
                                </button>

                                <button
                                  onClick={() => setInspectedUser(u)}
                                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "4px", padding: "0.25rem 0.45rem", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                                >
                                  Inspect 🔍
                                </button>

                                <button
                                  className={u.isBanned ? styles.unbanBtn : styles.banBtn}
                                  onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                                >
                                  {u.isBanned ? "Unban" : "Ban"}
                                </button>

                                <button
                                  className={styles.promoteBtn}
                                  onClick={() => handleToggleRole(u.id, u.role || "user")}
                                >
                                  {u.role === "admin" ? "Demote" : "Promote"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Server Telemetry */}
              {activeTab === "metrics" && (
                <div>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Total Registered Profiles</span>
                      <span className={styles.statVal}>{users.length}</span>
                    </div>
                    <div className={styles.statCard} style={{ borderColor: "rgba(255, 170, 0, 0.4)" }}>
                      <span className={styles.statLabel} style={{ color: "#ffaa00" }}>Pending Discord Verification</span>
                      <span className={styles.statVal} style={{ color: "#ffaa00" }}>{pendingCount}</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Circulating War Bonds</span>
                      <span className={styles.statVal} style={{ color: "#ffd700" }}>
                        {circulatingBalance.toLocaleString()} $
                      </span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Active Esports Markets</span>
                      <span className={styles.statVal} style={{ color: "#00f0ff" }}>
                        {matches.length}
                      </span>
                    </div>
                    <div className={styles.statCard} style={{ borderColor: "rgba(255, 0, 85, 0.4)" }}>
                      <span className={styles.statLabel} style={{ color: "#ff0055" }}>Banned Accounts</span>
                      <span className={styles.statVal} style={{ color: "#ff0055" }}>{bannedCount}</span>
                    </div>
                    <div className={styles.statCard} style={{ borderColor: "rgba(0, 230, 118, 0.4)" }}>
                      <span className={styles.statLabel} style={{ color: "var(--color-success)" }}>Database Connection</span>
                      <span className={styles.statVal} style={{ color: "var(--color-success)", fontSize: "1.1rem" }}>
                        🟢 Atlas Connected
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.5rem", background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.2)", borderRadius: "8px", padding: "1.2rem" }}>
                    <h4 style={{ color: "var(--color-primary)", margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                      🛡️ Overseer Verification Protocol:
                    </h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                      When users join, they are instructed to DM <strong>hangugeoreulgusahalsu</strong> on Discord with a screenshot of their profile. Use the <strong>Player Database</strong> tab to cross-reference their private Discord/Roblox handles and click <strong>Verify ✅</strong> to grant full member status!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: Mass Airdrop Hub */}
              {activeTab === "airdrop" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-family-title)", color: "#ffd700", margin: "0 0 0.3rem 0" }}>
                      🎁 Global Treasury Airdrop Engine
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>
                      Grant bonus War Bonds directly to all {users.length} registered players simultaneously on MongoDB Atlas.
                    </p>
                  </div>

                  <div style={{ background: "rgba(255, 215, 0, 0.06)", border: "1px solid rgba(255, 215, 0, 0.25)", borderRadius: "8px", padding: "1.5rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff", display: "block", marginBottom: "0.5rem" }}>
                      Select Airdrop Amount per Player ($):
                    </label>
                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                      {[500, 1000, 2500, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAirdropAmount(amt)}
                          style={{
                            padding: "0.5rem 1rem",
                            borderRadius: "6px",
                            fontFamily: "var(--font-family-title)",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            background: airdropAmount === amt ? "#ffd700" : "rgba(255,255,255,0.06)",
                            color: airdropAmount === amt ? "#000" : "#fff",
                            border: "1px solid rgba(255, 215, 0, 0.3)",
                            cursor: "pointer"
                          }}
                        >
                          +{amt.toLocaleString()} $
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <input
                        type="number"
                        value={airdropAmount}
                        onChange={(e) => setAirdropAmount(Number(e.target.value))}
                        placeholder="Custom amount..."
                        style={{ width: "160px", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.6)", border: "1px solid #ffd700", color: "#fff", borderRadius: "6px", fontSize: "0.9rem" }}
                      />
                      <button
                        onClick={handleAirdropAll}
                        disabled={loading || airdropAmount <= 0}
                        style={{
                          background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)",
                          color: "#000",
                          fontFamily: "var(--font-family-title)",
                          fontWeight: 900,
                          padding: "0.65rem 1.4rem",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)"
                        }}
                      >
                        {loading ? "Distributing Funds..." : `🚀 Execute Airdrop of ${airdropAmount.toLocaleString()} $ to ALL Players`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Settle Esports Matches */}
              {activeTab === "matches" && (
                <div>
                  <h4 style={{ fontFamily: "var(--font-family-title)", color: "#fff", marginBottom: "1rem" }}>
                    Live Entrenched League V Markets
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {matches.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "1rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>
                            {m.teamA} vs {m.teamB}
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            Odds A: {m.oddsA}x • Odds B: {m.oddsB}x • Status: {m.status.toUpperCase()}
                          </span>
                        </div>

                        {m.status === "live" ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => { resolveMatch(m.id, "teamA"); sound.playWin(); }}
                              style={{ background: "rgba(0, 240, 255, 0.15)", border: "1px solid #00f0ff", color: "#00f0ff", borderRadius: "4px", padding: "0.4rem 0.8rem", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}
                            >
                              Declare {m.teamA} Win
                            </button>
                            <button
                              onClick={() => { resolveMatch(m.id, "teamB"); sound.playWin(); }}
                              style={{ background: "rgba(255, 0, 85, 0.15)", border: "1px solid #ff0055", color: "#ff0055", borderRadius: "4px", padding: "0.4rem 0.8rem", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}
                            >
                              Declare {m.teamB} Win
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--color-success)" }}>
                            ✅ SETTLED (Winner: {m.winner === "teamA" ? m.teamA : m.teamB})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: DB Backups & Diagnostics */}
              {activeTab === "export" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-family-title)", color: "#00f0ff", margin: "0 0 0.3rem 0" }}>
                      💽 Database Diagnostics & Roster Backups
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>
                      Download secure JSON backups of all registered accounts, balance sheets, and wager ledgers.
                    </p>
                  </div>

                  <div style={{ background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.2)", borderRadius: "8px", padding: "1.2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                          Full Player Database Snapshot
                        </div>
                        <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                          Contains {users.length} accounts, hashed credentials, balances & VIP tiers
                        </span>
                      </div>
                      <button
                        onClick={handleDownloadRosterBackup}
                        style={{
                          background: "rgba(0, 240, 255, 0.2)",
                          border: "1px solid #00f0ff",
                          color: "#00f0ff",
                          padding: "0.6rem 1.2rem",
                          borderRadius: "6px",
                          fontWeight: 800,
                          cursor: "pointer",
                          fontSize: "0.8rem"
                        }}
                      >
                        📥 Download JSON Backup
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Player Inspector Modal */}
        {inspectedUser && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            zIndex: 10
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.3rem" }}>🔍</span>
                <h3 style={{ fontFamily: "var(--font-family-title)", color: "#fff", margin: 0 }}>
                  Player Dossier: {inspectedUser.username}
                </h3>
              </div>
              <button
                onClick={() => setInspectedUser(null)}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1.2rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Player ID</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>{inspectedUser.id}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Balance</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-primary)" }}>{inspectedUser.balance.toLocaleString()} $</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Linked Discord</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#00f0ff" }}>{inspectedUser.discord || "None"}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Linked Roblox</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>{inspectedUser.roblox || "None"}</span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              <h4 style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
                Recent Transactions ({inspectedUser.history?.length || 0})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {(!inspectedUser.history || inspectedUser.history.length === 0) ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No transaction history recorded yet.</span>
                ) : (
                  inspectedUser.history.slice(0, 15).map((h) => (
                    <div key={h.id} style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.4)", padding: "0.5rem 0.8rem", borderRadius: "4px", fontSize: "0.78rem" }}>
                      <span>{h.type.toUpperCase()}: {h.description}</span>
                      <span style={{ fontWeight: 800, color: h.result === "win" ? "var(--color-success)" : "var(--color-danger)" }}>
                        {h.result === "win" ? `+${h.payout} $` : `-${h.amount} $`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
