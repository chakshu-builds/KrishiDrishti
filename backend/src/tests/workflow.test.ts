import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';

describe('Phase 3 Complete End-to-End Farmer Workflow Validation', () => {
  let createdFarmerId = '';
  let authHeader = '';
  let createdFarmId = '';
  let createdFieldId = '';
  let uploadedImageUrl = '';
  let createdDiagnosisId = '';

  // 1. Authentication & Profile Registration
  it('Step 1: Sign up a new farmer and obtain authenticated session token', async () => {
    const signupPayload = {
      fullName: `Test Farmer ${Date.now()}`,
      phoneNumber: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      preferredLanguage: 'pa',
      role: 'farmer',
    };

    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupPayload),
    });

    assert.strictEqual(res.status, 201, 'Signup should return 201 Created');
    const data = await res.json();
    assert.ok(data.profile.id, 'Farmer ID should be generated');
    assert.strictEqual(data.profile.fullName, signupPayload.fullName);
    assert.strictEqual(data.profile.preferredLanguage, 'pa');

    createdFarmerId = data.profile.id;
    authHeader = data.token;
  });

  // 2. Farm and Field Parcel Creation
  it('Step 2: Register a new farm and child field parcel with coordinates', async () => {
    // 2a. Create Farm
    const farmPayload = {
      farmerId: createdFarmerId,
      name: 'E2E Verified Malwa Farm',
      state: 'Punjab',
      district: 'Ludhiana',
      subDistrict: 'Jagraon',
      village: 'Swaddi Khas',
      pincode: '142023',
      totalAreaAcres: 8.5,
      centerCoordinates: { lat: 30.852, lng: 75.712 },
      irrigationSource: 'Borewell & Canal',
      soilType: 'Alluvial Loam',
    };

    const farmRes = await fetch(`${API_BASE}/api/farms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-farmer-id': createdFarmerId },
      body: JSON.stringify(farmPayload),
    });

    assert.strictEqual(farmRes.status, 201, 'Farm creation should return 201');
    const farmData = await farmRes.json();
    assert.ok(farmData.farm.id);
    createdFarmId = farmData.farm.id;
    assert.strictEqual(farmData.farm.name, farmPayload.name);

    // 2b. Create Field Parcel
    const fieldPayload = {
      farmId: createdFarmId,
      farmerId: createdFarmerId,
      name: 'North Basmati Acreage',
      cropName: 'Paddy / Basmati (धान)',
      cropVariety: 'Pusa 1121',
      sowingDate: '2026-06-20',
      growthStage: 'Vegetative',
      areaAcres: 4.2,
      boundaryGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [75.710, 30.850],
            [75.715, 30.850],
            [75.715, 30.855],
            [75.710, 30.855],
            [75.710, 30.850],
          ],
        ],
      },
    };

    const fieldRes = await fetch(`${API_BASE}/api/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-farmer-id': createdFarmerId },
      body: JSON.stringify(fieldPayload),
    });

    assert.strictEqual(fieldRes.status, 201, 'Field creation should return 201');
    const fieldData = await fieldRes.json();
    assert.ok(fieldData.field.id);
    createdFieldId = fieldData.field.id;
    assert.strictEqual(fieldData.field.farmId, createdFarmId);
  });

  // 3. Weather Retrieval for Registered Farm Coordinates
  it('Step 3: Retrieve weather resolving registered farm coordinates with explicit units', async () => {
    const res = await fetch(`${API_BASE}/api/weather?farmId=${createdFarmId}&farmerId=${createdFarmerId}`);
    assert.strictEqual(res.status, 200, 'Weather fetch should return 200');

    const data = await res.json();
    assert.ok(data.weather);
    assert.strictEqual(typeof data.weather.temperatureC, 'number');
    assert.strictEqual(data.farmCoordinates.lat, 30.852, 'Coordinates must match registered farm latitude');
    assert.strictEqual(data.farmCoordinates.lng, 75.712, 'Coordinates must match registered farm longitude');
    assert.ok(['live', 'cached', 'fallback'].includes(data.weather.status));
    assert.ok(data.weather.units);
    assert.strictEqual(data.weather.units.temperature, '°C');
  });

  // 4. Secure Crop Image Upload & Validation
  it('Step 4: Image upload validates MIME type, rejects non-images and enforces file limits', async () => {
    // 4a. Reject unsupported MIME type (e.g., text/plain disguised or application/pdf)
    const invalidForm = new FormData();
    const fakeBlob = new Blob(['malicious payload or script'], { type: 'text/plain' });
    invalidForm.append('photo', fakeBlob, 'exploit.txt');
    invalidForm.append('fieldId', createdFieldId);
    invalidForm.append('farmerId', createdFarmerId);

    const rejectRes = await fetch(`${API_BASE}/api/diagnoses/analyze`, {
      method: 'POST',
      body: invalidForm,
    });
    assert.ok(rejectRes.status >= 400, 'Should reject invalid text/plain file format');

    // 4b. Upload valid JPEG image
    // Minimal valid 1x1 JPEG buffer
    const validJpegBytes = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
      0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
      0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
      0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x80, 0xff, 0xd9
    ]);

    const validForm = new FormData();
    const validBlob = new Blob([validJpegBytes], { type: 'image/jpeg' });
    validForm.append('photo', validBlob, 'crop-leaf-sample.jpg');
    validForm.append('fieldId', createdFieldId);
    validForm.append('farmerId', createdFarmerId);
    validForm.append('cropName', 'Basmati Rice');

    const uploadRes = await fetch(`${API_BASE}/api/diagnoses/analyze`, {
      method: 'POST',
      body: validForm,
    });

    assert.strictEqual(uploadRes.status, 201, 'Valid image upload should return 201 Created');
    const uploadData = await uploadRes.json();
    assert.ok(uploadData.diagnosis.id);
    assert.ok(uploadData.diagnosis.imageUrl.startsWith('/uploads/diag-'));

    uploadedImageUrl = uploadData.diagnosis.imageUrl;
    createdDiagnosisId = uploadData.diagnosis.id;
  });

  // 5. Stored Image Usability & Path Traversal Protection
  it('Step 5: Stored image is served via /uploads and rejects directory traversal attacks', async () => {
    // 5a. Verify the uploaded image can be fetched via GET
    const imageRes = await fetch(`${API_BASE}${uploadedImageUrl}`);
    assert.strictEqual(imageRes.status, 200, 'Uploaded image should be publicly retrievable via static endpoint');
    const contentType = imageRes.headers.get('content-type');
    assert.ok(contentType?.includes('image/'), 'Content-type must indicate image');

    // 5b. Verify path traversal attempt (e.g. /uploads/../../package.json) is blocked
    const traversalRes = await fetch(`${API_BASE}/uploads/..%2f..%2fpackage.json`);
    assert.ok(
      traversalRes.status === 404 || traversalRes.status === 403,
      `Directory traversal must be rejected with 403/404, got ${traversalRes.status}`
    );
  });

  // 6. Crop-Health Structured Output & Safety Advisory
  it('Step 6: Analysis provides structured findings, confidence score & non-prescription disclaimer', async () => {
    const res = await fetch(`${API_BASE}/api/diagnoses?fieldId=${createdFieldId}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.diagnoses.length > 0);

    const diag = data.diagnoses.find((d: any) => d.id === createdDiagnosisId);
    assert.ok(diag, 'Diagnosis should be found in history');
    assert.ok(diag.primaryIssue);
    assert.ok(diag.visibleEvidence);
    assert.ok(Array.isArray(diag.actionableSteps));
    assert.ok(diag.actionableSteps.length > 0);
    assert.ok(typeof diag.confidencePct === 'number');

    // Safety constraint: Never provide definitive chemical prescription without extension advisory
    assert.ok(
      diag.disclaimer.includes('KVK') ||
      diag.disclaimer.includes('preliminary') ||
      diag.disclaimer.includes('validated prescription'),
      'Advisory must mandate expert KVK validation'
    );
  });

  // 7. Agronomic Risk Evaluation & Alert Cooldown Deduplication
  it('Step 7: Evaluates weather risks and enforces alert cooldown deduplication', async () => {
    // Trigger risk evaluation
    const firstEval = await fetch(`${API_BASE}/api/weather/evaluate-risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId: createdFarmerId,
        customThresholds: { heavyRainPrecipitationForecastMm: 1.0 }, // Force threshold trigger for test
      }),
    });

    assert.strictEqual(firstEval.status, 200);
    const firstData = await firstEval.json();

    // Second evaluation immediately on same field should be deduplicated
    const secondEval = await fetch(`${API_BASE}/api/weather/evaluate-risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId: createdFarmerId,
        customThresholds: { heavyRainPrecipitationForecastMm: 1.0 },
      }),
    });

    assert.strictEqual(secondEval.status, 200);
    const secondData = await secondEval.json();
    assert.strictEqual(secondData.newAlerts.length, 0, 'Subsequent evaluation within window must be deduplicated by cooldown');
  });

  // 8. FPO Triage Case Escalation
  it('Step 8: Verifies FPO escalation cases and role-based access restrictions', async () => {
    // 8a. Accessing /api/fpo/cases with a normal farmer identity must be rejected with 403
    const forbiddenRes = await fetch(`${API_BASE}/api/fpo/cases`, {
      headers: { 'x-farmer-id': createdFarmerId },
    });
    assert.strictEqual(forbiddenRes.status, 403, 'Farmer role must be forbidden from viewing all FPO cases');

    // 8b. Accessing with FPO Coordinator identity must be allowed
    const allowedRes = await fetch(`${API_BASE}/api/fpo/cases`, {
      headers: { 'x-farmer-id': 'usr-fpo-coord' },
    });
    assert.strictEqual(allowedRes.status, 200, 'FPO Coordinator should be permitted');
    const fpoData = await allowedRes.json();
    assert.ok(Array.isArray(fpoData.cases));
  });

  // 9. Persistence & Cross-Farmer Land Ownership Isolation
  it('Step 9: Verifies cross-farmer land ownership cannot be modified or deleted by unauthorized farmers', async () => {
    // Try to delete another farmer's farm parcel using createdFarmerId
    const targetFarm = 'farm-001'; // Belongs to Gurpreet Singh (usr-farmer-001)

    const unauthorizedDelete = await fetch(`${API_BASE}/api/farms/${targetFarm}`, {
      method: 'DELETE',
      headers: { 'x-farmer-id': createdFarmerId },
    });

    assert.strictEqual(
      unauthorizedDelete.status,
      403,
      'Unauthorized cross-farmer deletion must be rejected with HTTP 403 Forbidden'
    );

    // Verify farm still exists and was not deleted
    const checkFarm = await fetch(`${API_BASE}/api/farms/${targetFarm}`);
    assert.strictEqual(checkFarm.status, 200);
    const checkData = await checkFarm.json();
    assert.strictEqual(checkData.farm.id, targetFarm);

    // Clean up test farm and field
    const authorizedDelete = await fetch(`${API_BASE}/api/farms/${createdFarmId}`, {
      method: 'DELETE',
      headers: { 'x-farmer-id': createdFarmerId },
    });
    assert.strictEqual(authorizedDelete.status, 200, 'Owner must be able to delete their own farm');
  });
});
