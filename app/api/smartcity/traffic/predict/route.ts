import { NextRequest, NextResponse } from "next/server";
import { predictTrafficAsync } from "@/Services/smartCityApiService";
import type { TrafficPredictRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body: TrafficPredictRequest = await req.json();
    const { status, data } = await predictTrafficAsync(body, auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[traffic/predict]", error);
    return NextResponse.json({ error: "Failed to predict traffic." }, { status: 500 });
  }
}