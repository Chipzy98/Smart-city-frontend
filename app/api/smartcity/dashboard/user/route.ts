import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserDashboardAsync } from "@/Services/smartCityApiService";

export async function GET(req: NextRequest) {
  try {
    logger.debug("/api/smartcity/dashboard/user");
    const auth = req.headers.get("Authorization") ?? "";
    const { status, data } = await getUserDashboardAsync(auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    logger.error(`/api/smartcity/dashboard/user error: ${error}`);
    return NextResponse.json({ error: "Failed to fetch user dashboard data." }, { status: 500 });
  }
}