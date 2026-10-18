import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function sync() {
  console.log('Connecting to Supabase at:', url);
  const dbPath = path.resolve(process.cwd(), 'data', 'krishak_db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('krishak_db.json not found');
    return;
  }

  const raw = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(raw);

  // 1. Sync Profiles
  if (db.profiles && db.profiles.length > 0) {
    console.log(`Syncing ${db.profiles.length} profiles...`);
    for (const p of db.profiles) {
      const { error } = await supabase.from('profiles').upsert({
        id: p.id,
        full_name: p.fullName,
        phone_number: p.phoneNumber,
        preferred_language: p.preferredLanguage || 'hi',
        role: p.role || 'farmer',
        avatar_url: p.avatarUrl,
        location_consent: p.locationConsent ?? true,
        alert_sms_consent: p.alertConsent?.sms ?? true,
        alert_voice_consent: p.alertConsent?.voice ?? false,
        alert_whatsapp_consent: p.alertConsent?.whatsapp ?? true,
      });
      if (error) console.warn('Profile sync error for', p.id, error.message);
    }
    console.log('Profiles synced.');
  }

  // 2. Sync Farms
  if (db.farms && db.farms.length > 0) {
    console.log(`Syncing ${db.farms.length} farms...`);
    for (const f of db.farms) {
      const { error } = await supabase.from('farms').upsert({
        id: f.id,
        farmer_id: f.farmerId,
        name: f.name,
        state: f.state,
        district: f.district,
        sub_district: f.subDistrict,
        village: f.village,
        pincode: f.pincode,
        total_area_acres: f.totalAreaAcres || 0,
        center_lat: f.centerCoordinates?.lat ?? 30.901,
        center_lng: f.centerCoordinates?.lng ?? 75.8573,
        irrigation_source: f.irrigationSource,
        soil_type: f.soilType,
      });
      if (error) console.warn('Farm sync error for', f.id, error.message);
    }
    console.log('Farms synced.');
  }

  // 3. Sync Fields
  if (db.fields && db.fields.length > 0) {
    console.log(`Syncing ${db.fields.length} fields...`);
    for (const f of db.fields) {
      const { error } = await supabase.from('fields').upsert({
        id: f.id,
        farm_id: f.farmId,
        farmer_id: f.farmerId,
        name: f.name,
        crop_name: f.cropName,
        crop_variety: f.cropVariety,
        sowing_date: f.sowingDate || '2026-06-15',
        expected_harvest_date: f.expectedHarvestDate,
        growth_stage: f.growthStage || 'Vegetative',
        area_acres: f.areaAcres || 1.0,
        boundary_geojson: f.boundaryCoordinates,
        health_status: f.healthStatus || 'Good',
      });
      if (error) console.warn('Field sync error for', f.id, error.message);
    }
    console.log('Fields synced.');
  }

  // 4. Sync Devices
  if (db.devices && db.devices.length > 0) {
    console.log(`Syncing ${db.devices.length} devices...`);
    for (const d of db.devices) {
      const { error } = await supabase.from('devices').upsert({
        id: d.id,
        device_code: d.deviceCode,
        device_name: d.deviceName,
        device_type: d.deviceType,
        farmer_id: d.farmerId,
        farm_id: d.farmId,
        field_id: d.fieldId,
        api_token: d.apiToken || 'token_default',
        is_active: d.isActive ?? true,
        is_simulated: d.isSimulated ?? false,
        last_heartbeat: d.lastHeartbeat,
        firmware_version: d.firmwareVersion,
        battery_pct: d.batteryPct ?? 100,
      });
      if (error) console.warn('Device sync error for', d.id, error.message);
    }
    console.log('Devices synced.');
  }

  // 5. Sync Diagnoses
  if (db.cropDiagnoses && db.cropDiagnoses.length > 0) {
    console.log(`Syncing ${db.cropDiagnoses.length} crop diagnoses...`);
    for (const diag of db.cropDiagnoses) {
      const { error } = await supabase.from('crop_diagnoses').upsert({
        id: diag.id,
        field_id: diag.fieldId || null,
        farmer_id: diag.farmerId || 'usr-farmer-001',
        image_url: diag.imageUrl,
        source: diag.source || 'web_upload',
        crop_detected: diag.cropDetected,
        primary_issue: diag.primaryIssue,
        severity: diag.severity,
        confidence_pct: diag.confidencePct,
        visible_evidence: diag.visibleEvidence,
        actionable_steps: diag.actionableSteps || [],
        preventative_measures: diag.preventativeMeasures || [],
        disclaimer: diag.disclaimer,
        escalation_needed: diag.escalationNeeded ?? false,
        escalation_notes: diag.escalationNotes,
        follow_up_questions: diag.followUpQuestions || [],
        latitude: diag.coordinates?.lat,
        longitude: diag.coordinates?.lng,
      });
      if (error) console.warn('Diagnosis sync error for', diag.id, error.message);
    }
    console.log('Crop diagnoses synced.');
  }

  console.log('\n--- ALL DATA SYNCED SUCCESSFULLY TO SUPABASE ---');
}

sync().catch(console.error);
