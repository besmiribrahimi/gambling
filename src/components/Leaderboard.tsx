"use client";

import React from "react";
import { useWallet } from "../context/WalletContext";
import styles from "./leaderboard.module.css";

interface LeaderboardEntry {
  name: string;
  balance: number;
  wagersWon: number;
  isUser?: boolean;
}

const MOCK_PLAYERS: LeaderboardEntry[] = [
  { name: "shroud", balance: 14200, wagersWon: 84 },
  { name: "Faker", balance: 9850, wagersWon: 112 },
  { name: "s1mple", balance: 6400, wagersWon: 45 },
  { name: "TenZ", balance: 4100, wagersWon: 52 },
  { name: "Clix", balance: 2500, wagersWon: 30 },
  { name: "Mongraal", balance: 1800, wagersWon: 19 },
  { name: "Pokimane", balance: 950, wagersWon: 11 },
  { name: "Ninja", balance: 500, wagersWon: 5 }
];

export const Leaderboard: React.FC = () => {
  const { balance, wagerHistory } = useWallet();

  // Count player's won wagers
  const playerWins = wagerHistory.filter((w) => w.result === "win").length;

  // Append user dynamically
  const leaderboardData: LeaderboardEntry[] = [
    ...MOCK_PLAYERS,
    { name: "You (Player)", balance, wagersWon: playerWins, isUser: true }
  ];

  // Sort by balance desc
  leaderboardData.sort((a, b) => b.balance - a.balance);

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <div>
          <h2 className={styles.title}>Top Community Leaderboard</h2>
          <span className={styles.subtitle}>Rankings are calculated dynamically in real-time</span>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player Name</th>
            <th>Wagers Won</th>
            <th style={{ textAlign: "right" }}>Wallet Balance</th>
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
                    {player.name}
                    {player.isUser && <span className={styles.userTag}>YOU</span>}
                  </div>
                </td>
                <td style={{ color: "var(--color-text-secondary)", fontWeight: "600" }}>
                  {player.wagersWon}
                </td>
                <td className={styles.balance} style={{ textAlign: "right" }}>
                  {player.balance.toLocaleString()} War Bonds
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
