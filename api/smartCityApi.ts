import {
  axiosGetFromApiAsync,
  axiosPostToApiAsync,
} from "@/utils/axiosHelper";

import type {
  TrafficPredictRequest,
  WasteClassifyRequest,
  EnergyPredictRequest,
} from "@/types/api";

export const getLiveTrafficFromApiAsync = async () => {
  return axiosGetFromApiAsync("/api/smart-city/traffic/live");
};

export const predictTrafficFromApiAsync = async (
  data: TrafficPredictRequest
) => {
  return axiosPostToApiAsync("/api/smart-city/traffic/predict", data);
};

export const getMyWasteRecordsFromApiAsync = async () => {
  return axiosGetFromApiAsync("/api/smart-city/waste/my-records");
};

export const classifyWasteFromApiAsync = async (
  data: WasteClassifyRequest
) => {
  return axiosPostToApiAsync("/api/smart-city/waste/classify", data);
};

export const getMyEnergyUsageFromApiAsync = async () => {
  return axiosGetFromApiAsync("/api/smart-city/energy/my-usage");
};

export const predictEnergyFromApiAsync = async (
  data: EnergyPredictRequest
) => {
  return axiosPostToApiAsync("/api/smart-city/energy/predict", data);
};

export const getAdminDashboardFromApiAsync = async () => {
  return axiosGetFromApiAsync("/api/smart-city/dashboard/admin");
};

export const getManagerDashboardFromApiAsync = async () => {
  return axiosGetFromApiAsync("/api/smart-city/dashboard/manager");
};

export const getUserDashboardFromApiAsync = async () => {
  return axiosGetFromApiAsync("/api/smart-city/dashboard/user");
};