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
  isLocked?: boolean;
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

interface AuditLogItem {
  id: string;
  action: string;
  details: string;
  targetUser?: string;
  admin: string;
  timestamp: string;
}

export const AdminModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, matches, resolveMatch } = useWallet();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminDisplayName, setAdminDisplayName] = useState("Master Overseer");
  const [activeTab, setActiveTab] = useState<"users" | "metrics" | "airdrop" | "matches" | "audit" | "backups">("users");
  const [rosterFilter, setRosterFilter] = useState<"all" | "pending" | "verified" | "locked" | "banned" | "admin">("all");

  // Admin Login State (Clean inputs - NO pre-filled hardcoded credentials)
  const [loginMode, setLoginMode] = useState<"secret" | "credentials">("secret");
  const [secretCode, setSecretCode] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin Data State
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [circulatingBalance, setCirculatingBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState("");
  const [airdropAmount, setAirdropAmount] = useState<number>(1000);
  const [onlyVerifiedAirdrop, setOnlyVerifiedAirdrop] = useState(false);
  const [inspectedUser, setInspectedUser] = useState<AdminUserData | null>(null);
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isCasinoLocked, setIsCasinoLocked] = useState(false);

  // New Match Form State
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [newMatchGame, setNewMatchGame] = useState("Entrenched League V");
  const [newMatchTeamA, setNewMatchTeamA] = useState("");
  const [newMatchTeamB, setNewMatchTeamB] = useState("");
  const [newMatchOddsA, setNewMatchOddsA] = useState("1.75");
  const [newMatchOddsB, setNewMatchOddsB] = useState("2.10");
  const [newMatchQuestion, setNewMatchQuestion] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setCirculatingBalance(data.circulatingBalance || 0);
        if (typeof data.isCasinoLocked === "boolean") {
          setIsCasinoLocked(data.isCasinoLocked);
        }
      }
    } catch (e) {}
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/action");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        if (typeof data.isCasinoLocked === "boolean") {
          setIsCasinoLocked(data.isCasinoLocked);
        }
      }
    } catch (e) {}
  }, []);

  // Fetch admin check on open
  const checkAuth = useCallback(async () => {
    try {
      if (user?.role === "admin") {
        setIsAuthorized(true);
        setAdminDisplayName(user.username);
        fetchUsers();
        fetchAuditLogs();
        return;
      }

      const res = await fetch("/api/admin/check");
      const data = await res.json();
      if (data.authorized) {
        setIsAuthorized(true);
        if (data.adminUser) setAdminDisplayName(data.adminUser);
        fetchUsers();
        fetchAuditLogs();
      } else {
        setIsAuthorized(false);
      }
    } catch (e) {
      setIsAuthorized(false);
    }
  }, [user, fetchUsers, fetchAuditLogs]);

  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen, checkAuth]);

  if (!isOpen) return null;

  // Handler: Overseer Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    try {
      const payload =
        loginMode === "secret"
          ? { secretKey: secretCode.trim() }
          : { username: adminUsername.trim(), password: adminPassword };

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed.");

      setIsAuthorized(true);
      if (data.adminUser) setAdminDisplayName(data.adminUser);
      setSecretCode("");
      setAdminPassword("");
      fetchUsers();
      fetchAuditLogs();
      sound.playJackpot();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Invalid credentials.";
      setAuthError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Lock Console / Logout Admin Session
  const handleLockConsole = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (e) {}
    setIsAuthorized(false);
    setInspectedUser(null);
    setSelectedUserId(null);
    setMsg({ text: "🔒 Overseer Console securely locked.", isError: false });
    sound.playClick();
  };

  // Handler: Fast Account Freeze / Lock Toggle
  const handleToggleLock = async (targetId: string, currentLocked: boolean) => {
    const nextLocked = !currentLocked;
    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, isLocked: nextLocked } : u))
    );
    if (inspectedUser && inspectedUser.id === targetId) {
      setInspectedUser((prev) => (prev ? { ...prev, isLocked: nextLocked } : null));
    }

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-lock",
          userId: targetId,
          isLocked: nextLocked
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle lock.");

      setMsg({
        text: nextLocked ? `🔒 Player ${targetId} is now FROZEN (wagers blocked)!` : `🔓 Player ${targetId} UNFREEZE successful!`,
        isError: false
      });
      sound.playWin();
      fetchAuditLogs();
    } catch (err: unknown) {
      // Revert optimistic update on failure
      fetchUsers();
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  // Handler: Fast Ban / Unban Toggle
  const handleToggleBan = async (targetId: string, currentBan: boolean) => {
    const nextBan = !currentBan;
    setUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, isBanned: nextBan } : u))
    );
    if (inspectedUser && inspectedUser.id === targetId) {
      setInspectedUser((prev) => (prev ? { ...prev, isBanned: nextBan } : null));
    }

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-ban",
          userId: targetId,
          isBanned: nextBan
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle ban.");

      setMsg({
        text: nextBan ? `🚫 Player ${targetId} has been BANNED!` : `🟢 Player ${targetId} UNBANNED!`,
        isError: false
      });
      sound.playClick();
      fetchAuditLogs();
    } catch (err: unknown) {
      fetchUsers();
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  // Handler: Fast Verification Toggle
  const handleToggleVerification = async (targetId: string, currentVerification: boolean) => {
    const nextVerification = !currentVerification;
    setUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, isVerified: nextVerification } : u))
    );
    if (inspectedUser && inspectedUser.id === targetId) {
      setInspectedUser((prev) => (prev ? { ...prev, isVerified: nextVerification } : null));
    }

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-verification",
          userId: targetId,
          isVerified: nextVerification
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update verification.");

      setMsg({
        text: nextVerification ? `🛡️ Player ${targetId} VERIFIED!` : `⚠️ Player ${targetId} unverified.`,
        isError: false
      });
      sound.playWin();
      fetchAuditLogs();
    } catch (err: unknown) {
      fetchUsers();
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  // Handler: Fast Quick Add / Deduct Funds
  const handleQuickAdd = async (targetId: string, addAmt: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, balance: Math.max(0, u.balance + addAmt) } : u))
    );
    if (inspectedUser && inspectedUser.id === targetId) {
      setInspectedUser((prev) => (prev ? { ...prev, balance: Math.max(0, prev.balance + addAmt) } : null));
    }

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

      setMsg({
        text: `${addAmt >= 0 ? "+" : ""}${addAmt.toLocaleString()} $ applied to ${targetId}!`,
        isError: false
      });
      sound.playJackpot();
      fetchAuditLogs();
    } catch (err: unknown) {
      fetchUsers();
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  // Handler: Set Exact Custom Balance
  const handleAdjustBalance = async (targetId: string, customAmt?: number) => {
    const amt = customAmt !== undefined ? customAmt : parseInt(newBalanceInput);
    if (isNaN(amt) || amt < 0) {
      setMsg({ text: "Please enter a valid balance number.", isError: true });
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, balance: amt } : u))
    );
    if (inspectedUser && inspectedUser.id === targetId) {
      setInspectedUser((prev) => (prev ? { ...prev, balance: amt } : null));
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

      setMsg({ text: `Balance for ${targetId} set to ${amt.toLocaleString()} $!`, isError: false });
      setSelectedUserId(null);
      setNewBalanceInput("");
      sound.playWin();
      fetchAuditLogs();
    } catch (err: unknown) {
      fetchUsers();
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  // Handler: Mass Airdrop Engine
  const handleAirdropAll = async () => {
    if (airdropAmount <= 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "airdrop-all",
          amount: airdropAmount,
          onlyVerified: onlyVerifiedAirdrop
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Airdrop failed.");

      setMsg({
        text: `🎉 Mass Airdrop Disbursed! Granted +${airdropAmount.toLocaleString()} $ to ${data.updatedCount} players!`,
        isError: false
      });
      fetchUsers();
      fetchAuditLogs();
      sound.playJackpot();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Airdrop error.";
      setMsg({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  };

  // Handler: Toggle Emergency Global Casino Game Lock
  const handleToggleCasinoLock = async () => {
    const nextState = !isCasinoLocked;
    setIsCasinoLocked(nextState);

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-casino-lock",
          locked: nextState
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle emergency lock.");

      setMsg({
        text: nextState
          ? "🚨 EMERGENCY LOCK ENGAGED! All casino wagers are now suspended."
          : "✅ Emergency lock lifted. Casino games operational.",
        isError: nextState
      });
      sound.playClick();
      fetchAuditLogs();
    } catch (e) {
      setIsCasinoLocked(!nextState);
    }
  };

  // Handler: Promote / Demote Role
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

      setMsg({ text: `User ${targetId} role set to ${nextRole.toUpperCase()}!`, isError: false });
      fetchUsers();
      fetchAuditLogs();
      sound.playJackpot();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error.";
      setMsg({ text: errorMsg, isError: true });
    }
  };

  // Handler: Copy with visual feedback
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    sound.playClick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Handler: JSON Roster Snapshot Backup
  const handleDownloadRosterBackup = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      overseer: adminDisplayName,
      totalUsers: users.length,
      circulatingBalance,
      users
    };
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warwager_overseer_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMsg({ text: `Exported complete database roster (${users.length} accounts) to secure JSON snapshot!`, isError: false });
  };

  // Filter computation
  const pendingCount = users.filter((u) => !u.isVerified && u.role !== "admin").length;
  const verifiedCount = users.filter((u) => u.isVerified || u.role === "admin").length;
  const lockedCount = users.filter((u) => u.isLocked).length;
  const bannedCount = users.filter((u) => u.isBanned).length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  const filteredUsers = users.filter((u) => {
    if (rosterFilter === "pending" && (u.isVerified || u.role === "admin")) return false;
    if (rosterFilter === "verified" && (!u.isVerified && u.role !== "admin")) return false;
    if (rosterFilter === "locked" && !u.isLocked) return false;
    if (rosterFilter === "banned" && !u.isBanned) return false;
    if (rosterFilter === "admin" && u.role !== "admin") return false;

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
        {/* Header HUD */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <img src="/logo.png" alt="WarWager Insignia" className={styles.headerLogo} />
            <div className={styles.headerTitleBlock}>
              <div className={styles.headerTitle}>
                <span>WARWAGER OVERSEER COMMAND CENTER</span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    background: "rgba(0, 240, 255, 0.15)",
                    color: "#00f0ff",
                    border: "1px solid #00f0ff",
                    fontWeight: 900
                  }}
                >
                  LEVEL 5 OVERSEER
                </span>
              </div>
              <div className={styles.headerSubtext}>
                <span className={styles.liveBeacon}>
                  <span className={styles.pulseDot} />
                  <span>VPS ATLAS ONLINE</span>
                </span>
                {isAuthorized && <span>Logged in as: <strong>{adminDisplayName}</strong></span>}
              </div>
            </div>
          </div>

          <div className={styles.headerRight}>
            {isAuthorized && (
              <>
                <button
                  className={styles.lockConsoleBtn}
                  onClick={handleLockConsole}
                  title="Immediately lock Overseer console session"
                >
                  🔒 Lock Console
                </button>
              </>
            )}
            <button className={styles.closeBtn} onClick={onClose} title="Close Admin Panel">
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {!isAuthorized ? (
            /* 1. OVERSEER LOGIN GATE (Clean inputs, mobile friendly) */
            <div className={styles.loginBox}>
              <div style={{ fontSize: "2.8rem" }}>🔐</div>
              <div>
                <h3 style={{ fontFamily: "var(--font-family-title)", fontSize: "1.35rem", color: "#00f0ff", margin: "0 0 0.25rem 0" }}>
                  Overseer Security Clearance Gate
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>
                  Authenticate from any device to manage MongoDB Atlas citizens & treasury.
                </p>
              </div>

              {/* Toggle Mode: Master Passcode Key vs Username/Password */}
              <div className={styles.loginModeToggle}>
                <button
                  type="button"
                  className={`${styles.loginModeBtn} ${loginMode === "secret" ? styles.loginModeBtnActive : ""}`}
                  onClick={() => { setLoginMode("secret"); setAuthError(null); }}
                >
                  🔑 Master Secret Passcode
                </button>
                <button
                  type="button"
                  className={`${styles.loginModeBtn} ${loginMode === "credentials" ? styles.loginModeBtnActive : ""}`}
                  onClick={() => { setLoginMode("credentials"); setAuthError(null); }}
                >
                  👤 Admin Username & Password
                </button>
              </div>

              {authError && (
                <div className={`${styles.alertBanner} ${styles.alertError}`} style={{ padding: "0.55rem 0.8rem", fontSize: "0.8rem" }}>
                  <span>⚠️ {authError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", textAlign: "left" }}>
                {loginMode === "secret" ? (
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800, display: "block", marginBottom: "0.35rem" }}>
                      Overseer Master Secret Code / Passcode PIN
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                        placeholder="Enter master passcode (e.g. macaj)..."
                        autoFocus
                        required
                        className={styles.loginInput}
                        style={{ paddingRight: "2.5rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#8a99ad", cursor: "pointer", fontSize: "0.9rem" }}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800, display: "block", marginBottom: "0.35rem" }}>
                        Admin Username
                      </label>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="e.g. admin"
                        required
                        className={styles.loginInput}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 800, display: "block", marginBottom: "0.35rem" }}>
                        Admin Password PIN
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Enter master password..."
                          required
                          className={styles.loginInput}
                          style={{ paddingRight: "2.5rem" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#8a99ad", cursor: "pointer", fontSize: "0.9rem" }}
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.unlockBtn}
                >
                  {loading ? "Verifying Clearance..." : "⚡ Unlock Overseer Command Center"}
                </button>
              </form>
            </div>
          ) : (
            /* 2. AUTHORIZED OVERSEER COMMAND CONSOLE */
            <>
              {/* Top Navigation Tabs */}
              <div className={styles.tabNav}>
                <button
                  className={`${styles.tabBtn} ${activeTab === "users" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("users"); sound.playClick(); }}
                >
                  👥 Citizens ({users.length})
                  {pendingCount > 0 && (
                    <span className={styles.tabBadge} style={{ background: "#ffaa00", color: "#000" }}>
                      {pendingCount} PENDING
                    </span>
                  )}
                  {lockedCount > 0 && (
                    <span className={styles.tabBadge} style={{ background: "#ff8c00", color: "#000" }}>
                      {lockedCount} FROZEN
                    </span>
                  )}
                </button>

                <button
                  className={`${styles.tabBtn} ${activeTab === "metrics" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("metrics"); sound.playClick(); }}
                >
                  📊 Telemetry HUD
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
                  className={`${styles.tabBtn} ${activeTab === "audit" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("audit"); fetchAuditLogs(); sound.playClick(); }}
                >
                  🛡️ Live Audit Logs ({auditLogs.length})
                </button>

                <button
                  className={`${styles.tabBtn} ${activeTab === "backups" ? styles.tabBtnActive : ""}`}
                  onClick={() => { setActiveTab("backups"); sound.playClick(); }}
                >
                  💽 DB Backups
                </button>
              </div>

              {/* Status Alert Banner */}
              {msg && (
                <div className={`${styles.alertBanner} ${msg.isError ? styles.alertError : styles.alertSuccess}`}>
                  <span>{msg.text}</span>
                  <span onClick={() => setMsg(null)} style={{ cursor: "pointer", marginLeft: "1rem" }}>✕</span>
                </div>
              )}

              {/* TAB 1: Citizens & Fast Moderation Matrix */}
              {activeTab === "users" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Filter Pills & Live Search Bar */}
                  <div className={styles.filterBar}>
                    <div className={styles.filterPills}>
                      <button
                        className={styles.filterPill}
                        onClick={() => setRosterFilter("all")}
                        style={{
                          background: rosterFilter === "all" ? "var(--color-primary)" : "rgba(255,255,255,0.06)",
                          color: rosterFilter === "all" ? "#000" : "#fff"
                        }}
                      >
                        All Citizens ({users.length})
                      </button>

                      <button
                        className={styles.filterPill}
                        onClick={() => setRosterFilter("pending")}
                        style={{
                          background: rosterFilter === "pending" ? "#ffaa00" : "rgba(255, 170, 0, 0.12)",
                          color: rosterFilter === "pending" ? "#000" : "#ffaa00",
                          borderColor: "rgba(255, 170, 0, 0.4)"
                        }}
                      >
                        ⚠️ Pending ({pendingCount})
                      </button>

                      <button
                        className={styles.filterPill}
                        onClick={() => setRosterFilter("verified")}
                        style={{
                          background: rosterFilter === "verified" ? "var(--color-success)" : "rgba(0, 230, 118, 0.12)",
                          color: rosterFilter === "verified" ? "#000" : "var(--color-success)",
                          borderColor: "rgba(0, 230, 118, 0.4)"
                        }}
                      >
                        🛡️ Verified ({verifiedCount})
                      </button>

                      <button
                        className={styles.filterPill}
                        onClick={() => setRosterFilter("locked")}
                        style={{
                          background: rosterFilter === "locked" ? "#ff8c00" : "rgba(255, 140, 0, 0.12)",
                          color: rosterFilter === "locked" ? "#000" : "#ff8c00",
                          borderColor: "rgba(255, 140, 0, 0.4)"
                        }}
                      >
                        🔒 Frozen ({lockedCount})
                      </button>

                      <button
                        className={styles.filterPill}
                        onClick={() => setRosterFilter("banned")}
                        style={{
                          background: rosterFilter === "banned" ? "#ff0055" : "rgba(255, 0, 85, 0.12)",
                          color: rosterFilter === "banned" ? "#fff" : "#ff0055",
                          borderColor: "rgba(255, 0, 85, 0.4)"
                        }}
                      >
                        🚫 Banned ({bannedCount})
                      </button>

                      <button
                        className={styles.filterPill}
                        onClick={() => setRosterFilter("admin")}
                        style={{
                          background: rosterFilter === "admin" ? "#bd00ff" : "rgba(189, 0, 255, 0.12)",
                          color: rosterFilter === "admin" ? "#fff" : "#bd00ff",
                          borderColor: "rgba(189, 0, 255, 0.4)"
                        }}
                      >
                        ⚡ Admins ({adminCount})
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <div className={styles.searchBox}>
                        <input
                          type="text"
                          className={styles.searchInput}
                          placeholder="Search username, ID, Discord, Roblox..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button className={styles.clearSearchBtn} onClick={() => setSearchQuery("")}>✕</button>
                        )}
                      </div>

                      <button
                        onClick={fetchUsers}
                        style={{ background: "rgba(0, 240, 255, 0.12)", border: "1px solid rgba(0, 240, 255, 0.4)", color: "var(--color-primary)", borderRadius: "6px", padding: "0.5rem 0.85rem", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  {/* Users Data Table */}
                  <div className={styles.tableWrapper}>
                    <table className={styles.userTable}>
                      <thead>
                        <tr>
                          <th>Player & Identity</th>
                          <th>Discord & Roblox Handles</th>
                          <th>Balance ($)</th>
                          <th>Lock / Security</th>
                          <th>Verification</th>
                          <th style={{ textAlign: "right" }}>Fast Overseer Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                              No registered citizens matching the current filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr
                              key={u.id}
                              style={{
                                background: u.isBanned
                                  ? "rgba(255,23,68,0.06)"
                                  : u.isLocked
                                  ? "rgba(255,140,0,0.06)"
                                  : undefined,
                                opacity: u.isBanned ? 0.6 : 1
                              }}
                            >
                              {/* 1. Player Info */}
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                  <span style={{ fontWeight: 800, color: u.role === "admin" ? "#00f0ff" : "#fff", fontSize: "0.9rem" }}>
                                    {u.username}
                                  </span>
                                  {u.role === "admin" && (
                                    <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(0, 240, 255, 0.2)", color: "#00f0ff", border: "1px solid #00f0ff", fontWeight: 900 }}>
                                      ⚡ ADMIN
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                                  ID: {u.id}
                                </span>
                              </td>

                              {/* 2. Handles */}
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "#00f0ff", fontWeight: 700 }}>
                                  <span>💬 {u.discord || "Not set"}</span>
                                  {u.discord && (
                                    <button
                                      onClick={() => handleCopy(u.discord || "", `dc_${u.id}`)}
                                      title="Copy Discord handle"
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
                                      title="Copy Roblox handle"
                                      style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "0.65rem" }}
                                    >
                                      {copiedKey === `rbx_${u.id}` ? "✅" : "📋"}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* 3. Balance */}
                              <td style={{ fontWeight: 800, color: "var(--color-primary)" }}>
                                {selectedUserId === u.id ? (
                                  <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                    <input
                                      type="number"
                                      value={newBalanceInput}
                                      onChange={(e) => setNewBalanceInput(e.target.value)}
                                      placeholder="New $"
                                      autoFocus
                                      style={{ width: "85px", padding: "0.3rem 0.45rem", background: "rgba(0,0,0,0.8)", border: "1px solid #00f0ff", color: "#fff", borderRadius: "4px", fontSize: "0.75rem" }}
                                    />
                                    <button
                                      onClick={() => handleAdjustBalance(u.id)}
                                      style={{ background: "#00f0ff", color: "#000", border: "none", borderRadius: "3px", padding: "0.3rem 0.5rem", fontWeight: 900, cursor: "pointer", fontSize: "0.7rem" }}
                                    >
                                      SET
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "0.95rem" }}>{u.balance.toLocaleString()} $</span>
                                )}
                              </td>

                              {/* 4. Lock Status */}
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                  <span
                                    style={{
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                      color: u.isLocked ? "#ff8c00" : "var(--color-success)"
                                    }}
                                  >
                                    {u.isLocked ? "🔒 FROZEN" : "🔓 UNLOCKED"}
                                  </span>
                                  {u.isBanned && (
                                    <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "var(--color-danger)" }}>
                                      🚫 BANNED
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 5. Verification Status */}
                              <td>
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    fontWeight: 800,
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    background: u.isVerified || u.role === "admin" ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 170, 0, 0.15)",
                                    color: u.isVerified || u.role === "admin" ? "var(--color-success)" : "#ffaa00",
                                    border: `1px solid ${u.isVerified || u.role === "admin" ? "var(--color-success)" : "#ffaa00"}`
                                  }}
                                >
                                  {u.isVerified || u.role === "admin" ? "🛡️ VERIFIED" : "⚠️ UNVERIFIED"}
                                </span>
                              </td>

                              {/* 6. Fast Moderation Buttons */}
                              <td style={{ textAlign: "right" }}>
                                <div className={styles.actionBtnGroup}>
                                  {/* 1-Click Freeze / Lock Toggle */}
                                  <button
                                    className={`${styles.chipBtn} ${u.isLocked ? styles.chipUnfreeze : styles.chipFreeze}`}
                                    onClick={() => handleToggleLock(u.id, !!u.isLocked)}
                                    title={u.isLocked ? "Release Account Freeze" : "Instantly Freeze Account (Blocks Wagers)"}
                                  >
                                    {u.isLocked ? "🔓 Unfreeze" : "🔒 Freeze"}
                                  </button>

                                  {/* 1-Click Verification */}
                                  {u.role !== "admin" && (
                                    <button
                                      className={`${styles.chipBtn} ${u.isVerified ? styles.chipUnverify : styles.chipVerify}`}
                                      onClick={() => handleToggleVerification(u.id, !!u.isVerified)}
                                    >
                                      {u.isVerified ? "Unverify" : "Verify ✅"}
                                    </button>
                                  )}

                                  {/* Quick +5K Button */}
                                  <button
                                    className={styles.chipBtn}
                                    onClick={() => handleQuickAdd(u.id, 5000)}
                                    title="Quick Grant +5,000 War Bonds"
                                    style={{ background: "rgba(255, 215, 0, 0.15)", borderColor: "rgba(255, 215, 0, 0.4)", color: "#ffd700" }}
                                  >
                                    +5k $
                                  </button>

                                  {/* Custom $ trigger */}
                                  <button
                                    className={styles.chipBtn}
                                    style={{ background: "rgba(0, 240, 255, 0.12)", borderColor: "rgba(0, 240, 255, 0.35)", color: "#00f0ff" }}
                                    onClick={() => {
                                      setSelectedUserId(selectedUserId === u.id ? null : u.id);
                                      setNewBalanceInput(u.balance.toString());
                                    }}
                                  >
                                    {selectedUserId === u.id ? "Cancel" : "Custom $"}
                                  </button>

                                  {/* Inspect Dossier */}
                                  <button
                                    className={`${styles.chipBtn} ${styles.chipInspect}`}
                                    onClick={() => setInspectedUser(u)}
                                    title="Open Full Player Dossier"
                                  >
                                    🔍 Dossier
                                  </button>

                                  {/* Ban / Unban */}
                                  <button
                                    className={`${styles.chipBtn} ${u.isBanned ? styles.chipUnfreeze : styles.chipBan}`}
                                    onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                                  >
                                    {u.isBanned ? "Unban" : "Ban"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Telemetry HUD & Vault Analytics */}
              {activeTab === "metrics" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Total Registered Citizens</span>
                      <span className={styles.statVal}>{users.length}</span>
                    </div>

                    <div className={styles.statCard} style={{ borderColor: "rgba(255, 170, 0, 0.4)" }}>
                      <span className={styles.statLabel} style={{ color: "#ffaa00" }}>Pending Verification</span>
                      <span className={styles.statVal} style={{ color: "#ffaa00" }}>{pendingCount}</span>
                    </div>

                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Circulating War Bonds</span>
                      <span className={styles.statVal} style={{ color: "#ffd700" }}>
                        {circulatingBalance.toLocaleString()} $
                      </span>
                    </div>

                    <div className={styles.statCard} style={{ borderColor: "rgba(255, 140, 0, 0.4)" }}>
                      <span className={styles.statLabel} style={{ color: "#ff8c00" }}>Frozen / Locked Accounts</span>
                      <span className={styles.statVal} style={{ color: "#ff8c00" }}>{lockedCount}</span>
                    </div>

                    <div className={styles.statCard} style={{ borderColor: "rgba(255, 0, 85, 0.4)" }}>
                      <span className={styles.statLabel} style={{ color: "#ff0055" }}>Banned Accounts</span>
                      <span className={styles.statVal} style={{ color: "#ff0055" }}>{bannedCount}</span>
                    </div>

                    <div className={styles.statCard} style={{ borderColor: "rgba(0, 230, 118, 0.4)" }}>
                      <span className={styles.statLabel} style={{ color: "var(--color-success)" }}>Database Connection</span>
                      <span className={styles.statVal} style={{ color: "var(--color-success)", fontSize: "1.1rem" }}>
                        🟢 MongoDB Atlas Synced
                      </span>
                    </div>
                  </div>

                  {/* Overseer Emergency Controls & Instructions */}
                  <div style={{ background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.25)", borderRadius: "10px", padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <h4 style={{ color: "var(--color-primary)", margin: "0 0 0.35rem 0", fontSize: "0.95rem" }}>
                          🚨 Emergency Casino Game Lock & Maintenance Switch:
                        </h4>
                        <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0, maxWidth: "600px" }}>
                          If suspect exploits or unscheduled server maintenance occur, toggle this switch to instantly suspend all casino betting across the application.
                        </p>
                      </div>
                      <button
                        onClick={handleToggleCasinoLock}
                        style={{
                          background: isCasinoLocked ? "rgba(0, 230, 118, 0.2)" : "rgba(255, 23, 68, 0.2)",
                          border: `1.5px solid ${isCasinoLocked ? "var(--color-success)" : "var(--color-danger)"}`,
                          color: isCasinoLocked ? "var(--color-success)" : "var(--color-danger)",
                          padding: "0.65rem 1.25rem",
                          borderRadius: "6px",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: "0.82rem"
                        }}
                      >
                        {isCasinoLocked ? "✅ RELEASE CASINO LOCK" : "🔒 ENGAGE EMERGENCY CASINO LOCK"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Mass Treasury Airdrop Hub */}
              {activeTab === "airdrop" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-family-title)", color: "#ffd700", margin: "0 0 0.3rem 0" }}>
                      🎁 Global Treasury Mass Airdrop Engine
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>
                      Disburse bonus War Bonds directly to all active citizens simultaneously on MongoDB Atlas.
                    </p>
                  </div>

                  <div style={{ background: "rgba(255, 215, 0, 0.06)", border: "1px solid rgba(255, 215, 0, 0.25)", borderRadius: "10px", padding: "1.5rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff", display: "block", marginBottom: "0.5rem" }}>
                      Select Preset Grant Amount per Player ($):
                    </label>

                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                      {[500, 1000, 2500, 5000, 10000, 50000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAirdropAmount(amt)}
                          style={{
                            padding: "0.55rem 1.1rem",
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

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#fff", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={onlyVerifiedAirdrop}
                          onChange={(e) => setOnlyVerifiedAirdrop(e.target.checked)}
                        />
                        <span>Only distribute to 🛡️ Verified Players ({verifiedCount})</span>
                      </label>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <input
                        type="number"
                        value={airdropAmount}
                        onChange={(e) => setAirdropAmount(Number(e.target.value))}
                        placeholder="Custom amount..."
                        style={{ width: "180px", padding: "0.65rem 0.9rem", background: "rgba(0,0,0,0.6)", border: "1px solid #ffd700", color: "#fff", borderRadius: "6px", fontSize: "0.95rem" }}
                      />
                      <button
                        onClick={handleAirdropAll}
                        disabled={loading || airdropAmount <= 0}
                        style={{
                          background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)",
                          color: "#000",
                          fontFamily: "var(--font-family-title)",
                          fontWeight: 900,
                          padding: "0.7rem 1.5rem",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)"
                        }}
                      >
                        {loading ? "Distributing Funds..." : `🚀 Execute Airdrop of ${airdropAmount.toLocaleString()} $ to ${onlyVerifiedAirdrop ? "Verified" : "ALL"} Citizens`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Esports Markets */}
              {activeTab === "matches" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ fontFamily: "var(--font-family-title)", color: "#fff", margin: 0 }}>
                      Live Entrenched League V Markets ({matches.length})
                    </h4>
                  </div>

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
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "0.75rem"
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

              {/* TAB 5: Live Security Audit Logs */}
              {activeTab === "audit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-family-title)", color: "#00f0ff", margin: "0 0 0.25rem 0" }}>
                        🛡️ Live Overseer Security & Action Audit Trail
                      </h3>
                      <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>
                        Real-time transparent log of all locks, unfreezes, balance overrides, and verification approvals.
                      </p>
                    </div>
                    <button
                      onClick={fetchAuditLogs}
                      style={{ background: "rgba(0, 240, 255, 0.12)", border: "1px solid rgba(0, 240, 255, 0.4)", color: "#00f0ff", borderRadius: "6px", padding: "0.45rem 0.85rem", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      🔄 Refresh Logs
                    </button>
                  </div>

                  <div className={styles.auditList}>
                    {auditLogs.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                        No audit events recorded yet.
                      </div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className={styles.auditItem}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span
                              className={styles.auditActionTag}
                              style={{
                                background: log.action.includes("LOCK") || log.action.includes("BAN") || log.action.includes("FROZEN")
                                  ? "rgba(255, 23, 68, 0.2)"
                                  : log.action.includes("AIRDROP") || log.action.includes("GRANTED")
                                  ? "rgba(255, 215, 0, 0.2)"
                                  : "rgba(0, 240, 255, 0.2)",
                                color: log.action.includes("LOCK") || log.action.includes("BAN") || log.action.includes("FROZEN")
                                  ? "#ff1744"
                                  : log.action.includes("AIRDROP") || log.action.includes("GRANTED")
                                  ? "#ffd700"
                                  : "#00f0ff",
                                border: `1px solid ${
                                  log.action.includes("LOCK") || log.action.includes("BAN") || log.action.includes("FROZEN")
                                    ? "#ff1744"
                                    : log.action.includes("AIRDROP") || log.action.includes("GRANTED")
                                    ? "#ffd700"
                                    : "#00f0ff"
                                }`
                              }}
                            >
                              {log.action}
                            </span>
                            <span style={{ color: "#fff", fontWeight: 600 }}>
                              {log.details}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                            <span>by <strong>{log.admin}</strong></span> • <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: DB Backups & Diagnostics */}
              {activeTab === "backups" && (
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
                          Contains {users.length} accounts, balances, handles & VIP tiers
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

        {/* Player Dossier Slide-Over Inspector */}
        {inspectedUser && (
          <div className={styles.dossierOverlay}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.5rem" }}>🔍</span>
                <div>
                  <h3 style={{ fontFamily: "var(--font-family-title)", color: "#fff", margin: 0 }}>
                    Citizen Dossier: {inspectedUser.username}
                  </h3>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>ID: {inspectedUser.id}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectedUser(null)}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Metric Tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Balance</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)" }}>{inspectedUser.balance.toLocaleString()} $</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Linked Discord</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#00f0ff" }}>{inspectedUser.discord || "None"}</span>
                  {inspectedUser.discord && (
                    <button onClick={() => handleCopy(inspectedUser.discord || "", `doss_dc_${inspectedUser.id}`)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.7rem" }}>
                      {copiedKey === `doss_dc_${inspectedUser.id}` ? "✅" : "📋"}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Linked Roblox</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>{inspectedUser.roblox || "None"}</span>
                  {inspectedUser.roblox && (
                    <button onClick={() => handleCopy(inspectedUser.roblox || "", `doss_rbx_${inspectedUser.id}`)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.7rem" }}>
                      {copiedKey === `doss_rbx_${inspectedUser.id}` ? "✅" : "📋"}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "block" }}>Account Status</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: inspectedUser.isBanned ? "var(--color-danger)" : inspectedUser.isLocked ? "#ff8c00" : "var(--color-success)" }}>
                  {inspectedUser.isBanned ? "🚫 BANNED" : inspectedUser.isLocked ? "🔒 FROZEN" : "🟢 ACTIVE"}
                </span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div style={{ background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.2)", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fff", display: "block", marginBottom: "0.5rem" }}>
                Fast Moderation Controls:
              </span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  className={`${styles.chipBtn} ${inspectedUser.isLocked ? styles.chipUnfreeze : styles.chipFreeze}`}
                  onClick={() => handleToggleLock(inspectedUser.id, !!inspectedUser.isLocked)}
                >
                  {inspectedUser.isLocked ? "🔓 Release Freeze" : "🔒 Freeze Account"}
                </button>
                <button
                  className={`${styles.chipBtn} ${inspectedUser.isVerified ? styles.chipUnverify : styles.chipVerify}`}
                  onClick={() => handleToggleVerification(inspectedUser.id, !!inspectedUser.isVerified)}
                >
                  {inspectedUser.isVerified ? "Revoke Verification" : "Grant Verification ✅"}
                </button>
                <button
                  className={`${styles.chipBtn} ${inspectedUser.isBanned ? styles.chipUnfreeze : styles.chipBan}`}
                  onClick={() => handleToggleBan(inspectedUser.id, !!inspectedUser.isBanned)}
                >
                  {inspectedUser.isBanned ? "Revoke Ban" : "Ban Account 🚫"}
                </button>
                <button
                  className={styles.chipBtn}
                  style={{ background: "rgba(255, 215, 0, 0.15)", borderColor: "rgba(255, 215, 0, 0.4)", color: "#ffd700" }}
                  onClick={() => handleQuickAdd(inspectedUser.id, 10000)}
                >
                  +10,000 $ Grant
                </button>
                <button
                  className={styles.chipBtn}
                  style={{ background: "rgba(189, 0, 255, 0.15)", borderColor: "#bd00ff", color: "#bd00ff" }}
                  onClick={() => handleToggleRole(inspectedUser.id, inspectedUser.role || "user")}
                >
                  {inspectedUser.role === "admin" ? "Demote to User" : "Promote to Admin ⚡"}
                </button>
              </div>
            </div>

            {/* Transaction Ledger */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <h4 style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
                Recent Transactions ({inspectedUser.history?.length || 0})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {(!inspectedUser.history || inspectedUser.history.length === 0) ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No transaction history recorded yet.</span>
                ) : (
                  inspectedUser.history.slice(0, 20).map((h) => (
                    <div key={h.id} style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.4)", padding: "0.5rem 0.8rem", borderRadius: "4px", fontSize: "0.78rem" }}>
                      <span>{h.type.toUpperCase()}: {h.description}</span>
                      <span style={{ fontWeight: 800, color: h.result === "win" ? "var(--color-success)" : "var(--color-danger)" }}>
                        {h.result === "win" ? `+${h.payout.toLocaleString()} $` : `-${h.amount.toLocaleString()} $`}
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
