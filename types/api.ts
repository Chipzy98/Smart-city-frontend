// D:\Chipzy\ESOFT LEC\Final project\smart-city-frontend\smart-city-frontend\types\api.ts

export type TrafficPredictRequest = {
  hour:         number;
  day:          number;
  weather:      number;
  vehicleCount: number;
};

export type RouteTrafficRequest = {
  originName:      string;
  originLat:       number;
  originLng:       number;
  destinationName: string;
  destinationLat:  number;
  destinationLng:  number;
  weather:         number;
};

export type WasteClassifyRequest = {
  imageUrl: string;
};

export type EnergyPredictRequest = {
  usageUnits:  number;
  temperature: number;
  occupants:   number;
};