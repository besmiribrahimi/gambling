"use client";

import React, { useState, useEffect } from "react";
import useWager from "../hooks/useWager";
import sound from "../lib/sound";
import styles from "./mines.module.css";

interface TileState {
  id: number;
  isRevealed: boolean;
  hasMine: boolean;
}

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let p = 1;
  for (let i = 1; i <= k; i++) {
    p = (p * (n - i + 1)) / i;
  }
  return Math.round(p);
}

function getMinesMultiplier(minesCount: number, gemsFound: number): number {
  if (gemsFound <= 0) return 1.0;
  
  const totalTiles = 25;
  const totalGems = totalTiles - minesCount;
  
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
  const [betAmount, setBetAmount] = useState<string>("50");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [board, setBoard] = useState<TileState[]>([]);
  const [gemsFound, setGemsFound] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isCashout, setIsCashout] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [flashWin, setFlashWin] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const initialBoard = Array.from({ length: 25 }, (_, idx) => ({
      id: idx,
      isRevealed: false,
      hasMine: false
    }));
    setBoard(initialBoard);
  }, []);

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

    const placed = placeWager(amt);
    if (!placed) return;

    sound.playChip();
    setAlertMsg(null);
    setGemsFound(0);
    setIsGameOver(false);
    setIsCashout(false);
    setIsPlaying(true);

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

    const updatedBoard = board.map((t) => (t.id === tileId ? { ...t, isRevealed: true } : t));
    setBoard(updatedBoard);

    if (tile.hasMine) {
      // Hit a mine!
      setIsGameOver(true);
      setIsPlaying(false);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      revealAllMines(updatedBoard);
      sound.playExplosion();
      
      const amt = parseFloat(betAmount);
      setAlertMsg({ text: "Explosion! You detonated a mine. Wager lost.", isError: true });
      resolveWager(amt, 0, false, "mines", `Lost Mines: hit mine with ${minesCount} mines on grid`);
    } else {
      // Gem found!
      const nextGemsCount = gemsFound + 1;
      setGemsFound(nextGemsCount);
      sound.playGem(nextGemsCount);

      const maxGems = 25 - minesCount;
      if (nextGemsCount === maxGems) {
        handleCashOut(updatedBoard, nextGemsCount);
      }
    }
  };

  // Auto-pick random unrevealed tile
  const handleAutoPick = () => {
    if (!isPlaying || isGameOver || isCashout) return;
    const unrevealedTiles = board.filter((t) => !t.isRevealed);
    if (unrevealedTiles.length === 0) return;
    const randomTile = unrevealedTiles[Math.floor(Math.random() * unrevealedTiles.length)];
    handleRevealTile(randomTile.id);
  };

  const revealAllMines = (currentBoard: TileState[]) => {
    setBoard(
      currentBoard.map((t) => (t.hasMine ? { ...t, isRevealed: true } : t))
    );
  };

  const handleCashOut = (currentBoard = board, currentGemsCount = gemsFound) => {
    if (!isPlaying || isGameOver || isCashout) return;

    setFlashWin(true);
    setTimeout(() => setFlashWin(false), 2000);

    setIsCashout(true);
    setIsPlaying(false);
    revealAllMines(currentBoard);

    const amt = parseFloat(betAmount);
    const multiplier = getMinesMultiplier(minesCount, currentGemsCount);
    const payout = Math.round(amt * multiplier);

    sound.playWin();
    setAlertMsg({
      text: `Cash out successful! Multiplier: ${multiplier}x (+${payout} War Bonds)!`,
      isError: false
    });

    resolveWager(
      amt,
      payout,
      true,
      "mines",
      `Won Mines: found ${currentGemsCount} gems (${multiplier}x)`
    );
  };

  const currentMultiplier = getMinesMultiplier(minesCount, gemsFound);
  const nextMultiplier = getMinesMultiplier(minesCount, gemsFound + 1);
  const cashoutValue = Math.round(parseFloat(betAmount || "0") * currentMultiplier);

  const handleAddChip = (val: number) => {
    if (isPlaying) return;
    const cur = parseInt(betAmount || "0");
    const next = isNaN(cur) ? val : cur + val;
    setBetAmount(Math.min(next, balance).toString());
    sound.playChip();
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameLayout}>
        
        {/* Grid Arena */}
        <div className={`${styles.gridArena} ${flashWin ? "flashWinner" : ""} ${isShaking ? "shake-animation" : ""}`}>
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

          {isPlaying && (
            <button
              onClick={handleAutoPick}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1.2rem",
                borderRadius: "6px",
                background: "rgba(0, 240, 255, 0.12)",
                border: "1px solid rgba(0, 240, 255, 0.3)",
                color: "#00f0ff",
                fontFamily: "var(--font-family-title)",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer"
              }}
            >
              🎲 Auto-Pick Random Tile
            </button>
          )}
        </div>

        {/* Wager Panel */}
        <div className={styles.wagerPanel}>
          <div>
            <h2 className={styles.title}>Trench Mines</h2>
            <p className={styles.subtitle}>
              Unearth buried gems. Stay clear of hidden mines. Cash out anytime with accumulated multipliers.
            </p>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mines Count (1-24)</label>
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
              <label className={styles.inputLabel}>Stake Amount</label>
              <input
                disabled={isPlaying}
                type="number"
                className={styles.inputBox}
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Chips Shortcuts */}
          {!isPlaying && (
            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
              <button className="casino-chip chip-white" onClick={() => handleAddChip(10)}>10</button>
              <button className="casino-chip chip-red" onClick={() => handleAddChip(50)}>50</button>
              <button className="casino-chip chip-blue" onClick={() => handleAddChip(100)}>100</button>
              <button className="casino-chip chip-purple" onClick={() => handleAddChip(500)}>500</button>
              <button className="casino-chip chip-gold" onClick={() => handleAddChip(1000)}>1k</button>
            </div>
          )}

          {isPlaying ? (
            <button
              disabled={gemsFound === 0}
              className={styles.cashoutBtn}
              onClick={() => handleCashOut()}
            >
              Cash Out (${cashoutValue.toLocaleString()} @ {currentMultiplier}x)
            </button>
          ) : (
            <button className={styles.startBtn} onClick={handleStartGame}>
              Place Bet (${betAmount || 0})
            </button>
          )}

          {/* Stats Display Panel */}
          <div className={styles.infoBox}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Current Multiplier:</span>
              <span className={styles.infoValue} style={{ color: "#00f0ff" }}>{currentMultiplier}x</span>
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
