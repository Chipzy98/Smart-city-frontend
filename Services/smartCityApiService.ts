import axios from "axios";
import type {
  TrafficPredictRequest,
  RouteTrafficRequest,
  WasteClassifyRequest,
  EnergyPredictRequest,
} from "@/types/api";

const BACKEND = process.env.SMART_CITY_API_URL ?? "http://localhost:7261";

async function backendGet(path: string, auth = "") {
  const res = await axios.get(`${BACKEND}${path}`, {
    headers: auth ? { Authorization: auth } : {},
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data };
}

async function backendPost<T>(path: string, body: T, auth = "") {
  const res = await axios.post(`${BACKEND}${path}`, body, {
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data };
}

// ── Traffic ────────────────────────────────────────────────────────────────
export const getLiveTrafficAsync      = (auth = "") => backendGet("/api/smartcity/traffic/summary", auth);
export const getRealtimeTrafficAsync  = (auth = "") => backendGet("/api/smartcity/traffic/realtime", auth);  // ← TomTom
export const predictTrafficAsync      = (data: TrafficPredictRequest, auth = "") => backendPost("/api/smartcity/traffic/predict", data, auth);
export const analyseRouteAsync        = (data: RouteTrafficRequest, auth = "") => backendPost("/api/smartcity/traffic/route", data, auth);
export const getRouteHistoryAsync     = (auth = "") => backendGet("/api/smartcity/traffic/route/history", auth);

// ── Waste ──────────────────────────────────────────────────────────────────
export const getMyWasteRecordsAsync   = (auth = "") => backendGet("/api/smartcity/waste/my-records", auth);
export const classifyWasteAsync       = (data: WasteClassifyRequest, auth = "") => backendPost("/api/smartcity/waste/classify", data, auth);

// ── Energy ─────────────────────────────────────────────────────────────────
export const getMyEnergyUsageAsync    = (auth = "") => backendGet("/api/smartcity/energy/my-usage", auth);
export const predictEnergyAsync       = (data: EnergyPredictRequest, auth = "") => backendPost("/api/smartcity/energy/predict", data, auth);

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getAdminDashboardAsync   = (auth = "") => backendGet("/api/smartcity/dashboard/admin", auth);
export const getManagerDashboardAsync = (auth = "") => backendGet("/api/smartcity/dashboard/manager", auth);
export const getUserDashboardAsync    = (auth = "") => backendGet("/api/smartcity/dashboard/user", auth);