"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./roulette.module.css";

interface RouletteSlot {
  index: number;
  color: "red" | "black" | "gold";
  label: string;
}

const ROULETTE_SLOTS: RouletteSlot[] = [
  { index: 0, color: "gold", label: "0" },
  { index: 1, color: "red", label: "1" },
  { index: 2, color: "black", label: "2" },
  { index: 3, color: "red", label: "3" },
  { index: 4, color: "black", label: "4" },
  { index: 5, color: "red", label: "5" },
  { index: 6, color: "black", label: "6" },
  { index: 7, color: "red", label: "7" },
  { index: 8, color: "black", label: "8" },
  { index: 9, color: "red", label: "9" },
  { index: 10, color: "black", label: "10" },
  { index: 11, color: "red", label: "11" },
  { index: 12, color: "black", label: "12" },
  { index: 13, color: "red", label: "13" },
  { index: 14, color: "black", label: "14" }
];

export const GameRoulette: React.FC = () => {
  const { balance, setBalance, addTransaction } = useWallet();
  const [selectedColor, setSelectedColor] = useState<"red" | "black" | "gold" | null>(null);
  const [wager, setWager] = useState("100");
  const [isSpinning, setIsSpinning] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [flashWin, setFlashWin] = useState(false);
  const [history, setHistory] = useState<Array<"red" | "black" | "gold">>([
    "red",
    "black",
    "red",
    "black",
    "gold"
  ]);

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const handleWagerChange = (val: string) => {
    setWager(val);
  };

  const handleMaxWager = () => {
    setWager(balance.toString());
  };

  const handleAddChip = (chipValue: number) => {
    const current = parseInt(wager || "0");
    const nextVal = isNaN(current) ? chipValue : current + chipValue;
    const cappedVal = Math.min(nextVal, balance);
    setWager(cappedVal.toString());
    sound.playChip();
  };

  const handleSpinWheel = () => {
    if (isSpinning) return;

    if (!selectedColor) {
      setAlertMsg({ text: "Select RED, BLACK, or GOLD to place your bet.", isError: true });
      return;
    }

    const betAmount = parseInt(wager);
    if (isNaN(betAmount) || betAmount <= 0) {
      setAlertMsg({ text: "Please enter a valid bet amount.", isError: true });
      return;
    }

    if (balance < betAmount) {
      setAlertMsg({ text: "Insufficient War Bonds balance.", isError: true });
      return;
    }

    setBalance((prev) => prev - betAmount);
    setIsSpinning(true);
    setAlertMsg(null);
    sound.playChip();

    const winningIndex = Math.floor(Math.random() * ROULETTE_SLOTS.length);
    const winningSlot = ROULETTE_SLOTS[winningIndex];

    const sliceAngle = 360 / ROULETTE_SLOTS.length;
    const alignAngle = 270 - (winningIndex * sliceAngle + sliceAngle / 2);
    
    const extraSpins = 360 * 6; // 6 full rotations
    const currentBaseSpins = Math.floor(wheelRotation / 360) * 360;
    const nextRotation = currentBaseSpins + extraSpins + alignAngle;

    setWheelRotation(nextRotation);

    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      
      const didWin = winningSlot.color === selectedColor;
      let multiplier = 2;
      if (winningSlot.color === "gold") multiplier = 14;

      const payout = didWin ? betAmount * multiplier : 0;

      if (didWin) {
        setFlashWin(true);
        setTimeout(() => setFlashWin(false), 2000);
        setBalance((prev) => prev + payout);
        sound.playWin();

        setAlertMsg({
          text: `Victory! Landed on ${winningSlot.color.toUpperCase()} (${winningSlot.label})! Won +${payout} War Bonds!`,
          isError: false
        });
        addTransaction(
          "bet",
          `Won Roulette: bet on ${selectedColor.toUpperCase()} (Landed: ${winningSlot.color.toUpperCase()} ${winningSlot.label})`,
          betAmount,
          "win",
          payout
        );
      } else {
        setAlertMsg({
          text: `Landed on ${winningSlot.color.toUpperCase()} (${winningSlot.label}). Lost ${betAmount} War Bonds.`,
          isError: true
        });
        addTransaction(
          "bet",
          `Lost Roulette: bet on ${selectedColor.toUpperCase()} (Landed: ${winningSlot.color.toUpperCase()} ${winningSlot.label})`,
          betAmount,
          "lose",
          0
        );
      }

      setHistory((prev) => [winningSlot.color, ...prev.slice(0, 9)]);
    }, 4600);
  };

  const radius = 150;
  const sliceAngle = 360 / ROULETTE_SLOTS.length;

  const getSectorPath = (startAngle: number, endAngle: number) => {
    const x1 = radius + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = radius + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = radius + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = radius + radius * Math.sin((endAngle * Math.PI) / 180);
    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const getLabelCoords = (midAngle: number) => {
    const labelRadius = radius * 0.72;
    const x = radius + labelRadius * Math.cos((midAngle * Math.PI) / 180);
    const y = radius + labelRadius * Math.sin((midAngle * Math.PI) / 180);
    return { x, y };
  };

  const getFillColor = (color: string) => {
    if (color === "red") return "#ff2e2e";
    if (color === "black") return "#1b1d26";
    return "#ffd700";
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameLayout}>
        
        {/* Wheel Arena Section */}
        <div className={`${styles.wheelArena} ${flashWin ? "flashWinner" : ""}`}>
          <div className={styles.wheelPointer} />
          
          <div className={styles.wheelOuterCasing}>
            <div className={styles.wheelCenterCap}>CW</div>
            
            <div 
              className={styles.wheelInner}
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: isSpinning ? "transform 4.5s cubic-bezier(0.12, 0.8, 0.22, 1)" : "none"
              }}
            >
              <svg className={styles.wheelGraphic} viewBox="0 0 300 300">
                {ROULETTE_SLOTS.map((slot) => {
                  const startAngle = slot.index * sliceAngle;
                  const endAngle = startAngle + sliceAngle;
                  const midAngle = startAngle + sliceAngle / 2;
                  const path = getSectorPath(startAngle, endAngle);
                  const labelPos = getLabelCoords(midAngle);
                  const fill = getFillColor(slot.color);

                  return (
                    <g key={slot.index}>
                      <path d={path} fill={fill} stroke="#000" strokeWidth="0.8" />
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="900"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        transform={`rotate(${midAngle + 90}, ${labelPos.x}, ${labelPos.y})`}
                      >
                        {slot.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Wager Dashboard Section */}
        <div className={styles.wagerPanel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>Trench Roulette Wheel</h2>
            <p className={styles.subtitle}>
              Place your War Bonds on Red (2x), Black (2x), or Gold (14x). Spin to conquer the battlefield.
            </p>
          </div>

          {/* Color card selectors */}
          <div className={styles.betBoard}>
            <button
              disabled={isSpinning}
              onClick={() => { setSelectedColor("red"); sound.playClick(); }}
              className={`${styles.betOption} ${styles.betOptionRed} ${
                selectedColor === "red" ? styles.betOptionRedActive : ""
              }`}
            >
              <span className={`${styles.colorLabel} ${styles.redText}`}>Red</span>
              <span className={styles.payoutBadge}>2x Return</span>
            </button>

            <button
              disabled={isSpinning}
              onClick={() => { setSelectedColor("black"); sound.playClick(); }}
              className={`${styles.betOption} ${styles.betOptionBlack} ${
                selectedColor === "black" ? styles.betOptionBlackActive : ""
              }`}
            >
              <span className={`${styles.colorLabel} ${styles.blackText}`}>Black</span>
              <span className={styles.payoutBadge}>2x Return</span>
            </button>

            <button
              disabled={isSpinning}
              onClick={() => { setSelectedColor("gold"); sound.playClick(); }}
              className={`${styles.betOption} ${styles.betOptionGold} ${
                selectedColor === "gold" ? styles.betOptionGoldActive : ""
              }`}
            >
              <span className={`${styles.colorLabel} ${styles.goldText}`}>Gold</span>
              <span className={styles.payoutBadge}>14x Return</span>
            </button>
          </div>

          {/* Input wagers controls panel */}
          <div className={styles.wagerPanelInner}>
            <div className={styles.inputHeader}>
              <span className={styles.inputLabel}>Stake Amount</span>
            </div>

            <div className={styles.wagerInputRow}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginRight: "0.4rem", fontWeight: "700" }}>$</span>
              <input
                disabled={isSpinning}
                type="number"
                className={styles.wagerInput}
                placeholder="Enter War Bonds wager..."
                value={wager}
                onChange={(e) => handleWagerChange(e.target.value)}
              />
              <button disabled={isSpinning} className={styles.maxBtn} onClick={handleMaxWager}>
                MAX
              </button>
            </div>

            {/* Casino chips shortcuts */}
            <div className={styles.chipRow}>
              <button
                disabled={isSpinning}
                className="casino-chip chip-white"
                onClick={() => handleAddChip(10)}
              >
                10
              </button>
              <button
                disabled={isSpinning}
                className="casino-chip chip-red"
                onClick={() => handleAddChip(50)}
              >
                50
              </button>
              <button
                disabled={isSpinning}
                className="casino-chip chip-blue"
                onClick={() => handleAddChip(100)}
              >
                100
              </button>
              <button
                disabled={isSpinning}
                className="casino-chip chip-purple"
                onClick={() => handleAddChip(500)}
              >
                500
              </button>
              <button
                disabled={isSpinning}
                className="casino-chip chip-gold"
                onClick={() => handleAddChip(1000)}
              >
                1k
              </button>
            </div>
          </div>

          <button
            disabled={isSpinning || !selectedColor || !wager}
            className={styles.spinBtn}
            onClick={handleSpinWheel}
          >
            {isSpinning ? "Wheel Spinning..." : `Spin Wheel (${wager || 0} $)`}
          </button>

          {/* Feedback alert box */}
          {alertMsg && (
            <div
              className={`${styles.alertBox} ${
                alertMsg.isError ? styles.errorAlert : styles.successAlert
              }`}
            >
              {alertMsg.text}
            </div>
          )}

          {/* Landing colors history log */}
          <div className={styles.historySection}>
            <span className={styles.historyTitle}>Recent Results</span>
            <div className={styles.historyTrack}>
              {history.map((col, idx) => (
                <div
                  key={idx}
                  className={`${styles.historyNode} ${
                    col === "red"
                      ? styles.historyRed
                      : col === "black"
                      ? styles.historyBlack
                      : styles.historyGold
                  }`}
                >
                  {col === "gold" ? "G" : col === "red" ? "R" : "B"}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GameRoulette;
