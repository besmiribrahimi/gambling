"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import styles from "./betting.module.css";

export const BettingArena: React.FC = () => {
  const { matches, balance, placeMatchBet, resolveMatch } = useWallet();
  const [selectedTeams, setSelectedTeams] = useState<Record<string, "teamA" | "teamB">>({});
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { text: string; isError: boolean } | null>>({});

  const handleSelectTeam = (matchId: string, team: "teamA" | "teamB") => {
    setSelectedTeams((prev) => ({ ...prev, [matchId]: team }));
  };

  const handleAmountChange = (matchId: string, value: string) => {
    setBetAmounts((prev) => ({ ...prev, [matchId]: value }));
  };

  const handleMaxAmount = (matchId: string) => {
    setBetAmounts((prev) => ({ ...prev, [matchId]: balance.toString() }));
  };

  const handleAddChip = (matchId: string, chipValue: number) => {
    setBetAmounts((prev) => {
      const current = parseInt(prev[matchId] || "0");
      const nextVal = isNaN(current) ? chipValue : current + chipValue;
      // Cap wager at active balance
      const cappedVal = Math.min(nextVal, balance);
      return { ...prev, [matchId]: cappedVal.toString() };
    });
  };

  const handlePlaceBet = (matchId: string) => {
    const team = selectedTeams[matchId];
    const amountStr = betAmounts[matchId];
    const amount = parseInt(amountStr);

    if (!team) {
      setMessages((prev) => ({ ...prev, [matchId]: { text: "Select YES or NO first.", isError: true } }));
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setMessages((prev) => ({ ...prev, [matchId]: { text: "Enter a valid amount.", isError: true } }));
      return;
    }

    const result = placeMatchBet(matchId, team, amount);
    setMessages((prev) => ({
      ...prev,
      [matchId]: { text: result.message, isError: !result.success }
    }));

    if (result.success) {
      setBetAmounts((prev) => ({ ...prev, [matchId]: "" }));
    }

    setTimeout(() => {
      setMessages((prev) => ({ ...prev, [matchId]: null }));
    }, 3000);
  };

  const handleSimulateWinner = (matchId: string, winner: "teamA" | "teamB") => {
    resolveMatch(matchId, winner);
  };

  const getTierDetails = (factionName: string) => {
    const clean = factionName
      .replace("YES (", "")
      .replace("NO (", "")
      .replace(" Wins)", "")
      .replace(" Wins/Draws)", "")
      .trim();

    const elite = ["DK", "AH"];
    const topMid = ["IA", "NYS", "TWA"];
    const mid = ["TTI 3", "CZSK", "CG", "RKA 2", "NDV", "NRI", "PCD 2"];

    if (elite.includes(clean)) return { label: "ELITE", color: "#ff6c00", icon: "🔶" };
    if (topMid.includes(clean)) return { label: "TOP MID", color: "#007cff", icon: "🟦" };
    if (mid.includes(clean)) return { label: "MID", color: "#b200ff", icon: "🟪" };
    return { label: "LOW MID", color: "#00cc44", icon: "🟩" };
  };

  const renderBadges = (teamA: string, teamB: string) => {
    const detailsA = getTierDetails(teamA);
    const detailsB = getTierDetails(teamB);
    
    const nameA = teamA.replace("YES (", "").replace(" Wins)", "").trim();
    const nameB = teamB.replace("NO (", "").replace(" Wins/Draws)", "").trim();

    return (
      <div className={styles.factionBadgeRow}>
        <div className={styles.factionBadge} style={{ borderColor: detailsA.color, boxShadow: `0 0 8px ${detailsA.color}40` }}>
          <span className={styles.factionIcon}>{detailsA.icon}</span>
          <span className={styles.factionName} style={{ color: detailsA.color }}>{nameA}</span>
        </div>
        <span className={styles.vsText}>VS</span>
        <div className={styles.factionBadge} style={{ borderColor: detailsB.color, boxShadow: `0 0 8px ${detailsB.color}40` }}>
          <span className={styles.factionIcon}>{detailsB.icon}</span>
          <span className={styles.factionName} style={{ color: detailsB.color }}>{nameB}</span>
        </div>
      </div>
    );
  };

  const getStrobeClass = (teamA: string, teamB: string) => {
    const detailsA = getTierDetails(teamA);
    const detailsB = getTierDetails(teamB);

    if (detailsA.label === "ELITE" || detailsB.label === "ELITE") return "strobe-elite";
    if (detailsA.label === "TOP MID" || detailsB.label === "TOP MID") return "strobe-topmid";
    if (detailsA.label === "MID" || detailsB.label === "MID") return "strobe-mid";
    return "strobe-lowmid";
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Roblox Entrenched Prediction Markets</h2>
        <span className={styles.hotBadge} style={{ animation: "blinkSlow 1.5s infinite" }}>
          🔥 HIGH VOLATILITY CONTRACTS
        </span>
      </div>

      <div className={styles.matchGrid}>
        {matches
          .filter((match) => match.status !== "upcoming")
          .map((match) => {
          const selectedTeam = selectedTeams[match.id];
          const betAmount = betAmounts[match.id] || "";
          const msg = messages[match.id];
          const strobe = getStrobeClass(match.teamA, match.teamB);

          return (
            <div key={match.id} className={`${styles.matchCard} ${strobe}`}>
              <div className={styles.matchHeader}>
                <span className={styles.gameName}>{match.game}</span>
                <span className={`${styles.statusTag} ${match.status === "live" ? `${styles.live} blink-fast` : styles.completed}`}>
                  {match.status === "live" ? "LIVE CONTRACT" : "RESOLVED"}
                </span>
              </div>

              <div className={styles.questionContainer}>
                {renderBadges(match.teamA, match.teamB)}
                <p className={styles.questionText}>{match.time}</p>
              </div>

              {match.status !== "completed" ? (
                <>
                  <div className={styles.oddsSection}>
                    <button
                      id={`btn-bet-yes-${match.id}`}
                      className={`${styles.oddsBtn} ${selectedTeam === "teamA" ? styles.oddsBtnActive : ""}`}
                      onClick={() => handleSelectTeam(match.id, "teamA")}
                    >
                      <span className={styles.oddsLabel}>{match.teamA}</span>
                      <span className={styles.oddsVal}>{match.oddsA.toFixed(2)}x</span>
                    </button>
                    <button
                      id={`btn-bet-no-${match.id}`}
                      className={`${styles.oddsBtn} ${selectedTeam === "teamB" ? styles.oddsBtnActive : ""}`}
                      onClick={() => handleSelectTeam(match.id, "teamB")}
                    >
                      <span className={styles.oddsLabel}>{match.teamB}</span>
                      <span className={styles.oddsVal}>{match.oddsB.toFixed(2)}x</span>
                    </button>
                  </div>

                  <div className={styles.betPanel}>
                    <div className={styles.wagerInputContainer}>
                      <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginRight: "0.4rem", fontWeight: "700" }}>$</span>
                      <input
                        id={`input-bet-wager-${match.id}`}
                        type="number"
                        className={styles.wagerInput}
                        placeholder="Prediction wager..."
                        value={betAmount}
                        onChange={(e) => handleAmountChange(match.id, e.target.value)}
                      />
                      <button className={styles.maxBtn} onClick={() => handleMaxAmount(match.id)}>
                        MAX
                      </button>
                    </div>

                    {/* Casino Chip Selector Panel */}
                    <div className={styles.chipRow}>
                      <div 
                        className={`${styles.chip} ${styles.chipRed}`} 
                        onClick={() => handleAddChip(match.id, 10)}
                        title="Add 10 War Bonds"
                      >
                        10
                      </div>
                      <div 
                        className={`${styles.chip} ${styles.chipGreen}`} 
                        onClick={() => handleAddChip(match.id, 50)}
                        title="Add 50 War Bonds"
                      >
                        50
                      </div>
                      <div 
                        className={`${styles.chip} ${styles.chipBlue}`} 
                        onClick={() => handleAddChip(match.id, 100)}
                        title="Add 100 War Bonds"
                      >
                        100
                      </div>
                      <div 
                        className={`${styles.chip} ${styles.chipPurple}`} 
                        onClick={() => handleAddChip(match.id, 500)}
                        title="Add 500 War Bonds"
                      >
                        500
                      </div>
                      <div 
                        className={`${styles.chip} ${styles.chipGold}`} 
                        onClick={() => handleAddChip(match.id, 1000)}
                        title="Add 1,000 War Bonds"
                      >
                        1k
                      </div>
                    </div>

                    <button
                      id={`btn-bet-submit-${match.id}`}
                      className={styles.placeBetBtn}
                      onClick={() => handlePlaceBet(match.id)}
                      disabled={!selectedTeam}
                    >
                      Submit Contract
                    </button>

                    {/* Feedback message */}
                    {msg && (
                      <div className={`${styles.msg} ${msg.isError ? styles.errorMsg : styles.successMsg}`}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.resultOverlay}>
                  <div className={styles.resultTitle}>Contract Settled</div>
                  <div className={styles.resultWinner}>
                    Outcome: <span className={styles.winHighlight}>{match.winner === "teamA" ? "YES" : "NO"}</span>
                  </div>
                </div>
              )}

              {/* Developer Simulation Controls */}
              {match.status !== "completed" && (
                <div className={styles.devPanel}>
                  <div className={styles.devHeader}>
                    <span className="blink-fast" style={{ color: "var(--color-danger)" }}>⚠️</span> 
                    DEV RESOLUTION CONSOLE
                  </div>
                  <div className={styles.devBtns}>
                    <button 
                      id={`btn-dev-win-yes-${match.id}`}
                      className={styles.devBtn}
                      onClick={() => handleSimulateWinner(match.id, "teamA")}
                    >
                      Settle as YES
                    </button>
                    <button 
                      id={`btn-dev-win-no-${match.id}`}
                      className={styles.devBtn}
                      onClick={() => handleSimulateWinner(match.id, "teamB")}
                    >
                      Settle as NO
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming Matches Banner */}
      <div className={styles.noUpcomingBanner}>
        <span className={styles.bannerIcon}>📅</span>
        <div className={styles.bannerContent}>
          <h4 className={styles.bannerTitle}>No Upcoming Matches</h4>
          <p className={styles.bannerText}>All scheduled matches are currently live or completed. Check back later for new contracts!</p>
        </div>
      </div>
    </div>
  );
};
export default BettingArena;
