"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWallet } from "../context/WalletContext";
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
  const [countdown, setCountdown] = useState(5);
  const [wager, setWager] = useState<string>("100");
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
    "[sys] listening to game entropy..."
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const stateRef = useRef(gameState);
  const multiplierRef = useRef(multiplier);
  const crashRef = useRef(crashPoint);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Sync refs to avoid stale closures in animation frame
  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);
  useEffect(() => { crashRef.current = crashPoint; }, [crashPoint]);

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  // Handle game loop timer transitions
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "countdown") {
      setCountdown(5);
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
  }, [gameState]);

  const startGameFlight = () => {
    const r = Math.random();
    let point = 1.0;
    if (r >= 0.05) {
      point = parseFloat((1.01 + Math.exp(Math.random() * 3.5) / 10).toFixed(2));
      if (point > 100) point = 100;
    }
    
    setCrashPoint(point);
    setMultiplier(1.0);
    setCashedOut(false);
    setGameState("flying");
  };

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

    setBalance(balance - betAmount);
    setHasBet(true);
    setAlertMsg(null);
    setGameState("countdown");
  };

  const handleCashOut = () => {
    if (gameState !== "flying" || !hasBet || cashedOut) return;

    const betAmount = parseInt(wager);
    const winAmt = Math.round(betAmount * multiplierRef.current);
    
    setBalance(balance + winAmt);
    setCashedOut(true);
    
    addTransaction(
      "crash",
      `Cashed out Crash at ${multiplierRef.current.toFixed(2)}x`,
      betAmount,
      "win",
      winAmt
    );

    setAlertMsg({ text: `Successfully Cashed Out: +${winAmt} War Bonds!`, isError: false });
  };

  const triggerCrash = (finalMultiplier: number) => {
    setGameState("crashed");
    setHistory((prev) => [finalMultiplier, ...prev.slice(0, 4)]);

    if (hasBet && !cashedOut) {
      const betAmount = parseInt(wager);
      addTransaction(
        "crash",
        `Crashed in game at ${finalMultiplier.toFixed(2)}x`,
        betAmount,
        "lose",
        0
      );
      setAlertMsg({ text: `Crashed! Lost ${betAmount} War Bonds`, isError: true });
    }

    setHasBet(false);
    
    setTimeout(() => {
      setGameState("idle");
      setMultiplier(1.0);
      setAlertMsg(null);
    }, 4000);
  };

  // Kalish Predictor Run exploit
  const handlePredictorScan = () => {
    if (isScanningPredictor) return;
    if (balance < 10) {
      setAlertMsg({ text: "Predictor scan costs 10 War Bonds.", isError: true });
      return;
    }

    // Deduct scan fee
    setBalance((prev) => prev - 10);
    setIsScanningPredictor(true);
    setTerminalLines((prev) => [...prev, "[scan] initiating quantum scan... (-10 $)"]);

    // Sequence printing steps
    setTimeout(() => {
      setTerminalLines((prev) => [...prev, "[scan] reading flight entropy vectors..."]);
    }, 4000/10);

    setTimeout(() => {
      setTerminalLines((prev) => [...prev, "[scan] scanning multiplier gradient delta..."]);
    }, 8000/10);

    setTimeout(() => {
      setTerminalLines((prev) => [...prev, "[scan] calculating crash coefficient..."]);
    }, 12000/10);

    setTimeout(() => {
      // Determine prediction
      let predVal = 1.25;
      if (stateRef.current === "flying") {
        // Read actual crashRef but suggest cashout slightly lower to guarantee win
        predVal = Math.max(1.05, crashRef.current - (Math.random() * 0.15 + 0.05));
      } else {
        // Static mock prediction if idle
        predVal = 1.1 + Math.random() * 3.5;
      }
      
      const accuracy = Math.floor(Math.random() * 15 + 80); // 80% to 95% mock accuracy
      
      setTerminalLines((prev) => [
        ...prev,
        `[hack] target acquired: ~${predVal.toFixed(2)}x`,
        `[hack] accuracy probability: ${accuracy}%`
      ]);
      setIsScanningPredictor(false);
    }, 16000/10);
  };

  // Canvas Animation & Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const stars: Star[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2,
      speed: Math.random() * 1.5 + 0.5
    }));

    const particles: Particle[] = [];
    let flightStartTime = Date.now();
    let pulseProgress = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const spaceGrad = ctx.createLinearGradient(0, 0, 0, height);
      spaceGrad.addColorStop(0, "#060913");
      spaceGrad.addColorStop(1, "#0d1326");
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, width, height);

      const state = stateRef.current;

      const scrollSpeed = state === "flying" ? Math.min(10, multiplierRef.current * 2) : 0.5;
      stars.forEach((star) => {
        star.x -= star.speed * scrollSpeed;
        if (star.x < 0) {
          star.x = width;
          star.y = Math.random() * height;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

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

      const padding = 50;
      const graphHeight = height - padding * 2;
      const graphWidth = width - padding * 2;

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
        
        if (currentMultiplier >= crashRef.current) {
          triggerCrash(crashRef.current);
        } else {
          setMultiplier(currentMultiplier);
        }

        const maxMult = Math.max(2, currentMultiplier);
        
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
        ctx.shadowColor = "rgba(0, 240, 255, 0.5)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3;

        const pointsCount = 40;
        let lastX = padding;
        let lastY = height - padding;
        
        ctx.moveTo(padding, height - padding);
        for (let i = 0; i <= pointsCount; i++) {
          const ratio = i / pointsCount;
          const px = padding + ratio * graphWidth * 0.8;
          const pMult = 1.0 + Math.pow(1.08, ratio * elapsed * 2.2) - 1;
          const py = (height - padding) - (pMult - 1) * (graphHeight / (maxMult - 0.5));
          
          if (px <= width - padding && py >= padding) {
            ctx.lineTo(px, py);
            lastX = px;
            lastY = py;
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let i = 0; i < 3; i++) {
          particles.push({
            x: lastX - 5,
            y: lastY + 5,
            size: Math.random() * 4 + 2,
            alpha: 1.0,
            color: Math.random() > 0.5 ? "rgba(0, 240, 255, 0.8)" : "rgba(189, 0, 255, 0.8)",
            vx: -Math.random() * 4 - 2,
            vy: Math.random() * 2 - 1 + Math.random() * 2
          });
        }

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 14 + Math.sin(pulseProgress) * 2, 0, Math.PI * 2);
        ctx.stroke();
        pulseProgress += 0.15;

      } else if (state === "crashed") {
        ctx.fillStyle = "rgba(255, 23, 68, 0.8)";
        ctx.shadowColor = "rgba(255, 23, 68, 0.6)";
        ctx.shadowBlur = 30;
        
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.5, 30 + Math.sin(Date.now() / 50) * 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else {
        flightStartTime = Date.now();
        const startX = padding;
        const startY = height - padding;

        for (let i = 0; i < 1; i++) {
          particles.push({
            x: startX,
            y: startY + 6,
            size: Math.random() * 3 + 1,
            alpha: 0.8,
            color: "rgba(255, 170, 0, 0.8)",
            vx: -Math.random() * 1 - 0.5,
            vy: Math.random() * 2 + 1
          });
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(startX, startY, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        
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
  }, [gameState]);

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
      {/* Flight Viewport */}
      <div className={`${styles.gameView} ${gameState === "flying" && multiplier > 3.0 ? "blink-slow" : ""}`} style={gameState === "flying" && multiplier > 3.0 ? { border: "1.5px solid var(--color-danger)" } : {}}>
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
              <span className={styles.statusLabel}>🚀 INITIALIZING BOOSTER</span>
            </>
          )}

          {gameState === "flying" && (
            <>
              <div className={`${styles.multiplierText} ${multiplier > 3.0 ? "blink-fast" : ""}`}>
                {multiplier.toFixed(2)}x
              </div>
              <span className={styles.statusLabel}>RISING...</span>
            </>
          )}

          {gameState === "crashed" && (
            <>
              <div className={`${styles.multiplierText} ${styles.crashedText}`}>
                {multiplier.toFixed(2)}x
              </div>
              <span className={styles.statusLabel} style={{ color: "var(--color-danger)", animation: "blinkFast 0.4s infinite" }}>💥 ROCKET CRASHED</span>
            </>
          )}

          {gameState === "idle" && (
            <>
              <div className={styles.multiplierText} style={{ color: "var(--color-text-secondary)" }}>
                1.00x
              </div>
              <span className={styles.statusLabel}>Place bet to launch</span>
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
                disabled={gameState !== "idle" && gameState !== "countdown"}
              />
            </div>
            
            <div className={styles.quickWagerRow}>
              <button id="btn-crash-quick-half" className={styles.quickBtn} onClick={handleHalfWager} disabled={gameState !== "idle"}>1/2</button>
              <button id="btn-crash-quick-double" className={styles.quickBtn} onClick={handleDoubleWager} disabled={gameState !== "idle"}>2x</button>
              <button id="btn-crash-quick-max" className={styles.quickBtn} onClick={handleMaxWager} disabled={gameState !== "idle"}>MAX</button>
              <button id="btn-crash-quick-min" className={styles.quickBtn} onClick={() => setWager("100")} disabled={gameState !== "idle"}>MIN</button>
            </div>
          </div>

          <div className={styles.gameStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Current Wager:</span>
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
              <span className={`${styles.predictorTitle} ${isScanningPredictor ? "blink-fast" : ""}`}>
                🕵️‍♂️ KALISH PREDICTOR v3.1
              </span>
              <span 
                className="blink-fast" 
                style={{ 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  backgroundColor: isScanningPredictor ? "var(--color-success)" : "var(--color-danger)" 
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
              {isScanningPredictor ? "Decrypting Entropy..." : "Scan Signal (10 $)"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {gameState === "idle" && (
            <button id="btn-crash-place-bet" className={`${styles.actionBtn} ${styles.placeBet}`} onClick={handlePlaceBet}>
              Place Bet
            </button>
          )}

          {gameState === "countdown" && (
            <button className={`${styles.actionBtn} ${styles.waitingState}`} disabled>
              Waiting for Launch ({countdown}s)
            </button>
          )}

          {gameState === "flying" && (
            hasBet && !cashedOut ? (
              <button id="btn-crash-cashout" className={`${styles.actionBtn} ${styles.cashOut}`} onClick={handleCashOut}>
                Cash Out ({Math.round(parseInt(wager) * multiplier)} $)
              </button>
            ) : cashedOut ? (
              <button className={`${styles.actionBtn} ${styles.cashedOutState}`} disabled>
                Cashed Out!
              </button>
            ) : (
              <button className={`${styles.actionBtn} ${styles.waitingState}`} disabled>
                Watching Flight
              </button>
            )
          )}

          {gameState === "crashed" && (
            <button className={`${styles.actionBtn} ${styles.waitingState}`} disabled style={{ borderColor: "rgba(255,23,68,0.3)" }}>
              CRASHED AT {multiplier.toFixed(2)}x
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default GameCrash;
