"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWallet, Skin } from "../context/WalletContext";
import styles from "./lootbox.module.css";

interface SkinTemplate {
  name: string;
  rarity: Skin["rarity"];
  value: number;
  color: string;
}

const ITEMS: Record<Skin["rarity"], SkinTemplate[]> = {
  common: [
    { name: "Axe | Rusty Shovel", rarity: "common", value: 20, color: "#007aff" },
    { name: "P250 | Sand Dune", rarity: "common", value: 35, color: "#007aff" },
    { name: "Spray | Angry Chicken", rarity: "common", value: 50, color: "#007aff" }
  ],
  rare: [
    { name: "M4A4 | Neo-Noir", rarity: "rare", value: 180, color: "#bd00ff" },
    { name: "Deagle | Blaze", rarity: "rare", value: 220, color: "#bd00ff" },
    { name: "Pickaxe | Candy Axe", rarity: "rare", value: 280, color: "#bd00ff" }
  ],
  legendary: [
    { name: "AK-47 | Asiimov", rarity: "legendary", value: 650, color: "#ff007a" },
    { name: "Scythe | Reaper", rarity: "legendary", value: 800, color: "#ff007a" },
    { name: "Karambit | Crimson Web", rarity: "legendary", value: 950, color: "#ff007a" }
  ],
  exotic: [
    { name: "AWP | Dragon Lore", rarity: "exotic", value: 2500, color: "#ffaa00" },
    { name: "Butterfly Knife | Fade", rarity: "exotic", value: 3800, color: "#ffaa00" },
    { name: "Glider | Renegade Raider", rarity: "exotic", value: 5000, color: "#ffaa00" }
  ]
};

interface Crate {
  id: string;
  name: string;
  cost: number;
  odds: Record<Skin["rarity"], number>; // Sum must be 100
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
  const { balance, setBalance, inventory, addSkinToInventory, sellSkin, addTransaction } = useWallet();
  const [isSpinning, setIsSpinning] = useState(false);
  const [trackItems, setTrackItems] = useState<SkinTemplate[]>([]);
  const [translateX, setTranslateX] = useState(0);
  const [transitionDur, setTransitionDur] = useState(0);
  const [wonItem, setWonItem] = useState<SkinTemplate | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [flashWin, setFlashWin] = useState(false);
  
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Initialize track with static filler items
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
    
    // Scan matching rates
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
      setAlert("Insufficient War Bonds balance to purchase this crate.");
      return;
    }

    setAlert(null);
    setWonItem(null);
    setBalance(balance - crate.cost);
    addTransaction("lootbox", `Purchased Crate: ${crate.name}`, crate.cost, "lose", 0);

    // Build random track array of 40 items
    // Winning item is index 32
    const tempTrack: SkinTemplate[] = [];
    const winningIndex = 32;

    for (let i = 0; i < 42; i++) {
      const rarity = getRandomRarity(crate.odds);
      tempTrack.push(getRandomItemByRarity(rarity));
    }

    setTrackItems(tempTrack);
    setTranslateX(0);
    setTransitionDur(0);

    // Forces layout reflow before triggering translation transitions
    setTimeout(() => {
      // Dimensions mapping:
      // Item: 110px width. Gap: 10px. Width interval = 120px.
      // Viewport width: 700px. Center threshold = 350px.
      // Index 32 start coordinate is 32 * 120 = 3840px.
      // Centered position offset = 3840 - (350 - 55) = 3545px.
      // Add slight offset randomness so pointer stops randomly along the item card
      const itemWidth = 110;
      const gap = 10;
      const step = itemWidth + gap;
      const centerViewport = 350;
      
      const targetBase = winningIndex * step;
      const offsetToCenter = centerViewport - itemWidth / 2;
      const centerTarget = targetBase - offsetToCenter;
      
      // Random offset of -40px to +40px (so item stops off-center)
      const randomOffset = Math.floor(Math.random() * 80) - 40;
      const finalTranslate = - (centerTarget + randomOffset);

      setTransitionDur(4.0); // 4 seconds spin
      setTranslateX(finalTranslate);
      setIsSpinning(true);
    }, 50);

    // Handle resolution
    setTimeout(() => {
      setIsSpinning(false);
      const won = tempTrack[winningIndex];
      setWonItem(won);
      if (won.rarity === "legendary" || won.rarity === "exotic") {
        setFlashWin(true);
        setTimeout(() => setFlashWin(false), 2500);
      }
    }, 4100);
  };

  const handleSellWonItem = () => {
    if (!wonItem) return;
    setBalance(balance + wonItem.value);
    addTransaction("lootbox", `Sold Won Item: ${wonItem.name}`, 0, "win", wonItem.value);
    setWonItem(null);
    setAlert(`Sold ${wonItem.name} for ${wonItem.value} War Bonds!`);
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
    setAlert(`Saved ${wonItem.name} to your Inventory!`);
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className={styles.container}>
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
              Open Case
            </button>
          </div>
        ))}
      </div>

      {alert && (
        <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.15)", color: "var(--color-primary)", textAlign: "center", fontSize: "0.9rem" }}>
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
                  style={{ background: `rgba(${item.rarity === "exotic" ? "255,170,0" : item.rarity === "legendary" ? "255,0,122" : item.rarity === "rare" ? "189,0,255" : "0,122,255"}, 0.15)` }}
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
                Keep Skin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Management Panel */}
      <div className={styles.inventorySection}>
        <div className={styles.inventoryHeader}>
          <h3 className={styles.inventoryTitle}>Your Skin Inventory</h3>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            {inventory.length} Skins collected (Total Value: {inventory.reduce((sum, s) => sum + s.value, 0).toLocaleString()} $)
          </span>
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
              Your inventory is empty. Open some crates to collect skins!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default GameLootbox;
