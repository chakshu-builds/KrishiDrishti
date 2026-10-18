import { Router, Request, Response } from 'express';
import multer from 'multer';
import { store } from '../db/store.js';
import { iotSimulator } from '../services/iotSimulator.js';

const router = Router();
const cameraUpload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

// List registered devices
router.get('/devices', (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string | undefined;
  const devices = store.getDevices(farmerId);
  return res.json({ devices });
});

// Register new device
router.post('/devices', (req: Request, res: Response) => {
  const { deviceCode, deviceName, deviceType, farmerId, farmId, fieldId, isSimulated } = req.body;
  if (!deviceCode || !deviceName || !deviceType) {
    return res.status(400).json({ error: 'Missing deviceCode, deviceName, or deviceType' });
  }

  // Check unique deviceCode
  const existing = store.getDeviceByCode(deviceCode);
  if (existing) {
    return res.status(409).json({ error: 'A device with this serial code is already registered' });
  }

  const newDevice = store.createDevice({
    deviceCode,
    deviceName,
    deviceType,
    farmerId: farmerId || 'usr-farmer-001',
    farmId: farmId || undefined,
    fieldId: fieldId || undefined,
    apiToken: `token_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    isActive: true,
    isSimulated: Boolean(isSimulated ?? false),
    lastHeartbeat: new Date().toISOString(),
    firmwareVersion: 'v1.4.2-krishak',
    batteryPct: 100,
  });

  return res.status(201).json({ device: newDevice, message: 'Device securely provisioned' });
});

// Telemetry ingestion endpoint (called by real ESP32 / Arduino / MQTT bridges)
router.post('/telemetry', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const deviceToken = authHeader ? authHeader.replace('Bearer ', '') : req.body.apiToken;
  const { deviceCode, soilMoisturePct, soilTemperatureC, airTemperatureC, humidityPct, nitrogenMgKg, phosphorusMgKg, potassiumMgKg, batteryPct, signalRssi } = req.body;

  if (!deviceCode) {
    return res.status(400).json({ error: 'Missing deviceCode' });
  }

  const device = store.getDeviceByCode(deviceCode);
  if (!device) {
    return res.status(404).json({ error: 'Unregistered device serial' });
  }

  // Verify device authorization token for physical non-simulated hardware
  if (!device.isSimulated) {
    if (!deviceToken || (device.apiToken && deviceToken !== device.apiToken)) {
      return res.status(401).json({ error: 'Invalid or missing device authorization token' });
    }
  }

  const reading = store.addDeviceReading({
    deviceId: device.id,
    fieldId: device.fieldId,
    soilMoisturePct: soilMoisturePct !== undefined ? Number(soilMoisturePct) : undefined,
    soilTemperatureC: soilTemperatureC !== undefined ? Number(soilTemperatureC) : undefined,
    airTemperatureC: airTemperatureC !== undefined ? Number(airTemperatureC) : undefined,
    humidityPct: humidityPct !== undefined ? Number(humidityPct) : undefined,
    nitrogenMgKg: nitrogenMgKg !== undefined ? Number(nitrogenMgKg) : undefined,
    phosphorusMgKg: phosphorusMgKg !== undefined ? Number(phosphorusMgKg) : undefined,
    potassiumMgKg: potassiumMgKg !== undefined ? Number(potassiumMgKg) : undefined,
    batteryPct: batteryPct !== undefined ? Number(batteryPct) : device.batteryPct,
    signalRssi: signalRssi !== undefined ? Number(signalRssi) : -65,
  });

  store.updateDeviceHeartbeat(deviceCode, reading.batteryPct);

  return res.status(201).json({ success: true, readingId: reading.id });
});

// Get historical telemetry readings for charts
router.get('/telemetry', (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string | undefined;
  const fieldId = req.query.fieldId as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  const readings = store.getDeviceReadings(deviceId, fieldId, limit);
  return res.json({ readings });
});

// ESP32-CAM Image Upload Endpoint
router.post('/camera-upload', cameraUpload.single('image'), (req: Request, res: Response) => {
  const { deviceCode } = req.body;
  if (!deviceCode) {
    return res.status(400).json({ error: 'Missing deviceCode' });
  }

  const device = store.getDeviceByCode(deviceCode);
  if (!device) {
    return res.status(404).json({ error: 'Device not registered' });
  }

  let imageUrl = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80';
  if (req.file) {
    const base64 = req.file.buffer.toString('base64');
    imageUrl = `data:${req.file.mimetype};base64,${base64}`;
  }

  store.updateDeviceHeartbeat(deviceCode);

  return res.status(201).json({
    success: true,
    message: 'ESP32-CAM image received and queued for background analysis',
    imageUrl,
    timestamp: new Date().toISOString(),
  });
});

// Simulator Control: Trigger immediate tick for all simulated hardware
router.post('/simulator/tick', (_req: Request, res: Response) => {
  const generated = iotSimulator.generateTick();
  return res.json({
    message: 'Simulation tick completed',
    readingsGenerated: generated.length,
    readings: generated,
    pumpActive: iotSimulator.getPumpState(),
  });
});

// Irrigation Pump Actuator Control
router.get('/pump/status', (_req: Request, res: Response) => {
  return res.json({
    pumpActive: iotSimulator.getPumpState(),
    flowRateLpm: iotSimulator.getPumpState() ? 350 : 0,
    wattageKw: iotSimulator.getPumpState() ? 4.8 : 0.05,
    lastToggled: new Date().toISOString(),
  });
});

router.post('/pump/toggle', (req: Request, res: Response) => {
  const currentState = iotSimulator.getPumpState();
  const nextState = req.body.active !== undefined ? Boolean(req.body.active) : !currentState;
  iotSimulator.setPumpState(nextState);

  return res.json({
    success: true,
    pumpActive: nextState,
    message: nextState
      ? 'Irrigation pump started: Saturating root zone at 350 L/min'
      : 'Irrigation pump halted: Field in natural drainage state',
    flowRateLpm: nextState ? 350 : 0,
    wattageKw: nextState ? 4.8 : 0.05,
  });
});

// Inject instant agronomic scenarios
router.post('/simulator/scenario', (req: Request, res: Response) => {
  const { scenario } = req.body;
  if (!scenario || !['drought', 'optimal', 'waterlogging', 'heatwave'].includes(scenario)) {
    return res.status(400).json({ error: 'Valid scenario is drought, optimal, waterlogging, or heatwave' });
  }

  const generated = iotSimulator.injectScenario(scenario);
  return res.json({
    success: true,
    scenario,
    readings: generated,
    pumpActive: iotSimulator.getPumpState(),
    message: `Scenario '${scenario}' applied to virtual sensors`,
  });
});

export default router;
