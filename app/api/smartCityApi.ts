import {
  axiosGetFromApiAsync,
  axiosPostToApiAsync,
} from "@/utils/axiosHelper";

import type {
  TrafficPredictRequest,
  RouteTrafficRequest,
  WasteClassifyRequest,
  EnergyPredictRequest,
} from "@/types/api";

// ── Traffic ────────────────────────────────────────────────────────────────
export const getLiveTrafficFromApiAsync = async () =>
  axiosGetFromApiAsync("/api/smartcity/traffic/live");

export const predictTrafficFromApiAsync = async (data: TrafficPredictRequest) =>
  axiosPostToApiAsync("/api/smartcity/traffic/predict", data);

export const analyseRouteFromApiAsync = async (data: RouteTrafficRequest) =>
  axiosPostToApiAsync("/api/smartcity/traffic/route", data);

export const getRouteHistoryFromApiAsync = async () =>
  axiosGetFromApiAsync("/api/smartcity/traffic/route/history");

// ── Waste ──────────────────────────────────────────────────────────────────
export const getMyWasteRecordsFromApiAsync = async () =>
  axiosGetFromApiAsync("/api/smartcity/waste/my-records");

export const classifyWasteFromApiAsync = async (data: WasteClassifyRequest) =>
  axiosPostToApiAsync("/api/smartcity/waste/classify", data);

// ── Energy ─────────────────────────────────────────────────────────────────
export const getMyEnergyUsageFromApiAsync = async () =>
  axiosGetFromApiAsync("/api/smartcity/energy/my-usage");

export const predictEnergyFromApiAsync = async (data: EnergyPredictRequest) =>
  axiosPostToApiAsync("/api/smartcity/energy/predict", data);

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getAdminDashboardFromApiAsync    = async () => axiosGetFromApiAsync("/api/smartcity/dashboard/admin");
export const getManagerDashboardFromApiAsync  = async () => axiosGetFromApiAsync("/api/smartcity/dashboard/manager");
export const getUserDashboardFromApiAsync     = async () => axiosGetFromApiAsync("/api/smartcity/dashboard/user");