import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { getMyWasteRecordsAsync } from "@/Services/smartCityApiService";

export async function GET() {
  try {
    logger.debug("/api/smart-city/waste/my-records");

    const result = await getMyWasteRecordsAsync();

    return result.success
      ? NextResponse.json(result.data, { status: 200 })
      : NextResponse.json(result, { status: result.status ?? 400 });
  } catch (error) {
    logger.error(`/api/smart-city/waste/my-records error: ${error}`);

    return NextResponse.json(
      { error: "Failed to fetch waste records." },
      { status: 500 }
    );
  }
}