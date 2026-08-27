"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useWager from "../hooks/useWager";
import sound from "../lib/sound";
import styles from "./slots.module.css";

const SLOT_SYMBOLS = ["7️⃣", "💎", "⭐", "🍒", "🍋", "🍉"];

interface SymbolPay {
  symbol: string;
  payout3: number;
}

const PAYTABLE: SymbolPay[] = [
  { symbol: "7️⃣", payout3: 35 },
  { symbol: "💎", payout3: 20 },
  { symbol: "⭐", payout3: 12 },
  { symbol: "🍒", payout3: 6 },
  { symbol: "🍋", payout3: 4 },
  { symbol: "🍉", payout3: 2.5 }
];

export const GameSlots: React.FC = () => {
  const { balance, placeWager, resolveWager } = useWager();
  const [betAmount, setBetAmount] = useState<string>("50");
  const [reelCount, setReelCount] = useState<3 | 5>(3);
  const [reels, setReels] = useState<string[]>(["7️⃣", "7️⃣", "7️⃣"]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false]);
  const [autoSpinsRemaining, setAutoSpinsRemaining] = useState<number>(0);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [flashWin, setFlashWin] = useState(false);

  const spinIntervalRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null, null, null]);
  const stopTimeoutRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null, null, null]);
  const isSpinningRef = useRef(isSpinning);
  isSpinningRef.current = isSpinning;

  useEffect(() => {
    return () => {
      spinIntervalRefs.current.forEach((ref) => ref && clearInterval(ref));
      stopTimeoutRefs.current.forEach((ref) => ref && clearTimeout(ref));
    };
  }, []);

  const handleReelCountChange = (count: 3 | 5) => {
    if (isSpinning) return;
    setReelCount(count);
    if (count === 3) {
      setReels(["7️⃣", "7️⃣", "7️⃣"]);
      setSpinningReels([false, false, false, false, false]);
    } else {
      setReels(["7️⃣", "7️⃣", "7️⃣", "7️⃣", "7️⃣"]);
      setSpinningReels([false, false, false, false, false]);
    }
  };

  const handleSpin = useCallback(() => {
    if (isSpinningRef.current) return;

    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertMsg({ text: "Please enter a valid bet amount.", isError: true });
      setAutoSpinsRemaining(0);
      return;
    }

    if (balance < amt) {
      setAlertMsg({ text: "Insufficient War Bonds balance.", isError: true });
      setAutoSpinsRemaining(0);
      return;
    }

    const placed = placeWager(amt);
    if (!placed) {
      setAutoSpinsRemaining(0);
      return;
    }

    sound.playChip();
    setAlertMsg(null);
    setIsSpinning(true);

    const count = reelCount;
    setSpinningReels(Array(count).fill(true));

    // Generate random target results
    const finalResult: string[] = [];
    for (let i = 0; i < count; i++) {
      finalResult.push(SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
    }

    // Start interval animations
    for (let i = 0; i < count; i++) {
      const idx = i;
      spinIntervalRefs.current[idx] = setInterval(() => {
        setReels((prev) => {
          const next = [...prev];
          next[idx] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          return next;
        });
        sound.playSlotTick();
      }, 70 + idx * 10);
    }

    // Stagger stops
    for (let i = 0; i < count; i++) {
      const idx = i;
      const delay = 900 + idx * 350;

      stopTimeoutRefs.current[idx] = setTimeout(() => {
        if (spinIntervalRefs.current[idx]) clearInterval(spinIntervalRefs.current[idx]!);
        
        sound.playSlotStop();

        setSpinningReels((prev) => {
          const next = [...prev];
          next[idx] = false;
          return next;
        });

        setReels((prev) => {
          const next = [...prev];
          next[idx] = finalResult[idx];
          return next;
        });

        // If last reel stopped
        if (idx === count - 1) {
          setIsSpinning(false);
          resolveSlotsWager(amt, finalResult);

          // Handle Auto-Spin continuation
          setAutoSpinsRemaining((prev) => {
            if (prev > 1) {
              setTimeout(() => {
                handleSpin();
              }, 800);
              return prev - 1;
            }
            return 0;
          });
        }
      }, delay);
    }
  }, [betAmount, balance, reelCount, placeWager]);

  const resolveSlotsWager = (amt: number, resultSymbols: string[]) => {
    let didWin = false;
    let multiplier = 0;

    const count = resultSymbols.length;

    // Check all matching
    const allMatch = resultSymbols.every((s) => s === resultSymbols[0]);
    if (allMatch) {
      didWin = true;
      const payInfo = PAYTABLE.find((p) => p.symbol === resultSymbols[0]);
      const base = payInfo ? payInfo.payout3 : 10;
      multiplier = count === 5 ? base * 3 : base;
    } else {
      // Count duplicates
      const freq: Record<string, number> = {};
      resultSymbols.forEach((s) => { freq[s] = (freq[s] || 0) + 1; });
      const maxFreq = Math.max(...Object.values(freq));

      if (count === 3 && maxFreq === 2) {
        didWin = true;
        multiplier = 1.5;
      } else if (count === 5 && maxFreq >= 3) {
        didWin = true;
        multiplier = maxFreq === 4 ? 8 : maxFreq === 3 ? 2.5 : 1.5;
      }
    }

    const payout = didWin ? Math.round(amt * multiplier) : 0;

    if (didWin) {
      setFlashWin(true);
      setTimeout(() => setFlashWin(false), 2000);
      sound.playWin();

      setAlertMsg({
        text: `Jackpot Hit! [${resultSymbols.join(" ")}] • Won +${payout} War Bonds (${multiplier}x)!`,
        isError: false
      });
      resolveWager(
        amt,
        payout,
        true,
        "slots",
        `Won Slots: [${resultSymbols.join(" ")}] (${multiplier}x multiplier)`
      );
    } else {
      setAlertMsg({
        text: `[${resultSymbols.join(" ")}] • Better luck next spin!`,
        isError: true
      });
      resolveWager(
        amt,
        0,
        false,
        "slots",
        `Lost Slots: [${resultSymbols.join(" ")}]`
      );
    }
  };

  const handleStartAutoSpin = (spins: number) => {
    if (isSpinning) return;
    setAutoSpinsRemaining(spins);
    handleSpin();
  };

  const handleStopAutoSpin = () => {
    setAutoSpinsRemaining(0);
  };

  const handleAddChip = (val: number) => {
    if (isSpinning) return;
    const cur = parseInt(betAmount || "0");
    const next = isNaN(cur) ? val : cur + val;
    setBetAmount(Math.min(next, balance).toString());
    sound.playChip();
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameLayout}>
        
        {/* Reels Arena */}
        <div className={`${styles.slotsArena} ${flashWin ? "flashWinner" : ""}`}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <button
              onClick={() => handleReelCountChange(3)}
              disabled={isSpinning}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                fontFamily: "var(--font-family-title)",
                fontWeight: 800,
                fontSize: "0.75rem",
                background: reelCount === 3 ? "var(--color-primary)" : "rgba(255,255,255,0.06)",
                color: reelCount === 3 ? "#000" : "#fff"
              }}
            >
              Classic 3-Reel
            </button>
            <button
              onClick={() => handleReelCountChange(5)}
              disabled={isSpinning}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                fontFamily: "var(--font-family-title)",
                fontWeight: 800,
                fontSize: "0.75rem",
                background: reelCount === 5 ? "#ffaa00" : "rgba(255,255,255,0.06)",
                color: reelCount === 5 ? "#000" : "#fff"
              }}
            >
              Deluxe 5-Reel 🔥
            </button>
          </div>

          <div
            className={styles.reelsContainer}
            style={{
              gridTemplateColumns: `repeat(${reelCount}, 1fr)`,
              maxWidth: reelCount === 5 ? "500px" : "360px"
            }}
          >
            {reels.map((sym, idx) => (
              <div
                key={idx}
                className={`${styles.reel} ${spinningReels[idx] ? styles.spinning : ""}`}
                style={{ fontSize: reelCount === 5 ? "2.4rem" : "3.2rem" }}
              >
                {sym}
              </div>
            ))}
          </div>
        </div>

        {/* Wager Panel */}
        <div className={styles.wagerPanel}>
          <div>
            <h2 className={styles.title}>Trench Slots Deluxe</h2>
            <p className={styles.subtitle}>
              Pull the lever and line up high-paying symbols. Match all reels for massive jackpot multipliers.
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
              <button disabled={isSpinning} className={styles.maxBtn} onClick={() => setBetAmount(balance.toString())}>
                MAX
              </button>
            </div>

            {/* Chips Shortcuts */}
            {!isSpinning && (
              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", marginTop: "0.4rem" }}>
                <button className="casino-chip chip-white" onClick={() => handleAddChip(10)}>10</button>
                <button className="casino-chip chip-red" onClick={() => handleAddChip(50)}>50</button>
                <button className="casino-chip chip-blue" onClick={() => handleAddChip(100)}>100</button>
                <button className="casino-chip chip-purple" onClick={() => handleAddChip(500)}>500</button>
                <button className="casino-chip chip-gold" onClick={() => handleAddChip(1000)}>1k</button>
              </div>
            )}
          </div>

          {autoSpinsRemaining > 0 ? (
            <button
              className={styles.spinBtn}
              style={{ background: "var(--color-danger)", color: "#fff" }}
              onClick={handleStopAutoSpin}
            >
              Stop Auto-Spin ({autoSpinsRemaining} left)
            </button>
          ) : (
            <button
              disabled={isSpinning || !betAmount}
              className={styles.spinBtn}
              onClick={handleSpin}
            >
              {isSpinning ? "Spinning Reels..." : `Pull Lever (${betAmount || 0} $)`}
            </button>
          )}

          {/* Auto-spin quick buttons */}
          {autoSpinsRemaining === 0 && !isSpinning && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem" }}>
              <button
                className={styles.maxBtn}
                style={{ padding: "0.5rem" }}
                onClick={() => handleStartAutoSpin(10)}
              >
                Auto 10x
              </button>
              <button
                className={styles.maxBtn}
                style={{ padding: "0.5rem" }}
                onClick={() => handleStartAutoSpin(25)}
              >
                Auto 25x
              </button>
              <button
                className={styles.maxBtn}
                style={{ padding: "0.5rem" }}
                onClick={() => handleStartAutoSpin(50)}
              >
                Auto 50x
              </button>
            </div>
          )}

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
                <span className={styles.paySymbols}>Any Partial Matches</span>
                <span className={styles.payMult} style={{ color: "var(--color-success)" }}>1.5x - 8x</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GameSlots;
