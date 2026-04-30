import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { predictEnergyAsync } from "@/Services/smartCityApiService";
import type { EnergyPredictRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    logger.debug("/api/smart-city/energy/predict");

    const body: EnergyPredictRequest = await req.json();

    const result = await predictEnergyAsync(body);

    return result.success
      ? NextResponse.json(result.data, { status: 200 })
      : NextResponse.json(result, { status: result.status ?? 400 });
  } catch (error) {
    logger.error(`/api/smart-city/energy/predict error: ${error}`);

    return NextResponse.json(
      { error: "Failed to predict energy bill." },
      { status: 500 }
    );
  }
}