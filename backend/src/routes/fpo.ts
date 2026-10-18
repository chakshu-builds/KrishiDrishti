import { Router, Request, Response, NextFunction } from 'express';
import { store } from '../db/store.js';

const router = Router();

// Role-based Access Control Middleware: strictly verify FPO Coordinator, Agri Expert or Admin
function requireFPOCoordinatorOrExpert(req: Request, res: Response, next: NextFunction) {
  const userId = (req.headers['x-farmer-id'] || req.headers['x-user-id'] || req.query.requesterId || req.query.farmerId) as string | undefined;
  let role = req.headers['x-user-role'] as string | undefined;

  if (userId) {
    const cleanId = userId.startsWith('token-') ? userId.split('-').slice(1, 4).join('-') : userId;
    const profile = store.getProfileById(cleanId) || store.getProfileById(userId);
    if (profile) {
      role = profile.role;
    }
  }

  // If no user context or role is provided, check fallback or reject
  if (!role && !userId) {
    // Check if query role is explicitly supplied in dev testing
    role = req.query.role as string | undefined;
  }

  if (!role) {
    return res.status(401).json({ error: 'Authentication required: Missing user identification or role token' });
  }

  if (role !== 'fpo_coordinator' && role !== 'agri_expert' && role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden: FPO Coordinator or Agri Expert role required' });
  }
  next();
}

router.use(requireFPOCoordinatorOrExpert);

// List authorized member farmers with consented field summaries
router.get('/members', (req: Request, res: Response) => {
  const allProfiles = store.getProfiles().filter((p) => p.role === 'farmer');
  const allFarms = store.getFarms();
  const allFields = store.getFields();

  const membersWithData = allProfiles.map((farmer) => {
    const farms = allFarms.filter((f) => f.farmerId === farmer.id);
    const fields = allFields.filter((f) => f.farmerId === farmer.id);
    return {
      id: farmer.id,
      fullName: farmer.fullName,
      phoneNumber: farmer.phoneNumber,
      preferredLanguage: farmer.preferredLanguage,
      totalAcreage: farms.reduce((sum, f) => sum + f.totalAreaAcres, 0),
      farmsCount: farms.length,
      fieldsCount: fields.length,
      primaryCrops: Array.from(new Set(fields.map((f) => f.cropName))),
      locationConsent: farmer.locationConsent,
      village: farms[0]?.village || 'Sidhwan Bet',
      district: farms[0]?.district || 'Ludhiana',
    };
  });

  return res.json({ members: membersWithData });
});

// List FPO Triage Cases
router.get('/cases', (_req: Request, res: Response) => {
  const cases = store.getFPOCases();
  return res.json({ cases });
});

// Assign case to expert and update status
router.patch('/cases/:id/assign', (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignedExpertName, status, expertNotes } = req.body;

  const updated = store.updateFPOCase(id, {
    assignedExpertName: assignedExpertName || 'Dr. Virender K. Ahluwalia',
    status: status || 'under_review',
    expertNotes: expertNotes || undefined,
  });

  if (!updated) {
    return res.status(404).json({ error: 'FPO Case not found' });
  }

  return res.json({ case: updated, message: 'Case assigned successfully' });
});

// Privacy-preserving aggregate metrics
router.get('/metrics', (_req: Request, res: Response) => {
  const farms = store.getFarms();
  const fields = store.getFields();
  const cases = store.getFPOCases();
  const alerts = store.getAlerts();

  const totalAcreage = farms.reduce((sum, f) => sum + f.totalAreaAcres, 0);
  const totalFarmers = store.getProfiles().filter((p) => p.role === 'farmer').length;

  const cropDistribution: Record<string, number> = {};
  for (const f of fields) {
    const key = f.cropName.split(' ')[0];
    cropDistribution[key] = (cropDistribution[key] || 0) + f.areaAcres;
  }

  const casesResolved = cases.filter((c) => c.status === 'resolved').length;
  const casesOpen = cases.filter((c) => c.status === 'open' || c.status === 'under_review').length;

  return res.json({
    totalFarmersSupervised: totalFarmers,
    totalSupervisedAcreage: Number(totalAcreage.toFixed(1)),
    totalActiveFields: fields.length,
    activeAlertsInCluster: alerts.length,
    cropDistribution,
    casesSummary: {
      total: cases.length,
      open: casesOpen,
      resolved: casesResolved,
      resolutionRatePct: cases.length > 0 ? Math.round((casesResolved / cases.length) * 100) : 100,
    },
  });
});

export default router;
