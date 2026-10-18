import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  Farm,
  Field,
  IoTDevice,
  DeviceTelemetryReading,
  CropDiagnosis,
  DroneOverlay,
  AlertNotification,
  FPOCase,
  MandiPriceRecord,
  CropMarketplaceListing,
} from '../types/index.js';

interface DatabaseSchema {
  profiles: UserProfile[];
  farms: Farm[];
  fields: Field[];
  devices: IoTDevice[];
  deviceReadings: DeviceTelemetryReading[];
  cropDiagnoses: CropDiagnosis[];
  droneOverlays: DroneOverlay[];
  alerts: AlertNotification[];
  fpoCases: FPOCase[];
  mandiCache: MandiPriceRecord[];
  cropListings: CropMarketplaceListing[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'krishak_db.json');

// Initial seed data with authentic Indian agricultural context
const SEED_DATA: DatabaseSchema = {
  profiles: [
    {
      id: 'usr-farmer-001',
      fullName: 'Gurpreet Singh',
      phoneNumber: '+919876543210',
      preferredLanguage: 'pa', // Punjabi
      role: 'farmer',
      locationConsent: true,
      alertConsent: { sms: true, voice: true, whatsapp: true },
      createdAt: '2026-03-01T08:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    },
    {
      id: 'usr-farmer-002',
      fullName: 'Rameshwar Patil',
      phoneNumber: '+919812345678',
      preferredLanguage: 'mr', // Marathi
      role: 'farmer',
      locationConsent: true,
      alertConsent: { sms: true, voice: false, whatsapp: true },
      createdAt: '2026-03-10T09:30:00Z',
      updatedAt: '2026-10-14T11:20:00Z',
    },
    {
      id: 'usr-fpo-coord',
      fullName: 'Sunita Sharma (FPO Lead)',
      phoneNumber: '+919899001122',
      preferredLanguage: 'hi', // Hindi
      role: 'fpo_coordinator',
      fpoId: 'fpo-malwa-agri',
      locationConsent: true,
      alertConsent: { sms: true, voice: true, whatsapp: true },
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-10-18T07:00:00Z',
    },
    {
      id: 'usr-agri-expert',
      fullName: 'Dr. Virender K. Ahluwalia',
      phoneNumber: '+919844332211',
      preferredLanguage: 'en',
      role: 'agri_expert',
      locationConsent: true,
      alertConsent: { sms: false, voice: false, whatsapp: true },
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-10-18T08:00:00Z',
    },
  ],
  farms: [
    {
      id: 'farm-001',
      farmerId: 'usr-farmer-001',
      name: 'Green Horizon Acreage',
      state: 'Punjab',
      district: 'Ludhiana',
      subDistrict: 'Jagraon',
      village: 'Sidhwan Bet',
      pincode: '142024',
      totalAreaAcres: 14.5,
      centerCoordinates: { lat: 30.901, lng: 75.8573 },
      irrigationSource: 'Solar Tube Well & Canal Siphon',
      soilType: 'Fertile Alluvial Loam',
      createdAt: '2026-03-01T08:30:00Z',
      updatedAt: '2026-10-15T12:00:00Z',
    },
    {
      id: 'farm-002',
      farmerId: 'usr-farmer-002',
      name: 'Sahyadri Organic Orchard & Cash Farms',
      state: 'Maharashtra',
      district: 'Nashik',
      subDistrict: 'Niphad',
      village: 'Pimpalgaon Baswant',
      pincode: '422209',
      totalAreaAcres: 8.2,
      centerCoordinates: { lat: 20.1764, lng: 74.0531 },
      irrigationSource: 'Drip Micro-Irrigation & Farm Pond',
      soilType: 'Medium Black Loamy Soil',
      createdAt: '2026-03-12T10:00:00Z',
      updatedAt: '2026-10-17T09:00:00Z',
    },
  ],
  fields: [
    {
      id: 'field-101',
      farmId: 'farm-001',
      farmerId: 'usr-farmer-001',
      name: 'North Wheat Basin (Kanal 1-8)',
      cropName: 'Wheat (गेहूं / ਕਣਕ)',
      cropVariety: 'HD-3226 (Pusa Yashasvi)',
      sowingDate: '2026-11-10',
      expectedHarvestDate: '2026-04-15',
      growthStage: 'Grain Filling',
      areaAcres: 6.2,
      boundaryGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [75.854, 30.902],
            [75.859, 30.903],
            [75.858, 30.898],
            [75.853, 30.899],
            [75.854, 30.902],
          ],
        ],
      },
      healthStatus: 'Watch',
      createdAt: '2026-03-01T09:00:00Z',
      updatedAt: '2026-10-16T14:00:00Z',
    },
    {
      id: 'field-102',
      farmId: 'farm-001',
      farmerId: 'usr-farmer-001',
      name: 'South Mustard & Pulses Strip',
      cropName: 'Mustard (सरसों / ਸਰ੍ਹੋਂ)',
      cropVariety: 'Pusa Bold',
      sowingDate: '2026-10-25',
      expectedHarvestDate: '2026-03-20',
      growthStage: 'Maturity',
      areaAcres: 4.3,
      boundaryGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [75.853, 30.898],
            [75.858, 30.897],
            [75.857, 30.893],
            [75.852, 30.894],
            [75.853, 30.898],
          ],
        ],
      },
      healthStatus: 'Optimal',
      createdAt: '2026-03-01T09:30:00Z',
      updatedAt: '2026-10-17T09:00:00Z',
    },
    {
      id: 'field-201',
      farmId: 'farm-002',
      farmerId: 'usr-farmer-002',
      name: 'Nashik Red Onion Plot A',
      cropName: 'Onion (कांदा / प्याज)',
      cropVariety: 'Bhima Super',
      sowingDate: '2026-08-15',
      expectedHarvestDate: '2026-12-10',
      growthStage: 'Vegetative',
      areaAcres: 3.5,
      boundaryGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [74.051, 20.177],
            [74.055, 20.178],
            [74.056, 20.174],
            [74.052, 20.173],
            [74.051, 20.177],
          ],
        ],
      },
      healthStatus: 'At Risk',
      createdAt: '2026-03-12T11:00:00Z',
      updatedAt: '2026-10-18T06:00:00Z',
    },
  ],
  devices: [
    {
      id: 'dev-esp32-01',
      deviceCode: 'ESP32-CAM-LDH-01',
      deviceName: 'North Perimeter Field Camera',
      deviceType: 'esp32_cam',
      farmerId: 'usr-farmer-001',
      farmId: 'farm-001',
      fieldId: 'field-101',
      apiToken: 'esp32_token_alpha_9941',
      isActive: true,
      isSimulated: true,
      lastHeartbeat: '2026-10-18T08:15:00Z',
      firmwareVersion: 'v2.1.0-krishak-ai',
      batteryPct: 88,
      createdAt: '2026-04-10T10:00:00Z',
    },
    {
      id: 'dev-soil-01',
      deviceCode: 'SOIL-NPK-LDH-02',
      deviceName: 'Basin Soil Moisture & NPK Station',
      deviceType: 'soil_sensor',
      farmerId: 'usr-farmer-001',
      farmId: 'farm-001',
      fieldId: 'field-101',
      apiToken: 'soil_token_beta_2287',
      isActive: true,
      isSimulated: true,
      lastHeartbeat: '2026-10-18T08:20:00Z',
      firmwareVersion: 'v1.8.4',
      batteryPct: 94,
      createdAt: '2026-04-12T11:00:00Z',
    },
    {
      id: 'dev-soil-02',
      deviceCode: 'SOIL-ONION-NSK-01',
      deviceName: 'Pimpalgaon Soil & Climate Node',
      deviceType: 'microclimate_station',
      farmerId: 'usr-farmer-002',
      farmId: 'farm-002',
      fieldId: 'field-201',
      apiToken: 'soil_token_nsk_5510',
      isActive: true,
      isSimulated: true,
      lastHeartbeat: '2026-10-18T07:55:00Z',
      firmwareVersion: 'v1.9.0',
      batteryPct: 76,
      createdAt: '2026-05-01T09:00:00Z',
    },
  ],
  deviceReadings: [
    {
      id: 'tel-001',
      deviceId: 'dev-soil-01',
      fieldId: 'field-101',
      soilMoisturePct: 38.5,
      soilTemperatureC: 22.4,
      airTemperatureC: 28.1,
      humidityPct: 56.0,
      nitrogenMgKg: 142.0,
      phosphorusMgKg: 34.5,
      potassiumMgKg: 195.0,
      batteryPct: 94,
      signalRssi: -64,
      recordedAt: '2026-10-18T08:00:00Z',
    },
    {
      id: 'tel-002',
      deviceId: 'dev-soil-01',
      fieldId: 'field-101',
      soilMoisturePct: 36.2,
      soilTemperatureC: 23.1,
      airTemperatureC: 29.8,
      humidityPct: 51.5,
      nitrogenMgKg: 140.5,
      phosphorusMgKg: 34.0,
      potassiumMgKg: 194.5,
      batteryPct: 94,
      signalRssi: -65,
      recordedAt: '2026-10-18T08:20:00Z',
    },
    {
      id: 'tel-003',
      deviceId: 'dev-soil-02',
      fieldId: 'field-201',
      soilMoisturePct: 24.1, // Drying out, stress alert trigger
      soilTemperatureC: 26.8,
      airTemperatureC: 32.4,
      humidityPct: 42.0,
      nitrogenMgKg: 95.0,
      phosphorusMgKg: 18.2,
      potassiumMgKg: 130.0,
      batteryPct: 76,
      signalRssi: -71,
      recordedAt: '2026-10-18T07:55:00Z',
    },
  ],
  cropDiagnoses: [],
  droneOverlays: [
    {
      id: 'drone-001',
      fieldId: 'field-101',
      title: 'Post-Irrigation Orthomosaic RGB',
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      layerType: 'rgb_orthomosaic',
      bounds: [
        [30.898, 75.853],
        [30.903, 75.859],
      ],
      resolutionCmPerPixel: 2.8,
      flightDate: '2026-10-12',
      notes: 'DJI Mavic 3M multispectral survey conducted at 45m AGL with 80% overlap.',
      createdAt: '2026-10-12T16:00:00Z',
    },
    {
      id: 'drone-002',
      fieldId: 'field-101',
      title: 'NDVI Canopy Vigour Index',
      imageUrl: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80',
      layerType: 'ndvi_index',
      bounds: [
        [30.898, 75.853],
        [30.903, 75.859],
      ],
      resolutionCmPerPixel: 5.5,
      flightDate: '2026-10-12',
      notes: 'NDVI calibrated map highlighting nitrogen variation across southwest corner.',
      createdAt: '2026-10-12T16:30:00Z',
    },
  ],
  alerts: [
    {
      id: 'alt-001',
      farmerId: 'usr-farmer-001',
      fieldId: 'field-101',
      alertType: 'heavy_rain',
      severity: 'warning',
      title: 'Western Disturbance: Heavy Precipitation Forecast',
      description: 'IMD regional radar indicates 38mm - 55mm localized rainfall accompanied by gusty winds (35 km/h) over Ludhiana within 36 hours.',
      recommendedAction: 'Clear field drainage trenches immediately. Postpone planned top-dressing nitrogen application to avoid nutrient runoff.',
      sourceAttribution: 'IMD & Open-Meteo High-Resolution NWP Model',
      status: {
        inApp: 'delivered',
        sms: 'delivered',
        voice: 'completed',
        whatsapp: 'delivered',
      },
      cooldownKey: 'heavy_rain_ludhiana_20261018',
      createdAt: '2026-10-18T05:00:00Z',
    },
    {
      id: 'alt-002',
      farmerId: 'usr-farmer-002',
      fieldId: 'field-201',
      alertType: 'water_stress',
      severity: 'advisory',
      title: 'Soil Moisture Depletion in Onion Bed',
      description: 'Sensor SOIL-ONION-NSK-01 reports moisture dropped below 25% for 8 consecutive hours during high midday ambient temperature (32.4°C).',
      recommendedAction: 'Initiate scheduled drip cycle in early evening hours to prevent bulb cracking and moisture shock.',
      sourceAttribution: 'KrishakDrishti On-Farm IoT Telemetry Engine',
      status: {
        inApp: 'delivered',
        sms: 'delivered',
        voice: 'not_configured',
        whatsapp: 'delivered',
      },
      cooldownKey: 'water_stress_field201_20261018',
      createdAt: '2026-10-18T08:00:00Z',
    },
  ],
  fpoCases: [
    {
      id: 'case-001',
      fpoId: 'fpo-malwa-agri',
      farmerId: 'usr-farmer-001',
      farmerName: 'Gurpreet Singh',
      farmerPhone: '+919876543210',
      fieldId: 'field-101',
      fieldName: 'North Wheat Basin (Kanal 1-8)',
      cropName: 'Wheat (HD-3226)',
      diagnosisId: 'diag-001',
      title: 'Possible Yellow Rust Spotting in Jagraon Belt',
      priority: 'high',
      assignedExpertName: 'Dr. Virender K. Ahluwalia',
      status: 'under_review',
      expertNotes: 'Spore morphology consistent with PAU warning #41. Requested farmer to inspect leaf undersides with hand lens.',
      resolutionSummary: undefined,
      createdAt: '2026-10-17T12:00:00Z',
      updatedAt: '2026-10-18T07:30:00Z',
    },
    {
      id: 'case-002',
      fpoId: 'fpo-malwa-agri',
      farmerId: 'usr-farmer-002',
      farmerName: 'Rameshwar Patil',
      farmerPhone: '+919812345678',
      fieldId: 'field-201',
      fieldName: 'Nashik Red Onion Plot A',
      cropName: 'Onion (Bhima Super)',
      diagnosisId: 'diag-002',
      title: 'Alternaria Purple Blotch & Thrips Complex',
      priority: 'urgent',
      assignedExpertName: 'Unassigned',
      status: 'open',
      expertNotes: undefined,
      resolutionSummary: undefined,
      createdAt: '2026-10-18T06:30:00Z',
      updatedAt: '2026-10-18T06:30:00Z',
    },
  ],
  mandiCache: [],
  cropListings: [
    {
      id: 'list-001',
      farmerId: 'usr-farmer-001',
      farmerName: 'Gurpreet Singh',
      farmerPhone: '+919876543210',
      cropName: 'Wheat',
      cropNameHi: 'गेहूं',
      variety: 'Sharbati (HD-3086)',
      quantityQuintals: 150,
      expectedPricePerQtl: 2450,
      apmcModalPrice: 2425,
      qualityGrade: 'Premium Sharbati',
      state: 'Punjab',
      district: 'Ludhiana',
      mandi: 'Jagraon Mandi',
      harvestDate: '2026-04-10',
      imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
      description: 'Lustrous golden grain harvested from laser-leveled fields. Moisture below 11.5%. Cleaned and graded.',
      listingType: 'sell',
      status: 'active',
      createdAt: '2026-10-17T09:00:00Z',
    },
    {
      id: 'list-002',
      farmerId: 'usr-farmer-003',
      farmerName: 'Baldev Singh Dhillon',
      farmerPhone: '+919888123456',
      cropName: 'Basmati Rice',
      cropNameHi: 'बासमती धान',
      variety: 'Pusa 1121 Traditional',
      quantityQuintals: 85,
      expectedPricePerQtl: 4100,
      apmcModalPrice: 4050,
      qualityGrade: 'Grade A (FAQ)',
      state: 'Haryana',
      district: 'Karnal',
      mandi: 'Karnal Grain Market',
      harvestDate: '2026-10-12',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      description: 'Extra-long grain Basmati with 8.4mm average kernel length. Highly aromatic, sun-dried to 12% moisture.',
      listingType: 'sell',
      status: 'active',
      createdAt: '2026-10-18T05:30:00Z',
    },
    {
      id: 'list-003',
      farmerId: 'usr-farmer-002',
      farmerName: 'Rameshwar Patil',
      farmerPhone: '+919812345678',
      cropName: 'Onion',
      cropNameHi: 'लाल प्याज',
      variety: 'Nashik Red (Bhima Super)',
      quantityQuintals: 220,
      expectedPricePerQtl: 2150,
      apmcModalPrice: 2220,
      qualityGrade: 'Grade A (FAQ)',
      state: 'Maharashtra',
      district: 'Nashik',
      mandi: 'Lasalgaon Mandi',
      harvestDate: '2026-10-15',
      imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
      description: 'Firm, uniform size (55mm+) red onions stored in ventilated chawl. Zero sprouting, excellent pungency.',
      listingType: 'sell',
      status: 'active',
      createdAt: '2026-10-18T06:00:00Z',
    },
    {
      id: 'list-004',
      farmerId: 'usr-farmer-004',
      farmerName: 'Mukesh Choudhary',
      farmerPhone: '+919712398765',
      cropName: 'Mustard',
      cropNameHi: 'सरसों',
      variety: 'Pusa Bold Yellow',
      quantityQuintals: 60,
      expectedPricePerQtl: 5650,
      apmcModalPrice: 5700,
      qualityGrade: 'Certified Organic',
      state: 'Rajasthan',
      district: 'Alwar',
      mandi: 'Khairthal Mandi',
      harvestDate: '2026-03-25',
      imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=600&q=80',
      description: 'Certified organic mustard seed with 41.5% oil recovery test. Single-origin farm lot.',
      listingType: 'sell',
      status: 'active',
      createdAt: '2026-10-16T11:00:00Z',
    },
    {
      id: 'list-005',
      farmerId: 'usr-farmer-005',
      farmerName: 'Devendra Meena',
      farmerPhone: '+919425112233',
      cropName: 'Chickpea / Desi Chana',
      cropNameHi: 'देसी चना',
      variety: 'JG-11 Malwa Bold',
      quantityQuintals: 110,
      expectedPricePerQtl: 5850,
      apmcModalPrice: 5900,
      qualityGrade: 'Grade A (FAQ)',
      state: 'Madhya Pradesh',
      district: 'Indore',
      mandi: 'Indore Mandi',
      harvestDate: '2026-04-02',
      imageUrl: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=600&q=80',
      description: 'Machine cleaned and sortexed bold Desi Chana. Free from weevils and dust.',
      listingType: 'sell',
      status: 'active',
      createdAt: '2026-10-17T14:15:00Z',
    },
    {
      id: 'list-006',
      farmerId: 'usr-buyer-001',
      farmerName: 'AgroCorp Exporters Ltd (Procurement)',
      farmerPhone: '+919922003344',
      cropName: 'Cotton',
      cropNameHi: 'कपास (रुई)',
      variety: 'Shankar-6 Premium Staple',
      quantityQuintals: 500,
      expectedPricePerQtl: 7200,
      apmcModalPrice: 7100,
      qualityGrade: 'Grade A (FAQ)',
      state: 'Gujarat',
      district: 'Rajkot',
      mandi: 'Rajkot APMC',
      description: 'Urgent buyer procurement: 500 Quintals 29mm+ staple length Shankar-6 raw cotton needed for spinning mill.',
      listingType: 'buy_request',
      status: 'active',
      createdAt: '2026-10-18T07:00:00Z',
    },
  ],
};

