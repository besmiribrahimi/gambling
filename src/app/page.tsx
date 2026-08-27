"use client";

import React, { useState } from "react";
import { WalletProvider, useWallet } from "../context/WalletContext";
import Navbar from "../components/Navbar";
import BettingArena from "../components/BettingArena";
import GameCrash from "../components/GameCrash";
import GameCoinFlip from "../components/GameCoinFlip";
import GameLootbox from "../components/GameLootbox";
import GameRoulette from "../components/GameRoulette";
import GameMines from "../components/GameMines";
import GameSlots from "../components/GameSlots";
import GamePlinko from "../components/GamePlinko";
import GameBlackjack from "../components/GameBlackjack";
import Leaderboard from "../components/Leaderboard";
import CommunityChat from "../components/CommunityChat";
import DailyRewardsModal from "../components/DailyRewardsModal";
import ProvablyFairModal from "../components/ProvablyFairModal";
import BigWinCelebration from "../components/BigWinCelebration";
import AuthModal from "../components/AuthModal";
import UserSettingsModal from "../components/UserSettingsModal";
import AdminModal from "../components/AdminModal";
import LiveToastAlerts from "../components/LiveToastAlerts";
import sound from "../lib/sound";
import styles from "./page.module.css";

type TabId = 
  | "betting" 
  | "crash" 
  | "coinflip" 
  | "mines" 
  | "slots" 
  | "roulette" 
  | "lootbox" 
  | "plinko" 
  | "blackjack" 
  | "leaderboard";

