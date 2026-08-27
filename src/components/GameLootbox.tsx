"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWallet, Skin } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./lootbox.module.css";

interface SkinTemplate {
  name: string;
  rarity: Skin["rarity"];
  value: number;
  color: string;
}

const ITEMS: Record<Skin["rarity"], SkinTemplate[]> = {
  common: [
    { name: "Axe | Rusty Trench Shovel", rarity: "common", value: 25, color: "#007aff" },
    { name: "P250 | Sand Dune", rarity: "common", value: 40, color: "#007aff" },
    { name: "Spray | Angry Kaiser", rarity: "common", value: 60, color: "#007aff" }
  ],
  rare: [
    { name: "M4A4 | Neo-Noir", rarity: "rare", value: 190, color: "#bd00ff" },
    { name: "Deagle | Blaze", rarity: "rare", value: 240, color: "#bd00ff" },
    { name: "Pickaxe | Trench Raider", rarity: "rare", value: 320, color: "#bd00ff" }
  ],
  legendary: [
    { name: "AK-47 | Asiimov", rarity: "legendary", value: 750, color: "#ff007a" },
    { name: "Scythe | Reaper Blade", rarity: "legendary", value: 950, color: "#ff007a" },
    { name: "Karambit | Crimson Web", rarity: "legendary", value: 1200, color: "#ff007a" }
  ],
  exotic: [
    { name: "AWP | Dragon Lore", rarity: "exotic", value: 2800, color: "#ffaa00" },
    { name: "Butterfly Knife | Fade", rarity: "exotic", value: 4200, color: "#ffaa00" },
    { name: "Glider | Renegade Raider", rarity: "exotic", value: 6000, color: "#ffaa00" }
  ]
};

interface Crate {
  id: string;
  name: string;
  cost: number;
  odds: Record<Skin["rarity"], number>;
}

const CRATES: Crate[] = [
  {
    id: "recruit",
    name: "Recruit Crate",
    cost: 100,
    odds: { common: 75, rare: 22, legendary: 3, exotic: 0 }
  },
  {
    id: "operator",
    name: "Operator Crate",
    cost: 450,
    odds: { common: 25, rare: 60, legendary: 13, exotic: 2 }
  },
  {
    id: "challenger",
    name: "Challenger Crate",
    cost: 1500,
    odds: { common: 0, rare: 35, legendary: 50, exotic: 15 }
  }
];

