"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import styles from "./navbar.module.css";

export const Navbar: React.FC = () => {
  const { balance, claimFaucet, lastClaimTime, user, setIsAuthOpen, logoutUser } = useWallet();
  const [pulse, setPulse] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [faucetMsg, setFaucetMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Trigger pulse animation when balance changes
  useEffect(() => {
    if (balance > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [balance]);

  // Update countdown timer for the faucet
  useEffect(() => {
    const updateTimer = () => {
      if (!lastClaimTime) {
        setCountdown(null);
        return;
      }

      const now = Date.now();
      const cooldown = 12 * 60 * 60 * 1000; // 12 hours
      const diff = now - lastClaimTime;

      if (diff >= cooldown) {
        setCountdown(null);
      } else {
        const remaining = cooldown - diff;
        const h = Math.floor(remaining / (1000 * 60 * 60));
        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((remaining % (1000 * 60)) / 1000);
        
        const pad = (n: number) => n.toString().padStart(2, "0");
        setCountdown(`${pad(h)}:${pad(m)}:${pad(s)}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastClaimTime]);

  const handleClaim = () => {
    const result = claimFaucet();
    if (result.success) {
      setFaucetMsg({ text: result.message, isError: false });
    } else {
      setFaucetMsg({ text: result.message, isError: true });
    }

    setTimeout(() => setFaucetMsg(null), 4000);
  };

  return (
    <>
      {/* Flashing Vegas/Casino Live Marquee Ticker */}
      <div className="tickerContainer">
        <div className="tickerTrack">
          <span style={{ color: "var(--color-accent)", fontWeight: 900, marginRight: "4rem", animation: "blinkFast 0.8s infinite" }}>
            ⚡ JACKPOT FEVER ACTIVE: +50% WAR BONDS DROPS ON CRATES ⚡
          </span>
          <span className="tickerItem"><span className="tickerUser">xX_Kaiser_Xx</span> won <span className="tickerWin">4,200 War Bonds</span> on <span className="tickerTarget">Dropship Crash (4.20x)</span></span>
          <span className="tickerItem"><span className="tickerUser">TrenchSentry14</span> won <span className="tickerWin">2,000 War Bonds</span> on <span className="tickerTarget">T vs CT Flip (Landed CT)</span></span>
          <span className="tickerItem"><span className="tickerUser">GeneralFrench</span> won <span className="tickerWin">1,750 War Bonds</span> on <span className="tickerTarget">Verdun Offensive (YES)</span></span>
          <span className="tickerItem"><span className="tickerUser">DiggerBoy1916</span> won <span className="tickerWin">3,800 War Bonds</span> on <span className="tickerTarget">Crate Opener (Renegade Raider)</span></span>
          <span className="tickerItem"><span className="tickerUser">SultanDefend</span> won <span className="tickerWin">2,500 War Bonds</span> on <span className="tickerTarget">Gallipoli Defense (YES)</span></span>
        </div>
      </div>

      {/* Entrenched League V Sponsorship Ribbon */}
      <div className={`${styles.sponsorRibbon} blink-slow`}>
        🏆 SPONSORED BY ENTRENCHED LEAGUE V • CLASH MULTIPLIERS SET AT 99% 🏆
      </div>

      <nav className={styles.navbar}>
        <div className={styles.logoSection}>
          <span className={`${styles.logo} color-shifter`}>CLASHWAGER</span>
          <span className={`${styles.logoDot} blink-fast`} />
        </div>

        <div className={styles.rightSection}>
          {faucetMsg && (
            <span 
              style={{ 
                fontSize: "0.8rem", 
                color: faucetMsg.isError ? "var(--color-danger)" : "var(--color-success)",
                marginRight: "0.5rem"
              }}
            >
              {faucetMsg.text}
            </span>
          )}

          {/* User Sign In and Account Indicator Controls */}
          {user ? (
            <div className={styles.userBox}>
              <span className={styles.username}>👤 {user.username}</span>
              <button 
                id="btn-auth-logout" 
                className={styles.logoutBtn} 
                onClick={logoutUser}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button 
              id="btn-auth-trigger" 
              className={styles.authBtn} 
              onClick={() => setIsAuthOpen(true)}
            >
              SIGN IN / REGISTER
            </button>
          )}
          
          <button 
            id="btn-claim-faucet"
            className={`${styles.faucetBtn} ${countdown === null ? "blink-slow" : ""}`}
            style={countdown === null ? { border: "1px solid var(--color-primary)", boxShadow: "var(--glow-primary)" } : {}}
            onClick={handleClaim}
            disabled={countdown !== null}
          >
            {countdown ? `Cooldown: ${countdown}` : "Claim 250 War Bonds 🔥"}
          </button>

          {user && (
            <div className={`${styles.walletBadge} ${pulse ? styles.pulse : ""}`}>
              <img src="/warbond.jpg" alt="War Bond" className={styles.coinIcon} />
              <span className={styles.balance}>{balance.toLocaleString()} War Bonds</span>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
