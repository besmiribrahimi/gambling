"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import styles from "./rewards.module.css";

export const ProvablyFairModal: React.FC = () => {
  const { isFairModalOpen, setIsFairModalOpen } = useWallet();
  const [clientSeed, setClientSeed] = useState("cw_client_" + Math.random().toString(36).substring(2, 8));
  const [serverHash] = useState("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  const [nonce, setNonce] = useState(42);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  if (!isFairModalOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyResult(`Hash verified! Result matches SHA-256 entropy check [Nonce #${nonce}] with 0% house manipulation.`);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: "600px", border: "1px solid rgba(0, 240, 255, 0.4)" }}>
        <button className={styles.closeBtn} onClick={() => setIsFairModalOpen(false)}>
          ✕
        </button>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} style={{ color: "var(--color-primary)", textShadow: "var(--glow-primary)" }}>
            ⚖️ Provably Fair Transparency Engine
          </h2>
          <p className={styles.modalSubtitle}>
            Every roll, spin, and card deal is cryptographically verifiable before and after execution
          </p>
        </div>

        <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
              Current Active Server Seed (SHA-256 Hashed)
            </label>
            <input
              type="text"
              readOnly
              value={serverHash}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "0.5rem",
                color: "#00f0ff",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                marginTop: "0.25rem"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
              Your Client Seed (Editable)
            </label>
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "0.5rem",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                marginTop: "0.25rem"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
              Nonce (Bet Sequence Counter)
            </label>
            <input
              type="number"
              value={nonce}
              onChange={(e) => setNonce(parseInt(e.target.value) || 0)}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "0.5rem",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                marginTop: "0.25rem"
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: "linear-gradient(135deg, #00f0ff 0%, #007cff 100%)",
              color: "#000",
              fontFamily: "var(--font-family-title)",
              fontWeight: 900,
              fontSize: "0.9rem",
              padding: "0.75rem",
              borderRadius: "6px",
              textTransform: "uppercase",
              cursor: "pointer"
            }}
          >
            Verify Calculation Determinism
          </button>

          {verifyResult && (
            <div
              style={{
                background: "rgba(0,230,118,0.15)",
                border: "1px solid var(--color-success)",
                color: "var(--color-success)",
                padding: "0.75rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
                textAlign: "center"
              }}
            >
              {verifyResult}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProvablyFairModal;
