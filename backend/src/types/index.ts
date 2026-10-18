export type UserRole = 'farmer' | 'fpo_coordinator' | 'agri_expert' | 'admin';

export interface UserProfile {
  id: string;
  supabaseAuthId?: string;
  fullName: string;
  phoneNumber: string;
  preferredLanguage: string; // ISO 639-1 or Indian codes: hi, pa, bn, te, mr, ta, gu, kn, ml, or, as, en, etc.
  role: UserRole;
  fpoId?: string;
  avatarUrl?: string;
  locationConsent: boolean;
  alertConsent: {
    sms: boolean;
    voice: boolean;
    whatsapp: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Farm {
  id: string;
  farmerId: string;
  name: string;
  state: string;
  district: string;
  subDistrict?: string;
  village?: string;
  pincode?: string;
  totalAreaAcres: number;
  centerCoordinates: {
    lat: number;
    lng: number;
  };
  irrigationSource?: string;
  soilType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Field {
  id: string;
  farmId: string;
  farmerId: string;
  name: string;
  cropName: string;
  cropVariety?: string;
  sowingDate: string;
  expectedHarvestDate?: string;
  growthStage: 'Germination' | 'Vegetative' | 'Flowering' | 'Grain Filling' | 'Maturity';
  areaAcres: number;
  boundaryGeoJson?: {
    type: 'Polygon';
    coordinates: number[][][]; // [ [ [lng, lat], ... ] ]
  };
  healthStatus: 'Optimal' | 'Good' | 'Watch' | 'At Risk' | 'Critical';
  createdAt: string;
  updatedAt: string;
}

export type DeviceType = 'esp32_cam' | 'soil_sensor' | 'microclimate_station' | 'irrigation_node';

export interface IoTDevice {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: DeviceType;
  farmerId: string;
  farmId?: string;
  fieldId?: string;
  apiToken: string;
  isActive: boolean;
  isSimulated: boolean;
  lastHeartbeat?: string;
  firmwareVersion: string;
  batteryPct: number;
  createdAt: string;
}

export interface DeviceTelemetryReading {
  id: string;
  deviceId: string;
  fieldId?: string;
  soilMoisturePct?: number; // 0 - 100%
  soilTemperatureC?: number; // Celsius
  airTemperatureC?: number;
  humidityPct?: number;
  nitrogenMgKg?: number; // NPK mg/kg
  phosphorusMgKg?: number;
  potassiumMgKg?: number;
  batteryPct?: number;
  signalRssi?: number;
  recordedAt: string;
}

export interface CropDiagnosis {
  id: string;
  fieldId: string;
  farmerId: string;
  imageUrl: string;
  source: 'web_upload' | 'esp32_cam' | 'whatsapp' | 'drone';
  cropDetected: string;
  primaryIssue: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  confidencePct: number;
  visibleEvidence: string;
  actionableSteps: string[];
  preventativeMeasures: string[];
  disclaimer: string;
  escalationNeeded: boolean;
  escalationNotes?: string;
  followUpQuestions: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  provider?: 'gemini' | 'offline_pathology_engine' | 'mistral';
  dataStatus?: 'live' | 'fallback' | 'cached';
  modelUsed?: string;
  fallbackReason?: string;
  createdAt: string;
}

export interface DroneOverlay {
  id: string;
  fieldId: string;
  title: string;
  imageUrl: string;
  layerType: 'rgb_orthomosaic' | 'ndvi_index' | 'thermal' | 'elevation';
  bounds: [[number, number], [number, number]]; // [[South, West], [North, East]]
  resolutionCmPerPixel?: number;
  flightDate: string;
  notes?: string;
  createdAt: string;
}

export interface WeatherCondition {
  locationName: string;
  latitude: number;
  longitude: number;
  observationTime: string;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidityPct: number;
  precipitationMm: number;
  precipitationProbabilityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  uvIndex: number;
  weatherCode: number;
  weatherDescription: string;
  dataSource: string; // e.g., "Open-Meteo & IMD Numerical Weather Prediction"
  status: 'live' | 'cached' | 'fallback';
  cacheAgeSeconds?: number;
  units?: {
    temperature: string;
    temperatureC?: string;
    humidity: string;
    relativeHumidityPct?: string;
    precipitation: string;
    precipitationMm?: string;
    windSpeed: string;
    windSpeedKmh?: string;
  };
  pressureHpa?: number;
  dewPointC?: number;
  cloudCoverPct?: number;
  visibilityKm?: number;
  sunriseTime?: string;
  sunsetTime?: string;
  sprayWindow?: {
    status: 'Optimal' | 'Caution' | 'Unfavorable';
    statusHi?: string;
    reason: string;
    sprayAdvice: string;
    sprayAdviceHi?: string;
  };
  diseaseRisk?: {
    level: 'Low' | 'Moderate' | 'High';
    levelHi?: string;
    fungusRisk: string;
    preventativeMeasures: string;
  };
  aiAdvisory?: {
    title: string;
    titleHi: string;
    summary: string;
    summaryHi: string;
    actions: string[];
    actionsHi: string[];
  };
  forecastDaily: Array<{
    date: string;
    maxTempC: number;
    minTempC: number;
    precipitationMm: number;
    precipitationProbabilityPct: number;
    weatherDescription: string;
  }>;
}

export interface MandiPriceRecord {
  id: string;
  commodity: string;
  variety: string;
  state: string;
  district: string;
  market: string; // APMC Mandi name
  minPrice: number; // ₹ / Quintal
  maxPrice: number; // ₹ / Quintal
  modalPrice: number; // ₹ / Quintal
  unit: string; // '₹ / Quintal'
  arrivalQuantityQuintals?: number;
  observationDate: string;
  retrievalTime?: string;
  dataSource: string; // e.g. "Agmarknet / Directorate of Marketing & Inspection (DMI)"
  dataStatus?: 'live' | 'delayed' | 'cached' | 'demo_benchmark';
  isLiveFeed: boolean;
  blockerDetails?: string;
  historicalTrend?: Array<{
    date: string;
    modalPrice: number;
  }>;
}

export interface AlertNotification {
  id: string;
  farmerId: string;
  fieldId?: string;
  alertType: 'heavy_rain' | 'heatwave' | 'frost' | 'pest_risk' | 'water_stress' | 'sensor_offline';
  severity: 'info' | 'advisory' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendedAction: string;
  sourceAttribution: string;
  status: {
    inApp: 'delivered' | 'unread';
    sms: 'sent' | 'delivered' | 'failed' | 'not_configured' | 'opted_out';
    voice: 'called' | 'completed' | 'no_answer' | 'not_configured' | 'opted_out';
    whatsapp: 'sent' | 'delivered' | 'read' | 'not_configured' | 'opted_out';
  };
  cooldownKey: string;
  createdAt: string;
}

export interface FPOCase {
  id: string;
  fpoId?: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  fieldId: string;
  fieldName: string;
  cropName: string;
  diagnosisId?: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedExpertName?: string;
  status: 'open' | 'under_review' | 'field_visit_scheduled' | 'resolved';
  expertNotes?: string;
  resolutionSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CropMarketplaceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  cropName: string;
  cropNameHi: string;
  variety: string;
  quantityQuintals: number;
  expectedPricePerQtl: number;
  apmcModalPrice: number;
  qualityGrade: 'Grade A (FAQ)' | 'Grade B' | 'Certified Organic' | 'Premium Sharbati';
  state: string;
  district: string;
  mandi: string;
  harvestDate?: string;
  imageUrl?: string;
  description?: string;
  listingType: 'sell' | 'buy_request';
  status: 'active' | 'negotiating' | 'sold';
  createdAt: string;
}

