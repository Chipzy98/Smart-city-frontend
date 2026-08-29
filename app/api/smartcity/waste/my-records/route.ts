import { NextRequest, NextResponse } from "next/server";
import { getMyWasteRecordsAsync } from "@/Services/smartCityApiService";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { status, data } = await getMyWasteRecordsAsync(auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[waste/my-records]", error);
    return NextResponse.json({ error: "Failed to fetch waste records." }, { status: 500 });
  }
}