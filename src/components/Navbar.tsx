"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./navbar.module.css";

export const Navbar: React.FC = () => {
  const {
    balance,
    user,
    isAdmin,
    setIsAuthOpen,
    setIsDailyModalOpen,
    setIsFairModalOpen,
    setIsSettingsOpen,
    setIsAdminOpen,
    logoutUser,
    vipTier,
    vipProgress,
    lastClaimTime
  } = useWallet();

  const [isMuted, setIsMuted] = useState(() => sound.getIsMuted());

  const handleToggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
    if (!nextMute) {
      sound.playClick();
    }
  };

  const now = Date.now();
  const isWheelReady = !lastClaimTime || (now - lastClaimTime >= 24 * 60 * 60 * 1000);

  return (
    <>
      {/* Flashing Vegas/Casino Live Marquee Ticker */}
      <div className="tickerContainer">
        <div className="tickerTrack">
          <span style={{ color: "#ffd700", fontWeight: 900, marginRight: "4rem", animation: "blinkFast 0.8s infinite" }}>
            ⚡ JACKPOT FEVER ACTIVE: 3X PAYOUT BOOST ON 5-REEL SLOTS & EXOTIC CRATES ⚡
          </span>
          <span className="tickerItem"><span className="tickerUser">xX_Kaiser_Xx</span> won <span className="tickerWin">6,400 War Bonds</span> on <span className="tickerTarget">Dropship Crash (6.40x)</span></span>
          <span className="tickerItem"><span className="tickerUser">TrenchSentry14</span> won <span className="tickerWin">2,970 War Bonds</span> on <span className="tickerTarget">3D Coin Flip (Landed CT)</span></span>
          <span className="tickerItem"><span className="tickerUser">GeneralFrench</span> won <span className="tickerWin">4,200 War Bonds</span> on <span className="tickerTarget">Plinko (Risk High - 42x)</span></span>
          <span className="tickerItem"><span className="tickerUser">DiggerBoy1916</span> won <span className="tickerWin">6,000 War Bonds</span> on <span className="tickerTarget">Crate Opener (Renegade Raider)</span></span>
          <span className="tickerItem"><span className="tickerUser">SultanDefend</span> won <span className="tickerWin">3,500 War Bonds</span> on <span className="tickerTarget">Blackjack (Dealer Bust)</span></span>
        </div>
      </div>

      {/* Entrenched League V Sponsorship Ribbon */}
      <div className={`${styles.sponsorRibbon} blink-slow`}>
        🏆 OFFICIAL BETTING PARTNER OF ENTRENCHED LEAGUE V • ALL CASINO GAMES 99% PROVABLY FAIR 🏆
      </div>

      <nav className={styles.navbar}>
        {/* Left Section: Logo & Quick Links */}
        <div className={styles.logoSection}>
          <span className={`${styles.logo} color-shifter`}>CLASHWAGER</span>
          <span className={`${styles.logoDot} blink-fast`} />
          
          <button
            onClick={() => { setIsFairModalOpen(true); sound.playClick(); }}
            style={{
              marginLeft: "1rem",
              background: "rgba(0, 240, 255, 0.08)",
              border: "1px solid rgba(0, 240, 255, 0.25)",
              color: "var(--color-primary)",
              padding: "0.3rem 0.6rem",
              borderRadius: "4px",
              fontSize: "0.72rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            ⚖️ Provably Fair
          </button>

          {/* Admin Command Center Launch Button (STRICTLY for logged-in Admin accounts ONLY) */}
          {user && isAdmin && (
            <button
              onClick={() => { setIsAdminOpen(true); sound.playJackpot(); }}
              style={{
                marginLeft: "0.5rem",
                background: "rgba(255, 0, 85, 0.2)",
                border: "1.5px solid #ff0055",
                color: "#ff0055",
                padding: "0.35rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.72rem",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                boxShadow: "0 0 16px rgba(255, 0, 85, 0.5)",
                cursor: "pointer"
              }}
            >
              ⚡ ADMIN PANEL
            </button>
          )}
        </div>

        {/* Right Section: Sound, VIP, Daily Wheel, Account Settings, Wallet & Auth */}
        <div className={styles.rightSection}>
          {/* Sound FX Mute Toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              padding: "0.4rem 0.6rem",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              color: isMuted ? "var(--color-text-muted)" : "var(--color-primary)"
            }}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          {/* Daily Wheel Trigger */}
          <button 
            id="btn-claim-daily-wheel"
            className={styles.faucetBtn}
            style={isWheelReady ? { border: "1px solid #ffd700", boxShadow: "0 0 12px rgba(255,215,0,0.4)" } : {}}
            onClick={() => { 
              if (!user) {
                setIsAuthOpen(true);
              } else {
                setIsDailyModalOpen(true);
              }
              sound.playClick(); 
            }}
          >
            {isWheelReady ? "🎁 Daily Wheel (Ready!)" : "🎁 Daily Wheel"}
          </button>

          {/* Logged in User Controls */}
          {user ? (
            <>
              {/* VIP Tier Badge & Progress */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: `1px solid ${vipTier.color}40`,
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  gap: "0.2rem",
                  cursor: "pointer"
                }}
                onClick={() => { setIsSettingsOpen(true); sound.playClick(); }}
                title="Open Account & VIP Settings"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 800, color: vipTier.color }}>
                  <span>{vipTier.badge}</span>
                  <span>{vipTier.name} VIP</span>
                </div>
                <div style={{ width: "70px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${vipProgress}%`, height: "100%", background: vipTier.color }} />
                </div>
              </div>

              {/* Wallet Balance (ONLY visible to Logged-in Members) */}
              <div className={styles.walletBadge}>
                <span style={{ fontSize: "1.1rem" }}>🪙</span>
                <span className={styles.balance}>{balance.toLocaleString()} $</span>
              </div>

              {/* Account Settings Gear Button */}
              <button
                id="btn-account-settings"
                onClick={() => { setIsSettingsOpen(true); sound.playClick(); }}
                title="Account Settings & Preferences"
                style={{
                  background: "rgba(0, 240, 255, 0.08)",
                  border: "1px solid rgba(0, 240, 255, 0.3)",
                  borderRadius: "6px",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  color: "var(--color-primary)",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer"
                }}
              >
                ⚙️ Settings
              </button>

              {/* User Identity & Logout */}
              <div className={styles.userBox}>
                <div
                  onClick={() => { setIsSettingsOpen(true); sound.playClick(); }}
                  style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span className={styles.username}>
                      {user.username}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 900,
                        padding: "0.1rem 0.35rem",
                        borderRadius: "3px",
                        background: user.role === "admin" ? "rgba(255, 0, 85, 0.25)" : "rgba(0, 230, 118, 0.25)",
                        color: user.role === "admin" ? "#ff0055" : "var(--color-success)",
                        border: `1px solid ${user.role === "admin" ? "#ff0055" : "var(--color-success)"}`
                      }}
                    >
                      {user.role === "admin" ? "ADMIN" : "MEMBER"}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                    ☁️ VPS Synced
                  </span>
                </div>
                <button 
                  id="btn-auth-logout" 
                  className={styles.logoutBtn} 
                  onClick={logoutUser}
                >
                  LOGOUT
                </button>
              </div>
            </>
          ) : (
            /* Unauthenticated Guest Controls: No balance displayed, clear signin/register buttons */
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                id="btn-claim-bonus"
                onClick={() => { setIsAuthOpen(true); sound.playClick(); }}
                style={{
                  background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)",
                  color: "#000",
                  fontFamily: "var(--font-family-title)",
                  fontWeight: 900,
                  fontSize: "0.82rem",
                  padding: "0.55rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)",
                  letterSpacing: "0.02em"
                }}
              >
                🎁 CLAIM 1,000 $ BONUS
              </button>

              <button 
                id="btn-auth-trigger" 
                className={styles.authBtn} 
                onClick={() => { setIsAuthOpen(true); sound.playClick(); }}
              >
                SIGN IN
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
