import {
  axiosGetFromApiAsync,
  axiosPostToApiAsync,
} from "@/utils/axiosHelper";

import type {
  TrafficPredictRequest,
  WasteClassifyRequest,
  EnergyPredictRequest,
} from "@/types/api";

// ── Traffic ────────────────────────────────────────────────────────────────
export const getLiveTrafficAsync = async () => {
  return axiosGetFromApiAsync("/api/smartcity/traffic/summary");
};

export const predictTrafficAsync = async (data: TrafficPredictRequest) => {
  return axiosPostToApiAsync("/api/smartcity/traffic/predict", data);
};

// ── Waste ──────────────────────────────────────────────────────────────────
export const getMyWasteRecordsAsync = async () => {
  return axiosGetFromApiAsync("/api/smartcity/waste/my-records");
};

export const classifyWasteAsync = async (data: WasteClassifyRequest) => {
  return axiosPostToApiAsync("/api/smartcity/waste/classify", data);
};

// ── Energy ─────────────────────────────────────────────────────────────────
export const getMyEnergyUsageAsync = async () => {
  return axiosGetFromApiAsync("/api/smartcity/energy/my-usage");
};

export const predictEnergyAsync = async (data: EnergyPredictRequest) => {
  return axiosPostToApiAsync("/api/smartcity/energy/predict", data);
};

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getAdminDashboardAsync = async () => {
  return axiosGetFromApiAsync("/api/smartcity/dashboard/admin");
};

export const getManagerDashboardAsync = async () => {
  return axiosGetFromApiAsync("/api/smartcity/dashboard/manager");
};

export const getUserDashboardAsync = async () => {
  return axiosGetFromApiAsync("/api/smartcity/dashboard/user");
};