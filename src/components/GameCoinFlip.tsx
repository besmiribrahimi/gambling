"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import styles from "./coinflip.module.css";

export const GameCoinFlip: React.FC = () => {
  const { balance, setBalance, addTransaction } = useWallet();
  const [selectedSide, setSelectedSide] = useState<"T" | "CT">("T");
  const [wager, setWager] = useState<string>("100");
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [history, setHistory] = useState<Array<"T" | "CT">>([
    "T", "CT", "CT", "T", "T"
  ]);

  const handleSelectSide = (side: "T" | "CT") => {
    if (isFlipping) return;
    setSelectedSide(side);
    setAlertMsg(null);
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

    // Deduct balance
    setBalance(balance - betAmount);
    setIsFlipping(true);
    setAlertMsg(null);

    // Randomize output side
    const resultSide: "T" | "CT" = Math.random() < 0.5 ? "T" : "CT";

    // Dynamic rotation to spin at least 5 times (1800 deg)
    // T is at 0/360/720... and CT is at 180/540/900...
    const baseSpins = 1800; // 5 full rotations
    // Calculate alignment relative to current rotation to keep rotation accumulation positive
    const currentSpins = Math.floor(rotationY / 360) * 360;
    const additionalDeg = resultSide === "CT" ? 180 : 0;
    const nextRotation = currentSpins + baseSpins + additionalDeg;

    setRotationY(nextRotation);

    // Set flip cooldown (matches transition in CSS module: 3.5s)
    setTimeout(() => {
      setIsFlipping(false);
      
      const didWin = resultSide === selectedSide;
      const payout = didWin ? betAmount * 2 : 0;

      if (didWin) {
        setBalance((prev) => prev + payout);
        setAlertMsg({
          text: `Winner! Coinflip landed on ${resultSide}. Earned +${payout} War Bonds!`,
          isError: false
        });
        addTransaction("coinflip", `Won coinflip betting on ${selectedSide} (Landed: ${resultSide})`, betAmount, "win", payout);
      } else {
        setAlertMsg({
          text: `Lost! Coinflip landed on ${resultSide}. Lost ${betAmount} War Bonds`,
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
      setWager(Math.round(val * multiplier).toString());
    }
  };

  const handleHalfWager = () => handleQuickWager(0.5);
  const handleDoubleWager = () => handleQuickWager(2);
  const handleMaxWager = () => setWager(balance.toString());

  return (
    <div className={styles.container}>
      {/* 3D Coin Spinner Visuals */}
      <div className={styles.coinSection}>
        <div className={styles.coinWrapper}>
          <div 
            className={styles.coin}
            style={{ transform: `rotateY(${rotationY}deg)` }}
          >
            {/* Front Face: Terrorist */}
            <div className={`${styles.coinFace} ${styles.faceT}`}>
              <span className={`${styles.coinSymbol} ${styles.symbolT}`}>T</span>
              <span className={styles.coinLabel}>Phoenix</span>
            </div>

            {/* Back Face: Counter-Terrorist */}
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
                T Side
                <span style={{ fontSize: "0.75rem", fontWeight: "600", marginTop: "0.2rem" }}>1.98x</span>
              </button>
              <button
                className={`${styles.sideBtn} ${styles.sideBtnCT} ${selectedSide === "CT" ? styles.activeCT : ""}`}
                onClick={() => handleSelectSide("CT")}
                disabled={isFlipping}
              >
                CT Side
                <span style={{ fontSize: "0.75rem", fontWeight: "600", marginTop: "0.2rem" }}>1.98x</span>
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
              <button className={styles.quickBtn} onClick={handleHalfWager} disabled={isFlipping}>1/2</button>
              <button className={styles.quickBtn} onClick={handleDoubleWager} disabled={isFlipping}>2x</button>
              <button className={styles.quickBtn} onClick={handleMaxWager} disabled={isFlipping}>MAX</button>
              <button className={styles.quickBtn} onClick={() => setWager("100")} disabled={isFlipping}>MIN</button>
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
          {isFlipping ? "Flipping Coin..." : "Flip Coin"}
        </button>
      </div>
    </div>
  );
};
export default GameCoinFlip;