export const GameLootbox: React.FC = () => {
  const { balance, setBalance, inventory, addSkinToInventory, sellSkin, sellMultipleSkins, addTransaction } = useWallet();
  const [isSpinning, setIsSpinning] = useState(false);
  const [fastOpen, setFastOpen] = useState(false);
  const [trackItems, setTrackItems] = useState<SkinTemplate[]>([]);
  const [translateX, setTranslateX] = useState(0);
  const [transitionDur, setTransitionDur] = useState(0);
  const [wonItem, setWonItem] = useState<SkinTemplate | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [flashWin, setFlashWin] = useState(false);
  
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const filler: SkinTemplate[] = [];
    for (let i = 0; i < 15; i++) {
      filler.push(getRandomItemByRarity("common"));
    }
    setTrackItems(filler);
  }, []);

  const getRandomRarity = (odds: Record<Skin["rarity"], number>): Skin["rarity"] => {
    const r = Math.random() * 100;
    let sum = 0;
    const rarities: Skin["rarity"][] = ["common", "rare", "legendary", "exotic"];
    for (const key of rarities) {
      sum += odds[key];
      if (r <= sum) return key;
    }
    return "common";
  };

  const getRandomItemByRarity = (rarity: Skin["rarity"]): SkinTemplate => {
    const list = ITEMS[rarity];
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  };

  const handleOpenCrate = (crate: Crate) => {
    if (isSpinning) return;
    if (balance < crate.cost) {
      setAlert("Insufficient War Bonds balance to open this crate.");
      return;
    }

    sound.playChip();
    setAlert(null);
    setWonItem(null);
    setBalance((prev) => prev - crate.cost);
    addTransaction("lootbox", `Purchased Crate: ${crate.name}`, crate.cost, "lose", 0);

    const winningIndex = 32;
    const tempTrack: SkinTemplate[] = [];

    for (let i = 0; i < 42; i++) {
      const rarity = getRandomRarity(crate.odds);
      tempTrack.push(getRandomItemByRarity(rarity));
    }

    setTrackItems(tempTrack);
    const won = tempTrack[winningIndex];

    if (fastOpen) {
      // Instant resolution
      setWonItem(won);
      if (won.rarity === "legendary" || won.rarity === "exotic") {
        setFlashWin(true);
        setTimeout(() => setFlashWin(false), 2500);
        sound.playJackpot();
      } else {
        sound.playWin();
      }
      return;
    }

    setTranslateX(0);
    setTransitionDur(0);

    setTimeout(() => {
      const itemWidth = 110;
      const gap = 10;
      const step = itemWidth + gap;
      const centerViewport = 350;
      
      const targetBase = winningIndex * step;
      const offsetToCenter = centerViewport - itemWidth / 2;
      const centerTarget = targetBase - offsetToCenter;
      
      const randomOffset = Math.floor(Math.random() * 80) - 40;
      const finalTranslate = - (centerTarget + randomOffset);

      setTransitionDur(3.8);
      setTranslateX(finalTranslate);
      setIsSpinning(true);

      // Play tick sounds as cards scroll past
      for (let i = 0; i < 28; i++) {
        setTimeout(() => {
          sound.playCrateTick();
        }, i * (120 + i * 4));
      }
    }, 50);

    setTimeout(() => {
      setIsSpinning(false);
      setWonItem(won);
      if (won.rarity === "legendary" || won.rarity === "exotic") {
        setFlashWin(true);
        setTimeout(() => setFlashWin(false), 2500);
        sound.playJackpot();
      } else {
        sound.playWin();
      }
    }, 3900);
  };

  const handleSellWonItem = () => {
    if (!wonItem) return;
    setBalance((prev) => prev + wonItem.value);
    addTransaction("lootbox", `Sold Won Item: ${wonItem.name}`, 0, "win", wonItem.value);
    sound.playCoinLand();
    setWonItem(null);
    setAlert(`Sold ${wonItem.name} for +${wonItem.value} War Bonds!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleKeepWonItem = () => {
    if (!wonItem) return;
    addSkinToInventory({
      name: wonItem.name,
      rarity: wonItem.rarity,
      value: wonItem.value,
      color: wonItem.color
    });
    setWonItem(null);
    sound.playWin();
    setAlert(`Saved ${wonItem.name} to your Inventory Vault!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSellAllCommonRare = () => {
    const commonRareIds = inventory
      .filter((s) => s.rarity === "common" || s.rarity === "rare")
      .map((s) => s.id);
    
    if (commonRareIds.length === 0) {
      setAlert("No Common or Rare skins in inventory.");
      setTimeout(() => setAlert(null), 2500);
      return;
    }

    const { count, total } = sellMultipleSkins(commonRareIds);
    setAlert(`Liquidated ${count} Common/Rare skins for +${total} War Bonds!`);
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className={styles.container}>
      {/* Case Selections Header with Fast Open Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-family-title)", fontSize: "1.4rem", fontWeight: 800 }}>Trench Crate Opener</h2>
          <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>Unlock weapon finishes and trade for instant War Bonds</span>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", color: fastOpen ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            checked={fastOpen}
            onChange={(e) => setFastOpen(e.target.checked)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          ⚡ Fast Open (Skip Animation)
        </label>
      </div>

      {/* Case Selections */}
      <div className={styles.casesRow}>
        {CRATES.map((crate) => (
          <div key={crate.id} className={styles.caseCard}>
            <span className={styles.caseCost}>{crate.cost.toLocaleString()} War Bonds</span>
            <h3 className={styles.caseTitle}>{crate.name}</h3>
            
            <div className={styles.oddsBox}>
              <span className={styles.oddsDot} style={{ color: "#007aff" }}>C: {crate.odds.common}%</span>
              <span className={styles.oddsDot} style={{ color: "#bd00ff" }}>R: {crate.odds.rare}%</span>
              <span className={styles.oddsDot} style={{ color: "#ff007a" }}>L: {crate.odds.legendary}%</span>
              <span className={styles.oddsDot} style={{ color: "#ffaa00" }}>E: {crate.odds.exotic}%</span>
            </div>

            <button
              className={styles.buyCaseBtn}
              onClick={() => handleOpenCrate(crate)}
              disabled={isSpinning || wonItem !== null}
            >
              Open Case (${crate.cost})
            </button>
          </div>
        ))}
      </div>

      {alert && (
        <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(0, 240, 255, 0.08)", border: "1px solid rgba(0, 240, 255, 0.2)", color: "var(--color-primary)", textAlign: "center", fontSize: "0.9rem", fontWeight: 700 }}>
          {alert}
        </div>
      )}

      {/* Case Opener Spinner */}
      <div className={`${styles.spinnerSection} ${flashWin ? "flashWinner" : ""}`}>
        <div className={styles.spinnerViewport}>
          <div className={styles.spinnerCenterLine} />
          
          <div
            ref={trackRef}
            className={styles.spinnerTrack}
            style={{
              transform: `translateX(${translateX}px)`,
              transition: isSpinning ? `transform ${transitionDur}s cubic-bezier(0.12, 0.8, 0.15, 1.0)` : "none"
            }}
          >
            {trackItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`${styles.spinnerItem} ${styles[item.rarity]}`}
              >
                <span className={styles.itemLabel}>{item.name}</span>
                <span 
                  className={styles.itemRarityBadge}
                  style={{ background: `rgba(${item.rarity === "exotic" ? "255,170,0" : item.rarity === "legendary" ? "255,0,122" : item.rarity === "rare" ? "189,0,255" : "0,122,255"}, 0.18)` }}
                >
                  {item.rarity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Won item announcement */}
        {wonItem && (
          <div className={styles.resultBanner}>
            <span className={styles.wonTitle}>Unboxed Item</span>
            <div className={styles.wonSkinName} style={{ color: wonItem.color }}>{wonItem.name}</div>
            
            <div className={styles.resultBtns}>
              <button className={`${styles.resultBtn} ${styles.sellBtn}`} onClick={handleSellWonItem}>
                Sell for {wonItem.value} $
              </button>
              <button className={`${styles.resultBtn} ${styles.keepBtn}`} onClick={handleKeepWonItem}>
                Keep Skin in Vault
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Management Panel */}
      <div className={styles.inventorySection}>
        <div className={styles.inventoryHeader}>
          <div>
            <h3 className={styles.inventoryTitle}>Your Skin Inventory Vault</h3>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {inventory.length} Skins collected (Total Value: {inventory.reduce((sum, s) => sum + s.value, 0).toLocaleString()} $)
            </span>
          </div>

          {inventory.length > 0 && (
            <button
              onClick={handleSellAllCommonRare}
              style={{
                background: "rgba(255, 23, 68, 0.15)",
                border: "1px solid var(--color-danger)",
                color: "var(--color-danger)",
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                fontFamily: "var(--font-family-title)",
                fontSize: "0.75rem",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              Sell All Common/Rare
            </button>
          )}
        </div>

        <div className={styles.inventoryGrid}>
          {inventory.length > 0 ? (
            inventory.map((skin) => (
              <div key={skin.id} className={styles.invCard} style={{ borderBottom: `4px solid ${skin.color}` }}>
                <span style={{ fontSize: "0.6rem", fontWeight: "800", color: skin.color, textTransform: "uppercase" }}>{skin.rarity}</span>
                <span className={styles.itemLabel} style={{ color: "#fff", fontWeight: "600" }}>{skin.name}</span>
                <button className={styles.invSellBtn} onClick={() => sellSkin(skin.id)}>
                  Sell (+{skin.value} $)
                </button>
              </div>
            ))
          ) : (
            <div className={styles.emptyInventory}>
              Your inventory is empty. Open some crates to collect tactical skins!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameLootbox;
