import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { store } from '../db/store.js';
import { weatherService } from '../services/weatherService.js';
import { mandiService } from '../services/mandiService.js';
import { geminiService } from '../services/geminiService.js';
import { alertEngine } from '../services/alertEngine.js';
import { voiceService } from '../services/voiceService.js';

describe('KrishakDrishti Agricultural MVP Test Suite', () => {
  it('1. Persistent Data Store seeds farmer profiles and fields correctly', () => {
    const profiles = store.getProfiles();
    assert.ok(profiles.length >= 2, 'Should have seeded profiles');
    const farmer = store.getProfileById('usr-farmer-001');
    assert.strictEqual(farmer?.fullName, 'Gurpreet Singh');
    assert.strictEqual(farmer?.preferredLanguage, 'pa');

    const farms = store.getFarms('usr-farmer-001');
    assert.ok(farms.length > 0, 'Farmer should have registered farms');
    assert.ok(farms[0].centerCoordinates.lat > 0, 'Farm should have GPS latitude');

    const fields = store.getFields(farms[0].id);
    assert.ok(fields.length > 0, 'Farm should have fields');
    assert.ok(fields[0].boundaryGeoJson, 'Field should have GeoJSON polygon boundary');
  });

  it('2. Weather Service returns valid conditions and agricultural forecasts', async () => {
    const weather = await weatherService.getWeather(30.901, 75.8573, 'Ludhiana');
    assert.ok(weather.temperatureC !== undefined, 'Temperature should be present');
    assert.ok(weather.weatherDescription, 'Weather description should be present');
    assert.ok(Array.isArray(weather.forecastDaily), 'Should return daily forecast');
    assert.ok(weather.forecastDaily.length > 0, 'Forecast should have at least 1 day');
  });

  it('3. Mandi Service returns APMC price benchmarks with authentic units', async () => {
    const result = await mandiService.getMandiPrices({ commodity: 'Wheat' });
    assert.ok(result.records.length > 0, 'Should find wheat mandi records');
    const record = result.records[0];
    assert.strictEqual(record.unit, '₹ / Quintal');
    assert.ok(record.modalPrice > 1000, 'Price should be realistic');
    assert.ok(record.historicalTrend && record.historicalTrend.length > 0, 'Historical trend should be provided');
  });

  it('4. Gemini AI Service generates cautious pathology diagnosis with required disclaimers', async () => {
    const field = store.getFieldById('field-101');
    const farmer = store.getProfileById('usr-farmer-001');
    const diagnosis = await geminiService.analyzeCropImage({
      cropName: 'Wheat',
      field,
      farmer,
      notes: 'Sample yellow streak observation',
    });

    assert.ok(diagnosis.cropDetected.includes('Wheat'));
    assert.ok(diagnosis.primaryIssue, 'Primary issue should be identified');
    assert.ok(diagnosis.confidencePct > 0, 'Confidence score should be populated');
    assert.ok(diagnosis.actionableSteps.length > 0, 'Actionable cultural steps should be present');
    assert.ok(diagnosis.disclaimer.includes('KVK') || diagnosis.disclaimer.includes('preliminary'), 'Mandatory disclaimer should be present');
    assert.ok(diagnosis.followUpQuestions.length > 0, 'Follow-up questions should be asked');
  });

  it('5. Alert Engine triggers heavy rain alert and respects cooldown deduplication', async () => {
    const farmer = store.getProfileById('usr-farmer-001')!;
    const fields = store.getFields(undefined, farmer.id);
    const devices = store.getDevices(farmer.id);

    // Use isolated test field to guarantee repeatability regardless of previous runs
    const isolatedField = {
      ...fields[0],
      id: `field-test-${Date.now()}`,
    };

    const testWeather = await weatherService.getWeather(30.901, 75.8573);
    // Simulate incoming heavy rain forecast
    testWeather.precipitationMm = 45.0;

    const alertsFirstPass = alertEngine.evaluateRisks({
      farmer,
      fields: [isolatedField],
      weather: testWeather,
      devices,
    });

    assert.ok(alertsFirstPass.length > 0, 'Alert should be triggered for heavy rain');

    // Second evaluation pass on same field should be deduplicated by cooldown key
    const alertsSecondPass = alertEngine.evaluateRisks({
      farmer,
      fields: [isolatedField],
      weather: testWeather,
      devices,
    });

    assert.strictEqual(alertsSecondPass.length, 0, 'Duplicate alert should be blocked by cooldown');
  });

  it('6. IoT Ingestion records sensor telemetry and updates device heartbeat', () => {
    const dev = store.getDeviceByCode('SOIL-NPK-LDH-02')!;
    const reading = store.addDeviceReading({
      deviceId: dev.id,
      fieldId: dev.fieldId,
      soilMoisturePct: 33.5,
      soilTemperatureC: 22.1,
      airTemperatureC: 27.5,
      humidityPct: 58.0,
      nitrogenMgKg: 140,
      phosphorusMgKg: 35,
      potassiumMgKg: 190,
      batteryPct: 92,
    });

    assert.ok(reading.id, 'Reading ID should be generated');
    const readings = store.getDeviceReadings(dev.id);
    assert.ok(readings.some((r) => r.id === reading.id), 'Reading should be persisted');
  });

  it('7. Voice IVR Service handles multilingual incoming call and menu selection', async () => {
    const incoming = voiceService.handleIncomingCall('+919876543210', 'test_call_sid_1');
    assert.ok(incoming.twiml.includes('<Gather'), 'TwiML should contain language gather');

    const langSelection = voiceService.handleLanguageSelection('test_call_sid_1', '2'); // Punjabi
    assert.strictEqual(langSelection.lang, 'pa');

    const menuSelection = await voiceService.handleMenuSelection('test_call_sid_1', '1', 'pa'); // Weather
    assert.ok(menuSelection.includes('<Say'), 'TwiML should speak weather info in Punjabi');
  });

  it('8. FPO Workspace enforces data integrity and expert assignment', () => {
    const cases = store.getFPOCases();
    assert.ok(cases.length > 0, 'FPO cases should exist');
    const firstCase = cases[0];

    const updated = store.updateFPOCase(firstCase.id, {
      assignedExpertName: 'Dr. Virender K. Ahluwalia',
      status: 'under_review',
      expertNotes: 'Spore sample examined under field microscope.',
    });

    assert.strictEqual(updated?.assignedExpertName, 'Dr. Virender K. Ahluwalia');
    assert.strictEqual(updated?.status, 'under_review');
  });

  it('9. Phase 1: Complete Farm & Field CRUD lifecycle with cascade deletion', () => {
    // 1. Create a new test farm
    const createdFarm = store.createFarm({
      farmerId: 'usr-farmer-001',
      name: 'Test Agro Parcel Alpha',
      state: 'Punjab',
      district: 'Patiala',
      subDistrict: 'Nabha',
      village: 'Bhadson',
      pincode: '147201',
      totalAreaAcres: 7.5,
      centerCoordinates: { lat: 30.375, lng: 76.289 },
      irrigationSource: 'Borewell Siphon',
      soilType: 'Clay Loam',
    });
    assert.ok(createdFarm.id, 'Farm ID should be generated');

    // 2. Fetch farm by ID
    const fetchedFarm = store.getFarmById(createdFarm.id);
    assert.strictEqual(fetchedFarm?.name, 'Test Agro Parcel Alpha');

    // 3. Update farm details
    const updatedFarm = store.updateFarm(createdFarm.id, {
      name: 'Updated Agro Parcel Alpha',
      totalAreaAcres: 8.0,
    });
    assert.strictEqual(updatedFarm?.name, 'Updated Agro Parcel Alpha');
    assert.strictEqual(updatedFarm?.totalAreaAcres, 8.0);

    // 4. Create child field under farm
    const createdField = store.createField({
      farmId: createdFarm.id,
      farmerId: 'usr-farmer-001',
      name: 'Test Basmati Plot',
      cropName: 'Paddy / Rice (धान)',
      cropVariety: 'Pusa Basmati 1121',
      sowingDate: '2026-06-15',
      expectedHarvestDate: '2026-10-20',
      growthStage: 'Vegetative',
      areaAcres: 4.0,
      healthStatus: 'Optimal',
    });
    assert.ok(createdField.id, 'Field ID should be generated');

    // 5. Query fields by farm ID
    const farmFields = store.getFields(createdFarm.id);
    assert.strictEqual(farmFields.length, 1);
    assert.strictEqual(farmFields[0].cropName, 'Paddy / Rice (धान)');

    // 6. Delete field
    const fieldDeleted = store.deleteField(createdField.id);
    assert.strictEqual(fieldDeleted, true, 'Field should be deleted');
    assert.strictEqual(store.getFieldById(createdField.id), undefined);

    // 7. Delete farm
    const farmDeleted = store.deleteFarm(createdFarm.id);
    assert.strictEqual(farmDeleted, true, 'Farm should be deleted');
    assert.strictEqual(store.getFarmById(createdFarm.id), undefined);
  });

  it('10. Phase 1: Profile registration, preference update, and role validation', () => {
    // 1. Create a new farmer profile
    const newProfile = store.createProfile({
      fullName: 'Baldev Singh Dhillon',
      phoneNumber: '+919811223344',
      preferredLanguage: 'pa',
      role: 'farmer',
      locationConsent: true,
      alertConsent: { sms: true, voice: true, whatsapp: true },
    });
    assert.ok(newProfile.id, 'Profile ID should be created');
    assert.strictEqual(newProfile.fullName, 'Baldev Singh Dhillon');

    // 2. Update language preference to Hindi
    const updatedProfile = store.updateProfile(newProfile.id, {
      preferredLanguage: 'hi',
      alertConsent: { sms: true, voice: false, whatsapp: true },
    });
    assert.strictEqual(updatedProfile?.preferredLanguage, 'hi');
    assert.strictEqual(updatedProfile?.alertConsent.voice, false);

    // 3. Verify FPO Coordinator role exists and has authorized cluster
    const fpoProfile = store.getProfileById('usr-fpo-coord');
    assert.strictEqual(fpoProfile?.role, 'fpo_coordinator');
    assert.ok(fpoProfile?.fpoId, 'FPO coordinator must have fpoId assigned');
  });

  it('11. Phase 2: Open-Meteo Weather adapter returns live/cached status, farm coordinates & explicit units', async () => {
    const lat = 30.901;
    const lng = 75.8573;
    const weather = await weatherService.getWeather(lat, lng, 'Ludhiana Agricultural Belt');

    // 1. Verify status is live or cached (never undefined)
    assert.ok(weather.status === 'live' || weather.status === 'cached', `Status should be live or cached, got ${weather.status}`);
    
    // 2. Verify farm coordinates match requested location
    assert.strictEqual(weather.latitude, lat);
    assert.strictEqual(weather.longitude, lng);

    // 3. Verify explicit measurement units are defined
    assert.ok(weather.units, 'Units dictionary should be present');
    assert.strictEqual(weather.units.temperatureC, '°C');
    assert.strictEqual(weather.units.relativeHumidityPct, '%');
    assert.strictEqual(weather.units.windSpeedKmh, 'km/h');
    assert.strictEqual(weather.units.precipitationMm, 'mm');

    // 4. Verify observation time is a valid ISO string
    assert.ok(!isNaN(Date.parse(weather.observationTime)), 'Observation time must be valid ISO timestamp');

    // 5. Verify caching works within window
    const cachedWeather = await weatherService.getWeather(lat, lng, 'Ludhiana Agricultural Belt');
    assert.strictEqual(cachedWeather.status, 'cached', 'Immediate subsequent fetch should be served from memory cache');
    assert.ok(cachedWeather.cacheAgeSeconds !== undefined && cachedWeather.cacheAgeSeconds >= 0);
  });

  it('12. Phase 2: Decoupled Agronomic Risk Engine with configurable thresholds & Frost detection', async () => {
    // 1. Inspect default thresholds
    const defaultThresholds = alertEngine.getThresholds();
    assert.strictEqual(typeof defaultThresholds.frostRiskMinTempC, 'number');
    assert.strictEqual(typeof defaultThresholds.heavyRainPrecipitationForecastMm, 'number');
    assert.strictEqual(typeof defaultThresholds.heatwaveCurrentTempC, 'number');

    // 2. Update thresholds dynamically
    alertEngine.updateThresholds({ frostRiskMinTempC: 3.5 });
    assert.strictEqual(alertEngine.getThresholds().frostRiskMinTempC, 3.5);

    // 3. Evaluate cold-weather conditions (< 3.5°C) to trigger Frost warning
    const farmer = store.getProfileById('usr-farmer-001')!;
    const fields = store.getFields(undefined, farmer.id);
    const isolatedField = { ...fields[0], id: `field-frost-${Date.now()}` };

    const coldWeather = await weatherService.getWeather(30.901, 75.8573);
    coldWeather.temperatureC = 2.1; // below frost threshold
    coldWeather.forecastDaily = [{
      date: '2026-10-19',
      maxTempC: 14,
      minTempC: 1.5,
      precipitationMm: 0,
      precipitationProbabilityPct: 10,
      weatherCode: 0,
      weatherDescription: 'Frost risk',
    }];

    const alerts = alertEngine.evaluateRisks({
      farmer,
      fields: [isolatedField],
      weather: coldWeather,
    });

    const frostAlert = alerts.find((a) => a.alertType === 'frost');
    assert.ok(frostAlert, 'Should trigger frost alert when temp falls below threshold');
    assert.strictEqual(frostAlert.severity, 'critical');
    assert.ok(frostAlert.recommendedAction.includes('irrigation') || frostAlert.recommendedAction.includes('protective'));

    // 4. Verify cooldown prevents duplicate frost alert within window
    const secondPass = alertEngine.evaluateRisks({
      farmer,
      fields: [isolatedField],
      weather: coldWeather,
    });
    assert.strictEqual(secondPass.length, 0, 'Second evaluation should be blocked by cooldown key');

    // Reset threshold back to 4.0
    alertEngine.updateThresholds({ frostRiskMinTempC: 4.0 });
  });

  it('13. Phase 2: Mandi Price Adapter distinguishes dataStatus, APMC market comparison & blocker details', async () => {
    // 1. Fetch prices
    const result = await mandiService.getMandiPrices({ commodity: 'Wheat', state: 'Punjab' });
    assert.ok(result.records.length > 0, 'Should return records');
    
    // 2. Verify honest dataStatus
    assert.ok(['live', 'delayed', 'cached', 'demo_benchmark'].includes(result.dataStatus), `Unexpected status: ${result.dataStatus}`);
    assert.ok(result.retrievalTime, 'Retrieval time must be populated');

    // 3. Check each record has required fields
    const r = result.records[0];
    assert.ok(r.commodity, 'Commodity is required');
    assert.ok(r.market, 'Market APMC is required');
    assert.ok(r.modalPrice > 0, 'Modal price is required');
    assert.ok(r.unit.includes('Quintal'), 'Unit should be quintals');
    assert.ok(r.observationDate, 'Observation date is required');
    assert.ok(r.dataStatus, 'Record dataStatus is required');

    // 4. Verify market comparison for arbitrage analysis
    const comp = await mandiService.compareMarkets('Wheat');
    assert.ok(comp.length >= 2, 'Should compare across multiple markets');
    assert.ok(comp.every((c) => c.market && c.modalPrice > 0));

    // 5. Verify blocker details when API key is missing
    if (result.dataStatus === 'demo_benchmark') {
      assert.ok(result.blockerDetails, 'Blocker details must explain why demo benchmark is served');
      assert.ok(result.blockerDetails.includes('data.gov.in') || result.blockerDetails.includes('DATAGOVIN_API_KEY'));
    }
  });

  it('14. Phase 2: Multimodal Crop Health Analysis with structured output, safety disclaimer & escalation', async () => {
    const field = store.getFieldById('field-101')!;
    const farmer = store.getProfileById('usr-farmer-001')!;

    // 1. Run analysis
    const diagnosis = await geminiService.analyzeCropImage({
      cropName: 'Wheat',
      field,
      farmer,
      notes: 'Sample yellow rust leaves',
      imageUrl: '/uploads/sample-wheat.jpg',
    });

    // 2. Verify structured schema completeness
    assert.ok(diagnosis.cropDetected, 'Crop detected must be present');
    assert.ok(diagnosis.primaryIssue, 'Primary issue must be present');
    assert.ok(diagnosis.visibleEvidence, 'Visible optical evidence must be described');
    assert.ok(Array.isArray(diagnosis.actionableSteps), 'Actionable steps must be an array');
    assert.ok(diagnosis.actionableSteps.length > 0, 'Must have actionable steps');
    assert.ok(['low', 'moderate', 'high', 'severe'].includes(diagnosis.severity), 'Valid severity level');
    assert.ok(typeof diagnosis.confidencePct === 'number' && diagnosis.confidencePct >= 0 && diagnosis.confidencePct <= 100);

    // 3. Verify safety disclaimer prevents unvalidated chemical prescriptions
    assert.ok(diagnosis.disclaimer, 'Disclaimer must be present');
    assert.ok(
      diagnosis.disclaimer.includes('KVK') ||
      diagnosis.disclaimer.includes('preliminary') ||
      diagnosis.disclaimer.includes('agricultural extension'),
      'Must recommend expert/KVK consultation'
    );

    // 4. Verify persistence in store
    const persisted = store.addCropDiagnosis({
      ...diagnosis,
      imageUrl: '/uploads/sample-wheat.jpg',
    });
    assert.ok(persisted.id, 'Diagnosis ID must be generated');
    const history = store.getCropDiagnoses(undefined, farmer.id);
    assert.ok(history.length > 0, 'Diagnosis should be stored in field history');
    assert.ok(history.some((h) => h.id === persisted.id));
  });

  it('15. Phase 2: Data Persistence & Cross-Farmer Land Ownership Isolation', () => {
    const farmer1 = 'usr-farmer-001';
    const farmer2 = 'usr-fpo-coord';

    // 1. Create farm owned by farmer1
    const farm1 = store.createFarm({
      farmerId: farmer1,
      name: 'Farmer 1 Private Estate',
      state: 'Punjab',
      district: 'Ludhiana',
      totalAreaAcres: 12.0,
      centerCoordinates: { lat: 30.9, lng: 75.8 },
      irrigationSource: 'Canal',
      soilType: 'Alluvial',
    });
    assert.ok(farm1.id);

    // 2. Farmer 1 can fetch their farms
    const f1Farms = store.getFarms(farmer1);
    assert.ok(f1Farms.some((f) => f.id === farm1.id));

    // 3. Farmer 2 querying their own farms should NOT see farmer 1's farm
    const f2Farms = store.getFarms(farmer2);
    assert.ok(!f2Farms.some((f) => f.id === farm1.id), 'Cross-farmer isolation: Farmer 2 must not see Farmer 1 farm');

    // Cleanup
    store.deleteFarm(farm1.id);
  });
});

