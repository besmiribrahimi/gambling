"use client";

import React, { useState, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./blackjack.module.css";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = parseInt(rank);
      if (["J", "Q", "K"].includes(rank)) value = 10;
      if (rank === "A") value = 11;
      deck.push({ suit, rank, value });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandScore(cards: Card[]): { score: number; isSoft: boolean } {
  let score = 0;
  let aceCount = 0;

  for (const card of cards) {
    score += card.value;
    if (card.rank === "A") aceCount++;
  }

  while (score > 21 && aceCount > 0) {
    score -= 10;
    aceCount--;
  }

  return { score, isSoft: aceCount > 0 };
}

export const GameBlackjack: React.FC = () => {
  const { balance, setBalance, addTransaction } = useWallet();
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<"betting" | "playerTurn" | "dealerTurn" | "resolved">("betting");
  const [wager, setWager] = useState<string>("50");
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "win" | "lose" | "push" } | null>(null);

  // Start a new round / Deal
  const handleDeal = () => {
    const betAmt = parseInt(wager);
    if (isNaN(betAmt) || betAmt <= 0) {
      setStatusMsg({ text: "Please enter a valid bet amount.", type: "lose" });
      return;
    }
    if (balance < betAmt) {
      setStatusMsg({ text: "Insufficient War Bonds balance.", type: "lose" });
      return;
    }

    setBalance((prev) => prev - betAmt);
    setCurrentBet(betAmt);
    setStatusMsg(null);

    const freshDeck = createDeck();
    const pHand = [freshDeck[0], freshDeck[2]];
    const dHand = [freshDeck[1], freshDeck[3]];
    const remainingDeck = freshDeck.slice(4);

    setDeck(remainingDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    sound.playCardDeal();

    // Check for player natural Blackjack
    const pScore = calculateHandScore(pHand).score;
    const dScore = calculateHandScore(dHand).score;

    if (pScore === 21) {
      if (dScore === 21) {
        // Push
        setGameState("resolved");
        setBalance((prev) => prev + betAmt);
        setStatusMsg({ text: "Both hit Natural Blackjack! Push (Bet returned).", type: "push" });
        addTransaction("blackjack", "Blackjack Push vs Dealer", betAmt, "win", betAmt);
      } else {
        // Natural Blackjack Win (3:2 payout = 2.5x)
        const payout = Math.round(betAmt * 2.5);
        setGameState("resolved");
        setBalance((prev) => prev + payout);
        setStatusMsg({ text: `Natural Blackjack! 3:2 Payout (+${payout} $)`, type: "win" });
        addTransaction("blackjack", "Natural Blackjack 21 Win", betAmt, "win", payout);
        sound.playJackpot();
      }
    } else {
      setGameState("playerTurn");
    }
  };

  // Player Hits
  const handleHit = () => {
    if (gameState !== "playerTurn" || deck.length === 0) return;

    const nextCard = deck[0];
    const newHand = [...playerHand, nextCard];
    const newDeck = deck.slice(1);

    setPlayerHand(newHand);
    setDeck(newDeck);
    sound.playCardDeal();

    const pScore = calculateHandScore(newHand).score;
    if (pScore > 21) {
      // Player Busts
      setGameState("resolved");
      setStatusMsg({ text: `Busted with ${pScore}! Trench Dealer wins.`, type: "lose" });
      addTransaction("blackjack", `Blackjack Bust with ${pScore}`, currentBet, "lose", 0);
      sound.playExplosion();
    } else if (pScore === 21) {
      // Auto Stand on 21
      handleStand(newHand, newDeck);
    }
  };

  // Player Stands -> Dealer plays
  const handleStand = useCallback((currentPHand = playerHand, currentDeck = deck) => {
    setGameState("dealerTurn");
    const pScore = calculateHandScore(currentPHand).score;

    let activeDealerHand = [...dealerHand];
    let activeDeck = [...currentDeck];
    let dScore = calculateHandScore(activeDealerHand).score;

    // Dealer draws until 17 or higher
    const runDealer = () => {
      while (dScore < 17 && activeDeck.length > 0) {
        const nextCard = activeDeck[0];
        activeDealerHand.push(nextCard);
        activeDeck = activeDeck.slice(1);
        dScore = calculateHandScore(activeDealerHand).score;
      }

      setDealerHand(activeDealerHand);
      setDeck(activeDeck);
      setGameState("resolved");

      // Compute final result
      if (dScore > 21) {
        // Dealer Busts
        const payout = currentBet * 2;
        setBalance((prev) => prev + payout);
        setStatusMsg({ text: `Dealer Busted with ${dScore}! You win +${payout} War Bonds!`, type: "win" });
        addTransaction("blackjack", `Won Blackjack: Dealer busted with ${dScore}`, currentBet, "win", payout);
        sound.playWin();
      } else if (pScore > dScore) {
        // Player higher
        const payout = currentBet * 2;
        setBalance((prev) => prev + payout);
        setStatusMsg({ text: `Victory! ${pScore} beats Dealer's ${dScore} (+${payout} $)`, type: "win" });
        addTransaction("blackjack", `Won Blackjack: ${pScore} vs ${dScore}`, currentBet, "win", payout);
        sound.playWin();
      } else if (pScore < dScore) {
        // Dealer higher
        setStatusMsg({ text: `Dealer wins with ${dScore} against your ${pScore}.`, type: "lose" });
        addTransaction("blackjack", `Lost Blackjack: ${pScore} vs ${dScore}`, currentBet, "lose", 0);
      } else {
        // Push
        setBalance((prev) => prev + currentBet);
        setStatusMsg({ text: `Push at ${pScore}! Bet returned.`, type: "push" });
        addTransaction("blackjack", `Blackjack Push at ${pScore}`, currentBet, "win", currentBet);
      }
    };

    setTimeout(runDealer, 400);
  }, [playerHand, dealerHand, deck, currentBet, setBalance, addTransaction]);

  // Double Down
  const handleDoubleDown = () => {
    if (gameState !== "playerTurn" || playerHand.length !== 2 || balance < currentBet) return;

    setBalance((prev) => prev - currentBet);
    const doubledBet = currentBet * 2;
    setCurrentBet(doubledBet);

    const nextCard = deck[0];
    const newHand = [...playerHand, nextCard];
    const newDeck = deck.slice(1);

    setPlayerHand(newHand);
    setDeck(newDeck);
    sound.playCardDeal();

    const pScore = calculateHandScore(newHand).score;
    if (pScore > 21) {
      setGameState("resolved");
      setStatusMsg({ text: `Doubled down and busted with ${pScore}!`, type: "lose" });
      addTransaction("blackjack", `Blackjack Double Down Bust (${pScore})`, doubledBet, "lose", 0);
      sound.playExplosion();
    } else {
      handleStand(newHand, newDeck);
    }
  };

  const handleAddChip = (val: number) => {
    if (gameState !== "betting" && gameState !== "resolved") return;
    const cur = parseInt(wager || "0");
    const nextVal = isNaN(cur) ? val : cur + val;
    setWager(Math.min(nextVal, balance).toString());
    sound.playChip();
  };

  const playerScore = calculateHandScore(playerHand).score;
  const dealerScore = gameState === "playerTurn" 
    ? (dealerHand[0]?.value || 0)
    : calculateHandScore(dealerHand).score;

  return (
    <div className={styles.container}>
      {/* Blackjack Felt Arena */}
      <div className={styles.tableFelt}>
        <div className={styles.tableLogo}>
          TRENCH BLACKJACK 21
          <div style={{ fontSize: "0.9rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)" }}>
            DEALER STANDS ON 17 • PAYS 3 TO 2
          </div>
        </div>

        {/* Dealer Hand Area */}
        <div className={styles.handArea}>
          <div className={styles.handHeader}>
            <span className={styles.handLabel}>Trench Dealer</span>
            {dealerHand.length > 0 && (
              <span className={styles.scoreBadge}>
                {gameState === "playerTurn" ? `${dealerHand[0]?.value} + ?` : dealerScore}
              </span>
            )}
          </div>

          <div className={styles.cardsContainer}>
            {dealerHand.map((card, idx) => {
              const isHidden = gameState === "playerTurn" && idx === 1;
              const isRed = card.suit === "♥" || card.suit === "♦";

              if (isHidden) {
                return (
                  <div key={idx} className={`${styles.card} ${styles.cardHidden}`}>
                    ♠
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`${styles.card} ${isRed ? styles.cardRed : styles.cardBlack}`}
                >
                  <div className={styles.cardCorner}>
                    <span>{card.rank}</span>
                    <span>{card.suit}</span>
                  </div>
                  <div className={styles.cardSuitCenter}>{card.suit}</div>
                  <div className={styles.cardCorner} style={{ transform: "rotate(180deg)" }}>
                    <span>{card.rank}</span>
                    <span>{card.suit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status announcement */}
        {statusMsg && (
          <div
            className={`${styles.statusMessage} ${
              statusMsg.type === "win"
                ? styles.statusWin
                : statusMsg.type === "lose"
                ? styles.statusLose
                : styles.statusPush
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Player Hand Area */}
        <div className={styles.handArea}>
          <div className={styles.cardsContainer}>
            {playerHand.map((card, idx) => {
              const isRed = card.suit === "♥" || card.suit === "♦";
              return (
                <div
                  key={idx}
                  className={`${styles.card} ${isRed ? styles.cardRed : styles.cardBlack}`}
                >
                  <div className={styles.cardCorner}>
                    <span>{card.rank}</span>
                    <span>{card.suit}</span>
                  </div>
                  <div className={styles.cardSuitCenter}>{card.suit}</div>
                  <div className={styles.cardCorner} style={{ transform: "rotate(180deg)" }}>
                    <span>{card.rank}</span>
                    <span>{card.suit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.handHeader}>
            <span className={styles.handLabel}>Your Hand</span>
            {playerHand.length > 0 && (
              <span className={styles.scoreBadge} style={{ borderColor: playerScore > 21 ? "var(--color-danger)" : "#00f0ff", color: playerScore > 21 ? "var(--color-danger)" : "#00f0ff" }}>
                {playerScore} {playerScore === 21 && "🔥"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control & Chip Betting Panel */}
      <div className={styles.controlPanel}>
        {gameState === "playerTurn" ? (
          <div className={styles.actionsRow}>
            <button className={`${styles.actionBtn} ${styles.hitBtn}`} onClick={handleHit}>
              Hit (+Card)
            </button>
            <button className={`${styles.actionBtn} ${styles.standBtn}`} onClick={() => handleStand()}>
              Stand (Hold)
            </button>
            {playerHand.length === 2 && balance >= currentBet && (
              <button className={`${styles.actionBtn} ${styles.doubleBtn}`} onClick={handleDoubleDown}>
                Double Down (2x)
              </button>
            )}
          </div>
        ) : (
          <div className={styles.betSetupRow}>
            {/* Chips Shortcuts */}
            <div className={styles.chipSelector}>
              <button className="casino-chip chip-white" onClick={() => handleAddChip(10)}>10</button>
              <button className="casino-chip chip-red" onClick={() => handleAddChip(50)}>50</button>
              <button className="casino-chip chip-blue" onClick={() => handleAddChip(100)}>100</button>
              <button className="casino-chip chip-purple" onClick={() => handleAddChip(500)}>500</button>
              <button className="casino-chip chip-gold" onClick={() => handleAddChip(1000)}>1k</button>
            </div>

            {/* Wager Input */}
            <div className={styles.wagerInputBox}>
              <span style={{ color: "var(--color-text-muted)", marginRight: "0.4rem", fontWeight: "700" }}>$</span>
              <input
                type="number"
                className={styles.wagerInput}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                min="1"
              />
              <button
                style={{ color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: 800 }}
                onClick={() => setWager(balance.toString())}
              >
                MAX
              </button>
            </div>

            <button className={`${styles.actionBtn} ${styles.dealBtn}`} onClick={handleDeal}>
              Deal Cards (${wager || 0})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBlackjack;
