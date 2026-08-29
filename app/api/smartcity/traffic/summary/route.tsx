import { NextRequest, NextResponse } from "next/server";
import { getLiveTrafficAsync } from "@/Services/smartCityApiService";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { status, data } = await getLiveTrafficAsync(auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[traffic/summary]", error);
    return NextResponse.json({ error: "Failed to fetch traffic summary." }, { status: 500 });
  }
}