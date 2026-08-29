import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboardAsync } from "@/Services/smartCityApiService";

export async function GET(req: NextRequest) {
  try {
    logger.debug("/api/smartcity/dashboard/admin");
    const auth = req.headers.get("Authorization") ?? "";
    const { status, data } = await getAdminDashboardAsync(auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    logger.error(`/api/smartcity/dashboard/admin error: ${error}`);
    return NextResponse.json({ error: "Failed to fetch admin dashboard data." }, { status: 500 });
  }
}