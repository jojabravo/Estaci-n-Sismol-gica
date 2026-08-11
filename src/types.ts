export type VistaTab = 'portada' | 'particulas' | 'estacion' | 'triangulacion';

export interface StationData {
  id: number;
  nom: string;
  lat: number;
  lon: number;
  r: number; // distance in km
  dt: number; // delta t in seconds
}

export interface CityReference {
  nom: string;
  lat: number;
  lon: number;
}

export interface SimulationParams {
  dist: number;   // km to hypocenter
  vp: number;     // km/s P-wave speed
  vs: number;     // km/s S-wave speed
  vel: number;    // clock multiplier (1x - 8x)
}

export interface SimulationState {
  t: number;      // current time in seconds
  tp: number;     // P wave arrival time
  ts: number;     // S wave arrival time
  dt: number;     // ts - tp delay
  epi: number;    // epicentral distance in km
  total: number;  // total timeline duration in seconds
}
