"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./leaderboard.module.css";

interface RealPlayerEntry {
  id: string;
  name: string;
  avatar: string;
  vipTier: string;
  vipBadge: string;
  balance: number;
  wagersWon: number;
  biggestMultiplier: number;
  totalWagered: number;
  isBanned?: boolean;
  role?: string;
  isUser?: boolean;
}

export const Leaderboard: React.FC = () => {
  const { user } = useWallet();
  const [players, setPlayers] = useState<RealPlayerEntry[]>([]);
  const [sortKey, setSortKey] = useState<"balance" | "wagersWon" | "biggestMultiplier">("balance");
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.leaderboard || []);
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const sortedData = [...players]
    .map((p) => ({
      ...p,
      isUser: user ? p.name.toLowerCase() === user.username.toLowerCase() : false
    }))
    .sort((a, b) => b[sortKey] - a[sortKey]);

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <div>
          <h2 className={styles.title}>🏆 Community Hall of Fame</h2>
          <span className={styles.subtitle}>
            Verified player rankings synchronized live from the MongoDB Cloud Database
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => { setSortKey("balance"); sound.playClick(); }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              fontFamily: "var(--font-family-title)",
              fontSize: "0.75rem",
              fontWeight: 800,
              background: sortKey === "balance" ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
              color: sortKey === "balance" ? "#000" : "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer"
            }}
          >
            Highest Balance
          </button>
          <button
            onClick={() => { setSortKey("wagersWon"); sound.playClick(); }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              fontFamily: "var(--font-family-title)",
              fontSize: "0.75rem",
              fontWeight: 800,
              background: sortKey === "wagersWon" ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
              color: sortKey === "wagersWon" ? "#000" : "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer"
            }}
          >
            Most Wins
          </button>
          <button
            onClick={() => { setSortKey("biggestMultiplier"); sound.playClick(); }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              fontFamily: "var(--font-family-title)",
              fontSize: "0.75rem",
              fontWeight: 800,
              background: sortKey === "biggestMultiplier" ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
              color: sortKey === "biggestMultiplier" ? "#000" : "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer"
            }}
          >
            Top Multiplier
          </button>
          <button
            onClick={fetchLeaderboard}
            title="Refresh Leaderboard"
            style={{
              padding: "0.4rem 0.6rem",
              borderRadius: "6px",
              background: "rgba(0, 240, 255, 0.1)",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              color: "var(--color-primary)",
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
          >
            🔄
          </button>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Verified Player</th>
            <th>Wagers Won</th>
            <th>Top Multiplier</th>
            <th style={{ textAlign: "right" }}>War Bonds Balance</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((player, index) => {
            const rank = index + 1;
            let rankClass = styles.rankOther;
            if (rank === 1) rankClass = styles.rank1;
            if (rank === 2) rankClass = styles.rank2;
            if (rank === 3) rankClass = styles.rank3;

            return (
              <tr 
                key={player.id || player.name} 
                className={`${styles.row} ${player.isUser ? styles.userRow : ""}`}
              >
                <td>
                  <span className={`${styles.rankBadge} ${rankClass}`}>
                    {rank}
                  </span>
                </td>
                <td>
                  <div className={styles.playerName}>
                    <span style={{ fontSize: "1.1rem" }}>{player.avatar}</span>
                    <span style={{ fontWeight: 800 }}>{player.name}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                      ({player.vipBadge} {player.vipTier})
                    </span>
                    {player.role === "admin" && (
                      <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(255,0,85,0.2)", color: "#ff0055", border: "1px solid #ff0055", fontWeight: 900 }}>
                        ADMIN
                      </span>
                    )}
                    {player.isUser && <span className={styles.userTag}>YOU</span>}
                  </div>
                </td>
                <td style={{ color: "var(--color-text-secondary)", fontWeight: "700" }}>
                  {player.wagersWon} Wins
                </td>
                <td style={{ color: "#ffd700", fontWeight: "800", fontFamily: "var(--font-family-title)" }}>
                  {player.biggestMultiplier}x
                </td>
                <td className={styles.balance} style={{ textAlign: "right" }}>
                  {player.balance.toLocaleString()} $
                </td>
              </tr>
            );
          })}
          {sortedData.length === 0 && !loading && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem", color: "var(--color-text-muted)" }}>
                No players registered yet. Create an account to claim the #1 spot!
              </td>
            </tr>
          )}
          {loading && sortedData.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem", color: "var(--color-text-muted)" }}>
                Synchronizing live leaderboard rankings from MongoDB Atlas...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
