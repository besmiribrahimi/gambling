"use client";

import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./betting.module.css";

export const BettingArena: React.FC = () => {
  const { matches, balance, placeMatchBet, resolveMatch } = useWallet();
  const [selectedTeams, setSelectedTeams] = useState<Record<string, "teamA" | "teamB">>({});
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { text: string; isError: boolean } | null>>({});
  const [filterTab, setFilterTab] = useState<"all" | "live" | "upcoming" | "completed">("all");

  const handleSelectTeam = (matchId: string, team: "teamA" | "teamB") => {
    setSelectedTeams((prev) => ({ ...prev, [matchId]: team }));
    sound.playClick();
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
      const cappedVal = Math.min(nextVal, balance);
      return { ...prev, [matchId]: cappedVal.toString() };
    });
    sound.playChip();
  };

  const handlePlaceBet = (matchId: string) => {
    const team = selectedTeams[matchId];
    const amountStr = betAmounts[matchId];
    const amount = parseInt(amountStr);

    if (!team) {
      setMessages((prev) => ({ ...prev, [matchId]: { text: "Select YES or NO prediction first.", isError: true } }));
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
    sound.playJackpot();
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

  const filteredMatches = matches.filter((m) => {
    if (filterTab === "all") return true;
    return m.status === filterTab;
  });

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Roblox Entrenched Esports Markets</h2>
          <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
            Trade live predictive positions on the Entrenched League V championship tournament
          </span>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {(["all", "live", "upcoming", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setFilterTab(tab); sound.playClick(); }}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                fontFamily: "var(--font-family-title)",
                fontSize: "0.75rem",
                fontWeight: 800,
                textTransform: "uppercase",
                background: filterTab === tab ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                color: filterTab === tab ? "#000" : "#fff",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.matchGrid}>
        {filteredMatches.map((match) => {
          const selectedTeam = selectedTeams[match.id];
          const betAmount = betAmounts[match.id] || "";
          const msg = messages[match.id];
          const strobe = getStrobeClass(match.teamA, match.teamB);

          const volA = match.volumeA || 10000;
          const volB = match.volumeB || 10000;
          const totalVol = volA + volB;
          const pctA = Math.round((volA / totalVol) * 100);
          const pctB = 100 - pctA;

          const currentOdds = selectedTeam === "teamA" ? match.oddsA : match.oddsB;
          const estPayout = betAmount && !isNaN(parseInt(betAmount)) 
            ? Math.round(parseInt(betAmount) * currentOdds) 
            : 0;

          return (
            <div key={match.id} className={`${styles.matchCard} ${strobe}`}>
              <div className={styles.matchHeader}>
                <span className={styles.gameName}>{match.game}</span>
                <span className={`${styles.statusTag} ${match.status === "live" ? `${styles.live} blink-fast` : match.status === "upcoming" ? styles.upcoming : styles.completed}`}>
                  {match.status === "live" ? "🔴 LIVE CONTRACT" : match.status === "upcoming" ? "⏳ UPCOMING" : "RESOLVED"}
                </span>
              </div>

              <div className={styles.questionContainer}>
                {renderBadges(match.teamA, match.teamB)}
                <p className={styles.questionText}>{match.time}</p>
              </div>

              {/* Pool distribution bar */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 700 }}>
                  <span>YES {pctA}% ({volA.toLocaleString()} $)</span>
                  <span>NO {pctB}% ({volB.toLocaleString()} $)</span>
                </div>
                <div style={{ height: "6px", width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${pctA}%`, background: "var(--color-primary)", height: "100%" }} />
                  <div style={{ width: `${pctB}%`, background: "var(--color-secondary)", height: "100%" }} />
                </div>
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
                      <div className="casino-chip chip-white" onClick={() => handleAddChip(match.id, 10)}>10</div>
                      <div className="casino-chip chip-red" onClick={() => handleAddChip(match.id, 50)}>50</div>
                      <div className="casino-chip chip-blue" onClick={() => handleAddChip(match.id, 100)}>100</div>
                      <div className="casino-chip chip-purple" onClick={() => handleAddChip(match.id, 500)}>500</div>
                      <div className="casino-chip chip-gold" onClick={() => handleAddChip(match.id, 1000)}>1k</div>
                    </div>

                    {selectedTeam && estPayout > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                        <span>Potential Payout:</span>
                        <span style={{ color: "var(--color-success)", fontWeight: 800 }}>+{estPayout} War Bonds</span>
                      </div>
                    )}

                    <button
                      id={`btn-bet-submit-${match.id}`}
                      className={styles.placeBetBtn}
                      onClick={() => handlePlaceBet(match.id)}
                      disabled={!selectedTeam}
                    >
                      Submit Contract Position
                    </button>

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

              {/* Simulation Settlement Controls */}
              {match.status !== "completed" && (
                <div className={styles.devPanel}>
                  <div className={styles.devHeader}>
                    <span>⚙️</span> SETTLE MATCH CONSOLE
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
    </div>
  );
};

export default BettingArena;
