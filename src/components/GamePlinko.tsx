"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./plinko.module.css";

type RiskLevel = "low" | "medium" | "high";

// Multipliers for different row counts & risk profiles (CS:GO / Stake style)
const MULTIPLIERS_TABLE: Record<number, Record<RiskLevel, number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
  },
  10: {
    low: [8.9, 3, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3, 8.9],
    medium: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    high: [76, 10, 3, 0.9, 0.2, 0.2, 0.2, 0.9, 3, 10, 76]
  },
  12: {
    low: [16, 6, 2, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 2, 6, 16],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
  },
  14: {
    low: [28, 9, 3.5, 1.8, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.8, 3.5, 9, 28],
    medium: [58, 15, 7, 4, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4, 7, 15, 58],
    high: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420]
  },
  16: {
    low: [43, 13, 6, 3, 1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5, 3, 6, 13, 43],
    medium: [110, 41, 10, 5, 3, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
  }
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  wager: number;
  color: string;
  settled: boolean;
  historyIndex?: number;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  pulseTimer: number;
}

export const GamePlinko: React.FC = () => {
  const { balance, setBalance, addTransaction } = useWallet();
  const [rows, setRows] = useState<number>(10);
  const [risk, setRisk] = useState<RiskLevel>("medium");
  const [wager, setWager] = useState<string>("50");
  const [history, setHistory] = useState<Array<{ mult: number; isWin: boolean }>>([
    { mult: 2.0, isWin: true },
    { mult: 0.6, isWin: false },
    { mult: 5.0, isWin: true },
    { mult: 1.4, isWin: true }
  ]);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const multipliers = MULTIPLIERS_TABLE[rows][risk];

  // Bucket color scale based on multiplier
  const getBucketColor = (mult: number) => {
    if (mult >= 50) return "#ff007a";
    if (mult >= 10) return "#ffaa00";
    if (mult >= 2) return "#00e676";
    if (mult >= 1) return "#00f0ff";
    return "#334155";
  };

  // Build peg triangle layout
  const initPegs = useCallback((width: number, height: number, numRows: number) => {
    const pegs: Peg[] = [];
    const topPadding = 45;
    const bottomPadding = 60;
    const availableHeight = height - topPadding - bottomPadding;
    const rowSpacing = availableHeight / numRows;

    for (let r = 0; r <= numRows; r++) {
      const pegsInRow = r + 3; // Starts with 3 pegs at row 0
      const rowWidth = (pegsInRow - 1) * rowSpacing * 0.95;
      const startX = (width - rowWidth) / 2;
      const y = topPadding + r * rowSpacing;

      for (let c = 0; c < pegsInRow; c++) {
        const x = startX + c * (rowSpacing * 0.95);
        pegs.push({
          x,
          y,
          radius: 3.5,
          active: false,
          pulseTimer: 0
        });
      }
    }
    pegsRef.current = pegs;
  }, []);

  // Handle Canvas Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 600;
    const height = 420;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    initPegs(width, height, rows);

    const gravity = 0.22;
    const bounceFactor = 0.58;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background ambient grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Pegs
      pegsRef.current.forEach((peg) => {
        if (peg.pulseTimer > 0) {
          peg.pulseTimer -= 0.05;
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, peg.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 240, 255, 0.35)";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = peg.pulseTimer > 0 ? "#00f0ff" : "rgba(255, 255, 255, 0.65)";
        ctx.shadowColor = peg.pulseTimer > 0 ? "#00f0ff" : "transparent";
        ctx.shadowBlur = peg.pulseTimer > 0 ? 8 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Update & Draw Balls
      const currentMultipliers = MULTIPLIERS_TABLE[rows][risk];
      const bottomY = height - 40;

      for (let i = ballsRef.current.length - 1; i >= 0; i--) {
        const ball = ballsRef.current[i];
        ball.vy += gravity;
        ball.vx *= 0.99; // air resistance
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Peg Collision Check
        pegsRef.current.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < ball.radius + peg.radius) {
            // Collision normal
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate overlapping
            const overlap = ball.radius + peg.radius - dist;
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Reflect velocity with bounce
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 2 * dot * nx) * bounceFactor + (Math.random() - 0.5) * 1.2;
            ball.vy = (ball.vy - 2 * dot * ny) * bounceFactor;

            peg.pulseTimer = 1.0;
            sound.playPlinkoPeg();

            // Spawn bounce sparks
            for (let k = 0; k < 3; k++) {
              particlesRef.current.push({
                x: peg.x,
                y: peg.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                radius: Math.random() * 2 + 1,
                color: "#00f0ff",
                alpha: 1.0
              });
            }
          }
        });

        // Bottom Landing Check
        if (ball.y >= bottomY && !ball.settled) {
          ball.settled = true;

          // Determine which bucket index was hit
          const numBuckets = currentMultipliers.length;
          const leftEdge = 40;
          const rightEdge = width - 40;
          const bucketWidth = (rightEdge - leftEdge) / numBuckets;

          let bucketIndex = Math.floor((ball.x - leftEdge) / bucketWidth);
          bucketIndex = Math.max(0, Math.min(numBuckets - 1, bucketIndex));

          const landedMultiplier = currentMultipliers[bucketIndex];
          const payout = Math.round(ball.wager * landedMultiplier);
          const isWin = landedMultiplier >= 1.0;

          // Trigger bucket animation and sounds
          setActiveBucket(bucketIndex);
          setTimeout(() => setActiveBucket(null), 300);

          sound.playPlinkoBucket(landedMultiplier >= 5.0);

          if (payout > 0) {
            setBalance((prev) => prev + payout);
          }

          addTransaction(
            "plinko",
            `Plinko (${rows} rows, ${risk} risk) landed ${landedMultiplier}x`,
            ball.wager,
            isWin ? "win" : "lose",
            payout
          );

          setHistory((prev) => [{ mult: landedMultiplier, isWin }, ...prev.slice(0, 7)]);

          // Remove settled ball
          ballsRef.current.splice(i, 1);
          continue;
        }

        // Draw Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [rows, risk, setBalance, addTransaction, initPegs]);

  // Drop Ball Action
  const handleDropBall = (count = 1) => {
    const betAmount = parseInt(wager);
    if (isNaN(betAmount) || betAmount <= 0) {
      setAlertMsg({ text: "Enter a valid wager amount.", isError: true });
      return;
    }

    const totalCost = betAmount * count;
    if (balance < totalCost) {
      setAlertMsg({ text: `Insufficient War Bonds for ${count} ball(s).`, isError: true });
      return;
    }

    setBalance((prev) => prev - totalCost);
    setAlertMsg(null);

    const colors = ["#ff007a", "#00f0ff", "#ffd700", "#bd00ff", "#00e676"];

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const randomX = 300 + (Math.random() - 0.5) * 16;
        ballsRef.current.push({
          id: Math.random().toString(),
          x: randomX,
          y: 20,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 0.5,
          radius: 5.5,
          wager: betAmount,
          color: colors[Math.floor(Math.random() * colors.length)],
          settled: false
        });
        sound.playChip();
      }, i * 160);
    }
  };

  const handleQuickWager = (multiplier: number) => {
    const val = parseInt(wager);
    if (!isNaN(val)) {
      setWager(Math.max(1, Math.round(val * multiplier)).toString());
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameLayout}>
        
        {/* Canvas & Multipliers Arena */}
        <div className={styles.canvasWrapper}>
          <canvas ref={canvasRef} className={styles.canvas} />

          {/* Bottom Landing Buckets Display */}
          <div className={styles.bucketsRow}>
            {multipliers.map((m, idx) => {
              const bg = getBucketColor(m);
              const isActive = activeBucket === idx;

              return (
                <div
                  key={idx}
                  className={`${styles.bucket} ${isActive ? styles.bucketActive : ""}`}
                  style={{
                    background: bg,
                    color: m < 1 ? "#94a3b8" : "#ffffff",
                    border: isActive ? "1px solid #fff" : "none"
                  }}
                >
                  {m}x
                </div>
              );
            })}
          </div>
        </div>

        {/* Control & Stake Panel */}
        <div className={styles.wagerPanel}>
          <div>
            <h2 className={styles.title}>
              <span>🟢</span> Trench Plinko
            </h2>
            <p className={styles.subtitle}>
              Release balls through the peg pyramid and multiply your stake on target landing zones.
            </p>
          </div>

          {/* Wager Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Stake Wager</label>
            <div className={styles.wagerBox}>
              <span style={{ color: "var(--color-text-muted)", marginRight: "0.5rem", fontWeight: "700" }}>$</span>
              <input
                type="number"
                className={styles.wagerInput}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                min="1"
              />
            </div>
            
            <div className={styles.quickWagerRow}>
              <button className={styles.quickBtn} onClick={() => handleQuickWager(0.5)}>1/2</button>
              <button className={styles.quickBtn} onClick={() => handleQuickWager(2)}>2x</button>
              <button className={styles.quickBtn} onClick={() => setWager(balance.toString())}>MAX</button>
              <button className={styles.quickBtn} onClick={() => setWager("50")}>MIN</button>
            </div>
          </div>

          {/* Risk Selector */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Risk Profile</label>
            <div className={styles.selectorRow}>
              {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
                <button
                  key={r}
                  className={`${styles.selectBtn} ${risk === r ? styles.selectBtnActive : ""}`}
                  onClick={() => setRisk(r)}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Rows Selector */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Pyramid Rows ({rows})</label>
            <div className={styles.selectorRow}>
              {[8, 10, 12, 14, 16].map((num) => (
                <button
                  key={num}
                  className={`${styles.selectBtn} ${rows === num ? styles.selectBtnActive : ""}`}
                  onClick={() => setRows(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Drop Actions */}
          <button
            className={styles.dropBtn}
            onClick={() => handleDropBall(1)}
          >
            <span>🎯</span> Drop Ball (${wager || 0})
          </button>

          <div className={styles.multiDropRow}>
            <button className={styles.multiBtn} onClick={() => handleDropBall(3)}>Drop 3x</button>
            <button className={styles.multiBtn} onClick={() => handleDropBall(5)}>Drop 5x</button>
            <button className={styles.multiBtn} onClick={() => handleDropBall(10)}>Drop 10x 🔥</button>
          </div>

          {/* Feedback message */}
          {alertMsg && (
            <div className={`${styles.alert} ${alertMsg.isError ? styles.alertDanger : styles.alertSuccess}`}>
              {alertMsg.text}
            </div>
          )}

          {/* Recent Multipliers History */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Recent Multipliers</label>
            <div className={styles.historyRow}>
              {history.map((h, idx) => (
                <span
                  key={idx}
                  className={styles.historyBadge}
                  style={{
                    background: h.mult >= 2.0 ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    color: h.mult >= 2.0 ? "var(--color-success)" : "var(--color-text-secondary)",
                    border: `1px solid ${h.mult >= 2.0 ? "rgba(0, 230, 118, 0.3)" : "rgba(255, 255, 255, 0.08)"}`
                  }}
                >
                  {h.mult}x
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GamePlinko;
