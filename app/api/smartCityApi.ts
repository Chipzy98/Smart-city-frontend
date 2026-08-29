import { axiosGetFromApiAsync, axiosPostToApiAsync } from "@/utils/axiosHelper";
import type { TrafficPredictRequest, RouteTrafficRequest, WasteClassifyRequest, EnergyPredictRequest } from "@/types/api";

// Traffic
export const getLiveTrafficFromApiAsync      = () => axiosGetFromApiAsync("/api/smartcity/traffic/summary");
export const getRealtimeTrafficFromApiAsync  = () => axiosGetFromApiAsync("/api/smartcity/traffic/realtime");  // ← TomTom
export const predictTrafficFromApiAsync      = (data: TrafficPredictRequest) => axiosPostToApiAsync("/api/smartcity/traffic/predict", data);
export const analyseRouteFromApiAsync        = (data: RouteTrafficRequest)   => axiosPostToApiAsync("/api/smartcity/traffic/route", data);

// Energy
export const getMyEnergyUsageFromApiAsync    = () => axiosGetFromApiAsync("/api/smartcity/energy/my-usage");
export const predictEnergyFromApiAsync       = (data: EnergyPredictRequest)  => axiosPostToApiAsync("/api/smartcity/energy/predict", data);

// Waste
export const getMyWasteRecordsFromApiAsync   = () => axiosGetFromApiAsync("/api/smartcity/waste/my-records");
export const classifyWasteFromApiAsync       = (data: WasteClassifyRequest)  => axiosPostToApiAsync("/api/smartcity/waste/classify", data);

// Dashboard
export const getAdminDashboardFromApiAsync   = () => axiosGetFromApiAsync("/api/smartcity/dashboard/admin");
export const getManagerDashboardFromApiAsync = () => axiosGetFromApiAsync("/api/smartcity/dashboard/manager");
export const getUserDashboardFromApiAsync    = () => axiosGetFromApiAsync("/api/smartcity/dashboard/user");