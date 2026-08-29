import { NextRequest, NextResponse } from "next/server";
import { getRealtimeTrafficAsync } from "@/Services/smartCityApiService";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { status, data } = await getRealtimeTrafficAsync(auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[traffic/realtime]", error);
    return NextResponse.json({ error: "Failed to fetch real-time traffic." }, { status: 500 });
  }
}