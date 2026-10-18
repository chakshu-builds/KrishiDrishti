import { Router, Request, Response } from 'express';
import { weatherService } from '../services/weatherService.js';
import { alertEngine } from '../services/alertEngine.js';
import { store } from '../db/store.js';

const router = Router();

// GET /weather: Pure weather retrieval with farm GPS coordinate resolution & rate-limit cache
router.get('/weather', async (req: Request, res: Response) => {
  try {
    const farmerId = (req.query.farmerId as string) || 'usr-farmer-001';
    const farmId = req.query.farmId as string | undefined;

    const city = req.query.city as string | undefined;
    let lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    let lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    let locationName = req.query.location as string | undefined;

    let weather;
    if (city && city.trim()) {
      weather = await weatherService.getWeatherByCity(city.trim());
      lat = weather.latitude;
      lng = weather.longitude;
      locationName = weather.locationName;
    } else {
      // Resolve farm coordinates if not explicitly passed
      if (lat === undefined || lng === undefined) {
        const farms = farmId ? [store.getFarmById(farmId)].filter(Boolean) : store.getFarms(farmerId);
        const activeFarm = farms[0];
        if (activeFarm?.centerCoordinates) {
          lat = activeFarm.centerCoordinates.lat;
          lng = activeFarm.centerCoordinates.lng;
          locationName = locationName || `${activeFarm.name} (${activeFarm.district}, ${activeFarm.state})`;
        } else {
          lat = 30.901;
          lng = 75.8573;
          locationName = locationName || 'Ludhiana Agricultural Belt';
        }
      }
      weather = await weatherService.getWeather(lat, lng, locationName);
    }

    const activeAlerts = store.getAlerts(farmerId);

    return res.json({
      weather,
      activeAlerts,
      farmCoordinates: { lat, lng, locationName },
    });
  } catch (err: any) {
    console.error('[WeatherRoute] Failed to get weather:', err);
    return res.status(500).json({ error: 'Failed to retrieve weather data', details: err.message });
  }
});

// POST /weather/evaluate-risks: Explicit agronomic risk evaluation separate from weather fetching
router.post('/weather/evaluate-risks', async (req: Request, res: Response) => {
  try {
    const { farmerId, customThresholds } = req.body;
    const resolvedFarmerId = farmerId || 'usr-farmer-001';

    const farmer = store.getProfileById(resolvedFarmerId);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const fields = store.getFields(undefined, resolvedFarmerId);
    const farms = store.getFarms(resolvedFarmerId);
    const farm = farms[0];
    const lat = farm?.centerCoordinates?.lat ?? 30.901;
    const lng = farm?.centerCoordinates?.lng ?? 75.8573;

    const weather = await weatherService.getWeather(lat, lng, farm?.name || 'Farm');
    const devices = store.getDevices(resolvedFarmerId);
    const latestReading = store.getDeviceReadings(undefined, fields[0]?.id, 1)[0];

    const newAlerts = alertEngine.evaluateRisks(
      {
        farmer,
        fields,
        weather,
        devices,
        latestSoilMoisturePct: latestReading?.soilMoisturePct,
      },
      customThresholds
    );

    return res.json({
      message: `Risk evaluation completed. ${newAlerts.length} new alert(s) generated.`,
      newAlerts,
      totalActiveAlerts: store.getAlerts(resolvedFarmerId).length,
    });
  } catch (err: any) {
    console.error('[WeatherRoute] Risk evaluation error:', err);
    return res.status(500).json({ error: 'Failed to evaluate agronomic risks', details: err.message });
  }
});

// GET /weather/thresholds: Get active configurable agronomic trigger thresholds
router.get('/weather/thresholds', (_req: Request, res: Response) => {
  return res.json({
    thresholds: alertEngine.getThresholds(),
    documentation: {
      heavyRainPrecipitationCurrentMm: 'Rainfall observed in current hour exceeding this triggers immediate drainage warning',
      heavyRainPrecipitationForecastMm: 'Cumulative rainfall predicted in 24h exceeding this triggers waterlogging warning',
      heatwaveCurrentTempC: 'Ambient temperature triggering thermal crop respiration stress',
      frostRiskMinTempC: 'Freezing temperature threshold threatening Rabi grain filling/flowering',
      highWindSpeedKmh: 'Wind velocity posing physical stalk/stem lodging hazard',
      soilMoistureDepletionPct: 'Root-zone moisture deficit approaching temporary wilting point',
      cooldownHours: 'Deduplication window preventing repetitive alerts on identical events',
    },
  });
});

// PATCH /weather/thresholds: Update configurable thresholds (Admin or FPO Coordinator only)
router.patch('/weather/thresholds', (req: Request, res: Response) => {
  const userId = (req.headers['x-farmer-id'] || req.headers['x-user-id'] || req.body.requesterId) as string | undefined;
  if (userId) {
    const cleanId = userId.startsWith('token-') ? userId.split('-').slice(1, 4).join('-') : userId;
    const profile = store.getProfileById(cleanId) || store.getProfileById(userId);
    if (profile && profile.role !== 'admin' && profile.role !== 'fpo_coordinator') {
      return res.status(403).json({ error: 'Forbidden: Only FPO Coordinators or Administrators can modify regional agronomic thresholds' });
    }
  }

  const updates = req.body;
  const updated = alertEngine.updateThresholds(updates);
  return res.json({
    message: 'Agronomic thresholds updated successfully',
    thresholds: updated,
  });
});

export default router;
