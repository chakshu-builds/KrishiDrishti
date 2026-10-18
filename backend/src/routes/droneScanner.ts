import { Router, Request, Response } from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { geminiService, DroneSpatialZoningOutput } from '../services/geminiService.js';
import { store } from '../db/store.js';

const router = Router();

const getSocketIO = (req?: Request): any => req?.app?.get('io');

// Setup upload directory for drone aerial photos
const DRONE_UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'drone');
if (!fs.existsSync(DRONE_UPLOADS_DIR)) {
  fs.mkdirSync(DRONE_UPLOADS_DIR, { recursive: true });
}

// Multer upload config
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/') || mime === 'application/octet-stream' || !mime) {
      cb(null, true);
    } else {
      cb(null, true);
    }
  },
});

export interface DroneSession {
  id: string;
  createdAt: number;
  lanIp: string;
  phoneConnected: boolean;
  phoneConnectedAt?: number;
  status: 'waiting_for_phone' | 'phone_connected' | 'analyzing' | 'completed' | 'error';
  latestImage?: {
    url: string;
    filename: string;
    uploadedAt: string;
    source: 'phone_wifi' | 'direct_upload';
  };
  analysis?: DroneSpatialZoningOutput;
  metadata?: {
    fieldName?: string;
    cropName?: string;
    fieldId?: string;
    farmerId?: string;
  };
  errorMessage?: string;
}

// In-memory active drone sessions map (TTL: 2 hours)
const activeSessions = new Map<string, DroneSession>();
let latestActiveSessionId: string | null = null;
let latestSurveyResult: {
  imageUrl: string;
  analysis: DroneSpatialZoningOutput;
  timestamp: number;
} | null = null;

/**
 * Discovers the host machine's Wi-Fi / LAN IPv4 address
 */
export function getLocalNetworkIp(): string {
  const nets = os.networkInterfaces();
  let wifiIp = '';
  let fallbackIp = '';

  for (const name of Object.keys(nets)) {
    const ifaceList = nets[name];
    if (!ifaceList) continue;
    for (const net of ifaceList) {
      if (net.family === 'IPv4' && !net.internal) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless')) {
          wifiIp = net.address;
        } else if (!fallbackIp) {
          fallbackIp = net.address;
        }
      }
    }
  }

  return wifiIp || fallbackIp || '127.0.0.1';
}

let publicTunnelUrl = process.env.PUBLIC_TUNNEL_URL || 'https://3a482c1cc5a9c9.lhr.life';

/**
 * GET /api/drone/network-info & /api/drone/config
 * Returns public tunnel URL and local Wi-Fi IP pairing info
 */
const getNetworkInfoHandler = (_req: Request, res: Response) => {
  const lanIp = getLocalNetworkIp();
  const frontendPort = 3000;
  const backendPort = process.env.PORT || 5000;

  try {
    const tunnelFile = path.resolve(process.cwd(), 'scripts', 'active_tunnel.txt');
    if (fs.existsSync(tunnelFile)) {
      const saved = fs.readFileSync(tunnelFile, 'utf8').trim();
      if (saved.startsWith('https://')) {
        publicTunnelUrl = saved;
      }
    }
  } catch (_) {}

  return res.json({
    lanIp,
    publicTunnelUrl,
    frontendPort,
    backendPort,
    pairingBaseUrl: publicTunnelUrl ? `${publicTunnelUrl}/drone-scanner` : `http://${lanIp}:${frontendPort}/drone-scanner`,
    tunnelPairingUrl: publicTunnelUrl ? `${publicTunnelUrl}/drone-scanner` : null,
    lanPairingUrl: `http://${lanIp}:${frontendPort}/drone-scanner`,
    backendApiUrl: `http://${lanIp}:${backendPort}/api/drone`,
    isLocalhostOnly: lanIp === '127.0.0.1',
  });
};

router.get('/network-info', getNetworkInfoHandler);
router.get('/config', getNetworkInfoHandler);

/**
 * POST /api/drone/set-tunnel
 * Allows setting or updating public tunnel URL
 */
