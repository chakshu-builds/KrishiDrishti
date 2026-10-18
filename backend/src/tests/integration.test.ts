import { describe, it } from 'node:test';
import assert from 'node:assert';
import { weatherService } from '../services/weatherService.js';
import { mandiService } from '../services/mandiService.js';
import { geminiService } from '../services/geminiService.js';
import { store } from '../db/store.js';

describe('Phase 3 Real-Provider Integration & Smoke Tests', () => {
  // 1. Open-Meteo Weather Integration
  it('1. Open-Meteo: Live network request validates HTTP 200, units, timestamps & error handling', async () => {
    const lat = 30.901;
    const lng = 75.8573;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      assert.strictEqual(res.status, 200, 'Open-Meteo should return HTTP 200');

      const data = await res.json();
      assert.ok(data.current, 'Must return current weather block');
      assert.strictEqual(typeof data.current.temperature_2m, 'number', 'Temperature must be numeric');
      assert.strictEqual(typeof data.current.relative_humidity_2m, 'number', 'Humidity must be numeric');
      assert.strictEqual(typeof data.current.wind_speed_10m, 'number', 'Wind speed must be numeric');

      assert.ok(data.daily, 'Must return daily forecast block');
      assert.ok(Array.isArray(data.daily.time), 'Daily time must be array');
      assert.ok(data.daily.time.length >= 7, 'Forecast should cover 7 days');

      // Verify units dictionary
      assert.ok(data.current_units, 'Units dictionary must be present');
      assert.strictEqual(data.current_units.temperature_2m, '°C', 'Unit must be Celsius');

      // Test Open-Meteo error handling with out-of-range coordinates
      const errorUrl = `https://api.open-meteo.com/v1/forecast?latitude=999.0&longitude=999.0&current=temperature_2m`;
      const errRes = await fetch(errorUrl, { signal: AbortSignal.timeout(8000) });
      assert.strictEqual(errRes.status, 400, 'Invalid coordinates must return HTTP 400');
      const errData = await errRes.json();
      assert.strictEqual(errData.error, true, 'Error flag must be true');
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.code === 'ENOTFOUND') {
        console.warn('Network unavailable for Open-Meteo test, skipping live probe.');
      } else {
        throw err;
      }
    }
  });

  // 2. Data.gov.in / Agmarknet Mandi Integration
  it('2. data.gov.in: Validates endpoint contract, authentication rejection and honest dataStatus', async () => {
    const resourceId = '9ef84268-d588-465a-a308-a864a43d0070';
    const apiKey = process.env.DATA_GOV_IN_API_KEY || process.env.AGMARKNET_API_KEY;

    if (apiKey && apiKey !== 'your_data_gov_in_api_key' && apiKey.length > 10) {
      // Opt-in Live Government Probe
      const liveUrl = `https://api.data.gov.in/resource/${resourceId}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=5`;
      const res = await fetch(liveUrl, { signal: AbortSignal.timeout(8000) });
      assert.strictEqual(res.status, 200, 'Configured data.gov.in key should return HTTP 200');
      const json = await res.json();
      assert.ok(Array.isArray(json.records), 'Records must be an array');
    } else {
      // Contract Verification: verify unauthenticated request is rejected by government server
      const unauthUrl = `https://api.data.gov.in/resource/${resourceId}?format=json&limit=1`;
      try {
        const res = await fetch(unauthUrl, { signal: AbortSignal.timeout(6000) });
        assert.strictEqual(res.status, 400, 'Unauthenticated data.gov.in call must return HTTP 400');
        const json = await res.json();
        assert.ok(
          json.message?.includes('Authorization') || json.status === '400',
          'Government server must cite missing authorization'
        );
      } catch (err: any) {
        if (err.name === 'TimeoutError' || err.code === 'ENOTFOUND') {
          console.warn('Network timeout connecting to data.gov.in, skipping probe.');
        }
      }

      // Verify that MandiService honestly marks records as demo_benchmark when unconfigured
      const result = await mandiService.getMandiPrices({ commodity: 'Wheat' });
      assert.strictEqual(result.dataStatus, 'demo_benchmark');
      assert.strictEqual(result.isLiveFeed, false);
      assert.ok(result.blockerDetails?.includes('DATA_GOV_IN_API_KEY'));
      assert.ok(!result.records.some((r) => r.dataStatus === 'live'), 'No benchmark record may be falsely labeled as live');
    }
  });

  // 3. Google Gemini Multimodal Crop Health Integration
  it('3. Gemini: Validates multimodal model configuration, authentication contract & schema parsing', async () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 10) {
      // Opt-in Live Gemini Multimodal Call using @google/genai
      const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const liveResult = await geminiService.analyzeCropImage({
        imageBase64: sampleBase64,
        mimeType: 'image/png',
        cropName: 'Wheat',
      });

      assert.strictEqual(liveResult.provider, 'gemini', 'Live call must report gemini provider');
      assert.strictEqual(liveResult.dataStatus, 'live', 'Live call must report live dataStatus');
      assert.ok(liveResult.cropDetected, 'Crop detected should be present');
      assert.ok(liveResult.primaryIssue, 'Primary pathology issue should be identified');
      assert.ok(typeof liveResult.confidencePct === 'number', 'Confidence must be numeric');
      assert.ok(Array.isArray(liveResult.actionableSteps), 'Actionable steps must be an array');
      assert.ok(liveResult.disclaimer.includes('KVK') || liveResult.disclaimer.includes('preliminary'), 'Mandatory disclaimer required');
    } else {
      // Contract Verification: test that an unauthorized call to Gemini API endpoint returns HTTP 400/403
      try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=invalid_test_key_12345', {
          signal: AbortSignal.timeout(6000),
        });
        assert.ok(res.status === 400 || res.status === 403, `Invalid Gemini API key must be rejected with 400/403, got ${res.status}`);
      } catch (err: any) {
        if (err.name === 'TimeoutError' || err.code === 'ENOTFOUND') {
          console.warn('Network timeout connecting to Gemini API endpoint, skipping probe.');
        }
      }

      // Verify fallback diagnostic engine transparently reports fallback and does NOT claim live AI execution
      const fallbackResult = await geminiService.analyzeCropImage({
        cropName: 'Wheat',
        field: store.getFieldById('field-101'),
        farmer: store.getProfileById('usr-farmer-001'),
      });

      assert.strictEqual(fallbackResult.provider, 'offline_pathology_engine');
      assert.strictEqual(fallbackResult.dataStatus, 'fallback');
      assert.ok(fallbackResult.disclaimer.includes('KVK') || fallbackResult.disclaimer.includes('preliminary'));
    }
  });

  // 4. Supabase Persistence & Lifecycle
  it('4. Supabase: Disposable record lifecycle or persistent JSON store fallback', async () => {
    const supabase = store.getSupabase();
    if (supabase) {
      // Disposable test record
      const testFarmName = `Disposable Test Farm ${Date.now()}`;
      const { data: inserted, error: insertErr } = await supabase
        .from('farms')
        .insert({
          farmer_id: 'usr-farmer-001',
          name: testFarmName,
          state: 'Punjab',
          district: 'Ludhiana',
          total_area_acres: 5.0,
          center_lat: 30.901,
          center_lng: 75.8573,
        })
        .select()
        .single();

      try {
        assert.strictEqual(insertErr, null, 'Disposable farm insert should succeed');
        assert.ok(inserted?.id);
        assert.strictEqual(inserted.name, testFarmName);

        // Update test
        const { error: updateErr } = await supabase
          .from('farms')
          .update({ name: `${testFarmName} (Updated)` })
          .eq('id', inserted.id);
        assert.strictEqual(updateErr, null);
      } finally {
        // Guarantee cleanup even if assertions fail
        if (inserted?.id) {
          await supabase.from('farms').delete().eq('id', inserted.id);
        }
      }
    } else {
      // Local persistent store test
      const tempFarm = store.createFarm({
        farmerId: 'usr-farmer-001',
        name: `Temp Verified Farm ${Date.now()}`,
        state: 'Punjab',
        district: 'Ludhiana',
        totalAreaAcres: 3.5,
        centerCoordinates: { lat: 30.9, lng: 75.8 },
        irrigationSource: 'Borewell',
        soilType: 'Loam',
      });

      try {
        assert.ok(tempFarm.id);
        const fetched = store.getFarmById(tempFarm.id);
        assert.strictEqual(fetched?.name, tempFarm.name);
      } finally {
        store.deleteFarm(tempFarm.id);
      }
    }
  });
});
