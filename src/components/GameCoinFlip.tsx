"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./coinflip.module.css";

export const GameCoinFlip: React.FC = () => {
  const { balance, setBalance, addTransaction } = useWallet();
  const [selectedSide, setSelectedSide] = useState<"T" | "CT">("T");
  const [wager, setWager] = useState<string>("100");
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  const [streak, setStreak] = useState(0);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [history, setHistory] = useState<Array<"T" | "CT">>([
    "T", "CT", "CT", "T", "T"
  ]);

  const handleSelectSide = (side: "T" | "CT") => {
    if (isFlipping) return;
    setSelectedSide(side);
    setAlertMsg(null);
    sound.playClick();
  };

  const handleFlip = () => {
    const betAmount = parseInt(wager);
    if (isNaN(betAmount) || betAmount <= 0) {
      setAlertMsg({ text: "Please enter a valid amount.", isError: true });
      return;
    }
    if (balance < betAmount) {
      setAlertMsg({ text: "Insufficient War Bonds balance.", isError: true });
      return;
    }

    setBalance((prev) => prev - betAmount);
    setIsFlipping(true);
    setAlertMsg(null);
    sound.playCoinFlip();

    const resultSide: "T" | "CT" = Math.random() < 0.5 ? "T" : "CT";

    const baseSpins = 1800; // 5 full rotations
    const currentSpins = Math.floor(rotationY / 360) * 360;
    const additionalDeg = resultSide === "CT" ? 180 : 0;
    const nextRotation = currentSpins + baseSpins + additionalDeg;

    setRotationY(nextRotation);

    setTimeout(() => {
      setIsFlipping(false);
      sound.playCoinLand();
      
      const didWin = resultSide === selectedSide;
      const nextStreak = didWin ? streak + 1 : 0;
      setStreak(nextStreak);

      // 1.98x base + 2% per streak count
      const streakMultiplier = 1.98 + (nextStreak > 1 ? (nextStreak - 1) * 0.05 : 0);
      const payout = didWin ? Math.round(betAmount * streakMultiplier) : 0;

      if (didWin) {
        setBalance((prev) => prev + payout);
        setAlertMsg({
          text: `Victory! Coinflip landed on ${resultSide}! Won +${payout} War Bonds! ${nextStreak > 1 ? `(${nextStreak}x Streak Bonus 🔥)` : ""}`,
          isError: false
        });
        addTransaction("coinflip", `Won coinflip betting on ${selectedSide} (Landed: ${resultSide})`, betAmount, "win", payout);
        sound.playWin();
      } else {
        setAlertMsg({
          text: `Coin landed on ${resultSide}. Lost ${betAmount} War Bonds.`,
          isError: true
        });
        addTransaction("coinflip", `Lost coinflip betting on ${selectedSide} (Landed: ${resultSide})`, betAmount, "lose", 0);
      }

      setHistory((prev) => [resultSide, ...prev.slice(0, 7)]);
    }, 3600);
  };

  const handleQuickWager = (multiplier: number) => {
    const val = parseInt(wager);
    if (!isNaN(val)) {
      setWager(Math.max(1, Math.round(val * multiplier)).toString());
    }
  };

  const handleAddChip = (chipVal: number) => {
    if (isFlipping) return;
    const current = parseInt(wager || "0");
    const next = isNaN(current) ? chipVal : current + chipVal;
    setWager(Math.min(next, balance).toString());
    sound.playChip();
  };

  return (
    <div className={styles.container}>
      {/* 3D Coin Spinner Visuals */}
      <div className={styles.coinSection}>
        {streak > 1 && (
          <div style={{ marginBottom: "1rem", color: "#ffd700", fontWeight: 900, fontFamily: "var(--font-family-title)", animation: "blinkFast 1s infinite" }}>
            🔥 {streak}x WIN STREAK ACTIVE (+{Math.round((streak - 1) * 5)}% PAYOUT BOOST)
          </div>
        )}

        <div className={styles.coinWrapper}>
          <div 
            className={styles.coin}
            style={{ transform: `rotateY(${rotationY}deg)` }}
          >
            {/* Front Face: Terrorist / Phoenix */}
            <div className={`${styles.coinFace} ${styles.faceT}`}>
              <span className={`${styles.coinSymbol} ${styles.symbolT}`}>T</span>
              <span className={styles.coinLabel}>Phoenix</span>
            </div>

            {/* Back Face: Counter-Terrorist / Shield */}
            <div className={`${styles.coinFace} ${styles.faceCT}`}>
              <span className={`${styles.coinSymbol} ${styles.symbolCT}`}>CT</span>
              <span className={styles.coinLabel}>Shield</span>
            </div>
          </div>
        </div>

        {/* History row */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 700 }}>RECENT FLIPS</span>
          <div className={styles.historyRow}>
            {history.map((side, idx) => (
              <div 
                key={idx} 
                className={`${styles.historyBadge} ${side === "T" ? styles.badgeT : styles.badgeCT}`}
              >
                {side}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className={styles.controlPanel}>
        <div>
          {/* Side Selector */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Select Side</label>
            <div className={styles.sideSelector}>
              <button
                className={`${styles.sideBtn} ${styles.sideBtnT} ${selectedSide === "T" ? styles.activeT : ""}`}
                onClick={() => handleSelectSide("T")}
                disabled={isFlipping}
              >
                T Side (Phoenix)
                <span style={{ fontSize: "0.8rem", fontWeight: "700", marginTop: "0.25rem" }}>1.98x</span>
              </button>
              <button
                className={`${styles.sideBtn} ${styles.sideBtnCT} ${selectedSide === "CT" ? styles.activeCT : ""}`}
                onClick={() => handleSelectSide("CT")}
                disabled={isFlipping}
              >
                CT Side (Shield)
                <span style={{ fontSize: "0.8rem", fontWeight: "700", marginTop: "0.25rem" }}>1.98x</span>
              </button>
            </div>
          </div>

          {/* Wager Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Wager Amount</label>
            <div className={styles.wagerBox}>
              <span style={{ color: "var(--color-text-muted)", marginRight: "0.5rem", fontWeight: "700" }}>$</span>
              <input
                type="number"
                className={styles.wagerInput}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                disabled={isFlipping}
              />
            </div>
            
            <div className={styles.quickWagerRow}>
              <button className={styles.quickBtn} onClick={() => handleQuickWager(0.5)} disabled={isFlipping}>1/2</button>
              <button className={styles.quickBtn} onClick={() => handleQuickWager(2)} disabled={isFlipping}>2x</button>
              <button className={styles.quickBtn} onClick={() => setWager(balance.toString())} disabled={isFlipping}>MAX</button>
              <button className={styles.quickBtn} onClick={() => setWager("100")} disabled={isFlipping}>MIN</button>
            </div>

            {/* Chips Shortcuts */}
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", justifyContent: "center" }}>
              <button className="casino-chip chip-white" onClick={() => handleAddChip(10)} disabled={isFlipping}>10</button>
              <button className="casino-chip chip-red" onClick={() => handleAddChip(50)} disabled={isFlipping}>50</button>
              <button className="casino-chip chip-blue" onClick={() => handleAddChip(100)} disabled={isFlipping}>100</button>
              <button className="casino-chip chip-purple" onClick={() => handleAddChip(500)} disabled={isFlipping}>500</button>
              <button className="casino-chip chip-gold" onClick={() => handleAddChip(1000)} disabled={isFlipping}>1k</button>
            </div>
          </div>

          {alertMsg && (
            <div className={`${styles.alert} ${alertMsg.isError ? styles.alertDanger : styles.alertSuccess}`}>
              {alertMsg.text}
            </div>
          )}
        </div>

        <button 
          className={styles.flipBtn} 
          onClick={handleFlip}
          disabled={isFlipping}
        >
          {isFlipping ? "Flipping Coin in Mid-Air..." : `Flip Coin (${wager || 0} $)`}
        </button>
      </div>
    </div>
  );
};

export default GameCoinFlip;