type CategoryFilter = "all" | "originals" | "table" | "esports" | "community";

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>("crash");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const { user, setIsAuthOpen, wagerHistory, rakebackBalance, vipTier, resetAllData, isSettingsOpen, setIsSettingsOpen, isAdminOpen, setIsAdminOpen } = useWallet();

  // Statistics Calculations
  const completedWagers = wagerHistory.filter((w) => w.result !== "pending");
  const wonWagers = completedWagers.filter((w) => w.result === "win");
  const winRate = completedWagers.length > 0 
    ? Math.round((wonWagers.length / completedWagers.length) * 100) 
    : 0;

  const resolvedOutflow = completedWagers.reduce((sum, w) => sum + (w.amount || 0), 0);
  const resolvedInflow = completedWagers.reduce((sum, w) => sum + (w.payout || 0), 0);
  const netProfit = resolvedInflow - resolvedOutflow;

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    sound.playClick();
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "betting":
        return <BettingArena />;
      case "crash":
        return <GameCrash />;
      case "coinflip":
        return <GameCoinFlip />;
      case "mines":
        return <GameMines />;
      case "slots":
        return <GameSlots />;
      case "roulette":
        return <GameRoulette />;
      case "lootbox":
        return <GameLootbox />;
      case "plinko":
        return <GamePlinko />;
      case "blackjack":
        return <GameBlackjack />;
      case "leaderboard":
        return <Leaderboard />;
      default:
        return <GameCrash />;
    }
  };

  // Tab definitions with category mapping
  const ALL_TABS: Array<{ id: TabId; label: string; icon: string; category: CategoryFilter; isHot?: boolean; isNew?: boolean }> = [
    { id: "crash", label: "Dropship Crash", icon: "🚀", category: "originals", isHot: true },
    { id: "plinko", label: "Trench Plinko", icon: "🟢", category: "originals", isNew: true },
    { id: "mines", label: "Trench Mines", icon: "💣", category: "originals" },
    { id: "slots", label: "Trench Slots Deluxe", icon: "🎰", category: "originals", isHot: true },
    { id: "blackjack", label: "Blackjack 21", icon: "🃏", category: "table", isNew: true },
    { id: "coinflip", label: "3D Coin Flip", icon: "🪙", category: "table" },
    { id: "roulette", label: "Trench Roulette", icon: "🎡", category: "table" },
    { id: "lootbox", label: "Crate Opener", icon: "📦", category: "originals" },
    { id: "betting", label: "Esports Markets", icon: "🎯", category: "esports", isHot: true },
    { id: "leaderboard", label: "Hall of Fame", icon: "🏆", category: "community" }
  ];

  const visibleTabs = ALL_TABS.filter((t) => {
    if (category === "all") return true;
    return t.category === category;
  });

  return (
    <>
      <Navbar />
      <AuthModal />
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <DailyRewardsModal />
      <ProvablyFairModal />
      <BigWinCelebration />
      <CommunityChat />
      <LiveToastAlerts />

      <main className={styles.main}>
        {/* Guest Preview Mode Alert Banner */}
        {!user && (
          <div style={{
            background: "linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0, 240, 255, 0.08) 100%)",
            border: "1px solid rgba(255, 215, 0, 0.35)",
            borderRadius: "10px",
            padding: "1.1rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 0 25px rgba(255, 215, 0, 0.12)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <img
                src="/logo.png"
                alt="WarWager Official Logo"
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(255, 215, 0, 0.6)",
                  boxShadow: "0 0 15px rgba(255, 215, 0, 0.35)",
                  objectFit: "cover"
                }}
              />
              <div>
                <h3 style={{ fontFamily: "var(--font-family-title)", fontSize: "1.05rem", fontWeight: 800, color: "#ffd700", margin: 0 }}>
                  WARWAGER GUEST PREVIEW — UNLOCK 1,000 $ BONUS
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", margin: 0 }}>
                  Create a free permanent account in 10 seconds to unlock all 8 casino games and claim your <strong style={{ color: "#fff" }}>1,000 $ War Bonds</strong> starting bonus!
                </p>
              </div>
            </div>
            <button
              onClick={() => { setIsAuthOpen(true); sound.playClick(); }}
              style={{
                background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)",
                color: "#000",
                fontFamily: "var(--font-family-title)",
                fontSize: "0.82rem",
                fontWeight: 900,
                padding: "0.6rem 1.3rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(255, 215, 0, 0.35)",
                letterSpacing: "0.03em"
              }}
            >
              CLAIM 1,000 $ BONUS
            </button>
          </div>
        )}

        {/* Top Header & Category Filter Navigation */}
        <div className={styles.topBanner}>
          <h1 className={styles.mainTitle}>CLASHWAGER CASINO & ESPORTS ARENA</h1>

          <div className={styles.categoryRow}>
            <button
              className={`${styles.categoryBtn} ${category === "all" ? styles.categoryBtnActive : ""}`}
              onClick={() => { setCategory("all"); sound.playClick(); }}
            >
              🔥 All Games ({ALL_TABS.length})
            </button>
            <button
              className={`${styles.categoryBtn} ${category === "originals" ? styles.categoryBtnActive : ""}`}
              onClick={() => { setCategory("originals"); sound.playClick(); }}
            >
              ⚡ Originals
            </button>
            <button
              className={`${styles.categoryBtn} ${category === "table" ? styles.categoryBtnActive : ""}`}
              onClick={() => { setCategory("table"); sound.playClick(); }}
            >
              🎲 Table Games
            </button>
            <button
              className={`${styles.categoryBtn} ${category === "esports" ? styles.categoryBtnActive : ""}`}
              onClick={() => { setCategory("esports"); sound.playClick(); }}
            >
              🎯 Prediction Markets
            </button>
            <button
              className={`${styles.categoryBtn} ${category === "community" ? styles.categoryBtnActive : ""}`}
              onClick={() => { setCategory("community"); sound.playClick(); }}
            >
              🏆 Community
            </button>
          </div>
        </div>

        {/* Main Gaming Panels */}
        <div className={styles.dashboardLayout}>
          
          {/* Desktop Navigation Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}>Gaming Suite</div>
            <div className={styles.tabsContainer}>
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-btn-${tab.id}`}
                    className={`${styles.tabBtn} ${isActive ? styles.activeTab : ""}`}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    <span>
                      <span className={styles.tabIcon}>{tab.icon}</span> {tab.label}
                    </span>
                    {tab.isNew && <span className={styles.tabBadge} style={{ background: "rgba(0, 240, 255, 0.2)", color: "#00f0ff", borderColor: "rgba(0, 240, 255, 0.4)" }}>NEW</span>}
                    {tab.isHot && <span className={styles.tabBadge}>HOT</span>}
                  </button>
                );
              })}
            </div>

            {/* Profile Statistics Card */}
            <div className={styles.sidebarTitle}>Your Performance</div>
            <div className={styles.userStatsCard}>
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>VIP Tier:</span>
                <span className={styles.statsVal} style={{ color: vipTier.color }}>
                  {vipTier.badge} {vipTier.name}
                </span>
              </div>
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
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>Rakeback Vault:</span>
                <span className={styles.statsVal} style={{ color: "var(--color-primary)" }}>
                  {rakebackBalance.toLocaleString()} $
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
            <h3 className={styles.ledgerTitle}>
              <span>📜</span> Live Transaction & Wager Ledger
            </h3>
            <button id="btn-reset-data" className={styles.resetBtn} onClick={resetAllData}>
              Reset Game Data
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            {wagerHistory.length > 0 ? (
              <table className={styles.ledgerTable}>
                <thead>
                  <tr>
                    <th>Game</th>
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
                      <td style={{ color: "var(--color-text-primary)", fontWeight: "600" }}>{tx.description}</td>
                      <td style={{ fontWeight: "700" }}>{tx.amount > 0 ? `${tx.amount.toLocaleString()} $` : "—"}</td>
                      <td 
                        style={{ fontWeight: "800" }}
                        className={tx.result === "win" ? styles.win : ""}
                      >
                        {tx.payout > 0 ? `+${tx.payout.toLocaleString()} $` : "—"}
                      </td>
                      <td>
                        <span className={`${styles.statsVal} ${styles[tx.result]}`}>
                          {tx.result.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyLedger}>
                No wagers placed yet. Start playing mini-games or bet on esports to log real-time transactions!
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Dock Navigation */}
      <nav className={styles.mobileBottomDock}>
        {ALL_TABS.slice(0, 6).map((tab) => (
          <button
            key={tab.id}
            className={`${styles.mobileDockBtn} ${activeTab === tab.id ? styles.mobileDockBtnActive : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className={styles.mobileDockIcon}>{tab.icon}</span>
            <span>{tab.label.split(" ")[0]}</span>
          </button>
        ))}
        <button
          className={`${styles.mobileDockBtn} ${activeTab === "leaderboard" ? styles.mobileDockBtnActive : ""}`}
          onClick={() => handleTabChange("leaderboard")}
        >
          <span className={styles.mobileDockIcon}>🏆</span>
          <span>Ranks</span>
        </button>
      </nav>
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
