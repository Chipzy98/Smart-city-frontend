import { NextRequest, NextResponse } from "next/server";
import { predictEnergyAsync } from "@/Services/smartCityApiService";
import type { EnergyPredictRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body: EnergyPredictRequest = await req.json();
    const { status, data } = await predictEnergyAsync(body, auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[energy/predict]", error);
    return NextResponse.json({ error: "Failed to predict energy bill." }, { status: 500 });
  }
}