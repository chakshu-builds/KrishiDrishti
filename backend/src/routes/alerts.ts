import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';

const router = Router();

// Get alerts
router.get('/alerts', (req: Request, res: Response) => {
  const farmerId = (req.query.farmerId as string) || 'usr-farmer-001';
  const alerts = store.getAlerts(farmerId);
  return res.json({ alerts });
});

// Update alert status (e.g. read/dismiss)
router.patch('/alerts/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const farmerId = (req.body.farmerId as string) || 'usr-farmer-001';
  const alerts = store.getAlerts(farmerId);
  const target = alerts.find((a) => a.id === id);
  if (!target) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  target.status.inApp = 'delivered'; // already seen
  return res.json({ alert: target, message: 'Alert acknowledged' });
});

export default router;
