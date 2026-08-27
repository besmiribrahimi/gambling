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
  isBanned?: boolean;
  createdAt?: string;
}

export const AdminModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, matches, resolveMatch } = useWallet();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"metrics" | "users" | "matches" | "broadcast">("metrics");

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
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleAdjustBalance = async (targetId: string) => {
    const amt = parseInt(newBalanceInput);
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

      setMsg({ text: `Balance for ${targetId} set to ${amt} War Bonds!`, isError: false });
      setSelectedUserId(null);
      setNewBalanceInput("");
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

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.discord && u.discord.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <span>⚡</span> CLASHWAGER ADMIN COMMAND CENTER
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalBody}>
          {!isAuthorized ? (
            /* Admin Gate Login */
            <div className={styles.loginBox}>
              <div style={{ fontSize: "3rem" }}>🔐</div>
              <h3 style={{ fontFamily: "var(--font-family-title)", fontSize: "1.4rem", color: "#ff0055" }}>
                Restricted Admin Access
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                Sign in with your Overseer Credentials or Master Passcodes to manage MongoDB Atlas.
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
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.5rem", color: "#fff", fontSize: "0.85rem" }}
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
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.5rem", color: "#fff", fontSize: "0.85rem" }}
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
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.5rem", color: "#fff", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800 }}>Master Passcode 2</label>
                      <input
                        type="password"
                        value={pass2}
                        onChange={(e) => setPass2(e.target.value)}
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.5rem", color: "#fff", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800 }}>Security Layer PIN</label>
                      <input
                        type="password"
                        value={pass3}
                        onChange={(e) => setPass3(e.target.value)}
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "0.5rem", color: "#fff", fontSize: "0.85rem" }}
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
                    padding: "0.75rem",
                    borderRadius: "6px",
                    textTransform: "uppercase",
                    marginTop: "0.5rem",
                    cursor: "pointer"
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
                  className={`${styles.tabBtn} ${activeTab === "metrics" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("metrics"); sound.playClick(); }}
                >
                  📊 Server Metrics
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === "users" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("users"); sound.playClick(); }}
                >
                  👥 Player Roster ({users.length})
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === "matches" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("matches"); sound.playClick(); }}
                >
                  🎯 Settle Esports ({matches.filter((m) => m.status === "live").length})
                </button>
              </div>

              {/* Status Message Alert */}
              {msg && (
                <div style={{
                  padding: "0.6rem 1rem",
                  marginBottom: "1rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: msg.isError ? "rgba(255,23,68,0.15)" : "rgba(0,230,118,0.15)",
                  border: `1px solid ${msg.isError ? "var(--color-danger)" : "var(--color-success)"}`,
                  color: msg.isError ? "var(--color-danger)" : "var(--color-success)"
                }}>
                  {msg.text}
                </div>
              )}

              {/* Tab 1: Server Metrics */}
              {activeTab === "metrics" && (
                <div>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Total Registered Players</span>
                      <span className={styles.statVal}>{users.length}</span>
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
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Banned Users</span>
                      <span className={styles.statVal} style={{ color: "#ff0055" }}>
                        {users.filter((u) => u.isBanned).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Users Management Roster */}
              {activeTab === "users" && (
                <div>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search player by username or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      onClick={fetchUsers}
                      style={{ background: "rgba(0, 240, 255, 0.1)", border: "1px solid rgba(0, 240, 255, 0.3)", color: "var(--color-primary)", borderRadius: "6px", padding: "0 1rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      🔄 Refresh Roster
                    </button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className={styles.userTable}>
                      <thead>
                        <tr>
                          <th>User & Role</th>
                          <th>Discord / Roblox</th>
                          <th>Balance</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} style={u.isBanned ? { opacity: 0.5, background: "rgba(255,23,68,0.05)" } : {}}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ fontWeight: 800, color: u.role === "admin" ? "#ff0055" : "#fff" }}>
                                  {u.username}
                                </span>
                                {u.role === "admin" && (
                                  <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", borderRadius: "3px", background: "rgba(255,0,85,0.2)", color: "#ff0055", border: "1px solid #ff0055", fontWeight: 900 }}>
                                    ⚡ ADMIN
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                                {u.id}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              {u.discord || "—"} / {u.roblox || "—"}
                            </td>
                            <td style={{ fontWeight: 800, color: "var(--color-primary)" }}>
                              {selectedUserId === u.id ? (
                                <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                  <input
                                    type="number"
                                    value={newBalanceInput}
                                    onChange={(e) => setNewBalanceInput(e.target.value)}
                                    placeholder="New $"
                                    style={{ width: "90px", padding: "0.25rem 0.4rem", background: "rgba(0,0,0,0.6)", border: "1px solid #00f0ff", color: "#fff", borderRadius: "4px", fontSize: "0.75rem" }}
                                  />
                                  <button
                                    onClick={() => handleAdjustBalance(u.id)}
                                    style={{ background: "#00f0ff", color: "#000", border: "none", borderRadius: "3px", padding: "0.25rem 0.5rem", fontWeight: 900, cursor: "pointer", fontSize: "0.7rem" }}
                                  >
                                    SAVE
                                  </button>
                                </div>
                              ) : (
                                <span>{u.balance.toLocaleString()} $</span>
                              )}
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
                              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                                <button
                                  className={styles.actionBtn}
                                  onClick={() => {
                                    setSelectedUserId(selectedUserId === u.id ? null : u.id);
                                    setNewBalanceInput(u.balance.toString());
                                  }}
                                >
                                  {selectedUserId === u.id ? "Cancel" : "Set $"}
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

              {/* Tab 3: Settle Esports Matches */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminModal;