class PersistentDataStore {
  private data: DatabaseSchema;
  private supabase: SupabaseClient | null = null;
  private isSupabaseConfigured: boolean = false;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadFromFile();
    this.initSupabase();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromFile(): DatabaseSchema {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (fs.existsSync(DATA_FILE)) {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          if (raw && raw.trim().length > 10) {
            const parsed = JSON.parse(raw);
            if (!parsed.cropDiagnoses) {
              parsed.cropDiagnoses = [];
            }
            if (!parsed.cropListings || parsed.cropListings.length === 0) {
              parsed.cropListings = SEED_DATA.cropListings;
            }
            return parsed;
          }
        }
      } catch {
        // Brief retry before re-seeding to tolerate concurrent test writes
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
    }
    this.saveToFile(SEED_DATA);
    return JSON.parse(JSON.stringify(SEED_DATA));
  }

  private saveToFile(data: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const tmpFile = `${DATA_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.renameSync(tmpFile, DATA_FILE);
      } catch {
        // Windows fallback if file is briefly locked by another process
        fs.copyFileSync(tmpFile, DATA_FILE);
        fs.unlinkSync(tmpFile);
      }
    } catch (err) {
      console.error('[DataStore] Failed to write database file:', err);
    }
  }

  private initSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key && !url.includes('your-project.supabase.co')) {
      try {
        this.supabase = createClient(url, key);
        this.isSupabaseConfigured = true;
        console.log('[DataStore] Connected to Supabase PostgreSQL at:', url);
      } catch (err) {
        console.warn('[DataStore] Supabase init failed, falling back to local persistent store:', err);
      }
    } else {
      console.log('[DataStore] Running with local persistent JSON store (Supabase unconfigured or placeholder).');
    }
  }

  public getSupabase(): SupabaseClient | null {
    return this.supabase;
  }

  // --- Profiles ---
  public getProfiles(): UserProfile[] {
    return this.data.profiles;
  }

  public getProfileById(id: string): UserProfile | undefined {
    return this.data.profiles.find((p) => p.id === id);
  }

  public createProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): UserProfile {
    const newProfile: UserProfile = {
      ...profile,
      id: `usr-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.profiles.push(newProfile);
    this.saveToFile(this.data);
    return newProfile;
  }

  public updateProfile(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.profiles[idx] = {
      ...this.data.profiles[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToFile(this.data);
    return this.data.profiles[idx];
  }

  // --- Farms ---
  public getFarms(farmerId?: string): Farm[] {
    if (farmerId) {
      return this.data.farms.filter((f) => f.farmerId === farmerId);
    }
    return this.data.farms;
  }

  public getFarmById(id: string): Farm | undefined {
    return this.data.farms.find((f) => f.id === id);
  }

  public createFarm(farm: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Farm {
    const newFarm: Farm = {
      ...farm,
      id: `farm-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.farms.push(newFarm);
    this.saveToFile(this.data);
    if (this.supabase) {
      this.supabase.from('farms').insert({
        id: newFarm.id,
        farmer_id: newFarm.farmerId,
        name: newFarm.name,
        state: newFarm.state,
        district: newFarm.district,
        sub_district: newFarm.subDistrict,
        village: newFarm.village,
        pincode: newFarm.pincode,
        total_area_acres: newFarm.totalAreaAcres || 0,
        center_lat: newFarm.centerCoordinates?.lat ?? 30.901,
        center_lng: newFarm.centerCoordinates?.lng ?? 75.8573,
        irrigation_source: newFarm.irrigationSource,
        soil_type: newFarm.soilType,
      }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync] Farm write warning:', error.message);
      });
    }
    return newFarm;
  }

  public updateFarm(id: string, updates: Partial<Farm>): Farm | null {
    const idx = this.data.farms.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.data.farms[idx] = {
      ...this.data.farms[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToFile(this.data);
    return this.data.farms[idx];
  }

  public deleteFarm(id: string): boolean {
    const initialLen = this.data.farms.length;
    this.data.farms = this.data.farms.filter((f) => f.id !== id);
    if (this.data.farms.length < initialLen) {
      // Cascade delete fields belonging to this farm
      this.data.fields = this.data.fields.filter((f) => f.farmId !== id);
      this.saveToFile(this.data);
      if (this.supabase) {
        this.supabase.from('farms').delete().eq('id', id).then(({ error }) => {
          if (error) console.warn('[Supabase Sync] Farm delete warning:', error.message);
        });
      }
      return true;
    }
    return false;
  }

  // --- Fields ---
  public getFields(farmId?: string, farmerId?: string): Field[] {
    return this.data.fields.filter((field) => {
      if (farmId && field.farmId !== farmId) return false;
      if (farmerId && field.farmerId !== farmerId) return false;
      return true;
    });
  }

  public getFieldById(id: string): Field | undefined {
    return this.data.fields.find((f) => f.id === id);
  }

  public createField(field: Omit<Field, 'id' | 'createdAt' | 'updatedAt'>): Field {
    const newField: Field = {
      ...field,
      id: `field-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.fields.push(newField);
    this.saveToFile(this.data);
    if (this.supabase) {
      this.supabase.from('fields').insert({
        id: newField.id,
        farm_id: newField.farmId,
        farmer_id: newField.farmerId,
        name: newField.name,
        crop_name: newField.cropName,
        crop_variety: newField.cropVariety,
        sowing_date: newField.sowingDate || '2026-06-15',
        expected_harvest_date: newField.expectedHarvestDate,
        growth_stage: newField.growthStage || 'Vegetative',
        area_acres: newField.areaAcres || 1.0,
        boundary_geojson: (newField as any).boundaryCoordinates || newField.boundaryGeoJson,
        health_status: newField.healthStatus || 'Good',
      }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync] Field write warning:', error.message);
      });
    }
    return newField;
  }

  public updateField(id: string, updates: Partial<Field>): Field | null {
    const idx = this.data.fields.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.data.fields[idx] = {
      ...this.data.fields[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToFile(this.data);
    return this.data.fields[idx];
  }

  public deleteField(id: string): boolean {
    const initialLen = this.data.fields.length;
    this.data.fields = this.data.fields.filter((f) => f.id !== id);
    if (this.data.fields.length < initialLen) {
      this.saveToFile(this.data);
      return true;
    }
    return false;
  }

  // --- Devices ---
  public getDevices(farmerId?: string): IoTDevice[] {
    if (farmerId) {
      return this.data.devices.filter((d) => d.farmerId === farmerId);
    }
    return this.data.devices;
  }

  public getDeviceByCode(code: string): IoTDevice | undefined {
    return this.data.devices.find((d) => d.deviceCode === code);
  }

  public createDevice(device: Omit<IoTDevice, 'id' | 'createdAt'>): IoTDevice {
    const newDevice: IoTDevice = {
      ...device,
      id: `dev-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.devices.push(newDevice);
    this.saveToFile(this.data);
    if (this.supabase) {
      this.supabase.from('devices').insert({
        id: newDevice.id,
        device_code: newDevice.deviceCode,
        device_name: newDevice.deviceName,
        device_type: newDevice.deviceType,
        farmer_id: newDevice.farmerId,
        farm_id: newDevice.farmId || null,
        field_id: newDevice.fieldId || null,
        api_token: newDevice.apiToken || 'token_default',
        is_active: newDevice.isActive ?? true,
        is_simulated: newDevice.isSimulated ?? false,
        last_heartbeat: newDevice.lastHeartbeat,
        firmware_version: newDevice.firmwareVersion,
        battery_pct: newDevice.batteryPct ?? 100,
      }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync] Device write warning:', error.message);
      });
    }
    return newDevice;
  }

  public updateDeviceHeartbeat(deviceCode: string, batteryPct?: number): boolean {
    const dev = this.data.devices.find((d) => d.deviceCode === deviceCode);
    if (!dev) return false;
    dev.lastHeartbeat = new Date().toISOString();
    if (batteryPct !== undefined) dev.batteryPct = batteryPct;
    this.saveToFile(this.data);
    return true;
  }

  // --- Telemetry Readings ---
  public getDeviceReadings(deviceId?: string, fieldId?: string, limit: number = 50): DeviceTelemetryReading[] {
    let list = this.data.deviceReadings;
    if (deviceId) list = list.filter((r) => r.deviceId === deviceId);
    if (fieldId) list = list.filter((r) => r.fieldId === fieldId);
    return list.slice(-limit);
  }

  public addDeviceReading(reading: Omit<DeviceTelemetryReading, 'id' | 'recordedAt'>): DeviceTelemetryReading {
    const newReading: DeviceTelemetryReading = {
      ...reading,
      id: `tel-${Date.now().toString(36)}`,
      recordedAt: new Date().toISOString(),
    };
    this.data.deviceReadings.push(newReading);
    // Keep max 2000 readings in memory/file
    if (this.data.deviceReadings.length > 2000) {
      this.data.deviceReadings = this.data.deviceReadings.slice(-1500);
    }
    this.saveToFile(this.data);
    if (this.supabase) {
      this.supabase.from('device_readings').insert({
        id: newReading.id,
        device_id: newReading.deviceId,
        field_id: newReading.fieldId || null,
        soil_moisture_pct: newReading.soilMoisturePct,
        soil_temperature_c: newReading.soilTemperatureC,
        air_temperature_c: newReading.airTemperatureC,
        humidity_pct: newReading.humidityPct,
        nitrogen_mg_kg: newReading.nitrogenMgKg,
        phosphorus_mg_kg: newReading.phosphorusMgKg,
        potassium_mg_kg: newReading.potassiumMgKg,
        battery_pct: newReading.batteryPct,
        signal_rssi: newReading.signalRssi,
      }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync] Reading write warning:', error.message);
      });
    }
    return newReading;
  }


  // --- Drone Overlays ---
  public getDroneOverlays(fieldId?: string): DroneOverlay[] {
    if (fieldId) {
      return this.data.droneOverlays.filter((o) => o.fieldId === fieldId);
    }
    return this.data.droneOverlays;
  }

  public addDroneOverlay(overlay: Omit<DroneOverlay, 'id' | 'createdAt'>): DroneOverlay {
    const newOverlay: DroneOverlay = {
      ...overlay,
      id: `drone-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.droneOverlays.push(newOverlay);
    this.saveToFile(this.data);
    return newOverlay;
  }

  // --- Alerts ---
  public getAlerts(farmerId?: string): AlertNotification[] {
    let list = this.data.alerts;
    if (farmerId) list = list.filter((a) => a.farmerId === farmerId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addAlert(alert: Omit<AlertNotification, 'id' | 'createdAt'>): AlertNotification | null {
    // Check cooldown deduplication (6 hour window)
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const existing = this.data.alerts.find(
      (a) => a.cooldownKey === alert.cooldownKey && new Date(a.createdAt).getTime() > sixHoursAgo
    );
    if (existing) {
      // Deduplicated, do not spam
      return null;
    }

    const newAlert: AlertNotification = {
      ...alert,
      id: `alt-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.alerts.unshift(newAlert);
    this.saveToFile(this.data);
    return newAlert;
  }

  // --- FPO Cases ---
  public getFPOCases(fpoId?: string): FPOCase[] {
    return this.data.fpoCases.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public updateFPOCase(id: string, updates: Partial<FPOCase>): FPOCase | null {
    const idx = this.data.fpoCases.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.fpoCases[idx] = {
      ...this.data.fpoCases[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToFile(this.data);
    return this.data.fpoCases[idx];
  }

  // --- Crop Diagnoses ---
  public getCropDiagnoses(fieldId?: string, farmerId?: string): CropDiagnosis[] {
    let list = this.data.cropDiagnoses || [];
    if (fieldId) {
      list = list.filter((d) => d.fieldId === fieldId);
    }
    if (farmerId) {
      list = list.filter((d) => d.farmerId === farmerId);
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public addCropDiagnosis(diag: Omit<CropDiagnosis, 'id' | 'createdAt'>): CropDiagnosis {
    if (!this.data.cropDiagnoses) {
      this.data.cropDiagnoses = [];
    }
    const newDiag: CropDiagnosis = {
      ...diag,
      id: `diag-${Date.now().toString(36)}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.cropDiagnoses.unshift(newDiag);
    this.saveToFile(this.data);

    if (this.supabase) {
      this.supabase.from('crop_diagnoses').insert({
        id: newDiag.id,
        field_id: newDiag.fieldId || null,
        farmer_id: newDiag.farmerId,
        image_url: newDiag.imageUrl,
        source: newDiag.source,
        crop_detected: newDiag.cropDetected,
        primary_issue: newDiag.primaryIssue,
        severity: newDiag.severity,
        confidence_pct: newDiag.confidencePct,
        visible_evidence: newDiag.visibleEvidence,
        actionable_steps: newDiag.actionableSteps,
        preventative_measures: newDiag.preventativeMeasures,
        disclaimer: newDiag.disclaimer,
        escalation_needed: newDiag.escalationNeeded,
        escalation_notes: newDiag.escalationNotes,
        follow_up_questions: newDiag.followUpQuestions,
        latitude: newDiag.coordinates?.lat,
        longitude: newDiag.coordinates?.lng,
      }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync] Diagnosis insert warning:', error.message);
      });
    }

    return newDiag;
  }

  public deleteCropDiagnosis(id: string): boolean {
    if (!this.data.cropDiagnoses) return false;
    const initialLen = this.data.cropDiagnoses.length;
    this.data.cropDiagnoses = this.data.cropDiagnoses.filter((d) => d.id !== id);
    if (this.data.cropDiagnoses.length !== initialLen) {
      this.saveToFile(this.data);
      if (this.supabase) {
        this.supabase.from('crop_diagnoses').delete().eq('id', id).then(({ error }) => {
          if (error) console.warn('[Supabase Sync] Diagnosis delete warning:', error.message);
        });
      }
      return true;
    }
    return false;
  }

  public setCropDiagnoses(list: CropDiagnosis[]) {
    this.data.cropDiagnoses = list;
    this.saveToFile(this.data);
  }

  // Crop Marketplace (Buying & Selling Produce)
  public getCropListings(filters?: {
    cropName?: string;
    state?: string;
    listingType?: string;
    status?: string;
  }): CropMarketplaceListing[] {
    let list = this.data.cropListings || [];
    if (filters?.cropName && filters.cropName !== 'All') {
      const q = filters.cropName.toLowerCase();
      list = list.filter((item) => item.cropName.toLowerCase().includes(q) || item.variety.toLowerCase().includes(q));
    }
    if (filters?.state && filters.state !== 'All') {
      list = list.filter((item) => item.state.toLowerCase() === filters.state!.toLowerCase());
    }
    if (filters?.listingType && filters.listingType !== 'All') {
      list = list.filter((item) => item.listingType === filters.listingType);
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter((item) => item.status === filters.status);
    }
    return list;
  }

  public getCropListingById(id: string): CropMarketplaceListing | undefined {
    return (this.data.cropListings || []).find((l) => l.id === id);
  }

  public createCropListing(listing: Partial<CropMarketplaceListing>): CropMarketplaceListing {
    if (!this.data.cropListings) {
      this.data.cropListings = [];
    }

    const newListing: CropMarketplaceListing = {
      id: `list-${Date.now().toString(36)}-${Math.random().toString(36).substring(7)}`,
      farmerId: listing.farmerId || 'usr-farmer-001',
      farmerName: listing.farmerName || 'Registered Farmer',
      farmerPhone: listing.farmerPhone || '+919876543210',
      cropName: listing.cropName || 'Wheat',
      cropNameHi: listing.cropNameHi || listing.cropName || 'फसल',
      variety: listing.variety || 'Standard FAQ',
      quantityQuintals: Number(listing.quantityQuintals) || 50,
      expectedPricePerQtl: Number(listing.expectedPricePerQtl) || 2400,
      apmcModalPrice: Number(listing.apmcModalPrice) || 2380,
      qualityGrade: listing.qualityGrade || 'Grade A (FAQ)',
      state: listing.state || 'Punjab',
      district: listing.district || 'Ludhiana',
      mandi: listing.mandi || 'Ludhiana APMC Mandi',
      harvestDate: listing.harvestDate || new Date().toISOString().split('T')[0],
      imageUrl: listing.imageUrl || 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
      description: listing.description || 'Farm-fresh harvest ready for procurement at APMC or farm gate.',
      listingType: listing.listingType || 'sell',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.data.cropListings.unshift(newListing);
    this.saveToFile(this.data);
    return newListing;
  }

  public updateCropListingStatus(id: string, status: 'active' | 'negotiating' | 'sold'): boolean {
    const listing = (this.data.cropListings || []).find((l) => l.id === id);
    if (listing) {
      listing.status = status;
      this.saveToFile(this.data);
      return true;
    }
    return false;
  }
}

export const store = new PersistentDataStore();
