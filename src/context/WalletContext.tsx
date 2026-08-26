"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Skin {
  id: string;
  name: string;
  rarity: "common" | "rare" | "legendary" | "exotic";
  value: number;
  color: string;
}

export interface Wager {
  id: string;
  type: "bet" | "crash" | "coinflip" | "lootbox";
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
}

interface WalletContextType {
  user: { id: string; username: string } | null;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  loginUser: (userData: any) => void;
  logoutUser: () => void;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  inventory: Skin[];
  wagerHistory: Wager[];
  matches: EsportsMatch[];
  lastClaimTime: number | null;
  claimFaucet: () => { success: boolean; message: string };
  placeMatchBet: (matchId: string, team: "teamA" | "teamB", amount: number) => { success: boolean; message: string };
  resolveMatch: (matchId: string, winner: "teamA" | "teamB") => void;
  addTransaction: (type: Wager["type"], description: string, amount: number, result: Wager["result"], payout: number) => void;
  sellSkin: (skinId: string) => void;
  addSkinToInventory: (skin: Omit<Skin, "id">) => void;
  resetAllData: () => void;
}

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
    time: "Will DK [ELITE] defeat IA [TOP MID] in the Battle of Verdun?" 
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
    time: "Will AH [ELITE] successfully defend against NYS [TOP MID] at the Somme frontline?" 
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
    time: "Will TWA [TOP MID] capture the Galicia sector from TTI 3 [MID]?" 
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
    time: "Will CZSK [MID] hold the Gallipoli trenches against RRF [LOW MID]?" 
  }
];

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [balance, setBalance] = useState<number>(1000);
  const [inventory, setInventory] = useState<Skin[]>([]);
  const [wagerHistory, setWagerHistory] = useState<Wager[]>([]);
  const [matches, setMatches] = useState<EsportsMatch[]>(DEFAULT_MATCHES);
  const [lastClaimTime, setLastClaimTime] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state on mount: Check backend session, fallback to localStorage
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.loggedIn && data.user) {
          setUser({ id: data.user.id, username: data.user.username });
          setBalance(data.user.balance);
          setInventory(data.user.inventory || []);
          setWagerHistory(data.user.history || []);
          setLastClaimTime(data.user.lastClaimTime);
        } else {
          // Guest mode fallback
          const storedBalance = localStorage.getItem("cw_balance");
          const storedInventory = localStorage.getItem("cw_inventory");
          const storedHistory = localStorage.getItem("cw_history");
          const storedMatches = localStorage.getItem("cw_matches");
          const storedClaim = localStorage.getItem("cw_last_claim");

          if (storedBalance !== null) setBalance(Number(storedBalance));
          if (storedInventory !== null) setInventory(JSON.parse(storedInventory));
          if (storedHistory !== null) setWagerHistory(JSON.parse(storedHistory));
          if (storedClaim !== null) setLastClaimTime(Number(storedClaim));
        }
      } catch (error) {
        console.error("Auth Me check failed:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchSession();
  }, []);

  // Sync state to backend DB (if logged in) or localstorage (if guest)
  useEffect(() => {
    if (isLoaded) {
      if (user) {
        // Debounce database syncs to prevent API spamming
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
        // Guest mode saving
        localStorage.setItem("cw_balance", balance.toString());
        localStorage.setItem("cw_inventory", JSON.stringify(inventory));
        localStorage.setItem("cw_history", JSON.stringify(wagerHistory));
        localStorage.setItem("cw_matches", JSON.stringify(matches));
        if (lastClaimTime !== null) {
          localStorage.setItem("cw_last_claim", lastClaimTime.toString());
        }
      }
    }
  }, [balance, inventory, wagerHistory, matches, lastClaimTime, isLoaded, user]);

  const loginUser = (userData: any) => {
    setUser({ id: userData.id, username: userData.username });
    setBalance(userData.balance);
    setInventory(userData.inventory || []);
    setWagerHistory(userData.history || []);
    setLastClaimTime(userData.lastClaimTime);
  };

  const logoutUser = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      // Reset variables locally for security, fallback to local storage
      setBalance(1000);
      setInventory([]);
      setWagerHistory([]);
      setLastClaimTime(null);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const claimFaucet = () => {
    const now = Date.now();
    const cooldown = 12 * 60 * 60 * 1000;

    if (lastClaimTime && now - lastClaimTime < cooldown) {
      const remainingMs = cooldown - (now - lastClaimTime);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        success: false,
        message: `Claim failed. Cooldown active: ${hours}h ${minutes}m left.`
      };
    }

    setBalance((prev) => prev + 250);
    setLastClaimTime(now);
    addTransaction("lootbox", "Daily Faucet Claim", 0, "win", 250);
    
    return {
      success: true,
      message: "Successfully claimed 250 War Bonds!"
    };
  };

  const addTransaction = (
    type: Wager["type"],
    description: string,
    amount: number,
    result: Wager["result"],
    payout: number
  ) => {
    const newTx: Wager = {
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type,
      description,
      amount,
      result,
      payout,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString()
    };
    setWagerHistory((prev) => [newTx, ...prev]);
  };

  const placeMatchBet = (matchId: string, team: "teamA" | "teamB", amount: number) => {
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

    return { success: true, message: `Successfully staked ${amount} War Bonds on ${selectedTeamName}!` };
  };

  const resolveMatch = (matchId: string, winner: "teamA" | "teamB") => {
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
        } else if (w.type === "bet" && w.result === "pending" && w.description.includes(match.teamA) && w.description.includes(match.teamB)) {
          return { ...w, result: "lose", payout: 0 };
        }
        return w;
      })
    );
  };

  const sellSkin = (skinId: string) => {
    const skin = inventory.find((s) => s.id === skinId);
    if (!skin) return;

    setBalance((prev) => prev + skin.value);
    setInventory((prev) => prev.filter((s) => s.id !== skinId));
    addTransaction("lootbox", `Sold Skin: ${skin.name}`, 0, "win", skin.value);
  };

  const addSkinToInventory = (skin: Omit<Skin, "id">) => {
    const newSkin: Skin = {
      ...skin,
      id: "skin_" + Math.random().toString(36).substr(2, 9)
    };
    setInventory((prev) => [newSkin, ...prev]);
  };

  const resetAllData = () => {
    setBalance(1000);
    setInventory([]);
    setWagerHistory([]);
    setMatches(DEFAULT_MATCHES);
    setLastClaimTime(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cw_balance");
      localStorage.removeItem("cw_inventory");
      localStorage.removeItem("cw_history");
      localStorage.removeItem("cw_matches");
      localStorage.removeItem("cw_last_claim");
    }
  };

  return (
    <WalletContext.Provider
      value={{
        user,
        isAuthOpen,
        setIsAuthOpen,
        loginUser,
        logoutUser,
        balance,
        setBalance,
        inventory,
        wagerHistory,
        matches,
        lastClaimTime,
        claimFaucet,
        placeMatchBet,
        resolveMatch,
        addTransaction,
        sellSkin,
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
