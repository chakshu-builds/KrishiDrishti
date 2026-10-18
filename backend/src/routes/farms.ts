import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';

const router = Router();

// Get all farms (optionally filtered by farmerId)
router.get('/farms', (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string | undefined;
  const farms = store.getFarms(farmerId);
  return res.json({ farms });
});

// Create new farm
router.post('/farms', (req: Request, res: Response) => {
  const { farmerId, name, state, district, subDistrict, village, pincode, totalAreaAcres, centerCoordinates, irrigationSource, soilType } = req.body;
  if (!name || !state || !district || !centerCoordinates) {
    return res.status(400).json({ error: 'Missing required farm properties' });
  }
  const newFarm = store.createFarm({
    farmerId: farmerId || 'usr-farmer-001',
    name,
    state,
    district,
    subDistrict,
    village,
    pincode,
    totalAreaAcres: Number(totalAreaAcres) || 1.0,
    centerCoordinates: {
      lat: Number(centerCoordinates.lat),
      lng: Number(centerCoordinates.lng),
    },
    irrigationSource: irrigationSource || 'Canal / Tube Well',
    soilType: soilType || 'Alluvial Loam',
  });
  return res.status(201).json({ farm: newFarm, message: 'Farm created successfully' });
});

// Get single farm by ID with its nested fields
router.get('/farms/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const farm = store.getFarmById(id);
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }
  const fields = store.getFields(id);
  return res.json({ farm, fields });
});

// Helper to extract requester identity from headers, body, or query
function getRequesterProfile(req: Request) {
  const rawId = (req.headers['x-farmer-id'] || req.headers['x-user-id'] || req.body.requesterId || req.query.requesterId) as string | undefined;
  if (!rawId) return null;
  const cleanId = rawId.startsWith('token-') ? rawId.split('-').slice(1, 4).join('-') : rawId;
  return store.getProfileById(cleanId) || store.getProfileById(rawId);
}

// Update farm
router.patch('/farms/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const farm = store.getFarmById(id);
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  const requester = getRequesterProfile(req);
  if (!requester) {
    return res.status(401).json({ error: 'Authentication required: Missing x-farmer-id header or requesterId' });
  }

  if (requester.role !== 'admin' && requester.role !== 'fpo_coordinator' && farm.farmerId !== requester.id) {
    return res.status(403).json({ error: 'Unauthorized: You do not have permission to modify this farm parcel' });
  }

  const updates = req.body;
  const updated = store.updateFarm(id, updates);
  return res.json({ farm: updated, message: 'Farm updated successfully' });
});

// Delete farm and cascading fields
router.delete('/farms/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const farm = store.getFarmById(id);
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  const requester = getRequesterProfile(req);
  if (!requester) {
    return res.status(401).json({ error: 'Authentication required: Missing x-farmer-id header or requesterId' });
  }

  if (requester.role !== 'admin' && farm.farmerId !== requester.id) {
    return res.status(403).json({ error: 'Unauthorized: You do not have permission to delete this farm parcel' });
  }

  const success = store.deleteFarm(id);
  if (!success) {
    return res.status(404).json({ error: 'Farm not found' });
  }
  return res.json({ message: 'Farm and associated fields deleted successfully' });
});

// Get fields (by farmId or farmerId)
router.get('/fields', (req: Request, res: Response) => {
  const farmId = req.query.farmId as string | undefined;
  const farmerId = req.query.farmerId as string | undefined;
  const fields = store.getFields(farmId, farmerId);
  return res.json({ fields });
});

// Get single field by ID
router.get('/fields/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const field = store.getFieldById(id);
  if (!field) {
    return res.status(404).json({ error: 'Field not found' });
  }
  return res.json({ field });
});

// Create new field with GeoJSON boundary
router.post('/fields', (req: Request, res: Response) => {
  const { farmId, farmerId, name, cropName, cropVariety, sowingDate, expectedHarvestDate, growthStage, areaAcres, boundaryGeoJson, healthStatus } = req.body;
  if (!farmId || !name || !cropName || !sowingDate) {
    return res.status(400).json({ error: 'Missing required field parameters' });
  }

  const newField = store.createField({
    farmId,
    farmerId: farmerId || 'usr-farmer-001',
    name,
    cropName,
    cropVariety: cropVariety || 'Regional Certified Seed',
    sowingDate,
    expectedHarvestDate,
    growthStage: growthStage || 'Vegetative',
    areaAcres: Number(areaAcres) || 1.0,
    boundaryGeoJson: boundaryGeoJson || undefined,
    healthStatus: healthStatus || 'Good',
  });
  return res.status(201).json({ field: newField, message: 'Field registered successfully' });
});

// Update field boundary or crop status
router.patch('/fields/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const field = store.getFieldById(id);
  if (!field) {
    return res.status(404).json({ error: 'Field not found' });
  }

  const requester = getRequesterProfile(req);
  if (!requester) {
    return res.status(401).json({ error: 'Authentication required: Missing x-farmer-id header or requesterId' });
  }

  if (requester.role !== 'admin' && requester.role !== 'fpo_coordinator' && field.farmerId !== requester.id) {
    return res.status(403).json({ error: 'Unauthorized: You do not have permission to modify this field' });
  }

  const updates = req.body;
  const updated = store.updateField(id, updates);
  return res.json({ field: updated, message: 'Field updated successfully' });
});

// Delete field
router.delete('/fields/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const field = store.getFieldById(id);
  if (!field) {
    return res.status(404).json({ error: 'Field not found' });
  }

  const requester = getRequesterProfile(req);
  if (!requester) {
    return res.status(401).json({ error: 'Authentication required: Missing x-farmer-id header or requesterId' });
  }

  if (requester.role !== 'admin' && field.farmerId !== requester.id) {
    return res.status(403).json({ error: 'Unauthorized: You do not have permission to delete this field' });
  }

  const success = store.deleteField(id);
  if (!success) {
    return res.status(404).json({ error: 'Field not found' });
  }
  return res.json({ message: 'Field deleted successfully' });
});

// Drone / Raster overlays for field mapping
router.get('/fields/:id/overlays', (req: Request, res: Response) => {
  const { id } = req.params;
  const overlays = store.getDroneOverlays(id);
  return res.json({ overlays });
});

router.post('/fields/:id/overlays', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, imageUrl, layerType, bounds, resolutionCmPerPixel, flightDate, notes } = req.body;
  if (!title || !imageUrl || !bounds) {
    return res.status(400).json({ error: 'Missing title, imageUrl, or bounding coordinates' });
  }
  const overlay = store.addDroneOverlay({
    fieldId: id,
    title,
    imageUrl,
    layerType: layerType || 'rgb_orthomosaic',
    bounds,
    resolutionCmPerPixel: Number(resolutionCmPerPixel) || 3.0,
    flightDate: flightDate || new Date().toISOString().split('T')[0],
    notes,
  });
  return res.status(201).json({ overlay, message: 'Overlay saved' });
});

export default router;
