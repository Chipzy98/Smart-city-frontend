import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { predictTrafficAsync } from "@/Services/smartCityApiService";
import type { TrafficPredictRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    logger.debug("/api/smart-city/traffic/predict");

    const body: TrafficPredictRequest = await req.json();

    const result = await predictTrafficAsync(body);

    return result.success
      ? NextResponse.json(result.data, { status: 200 })
      : NextResponse.json(result, { status: result.status ?? 400 });
  } catch (error) {
    logger.error(`/api/smart-city/traffic/predict error: ${error}`);

    return NextResponse.json(
      { error: "Failed to predict traffic congestion." },
      { status: 500 }
    );
  }
}