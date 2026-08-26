"use client";

import React, { useState, useEffect } from "react";
import useWager from "../hooks/useWager";
import styles from "./mines.module.css";

interface TileState {
  id: number;
  isRevealed: boolean;
  hasMine: boolean;
}

// Factorial calculation helper for combinations
function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let p = 1;
  for (let i = 1; i <= k; i++) {
    p = (p * (n - i + 1)) / i;
  }
  return Math.round(p);
}

// Mines multiplier formula: 0.98 / probability
function getMinesMultiplier(minesCount: number, gemsFound: number): number {
  if (gemsFound <= 0) return 1.0;
  
  const totalTiles = 25;
  const totalGems = totalTiles - minesCount;
  
  // Probability = comb(totalGems, gemsFound) / comb(totalTiles, gemsFound)
  const waysToPickGems = combinations(totalGems, gemsFound);
  const totalWaysToPick = combinations(totalTiles, gemsFound);
  
  if (totalWaysToPick === 0) return 0;
  
  const prob = waysToPickGems / totalWaysToPick;
  const houseEdgeMultiplier = 0.98; // 2.0% house edge
  
  const rawMult = houseEdgeMultiplier / prob;
  return Math.round(rawMult * 100) / 100;
}

export const GameMines: React.FC = () => {
  const { balance, placeWager, resolveWager } = useWager();
  const [minesCount, setMinesCount] = useState<number>(3);
  const [betAmount, setBetAmount] = useState<string>("10");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [board, setBoard] = useState<TileState[]>([]);
  const [gemsFound, setGemsFound] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isCashout, setIsCashout] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Initialize board representation
  useEffect(() => {
    resetBoardState();
  }, []);

  const resetBoardState = () => {
    const newBoard = Array.from({ length: 25 }, (_, idx) => ({
      id: idx,
      isRevealed: false,
      hasMine: false
    }));
    setBoard(newBoard);
  };

  const handleStartGame = () => {
    if (isPlaying) return;

    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertMsg({ text: "Please enter a valid bet amount.", isError: true });
      return;
    }

    if (minesCount < 1 || minesCount > 24) {
      setAlertMsg({ text: "Mines count must be between 1 and 24.", isError: true });
      return;
    }

    if (balance < amt) {
      setAlertMsg({ text: "Insufficient War Bonds balance.", isError: true });
      return;
    }

    // Place bet using our custom hook
    const placed = placeWager(amt);
    if (!placed) return;

    // Set playing states
    setAlertMsg(null);
    setGemsFound(0);
    setIsGameOver(false);
    setIsCashout(false);
    setIsPlaying(true);

    // Randomize mine positions
    const tempBoard = Array.from({ length: 25 }, (_, idx) => ({
      id: idx,
      isRevealed: false,
      hasMine: false
    }));

    let minesPlaced = 0;
    while (minesPlaced < minesCount) {
      const randIdx = Math.floor(Math.random() * 25);
      if (!tempBoard[randIdx].hasMine) {
        tempBoard[randIdx].hasMine = true;
        minesPlaced++;
      }
    }

    setBoard(tempBoard);
  };

  const handleRevealTile = (tileId: number) => {
    if (!isPlaying || isGameOver || isCashout) return;

    const tile = board[tileId];
    if (tile.isRevealed) return;

    // Mark tile as revealed
    const updatedBoard = board.map((t) => (t.id === tileId ? { ...t, isRevealed: true } : t));
    setBoard(updatedBoard);

    if (tile.hasMine) {
      // Hit a mine! Game lost immediately.
      setIsGameOver(true);
      setIsPlaying(false);
      revealAllMines(updatedBoard);
      
      const amt = parseFloat(betAmount);
      setAlertMsg({ text: "Explosion! You hit a mine. Wager lost.", isError: true });

      // Resolve wager as lost
      resolveWager(amt, 0, false, "mines", `Lost Mines: hit mine with ${minesCount} mines on grid`);
    } else {
      // Gem found!
      const nextGemsCount = gemsFound + 1;
      setGemsFound(nextGemsCount);

      // Check if all gems have been found (automatic win)
      const maxGems = 25 - minesCount;
      if (nextGemsCount === maxGems) {
        handleCashOut(updatedBoard, nextGemsCount);
      }
    }
  };

  const revealAllMines = (currentBoard: TileState[]) => {
    setBoard(
      currentBoard.map((t) => (t.hasMine ? { ...t, isRevealed: true } : t))
    );
  };

  const handleCashOut = (currentBoard = board, currentGemsCount = gemsFound) => {
    if (!isPlaying || isGameOver || isCashout) return;

    setIsCashout(true);
    setIsPlaying(false);
    revealAllMines(currentBoard);

    const amt = parseFloat(betAmount);
    const multiplier = getMinesMultiplier(minesCount, currentGemsCount);
    const payout = Math.round(amt * multiplier);

    setAlertMsg({
      text: `Cash out successful! Multiplier: ${multiplier}x. Credited +${payout} War Bonds!`,
      isError: false
    });

    // Resolve wager as win
    resolveWager(
      amt,
      payout,
      true,
      "mines",
      `Won Mines: found ${currentGemsCount} gems with ${minesCount} mines (Multiplier: ${multiplier}x)`
    );
  };

  const currentMultiplier = getMinesMultiplier(minesCount, gemsFound);
  const nextMultiplier = getMinesMultiplier(minesCount, gemsFound + 1);
  const cashoutValue = Math.round(parseFloat(betAmount || "0") * currentMultiplier);

  return (
    <div className={styles.container}>
      <div className={styles.gameLayout}>
        
        {/* Grid Area */}
        <div className={styles.gridArena}>
          <div className={styles.grid}>
            {board.map((tile) => {
              const showGem = tile.isRevealed && !tile.hasMine;
              const showMine = tile.isRevealed && tile.hasMine;
              return (
                <button
                  key={tile.id}
                  disabled={!isPlaying || tile.isRevealed}
                  onClick={() => handleRevealTile(tile.id)}
                  className={`${styles.tile} ${showGem ? styles.tileGem : ""} ${
                    showMine ? styles.tileMine : ""
                  }`}
                >
                  {showGem ? "💎" : showMine ? "💣" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Wager Panel */}
        <div className={styles.wagerPanel}>
          <div>
            <h2 className={styles.title}>Trench Mines</h2>
            <p className={styles.subtitle}>
              Unearth buried gems. Stay clear of hidden mines. Cash out at any time.
            </p>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mines Count</label>
              <input
                disabled={isPlaying}
                type="number"
                min="1"
                max="24"
                className={styles.inputBox}
                value={minesCount}
                onChange={(e) => setMinesCount(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Stake Wager</label>
              <input
                disabled={isPlaying}
                type="number"
                className={styles.inputBox}
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
            </div>
          </div>

          {isPlaying ? (
            <button
              disabled={gemsFound === 0}
              className={styles.cashoutBtn}
              onClick={() => handleCashOut()}
            >
              Cash Out (${cashoutValue.toLocaleString()})
            </button>
          ) : (
            <button className={styles.startBtn} onClick={handleStartGame}>
              Place Bet
            </button>
          )}

          {/* Stats Display Panel */}
          <div className={styles.infoBox}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Multiplier:</span>
              <span className={styles.infoValue}>{currentMultiplier}x</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Next Gem Multiplier:</span>
              <span className={styles.infoValue} style={{ color: "#00e676" }}>
                {nextMultiplier}x
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Gems Found:</span>
              <span className={styles.infoValue}>
                {gemsFound} / {25 - minesCount}
              </span>
            </div>
          </div>

          {/* Alerts Feed */}
          {alertMsg && (
            <div
              className={`${styles.alertBox} ${
                alertMsg.isError ? styles.errorAlert : styles.successAlert
              }`}
            >
              {alertMsg.text}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default GameMines;
