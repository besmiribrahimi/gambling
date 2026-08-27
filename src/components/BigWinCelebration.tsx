"use client";

import React, { useEffect, useRef } from "react";
import { useWallet } from "../context/WalletContext";

interface ConfettiPiece {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
}

export const BigWinCelebration: React.FC = () => {
  const { bigWinModal, closeBigWin } = useWallet();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!bigWinModal) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const colors = ["#ffd700", "#00f0ff", "#ff007a", "#00e676", "#bd00ff", "#ffffff"];
    const pieces: ConfettiPiece[] = Array.from({ length: 80 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 100,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 6,
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10
    }));

    let animId: number;
    const gravity = 0.35;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      pieces.forEach((p) => {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [bigWinModal]);

  if (!bigWinModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000
      }}
      onClick={closeBigWin}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />

      <div
        style={{
          background: "linear-gradient(135deg, #1f1b0a 0%, #0c0e17 100%)",
          border: "2px solid #ffd700",
          boxShadow: "0 0 50px rgba(255, 215, 0, 0.6), inset 0 0 30px rgba(255, 215, 0, 0.2)",
          borderRadius: "20px",
          padding: "2.5rem 3.5rem",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
          animation: "cardSlide 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}
      >
        <div style={{ fontSize: "3.5rem", animation: "blinkFast 0.8s infinite" }}>🏆</div>
        <h2 style={{ fontFamily: "var(--font-family-title)", fontSize: "2.2rem", fontWeight: 900, color: "#ffd700", textShadow: "0 0 20px rgba(255,215,0,0.6)" }}>
          MASSIVE MULTIPLIER!
        </h2>
        <div style={{ fontSize: "1.1rem", color: "var(--color-primary)", fontWeight: 800, marginTop: "0.25rem" }}>
          {bigWinModal.game} • {bigWinModal.multiplier}x MULTIPLIER
        </div>
        <div style={{ fontFamily: "var(--font-family-title)", fontSize: "3rem", fontWeight: 900, color: "#00e676", textShadow: "0 0 25px rgba(0,230,118,0.6)", margin: "1rem 0" }}>
          +{bigWinModal.payout.toLocaleString()} War Bonds
        </div>
        <button
          onClick={closeBigWin}
          style={{
            background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)",
            color: "#000",
            fontFamily: "var(--font-family-title)",
            fontSize: "1rem",
            fontWeight: 900,
            padding: "0.75rem 2rem",
            borderRadius: "8px",
            textTransform: "uppercase",
            cursor: "pointer"
          }}
        >
          Collect Winnings
        </button>
      </div>
    </div>
  );
};

export default BigWinCelebration;
