"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import styles from "./authModal.module.css";
import adminStyles from "./adminPanel.module.css";

export const AuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, loginUser } = useWallet();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");
  const [roblox, setRoblox] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Secret Admin states
  const [keyBuffer, setKeyBuffer] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Admin login inputs
  const [adminPass1, setAdminPass1] = useState("");
  const [adminPass2, setAdminPass2] = useState("");
  const [adminPass3, setAdminPass3] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Admin Panel data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, circulating: 0 });
  const [userBalances, setUserBalances] = useState<Record<string, string>>({});

  // Wager Injection Sub-Modal State
  const [selectedUserForWager, setSelectedUserForWager] = useState<any | null>(null);
  const [wagerType, setWagerType] = useState("bet");
  const [wagerDesc, setWagerDesc] = useState("");
  const [wagerAmt, setWagerAmt] = useState("");
  const [wagerResult, setWagerResult] = useState("win");
  const [wagerPayout, setWagerPayout] = useState("");

  // Check admin session on mount
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch("/api/admin/check");
        const data = await res.json();
        if (data.authorized) {
          setShowAdminPanel(true);
          await fetchAdminData();
        }
      } catch (e) {}
    };
    checkAdminSession();
  }, []);

  // Listen to keyboard sequence 'shj'
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not trigger if typing in fields
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const char = e.key.toLowerCase();
      if (["s", "h", "j"].includes(char)) {
        setKeyBuffer((prev) => {
          const next = (prev + char).slice(-3);
          if (next === "shj") {
            setShowAdminLogin(true);
            setAdminError(null);
            setIsAuthOpen(false); // Close normal modal if open
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
  }, [setIsAuthOpen]);

  const fetchAdminData = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
        setAdminStats({
          totalUsers: data.totalUsers || 0,
          circulating: data.circulatingBalance || 0
        });
        
        // Prefill balance inputs
        const initialBalances: Record<string, string> = {};
        data.users?.forEach((u: any) => {
          initialBalances[u.id] = u.balance.toString();
        });
        setUserBalances(initialBalances);
      } else {
        setShowAdminPanel(false);
      }
    } catch (e) {
      console.error("Failed to load admin data:", e);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pass1: adminPass1,
          pass2: adminPass2,
          pass3: adminPass3
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Admin Authentication failed.");
      }

      setShowAdminLogin(false);
      setShowAdminPanel(true);
      setAdminPass1("");
      setAdminPass2("");
      setAdminPass3("");
      await fetchAdminData();
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateBalance = async (userId: string) => {
    const balanceVal = parseFloat(userBalances[userId]);
    if (isNaN(balanceVal)) {
      alert("Invalid balance entered.");
      return;
    }

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust-balance",
          userId,
          amount: balanceVal
        })
      });
      if (res.ok) {
        alert("User balance updated!");
        await fetchAdminData();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network error updating balance.");
    }
  };

  const handleToggleBan = async (userId: string, currentBanState: boolean) => {
    const confirmMsg = currentBanState 
      ? "Are you sure you want to UNBAN this user?" 
      : "Are you sure you want to BAN this user? Banned users will be blocked immediately.";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-ban",
          userId,
          isBanned: !currentBanState
        })
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network error toggling ban state.");
    }
  };

  const handleInjectWager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForWager) return;

    const amountVal = parseFloat(wagerAmt);
    const payoutVal = parseFloat(wagerPayout);

    if (isNaN(amountVal) || isNaN(payoutVal)) {
      alert("Wager amount and payout must be numbers.");
      return;
    }

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-wager",
          userId: selectedUserForWager.id,
          type: wagerType,
          description: wagerDesc,
          amount: amountVal,
          result: wagerResult,
          payout: payoutVal
        })
      });

      if (res.ok) {
        alert("Wager successfully added to user history!");
        setSelectedUserForWager(null);
        setWagerDesc("");
        setWagerAmt("");
        setWagerPayout("");
        await fetchAdminData();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert("Failed to inject wager.");
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setShowAdminPanel(false);
    } catch (e) {
      alert("Logout failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { username, password }
        : { username, discord, roblox, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      loginUser(data.user);
      setIsAuthOpen(false);
      setUsername("");
      setDiscord("");
      setRoblox("");
      setPassword("");
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Render Secret Admin Panel Overlay
  if (showAdminPanel) {
    return (
      <div className={adminStyles.adminOverlay}>
        <div className={adminStyles.adminNavbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="blink-fast" style={{ fontSize: "1.2rem", color: "#ff007a" }}>⚙️</span>
            <h1 className={adminStyles.adminTitle}>ClashWager Admin Console</h1>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className={adminStyles.closeAdminBtn} onClick={handleAdminLogout}>
              Logout Admin
            </button>
            <button className={styles.submitBtn} style={{ marginTop: 0 }} onClick={() => setShowAdminPanel(false)}>
              Exit Console
            </button>
          </div>
        </div>

        {/* Admin Stats row */}
        <div className={adminStyles.statsRow}>
          <div className={adminStyles.statCard}>
            <span className={adminStyles.statLabel}>Registered Users</span>
            <span className={adminStyles.statVal}>{adminStats.totalUsers}</span>
          </div>
          <div className={adminStyles.statCard} style={{ borderColor: "var(--color-primary)" }}>
            <span className={adminStyles.statLabel} style={{ color: "var(--color-primary)" }}>Circulating Currency</span>
            <span className={adminStyles.statVal}>{adminStats.circulating.toLocaleString()} War Bonds</span>
          </div>
        </div>

        {/* Users list table */}
        <div className={adminStyles.panelContainer}>
          <div className={adminStyles.tableHeader}>
            <h2 className={adminStyles.sectionTitle}>User Directory</h2>
            <button className={adminStyles.actionBtn} onClick={fetchAdminData}>
              Sync List 🔄
            </button>
          </div>

          <div className={adminStyles.usersTableWrapper}>
            <table className={adminStyles.usersTable}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Roblox Name</th>
                  <th>Discord Handle</th>
                  <th>Wager Stats</th>
                  <th>Adjust Wallet Balance</th>
                  <th>Account Status</th>
                  <th>Inject History</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr.id} style={usr.isBanned ? { opacity: 0.5, background: "rgba(255,23,68,0.03)" } : {}}>
                    <td style={{ fontWeight: 700 }}>
                      {usr.username} {usr.isBanned && <span style={{ color: "var(--color-danger)" }}>(BANNED)</span>}
                    </td>
                    <td>{usr.roblox}</td>
                    <td>{usr.discord}</td>
                    <td>
                      <div>Wins/Losses: {usr.history?.filter((h: any) => h.result === "win").length || 0} / {usr.history?.filter((h: any) => h.result === "lose").length || 0}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Total Transactions: {usr.history?.length || 0}</div>
                    </td>
                    <td>
                      <div className={adminStyles.balanceForm}>
                        <input
                          type="number"
                          className={adminStyles.balanceInput}
                          value={userBalances[usr.id] !== undefined ? userBalances[usr.id] : ""}
                          onChange={(e) =>
                            setUserBalances((prev) => ({ ...prev, [usr.id]: e.target.value }))
                          }
                        />
                        <button
                          className={adminStyles.saveBalanceBtn}
                          onClick={() => handleUpdateBalance(usr.id)}
                        >
                          SET
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className={usr.isBanned ? adminStyles.unbanBtn : adminStyles.banBtn}
                        onClick={() => handleToggleBan(usr.id, !!usr.isBanned)}
                      >
                        {usr.isBanned ? "UNBAN" : "BAN"}
                      </button>
                    </td>
                    <td>
                      <button
                        className={adminStyles.actionBtn}
                        onClick={() => setSelectedUserForWager(usr)}
                      >
                        + Wager
                      </button>
                    </td>
                  </tr>
                ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                      No registered user profiles found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Wager Injection Modal popup */}
        {selectedUserForWager && (
          <div className={adminStyles.wagerModalOverlay}>
            <form className={adminStyles.wagerModal} onSubmit={handleInjectWager}>
              <h3 className={adminStyles.modalTitle}>Inject Custom Wager: {selectedUserForWager.username}</h3>
              
              <div className={adminStyles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Wager Type</label>
                  <select
                    className={adminStyles.wagerSelect}
                    value={wagerType}
                    onChange={(e) => setWagerType(e.target.value)}
                  >
                    <option value="bet">Predictions Bet</option>
                    <option value="crash">Crash Game</option>
                    <option value="coinflip">Coin Flip</option>
                    <option value="lootbox">Crate Lootbox</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Result</label>
                  <select
                    className={adminStyles.wagerSelect}
                    value={wagerResult}
                    onChange={(e) => setWagerResult(e.target.value)}
                  >
                    <option value="win">Win (Payout credited)</option>
                    <option value="lose">Lose (Loss recorded)</option>
                    <option value="pending">Pending (Contract open)</option>
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Wager Description</label>
                <input
                  type="text"
                  className={styles.inputBox}
                  placeholder="e.g. Won coinflip betting on T..."
                  value={wagerDesc}
                  onChange={(e) => setWagerDesc(e.target.value)}
                  required
                />
              </div>

              <div className={adminStyles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Stake Staked</label>
                  <input
                    type="number"
                    className={styles.inputBox}
                    placeholder="Wager amount..."
                    value={wagerAmt}
                    onChange={(e) => setWagerAmt(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Wager Payout</label>
                  <input
                    type="number"
                    className={styles.inputBox}
                    placeholder="Payout amount..."
                    value={wagerPayout}
                    onChange={(e) => setWagerPayout(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={adminStyles.modalBtns}>
                <button
                  type="button"
                  className={adminStyles.cancelBtn}
                  onClick={() => setSelectedUserForWager(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={adminStyles.injectBtn}>
                  Inject Record
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // 2. Render Secret Admin Authentication Form
  if (showAdminLogin) {
    return (
      <div id="modal-auth" className={styles.overlay}>
        <div className={adminStyles.adminLoginBox}>
          <h2 className={styles.title} style={{ color: "#ff007a" }}>🔒 Admin Credentials</h2>
          <form className={styles.form} onSubmit={handleAdminLogin}>
            {adminError && <div className={styles.error}>{adminError}</div>}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Admin Passcode Alpha</label>
              <input
                type="password"
                className={adminStyles.adminInputBox}
                placeholder="Super long passcode 1..."
                value={adminPass1}
                onChange={(e) => setAdminPass1(e.target.value)}
                required
                disabled={adminLoading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Admin Passcode Beta</label>
              <input
                type="password"
                className={adminStyles.adminInputBox}
                placeholder="Super long passcode 2..."
                value={adminPass2}
                onChange={(e) => setAdminPass2(e.target.value)}
                required
                disabled={adminLoading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Security secret Key</label>
              <input
                type="password"
                className={adminStyles.adminInputBox}
                placeholder="Third passcode..."
                value={adminPass3}
                onChange={(e) => setAdminPass3(e.target.value)}
                required
                disabled={adminLoading}
              />
            </div>

            <button className={adminStyles.adminSubmitBtn} type="submit" disabled={adminLoading}>
              {adminLoading ? "Authorizing..." : "Settle Admin Session"}
            </button>
          </form>

          <div className={styles.toggleLink}>
            <span
              className={styles.toggleAction}
              onClick={() => {
                setShowAdminLogin(false);
                setAdminError(null);
              }}
            >
              Back to Member Sign In
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Standard Auth Form
  if (!isAuthOpen) return null;

  return (
    <div id="modal-auth" className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{isLogin ? "Member Login" : "Join ClashWager"}</h2>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          {errorMsg && <div className={styles.error}>{errorMsg}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <input
              id="input-auth-username"
              type="text"
              className={styles.inputBox}
              placeholder={isLogin ? "Enter username..." : "Choose a login username..."}
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
                  placeholder="Enter Discord username..."
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
                  placeholder="Enter Roblox username..."
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
              placeholder={isLogin ? "Min. 5 characters..." : "Choose a password (min. 5 chars)..."}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button id="btn-auth-submit" className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Authenticating..." : isLogin ? "Settle Session" : "Create Account"}
          </button>
        </form>

        <div className={styles.toggleLink}>
          {isLogin ? "New user?" : "Already registered?"}
          <span 
            id="link-auth-toggle"
            className={styles.toggleAction}
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
              setUsername("");
              setDiscord("");
              setRoblox("");
              setPassword("");
            }}
          >
            {isLogin ? "Create Account" : "Sign In"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
