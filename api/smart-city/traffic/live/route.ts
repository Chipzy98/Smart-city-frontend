import { NextResponse } from "next/server";
import { logger } from "@/utils/logger";
import { getLiveTrafficAsync } from "@/Services/smartCityApiService";

export async function GET() {
  try {
    logger.debug("/api/smart-city/traffic/live");

    const result = await getLiveTrafficAsync();

    return result.success
      ? NextResponse.json(result.data, { status: 200 })
      : NextResponse.json(result, { status: result.status ?? 400 });
  } catch (error) {
    logger.error(`/api/smart-city/traffic/live error: ${error}`);

    return NextResponse.json(
      { error: "Failed to fetch live traffic data." },
      { status: 500 }
    );
  }
}