'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Leaf,
  Sprout,
  Camera,
  Upload,
  Sparkles,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  X,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ExternalLink,
  FileText,
  Check,
  Image as ImageIcon,
  Info,
  ArrowRight,
  AlertCircle,
  Eye,
  Activity,
  Award,
  Share2,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, resolveImageUrl } from '../../lib/api';

interface CropDiagnosis {
  id: string;
  fieldId: string;
  farmerId: string;
  imageUrl: string;
  source: 'web_upload' | 'esp32_cam' | 'whatsapp' | 'drone' | 'preset_sample';
  cropDetected: string;
  primaryIssue: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  confidencePct: number;
  visibleEvidence: string;
  actionableSteps: string[];
  preventativeMeasures: string[];
  disclaimer: string;
  escalationNeeded: boolean;
  escalationNotes?: string;
  followUpQuestions: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  provider?: 'gemini' | 'offline_pathology_engine' | 'mistral';
  dataStatus?: 'live' | 'fallback' | 'cached';
  modelUsed?: string;
  fallbackReason?: string;
  createdAt: string;
}

function getDiagnosisCategory(diagnosis: CropDiagnosis | null): 'healthy' | 'monitor' | 'at_risk' {
  if (!diagnosis) return 'healthy';
  const sev = (diagnosis.severity || '').toLowerCase();
  const issue = (diagnosis.primaryIssue || '').toLowerCase();

  if (sev === 'high' || sev === 'severe') return 'at_risk';
  if (sev === 'low' || issue.includes('healthy') || issue.includes('optimal') || issue.includes('vigorous')) {
    return 'healthy';
  }
  return 'monitor';
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`;
    }
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    if (diffDays < 30) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return dateString;
  }
}

function cleanDisplayTitle(text?: string, fallback = ''): string {
  if (!text) return fallback;
  // Strips Latin binomials like (Zea mays), preserves Hindi/vernacular names like (मक्का)
  return text.replace(/\s*\([A-Z][a-z]+ [a-z]+\)/g, '').trim();
}

export default function CropHealthPage() {
  const { profile } = useApp();

  const [fields, setFields] = useState<any[]>([]);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Diagnoses State
  const [diagnosesHistory, setDiagnosesHistory] = useState<CropDiagnosis[]>([]);
  const [activeDiagnosis, setActiveDiagnosis] = useState<CropDiagnosis | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Tab State in Advisory Preview
  const [advisoryTab, setAdvisoryTab] = useState<'findings' | 'treatment' | 'prevention'>('findings');

  // Modal State for Full Diagnosis Details
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // Reference for smooth scrolling
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);

  // Load fields and diagnoses on mount
  useEffect(() => {
    loadFields();
    loadHistory();
  }, [profile?.id]);

  const loadFields = async () => {
    try {
      const res = await api.getFields(undefined, profile?.id || 'usr-farmer-001');
      const list = res.fields || [];
      setFields(list);
    } catch (err) {
      console.error('[CropHealth] Failed to load fields:', err);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await api.getCropDiagnoses(undefined, profile?.id || 'usr-farmer-001');
      const list = res.diagnoses || [];
      setDiagnosesHistory(list);
      if (list.length > 0) {
        setActiveDiagnosis((prev) => (prev ? list.find((d: CropDiagnosis) => d.id === prev.id) || list[0] : list[0]));
      } else {
        setActiveDiagnosis(null);
      }
    } catch (err: any) {
      console.error('[CropHealth] History load failed:', err);
      setHistoryError(err.message || 'Failed to load analysis history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setAnalysisError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setAnalysisError('Invalid file type. Please upload a JPEG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAnalysisError('File exceeds 10 MB limit. Please select a smaller photo.');
      return;
    }
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setAnalysisError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Perform Analysis
  const handleAnalyze = async () => {
    if (!selectedFile && !previewUrl) {
      setAnalysisError('Please choose or drag a crop photo to analyze.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const field = fields[0];
      const formData = new FormData();

      if (selectedFile) {
        formData.append('photo', selectedFile);
      } else {
        formData.append('imageUrl', previewUrl);
      }

      formData.append('fieldId', field?.id || 'field-101');
      formData.append('farmerId', profile?.id || 'usr-farmer-001');
      formData.append('cropName', 'Auto-detect');
      formData.append('source', selectedFile ? 'web_upload' : 'preset_sample');

      const result = await api.analyzeCropHealth(formData);
      if (result?.diagnosis) {
        setActiveDiagnosis(result.diagnosis);
        await loadHistory();
        // Clear local file selection after successful analysis
        setSelectedFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('[CropHealth] Analysis failed:', err);
      setAnalysisError(err.message || 'Crop pathology analysis encountered an error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Direct diagnoses history used for summary cards and analytics without filter constraints
  const filteredDiagnoses = diagnosesHistory;

  // Dynamic summary counts strictly from actual diagnosis records
  const summaryCounts = useMemo(() => {
    const total = filteredDiagnoses.length;
    let healthy = 0;
    let monitor = 0;
    let atRisk = 0;

    filteredDiagnoses.forEach((d) => {
      const cat = getDiagnosisCategory(d);
      if (cat === 'healthy') healthy++;
      else if (cat === 'monitor') monitor++;
      else if (cat === 'at_risk') atRisk++;
    });

    return { total, healthy, monitor, atRisk };
  }, [filteredDiagnoses]);

  // Common issues detected aggregation
  const commonIssues = useMemo(() => {
    const map = new Map<string, { title: string; crop: string; count: number; category: string }>();

    filteredDiagnoses.forEach((d) => {
      let title = d.primaryIssue || 'Unclassified Foliar Condition';
      if (title.toLowerCase().includes('healthy') || title.toLowerCase().includes('optimal') || title.toLowerCase().includes('vigorous')) {
        title = 'Healthy Foliage';
      } else if (title.toLowerCase().includes('yellow rust') || title.toLowerCase().includes('stripe rust')) {
        title = 'Yellow Rust';
      } else if (title.toLowerCase().includes('blast')) {
        title = 'Leaf Blast';
      } else if (title.toLowerCase().includes('alternaria') || title.toLowerCase().includes('spot')) {
        title = 'Leaf Spot / Alternaria';
      } else if (title.toLowerCase().includes('blight')) {
        title = 'Foliar Blight';
      } else {
        title = cleanDisplayTitle(title);
      }

      const rawCrop = cleanDisplayTitle(d.cropDetected, 'Crop');
      const key = `${title}__${title === 'Healthy Foliage' ? 'Multiple crops' : rawCrop}`;

      if (!map.has(key)) {
        map.set(key, {
          title,
          crop: title === 'Healthy Foliage' ? 'Multiple crops' : rawCrop,
          count: 1,
          category: getDiagnosisCategory(d),
        });
      } else {
        map.get(key)!.count += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [filteredDiagnoses]);



  const activeCategory = activeDiagnosis ? getDiagnosisCategory(activeDiagnosis) : 'healthy';

  return (
    <div className="space-y-6 pb-12 text-agri-text-primary">
      {/* --------------------------------------------------------------------- */}
      {/* SECTION B: Crop Health Hero                                          */}
      {/* --------------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl border border-agri-border bg-gradient-to-r from-[#F4F7F2] via-[#EBF3ED] to-[#E3EFE7] shadow-xs">
        {/* Subtle crop leaf background overlay */}
        <div
          className="absolute inset-0 bg-cover bg-right opacity-25 mix-blend-multiply pointer-events-none"
          style={{ backgroundImage: `url('/images/farm1.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F7F2] via-[#F4F7F2]/90 to-transparent pointer-events-none" />

        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4 max-w-2xl">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-agri-green text-white flex items-center justify-center shrink-0 shadow-md">
              <Sprout className="w-7 h-7 text-[#A7F3D0]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-agri-green">
                Crop Health
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-agri-green-dark">
                AI-powered crop analysis and expert advisories
              </p>
              <p className="text-xs sm:text-sm text-agri-text-secondary leading-relaxed pt-0.5">
                Understand crop symptoms early, detect foliar diseases, and make informed farming decisions.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={() => uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-agri-green hover:bg-agri-green-hover text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Analyse a Crop</span>
                </button>
                <button
                  onClick={() => historySectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-agri-bg border border-agri-border text-agri-text-primary text-xs font-bold transition-all shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5 text-agri-text-muted" />
                  <span>View Analysis History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Quote Card on Right */}
          <div className="hidden lg:flex items-center space-x-3.5 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-agri-border shadow-xs max-w-xs shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0EC] text-agri-green flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 text-agri-green" />
            </div>
            <p className="text-xs font-semibold text-agri-text-primary italic leading-snug">
              “Healthy crops today, better harvests tomorrow.”
            </p>
          </div>
        </div>
      </div>



      {/* --------------------------------------------------------------------- */}
      {/* SECTION D: Main Analysis Workspace (2 Balanced Columns)              */}
      {/* --------------------------------------------------------------------- */}
      <div ref={uploadSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Analyze Crop with AI (Span 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-agri-border p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0EC] text-agri-green flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-agri-green" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-agri-text-primary">
                Analyze Crop with AI
              </h2>
              <p className="text-xs text-agri-text-secondary leading-relaxed pt-0.5">
                Upload a clear photo of your crop leaf, stem, fruit or whole plant to detect possible diseases and get expert advice.
              </p>
            </div>
          </div>


          {/* Upload Drop Area & Photo Tips Side-by-Side Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Upload Area (Span 7) */}
            <div className="md:col-span-7 flex flex-col">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 min-h-[220px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-agri-green bg-agri-green-light/40'
                      : 'border-[#CBD5E1] bg-[#FAFBF9] hover:bg-[#F3F6F1] hover:border-agri-green'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-agri-border flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-agri-green" />
                  </div>
                  <div className="text-xs font-bold text-agri-text-primary">
                    Drag and drop an image here
                  </div>
                  <div className="text-[11px] text-agri-text-muted mt-0.5">or click to upload</div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-3.5 px-4 py-2 rounded-xl bg-agri-green hover:bg-agri-green-hover text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Upload Image
                  </button>
                  <span className="text-[10px] text-agri-text-muted mt-3">
                    Supports JPG, PNG, WEBP (Max 10 MB)
                  </span>
                </div>
              ) : (
                <div className="flex-1 rounded-2xl border border-agri-border bg-[#FAFBF9] p-3 flex flex-col">
                  <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-black/5 flex items-center justify-center">
                    <img
                      src={resolveImageUrl(previewUrl)}
                      alt="Selected crop preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-agri-text-primary truncate max-w-[150px]">
                      {selectedFile ? selectedFile.name : 'Selected photo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-agri-green hover:underline"
                    >
                      Replace photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tips for better results (Span 5) */}
            <div className="md:col-span-5 bg-[#F8FAFC] rounded-2xl border border-agri-border p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-agri-text-primary mb-2.5">
                  <span className="text-amber-500">💡</span>
                  <span>Tips for better results</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-agri-text-secondary leading-snug">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-agri-green shrink-0 mt-0.5" />
                    <span>Take a clear, well-focused photo</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-agri-green shrink-0 mt-0.5" />
                    <span>Capture affected part (leaf, stem, fruit)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-agri-green shrink-0 mt-0.5" />
                    <span>Ensure good natural lighting</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-agri-green shrink-0 mt-0.5" />
                    <span>Include multiple angles if possible</span>
                  </li>
                </ul>
              </div>

              {/* Photo Comparison Thumbnails */}
              <div className="mt-4 pt-3 border-t border-agri-border grid grid-cols-2 gap-2">
                <div>
                  <div className="rounded-lg overflow-hidden aspect-square border border-emerald-300 relative">
                    <img
                      src="/images/tip_good.jpg"
                      alt="Good crop photography example"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-center space-x-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md py-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Good Example</span>
                  </div>
                </div>
                <div>
                  <div className="rounded-lg overflow-hidden aspect-square border border-red-300 relative">
                    <img
                      src="/images/tip_blurry.jpg"
                      alt="Blurry photography example to avoid"
                      className="w-full h-full object-cover filter blur-[0.5px]"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-center space-x-1 bg-red-50 text-red-800 border border-red-200 rounded-md py-0.5 text-[10px] font-bold">
                    <X className="w-3 h-3 text-red-600" />
                    <span>Avoid Blurry</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Error Notification */}
          {analysisError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || (!selectedFile && !previewUrl)}
            className="w-full py-3.5 px-4 rounded-xl bg-agri-green hover:bg-agri-green-hover text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Foliar Pathology with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Analyse Crop</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Recent Analyses (Span 5) */}
        <div ref={historySectionRef} className="lg:col-span-5 bg-white rounded-2xl border border-agri-border p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-agri-border">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-agri-green" />
              <h3 className="font-extrabold text-sm sm:text-base text-agri-text-primary">
                Recent Analyses
              </h3>
            </div>
            <button
              onClick={loadHistory}
              className="text-xs font-bold text-agri-green hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Loading Skeleton */}
          {loadingHistory && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-agri-border animate-pulse flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {historyError && !loadingHistory && (
            <div className="p-6 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="text-xs font-bold text-agri-text-primary">Failed to load analyses</div>
              <p className="text-[11px] text-agri-text-muted">{historyError}</p>
              <button
                onClick={loadHistory}
                className="mt-2 px-3 py-1.5 rounded-lg bg-agri-bg border border-agri-border text-xs font-semibold text-agri-green hover:bg-agri-green-light"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loadingHistory && !historyError && filteredDiagnoses.length === 0 && (
            <div className="p-8 text-center space-y-3 border-2 border-dashed border-agri-border rounded-xl">
              <Sprout className="w-10 h-10 text-agri-text-muted mx-auto" />
              <div className="text-xs font-bold text-agri-text-primary">No Crop Analyses Yet</div>
              <p className="text-[11px] text-agri-text-muted leading-relaxed">
                Take a photo of your crop foliage or upload an image on the left to run your first AI pathology analysis.
              </p>
            </div>
          )}

          {/* List of Recent Analyses */}
          {!loadingHistory && !historyError && filteredDiagnoses.length > 0 && (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredDiagnoses.map((d) => {
                const isSelected = activeDiagnosis?.id === d.id;
                const cat = getDiagnosisCategory(d);
                const badgeStyle =
                  cat === 'healthy'
                    ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                    : cat === 'monitor'
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                    : 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]';
                const badgeLabel = cat === 'healthy' ? 'Healthy' : cat === 'monitor' ? 'Monitor' : 'At Risk';

                return (
                  <div
                    key={d.id}
                    onClick={() => setActiveDiagnosis(d)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-agri-green bg-[#F3F7F4] shadow-xs'
                        : 'border-agri-border hover:border-agri-green/60 hover:bg-[#FAFBF9]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {/* Image Thumbnail strictly associated with THIS diagnosis */}
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-agri-border bg-black/5">
                        <img
                          src={resolveImageUrl(d.imageUrl)}
                          alt={d.primaryIssue}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to placeholder if file deleted
                            (e.target as HTMLImageElement).src = '/images/tip_good.jpg';
                          }}
                        />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-agri-text-primary truncate">
                            {cleanDisplayTitle(d.cropDetected, 'Crop')} – {cleanDisplayTitle(d.primaryIssue, 'Crop Analysis')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${badgeStyle}`}>
                            {badgeLabel}
                          </span>
                          <span className="text-[10px] text-agri-text-muted flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-agri-text-muted inline" />
                            <span>{formatRelativeTime(d.createdAt)}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-agri-text-secondary truncate mt-1">
                          {d.visibleEvidence || 'Analysis recorded and filed.'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-agri-green translate-x-0.5' : 'text-agri-text-muted'}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTIONS G & H: Crop Health Overview & AI Advisory Preview            */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SECTION G: Crop Health Overview (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-agri-border p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-agri-border">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-agri-green" />
              <h3 className="font-extrabold text-sm sm:text-base text-agri-text-primary">
                Crop Health Overview
              </h3>
            </div>
            <span className="text-xs font-semibold text-agri-text-muted">
              Live Field Intelligence
            </span>
          </div>

          {/* Overview Content: Common Pathology Patterns & Detected Issues */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-agri-text-secondary uppercase tracking-wider">
                Common Pathology Issues Detected
              </div>
              <span className="text-[11px] text-agri-text-muted">
                {commonIssues.length} condition{commonIssues.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            {commonIssues.length === 0 ? (
              <p className="text-xs text-agri-text-muted italic py-4">
                More analyses needed to compile pathology patterns.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {commonIssues.map((issue, idx) => {
                  const iconColor =
                    issue.category === 'healthy'
                      ? 'text-emerald-600 bg-emerald-50'
                      : issue.category === 'monitor'
                      ? 'text-amber-600 bg-amber-50'
                      : 'text-red-600 bg-red-50';

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-agri-border bg-[#FAFBF9] text-xs hover:border-agri-green/40 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                          <Leaf className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-agri-text-primary">{issue.title}</div>
                          <div className="text-[11px] text-agri-text-muted">{issue.crop}</div>
                        </div>
                      </div>
                      <span className="font-bold text-agri-text-secondary bg-white px-2.5 py-1 rounded-md border border-agri-border text-[11px]">
                        {issue.count} {issue.count === 1 ? 'case' : 'cases'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION H: AI Advisory Preview (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-agri-border p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-agri-border">
            <div className="flex items-center space-x-2">
              <Sprout className="w-4 h-4 text-agri-green" />
              <h3 className="font-extrabold text-sm sm:text-base text-agri-text-primary">
                AI Advisory Preview
              </h3>
            </div>
            {activeDiagnosis && (
              <button
                onClick={() => setShowDetailModal(true)}
                className="text-xs font-bold text-agri-green hover:underline flex items-center space-x-1"
              >
                <span>Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!activeDiagnosis ? (
            <div className="p-12 text-center space-y-2 border-2 border-dashed border-agri-border rounded-xl">
              <Sprout className="w-10 h-10 text-agri-text-muted mx-auto" />
              <div className="text-xs font-bold text-agri-text-primary">No Diagnosis Selected</div>
              <p className="text-[11px] text-agri-text-muted">
                Select an item from Recent Analyses or analyze a new crop to preview agronomic advisory.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Diagnosis Header with Image */}
              <div className="flex items-start gap-4">
                {/* Associated diagnosis image */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-agri-border bg-black/5 shadow-xs">
                  <img
                    src={resolveImageUrl(activeDiagnosis.imageUrl)}
                    alt={activeDiagnosis.primaryIssue}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/tip_good.jpg';
                    }}
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        activeCategory === 'healthy'
                          ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                          : activeCategory === 'monitor'
                          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                          : 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
                      }`}
                    >
                      {activeCategory === 'healthy' ? 'Healthy' : activeCategory === 'monitor' ? 'Monitor' : 'At Risk'}
                    </span>
                    <span className="text-[10px] font-semibold text-agri-text-muted">
                      {new Date(activeDiagnosis.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-agri-text-primary leading-snug">
                    {cleanDisplayTitle(activeDiagnosis.cropDetected, 'Crop')} – {cleanDisplayTitle(activeDiagnosis.primaryIssue, 'Crop Analysis')}
                  </h4>
                  <div className="flex items-center space-x-1.5 pt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-agri-green">
                      {activeDiagnosis.confidencePct}% confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Advisory Tab Selection */}
              <div className="flex items-center space-x-2 border-b border-agri-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAdvisoryTab('findings')}
                  className={`pb-2 px-1 transition-colors relative ${
                    advisoryTab === 'findings'
                      ? 'text-agri-green border-b-2 border-agri-green'
                      : 'text-agri-text-muted hover:text-agri-text-primary'
                  }`}
                >
                  Key Findings
                </button>
                <button
                  type="button"
                  onClick={() => setAdvisoryTab('treatment')}
                  className={`pb-2 px-1 transition-colors relative ${
                    advisoryTab === 'treatment'
                      ? 'text-agri-green border-b-2 border-agri-green'
                      : 'text-agri-text-muted hover:text-agri-text-primary'
                  }`}
                >
                  Treatment Advice
                </button>
                <button
                  type="button"
                  onClick={() => setAdvisoryTab('prevention')}
                  className={`pb-2 px-1 transition-colors relative ${
                    advisoryTab === 'prevention'
                      ? 'text-agri-green border-b-2 border-agri-green'
                      : 'text-agri-text-muted hover:text-agri-text-primary'
                  }`}
                >
                  Preventive Measures
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="min-h-[110px] text-xs text-agri-text-secondary leading-relaxed bg-[#FAFBF9] p-3.5 rounded-xl border border-agri-border">
                {advisoryTab === 'findings' && (
                  <div className="space-y-1.5">
                    <div className="font-bold text-agri-text-primary text-[11px] uppercase tracking-wider mb-1">
                      Observed Foliar Pathology
                    </div>
                    <p className="text-xs text-agri-text-secondary">
                      {activeDiagnosis.visibleEvidence || 'Diagnostic patterns identified within normal range.'}
                    </p>
                  </div>
                )}

                {advisoryTab === 'treatment' && (
                  <div className="space-y-2">
                    <div className="font-bold text-agri-text-primary text-[11px] uppercase tracking-wider mb-1">
                      Actionable Cultural Practices
                    </div>
                    {activeDiagnosis.actionableSteps && activeDiagnosis.actionableSteps.length > 0 ? (
                      <ul className="space-y-1.5">
                        {activeDiagnosis.actionableSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-agri-green shrink-0 mt-0.5" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-agri-text-muted">No urgent chemical or cultural intervention required.</p>
                    )}
                  </div>
                )}

                {advisoryTab === 'prevention' && (
                  <div className="space-y-2">
                    <div className="font-bold text-agri-text-primary text-[11px] uppercase tracking-wider mb-1">
                      Prophylactic Measures
                    </div>
                    {activeDiagnosis.preventativeMeasures && activeDiagnosis.preventativeMeasures.length > 0 ? (
                      <ul className="space-y-1.5">
                        {activeDiagnosis.preventativeMeasures.map((measure, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-xs">
                            <ShieldAlert className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <span>{measure}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-agri-text-muted">Maintain standard field hygiene and crop rotation.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Full Advisory CTA Action */}
              <button
                type="button"
                onClick={() => setShowDetailModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-agri-green hover:bg-agri-green-hover text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md"
              >
                <span>View Full Advisory</span>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION F: Dedicated Full Diagnosis Detail Modal / Sheet              */}
      {/* --------------------------------------------------------------------- */}
      {showDetailModal && activeDiagnosis && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-agri-border max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-agri-border">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-agri-green bg-agri-green-light px-2.5 py-0.5 rounded-full border border-agri-border">
                    {activeDiagnosis.cropDetected}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      activeDiagnosis.severity === 'high' || activeDiagnosis.severity === 'severe'
                        ? 'bg-red-100 text-red-800'
                        : activeDiagnosis.severity === 'low'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Severity: {activeDiagnosis.severity}
                  </span>
                  <span className="text-[10px] font-semibold text-agri-text-muted">
                    {new Date(activeDiagnosis.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-agri-text-primary mt-2">
                  {activeDiagnosis.primaryIssue}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-agri-bg hover:bg-agri-surface flex items-center justify-center text-agri-text-muted hover:text-agri-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Image & Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
              <div className="sm:col-span-5 rounded-2xl overflow-hidden border border-agri-border aspect-4/3 bg-black/5 shadow-xs">
                <img
                  src={resolveImageUrl(activeDiagnosis.imageUrl)}
                  alt={activeDiagnosis.primaryIssue}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="sm:col-span-7 space-y-2.5">
                <div className="p-3 rounded-xl bg-agri-bg border border-agri-border space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-agri-text-muted">Confidence Score:</span>
                    <span className="font-extrabold text-agri-green">{activeDiagnosis.confidencePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-agri-text-muted">Diagnostics Engine:</span>
                    <span className="font-semibold text-agri-text-primary">
                      {activeDiagnosis.dataStatus === 'live' ? '🟢 Live Gemini AI' : '🟠 Offline Agronomic Rules'}
                    </span>
                  </div>

                </div>

                {/* Visible Evidence */}
                <div>
                  <span className="text-[11px] font-bold text-agri-text-primary uppercase tracking-wider">
                    Visible Optical Evidence
                  </span>
                  <p className="text-xs text-agri-text-secondary mt-1 leading-relaxed">
                    {activeDiagnosis.visibleEvidence}
                  </p>
                </div>
              </div>
            </div>

            {/* Actionable cultural steps */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-agri-text-primary uppercase tracking-wide">
                Recommended Cultural & Agronomic Practices
              </span>
              <ul className="space-y-2">
                {activeDiagnosis.actionableSteps?.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs text-agri-text-primary">
                    <CheckCircle2 className="w-4 h-4 text-agri-green shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Preventive measures */}
            {activeDiagnosis.preventativeMeasures?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-agri-border">
                <span className="text-xs font-bold text-agri-text-primary uppercase tracking-wide">
                  Preventive & Sustainable Measures
                </span>
                <ul className="space-y-2">
                  {activeDiagnosis.preventativeMeasures.map((measure: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2.5 text-xs text-agri-text-primary">
                      <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Agronomic Follow-up Questions for Farmer */}
            {activeDiagnosis.followUpQuestions?.length > 0 && (
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
                <div className="flex items-center space-x-2 text-teal-900 font-bold text-xs">
                  <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Agronomic Follow-Up Questions (Check Your Field Parcel)</span>
                </div>
                <ul className="list-disc list-inside text-xs text-teal-800 space-y-1 pl-1">
                  {activeDiagnosis.followUpQuestions.map((q: string, idx: number) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Escalation to FPO Agri-Desk */}
            {activeDiagnosis.escalationNeeded && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-amber-900">
                    Escalated to FPO Agri-Desk for Expert Triage
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    {activeDiagnosis.escalationNotes || 'Case flagged for priority review by local KVK or FPO district agronomist.'}
                  </p>
                </div>
              </div>
            )}

            {/* Mandatory Non-Prescription Safety Disclaimer */}
            <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 text-[11px] text-stone-600 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-800">Safety & Statutory Compliance Advisory: </span>
                {activeDiagnosis.disclaimer ||
                  'AI preliminary diagnostic indicator based on image pattern analysis. Never treat as confirmed diagnosis. Consult Punjab Agricultural University (PAU), ICAR, or local Krishi Vigyan Kendra (KVK) extension officers before applying chemical sprays.'}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-agri-border">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 rounded-xl border border-agri-border hover:bg-agri-bg text-xs font-bold text-agri-text-primary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
