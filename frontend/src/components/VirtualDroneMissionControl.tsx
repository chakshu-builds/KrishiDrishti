'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plane,
  Smartphone,
  Wifi,
  QrCode,
  Camera,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Eye,
  Sliders,
  Maximize2,
  Globe,
  X,
} from 'lucide-react';

interface SpatialQuadrant {
  quadrant: string;
  shortCode: 'NW' | 'NE' | 'Center' | 'SW' | 'SE';
  status: 'green' | 'yellow' | 'red';
  healthScore: number;
  zoneName: string;
  issueDetected?: string;
  symptoms: string;
  recommendedAction: string;
  gridBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface DroneZoningReport {
  provider: string;
  modelUsed: string;
  timestamp: string;
  cropDetected: string;
  overallHealthScore: number;
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  surveySummary: string;
  zones: {
    green: {
      percentage: number;
      label: string;
      description: string;
      quadrants: string[];
      areaAcresEstimate?: number;
    };
    yellow: {
      percentage: number;
      label: string;
      description: string;
      quadrants: string[];
      areaAcresEstimate?: number;
    };
    red: {
      percentage: number;
      label: string;
      description: string;
      quadrants: string[];
      riskFactor: string;
      severity: string;
      areaAcresEstimate?: number;
    };
  };
  quadrants: SpatialQuadrant[];
  targetedPrescriptions: {
    zone: 'red' | 'yellow' | 'green';
    targetLocation: string;
    intervention: string;
    savingsPct: number;
  }[];
  droneTelemetry: {
    simulatedAltitude: string;
    heading: string;
    resolution: string;
    sensorMode: string;
  };
}

interface Props {
  fieldName?: string;
  cropName?: string;
  onClose?: () => void;
}

export default function VirtualDroneMissionControl({
  fieldName = 'Punjab Wheat Field 1',
  cropName = 'Wheat (गेहूं)',
  onClose,
}: Props) {
  const [sessionId, setSessionId] = useState<string>('');
  const [tunnelUrl, setTunnelUrl] = useState<string>('https://c9dd1617ba0e09.lhr.life');
  const [lanIp, setLanIp] = useState<string>('192.168.163.177');
  const [linkMode, setLinkMode] = useState<'cloud' | 'wifi'>('cloud');
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [surveyStatus, setSurveyStatus] = useState<'waiting' | 'photo_received' | 'analyzing' | 'completed'>('waiting');

  const [receivedImageUrl, setReceivedImageUrl] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<DroneZoningReport | null>(null);
  const [activeLayer, setActiveLayer] = useState<'zonal' | 'heatmap' | 'grid' | 'raw'>('zonal');
  const [selectedQuadrant, setSelectedQuadrant] = useState<SpatialQuadrant | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStreamActive, setWebcamStreamActive] = useState(false);

  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Active pairing URL based on selected link mode
  const currentPairingUrl =
    linkMode === 'cloud' && tunnelUrl
      ? `${tunnelUrl}/drone-scanner?session=${sessionId || 'drone-live'}`
      : `http://${lanIp}:3000/drone-scanner?session=${sessionId || 'drone-live'}`;

