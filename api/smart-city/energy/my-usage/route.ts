import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { getMyEnergyUsageAsync } from "@/Services/smartCityApiService";

export async function GET() {
  try {
    logger.debug("/api/smart-city/energy/my-usage");

    const result = await getMyEnergyUsageAsync();

    return result.success
      ? NextResponse.json(result.data, { status: 200 })
      : NextResponse.json(result, { status: result.status ?? 400 });
  } catch (error) {
    logger.error(`/api/smart-city/energy/my-usage error: ${error}`);

    return NextResponse.json(
      { error: "Failed to fetch energy usage records." },
      { status: 500 }
    );
  }
}