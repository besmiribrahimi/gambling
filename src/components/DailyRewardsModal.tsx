"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./rewards.module.css";

const WHEEL_PRIZES = [
  { value: 100, color: "#1e293b", text: "100" },
  { value: 250, color: "#0284c7", text: "250" },
  { value: 500, color: "#059669", text: "500" },
  { value: 1000, color: "#7c3aed", text: "1,000" },
  { value: 150, color: "#334155", text: "150" },
  { value: 350, color: "#0ea5e9", text: "350" },
  { value: 750, color: "#d97706", text: "750" },
  { value: 2500, color: "#dc2626", text: "2,500 🔥" }
];

export const DailyRewardsModal: React.FC = () => {
  const {
    isDailyModalOpen,
    setIsDailyModalOpen,
    dailyStreak,
    rakebackBalance,
    claimRakeback,
    claimDailyWheel,
    lastClaimTime,
    vipTier
  } = useWallet();

  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [claimMsg, setClaimMsg] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isDailyModalOpen) return null;

  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;
  const isCooldown = lastClaimTime !== null && (now - lastClaimTime < cooldown);

  const handleSpinWheel = () => {
    if (isSpinning || isCooldown) return;

    sound.playChip();
    setIsSpinning(true);
    setClaimMsg(null);

    // Pick random prize index
    const winningIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const winningPrize = WHEEL_PRIZES[winningIndex];

    const sliceAngle = 360 / WHEEL_PRIZES.length;
    const alignAngle = 270 - (winningIndex * sliceAngle + sliceAngle / 2);
    const extraSpins = 360 * 6; // 6 rotations
    const nextRotation = wheelRotation + extraSpins + alignAngle;

    setWheelRotation(nextRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const res = claimDailyWheel(winningPrize.value);
      setClaimMsg({ text: res.message, isError: !res.success });
    }, 4500);
  };

  const handleClaimRakeback = () => {
    const res = claimRakeback();
    setClaimMsg({ text: res.message, isError: !res.success });
    setTimeout(() => setClaimMsg(null), 3000);
  };

  const radius = 130;
  const sliceAngle = 360 / WHEEL_PRIZES.length;

  const getSectorPath = (startAngle: number, endAngle: number) => {
    const x1 = radius + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = radius + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = radius + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = radius + radius * Math.sin((endAngle * Math.PI) / 180);
    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const getLabelCoords = (midAngle: number) => {
    const labelRadius = radius * 0.68;
    const x = radius + labelRadius * Math.cos((midAngle * Math.PI) / 180);
    const y = radius + labelRadius * Math.sin((midAngle * Math.PI) / 180);
    return { x, y };
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={() => setIsDailyModalOpen(false)}>
          ✕
        </button>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>🎁 Daily Lucky Wheel & VIP Vault</h2>
          <p className={styles.modalSubtitle}>
            Spin daily for free War Bonds and collect your VIP rakeback payout
          </p>
        </div>

        {claimMsg && (
          <div
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              background: claimMsg.isError ? "rgba(255,23,68,0.15)" : "rgba(0,230,118,0.15)",
              border: `1px solid ${claimMsg.isError ? "var(--color-danger)" : "var(--color-success)"}`,
              color: claimMsg.isError ? "var(--color-danger)" : "var(--color-success)",
              fontWeight: 700,
              fontSize: "0.85rem",
              textAlign: "center"
            }}
          >
            {claimMsg.text}
          </div>
        )}

        <div className={styles.gridContent}>
          {/* Left Column: Lucky Wheel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className={styles.wheelWrapper}>
              <div className={styles.wheelPointer} />
              
              <div className={styles.wheelDisk}>
                <div className={styles.centerCap}>🎡</div>
                
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? "transform 4.5s cubic-bezier(0.12, 0.8, 0.2, 1)" : "none"
                  }}
                >
                  <svg viewBox="0 0 260 260" style={{ width: "100%", height: "100%" }}>
                    {WHEEL_PRIZES.map((prize, idx) => {
                      const startAngle = idx * sliceAngle;
                      const endAngle = startAngle + sliceAngle;
                      const midAngle = startAngle + sliceAngle / 2;
                      const path = getSectorPath(startAngle, endAngle);
                      const labelPos = getLabelCoords(midAngle);

                      return (
                        <g key={idx}>
                          <path d={path} fill={prize.color} stroke="#000" strokeWidth="1" />
                          <text
                            x={labelPos.x}
                            y={labelPos.y}
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="900"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            transform={`rotate(${midAngle + 90}, ${labelPos.x}, ${labelPos.y})`}
                          >
                            {prize.text}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            <button
              className={styles.spinWheelBtn}
              onClick={handleSpinWheel}
              disabled={isSpinning || isCooldown}
            >
              {isSpinning ? "Spinning Wheel..." : isCooldown ? "Cooldown Active (24h)" : "Spin Free Wheel 🔥"}
            </button>
          </div>

          {/* Right Column: Streak & Rakeback */}
          <div className={styles.rewardsRightCol}>
            {/* 7-Day Streak Tracker */}
            <div className={styles.streakCard}>
              <div className={styles.streakTitle}>
                <span>📅 7-Day Login Streak</span>
                <span style={{ color: "#ffd700" }}>Day {dailyStreak} of 7</span>
              </div>
              <div className={styles.streakDaysGrid}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const isActive = dailyStreak >= day;
                  const bonus = (day - 1) * 10;
                  return (
                    <div
                      key={day}
                      className={`${styles.streakDay} ${isActive ? styles.streakDayActive : ""}`}
                    >
                      <span>Day {day}</span>
                      <span style={{ fontSize: "0.6rem" }}>{day === 7 ? "🔥 +60%" : `+${bonus}%`}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rakeback Vault Card */}
            <div className={styles.rakebackCard}>
              <div className={styles.rakebackHeader}>
                <span className={styles.rakebackTitle}>💎 VIP Rakeback Vault</span>
                <span style={{ fontSize: "0.75rem", color: vipTier.color, fontWeight: 800 }}>
                  {vipTier.badge} {vipTier.name} ({Math.round(vipTier.rakebackRate * 100)}%)
                </span>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Accumulated Cashback:</span>
                <div className={styles.rakebackAmount}>{rakebackBalance.toLocaleString()} $</div>
              </div>

              <button
                className={styles.claimRakebackBtn}
                onClick={handleClaimRakeback}
                disabled={rakebackBalance < 1}
              >
                Claim Rakeback to Wallet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRewardsModal;