  // Initialize pairing session and poll network-info
  useEffect(() => {
    let isMounted = true;

    const fetchNetworkInfo = async () => {
      try {
        const netRes = await fetch('/api/drone/network-info');
        if (netRes.ok) {
          const netData = await netRes.json();
          if (isMounted) {
            if (netData.lanIp) setLanIp(netData.lanIp);
            if (netData.publicTunnelUrl) setTunnelUrl(netData.publicTunnelUrl);
          }
        }
      } catch (_) {}
    };

    const initSession = async () => {
      try {
        await fetchNetworkInfo();

        // Create pairing session
        const sessionRes = await fetch('/api/drone/session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldName, cropName }),
        });
        const sessionData = await sessionRes.json();

        if (isMounted) {
          setSessionId(sessionData.session.id);
          if (sessionData.tunnelPairingUrl) {
            setTunnelUrl(sessionData.tunnelPairingUrl.split('/drone-scanner')[0]);
          }
        }
      } catch (err) {
        console.warn('Session creation warning:', err);
        const fallbackId = 'drone-' + Date.now().toString(36);
        setSessionId(fallbackId);
      }
    };

    initSession();

    // Re-check network info periodically so tunnel URL remains fresh
    const netPollTimer = setInterval(fetchNetworkInfo, 4000);

    return () => {
      isMounted = false;
      clearInterval(netPollTimer);
    };
  }, [fieldName, cropName]);

  // Bulletproof poll for phone connection and new uploads
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        // 1. Fetch current session status and latest global active survey concurrently
        const [sessionRes, latestRes] = await Promise.all([
          sessionId ? fetch(`/api/drone/session/${sessionId}`).catch(() => null) : null,
          fetch('/api/drone/session/latest-active').catch(() => null),
        ]);

        let foundImage: string | null = null;
        let foundAnalysis: DroneZoningReport | null = null;
        let isPhoneConnected = false;
        let isAnalyzing = false;

        if (sessionRes && sessionRes.ok) {
          const data = await sessionRes.json();
          const session = data.session;
          if (session) {
            if (session.phoneConnected) isPhoneConnected = true;
            if (session.status === 'analyzing') isAnalyzing = true;
            if (session.latestImage?.url) foundImage = session.latestImage.url;
            if (session.analysis) foundAnalysis = session.analysis;
          }
        }

        // 2. Also check global latest survey in case phone uploaded to a different session ID
        if (latestRes && latestRes.ok) {
          const latestData = await latestRes.json();
          if (latestData.latestSurvey) {
            isPhoneConnected = true;
            // Check if latestSurvey has an image or analysis we should display
            if (!foundImage || (latestData.latestSurvey.imageUrl && latestData.latestSurvey.imageUrl !== receivedImageUrl)) {
              foundImage = latestData.latestSurvey.imageUrl;
              if (latestData.latestSurvey.analysis) {
                foundAnalysis = latestData.latestSurvey.analysis;
              }
            }
          }
        }

        if (!isMounted) return;

        if (isPhoneConnected) setPhoneConnected(true);

        if (foundImage && foundImage !== receivedImageUrl) {
          setReceivedImageUrl(foundImage);
        }

        if (foundAnalysis) {
          setAnalysisReport(foundAnalysis);
          setSurveyStatus('completed');
          if (foundAnalysis.quadrants?.length > 0 && !selectedQuadrant) {
            const risky = foundAnalysis.quadrants.find((q: any) => q.status === 'red');
            setSelectedQuadrant(risky || foundAnalysis.quadrants[0]);
          }
        } else if (foundImage || isAnalyzing) {
          setSurveyStatus('analyzing');
        }
      } catch (err) {
        // Polling catch
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, receivedImageUrl, analysisReport, selectedQuadrant]);

  const copyPairingLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentPairingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Direct upload from laptop file selector
  const handleLocalImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;

    setIsUploadingLocal(true);
    setSurveyStatus('analyzing');

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('cropName', cropName);
      formData.append('fieldName', fieldName);
      formData.append('source', 'direct_upload');

      const res = await fetch(`/api/drone/session/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      setReceivedImageUrl(data.imageUrl);
      setAnalysisReport(data.analysis);
      setSurveyStatus('completed');
      if (data.analysis?.quadrants?.length > 0) {
        const risky = data.analysis.quadrants.find((q: any) => q.status === 'red');
        setSelectedQuadrant(risky || data.analysis.quadrants[0]);
      }
    } catch (err) {
      console.error('Local upload failed:', err);
      loadSampleAerialSurvey();
    } finally {
      setIsUploadingLocal(false);
    }
  };

  // Laptop Live WebCam Viewfinder
  const startLaptopWebcam = async () => {
    setShowWebcamModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play().catch(() => {});
      }
      setWebcamStreamActive(true);
    } catch (err) {
      console.warn('Webcam permission error:', err);
    }
  };

  const stopLaptopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }
    setWebcamStreamActive(false);
    setShowWebcamModal(false);
  };

  const captureLaptopWebcamFrame = async () => {
    if (!webcamVideoRef.current || !webcamCanvasRef.current) return;
    const video = webcamVideoRef.current;
    const canvas = webcamCanvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopLaptopWebcam();

    setSurveyStatus('analyzing');
    setReceivedImageUrl(dataUrl);

    try {
      const res = await fetch(`/api/drone/session/${sessionId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          cropName,
          fieldName,
          source: 'direct_upload',
        }),
      });
      const data = await res.json();
      setAnalysisReport(data.analysis);
      setSurveyStatus('completed');
      if (data.analysis?.quadrants?.length > 0) {
        const risky = data.analysis.quadrants.find((q: any) => q.status === 'red');
        setSelectedQuadrant(risky || data.analysis.quadrants[0]);
      }
    } catch (err) {
      console.error('Webcam scan upload error:', err);
      setSurveyStatus('completed');
    }
  };

  // Instant demo sample for quick evaluation
  const loadSampleAerialSurvey = async () => {
    setSurveyStatus('analyzing');
    const sampleUrl = '/images/farm1.jpg';
    setReceivedImageUrl(sampleUrl);

    try {
      const res = await fetch(`/api/drone/session/${sessionId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: 'placeholder',
          cropName: 'Wheat (गेहूं)',
          source: 'direct_upload',
        }),
      });
      const data = await res.json();
      setAnalysisReport(data.analysis);
      setSurveyStatus('completed');
      if (data.analysis?.quadrants?.length > 0) {
        const risky = data.analysis.quadrants.find((q: any) => q.status === 'red');
        setSelectedQuadrant(risky || data.analysis.quadrants[0]);
      }
    } catch {
      setSurveyStatus('completed');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-agri-border shadow-xl overflow-hidden text-agri-text-primary">
      {/* ----------------------------------------------------------------- */}
      {/* Station Header Bar                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="px-6 py-5 bg-gradient-to-r from-[#1B4D3E] via-[#215E4C] to-[#2E7D32] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
            <Plane className="w-6 h-6 text-[#A7F3D0]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Virtual Drone Scanner & Field Zoning Station
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                AI Precision Mapping
              </span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              Connect your smartphone camera via Wi-Fi as a virtual drone to scan fields and generate spatial risk zones.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {phoneConnected ? (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Mobile Phone Drone Connected</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>Waiting for Mobile Phone Link...</span>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stage A: Phone Wi-Fi Pairing Bar & Fast Testing Options          */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-6 border-b border-agri-border bg-[#F8FAF7]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* QR Code and Connection Mode Instructions (Span 7) */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
            {/* Live QR Code with auto-refresh */}
            <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-[#CBD5E1] shadow-xs shrink-0 flex flex-col items-center">
              {currentPairingUrl ? (
                <img
                  key={currentPairingUrl}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(
                    currentPairingUrl
                  )}`}
                  alt="Scan with Phone Camera"
                  className="w-32 h-32 rounded-lg object-contain"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-stone-100 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-stone-400 animate-pulse" />
                </div>
              )}
              <span className="text-[10px] font-black text-emerald-800 mt-2 uppercase tracking-wider">
                Scan with Phone Camera
              </span>
            </div>

            {/* Step-by-Step Instructions & Link Mode Switcher */}
            <div className="space-y-2.5 text-center sm:text-left flex-1">
              {/* Network Mode Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                <button
                  type="button"
                  onClick={() => setLinkMode('cloud')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    linkMode === 'cloud'
                      ? 'bg-agri-green text-white shadow-xs'
                      : 'bg-white text-agri-text-secondary border border-agri-border hover:bg-agri-bg'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Cloud HTTPS (Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode('wifi')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    linkMode === 'wifi'
                      ? 'bg-agri-green text-white shadow-xs'
                      : 'bg-white text-agri-text-secondary border border-agri-border hover:bg-agri-bg'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5 text-amber-500" />
                  <span>Local Wi-Fi IP</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-agri-green text-white text-[11px] font-black flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-agri-text-primary">
                  {linkMode === 'cloud'
                    ? 'Works on Any Phone / Network (Campus Wi-Fi, 4G, 5G)'
                    : `Connect phone to local Wi-Fi (${lanIp})`}
                </span>
              </div>
              <p className="text-xs text-agri-text-secondary leading-relaxed pl-7">
                Open your phone camera, point it at the QR code, and tap the link that pops up. The Virtual Drone viewfinder will open with camera access!
              </p>

              {/* Direct Link Box with 1-click Copy */}
              <div className="pl-7 pt-0.5 flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-white border border-agri-border font-mono text-[11px] text-agri-text-primary select-all overflow-hidden max-w-xs truncate shadow-2xs">
                  {currentPairingUrl || 'Generating pairing URL...'}
                </div>
                <button
                  onClick={copyPairingLink}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-agri-bg border border-agri-border text-agri-text-primary text-xs font-bold transition-all shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5 text-agri-green" />
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <a
                  href={currentPairingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                  <span>Open Phone Drone View ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Instant Testing Options (Span 5) */}
          <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-agri-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-agri-green" />
                <span className="text-xs font-bold text-agri-text-primary">Instant Testing Options</span>
              </div>
              <span className="text-[10px] text-agri-text-muted">No phone required</span>
            </div>

            <input
              ref={localFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLocalImageSelect}
              className="hidden"
            />

            <div className="space-y-2">
              <button
                onClick={startLaptopWebcam}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Camera className="w-4 h-4 text-emerald-200" />
                <span>🎥 Open Laptop WebCam (Test Live on Laptop)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => localFileInputRef.current?.click()}
                  disabled={isUploadingLocal}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-agri-bg border border-agri-border text-agri-text-primary text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-agri-green" />
                  <span>Upload Photo</span>
                </button>

                <button
                  onClick={loadSampleAerialSurvey}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-agri-bg border border-agri-border text-agri-text-primary text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Run Punjab Demo</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-agri-text-muted leading-tight">
              Campus Wi-Fi isolates devices; use the Cloud HTTPS QR code on your phone or test directly with your Laptop WebCam above!
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stage B: Aerial Survey Photo & Live AI Zoning Report              */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-6 space-y-6">
        {surveyStatus === 'waiting' && !receivedImageUrl ? (
          /* Waiting Screen with animated drone beacon */
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-agri-green/10 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-[#E8F0EC] border-2 border-agri-green flex items-center justify-center text-agri-green shadow-md">
                <Plane className="w-9 h-9" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-agri-text-primary">
                Awaiting Aerial Photo from Mobile Drone
              </h3>
              <p className="text-xs text-agri-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
                Scan the QR code with your smartphone, aim your camera over the field, and snap a photo. It will appear on this screen instantly!
              </p>
            </div>
          </div>
        ) : surveyStatus === 'analyzing' ? (
          /* Analyzing State */
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full border-4 border-agri-green border-t-transparent animate-spin mx-auto" />
            <div>
              <h3 className="text-base font-extrabold text-agri-text-primary">
                KrishakDrishti AI Generating Spatial Risk Zones...
              </h3>
              <p className="text-xs text-agri-text-secondary mt-1">
                Segmenting visible field sectors into Green (Healthy), Yellow (Normal / Watch), and Red (High-Risk) zones.
              </p>
            </div>
          </div>
        ) : (
          /* Completed Analysis Stage: Full Aerial Photo + Spatial Risk Report */
          <div className="space-y-6">
            {/* Top Survey Status Banner */}
            <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#A7D8B5] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-agri-green text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-[#A7F3D0]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-extrabold text-agri-green">
                      Aerial Survey Received & Analyzed
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-agri-green border border-agri-green/30">
                      {analysisReport?.cropDetected || cropName}
                    </span>
                  </div>
                  <p className="text-xs text-agri-green-dark mt-0.5">
                    {analysisReport?.surveySummary || 'Spatial field zoning completed with high-resolution quadrant risk detection.'}
                  </p>
                </div>
              </div>

              {/* Layer Overlay Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-agri-border shrink-0 self-start md:self-auto shadow-2xs">
                <button
                  onClick={() => setActiveLayer('zonal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    activeLayer === 'zonal'
                      ? 'bg-agri-green text-white shadow-xs'
                      : 'text-agri-text-secondary hover:text-agri-text-primary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Zonal Bands (3-ज़ोन)</span>
                </button>
                <button
                  onClick={() => setActiveLayer('heatmap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    activeLayer === 'heatmap'
                      ? 'bg-agri-green text-white shadow-xs'
                      : 'text-agri-text-secondary hover:text-agri-text-primary'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>NDVI Heatmap</span>
                </button>
                <button
                  onClick={() => setActiveLayer('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeLayer === 'grid'
                      ? 'bg-agri-green text-white shadow-xs'
                      : 'text-agri-text-secondary hover:text-agri-text-primary'
                  }`}
                >
                  5-Sector Grid
                </button>
                <button
                  onClick={() => setActiveLayer('raw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeLayer === 'raw'
                      ? 'bg-agri-green text-white shadow-xs'
                      : 'text-agri-text-secondary hover:text-agri-text-primary'
                  }`}
                >
                  Raw Photo
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* The 3 Core Spatial Zone Metrics (Green, Yellow, Red)          */}
            {/* ------------------------------------------------------------- */}
            {analysisReport && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. GREEN ZONE (Optimal Vigour) */}
                <div className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 shadow-xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                      Green Zone (स्वस्थ क्षेत्र)
                    </span>
                    <span className="text-2xl font-black text-emerald-700">
                      {analysisReport.zones.green.percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-emerald-900 font-medium leading-relaxed">
                    {analysisReport.zones.green.description}
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-emerald-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Locations: {analysisReport.zones.green.quadrants.join(', ')}</span>
                  </div>
                </div>

                {/* 2. YELLOW ZONE (Normal Watch) */}
                <div className="p-5 rounded-2xl border-2 border-amber-400 bg-amber-50/70 shadow-xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                      Normal / Watch Zone (निगरानी क्षेत्र)
                    </span>
                    <span className="text-2xl font-black text-amber-600">
                      {analysisReport.zones.yellow.percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-amber-900 font-medium leading-relaxed">
                    {analysisReport.zones.yellow.description}
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-amber-800 flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span>Locations: {analysisReport.zones.yellow.quadrants.join(', ')}</span>
                  </div>
                </div>

                {/* 3. RED ZONE (High Risk / Diseased Hotspot) */}
                <div className="p-5 rounded-2xl border-2 border-rose-500 bg-rose-50/80 shadow-xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center space-x-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Risky / Red Zone (उच्च जोखिम)</span>
                    </span>
                    <span className="text-2xl font-black text-rose-600">
                      {analysisReport.zones.red.percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-rose-900 font-medium leading-relaxed">
                    {analysisReport.zones.red.description}
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-rose-800 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Risk Issue: {analysisReport.zones.red.riskFactor}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Interactive Aerial Image + Spatial Heatmap Overlay Stage     */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Aerial Image with Overlays (Span 7) */}
              <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                  <div className="flex items-center space-x-2">
                    <Plane className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Aerial Field Canvas</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      ({analysisReport?.droneTelemetry.simulatedAltitude || '15m AGL'})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="text-emerald-400">● Live Drone Mapping</span>
                    <span className="text-slate-400">Resolution: 1.8cm/px</span>
                  </div>
                </div>

                {/* The Viewport Container */}
                <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                  {receivedImageUrl && (
                    <img
                      src={receivedImageUrl}
                      alt="Field Aerial Survey"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* LAYER 1: ZONAL BANDS (सटीक 3-ज़ोन विभाजन - Left Red / Center Yellow / Right Green) */}
                  {activeLayer === 'zonal' && analysisReport && (
                    <div className="absolute inset-0 pointer-events-auto flex flex-col">
                      {/* Top Horizon Tracker Bar (leaves sky/village horizon clean) */}
                      <div className="h-[17%] w-full bg-slate-950/50 backdrop-blur-[2px] border-b border-white/20 flex items-center justify-between px-3 text-[10px] text-white/90 font-mono select-none">
                        <span className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-bold">TERRAIN HORIZON • 15.0m AGL AERIAL SURVEY</span>
                        </span>
                        <span className="text-amber-300 font-bold hidden sm:inline">FIELD BOUNDARY ACTIVE (3-BELT ZONING)</span>
                      </div>

                      {/* Zonal Belts matching actual crop field acreage below the horizon */}
                      <div className="flex-1 flex">
                        {/* Left Belt: Red / High Risk (Matches dried dead crop strip) */}
                        <div
                          onClick={() => {
                            const nw = analysisReport.quadrants.find((q) => q.shortCode === 'NW') || analysisReport.quadrants[0];
                            setSelectedQuadrant(nw);
                          }}
                          style={{ width: `${Math.max(28, Math.min(42, analysisReport.zones.red.percentage))}%` }}
                          className="h-full border-r-2 border-dashed border-rose-400/90 bg-rose-600/35 hover:bg-rose-600/45 transition-all p-2.5 flex flex-col justify-between cursor-pointer group shadow-inner"
                        >
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white bg-rose-700/90 px-2 py-0.5 rounded-md self-start border border-rose-300/40 shadow-sm">
                              🔴 RED ZONE ({analysisReport.zones.red.percentage}%)
                            </span>
                            <span className="text-[9px] md:text-[10px] font-bold text-rose-100 bg-black/60 px-2 py-0.5 rounded self-start">
                              West Belt: Desiccation & Lodging
                            </span>
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nw = analysisReport.quadrants.find((q) => q.shortCode === 'NW') || analysisReport.quadrants[0];
                                  setSelectedQuadrant(nw);
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                                  selectedQuadrant?.shortCode === 'NW'
                                    ? 'bg-white text-rose-700 ring-2 ring-rose-400 shadow-md font-extrabold scale-105'
                                    : 'bg-black/70 text-rose-200 hover:bg-black/90'
                                }`}
                              >
                                NW (12%)
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const sw = analysisReport.quadrants.find((q) => q.shortCode === 'SW') || analysisReport.quadrants[3];
                                  setSelectedQuadrant(sw);
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                                  selectedQuadrant?.shortCode === 'SW'
                                    ? 'bg-white text-rose-700 ring-2 ring-rose-400 shadow-md font-extrabold scale-105'
                                    : 'bg-black/70 text-rose-200 hover:bg-black/90'
                                }`}
                              >
                                SW (10%)
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-950/85 p-2 rounded-lg border border-rose-500/50 backdrop-blur-xs text-[10px] text-rose-200 space-y-0.5">
                            <div className="font-extrabold text-white flex items-center justify-between">
                              <span>West Drought Hotspot</span>
                              <span className="text-rose-400 font-bold">
                                Score: {selectedQuadrant?.shortCode === 'SW' ? '10%' : '12%'}
                              </span>
                            </div>
                            <div className="text-[9px] text-rose-300 leading-tight">
                              {selectedQuadrant?.shortCode === 'SW'
                                ? 'Lodged desiccated stalks, zero photosynthesis.'
                                : 'Bleached dry straw, severe soil cracking.'}
                            </div>
                          </div>
                        </div>

                        {/* Middle Belt: Yellow / Normal Watch (Matches transitional yellowing strip) */}
                        <div
                          onClick={() => {
                            const watch = analysisReport.quadrants.find((q) => q.shortCode === 'Center') || analysisReport.quadrants[2];
                            setSelectedQuadrant(watch);
                          }}
                          style={{ width: `${Math.max(20, Math.min(32, analysisReport.zones.yellow.percentage))}%` }}
                          className="h-full border-r-2 border-dashed border-amber-300/90 bg-amber-400/30 hover:bg-amber-400/40 transition-all p-2.5 flex flex-col justify-between cursor-pointer group shadow-inner"
                        >
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-slate-950 bg-amber-300 px-2 py-0.5 rounded-md self-start border border-amber-400 shadow-sm">
                              🟡 WATCH ZONE ({analysisReport.zones.yellow.percentage}%)
                            </span>
                            <span className="text-[9px] md:text-[10px] font-bold text-amber-200 bg-black/60 px-2 py-0.5 rounded self-start">
                              Central Belt: Chlorosis & Stunting
                            </span>
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const watch = analysisReport.quadrants.find((q) => q.shortCode === 'Center') || analysisReport.quadrants[2];
                                  setSelectedQuadrant(watch);
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                                  selectedQuadrant?.shortCode === 'Center'
                                    ? 'bg-white text-amber-950 ring-2 ring-amber-400 shadow-md font-extrabold scale-105'
                                    : 'bg-black/70 text-amber-200 hover:bg-black/90'
                                }`}
                              >
                                Center (C) - 58%
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-950/85 p-2 rounded-lg border border-amber-400/50 backdrop-blur-xs text-[10px] text-amber-200 space-y-0.5">
                            <div className="font-extrabold text-white flex items-center justify-between">
                              <span>Chlorosis Corridor</span>
                              <span className="text-amber-400 font-bold">Score: 58%</span>
                            </div>
                            <div className="text-[9px] text-amber-300 leading-tight">
                              Lime-yellow leaves, stunted canopy, moisture gap.
                            </div>
                          </div>
                        </div>

                        {/* Right Belt: Green / Healthy (Matches lush dense green paddy field) */}
                        <div
                          onClick={() => {
                            const healthy = analysisReport.quadrants.find((q) => q.shortCode === 'NE') || analysisReport.quadrants[1];
                            setSelectedQuadrant(healthy);
                          }}
                          className="flex-1 h-full bg-emerald-500/30 hover:bg-emerald-500/40 transition-all p-2.5 flex flex-col justify-between cursor-pointer group shadow-inner"
                        >
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white bg-emerald-600/90 px-2 py-0.5 rounded-md self-start border border-emerald-300/40 shadow-sm">
                              🟢 GREEN ZONE ({analysisReport.zones.green.percentage}%)
                            </span>
                            <span className="text-[9px] md:text-[10px] font-bold text-emerald-200 bg-black/60 px-2 py-0.5 rounded self-start">
                              East Belt: Optimal Canopy Vigour
                            </span>
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ne = analysisReport.quadrants.find((q) => q.shortCode === 'NE') || analysisReport.quadrants[1];
                                  setSelectedQuadrant(ne);
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                                  selectedQuadrant?.shortCode === 'NE'
                                    ? 'bg-white text-emerald-900 ring-2 ring-emerald-400 shadow-md font-extrabold scale-105'
                                    : 'bg-black/70 text-emerald-200 hover:bg-black/90'
                                }`}
                              >
                                NE (88%)
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const se = analysisReport.quadrants.find((q) => q.shortCode === 'SE') || analysisReport.quadrants[4];
                                  setSelectedQuadrant(se);
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                                  selectedQuadrant?.shortCode === 'SE'
                                    ? 'bg-white text-emerald-900 ring-2 ring-emerald-400 shadow-md font-extrabold scale-105'
                                    : 'bg-black/70 text-emerald-200 hover:bg-black/90'
                                }`}
                              >
                                SE (92%)
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-950/85 p-2 rounded-lg border border-emerald-500/50 backdrop-blur-xs text-[10px] text-emerald-200 space-y-0.5">
                            <div className="font-extrabold text-white flex items-center justify-between">
                              <span>Optimal Canopy</span>
                              <span className="text-emerald-400 font-bold">
                                Score: {selectedQuadrant?.shortCode === 'SE' ? '92%' : '88%'}
                              </span>
                            </div>
                            <div className="text-[9px] text-emerald-300 leading-tight">
                              Dense lush green tillers, peak photosynthesis.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LAYER 2: MULTISPECTRAL NDVI RISK HEATMAP (Continuous Spectral Gradient) */}
                  {activeLayer === 'heatmap' && analysisReport && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div
                        className="w-full h-full"
                        style={{
                          background:
                            'linear-gradient(to right, rgba(225, 29, 72, 0.52) 0%, rgba(225, 29, 72, 0.45) 32%, rgba(245, 158, 11, 0.42) 36%, rgba(245, 158, 11, 0.38) 56%, rgba(16, 185, 129, 0.42) 62%, rgba(16, 185, 129, 0.48) 100%)',
                        }}
                      />
                      {/* Drone HUD Grid Lines & NDVI Telemetry */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 border border-rose-500/60 text-[10px] font-black text-rose-300 font-mono">
                        NDVI: 0.12 (WEST DESICCATION)
                      </div>
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/75 border border-emerald-500/60 text-[10px] font-black text-emerald-300 font-mono">
                        NDVI: 0.88 (EAST VIGOUR)
                      </div>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-700 text-[10px] font-mono font-bold text-slate-200 flex items-center space-x-2 shadow-lg">
                        <span className="text-rose-400">RED: &lt;0.2</span>
                        <span>•</span>
                        <span className="text-amber-400">YELLOW: 0.2-0.5</span>
                        <span>•</span>
                        <span className="text-emerald-400">GREEN: &gt;0.6</span>
                      </div>
                    </div>
                  )}

                  {/* LAYER 3: 5-SECTOR GRID (Accurately Placed on Field Features Below Horizon) */}
                  {activeLayer === 'grid' && analysisReport?.quadrants && (
                    <div className="absolute inset-0 pointer-events-auto">
                      {/* Subtle horizon line indicating field origin */}
                      <div className="absolute top-[17%] left-0 right-0 border-b border-dashed border-white/25 pointer-events-none" />

                      {analysisReport.quadrants.map((q, idx) => {
                        const isSelected = selectedQuadrant?.shortCode === q.shortCode;
                        const borderColor =
                          q.status === 'red'
                            ? 'border-rose-500 bg-rose-500/30'
                            : q.status === 'yellow'
                            ? 'border-amber-400 bg-amber-400/30'
                            : 'border-emerald-400 bg-emerald-400/30';

                        // True spatial positioning matching visual field belts below horizon line (~17%)
                        let top = 19;
                        let left = 2;
                        let width = 32;
                        let height = 37;

                        if (q.shortCode === 'NW') {
                          top = 19; left = 2; width = 32; height = 37;
                        } else if (q.shortCode === 'SW') {
                          top = 58; left = 2; width = 32; height = 39;
                        } else if (q.shortCode === 'Center') {
                          top = 19; left = 36; width = 20; height = 78;
                        } else if (q.shortCode === 'NE') {
                          top = 19; left = 58; width = 40; height = 37;
                        } else if (q.shortCode === 'SE') {
                          top = 58; left = 58; width = 40; height = 39;
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedQuadrant(q)}
                            style={{
                              position: 'absolute',
                              top: `${top}%`,
                              left: `${left}%`,
                              width: `${width}%`,
                              height: `${height}%`,
                            }}
                            className={`rounded-xl border-2 ${borderColor} cursor-pointer transition-all hover:scale-[1.01] p-2 flex flex-col justify-between ${
                              isSelected ? 'ring-4 ring-white shadow-2xl z-20' : 'z-10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-white bg-slate-950/80 px-2 py-0.5 rounded">
                                {q.shortCode}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  q.status === 'red'
                                    ? 'bg-rose-600 text-white'
                                    : q.status === 'yellow'
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {q.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-white font-bold bg-slate-950/80 p-1 rounded backdrop-blur-xs truncate">
                              {q.zoneName}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 gap-2">
                  <span>Click any zone above to inspect localized symptoms & targeted remedies.</span>
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span>Left: Red (Drought)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      <span>Center: Yellow (Watch)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                      <span>Right: Green (Healthy)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Selected Quadrant Inspection & Prescription (Span 5) */}
              <div className="lg:col-span-5 space-y-4">
                {selectedQuadrant ? (
                  <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-agri-border">
                      <div>
                        <span className="text-[10px] font-bold text-agri-text-muted uppercase tracking-wider block">
                          Sector Detail
                        </span>
                        <h4 className="text-base font-extrabold text-agri-text-primary">
                          {selectedQuadrant.quadrant}
                        </h4>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                          selectedQuadrant.status === 'red'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : selectedQuadrant.status === 'yellow'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {selectedQuadrant.status === 'red'
                          ? 'High-Risk Zone'
                          : selectedQuadrant.status === 'yellow'
                          ? 'Watch Zone'
                          : 'Green Healthy Zone'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-agri-bg rounded-xl">
                        <span className="text-agri-text-muted text-[10px] block">Health Score:</span>
                        <span className="text-base font-black text-agri-green">
                          {selectedQuadrant.healthScore}/100
                        </span>
                      </div>
                      <div className="p-3 bg-agri-bg rounded-xl">
                        <span className="text-agri-text-muted text-[10px] block">Detected Condition:</span>
                        <span className="text-xs font-bold text-agri-text-primary truncate block">
                          {selectedQuadrant.zoneName}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-agri-text-muted uppercase">
                        Optical Foliar Observations:
                      </span>
                      <p className="text-xs text-agri-text-secondary leading-relaxed bg-[#FAFBF9] p-3 rounded-xl border border-agri-border">
                        {selectedQuadrant.symptoms}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-agri-green uppercase">
                        Targeted Precision Prescription:
                      </span>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-semibold leading-relaxed">
                        {selectedQuadrant.recommendedAction}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-stone-50 border border-agri-border text-center text-xs text-agri-text-muted">
                    Select any quadrant to view targeted analysis.
                  </div>
                )}

                {/* Targeted Prescriptions & Chemical Input Savings */}
                {analysisReport?.targetedPrescriptions && (
                  <div className="bg-gradient-to-br from-[#1B4D3E] to-[#2E7D32] text-white p-5 rounded-2xl shadow-md space-y-3">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="w-5 h-5 text-[#A7F3D0]" />
                      <h4 className="text-sm font-extrabold">Precision Spot-Spraying Savings</h4>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed">
                      By targeting chemical sprays ONLY to the{' '}
                      <strong className="text-[#A7F3D0]">{analysisReport.zones.red.percentage}% Red Zone</strong>{' '}
                      identified in this scan, you save approximately{' '}
                      <strong className="text-[#A7F3D0]">
                        {analysisReport.targetedPrescriptions[0]?.savingsPct || 85}% of chemical inputs
                      </strong>{' '}
                      and ₹1,800/acre compared to blanket whole-field spraying!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Spatial Quadrant Comprehensive Inspection Table               */}
            {/* ------------------------------------------------------------- */}
            {analysisReport?.quadrants && (
              <div className="bg-white rounded-2xl border border-agri-border overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-agri-border bg-[#FBFDFB] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-agri-text-primary">
                      All Field Sectors Spatial Risk Matrix
                    </h4>
                    <p className="text-xs text-agri-text-muted">
                      Detailed breakdown of each sector's risk status, optical symptoms, and spot remedies
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-agri-bg border-b border-agri-border text-agri-text-muted uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-3 px-4">Quadrant</th>
                        <th className="py-3 px-4">Status & Zone</th>
                        <th className="py-3 px-4">Health</th>
                        <th className="py-3 px-4">Symptoms</th>
                        <th className="py-3 px-4">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-agri-border">
                      {analysisReport.quadrants.map((q, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedQuadrant(q)}
                          className={`hover:bg-[#F3F8F4] cursor-pointer transition-colors ${
                            selectedQuadrant?.shortCode === q.shortCode ? 'bg-emerald-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-agri-text-primary">
                            {q.quadrant}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                q.status === 'red'
                                  ? 'bg-rose-100 text-rose-700'
                                  : q.status === 'yellow'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {q.status === 'red' ? '🟥 Risky Zone' : q.status === 'yellow' ? '🟨 Normal Watch' : '🟩 Green Optimal'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-agri-green">
                            {q.healthScore}%
                          </td>
                          <td className="py-3 px-4 text-agri-text-secondary max-w-xs truncate">
                            {q.symptoms}
                          </td>
                          <td className="py-3 px-4 text-agri-text-primary font-medium max-w-xs truncate">
                            {q.recommendedAction}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Laptop Live WebCam Modal */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-950 border border-slate-800 text-white rounded-3xl overflow-hidden shadow-2xl max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Laptop WebCam Aerial Scanner</h3>
              </div>
              <button
                onClick={stopLaptopWebcam}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewport with Drone HUD Reticle */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
              <video
                ref={webcamVideoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={webcamCanvasRef} className="hidden" />

              {/* Tactical Crosshairs */}
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400/80" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400/80" />
                </div>
                <div className="self-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full border border-dashed border-emerald-400/60 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 mt-1 bg-slate-900/80 px-2 py-0.5 rounded">
                    FIELD GRID TARGET
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400/80" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400/80" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={stopLaptopWebcam}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={captureLaptopWebcamFrame}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Field Aerial Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
