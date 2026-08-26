"use client";

import React, { useState } from "react";
import { WalletProvider, useWallet } from "../context/WalletContext";
import Navbar from "../components/Navbar";
import BettingArena from "../components/BettingArena";
import GameLootbox from "../components/GameLootbox";
import GameRoulette from "../components/GameRoulette";
import GameMines from "../components/GameMines";
import GameSlots from "../components/GameSlots";
import AuthModal from "../components/AuthModal";
import styles from "./page.module.css";

type TabId = "betting" | "lootbox" | "roulette" | "mines" | "slots";

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>("betting");
  const { wagerHistory, balance, resetAllData } = useWallet();

  // Trigger requested popup alert on mount
  React.useEffect(() => {
    alert("bobo is an bitch");
  }, []);

  // Calculate statistics
  const completedWagers = wagerHistory.filter((w) => w.result !== "pending");
  const wonWagers = completedWagers.filter((w) => w.result === "win");
  const winRate = completedWagers.length > 0 
    ? Math.round((wonWagers.length / completedWagers.length) * 100) 
    : 0;

  // Net profit calculation
  // Total payouts minus total wagers for resolved items
  const resolvedOutflow = completedWagers.reduce((sum, w) => sum + w.amount, 0);
  const resolvedInflow = completedWagers.reduce((sum, w) => sum + w.payout, 0);
  const netProfit = resolvedInflow - resolvedOutflow;

  const renderActiveTab = () => {
    switch (activeTab) {
      case "betting":
        return <BettingArena />;
      case "lootbox":
        return <GameLootbox />;
      case "roulette":
        return <GameRoulette />;
      case "mines":
        return <GameMines />;
      case "slots":
        return <GameSlots />;
      default:
        return <BettingArena />;
    }
  };

  return (
    <>
      <Navbar />
      <AuthModal />

      <main className={styles.main}>
        <h1 className={styles.mainTitle}>ClashWager Gaming Dashboard</h1>

        {/* Main Gaming Panels */}
        <div className={styles.dashboardLayout}>
          
          {/* Side Nav Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}>Navigation</div>
            <div className={styles.tabsContainer}>
              <button
                id="tab-btn-betting"
                className={`${styles.tabBtn} ${activeTab === "betting" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("betting")}
              >
                <span className={styles.tabIcon}>🎯</span> Betting Arena
              </button>
              <button
                id="tab-btn-lootbox"
                className={`${styles.tabBtn} ${activeTab === "lootbox" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("lootbox")}
              >
                <span className={styles.tabIcon}>📦</span> Crate Opener
              </button>
              <button
                id="tab-btn-roulette"
                className={`${styles.tabBtn} ${activeTab === "roulette" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("roulette")}
              >
                <span className={styles.tabIcon}>🎡</span> Roulette Wheel
              </button>
              <button
                id="tab-btn-mines"
                className={`${styles.tabBtn} ${activeTab === "mines" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("mines")}
              >
                <span className={styles.tabIcon}>💣</span> Trench Mines
              </button>
              <button
                id="tab-btn-slots"
                className={`${styles.tabBtn} ${activeTab === "slots" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("slots")}
              >
                <span className={styles.tabIcon}>🎰</span> Trench Slots
              </button>
            </div>

            {/* Profile Statistics */}
            <div className={styles.sidebarTitle}>Your Performance</div>
            <div className={styles.userStatsCard}>
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>Total Wagers:</span>
                <span className={styles.statsVal}>{completedWagers.length}</span>
              </div>
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>Win Rate:</span>
                <span className={styles.statsVal} style={{ color: winRate >= 50 ? "var(--color-success)" : "inherit" }}>
                  {winRate}%
                </span>
              </div>
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>Net Profit:</span>
                <span 
                  className={styles.statsVal} 
                  style={{ color: netProfit > 0 ? "var(--color-success)" : netProfit < 0 ? "var(--color-danger)" : "inherit" }}
                >
                  {netProfit > 0 ? "+" : ""}{netProfit.toLocaleString()} $
                </span>
              </div>
            </div>
          </aside>

          {/* Core Viewport */}
          <section className="glass-panel" style={{ padding: "1.5rem" }}>
            {renderActiveTab()}
          </section>

        </div>

        {/* Transaction History Log */}
        <div className={styles.ledgerSection}>
          <div className={styles.ledgerHeader}>
            <h3 className={styles.ledgerTitle}>Transaction & Wager Ledger</h3>
            <button id="btn-reset-data" className={styles.resetBtn} onClick={resetAllData}>
              Reset Game Data
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            {wagerHistory.length > 0 ? (
              <table className={styles.ledgerTable}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Wager Amount</th>
                    <th>Payout</th>
                    <th>Result</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {wagerHistory.slice(0, 10).map((tx) => (
                    <tr key={tx.id} className={styles.ledgerRow}>
                      <td>
                        <span className={`${styles.typeBadge} ${styles["type_" + tx.type]}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-text-primary)", fontWeight: "500" }}>{tx.description}</td>
                      <td style={{ fontWeight: "700" }}>{tx.amount > 0 ? `${tx.amount} $` : "—"}</td>
                      <td 
                        style={{ fontWeight: "700" }}
                        className={tx.result === "win" ? styles.win : ""}
                      >
                        {tx.payout > 0 ? `+${tx.payout} $` : "—"}
                      </td>
                      <td>
                        <span className={`${styles.statsVal} ${styles[tx.result]}`}>
                          {tx.result}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyLedger}>
                No wagers placed yet. Start playing mini-games or bet on esports to log activities!
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <DashboardContent />
    </WalletProvider>
  );
}
