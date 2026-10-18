-- =========================================================================
-- KrishakDrishti Migration 01: Initial Database Schema
-- Defines all 9 core domain tables, constraints, foreign keys, and indexes
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Farmer, Coordinator, Agricultural Expert, Admin)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_auth_id UUID UNIQUE,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    preferred_language TEXT NOT NULL DEFAULT 'hi',
    role TEXT NOT NULL CHECK (role IN ('farmer', 'fpo_coordinator', 'agri_expert', 'admin')) DEFAULT 'farmer',
    fpo_id UUID,
    avatar_url TEXT,
    location_consent BOOLEAN NOT NULL DEFAULT true,
    alert_sms_consent BOOLEAN NOT NULL DEFAULT true,
    alert_voice_consent BOOLEAN NOT NULL DEFAULT false,
    alert_whatsapp_consent BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Farms Table
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    sub_district TEXT,
    village TEXT,
    pincode TEXT,
    total_area_acres NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (total_area_acres >= 0),
    center_lat NUMERIC(10,6) NOT NULL,
    center_lng NUMERIC(10,6) NOT NULL,
    irrigation_source TEXT DEFAULT 'Tube Well / Canal',
    soil_type TEXT DEFAULT 'Alluvial / Loam',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Fields Table
CREATE TABLE IF NOT EXISTS fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    crop_name TEXT NOT NULL,
    crop_variety TEXT,
    sowing_date DATE NOT NULL,
    expected_harvest_date DATE,
    growth_stage TEXT NOT NULL DEFAULT 'Vegetative' CHECK (growth_stage IN ('Germination', 'Vegetative', 'Flowering', 'Grain Filling', 'Maturity', 'Harvested')),
    area_acres NUMERIC(6,2) NOT NULL DEFAULT 1.0 CHECK (area_acres > 0),
    boundary_geojson JSONB, -- GeoJSON Polygon coordinates [[lng, lat], ...]
    health_status TEXT NOT NULL DEFAULT 'Good' CHECK (health_status IN ('Optimal', 'Good', 'Watch', 'At Risk', 'Critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. IoT Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_code TEXT UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('esp32_cam', 'soil_sensor', 'microclimate_station', 'irrigation_node')),
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    api_token TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_simulated BOOLEAN NOT NULL DEFAULT false,
    last_heartbeat TIMESTAMPTZ,
    firmware_version TEXT DEFAULT 'v1.4.2-esp32',
    battery_pct NUMERIC(5,2) DEFAULT 100 CHECK (battery_pct >= 0 AND battery_pct <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Device Telemetry Readings Table
CREATE TABLE IF NOT EXISTS device_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    soil_moisture_pct NUMERIC(5,2) CHECK (soil_moisture_pct >= 0 AND soil_moisture_pct <= 100),
    soil_temperature_c NUMERIC(5,2),
    air_temperature_c NUMERIC(5,2),
    humidity_pct NUMERIC(5,2) CHECK (humidity_pct >= 0 AND humidity_pct <= 100),
    nitrogen_mg_kg NUMERIC(6,2) CHECK (nitrogen_mg_kg >= 0),
    phosphorus_mg_kg NUMERIC(6,2) CHECK (phosphorus_mg_kg >= 0),
    potassium_mg_kg NUMERIC(6,2) CHECK (potassium_mg_kg >= 0),
    battery_pct NUMERIC(5,2) CHECK (battery_pct >= 0 AND battery_pct <= 100),
    signal_rssi NUMERIC(5,2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Crop Health Diagnoses Table (Mistral AI Multimodal)
CREATE TABLE IF NOT EXISTS crop_diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('web_upload', 'esp32_cam', 'whatsapp', 'drone')),
    crop_detected TEXT NOT NULL,
    primary_issue TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'severe')),
    confidence_pct NUMERIC(5,2) NOT NULL CHECK (confidence_pct >= 0 AND confidence_pct <= 100),
    visible_evidence TEXT NOT NULL,
    actionable_steps TEXT[] NOT NULL DEFAULT '{}',
    preventative_measures TEXT[] NOT NULL DEFAULT '{}',
    disclaimer TEXT NOT NULL DEFAULT 'AI preliminary advisory only. Confirm with Krishi Vigyan Kendra (KVK) officer before applying systemic chemical controls.',
    escalation_needed BOOLEAN NOT NULL DEFAULT false,
    escalation_notes TEXT,
    follow_up_questions TEXT[] NOT NULL DEFAULT '{}',
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Drone & Georeferenced Overlays Table
CREATE TABLE IF NOT EXISTS drone_overlays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    layer_type TEXT NOT NULL CHECK (layer_type IN ('rgb_orthomosaic', 'ndvi_index', 'thermal', 'elevation')),
    bounds_geojson JSONB NOT NULL,
    resolution_cm_per_pixel NUMERIC(6,2),
    flight_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Alerts & Risk Notifications Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('heavy_rain', 'heatwave', 'frost', 'pest_risk', 'water_stress', 'sensor_offline')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'advisory', 'warning', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    source_attribution TEXT NOT NULL DEFAULT 'Open-Meteo & KrishakDrishti Agronomic Engine',
    in_app_status TEXT NOT NULL DEFAULT 'delivered',
    sms_status TEXT NOT NULL DEFAULT 'not_configured',
    voice_status TEXT NOT NULL DEFAULT 'not_configured',
    whatsapp_status TEXT NOT NULL DEFAULT 'not_configured',
    cooldown_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. FPO Cases & Expert Assignments Table
CREATE TABLE IF NOT EXISTS fpo_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fpo_id UUID,
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    diagnosis_id UUID REFERENCES crop_diagnoses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_expert_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('open', 'under_review', 'field_visit_scheduled', 'resolved')) DEFAULT 'open',
    expert_notes TEXT,
    resolution_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_farms_farmer_id ON farms(farmer_id);
CREATE INDEX IF NOT EXISTS idx_fields_farm_id ON fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_fields_farmer_id ON fields(farmer_id);
CREATE INDEX IF NOT EXISTS idx_devices_farmer_id ON devices(farmer_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_code ON devices(device_code);
CREATE INDEX IF NOT EXISTS idx_device_readings_device_time ON device_readings(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_crop_diagnoses_field_time ON crop_diagnoses(field_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_farmer_time ON alerts(farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_cooldown ON alerts(cooldown_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fpo_cases_status ON fpo_cases(status, priority);
