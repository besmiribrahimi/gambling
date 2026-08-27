import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";

export async function GET() {
  try {
    const users = await getAllUsers();

    // Map real users only (exclude sensitive fields like passwordHash)
    const leaderboard = users.map((u) => {
      const history = u.history || [];
      const completed = history.filter((h) => h.result !== "pending");
      const wins = completed.filter((h) => h.result === "win").length;
      
      const biggestMultiplier = completed.reduce((max, h) => {
        if (h.result === "win" && h.amount > 0) {
          const mult = h.payout / h.amount;
          return mult > max ? mult : max;
        }
        return max;
      }, 1.0);

      // Determine VIP tier based on total wagered
      const totalWagered = completed.reduce((sum, h) => sum + (h.amount || 0), 0);
      let vipTier = "Bronze";
      let vipBadge = "🥉";
      if (totalWagered >= 100000) {
        vipTier = "Obsidian";
        vipBadge = "🔥";
      } else if (totalWagered >= 50000) {
        vipTier = "Diamond";
        vipBadge = "👑";
      } else if (totalWagered >= 20000) {
        vipTier = "Platinum";
        vipBadge = "💎";
      } else if (totalWagered >= 5000) {
        vipTier = "Gold";
        vipBadge = "🥇";
      } else if (totalWagered >= 1000) {
        vipTier = "Silver";
        vipBadge = "🥈";
      }

      return {
        id: u.id,
        name: u.username,
        avatar: u.preferences?.avatar || "⚡",
        vipTier,
        vipBadge,
        balance: u.balance,
        totalWagered,
        wagersWon: wins,
        biggestMultiplier: parseFloat(biggestMultiplier.toFixed(1)),
        isBanned: !!u.isBanned,
        role: u.role
      };
    });

    return NextResponse.json({
      success: true,
      leaderboard,
      totalPlayers: leaderboard.length
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
