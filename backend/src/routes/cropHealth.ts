import { Router, Request, Response } from 'express';
import multer from 'multer';
import { store } from '../db/store.js';
import { geminiService } from '../services/geminiService.js';

import fs from 'fs';
import path from 'path';

const router = Router();

// Secure file upload configuration: max 10MB, strictly image MIME types
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, and WebP crop photos are permitted.'));
    }
  },
});

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// List diagnoses history
router.get('/diagnoses', (req: Request, res: Response) => {
  const fieldId = req.query.fieldId as string | undefined;
  const farmerId = req.query.farmerId as string | undefined;
  const diagnoses = store.getCropDiagnoses(fieldId, farmerId);
  return res.json({ diagnoses });
});

// Delete diagnosis by ID
router.delete('/diagnoses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = store.deleteCropDiagnosis(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Diagnosis not found' });
  }
  return res.json({ success: true, message: `Diagnosis ${id} deleted` });
});

// Analyze uploaded crop image
router.post('/diagnoses/analyze', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const fieldId = req.body.fieldId || 'field-101';
    const farmerId = req.body.farmerId || 'usr-farmer-001';
    const cropName = req.body.cropName || 'Field Crop';
    const source = req.body.source || 'web_upload';

    const field = store.getFieldById(fieldId);
    const farmer = store.getProfileById(farmerId);
    const farm = field ? store.getFarmById(field.farmId) : undefined;

    // GPS coordinates: only if explicitly provided in request
    let latitude = req.body.latitude ? parseFloat(req.body.latitude) : undefined;
    let longitude = req.body.longitude ? parseFloat(req.body.longitude) : undefined;

    let imageBase64: string | undefined;
    let mimeType = 'image/jpeg';
    let imageUrl = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80';

    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;

      // Save to disk for persistent static serving
      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const filename = `diag-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      imageUrl = `/uploads/${filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    const analysis = await geminiService.analyzeCropImage({
      imageBuffer: req.file?.buffer,
      imageBase64,
      mimeType,
      cropName: (req.body.cropName && req.body.cropName !== 'Auto-detect') ? req.body.cropName : 'Auto-detect',
      field,
      farmer,
      notes: imageUrl,
    });

    // Persist diagnosis
    const saved = store.addCropDiagnosis({
      ...analysis,
      fieldId,
      farmerId,
      imageUrl,
      source,
      coordinates: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
    });

    // If escalation needed, auto-create or update FPO Case
    if (saved.escalationNeeded) {
      const fpoCases = store.getFPOCases();
      const existing = fpoCases.find((c) => c.fieldId === fieldId && c.status === 'open');
      if (!existing) {
        // Auto-queue case for FPO expert triage
        store.getFPOCases().unshift({
          id: `case-${Date.now().toString(36)}`,
          fpoId: farmer?.fpoId || 'fpo-malwa-agri',
          farmerId,
          farmerName: farmer?.fullName || 'Farmer',
          farmerPhone: farmer?.phoneNumber || '+919876543210',
          fieldId,
          fieldName: field?.name || 'Field',
          cropName: field?.cropName || cropName,
          diagnosisId: saved.id,
          title: `AI Escalation: ${saved.primaryIssue}`,
          priority: saved.severity === 'high' || saved.severity === 'severe' ? 'urgent' : 'high',
          assignedExpertName: 'Unassigned',
          status: 'open',
          expertNotes: `Identified by KrishakDrishti AI with ${saved.confidencePct}% confidence. ${saved.escalationNotes}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return res.status(201).json({ diagnosis: saved, message: 'Crop analysis complete' });
  } catch (err: any) {
    console.error('[CropHealthRoute] Analysis failed:', err);
    return res.status(500).json({ error: 'Crop diagnosis analysis failed', details: err.message });
  }
});

export default router;
