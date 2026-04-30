import {
  axiosGetFromApiAsync,
  axiosPostToApiAsync,
} from "@/utils/axiosHelper";

import type {
  TrafficPredictRequest,
  WasteClassifyRequest,
  EnergyPredictRequest,
} from "@/types/api";

// Traffic
export const getLiveTrafficAsync = async () => {
  return axiosGetFromApiAsync("/api/traffic/live");
};

export const predictTrafficAsync = async (data: TrafficPredictRequest) => {
  return axiosPostToApiAsync("/api/traffic/predict", data);
};

// Waste
export const getMyWasteRecordsAsync = async () => {
  return axiosGetFromApiAsync("/api/waste/my-records");
};

export const classifyWasteAsync = async (data: WasteClassifyRequest) => {
  return axiosPostToApiAsync("/api/waste/classify", data);
};

// Energy
export const getMyEnergyUsageAsync = async () => {
  return axiosGetFromApiAsync("/api/energy/my-usage");
};

export const predictEnergyAsync = async (data: EnergyPredictRequest) => {
  return axiosPostToApiAsync("/api/energy/predict", data);
};

// Dashboard
export const getAdminDashboardAsync = async () => {
  return axiosGetFromApiAsync("/api/dashboard/admin");
};

export const getManagerDashboardAsync = async () => {
  return axiosGetFromApiAsync("/api/dashboard/manager");
};

export const getUserDashboardAsync = async () => {
  return axiosGetFromApiAsync("/api/dashboard/user");
};