"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import sound from "../lib/sound";

export interface Skin {
  id: string;
  name: string;
  rarity: "common" | "rare" | "legendary" | "exotic";
  value: number;
  color: string;
}

export type GameType = "bet" | "crash" | "coinflip" | "lootbox" | "mines" | "slots" | "plinko" | "blackjack";

export interface Wager {
  id: string;
  type: GameType;
  description: string;
  amount: number;
  result: "win" | "lose" | "pending";
  payout: number;
  date: string;
}

export interface EsportsMatch {
  id: string;
  game: string;
  teamA: string;
  teamB: string;
  oddsA: number;
  oddsB: number;
  status: "live" | "upcoming" | "completed";
  winner: "teamA" | "teamB" | "none";
  time: string;
  volumeA?: number;
  volumeB?: number;
}

export interface VipTier {
  name: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Obsidian";
  level: number;
  color: string;
  badge: string;
  rakebackRate: number; // e.g. 0.01 = 1%
  minXp: number;
  maxXp: number;
}

export interface BigWinPayload {
  game: string;
  multiplier: number;
  wager: number;
  payout: number;
}

export interface UserProfile {
  id: string;
  username: string;
  role: "admin" | "user";
  discord?: string;
  roblox?: string;
  isGuest?: boolean;
  isVerified?: boolean;
  preferences?: {
    avatar?: string;
    bio?: string;
  };
}

interface WalletContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  isDailyModalOpen: boolean;
  setIsDailyModalOpen: (open: boolean) => void;
  isFairModalOpen: boolean;
  setIsFairModalOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isVerificationModalOpen: boolean;
  setIsVerificationModalOpen: (open: boolean) => void;
  loginUser: (userData: { id: string; username: string; role?: "admin" | "user"; discord?: string; roblox?: string; isGuest?: boolean; isVerified?: boolean; balance: number; inventory?: Skin[]; history?: Wager[]; lastClaimTime?: number | null }) => void;
  logoutUser: () => void;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  inventory: Skin[];
  wagerHistory: Wager[];
  matches: EsportsMatch[];
  lastClaimTime: number | null;
  dailyStreak: number;
  rakebackBalance: number;
  totalWagered: number;
  vipTier: VipTier;
  vipProgress: number; // 0 to 100%
  bigWinModal: BigWinPayload | null;
  triggerBigWin: (payload: BigWinPayload) => void;
  closeBigWin: () => void;
  claimDailyWheel: (prize: number) => { success: boolean; message: string; prize: number; streakBonus: number };
  claimRakeback: () => { success: boolean; message: string; amount: number };
  placeMatchBet: (matchId: string, team: "teamA" | "teamB", amount: number) => { success: boolean; message: string };
  resolveMatch: (matchId: string, winner: "teamA" | "teamB") => void;
  addTransaction: (type: GameType, description: string, amount: number, result: Wager["result"], payout: number) => void;
  sellSkin: (skinId: string) => void;
  sellMultipleSkins: (skinIds: string[]) => { count: number; total: number };
  addSkinToInventory: (skin: Omit<Skin, "id">) => void;
  resetAllData: () => void;
}

export const VIP_TIERS: VipTier[] = [
  { name: "Bronze", level: 1, color: "#cd7f32", badge: "🥉", rakebackRate: 0.005, minXp: 0, maxXp: 1000 },
  { name: "Silver", level: 2, color: "#c0c0c0", badge: "🥈", rakebackRate: 0.01, minXp: 1000, maxXp: 5000 },
  { name: "Gold", level: 3, color: "#ffd700", badge: "🥇", rakebackRate: 0.015, minXp: 5000, maxXp: 20000 },
  { name: "Platinum", level: 4, color: "#00f0ff", badge: "💎", rakebackRate: 0.02, minXp: 20000, maxXp: 50000 },
  { name: "Diamond", level: 5, color: "#bd00ff", badge: "👑", rakebackRate: 0.025, minXp: 50000, maxXp: 100000 },
  { name: "Obsidian", level: 6, color: "#ff007a", badge: "🔥", rakebackRate: 0.03, minXp: 100000, maxXp: 500000 }
];

