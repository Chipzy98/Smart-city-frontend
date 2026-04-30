export type TrafficPredictRequest = {
  hour: number;
  day: number;
  weather: number;
  vehicleCount: number;
};

export type WasteClassifyRequest = {
  imageUrl: string;
};

export type EnergyPredictRequest = {
  usageUnits: number;
  temperature: number;
  occupants: number;
};