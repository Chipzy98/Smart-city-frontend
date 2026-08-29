import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { getManagerDashboardAsync } from "@/Services/smartCityApiService";

export async function GET(req: NextRequest) {
  try {
    logger.debug("/api/smartcity/dashboard/manager");
    const auth = req.headers.get("Authorization") ?? "";
    const { status, data } = await getManagerDashboardAsync(auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    logger.error(`/api/smartcity/dashboard/manager error: ${error}`);
    return NextResponse.json({ error: "Failed to fetch manager dashboard data." }, { status: 500 });
  }
}