const DEFAULT_MATCHES: EsportsMatch[] = [
  { 
    id: "c1", 
    game: "Entrenched League V - Match A", 
    teamA: "YES (DK Wins)", 
    teamB: "NO (IA Wins/Draws)", 
    oddsA: 1.65, 
    oddsB: 2.25, 
    status: "live", 
    winner: "none", 
    time: "Will DK [ELITE] defeat IA [TOP MID] in the Battle of Verdun?",
    volumeA: 14500,
    volumeB: 8900
  },
  { 
    id: "c2", 
    game: "Entrenched League V - Match B", 
    teamA: "YES (AH Wins)", 
    teamB: "NO (NYS Wins/Draws)", 
    oddsA: 1.85, 
    oddsB: 1.95, 
    status: "live", 
    winner: "none", 
    time: "Will AH [ELITE] successfully defend against NYS [TOP MID] at the Somme frontline?",
    volumeA: 11200,
    volumeB: 12800
  },
  { 
    id: "c3", 
    game: "Entrenched League V - Match C", 
    teamA: "YES (TWA Wins)", 
    teamB: "NO (TTI 3 Wins/Draws)", 
    oddsA: 1.75, 
    oddsB: 2.10, 
    status: "upcoming", 
    winner: "none", 
    time: "Will TWA [TOP MID] capture the Galicia sector from TTI 3 [MID]?",
    volumeA: 4500,
    volumeB: 3200
  },
  { 
    id: "c4", 
    game: "Entrenched League V - Match D", 
    teamA: "YES (CZSK Wins)", 
    teamB: "NO (RRF Wins/Draws)", 
    oddsA: 1.50, 
    oddsB: 2.50, 
    status: "upcoming", 
    winner: "none", 
    time: "Will CZSK [MID] hold the Gallipoli trenches against RRF [LOW MID]?",
    volumeA: 6200,
    volumeB: 2100
  }
];

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isFairModalOpen, setIsFairModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [bigWinModal, setBigWinModal] = useState<BigWinPayload | null>(null);

  const [balance, setBalance] = useState<number>(1000);
  const [inventory, setInventory] = useState<Skin[]>([]);
  const [wagerHistory, setWagerHistory] = useState<Wager[]>([]);
  const [matches, setMatches] = useState<EsportsMatch[]>(DEFAULT_MATCHES);
  const [lastClaimTime, setLastClaimTime] = useState<number | null>(null);
  const [dailyStreak, setDailyStreak] = useState<number>(1);
  const [rakebackBalance, setRakebackBalance] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const isAdmin = user?.role === "admin";

  // Calculate total wagered volume
  const totalWagered = useMemo(() => {
    return wagerHistory.reduce((sum, w) => sum + (w.amount || 0), 0);
  }, [wagerHistory]);

  // Determine VIP Tier & XP Progress
  const { vipTier, vipProgress } = useMemo(() => {
    let currentTier = VIP_TIERS[0];
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
      if (totalWagered >= VIP_TIERS[i].minXp) {
        currentTier = VIP_TIERS[i];
        break;
      }
    }
    const xpInTier = totalWagered - currentTier.minXp;
    const tierSpan = currentTier.maxXp - currentTier.minXp;
    const progress = Math.min(100, Math.max(0, Math.round((xpInTier / tierSpan) * 100)));
    return { vipTier: currentTier, vipProgress: progress };
  }, [totalWagered]);

  // Load state on mount: Session check -> fallback to localStorage
  useEffect(() => {
    // 1. Immediate client-side cache restoration
    try {
      const cached = localStorage.getItem("cw_user_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) {
          setUser(parsed);
          if (typeof parsed.balance === "number") setBalance(parsed.balance);
        }
      }
    } catch (e) {}

    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.loggedIn && data.user) {
          const freshUser: UserProfile = {
            id: data.user.id,
            username: data.user.username,
            role: data.user.role || "user",
            discord: data.user.discord,
            roblox: data.user.roblox,
            isGuest: false,
            isVerified: !!data.user.isVerified
          };
          setUser(freshUser);
          try {
            localStorage.setItem("cw_user_cache", JSON.stringify({ ...freshUser, balance: data.user.balance }));
          } catch (e) {}
          setBalance(data.user.balance ?? 1000);
          setInventory(data.user.inventory || []);
          setWagerHistory(data.user.history || []);
          setLastClaimTime(data.user.lastClaimTime ?? null);
        } else if (data.error === "Account banned.") {
          localStorage.removeItem("cw_user_cache");
          setUser(null);
        } else {
          const cached = localStorage.getItem("cw_user_cache");
          if (!cached) {
            setUser(null);
            const storedBalance = localStorage.getItem("cw_balance");
            const storedInventory = localStorage.getItem("cw_inventory");
            const storedHistory = localStorage.getItem("cw_history");
            const storedMatches = localStorage.getItem("cw_matches");
            const storedClaim = localStorage.getItem("cw_last_claim");
            const storedStreak = localStorage.getItem("cw_daily_streak");
            const storedRakeback = localStorage.getItem("cw_rakeback");

            if (storedBalance !== null) setBalance(Number(storedBalance));
            if (storedInventory !== null) setInventory(JSON.parse(storedInventory));
            if (storedHistory !== null) setWagerHistory(JSON.parse(storedHistory));
            if (storedMatches !== null) setMatches(JSON.parse(storedMatches));
            if (storedClaim !== null) setLastClaimTime(Number(storedClaim));
            if (storedStreak !== null) setDailyStreak(Number(storedStreak));
            if (storedRakeback !== null) setRakebackBalance(Number(storedRakeback));
          }
        }
      } catch (error) {
        console.error("Auth Me check failed:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchSession();
  }, []);

  // Sync state to backend DB (if logged in) or localStorage (if guest)
  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      const timer = setTimeout(async () => {
        try {
          await fetch("/api/user/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              balance,
              inventory,
              history: wagerHistory,
              lastClaimTime
            })
          });
        } catch (e) {
          console.error("State sync failed:", e);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      localStorage.setItem("cw_balance", balance.toString());
      localStorage.setItem("cw_inventory", JSON.stringify(inventory));
      localStorage.setItem("cw_history", JSON.stringify(wagerHistory));
      localStorage.setItem("cw_matches", JSON.stringify(matches));
      localStorage.setItem("cw_daily_streak", dailyStreak.toString());
      localStorage.setItem("cw_rakeback", rakebackBalance.toString());
      if (lastClaimTime !== null) {
        localStorage.setItem("cw_last_claim", lastClaimTime.toString());
      }
    }
  }, [balance, inventory, wagerHistory, matches, lastClaimTime, dailyStreak, rakebackBalance, isLoaded, user]);

  const loginUser = (userData: { id: string; username: string; role?: "admin" | "user"; discord?: string; roblox?: string; isGuest?: boolean; isVerified?: boolean; balance: number; inventory?: Skin[]; history?: Wager[]; lastClaimTime?: number | null }) => {
    const freshUser: UserProfile = {
      id: userData.id,
      username: userData.username,
      role: userData.role || "user",
      discord: userData.discord,
      roblox: userData.roblox,
      isGuest: userData.isGuest || false,
      isVerified: userData.isVerified || false
    };
    setUser(freshUser);
    try {
      localStorage.setItem("cw_user_cache", JSON.stringify(freshUser));
    } catch (e) {}

    setBalance(userData.balance ?? 1000);
    setInventory(userData.inventory || []);
    setWagerHistory(userData.history || []);
    setLastClaimTime(userData.lastClaimTime ?? null);
  };

  const logoutUser = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("cw_user_cache");
      setUser(null);
      setBalance(1000);
      setInventory([]);
      setWagerHistory([]);
      setLastClaimTime(null);
      setRakebackBalance(0);
      setDailyStreak(1);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const triggerBigWin = useCallback((payload: BigWinPayload) => {
    setBigWinModal(payload);
    sound.playJackpot();
  }, []);

  const closeBigWin = useCallback(() => {
    setBigWinModal(null);
  }, []);

  const addTransaction = useCallback((
    type: GameType,
    description: string,
    amount: number,
    result: Wager["result"],
    payout: number
  ) => {
    const newTx: Wager = {
      id: "tx_" + Math.random().toString(36).substring(2, 11),
      type,
      description,
      amount,
      result,
      payout,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString()
    };

    setWagerHistory((prev) => [newTx, ...prev]);

    // Accumulate rakeback (wager * tier rakeback rate)
    if (amount > 0) {
      const rakebackEarned = Math.max(0.1, amount * vipTier.rakebackRate);
      setRakebackBalance((prev) => parseFloat((prev + rakebackEarned).toFixed(2)));
    }

    // Trigger big win celebration if multiplier >= 5x and payout >= 100
    if (result === "win" && payout >= amount * 5 && payout >= 100) {
      const mult = amount > 0 ? parseFloat((payout / amount).toFixed(2)) : 5.0;
      triggerBigWin({
        game: type.toUpperCase(),
        multiplier: mult,
        wager: amount,
        payout
      });
    }
  }, [vipTier.rakebackRate, triggerBigWin]);

  const claimDailyWheel = useCallback((basePrize: number) => {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (lastClaimTime && now - lastClaimTime < cooldown) {
      const remainingMs = cooldown - (now - lastClaimTime);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        success: false,
        message: `Wheel on cooldown: ${hours}h ${minutes}m remaining.`,
        prize: 0,
        streakBonus: 0
      };
    }

    // Determine streak continuity (if claimed within 48 hours, streak increments, else resets)
    let nextStreak = dailyStreak;
    if (lastClaimTime && now - lastClaimTime < 48 * 60 * 60 * 1000) {
      nextStreak = Math.min(7, dailyStreak + 1);
    } else if (lastClaimTime) {
      nextStreak = 1;
    }

    // Streak bonus: +10% per day above Day 1 (up to +60% on Day 7)
    const streakBonusPct = (nextStreak - 1) * 0.1;
    const totalWon = Math.round(basePrize * (1 + streakBonusPct));

    setBalance((prev) => prev + totalWon);
    setLastClaimTime(now);
    setDailyStreak(nextStreak);
    addTransaction("lootbox", `Daily Lucky Wheel (Day ${nextStreak} Streak: +${Math.round(streakBonusPct * 100)}%)`, 0, "win", totalWon);
    sound.playJackpot();

    return {
      success: true,
      message: `Claimed ${totalWon} War Bonds! (Day ${nextStreak} Streak Bonus active)`,
      prize: totalWon,
      streakBonus: Math.round(streakBonusPct * 100)
    };
  }, [lastClaimTime, dailyStreak, addTransaction]);

  const claimRakeback = useCallback(() => {
    if (rakebackBalance <= 0) {
      return { success: false, message: "No rakeback currently accumulated.", amount: 0 };
    }

    const amt = Math.floor(rakebackBalance);
    if (amt <= 0) {
      return { success: false, message: "Minimum rakeback claim is 1 War Bond.", amount: 0 };
    }

    setBalance((prev) => prev + amt);
    setRakebackBalance((prev) => parseFloat((prev - amt).toFixed(2)));
    addTransaction("bet", `VIP Vault Rakeback Claim (${vipTier.name} Tier)`, 0, "win", amt);
    sound.playWin();

    return {
      success: true,
      message: `Successfully collected ${amt} War Bonds in VIP Rakeback!`,
      amount: amt
    };
  }, [rakebackBalance, vipTier.name, addTransaction]);

  const placeMatchBet = useCallback((matchId: string, team: "teamA" | "teamB", amount: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return { success: false, message: "Please sign in or register to place tournament predictions!" };
    }
    if (amount <= 0) {
      return { success: false, message: "Enter a valid bet amount." };
    }
    if (balance < amount) {
      return { success: false, message: "Insufficient War Bonds balance." };
    }

    const match = matches.find((m) => m.id === matchId);
    if (!match) return { success: false, message: "Contract not found." };
    if (match.status === "completed") {
      return { success: false, message: "Contract has already settled." };
    }

    const selectedTeamName = team === "teamA" ? match.teamA : match.teamB;

    setBalance((prev) => prev - amount);
    addTransaction(
      "bet",
      `Staked ${selectedTeamName} on ${match.game} prediction`,
      amount,
      "pending",
      0
    );
    sound.playChip();

    return { success: true, message: `Successfully staked ${amount} War Bonds on ${selectedTeamName}!` };
  }, [balance, matches, addTransaction]);

  const resolveMatch = useCallback((matchId: string, winner: "teamA" | "teamB") => {
    const match = matches.find((m) => m.id === matchId);
    if (!match || match.status === "completed") return;

    const winnerName = winner === "teamA" ? match.teamA : match.teamB;
    const odds = winner === "teamA" ? match.oddsA : match.oddsB;

    setMatches((prevMatches) =>
      prevMatches.map((m) =>
        m.id === matchId ? { ...m, status: "completed", winner } : m
      )
    );

    setWagerHistory((prevHistory) =>
      prevHistory.map((w) => {
        if (w.type === "bet" && w.result === "pending" && w.description.includes(winnerName)) {
          const payoutAmount = Math.round(w.amount * odds);
          setBalance((prev) => prev + payoutAmount);
          return { ...w, result: "win", payout: payoutAmount };
        } else if (w.type === "bet" && w.result === "pending" && (w.description.includes(match.teamA) || w.description.includes(match.teamB))) {
          return { ...w, result: "lose", payout: 0 };
        }
        return w;
      })
    );
  }, [matches]);

  const sellSkin = useCallback((skinId: string) => {
    const skin = inventory.find((s) => s.id === skinId);
    if (!skin) return;

    setBalance((prev) => prev + skin.value);
    setInventory((prev) => prev.filter((s) => s.id !== skinId));
    addTransaction("lootbox", `Sold Skin: ${skin.name}`, 0, "win", skin.value);
    sound.playCoinLand();
  }, [inventory, addTransaction]);

  const sellMultipleSkins = useCallback((skinIds: string[]) => {
    const skinsToSell = inventory.filter((s) => skinIds.includes(s.id));
    if (skinsToSell.length === 0) return { count: 0, total: 0 };

    const totalValue = skinsToSell.reduce((sum, s) => sum + s.value, 0);
    setBalance((prev) => prev + totalValue);
    setInventory((prev) => prev.filter((s) => !skinIds.includes(s.id)));
    addTransaction("lootbox", `Bulk Sold ${skinsToSell.length} Skins`, 0, "win", totalValue);
    sound.playJackpot();

    return { count: skinsToSell.length, total: totalValue };
  }, [inventory, addTransaction]);

  const addSkinToInventory = useCallback((skin: Omit<Skin, "id">) => {
    const newSkin: Skin = {
      ...skin,
      id: "skin_" + Math.random().toString(36).substring(2, 11)
    };
    setInventory((prev) => [newSkin, ...prev]);
  }, []);

  const resetAllData = useCallback(() => {
    setBalance(1000);
    setInventory([]);
    setWagerHistory([]);
    setMatches(DEFAULT_MATCHES);
    setLastClaimTime(null);
    setDailyStreak(1);
    setRakebackBalance(0);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cw_balance");
      localStorage.removeItem("cw_inventory");
      localStorage.removeItem("cw_history");
      localStorage.removeItem("cw_matches");
      localStorage.removeItem("cw_last_claim");
      localStorage.removeItem("cw_daily_streak");
      localStorage.removeItem("cw_rakeback");
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        user,
        isAdmin,
        isAdminOpen,
        setIsAdminOpen,
        isVerificationModalOpen,
        setIsVerificationModalOpen,
        isAuthOpen,
        setIsAuthOpen,
        isDailyModalOpen,
        setIsDailyModalOpen,
        isFairModalOpen,
        setIsFairModalOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        loginUser,
        logoutUser,
        balance,
        setBalance,
        inventory,
        wagerHistory,
        matches,
        lastClaimTime,
        dailyStreak,
        rakebackBalance,
        totalWagered,
        vipTier,
        vipProgress,
        bigWinModal,
        triggerBigWin,
        closeBigWin,
        claimDailyWheel,
        claimRakeback,
        placeMatchBet,
        resolveMatch,
        addTransaction,
        sellSkin,
        sellMultipleSkins,
        addSkinToInventory,
        resetAllData
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
