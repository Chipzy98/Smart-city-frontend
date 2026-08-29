import { NextRequest, NextResponse } from "next/server";
import { analyseRouteAsync } from "@/Services/smartCityApiService";
import type { RouteTrafficRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body: RouteTrafficRequest = await req.json();
    const { status, data } = await analyseRouteAsync(body, auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[traffic/route]", error);
    return NextResponse.json({ error: "Route analysis failed." }, { status: 500 });
  }
}