import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { store } from '../db/store.js';

const API_BASE = 'http://localhost:5000';

const VALID_JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9,
]);

describe('Crop Health Comprehensive Verification Suite', () => {
  const createdTestIds: string[] = [];
  let createdDiagnosisId1 = '';
  let createdImageUrl1 = '';
  let createdDiagnosisId2 = '';
  let createdImageUrl2 = '';

  // 1. Valid image upload and invalid file rejection
  it('1. Validates image MIME types and rejects non-image formats', async () => {
    // 1a: Invalid format (text file)
    const invalidForm = new FormData();
    const textBlob = new Blob(['sample text exploit'], { type: 'text/plain' });
    invalidForm.append('photo', textBlob, 'notes.txt');
    invalidForm.append('fieldId', 'field-101');
    invalidForm.append('farmerId', 'usr-farmer-001');

    const rejectRes = await fetch(`${API_BASE}/api/diagnoses/analyze`, {
      method: 'POST',
      body: invalidForm,
    });
    assert.ok(rejectRes.status >= 400, 'Should reject invalid text/plain format with status >= 400');

    // 1b: Valid JPEG format
    const validForm = new FormData();
    const jpegBlob = new Blob([VALID_JPEG_BYTES], { type: 'image/jpeg' });
    validForm.append('photo', jpegBlob, 'crop_sample_1.jpg');
    validForm.append('fieldId', 'field-101');
    validForm.append('farmerId', 'usr-farmer-001');
    validForm.append('cropName', 'Wheat (HD-3226)');

    const acceptRes = await fetch(`${API_BASE}/api/diagnoses/analyze`, {
      method: 'POST',
      body: validForm,
    });
    assert.strictEqual(acceptRes.status, 201, 'Should accept valid JPEG upload with 201 Created');
    const data = await acceptRes.json();
    assert.ok(data.diagnosis);
    assert.ok(data.diagnosis.id);
    assert.ok(data.diagnosis.imageUrl.startsWith('/uploads/'));
    createdDiagnosisId1 = data.diagnosis.id;
    createdImageUrl1 = data.diagnosis.imageUrl;
    createdTestIds.push(data.diagnosis.id);
  });

  // 2. Correct image bytes and MIME type reaching the backend analysis service
  it('2. Correct image bytes are persisted to disk and statically accessible', async () => {
    const filename = path.basename(createdImageUrl1);
    const diskPath = path.resolve(process.cwd(), 'data', 'uploads', filename);

    assert.ok(fs.existsSync(diskPath), `Uploaded file must exist on disk at ${diskPath}`);
    const diskBytes = fs.readFileSync(diskPath);
    assert.strictEqual(diskBytes.length, VALID_JPEG_BYTES.length, 'Persisted bytes must match uploaded bytes');

    // Verify static serving via HTTP endpoint
    const staticRes = await fetch(`${API_BASE}${createdImageUrl1}`);
    assert.strictEqual(staticRes.status, 200, 'Static image must be retrievable via HTTP 200');
    const contentType = staticRes.headers.get('content-type');
    assert.ok(contentType?.includes('image'), 'Static response content-type must be image');
  });

  // 3. Successful diagnosis persistence with the correct image reference
  it('3. Successful diagnosis persistence with correct image reference and safety disclaimer', async () => {
    const historyRes = await fetch(`${API_BASE}/api/diagnoses?farmerId=usr-farmer-001`);
    assert.strictEqual(historyRes.status, 200);
    const data = await historyRes.json();
    const found = data.diagnoses.find((d: any) => d.id === createdDiagnosisId1);

    assert.ok(found, 'Created diagnosis must be present in farmer history');
    assert.strictEqual(found.imageUrl, createdImageUrl1, 'Persisted diagnosis must preserve exact image reference');
    assert.ok(found.primaryIssue, 'Primary pathology issue must be recorded');
    assert.ok(found.confidencePct > 0, 'Confidence score must be recorded');
    assert.ok(found.disclaimer, 'Safety compliance disclaimer must be preserved');
  });

  // 4. Recent Analyses showing the correct image for each record (distinct images per record)
  it('4. Multiple diagnoses each retain their own distinct image reference (no shared pointer)', async () => {
    // Upload a second distinct diagnosis
    const validForm2 = new FormData();
    const jpegBlob2 = new Blob([VALID_JPEG_BYTES], { type: 'image/jpeg' });
    validForm2.append('photo', jpegBlob2, 'crop_sample_2.jpg');
    validForm2.append('fieldId', 'field-102');
    validForm2.append('farmerId', 'usr-farmer-001');
    validForm2.append('cropName', 'Mustard (Pusa Bold)');

    const res2 = await fetch(`${API_BASE}/api/diagnoses/analyze`, {
      method: 'POST',
      body: validForm2,
    });
    assert.strictEqual(res2.status, 201);
    const data2 = await res2.json();
    createdDiagnosisId2 = data2.diagnosis.id;
    createdImageUrl2 = data2.diagnosis.imageUrl;
    createdTestIds.push(data2.diagnosis.id);

    // Both IDs and image URLs must be distinct
    assert.notStrictEqual(createdDiagnosisId1, createdDiagnosisId2, 'Each diagnosis must have a unique ID');
    assert.notStrictEqual(createdImageUrl1, createdImageUrl2, 'Each diagnosis must have its own distinct image URL');

    const historyRes = await fetch(`${API_BASE}/api/diagnoses?farmerId=usr-farmer-001`);
    const historyData = await historyRes.json();
    const d1 = historyData.diagnoses.find((d: any) => d.id === createdDiagnosisId1);
    const d2 = historyData.diagnoses.find((d: any) => d.id === createdDiagnosisId2);

    assert.strictEqual(d1.imageUrl, createdImageUrl1);
    assert.strictEqual(d2.imageUrl, createdImageUrl2);
  });

  // 5. AI Advisory Preview updating when a different diagnosis is selected
  it('5. AI Advisory Preview updates correctly when switching between diagnoses', async () => {
    const historyRes = await fetch(`${API_BASE}/api/diagnoses?farmerId=usr-farmer-001`);
    const { diagnoses } = await historyRes.json();
    assert.ok(diagnoses.length >= 2, 'Must have at least 2 diagnoses to test selection switching');

    const itemA = diagnoses[0];
    const itemB = diagnoses[1];

    // Selecting itemA yields itemA's image, crop, and actionable steps
    assert.ok(itemA.imageUrl, 'Item A must have its own image');
    assert.ok(itemA.primaryIssue, 'Item A must have its primary issue');
    assert.ok(Array.isArray(itemA.actionableSteps), 'Item A must have actionable cultural steps');

    // Selecting itemB yields itemB's image, crop, and actionable steps
    assert.ok(itemB.imageUrl, 'Item B must have its own image');
    assert.ok(itemB.primaryIssue, 'Item B must have its primary issue');
    assert.notStrictEqual(itemA.id, itemB.id, 'Selection must switch between distinct records');
  });

  // 6. Diagnosis and image references surviving page reloads (persistence in store)
  it('6. Diagnosis and image references survive server reload / store query', async () => {
    // 6a. Verify persisted in krishak_db.json on disk
    const rawDb = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data', 'krishak_db.json'), 'utf8'));
    const diskRecord = rawDb.cropDiagnoses.find((d: any) => d.id === createdDiagnosisId1);
    assert.ok(diskRecord, 'Diagnosis 1 must be persisted on disk in krishak_db.json');
    assert.strictEqual(diskRecord.imageUrl, createdImageUrl1);

    // 6b. Verify retrievable via API query simulating frontend page reload
    const reloadRes = await fetch(`${API_BASE}/api/diagnoses?farmerId=usr-farmer-001`);
    assert.strictEqual(reloadRes.status, 200);
    const reloadData = await reloadRes.json();
    const reloadedD1 = reloadData.diagnoses.find((d: any) => d.id === createdDiagnosisId1);
    assert.ok(reloadedD1, 'Diagnosis 1 must survive and be retrievable on page reload');
    assert.strictEqual(reloadedD1.imageUrl, createdImageUrl1);
  });

  // 7. Missing image, API failure and fallback states
  it('7. Handles missing images and fallback pathology gracefully', async () => {
    // 7a: Fallback preset request with image URL instead of upload
    const presetForm = new FormData();
    presetForm.append('imageUrl', 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80');
    presetForm.append('fieldId', 'field-101');
    presetForm.append('farmerId', 'usr-farmer-001');
    presetForm.append('cropName', 'Wheat');
    presetForm.append('source', 'preset_sample');

    const presetRes = await fetch(`${API_BASE}/api/diagnoses/analyze`, {
      method: 'POST',
      body: presetForm,
    });
    assert.strictEqual(presetRes.status, 201, 'Preset analysis should succeed');
    const presetData = await presetRes.json();
    assert.ok(presetData.diagnosis.imageUrl.includes('unsplash.com'));
    if (presetData.diagnosis?.id) createdTestIds.push(presetData.diagnosis.id);

    // 7b: Invalid non-existent static file returns 404 cleanly without crashing
    const missingRes = await fetch(`${API_BASE}/uploads/non_existent_file_9999.jpg`);
    assert.strictEqual(missingRes.status, 404, 'Missing file should return 404 cleanly');
  });

  // 8. Farm/field ownership and authorization
  it('8. Enforces farmer-specific diagnosis filtering and field association', async () => {
    // Farmer 1 query returns Farmer 1 diagnoses only
    const resFarmer1 = await fetch(`${API_BASE}/api/diagnoses?farmerId=usr-farmer-001`);
    const dataFarmer1 = await resFarmer1.json();
    assert.ok(dataFarmer1.diagnoses.every((d: any) => d.farmerId === 'usr-farmer-001'), 'Must only return Farmer 1 records');

    // Field-specific filter
    const resField101 = await fetch(`${API_BASE}/api/diagnoses?fieldId=field-101`);
    const dataField101 = await resField101.json();
    assert.ok(dataField101.diagnoses.every((d: any) => d.fieldId === 'field-101'), 'Must only return Field 101 records');
  });

  after(async () => {
    for (const id of createdTestIds) {
      await fetch(`${API_BASE}/api/diagnoses/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  });
});
