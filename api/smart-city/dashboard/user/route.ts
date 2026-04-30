import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { getUserDashboardAsync } from "@/Services/smartCityApiService";

export async function GET() {
  try {
    logger.debug("/api/smart-city/dashboard/user");

    const result = await getUserDashboardAsync();

    return result.success
      ? NextResponse.json(result.data, { status: 200 })
      : NextResponse.json(result, { status: result.status ?? 400 });
  } catch (error) {
    logger.error(`/api/smart-city/dashboard/user error: ${error}`);

    return NextResponse.json(
      { error: "Failed to fetch user dashboard data." },
      { status: 500 }
    );
  }
}