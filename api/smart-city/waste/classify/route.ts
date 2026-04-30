import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { classifyWasteAsync } from "@/Services/smartCityApiService";
import type { WasteClassifyRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    logger.debug("/api/smart-city/waste/classify");

    const body: WasteClassifyRequest = await req.json();

    const result = await classifyWasteAsync(body);

    return result.success
      ? NextResponse.json(result.data, { status: 200 })
      : NextResponse.json(result, { status: result.status ?? 400 });
  } catch (error) {
    logger.error(`/api/smart-city/waste/classify error: ${error}`);

    return NextResponse.json(
      { error: "Failed to classify waste." },
      { status: 500 }
    );
  }
}