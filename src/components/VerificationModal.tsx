"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./authModal.module.css";

export const VerificationModal: React.FC = () => {
  const { user, isVerificationModalOpen, setIsVerificationModalOpen } = useWallet();
  const [copied, setCopied] = useState<string | null>(null);

  if (!isVerificationModalOpen) return null;

  const handleCopyOverseer = () => {
    navigator.clipboard.writeText("hangugeoreulgusahalsu");
    setCopied("discord");
    sound.playClick();
    setTimeout(() => setCopied(null), 2500);
  };

  const handleCopyProfile = () => {
    if (!user) return;
    const text = `WarWager Profile Verification Request\nUsername: ${user.username}\nID: ${user.id}\nDiscord: ${user.discord || "Not set"}\nRoblox: ${user.roblox || "Not set"}`;
    navigator.clipboard.writeText(text);
    setCopied("profile");
    sound.playClick();
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className={styles.overlay} style={{ zIndex: 100000 }}>
      <div className={styles.modal} style={{ maxWidth: "520px", border: "1.5px solid rgba(255, 170, 0, 0.6)", boxShadow: "0 0 35px rgba(255, 170, 0, 0.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <img
            src="/logo.png"
            alt="WarWager Logo"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "12px",
              border: "2px solid rgba(255, 215, 0, 0.6)",
              boxShadow: "0 0 18px rgba(255, 215, 0, 0.4)",
              objectFit: "cover"
            }}
          />
        </div>

        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(255, 170, 0, 0.15)",
            border: "1px solid #ffaa00",
            color: "#ffaa00",
            padding: "0.2rem 0.6rem",
            borderRadius: "12px",
            fontSize: "0.72rem",
            fontWeight: 900,
            letterSpacing: "0.5px",
            marginBottom: "0.4rem"
          }}>
            ⚠️ ACCOUNT UNVERIFIED • ACTION REQUIRED
          </div>
          <h2 style={{ fontFamily: "var(--font-family-title)", fontSize: "1.35rem", color: "#fff", margin: 0 }}>
            Discord Verification Portal
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            Complete the 3 quick steps below to activate full account privileges on MongoDB Atlas
          </p>
        </div>

        {/* 3 Step Guide */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.2rem" }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "0.85rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start"
          }}>
            <div style={{ background: "var(--color-primary)", color: "#000", fontWeight: 900, borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.8rem" }}>
              1
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.85rem" }}>
                Direct Message our Overseer on Discord
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", margin: "0.2rem 0 0 0", lineHeight: 1.4 }}>
                Send a message on Discord to: <strong style={{ color: "#00f0ff" }}>hangugeoreulgusahalsu</strong>
              </p>
            </div>
          </div>

          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "0.85rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start"
          }}>
            <div style={{ background: "var(--color-primary)", color: "#000", fontWeight: 900, borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.8rem" }}>
              2
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.85rem" }}>
                Take a Screenshot (SC) of your Profile
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", margin: "0.2rem 0 0 0", lineHeight: 1.4 }}>
                Take a screenshot showing your site username (<strong>{user?.username || "Your Account"}</strong>) and your linked Discord handle.
              </p>
            </div>
          </div>

          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "0.85rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start"
          }}>
            <div style={{ background: "var(--color-primary)", color: "#000", fontWeight: 900, borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.8rem" }}>
              3
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.85rem" }}>
                Instant Verification Activation
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", margin: "0.2rem 0 0 0", lineHeight: 1.4 }}>
                Once received, our Overseer will click verify in the Command Center, activating the <strong>🛡️ VERIFIED</strong> badge on your profile!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button
            onClick={handleCopyOverseer}
            style={{
              flex: 1,
              minWidth: "200px",
              background: "linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(189, 0, 255, 0.2) 100%)",
              border: "1px solid #00f0ff",
              color: "#00f0ff",
              padding: "0.65rem 0.8rem",
              borderRadius: "6px",
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem"
            }}
          >
            📋 {copied === "discord" ? "COPIED DISCORD TAG!" : "Copy: hangugeoreulgusahalsu"}
          </button>

          <button
            onClick={handleCopyProfile}
            style={{
              flex: 1,
              minWidth: "200px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              padding: "0.65rem 0.8rem",
              borderRadius: "6px",
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem"
            }}
          >
            📄 {copied === "profile" ? "COPIED PROFILE DETAILS!" : "Copy My Profile Summary"}
          </button>
        </div>

        {/* Privacy Note */}
        <div style={{
          background: "rgba(0, 240, 255, 0.05)",
          border: "1px solid rgba(0, 240, 255, 0.2)",
          borderRadius: "6px",
          padding: "0.6rem 0.8rem",
          fontSize: "0.72rem",
          color: "var(--color-text-secondary)",
          lineHeight: 1.4,
          marginBottom: "1rem"
        }}>
          🔒 <strong>100% Privacy Guaranteed:</strong> Your Roblox and Discord handles are encrypted and private. They are never displayed on public leaderboards, games, or chat.
        </div>

        {/* Close Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => { setIsVerificationModalOpen(false); sound.playClick(); }}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              padding: "0.5rem 1.2rem",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            Understood / Close ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
