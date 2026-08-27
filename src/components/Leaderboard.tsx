"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./leaderboard.module.css";

interface LeaderboardEntry {
  name: string;
  vipTier: string;
  vipBadge: string;
  balance: number;
  wagersWon: number;
  biggestMultiplier: number;
  isUser?: boolean;
}

const MOCK_PLAYERS: LeaderboardEntry[] = [
  { name: "shroud", vipTier: "Obsidian", vipBadge: "🔥", balance: 42500, wagersWon: 142, biggestMultiplier: 125.0 },
  { name: "Faker", vipTier: "Diamond", vipBadge: "👑", balance: 28950, wagersWon: 118, biggestMultiplier: 76.0 },
  { name: "s1mple", vipTier: "Platinum", vipBadge: "💎", balance: 18400, wagersWon: 85, biggestMultiplier: 42.0 },
  { name: "TenZ", vipTier: "Platinum", vipBadge: "💎", balance: 14100, wagersWon: 62, biggestMultiplier: 33.0 },
  { name: "Clix", vipTier: "Gold", vipBadge: "🥇", balance: 8500, wagersWon: 45, biggestMultiplier: 22.0 },
  { name: "Mongraal", vipTier: "Gold", vipBadge: "🥇", balance: 5800, wagersWon: 31, biggestMultiplier: 18.0 },
  { name: "Pokimane", vipTier: "Silver", vipBadge: "🥈", balance: 2950, wagersWon: 19, biggestMultiplier: 14.0 },
  { name: "Ninja", vipTier: "Bronze", vipBadge: "🥉", balance: 1500, wagersWon: 12, biggestMultiplier: 6.0 }
];

export const Leaderboard: React.FC = () => {
  const { balance, wagerHistory, user, vipTier } = useWallet();
  const [sortKey, setSortKey] = useState<"balance" | "wagersWon" | "biggestMultiplier">("balance");

  // Calculate user stats
  const playerWins = wagerHistory.filter((w) => w.result === "win").length;
  const playerBiggestMult = wagerHistory.reduce((max, w) => {
    if (w.result === "win" && w.amount > 0) {
      const m = w.payout / w.amount;
      return m > max ? m : max;
    }
    return max;
  }, 1.0);

  const userName = user ? user.username : "You (Player)";

  const leaderboardData: LeaderboardEntry[] = [
    ...MOCK_PLAYERS,
    {
      name: userName,
      vipTier: vipTier.name,
      vipBadge: vipTier.badge,
      balance,
      wagersWon: playerWins,
      biggestMultiplier: parseFloat(playerBiggestMult.toFixed(1)),
      isUser: true
    }
  ];

  leaderboardData.sort((a, b) => b[sortKey] - a[sortKey]);

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <div>
          <h2 className={styles.title}>🏆 Community Hall of Fame</h2>
          <span className={styles.subtitle}>Rankings update in real-time based on high-roller performances</span>
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() => { setSortKey("balance"); sound.playClick(); }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              fontFamily: "var(--font-family-title)",
              fontSize: "0.75rem",
              fontWeight: 800,
              background: sortKey === "balance" ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
              color: sortKey === "balance" ? "#000" : "#fff"
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
              color: sortKey === "wagersWon" ? "#000" : "#fff"
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
              color: sortKey === "biggestMultiplier" ? "#000" : "#fff"
            }}
          >
            Top Multiplier
          </button>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player & VIP Tier</th>
            <th>Wagers Won</th>
            <th>Top Multiplier</th>
            <th style={{ textAlign: "right" }}>War Bonds Balance</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData.map((player, index) => {
            const rank = index + 1;
            let rankClass = styles.rankOther;
            if (rank === 1) rankClass = styles.rank1;
            if (rank === 2) rankClass = styles.rank2;
            if (rank === 3) rankClass = styles.rank3;

            return (
              <tr 
                key={player.name} 
                className={`${styles.row} ${player.isUser ? styles.userRow : ""}`}
              >
                <td>
                  <span className={`${styles.rankBadge} ${rankClass}`}>
                    {rank}
                  </span>
                </td>
                <td>
                  <div className={styles.playerName}>
                    <span>{player.vipBadge}</span>
                    <span>{player.name}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>({player.vipTier})</span>
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
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
