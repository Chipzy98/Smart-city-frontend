import { NextRequest, NextResponse } from "next/server";
import { classifyWasteAsync } from "@/Services/smartCityApiService";
import type { WasteClassifyRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body: WasteClassifyRequest = await req.json();
    const { status, data } = await classifyWasteAsync(body, auth);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("[waste/classify]", error);
    return NextResponse.json({ error: "Failed to classify waste." }, { status: 500 });
  }
}