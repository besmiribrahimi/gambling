"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./crash.module.css";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
  vx: number;
  vy: number;
}

export const GameCrash: React.FC = () => {
  const { balance, setBalance, addTransaction } = useWallet();
  const [gameState, setGameState] = useState<"idle" | "countdown" | "flying" | "crashed">("idle");
  const [countdown, setCountdown] = useState(4);
  const [wager, setWager] = useState<string>("100");
  const [autoCashout, setAutoCashout] = useState<string>("2.00");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [history, setHistory] = useState<number[]>([1.45, 12.50, 1.05, 3.20, 2.15]);

  // Kalish Predictor States
  const [isScanningPredictor, setIsScanningPredictor] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "[sys] connection established",
    "[sys] telemetry radar online..."
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const stateRef = useRef(gameState);
  const multiplierRef = useRef(multiplier);
  const crashRef = useRef(crashPoint);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Keep refs in sync
  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);
  useEffect(() => { crashRef.current = crashPoint; }, [crashPoint]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  const startGameFlight = useCallback(() => {
    const r = Math.random();
    let point = 1.0;
    if (r >= 0.04) {
      point = parseFloat((1.01 + Math.exp(Math.random() * 3.4) / 10).toFixed(2));
      if (point > 100) point = 100;
    }
    
    setCrashPoint(point);
    setMultiplier(1.0);
    setCashedOut(false);
    setGameState("flying");
  }, []);

  // Countdown timer cycle
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "countdown") {
      setCountdown(4);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            startGameFlight();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, startGameFlight]);

  const handlePlaceBet = () => {
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
    setHasBet(true);
    setAlertMsg(null);
    setGameState("countdown");
    sound.playChip();
  };

  const handleCashOut = useCallback(() => {
    if (gameState !== "flying" || !hasBet || cashedOut) return;

    const betAmount = parseInt(wager);
    const currentMult = multiplierRef.current;
    const winAmt = Math.round(betAmount * currentMult);
    
    setBalance((prev) => prev + winAmt);
    setCashedOut(true);
    
    addTransaction(
      "crash",
      `Cashed out Crash at ${currentMult.toFixed(2)}x`,
      betAmount,
      "win",
      winAmt
    );

    setAlertMsg({ text: `Cashed Out: +${winAmt} War Bonds (${currentMult.toFixed(2)}x)!`, isError: false });
    sound.playWin();
  }, [gameState, hasBet, cashedOut, wager, setBalance, addTransaction]);

  const triggerCrash = useCallback((finalMultiplier: number) => {
    setGameState("crashed");
    setHistory((prev) => [finalMultiplier, ...prev.slice(0, 5)]);
    sound.playExplosion();

    if (hasBet && !cashedOut) {
      const betAmount = parseInt(wager);
      addTransaction(
        "crash",
        `Crashed in flight at ${finalMultiplier.toFixed(2)}x`,
        betAmount,
        "lose",
        0
      );
      setAlertMsg({ text: `Rocket Crashed at ${finalMultiplier.toFixed(2)}x!`, isError: true });
    }

    setHasBet(false);
    
    setTimeout(() => {
      setGameState("idle");
      setMultiplier(1.0);
      setAlertMsg(null);
    }, 3800);
  }, [hasBet, cashedOut, wager, addTransaction]);

  // Kalish Predictor
  const handlePredictorScan = () => {
    if (isScanningPredictor) return;
    if (balance < 10) {
      setAlertMsg({ text: "Predictor scan costs 10 War Bonds.", isError: true });
      return;
    }

    setBalance((prev) => prev - 10);
    setIsScanningPredictor(true);
    setTerminalLines((prev) => [...prev, "[scan] decrypting radar vectors... (-10 $)"]);
    sound.playClick();

    setTimeout(() => {
      setTerminalLines((prev) => [...prev, "[scan] reading multiplier gradient delta..."]);
    }, 400);

    setTimeout(() => {
      let predVal = 1.35;
      if (stateRef.current === "flying") {
        predVal = Math.max(1.05, crashRef.current - (Math.random() * 0.12 + 0.05));
      } else {
        predVal = 1.1 + Math.random() * 3.5;
      }
      
      const accuracy = Math.floor(Math.random() * 12 + 85);
      
      setTerminalLines((prev) => [
        ...prev,
        `[hack] target trajectory: ~${predVal.toFixed(2)}x`,
        `[hack] accuracy probability: ${accuracy}%`
      ]);
      setIsScanningPredictor(false);
      sound.playWin();
    }, 1200);
  };

  // Canvas Animation & Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 600;
    const height = 440;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const stars: Star[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1.5 + 0.5
    }));

    const particles: Particle[] = [];
    let flightStartTime = Date.now();
    let pulseProgress = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const state = stateRef.current;
      const scrollSpeed = state === "flying" ? Math.min(8, multiplierRef.current * 1.8) : 0.4;
      
      stars.forEach((star) => {
        star.x -= star.speed * scrollSpeed;
        if (star.x < 0) {
          star.x = width;
          star.y = Math.random() * height;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Grid Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      const xOffset = state === "flying" ? (Date.now() / 15) % gridSize : 0;
      const yOffset = state === "flying" ? (Date.now() / 25) % gridSize : 0;

      for (let x = -gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + (gridSize - xOffset), 0);
        ctx.lineTo(x + (gridSize - xOffset), height);
        ctx.stroke();
      }
      for (let y = -gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + yOffset);
        ctx.lineTo(width, y + yOffset);
        ctx.stroke();
      }

      const padding = 45;
      const graphHeight = height - padding * 2;
      const graphWidth = width - padding * 2;

      // Axis
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      if (state === "flying") {
        const now = Date.now();
        const elapsed = (now - flightStartTime) / 1000;
        const currentMultiplier = parseFloat((1.0 + Math.pow(1.08, elapsed * 2.2) - 1).toFixed(2));
        
        // Auto-cashout check
        const autoVal = parseFloat(autoCashout);
        if (hasBet && !cashedOut && !isNaN(autoVal) && autoVal > 1.0 && currentMultiplier >= autoVal) {
          handleCashOut();
        }

        if (currentMultiplier >= crashRef.current) {
          triggerCrash(crashRef.current);
        } else {
          setMultiplier(currentMultiplier);
        }

        const maxMult = Math.max(2, currentMultiplier);
        
        ctx.beginPath();
        ctx.strokeStyle = "#00f0ff";
        ctx.shadowColor = "rgba(0, 240, 255, 0.6)";
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3.5;

        const pointsCount = 40;
        let lastX = padding;
        let lastY = height - padding;
        
        ctx.moveTo(padding, height - padding);
        for (let i = 0; i <= pointsCount; i++) {
          const ratio = i / pointsCount;
          const px = padding + ratio * graphWidth * 0.82;
          const pMult = 1.0 + Math.pow(1.08, ratio * elapsed * 2.2) - 1;
          const py = (height - padding) - (pMult - 1) * (graphHeight / (maxMult - 0.4));
          
          if (px <= width - padding && py >= padding) {
            ctx.lineTo(px, py);
            lastX = px;
            lastY = py;
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Thrust rocket particles
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: lastX - 6,
            y: lastY + 6,
            size: Math.random() * 4 + 2,
            alpha: 1.0,
            color: Math.random() > 0.4 ? "#00f0ff" : "#ff007a",
            vx: -Math.random() * 4 - 2,
            vy: Math.random() * 3 - 1
          });
        }

        // Rocket Ship Icon / Dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 12 + Math.sin(pulseProgress) * 3, 0, Math.PI * 2);
        ctx.stroke();
        pulseProgress += 0.15;

      } else if (state === "crashed") {
        ctx.fillStyle = "rgba(255, 23, 68, 0.85)";
        ctx.shadowColor = "#ff1744";
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.5, 32 + Math.sin(Date.now() / 40) * 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        flightStartTime = Date.now();
        const startX = padding;
        const startY = height - padding;
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(startX, startY, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;
        
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, autoCashout, hasBet, cashedOut, handleCashOut, triggerCrash]);

  const handleQuickWager = (mult: number) => {
    const val = parseInt(wager);
    if (!isNaN(val)) {
      setWager(Math.max(1, Math.round(val * mult)).toString());
    }
  };

  return (
    <div className={styles.container}>
      {/* Flight Canvas Viewport */}
      <div className={styles.gameView}>
        <div className={styles.crashHistory}>
          {history.map((val, idx) => (
            <span
              key={idx}
              className={`${styles.historyBadge} ${
                val < 1.5 
                  ? styles.lowMultiplier 
                  : val < 5.0 
                  ? styles.midMultiplier 
                  : styles.highMultiplier
              }`}
            >
              {val.toFixed(2)}x
            </span>
          ))}
        </div>

        <canvas ref={canvasRef} className={styles.canvas} />

        <div className={styles.overlay}>
          {gameState === "countdown" && (
            <>
              <div style={{ fontSize: "5rem", fontFamily: "var(--font-family-title)", fontWeight: 900, color: "var(--color-warning)", animation: "blinkFast 0.8s infinite" }}>
                {countdown}
              </div>
              <span className={styles.statusLabel}>🚀 INITIALIZING ROCKET LAUNCH</span>
            </>
          )}

          {gameState === "flying" && (
            <>
              <div className={`${styles.multiplierText} ${multiplier > 3.0 ? "blink-fast" : ""}`}>
                {multiplier.toFixed(2)}x
              </div>
              <span className={styles.statusLabel}>ASCENDING TO STRATOSPHERE...</span>
            </>
          )}

          {gameState === "crashed" && (
            <>
              <div className={`${styles.multiplierText} ${styles.crashedText}`}>
                {multiplier.toFixed(2)}x
              </div>
              <span className={styles.statusLabel} style={{ color: "var(--color-danger)" }}>💥 SHIP DETONATED</span>
            </>
          )}

          {gameState === "idle" && (
            <>
              <div className={styles.multiplierText} style={{ color: "var(--color-text-muted)" }}>
                1.00x
              </div>
              <span className={styles.statusLabel}>Place stake to launch rocket</span>
            </>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className={styles.controlPanel}>
        <div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Wager Amount</label>
            <div className={styles.wagerBox}>
              <span style={{ color: "var(--color-text-muted)", marginRight: "0.5rem", fontWeight: "700" }}>$</span>
              <input
                id="input-crash-wager"
                type="number"
                className={styles.wagerInput}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                disabled={gameState !== "idle"}
              />
            </div>
            
            <div className={styles.quickWagerRow}>
              <button className={styles.quickBtn} onClick={() => handleQuickWager(0.5)} disabled={gameState !== "idle"}>1/2</button>
              <button className={styles.quickBtn} onClick={() => handleQuickWager(2)} disabled={gameState !== "idle"}>2x</button>
              <button className={styles.quickBtn} onClick={() => setWager(balance.toString())} disabled={gameState !== "idle"}>MAX</button>
              <button className={styles.quickBtn} onClick={() => setWager("100")} disabled={gameState !== "idle"}>MIN</button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Auto Cashout Multiplier</label>
            <div className={styles.wagerBox}>
              <span style={{ color: "var(--color-primary)", marginRight: "0.5rem", fontWeight: "800" }}>x</span>
              <input
                type="number"
                step="0.1"
                className={styles.wagerInput}
                value={autoCashout}
                onChange={(e) => setAutoCashout(e.target.value)}
                disabled={gameState !== "idle"}
                placeholder="2.00"
              />
            </div>
          </div>

          <div className={styles.gameStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Current Stake:</span>
              <span className={styles.statValue}>{hasBet ? wager : 0} War Bonds</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Multiplier:</span>
              <span className={styles.statValue} style={{ color: "var(--color-primary)" }}>{multiplier.toFixed(2)}x</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Est. Return:</span>
              <span className={styles.statValue} style={{ color: "var(--color-success)" }}>
                {hasBet ? Math.round(parseInt(wager) * multiplier) : 0} War Bonds
              </span>
            </div>
          </div>

          {alertMsg && (
            <div className={`${styles.alert} ${alertMsg.isError ? styles.alertDanger : styles.alertSuccess}`}>
              {alertMsg.text}
            </div>
          )}

          {/* Kalish Predictor Console */}
          <div className={`${styles.predictorSection} ${isScanningPredictor ? styles.predictorActive : ""}`}>
            <div className={styles.predictorHeader}>
              <span className={styles.predictorTitle}>
                🕵️‍♂️ KALISH PREDICTOR v3.2
              </span>
              <span 
                className="blink-fast" 
                style={{ 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  backgroundColor: isScanningPredictor ? "#00ff6e" : "var(--color-danger)" 
                }} 
              />
            </div>
            
            <div className={styles.terminalWindow}>
              {terminalLines.map((line, idx) => (
                <div key={idx} className={styles.terminalLine}>{line}</div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <button
              id="btn-crash-scan-predictor"
              className={styles.predictBtn}
              onClick={handlePredictorScan}
              disabled={isScanningPredictor}
            >
              {isScanningPredictor ? "Scanning Entropy..." : "Scan Signal (10 $)"}
            </button>
          </div>
        </div>

        <div>
          {gameState === "idle" && (
            <button id="btn-crash-place-bet" className={`${styles.actionBtn} ${styles.placeBet}`} onClick={handlePlaceBet}>
              Launch Rocket (${wager || 0})
            </button>
          )}

          {gameState === "countdown" && (
            <button className={`${styles.actionBtn} ${styles.waitingState}`} disabled>
              Launch in {countdown}s...
            </button>
          )}

          {gameState === "flying" && (
            hasBet && !cashedOut ? (
              <button id="btn-crash-cashout" className={`${styles.actionBtn} ${styles.cashOut}`} onClick={handleCashOut}>
                Cash Out (+{Math.round(parseInt(wager) * multiplier)} $)
              </button>
            ) : cashedOut ? (
              <button className={`${styles.actionBtn} ${styles.cashedOutState}`} disabled>
                Cashed Out!
              </button>
            ) : (
              <button className={`${styles.actionBtn} ${styles.waitingState}`} disabled>
                Observing Flight
              </button>
            )
          )}

          {gameState === "crashed" && (
            <button className={`${styles.actionBtn} ${styles.waitingState}`} disabled>
              Crashed at {multiplier.toFixed(2)}x
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCrash;
