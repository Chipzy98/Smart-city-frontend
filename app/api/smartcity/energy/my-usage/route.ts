import { NextRequest, NextResponse } from "next/server";
import { getMyEnergyUsageAsync } from "@/Services/smartCityApiService";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { status, data } = await getMyEnergyUsageAsync(auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[energy/my-usage]", error);
    return NextResponse.json({ error: "Failed to fetch energy usage." }, { status: 500 });
  }
}