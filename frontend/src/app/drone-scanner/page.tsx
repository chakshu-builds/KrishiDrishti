'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Camera,
  Wifi,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Upload,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function DroneScannerMobilePage() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('session') || 'drone-live-session';
  const [sessionId, setSessionId] = useState<string>(initialSessionId);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmissionSuccess, setTransmissionSuccess] = useState(false);
  const [transmissionError, setTransmissionError] = useState<string | null>(null);

  const [altitude, setAltitude] = useState<number>(15);
  const [heading, setHeading] = useState<number>(45);
  const [wifiLatency, setWifiLatency] = useState<number>(24);
  const [serverConnected, setServerConnected] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<any>(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeImageBlobRef = useRef<Blob | null>(null);

  // If opened without a specific session param, auto-discover the active laptop session
  useEffect(() => {
    const discoverActiveSession = async () => {
      try {
        const res = await fetch('/api/drone/session/latest-active');
        if (res.ok) {
          const data = await res.json();
          if (data.latestSessionId && data.latestSessionId !== 'drone-live-session') {
            setSessionId(data.latestSessionId);
          }
        }
      } catch (err) {
        // Fallback to initialSessionId
      }
    };

    if (initialSessionId === 'drone-live-session') {
      discoverActiveSession();
    }
  }, [initialSessionId]);

  // Detect in-app webviews (WhatsApp, Instagram, Lens, etc.)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/FBAN|FBAV|Instagram|WhatsApp|Line|Twitter|Snapchat|MicroMessenger|GSA/i.test(ua)) {
        setIsInAppBrowser(true);
      }
    }
  }, []);

  // Ping backend to register phone connection
  useEffect(() => {
    let isMounted = true;
    const pingSession = async () => {
      try {
        const start = Date.now();
        const res = await fetch(`/api/drone/session/${sessionId}/ping`, {
          method: 'POST',
        });
        if (res.ok && isMounted) {
          setServerConnected(true);
          setWifiLatency(Date.now() - start);
        }
      } catch (err) {
        console.warn('Ping note:', err);
      }
    };

    pingSession();
    const interval = setInterval(pingSession, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  // Device orientation gyro
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHeading(Math.round(e.alpha));
      }
    };
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  // Camera stream startup
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const attachStreamToVideo = (stream: MediaStream) => {
    streamRef.current = stream;
    setStreamActive(true);
    setCameraError(null);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.play().catch((e) => console.warn('Video play note:', e));
    }
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Direct live stream unavailable on this browser. Tap the green button below to capture.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      attachStreamToVideo(stream);
      return;
    } catch (err1) {
      console.warn('Tier 1 camera failed:', err1);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      attachStreamToVideo(stream);
      return;
    } catch (err2) {
      console.warn('Tier 2 camera failed:', err2);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      attachStreamToVideo(stream);
      return;
    } catch (err3: any) {
      console.warn('Tier 3 camera failed:', err3);
      setCameraError('Tap the green button below to open your phone camera.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  // Helper: downscale and compress image to max 1280px JPEG (< 250KB) using GPU createImageBitmap or Canvas
  const processAndCompressFile = async (file: File): Promise<{ dataUrl: string; blob: Blob }> => {
    // 1. Try modern hardware-accelerated createImageBitmap (Works on all modern Android & iOS)
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(file);
        const MAX = 1280;
        let width = bitmap.width;
        let height = bitmap.height;

        if (width > height) {
          if (width > MAX) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
          if (blob && blob.size > 0) {
            return { dataUrl, blob };
          }
        }
      } catch (bitmapErr) {
        console.warn('createImageBitmap fallback note:', bitmapErr);
      }
    }

    // 2. Fallback to standard Image object decoding
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve({ dataUrl: '', blob: file });
      reader.onload = (e) => {
        const dataUrlStr = (e.target?.result as string) || '';
        const img = new Image();
        img.onerror = () => resolve({ dataUrl: dataUrlStr, blob: file });
        img.onload = () => {
          try {
            const MAX = 1280;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX) {
                height = Math.round((height * MAX) / width);
                width = MAX;
              }
            } else {
              if (height > MAX) {
                width = Math.round((width * MAX) / height);
                height = MAX;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve({ dataUrl: dataUrlStr, blob: file });
            }

            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

            canvas.toBlob(
              (blob) => {
                if (blob && blob.size > 0) {
                  resolve({ dataUrl, blob });
                } else {
                  resolve({ dataUrl, blob: file });
                }
              },
              'image/jpeg',
              0.82
            );
          } catch {
            resolve({ dataUrl: dataUrlStr, blob: file });
          }
        };
        img.src = dataUrlStr;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle native camera capture (Works 100% on iOS & Android)
  const handleNativeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = e.target;
    const file = inputElement.files?.[0];
    if (!file) return;

    // Immediately show instant local preview so screen NEVER appears stuck
    let instantUrl = '';
    try {
      instantUrl = URL.createObjectURL(file);
      setCapturedImage(instantUrl);
    } catch (_) {}

    setIsProcessing(true);
    setProcessingStep('📸 Photo Captured! Beaming to laptop...');
    setTransmissionError(null);

    try {
      const { dataUrl, blob } = await processAndCompressFile(file);
      activeImageBlobRef.current = blob;
      if (dataUrl) {
        setCapturedImage(dataUrl);
      }
      setProcessingStep('🛰️ Beaming aerial frame to laptop...');
      await transmitPhotoToLaptop(blob, dataUrl);
    } catch (err: any) {
      console.error('Image compression note, uploading original file:', err);
      activeImageBlobRef.current = file;
      await transmitPhotoToLaptop(file, instantUrl);
    } finally {
      setIsProcessing(false);
      // ONLY clear input value after everything is done to avoid WebKit revoking file handles
      try {
        inputElement.value = '';
      } catch (_) {}
    }
  };

  // Capture frame from active video stream
  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setIsProcessing(true);
    setProcessingStep('🛰️ Beaming aerial frame to laptop...');

    canvas.toBlob(async (blob) => {
      if (blob) {
        activeImageBlobRef.current = blob;
        await transmitPhotoToLaptop(blob, dataUrl);
      }
      setIsProcessing(false);
    }, 'image/jpeg', 0.85);
  };

  // Transmit photo to backend (Multipart FormData + Base64 fallback + LAN fallback)
  const transmitPhotoToLaptop = async (imageBlob: Blob, base64Fallback: string) => {
    setIsTransmitting(true);
    setTransmissionSuccess(false);
    setTransmissionError(null);

    const endpoints = [
      `/api/drone/session/${sessionId}/upload`,
      `http://192.168.163.177:3000/api/drone/session/${sessionId}/upload`,
      `http://192.168.163.177:5000/api/drone/session/${sessionId}/upload`,
    ];

    let lastErrorMsg = '';
    let succeeded = false;

    for (const endpoint of endpoints) {
      if (succeeded) break;

      try {
        // 1. Try Multipart FormData (Fastest & handles any size without base64 overhead)
        const formData = new FormData();
        formData.append('photo', imageBlob, 'drone_aerial.jpg');
        formData.append('cropName', 'Field Crop (खेत की फसल)');
        formData.append('altitudeMeters', String(altitude));
        formData.append('source', 'phone_camera');

        let res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        // 2. If FormData fails, fallback to JSON Base64
        if (!res.ok && res.status !== 502 && res.status !== 504) {
          console.warn(`FormData failed on ${endpoint}, trying base64 fallback...`);
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Fallback,
              cropName: 'Field Crop (खेत की फसल)',
              altitudeMeters: altitude,
              source: 'phone_camera',
            }),
          });
        }

        if (res.ok) {
          const data = await res.json();
          setTransmissionSuccess(true);
          setAnalysisSummary(data.analysis);
          succeeded = true;
          break;
        } else {
          lastErrorMsg = res.status === 502 || res.status === 504
            ? 'The public tunnel URL was refreshed on laptop. Please scan the current QR code on your laptop screen.'
            : `Upload rejected (Status: ${res.status})`;
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Connection lost. Please tap retry.';
      }
    }

    if (!succeeded) {
      setTransmissionError(lastErrorMsg || 'Unable to beam to laptop. Please scan the updated QR code.');
    }

    setIsTransmitting(false);
  };

  const handleRetryUpload = () => {
    if (activeImageBlobRef.current && capturedImage) {
      transmitPhotoToLaptop(activeImageBlobRef.current, capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setTransmissionSuccess(false);
    setTransmissionError(null);
    setAnalysisSummary(null);
    activeImageBlobRef.current = null;
    startCamera();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden touch-manipulation">
      {/* ------------------------------------------------------------- */}
      {/* Top HUD Telemetry Bar                                         */}
      {/* ------------------------------------------------------------- */}
      <header className="px-4 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-30">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-black tracking-widest text-emerald-400 uppercase">
            Virtual Drone HUD
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-300">
          <div className="flex items-center space-x-1">
            <Wifi className={`w-3.5 h-3.5 ${serverConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{wifiLatency}ms</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded text-emerald-300">
            <span>ALT: {altitude}m</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded text-amber-300">
            <span>HDG: {heading}°</span>
          </div>
        </div>
      </header>

      {/* In-app browser warning banner */}
      {isInAppBrowser && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-3 py-1.5 text-[11px] text-amber-200 flex items-center justify-between z-20">
          <span>⚠️ In-app browser detected (WhatsApp/Lens).</span>
          <span className="font-bold underline text-amber-300">Open in Chrome/Safari for live feed</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Viewfinder Main Stage                                          */}
      {/* ------------------------------------------------------------- */}
      <main className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Viewfinder */}
        {!capturedImage ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Video element is permanently rendered in layout without display:none */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
            />

            {/* Inactive State / Direct Physical Touch Controls */}
            {!streamActive && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <Smartphone className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">Virtual Drone Camera</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    Take an aerial survey photo of your field. It beams instantly to your laptop!
                  </p>
                </div>

                {cameraError && (
                  <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs flex items-center space-x-2 text-left max-w-xs mx-auto">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <div className="space-y-3 w-full max-w-xs pt-1">
                  {/* DIRECT BUTTON 1: Open Phone Camera Directly */}
                  <label className="relative overflow-hidden w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleNativeCapture}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <Camera className="w-5 h-5 text-slate-950" />
                    <span>📸 Open Camera & Take Photo</span>
                  </label>

                  {/* DIRECT BUTTON 2: Gallery or File Chooser */}
                  <label className="relative overflow-hidden w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 border border-slate-700 active:scale-95 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleNativeCapture}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>📁 Choose from Gallery / Files</span>
                  </label>

                  {/* Try Live Stream Button */}
                  <button
                    onClick={startCamera}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700/80 active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Browser Live Stream</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  💡 Tap the <span className="text-emerald-400 font-bold">green button</span> to launch your phone camera!
                </p>
              </div>
            )}

            {/* Drone Cockpit Tactical HUD Reticle (Shown when video is active) */}
            {streamActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400/80" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400/80" />
                </div>

                <div className="self-center flex flex-col items-center">
                  <div className="w-24 h-24 border border-dashed border-emerald-400/60 rounded-full flex items-center justify-center relative">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                    <div className="absolute w-12 h-0.5 bg-emerald-400/70" />
                    <div className="absolute h-12 w-0.5 bg-emerald-400/70" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 mt-2 bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-400/30">
                    PRECISION FIELD GRID LOCK
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400/80" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400/80" />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Captured Image Preview with Instant Feedback */
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <img
              src={capturedImage}
              alt="Aerial Field Frame"
              className="w-full h-full object-contain bg-black"
            />

            {/* In-Flight Status Overlay */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
              {isProcessing || isTransmitting ? (
                <div className="space-y-4 max-w-xs bg-slate-900/90 p-6 rounded-2xl border border-emerald-500/40 shadow-2xl">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mx-auto" />
                  <h3 className="text-base font-black text-white">Beaming to Laptop...</h3>
                  <p className="text-xs text-emerald-300 font-mono animate-pulse">
                    {processingStep || 'Transmitting aerial frame...'}
                  </p>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-400 h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                </div>
              ) : transmissionError ? (
                <div className="space-y-4 max-w-sm bg-slate-900/95 p-6 rounded-2xl border border-rose-500/50 shadow-2xl">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 border border-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Beaming Interrupted</h3>
                    <p className="text-xs text-rose-300 mt-1">{transmissionError}</p>
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={handleRetryUpload}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider"
                    >
                      Retry Beaming
                    </button>
                    <button
                      onClick={handleRetake}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              ) : transmissionSuccess ? (
                <div className="space-y-4 max-w-sm bg-slate-900/95 p-6 rounded-2xl border border-emerald-500/50 shadow-2xl">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Photo Beamed to Laptop!</h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Your aerial survey is now displayed on your laptop screen with AI Spatial Risk Zoning.
                    </p>
                  </div>

                  {analysisSummary && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                      <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
                        <div className="text-[10px] text-emerald-300 font-bold uppercase">Green</div>
                        <div className="text-sm font-black text-emerald-400">{analysisSummary.zones?.green?.percentage || 65}%</div>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/40">
                        <div className="text-[10px] text-amber-300 font-bold uppercase">Watch</div>
                        <div className="text-sm font-black text-amber-400">{analysisSummary.zones?.yellow?.percentage || 23}%</div>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/40">
                        <div className="text-[10px] text-rose-300 font-bold uppercase">Risky</div>
                        <div className="text-sm font-black text-rose-400">{analysisSummary.zones?.red?.percentage || 12}%</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      onClick={handleRetake}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg"
                    >
                      Scan Another Plot
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Bottom Shutter & Controls Dock                                */}
      {/* ------------------------------------------------------------- */}
      <footer className="p-4 bg-slate-900 border-t border-slate-800 z-30 space-y-3">
        {!capturedImage ? (
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* Gallery / File Picker */}
            <label className="relative overflow-hidden p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleNativeCapture}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-5 h-5 text-emerald-400" />
            </label>

            {/* Big Main Drone Shutter Button */}
            {streamActive ? (
              <button
                onClick={captureFrame}
                className="w-20 h-20 rounded-full border-4 border-emerald-400 p-1 flex items-center justify-center shadow-xl shadow-emerald-500/30 active:scale-90 transition-all bg-slate-950"
              >
                <div className="w-full h-full rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-slate-950">
                  <Camera className="w-8 h-8" />
                </div>
              </button>
            ) : (
              <label className="relative overflow-hidden w-20 h-20 rounded-full border-4 border-emerald-400 p-1 flex items-center justify-center shadow-xl shadow-emerald-500/30 active:scale-90 transition-all bg-slate-950 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeCapture}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className="w-full h-full rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-slate-950">
                  <Camera className="w-8 h-8" />
                </div>
              </label>
            )}

            {/* Flip Camera Mode */}
            <button
              onClick={() => {
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                startCamera();
              }}
              className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="text-center text-[11px] text-slate-400">
            Session ID: <span className="font-mono text-emerald-400">{sessionId}</span>
          </div>
        )}

        {/* Altitude Preset Chips */}
        {!capturedImage && (
          <div className="flex items-center justify-center space-x-2 pt-1 text-[10px]">
            <span className="text-slate-400 font-semibold">Simulated Drone Altitude:</span>
            {[10, 15, 25, 40].map((alt) => (
              <button
                key={alt}
                onClick={() => setAltitude(alt)}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  altitude === alt
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {alt}m
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
