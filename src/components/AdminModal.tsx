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
  const [pass1, setPass1] = useState("super_long_admin_password_layer_one_987654321_clashwager");
  const [pass2, setPass2] = useState("super_long_admin_password_layer_two_123456789_clashwager");
  const [pass3, setPass3] = useState("macaj");
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
      // If currently logged in user has role === "admin", they are automatically authorized
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
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass1, pass2, pass3 })
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

      setMsg({ text: `User ${targetId} promoted to ${nextRole.toUpperCase()}!`, isError: false });
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
                Authenticate with multi-layer master passcodes to access VPS DB controls.
              </p>

              {authError && (
                <div style={{ padding: "0.5rem", background: "rgba(255,23,68,0.2)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", borderRadius: "4px", fontSize: "0.8rem" }}>
                  {authError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
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
                  {loading ? "Authenticating..." : "Authenticate as Overseer"}
                </button>
              </form>
            </div>
          ) : (
            /* Authorized Admin Console */
            <>
              {/* Tabs */}
              <div className={styles.navTabs} style={{ padding: 0 }}>
                <button
                  className={`${styles.navTabBtn} ${activeTab === "metrics" ? styles.navTabActive : ""}`}
                  onClick={() => setActiveTab("metrics")}
                >
                  📊 Server Metrics
                </button>
                <button
                  className={`${styles.navTabBtn} ${activeTab === "users" ? styles.navTabActive : ""}`}
                  onClick={() => setActiveTab("users")}
                >
                  👥 Player Roster ({users.length})
                </button>
                <button
                  className={`${styles.navTabBtn} ${activeTab === "matches" ? styles.navTabActive : ""}`}
                  onClick={() => setActiveTab("matches")}
                >
                  🎯 Settle Esports ({matches.length})
                </button>
              </div>

              {msg && (
                <div
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: "6px",
                    background: msg.isError ? "rgba(255,23,68,0.2)" : "rgba(0,230,118,0.2)",
                    border: `1px solid ${msg.isError ? "var(--color-danger)" : "var(--color-success)"}`,
                    color: msg.isError ? "var(--color-danger)" : "var(--color-success)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    textAlign: "center"
                  }}
                >
                  {msg.text}
                </div>
              )}

              {/* TAB 1: Metrics */}
              {activeTab === "metrics" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Registered Profiles</span>
                      <span className={styles.statVal} style={{ color: "var(--color-primary)" }}>{users.length}</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Circulating War Bonds</span>
                      <span className={styles.statVal} style={{ color: "#ffd700" }}>{circulatingBalance.toLocaleString()} $</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Active Esports Contracts</span>
                      <span className={styles.statVal} style={{ color: "#00e676" }}>{matches.length}</span>
                    </div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,0,85,0.3)", borderRadius: "8px", padding: "1.25rem" }}>
                    <h4 style={{ color: "#ff0055", fontWeight: 800, marginBottom: "0.5rem" }}>
                      🛡️ Administrator Authority Level: FULL OVERSEER
                    </h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      You have full authority to credit or debit user balances, ban fraudulent accounts, promote administrators, and resolve live esports tournament contracts.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Users Management */}
              {activeTab === "users" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                    <input
                      type="text"
                      placeholder="Search player by username or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        padding: "0.5rem 0.85rem",
                        color: "#fff",
                        fontSize: "0.85rem"
                      }}
                    />
                    <button
                      onClick={fetchUsers}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      🔄 Refresh Roster
                    </button>
                  </div>

                  <div className={styles.tableContainer}>
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
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 800, color: u.role === "admin" ? "#ff0055" : "#fff" }}>
                                  {u.username} {u.role === "admin" ? "⚡ [ADMIN]" : ""}
                                </span>
                                <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>{u.id}</span>
                              </div>
                            </td>
                            <td style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                              {u.discord || "—"} / {u.roblox || "—"}
                            </td>
                            <td style={{ fontFamily: "var(--font-family-title)", fontWeight: 800, color: "var(--color-primary)" }}>
                              {u.balance.toLocaleString()} $
                            </td>
                            <td>
                              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: u.isBanned ? "var(--color-danger)" : "var(--color-success)" }}>
                                {u.isBanned ? "🔴 BANNED" : "🟢 ACTIVE"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {selectedUserId === u.id ? (
                                <div style={{ display: "inline-flex", gap: "0.3rem" }}>
                                  <input
                                    type="number"
                                    placeholder="New $"
                                    value={newBalanceInput}
                                    onChange={(e) => setNewBalanceInput(e.target.value)}
                                    style={{ width: "80px", background: "rgba(0,0,0,0.6)", border: "1px solid var(--color-primary)", color: "#fff", borderRadius: "4px", padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}
                                  />
                                  <button className={`${styles.actionBtn} ${styles.btnEdit}`} onClick={() => handleAdjustBalance(u.id)}>Save</button>
                                  <button className={styles.actionBtn} onClick={() => setSelectedUserId(null)}>✕</button>
                                </div>
                              ) : (
                                <>
                                  <button className={`${styles.actionBtn} ${styles.btnEdit}`} onClick={() => { setSelectedUserId(u.id); setNewBalanceInput(u.balance.toString()); }}>
                                    Set $
                                  </button>
                                  <button
                                    className={`${styles.actionBtn} ${u.isBanned ? styles.btnUnban : styles.btnBan}`}
                                    onClick={() => handleToggleBan(u.id, u.isBanned || false)}
                                  >
                                    {u.isBanned ? "Unban" : "Ban"}
                                  </button>
                                  <button
                                    className={styles.actionBtn}
                                    style={{ marginLeft: "0.3rem", background: "rgba(255,215,0,0.1)", border: "1px solid #ffd700", color: "#ffd700" }}
                                    onClick={() => handleToggleRole(u.id, u.role || "user")}
                                  >
                                    {u.role === "admin" ? "Demote" : "Promote Admin"}
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Settle Esports Matches */}
              {activeTab === "matches" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {matches.map((m) => (
                    <div key={m.id} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", padding: "1rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontWeight: 800 }}>{m.game}</span>
                        <h4 style={{ color: "#fff", fontSize: "0.95rem", margin: "0.2rem 0" }}>{m.time}</h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          Status: {m.status.toUpperCase()} {m.winner !== "none" ? `(Winner: ${m.winner.toUpperCase()})` : ""}
                        </span>
                      </div>

                      {m.status !== "completed" ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => { resolveMatch(m.id, "teamA"); setMsg({ text: `Settled ${m.game} as YES winner!`, isError: false }); sound.playJackpot(); }}
                            style={{ background: "rgba(0,230,118,0.15)", border: "1px solid var(--color-success)", color: "var(--color-success)", padding: "0.4rem 0.8rem", borderRadius: "4px", fontWeight: 800, fontSize: "0.75rem", cursor: "pointer" }}
                          >
                            Settle YES ({m.oddsA}x)
                          </button>
                          <button
                            onClick={() => { resolveMatch(m.id, "teamB"); setMsg({ text: `Settled ${m.game} as NO winner!`, isError: false }); sound.playJackpot(); }}
                            style={{ background: "rgba(255,0,85,0.15)", border: "1px solid #ff0055", color: "#ff0055", padding: "0.4rem 0.8rem", borderRadius: "4px", fontWeight: 800, fontSize: "0.75rem", cursor: "pointer" }}
                          >
                            Settle NO ({m.oddsB}x)
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 700 }}>Settled</span>
                      )}
                    </div>
                  ))}
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