router.post('/set-tunnel', (req: Request, res: Response) => {
  if (req.body.tunnelUrl) {
    publicTunnelUrl = req.body.tunnelUrl.trim();
    try {
      const tunnelFile = path.resolve(process.cwd(), 'scripts', 'active_tunnel.txt');
      fs.writeFileSync(tunnelFile, publicTunnelUrl, 'utf8');
    } catch (_) {}
  }
  return res.json({ success: true, publicTunnelUrl });
});

/**
 * Automatically initializes or restores latest survey result from disk
 */
export async function getOrInitLatestSurveyResult() {
  if (latestSurveyResult) return latestSurveyResult;
  try {
    if (fs.existsSync(DRONE_UPLOADS_DIR)) {
      const files = fs
        .readdirSync(DRONE_UPLOADS_DIR)
        .filter((f) => f.startsWith('drone_aerial_') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')))
        .map((f) => {
          const fp = path.join(DRONE_UPLOADS_DIR, f);
          const stat = fs.statSync(fp);
          return { filename: f, filePath: fp, mtime: stat.mtimeMs, size: stat.size };
        })
        .filter((f) => f.size > 1024) // Ignore empty/dummy files
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > 0) {
        const topFile = files[0];
        const buffer = fs.readFileSync(topFile.filePath);
        const analysis = await geminiService.analyzeFieldDroneZoning({
          imageBuffer: buffer,
          mimeType: 'image/jpeg',
          cropName: 'Paddy / Field Crops (धान व फसल)',
          fieldName: 'Surveyed Field Acreage',
          altitudeMeters: 15,
        });

        latestSurveyResult = {
          imageUrl: `/uploads/drone/${topFile.filename}`,
          analysis,
          timestamp: topFile.mtime,
        };
        return latestSurveyResult;
      }
    }
  } catch (err) {
    console.warn('[DroneScanner] Failed to auto-restore latest aerial survey:', err);
  }
  return null;
}

// Background auto-init on boot
getOrInitLatestSurveyResult().catch(() => {});

/**
 * POST /api/drone/session/create
 * Creates a unique pairing session for the laptop mission station
 */
router.post('/session/create', async (req: Request, res: Response) => {
  const lanIp = getLocalNetworkIp();
  const sessionId = 'drone-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

  const session: DroneSession = {
    id: sessionId,
    createdAt: Date.now(),
    lanIp,
    phoneConnected: false,
    status: 'waiting_for_phone',
    metadata: {
      fieldName: req.body.fieldName || 'Wheat Field 1',
      cropName: req.body.cropName || 'Wheat (गेहूं)',
      fieldId: req.body.fieldId || 'field-101',
      farmerId: req.body.farmerId || 'usr-farmer-001',
    },
  };

  const survey = await getOrInitLatestSurveyResult();
  if (survey) {
    session.latestImage = {
      url: survey.imageUrl,
      filename: path.basename(survey.imageUrl),
      uploadedAt: new Date(survey.timestamp).toISOString(),
      source: 'phone_wifi',
    };
    session.analysis = survey.analysis;
    session.status = 'completed';
    session.phoneConnected = true;
  }

  activeSessions.set(sessionId, session);
  latestActiveSessionId = sessionId;

  const tunnelPairingUrl = publicTunnelUrl ? `${publicTunnelUrl}/drone-scanner?session=${sessionId}` : null;
  const lanPairingUrl = `http://${lanIp}:3000/drone-scanner?session=${sessionId}`;
  const pairingUrl = tunnelPairingUrl || lanPairingUrl;

  return res.json({
    session,
    pairingUrl,
    tunnelPairingUrl,
    lanPairingUrl,
    qrCodeData: pairingUrl,
  });
});

/**
 * GET /api/drone/session/latest-active
 * Fetches the most recently created session or survey
 */
router.get('/session/latest-active', async (_req: Request, res: Response) => {
  const survey = await getOrInitLatestSurveyResult();
  return res.json({
    latestSessionId: latestActiveSessionId || 'drone-live-session',
    latestSurvey: survey,
  });
});

