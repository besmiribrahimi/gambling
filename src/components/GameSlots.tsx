"use client";

import React, { useState, useEffect, useRef } from "react";
import useWager from "../hooks/useWager";
import styles from "./slots.module.css";

const SLOT_SYMBOLS = ["7️⃣", "💎", "⭐", "🍒", "🍋", "🍉"];

interface SymbolPay {
  symbol: string;
  payout3: number;
}

const PAYTABLE: SymbolPay[] = [
  { symbol: "7️⃣", payout3: 30 },
  { symbol: "💎", payout3: 15 },
  { symbol: "⭐", payout3: 10 },
  { symbol: "🍒", payout3: 5 },
  { symbol: "🍋", payout3: 3 },
  { symbol: "🍉", payout3: 2 }
];

export const GameSlots: React.FC = () => {
  const { balance, placeWager, resolveWager } = useWager();
  const [betAmount, setBetAmount] = useState<string>("10");
  const [reels, setReels] = useState<string[]>(["7️⃣", "7️⃣", "7️⃣"]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false]);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [flashWin, setFlashWin] = useState(false);

  const spinIntervalRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null]);
  const stopTimeoutRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null]);

  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      spinIntervalRefs.current.forEach((ref) => ref && clearInterval(ref));
      stopTimeoutRefs.current.forEach((ref) => ref && clearTimeout(ref));
    };
  }, []);

  const handleMaxWager = () => {
    setBetAmount(balance.toString());
  };

  const handleSpin = () => {
    if (isSpinning) return;

    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertMsg({ text: "Please enter a valid bet amount.", isError: true });
      return;
    }

    if (balance < amt) {
      setAlertMsg({ text: "Insufficient War Bonds balance.", isError: true });
      return;
    }

    // Place bet using hook
    const placed = placeWager(amt);
    if (!placed) return;

    // Reset alert and trigger spinning state
    setAlertMsg(null);
    setIsSpinning(true);
    setSpinningReels([true, true, true]);

    // Choose final result symbols beforehand to resolve wagers on server-level consistency
    const finalResult = [
      SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
    ];

    // Reel 1 spin interval
    spinIntervalRefs.current[0] = setInterval(() => {
      setReels((prev) => [
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        prev[1],
        prev[2]
      ]);
    }, 75);

    // Reel 2 spin interval
    spinIntervalRefs.current[1] = setInterval(() => {
      setReels((prev) => [
        prev[0],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        prev[2]
      ]);
    }, 75);

    // Reel 3 spin interval
    spinIntervalRefs.current[2] = setInterval(() => {
      setReels((prev) => [
        prev[0],
        prev[1],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
      ]);
    }, 75);

    // Staggered stop timers
    // Reel 1 stops at 1000ms
    stopTimeoutRefs.current[0] = setTimeout(() => {
      if (spinIntervalRefs.current[0]) clearInterval(spinIntervalRefs.current[0]);
      setSpinningReels((prev) => [false, prev[1], prev[2]]);
      setReels((prev) => [finalResult[0], prev[1], prev[2]]);
    }, 1000);

    // Reel 2 stops at 1350ms
    stopTimeoutRefs.current[1] = setTimeout(() => {
      if (spinIntervalRefs.current[1]) clearInterval(spinIntervalRefs.current[1]);
      setSpinningReels((prev) => [prev[0], false, prev[2]]);
      setReels((prev) => [finalResult[0], finalResult[1], prev[2]]);
    }, 1350);

    // Reel 3 stops at 1700ms
    stopTimeoutRefs.current[2] = setTimeout(() => {
      if (spinIntervalRefs.current[2]) clearInterval(spinIntervalRefs.current[2]);
      setSpinningReels([false, false, false]);
      setReels(finalResult);
      setIsSpinning(false);

      resolveSlotsWager(amt, finalResult);
    }, 1700);
  };

  const resolveSlotsWager = (amt: number, resultSymbols: string[]) => {
    const [s1, s2, s3] = resultSymbols;
    let didWin = false;
    let multiplier = 0;

    // Check 3 matching
    if (s1 === s2 && s2 === s3) {
      didWin = true;
      const payInfo = PAYTABLE.find((p) => p.symbol === s1);
      multiplier = payInfo ? payInfo.payout3 : 1;
    }
    // Check 2 matching
    else if (s1 === s2 || s2 === s3 || s1 === s3) {
      didWin = true;
      multiplier = 1.5;
    }

    const payout = didWin ? Math.round(amt * multiplier) : 0;

    if (didWin) {
      setFlashWin(true);
      setTimeout(() => setFlashWin(false), 2000);
      setAlertMsg({
        text: `Jackpot! Landed [${s1} ${s2} ${s3}]. Won +${payout} War Bonds! (${multiplier}x multiplier)`,
        isError: false
      });
      resolveWager(
        amt,
        payout,
        true,
        "slots",
        `Won Slots: landed [${s1} ${s2} ${s3}] matching combination (Multiplier: ${multiplier}x)`
      );
    } else {
      setAlertMsg({
        text: `Landed [${s1} ${s2} ${s3}]. Better luck next spin!`,
        isError: true
      });
      resolveWager(
        amt,
        0,
        false,
        "slots",
        `Lost Slots: landed [${s1} ${s2} ${s3}] non-matching reels`
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameLayout}>
        
        {/* Reels Arena */}
        <div className={`${styles.slotsArena} ${flashWin ? "flashWinner" : ""}`}>
          <div className={styles.reelsContainer}>
            <div className={`${styles.reel} ${spinningReels[0] ? styles.spinning : ""}`}>
              {reels[0]}
            </div>
            <div className={`${styles.reel} ${spinningReels[1] ? styles.spinning : ""}`}>
              {reels[1]}
            </div>
            <div className={`${styles.reel} ${spinningReels[2] ? styles.spinning : ""}`}>
              {reels[2]}
            </div>
          </div>
        </div>

        {/* Wager Panel */}
        <div className={styles.wagerPanel}>
          <div>
            <h2 className={styles.title}>Trench Slots</h2>
            <p className={styles.subtitle}>
              Pull the lever and spin the reels. Claim multipliers for matching symbols.
            </p>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputHeader}>
              <span className={styles.inputLabel}>Stake Amount</span>
            </div>

            <div className={styles.inputBoxRow}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginRight: "0.4rem", fontWeight: "700" }}>$</span>
              <input
                disabled={isSpinning}
                type="number"
                className={styles.inputBox}
                placeholder="Wager amount..."
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
              <button disabled={isSpinning} className={styles.maxBtn} onClick={handleMaxWager}>
                MAX
              </button>
            </div>
          </div>

          <button
            disabled={isSpinning || !betAmount}
            className={styles.spinBtn}
            onClick={handleSpin}
          >
            {isSpinning ? "Spinning Reels..." : "Pull Lever"}
          </button>

          {/* Feedback alerts */}
          {alertMsg && (
            <div
              className={`${styles.alertBox} ${
                alertMsg.isError ? styles.errorAlert : styles.successAlert
              }`}
            >
              {alertMsg.text}
            </div>
          )}

          {/* Paytable */}
          <div className={styles.paytableBox}>
            <span className={styles.paytableTitle}>Winning Multipliers</span>
            
            <div className={styles.paytableGrid}>
              {PAYTABLE.map((row) => (
                <div key={row.symbol} className={styles.paytableRow}>
                  <span className={styles.paySymbols}>{row.symbol} {row.symbol} {row.symbol}</span>
                  <span className={styles.payMult}>{row.payout3}x</span>
                </div>
              ))}
              <div className={styles.paytableRow} style={{ gridColumn: "span 2", borderColor: "rgba(255, 170, 0, 0.25)" }}>
                <span className={styles.paySymbols}>Any 2 Matching Symbols</span>
                <span className={styles.payMult} style={{ color: "var(--color-success)" }}>1.5x</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GameSlots;
