import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "../../../../lib/db";

export async function GET() {
  try {
    const health = await checkDatabaseHealth();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: health
    });
  } catch (error) {
    console.error("System Status API error:", error);
    return NextResponse.json({
      status: "degraded",
      database: {
        isConnected: false,
        mode: "in_memory_vault",
        latencyMs: 0,
        userCount: 0
      }
    });
  }
}