/**
 * GET /api/drone/session/:id
 * Fetches status of an active session (for polling or initialization)
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  let session = activeSessions.get(id);

  if (!session) {
    const lanIp = getLocalNetworkIp();
    session = {
      id,
      createdAt: Date.now(),
      lanIp,
      phoneConnected: false,
      status: 'waiting_for_phone',
      metadata: {
        fieldName: 'Wheat Field 1',
        cropName: 'Wheat (गेहूं)',
        fieldId: 'field-101',
      },
    };
    activeSessions.set(id, session);
  }

  // If this session has no photo yet, check latest survey
  if (!session.latestImage) {
    const survey = await getOrInitLatestSurveyResult();
    if (survey) {
      session.latestImage = {
        url: survey.imageUrl,
        filename: path.basename(survey.imageUrl),
        uploadedAt: new Date(survey.timestamp).toISOString(),
        source: 'phone_wifi',
      };
      session.analysis = survey.analysis;
      session.status = 'completed';
      session.phoneConnected = true;
    }
  }

  return res.json({ session });
});

/**
 * POST /api/drone/session/:id/ping
 * Called by the phone as soon as it opens the scanner page
 */
router.post('/session/:id/ping', (req: Request, res: Response) => {
  const { id } = req.params;
  let session = activeSessions.get(id);

  if (!session) {
    session = {
      id,
      createdAt: Date.now(),
      lanIp: getLocalNetworkIp(),
      phoneConnected: true,
      phoneConnectedAt: Date.now(),
      status: 'phone_connected',
    };
    activeSessions.set(id, session);
  } else {
    session.phoneConnected = true;
    session.phoneConnectedAt = Date.now();
    if (session.status === 'waiting_for_phone') {
      session.status = 'phone_connected';
    }
  }

  // Broadcast to laptop via Socket.IO
  try {
    getSocketIO(req)?.emit(`drone_status_${id}`, {
      phoneConnected: true,
      status: session.status,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[Socket.IO] Broadcast warning:', err);
  }

  return res.json({ success: true, session });
});

/**
 * POST /api/drone/session/:id/upload
 * Handles aerial image upload from the phone (or laptop direct upload)
 * Automatically triggers Gemini Spatial Risk Zoning Analysis
 */
router.post('/session/:id/upload', upload.single('photo'), async (req: Request, res: Response) => {
  const { id } = req.params;
  let session = activeSessions.get(id);

  if (!session) {
    session = {
      id,
      createdAt: Date.now(),
      lanIp: getLocalNetworkIp(),
      phoneConnected: true,
      status: 'analyzing',
    };
    activeSessions.set(id, session);
  }

  try {
    let imageBuffer: Buffer | undefined;
    let mimeType = 'image/jpeg';
    let base64Data = '';

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'image/jpeg';
      base64Data = imageBuffer.toString('base64');
    } else if (req.body.imageBase64) {
      let rawBase64 = req.body.imageBase64;
      const match = rawBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = rawBase64;
      }
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      return res.status(400).json({ error: 'No photo file or base64 image data supplied.' });
    }

    // Save image to disk
    const filename = `drone_aerial_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
    const filePath = path.join(DRONE_UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, imageBuffer);
    const publicUrl = `/uploads/drone/${filename}`;

    const source = (req.body.source as 'phone_wifi' | 'direct_upload') || 'phone_wifi';

    session.latestImage = {
      url: publicUrl,
      filename,
      uploadedAt: new Date().toISOString(),
      source,
    };
    session.status = 'analyzing';

    // Sync immediate image reception to ALL active sessions so any open laptop tab shows it immediately
    activeSessions.forEach((sess) => {
      sess.latestImage = session.latestImage;
      sess.status = 'analyzing';
      sess.phoneConnected = true;
    });

    // Broadcast immediate image reception to laptop (current session, latest active session, and global)
    try {
      const io = getSocketIO(req);
      if (io) {
        const payload = {
          imageUrl: publicUrl,
          filename,
          source,
          uploadedAt: session.latestImage.uploadedAt,
          sessionId: id,
        };
        io.emit(`drone_image_${id}`, payload);
        activeSessions.forEach((_, sessId) => {
          io.emit(`drone_image_${sessId}`, payload);
        });
        io.emit('drone_image_global', payload);
      }
    } catch (err) {
      console.warn('[Socket.IO] Broadcast image warning:', err);
    }

    // Run Gemini spatial zoning analysis
    const cropName = req.body.cropName || session.metadata?.cropName || 'Field Crop (फसल)';
    const fieldName = req.body.fieldName || session.metadata?.fieldName || 'Surveyed Acreage';

    const zoningResult = await geminiService.analyzeFieldDroneZoning({
      imageBuffer,
      imageBase64: base64Data,
      mimeType,
      cropName,
      fieldName,
      altitudeMeters: Number(req.body.altitudeMeters) || 15,
    });

    session.analysis = zoningResult;
    session.status = 'completed';

    // Store in global latest survey so any connected laptop can read it immediately
    latestSurveyResult = {
      imageUrl: publicUrl,
      analysis: zoningResult,
      timestamp: Date.now(),
    };

    // Sync completed analysis to ALL active sessions in activeSessions
    activeSessions.forEach((sess) => {
      sess.latestImage = session.latestImage;
      sess.analysis = zoningResult;
      sess.status = 'completed';
      sess.phoneConnected = true;
    });

    // Broadcast completed analysis to laptop (all sessions and global)
    try {
      const io = getSocketIO(req);
      if (io) {
        const analysisPayload = {
          imageUrl: publicUrl,
          analysis: zoningResult,
          status: 'completed',
          sessionId: id,
        };
        io.emit(`drone_analysis_${id}`, analysisPayload);
        activeSessions.forEach((_, sessId) => {
          io.emit(`drone_analysis_${sessId}`, analysisPayload);
        });
        io.emit('drone_survey_global', analysisPayload);
      }
    } catch (err) {
      console.warn('[Socket.IO] Broadcast analysis warning:', err);
    }

    // Also mirror into crop diagnoses store with source 'drone'
    try {
      store.addCropDiagnosis({
        fieldId: session.metadata?.fieldId || 'field-101',
        farmerId: session.metadata?.farmerId || 'usr-farmer-001',
        imageUrl: publicUrl,
        source: 'drone',
        cropDetected: zoningResult.cropDetected,
        primaryIssue: zoningResult.zones.red.percentage > 10 ? zoningResult.zones.red.riskFactor : 'Healthy Field Canopy (स्वस्थ फसल)',
        severity: zoningResult.zones.red.percentage > 20 ? 'high' : zoningResult.zones.red.percentage > 10 ? 'moderate' : 'low',
        confidencePct: 88,
        visibleEvidence: zoningResult.surveySummary,
        actionableSteps: zoningResult.targetedPrescriptions.map((p) => `[${p.targetLocation}] ${p.intervention}`),
        preventativeMeasures: [
          'Fly drone bi-weekly during vegetative and heading stages.',
          'Verify soil moisture probes across Green and Yellow sectors to maintain uniform hydration.',
        ],
        disclaimer: 'AI aerial multispectral preliminary analysis. Confirm localized foliar symptoms before large-scale spray intervention.',
        escalationNeeded: zoningResult.zones.red.percentage > 20,
        escalationNotes: zoningResult.zones.red.percentage > 20 ? `High-risk red zone detected in ${zoningResult.zones.red.quadrants.join(', ')}.` : undefined,
        followUpQuestions: [
          'Have you inspected leaf undersides in the high-risk quadrant?',
          'Is the irrigation furrow in the watch zone clear of blockages?',
        ],
      });
    } catch (dbErr) {
      console.warn('[DroneScanner] Local diagnosis persistence note:', dbErr);
    }

    return res.json({
      success: true,
      session,
      imageUrl: publicUrl,
      analysis: zoningResult,
    });
  } catch (err: any) {
    console.error('[DroneScanner] Error during upload or analysis:', err);
    session.status = 'error';
    session.errorMessage = err.message || 'Error processing aerial imagery';
    return res.status(500).json({ error: err.message || 'Failed to process drone imagery' });
  }
});

export default router;
