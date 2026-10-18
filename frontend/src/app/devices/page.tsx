'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Wifi,
  Battery,
  Droplets,
  Thermometer,
  Camera,
  Plus,
  RefreshCw,
  Play,
  Pause,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Power,
  Zap,
  Activity,
  Wind,
  Sun,
  Flame,
  Waves,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';

export default function DevicesPage() {
  const { profile } = useApp();

  const [devices, setDevices] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticking, setTicking] = useState(false);

  // Auto-simulation ticker state
  const [autoTickActive, setAutoTickActive] = useState<boolean>(true);
  const autoTickRef = useRef<NodeJS.Timeout | null>(null);

  // Pump actuator state
  const [pumpActive, setPumpActive] = useState<boolean>(false);
  const [pumpLoading, setPumpLoading] = useState<boolean>(false);
  const [pumpFlowRate, setPumpFlowRate] = useState<number>(0);
  const [pumpWattage, setPumpWattage] = useState<number>(0.05);

  // Active scenario
  const [currentScenario, setCurrentScenario] = useState<string>('optimal');

  // Register device form modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('soil_sensor');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [isSimulated, setIsSimulated] = useState(true);

  const loadIoTData = async () => {
    try {
      const [devRes, telRes, fieldsRes, pumpRes] = await Promise.all([
        api.getDevices(profile?.id),
        api.getTelemetry(undefined, undefined, 20),
        api.getFields(undefined, profile?.id),
        api.getPumpStatus().catch(() => ({ pumpActive: false, flowRateLpm: 0, wattageKw: 0.05 })),
      ]);
      setDevices(devRes.devices || []);
      setTelemetry(telRes.readings || []);
      setFields(fieldsRes.fields || []);
      if (fieldsRes.fields?.length > 0 && !selectedFieldId) {
        setSelectedFieldId(fieldsRes.fields[0].id);
      }
      setPumpActive(pumpRes.pumpActive);
      setPumpFlowRate(pumpRes.flowRateLpm);
      setPumpWattage(pumpRes.wattageKw);
    } catch (err) {
      console.error('Error loading IoT data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIoTData();
  }, [profile?.id]);

  // Live Auto-Simulation Ticker (ticks every 3.5 seconds)
  useEffect(() => {
    if (autoTickActive) {
      autoTickRef.current = setInterval(async () => {
        try {
          const res = await api.triggerSimulatorTick();
          if (res.readings && res.readings.length > 0) {
            setTelemetry((prev) => [...res.readings, ...prev.slice(0, 30)]);
            if (res.pumpActive !== undefined) setPumpActive(res.pumpActive);
          }
        } catch (_) {}
      }, 3500);
    } else {
      if (autoTickRef.current) clearInterval(autoTickRef.current);
    }

    return () => {
      if (autoTickRef.current) clearInterval(autoTickRef.current);
    };
  }, [autoTickActive]);

  const handleManualTick = async () => {
    setTicking(true);
    try {
      const res = await api.triggerSimulatorTick();
      if (res.readings && res.readings.length > 0) {
        setTelemetry((prev) => [...res.readings, ...prev.slice(0, 30)]);
        if (res.pumpActive !== undefined) setPumpActive(res.pumpActive);
      }
    } catch (err) {
      console.error('Manual tick error:', err);
    } finally {
      setTicking(false);
    }
  };

  const handleTogglePump = async () => {
    setPumpLoading(true);
    try {
      const res = await api.togglePump(!pumpActive);
      setPumpActive(res.pumpActive);
      setPumpFlowRate(res.flowRateLpm);
      setPumpWattage(res.wattageKw);
      // Immediately trigger a simulator tick to show instant moisture reaction
      const tickRes = await api.triggerSimulatorTick();
      if (tickRes.readings && tickRes.readings.length > 0) {
        setTelemetry((prev) => [...tickRes.readings, ...prev.slice(0, 30)]);
      }
    } catch (err) {
      console.error('Toggle pump error:', err);
    } finally {
      setPumpLoading(false);
    }
  };

  const handleApplyScenario = async (scenario: 'drought' | 'optimal' | 'waterlogging' | 'heatwave') => {
    setCurrentScenario(scenario);
    try {
      const res = await api.injectSimulatorScenario(scenario);
      if (res.readings && res.readings.length > 0) {
        setTelemetry((prev) => [...res.readings, ...prev.slice(0, 30)]);
        setPumpActive(res.pumpActive);
      }
    } catch (err) {
      console.error('Scenario error:', err);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    try {
      await api.registerDevice({
        deviceCode: newCode,
        deviceName: newName,
        deviceType: newType,
        farmerId: profile?.id || 'usr-farmer-001',
        fieldId: selectedFieldId,
        isSimulated,
      });
      setShowRegisterModal(false);
      setNewCode('');
      setNewName('');
      loadIoTData();
    } catch (err: any) {
      alert(`Registration error: ${err.message}`);
    }
  };

  // Find latest readings that contain actual sensor measurements
  const latestSoilReading = telemetry.find((t) => t.soilMoisturePct !== undefined) || {
    soilMoisturePct: 42.5,
    soilTemperatureC: 22.8,
  };
  const latestAmbientReading = telemetry.find((t) => t.airTemperatureC !== undefined) || {
    airTemperatureC: 26.5,
    humidityPct: 54,
  };
  const latestNpkReading = telemetry.find((t) => t.nitrogenMgKg !== undefined) || {
    nitrogenMgKg: 142,
    phosphorusMgKg: 35,
    potassiumMgKg: 194,
  };

  const moisture = Number(latestSoilReading.soilMoisturePct ?? 42.5);
  const soilTemp = Number(latestSoilReading.soilTemperatureC ?? 22.8);
  const airTemp = Number(latestAmbientReading.airTemperatureC ?? 26.5);
  const humidity = Number(latestAmbientReading.humidityPct ?? 54);
  const nitrogen = Number(latestNpkReading.nitrogenMgKg ?? 142);
  const phosphorus = Number(latestNpkReading.phosphorusMgKg ?? 35);
  const potassium = Number(latestNpkReading.potassiumMgKg ?? 194);

  const isDrought = moisture < 20;
  const isWaterlogged = moisture > 65;
  const isOptimal = moisture >= 30 && moisture <= 55;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-bold text-agri-text-primary">
              IoT Sensor Simulation & Smart Irrigation Cockpit
            </h2>
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                autoTickActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-stone-100 text-stone-700 border border-stone-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoTickActive ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
                }`}
              />
              <span>{autoTickActive ? 'Live Ticker Running (Every 3.5s)' : 'Ticker Paused'}</span>
            </span>
          </div>
          <p className="text-xs md:text-sm text-agri-text-secondary">
            Interactive telemetry simulator with live soil hydration modeling, smart pump actuator switch, and scenario stress injection.
          </p>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoTickActive(!autoTickActive)}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              autoTickActive
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300'
            }`}
          >
            {autoTickActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoTickActive ? 'Pause Auto-Ticker' : 'Resume Auto-Ticker'}</span>
          </button>

          <button
            onClick={handleManualTick}
            disabled={ticking}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition-colors shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${ticking ? 'animate-spin' : ''}`} />
            <span>Fast Tick</span>
          </button>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-agri-green text-white text-xs font-bold hover:bg-agri-green-hover transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision Node</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SMART IRRIGATION PUMP CONTROLLER ACTUATOR                  */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`rounded-2xl border p-6 transition-all duration-300 shadow-md ${
          pumpActive
            ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 border-emerald-500 text-white'
            : 'bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border-stone-700 text-stone-100'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  pumpActive ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                IoT Actuator Relay • Channel 01 (Submersible Solar Pump)
              </span>
            </div>

            <h3 className="text-xl md:text-2xl font-black tracking-tight">
              {pumpActive ? '💧 Irrigation Pump ACTIVE • Saturating Field 101' : '⚪ Irrigation Pump STANDBY • Idle'}
            </h3>

            <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
              {pumpActive
                ? 'Actuator valve is open. Pumping 350 L/min of canal water into root-zone sub-surface drip lines. Soil moisture is actively climbing ~5% per ticker cycle.'
                : 'Actuator valve is closed. Natural evapotranspiration and gravity drainage in progress. Click the toggle to start saturating your field.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <div className="flex items-center space-x-1.5">
                <Waves className="w-4 h-4 text-emerald-400" />
                <span className="text-stone-300">Flow Rate:</span>
                <span className="font-bold font-mono">{pumpFlowRate} L/min</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-stone-300">Solar Power Draw:</span>
                <span className="font-bold font-mono">{pumpWattage} kW</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-stone-300">Relay Safety:</span>
                <span className="font-bold text-emerald-400">Normal (No Surge)</span>
              </div>
            </div>
          </div>

          {/* Big Interactive Pump Toggle Switch */}
          <div className="shrink-0 flex flex-col items-center sm:items-end">
            <button
              onClick={handleTogglePump}
              disabled={pumpLoading}
              className={`px-6 py-3.5 rounded-2xl font-black text-sm flex items-center space-x-3 transition-all transform active:scale-95 shadow-lg ${
                pumpActive
                  ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-400/30'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-400/30'
              }`}
            >
              <Power className={`w-5 h-5 ${pumpLoading ? 'animate-spin' : ''}`} />
              <span>{pumpActive ? 'TURN PUMP OFF (बंद करें)' : 'TURN PUMP ON (चालू करें)'}</span>
            </button>
            <span className="text-[10px] text-stone-400 mt-1.5">
              Instant hardware telemetry feedback loop
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REAL-TIME SENSOR TELEMETRY METERS & GAUGES                 */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Soil Moisture Dial */}
        <div
          className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
            isDrought
              ? 'border-red-300 bg-red-50/20'
              : isWaterlogged
              ? 'border-blue-300 bg-blue-50/20'
              : 'border-agri-border'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div
                className={`p-2 rounded-xl ${
                  isDrought
                    ? 'bg-red-100 text-red-700'
                    : isWaterlogged
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-agri-text-primary">Soil Moisture</span>
                <span className="text-[10px] text-agri-text-muted block">Root Depth 15-30 cm</span>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isDrought
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : isWaterlogged
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isDrought ? 'Drought Stress' : isWaterlogged ? 'Waterlogged' : 'Optimal'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-3xl md:text-4xl font-black text-agri-text-primary tracking-tight">
              {moisture.toFixed(1)}%
            </div>
            <span className="text-xs font-semibold text-agri-text-muted">Target: 30 - 50%</span>
          </div>

          {/* Visual Hydration Meter Bar */}
          <div className="space-y-1">
            <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden flex">
              <div
                style={{ width: `${Math.min(100, Math.max(5, moisture))}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  isDrought ? 'bg-red-500' : isWaterlogged ? 'bg-blue-600' : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="flex justify-between text-[9px] text-agri-text-muted">
              <span>Wilting Point (&lt;18%)</span>
              <span>Field Capacity (45%)</span>
              <span>Saturation (&gt;60%)</span>
            </div>
          </div>
        </div>

        {/* Soil Temperature Dial */}
        <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-agri-text-primary">Soil Temperature</span>
                <span className="text-[10px] text-agri-text-muted block">Calibrated DS18B20</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Good Growth
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-3xl md:text-4xl font-black text-agri-text-primary tracking-tight">
              {soilTemp.toFixed(1)}°C
            </div>
            <span className="text-xs font-semibold text-agri-text-muted">Optimal: 18 - 25°C</span>
          </div>

          <div className="p-2 rounded-lg bg-agri-bg border border-agri-border text-[11px] text-agri-text-secondary flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Favorable microbial nitrogen fixation rate</span>
          </div>
        </div>

        {/* Ambient Air Temp & Humidity */}
        <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-agri-text-primary">Microclimate Air</span>
                <span className="text-[10px] text-agri-text-muted block">BME280 Ambient Sensor</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              Canopy Level
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-3xl md:text-4xl font-black text-agri-text-primary tracking-tight">
              {airTemp.toFixed(1)}°C
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-teal-700 block">
                {Math.round(humidity)}% RH
              </span>
              <span className="text-[10px] text-agri-text-muted">Relative Humidity</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-agri-bg border border-agri-border text-[11px] text-agri-text-secondary flex items-center space-x-1.5">
            <Wind className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Evaporative cooling active in canopy</span>
          </div>
        </div>

        {/* Macronutrient NPK Health Dial */}
        <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-agri-text-primary">NPK Macronutrients</span>
                <span className="text-[10px] text-agri-text-muted block">RS485 Modbus Probe</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Fertile
            </span>
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-700">Nitrogen (N):</span>
              <span className="font-mono font-bold text-emerald-700">
                {nitrogen} mg/kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-700">Phosphorus (P):</span>
              <span className="font-mono font-bold text-emerald-700">
                {phosphorus} mg/kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-700">Potassium (K):</span>
              <span className="font-mono font-bold text-emerald-700">
                {potassium} mg/kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. ONE-CLICK AGRONOMIC SCENARIO INJECTION                      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm md:text-base text-agri-text-primary">
            Quick Agronomic Scenario Injector (त्वरित कृषि परिस्थिति परीक्षण)
          </h3>
          <p className="text-xs text-agri-text-secondary">
            Simulate extreme climate and soil variations instantly to observe live trigger alerts and actuator reactions.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => handleApplyScenario('drought')}
            className={`p-3.5 rounded-xl border text-left space-y-1 transition-all ${
              currentScenario === 'drought'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-300 shadow-xs'
                : 'bg-agri-bg border-agri-border hover:bg-red-50/50'
            }`}
          >
            <div className="flex items-center space-x-1.5 font-bold text-red-700">
              <Flame className="w-4 h-4" />
              <span>Simulate Drought</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-tight">
              Drops moisture to 14.5%. Triggers critical root stress alert.
            </p>
          </button>

          <button
            onClick={() => handleApplyScenario('optimal')}
            className={`p-3.5 rounded-xl border text-left space-y-1 transition-all ${
              currentScenario === 'optimal'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300 shadow-xs'
                : 'bg-agri-bg border-agri-border hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Optimal Baseline</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-tight">
              Sets ideal moisture (42%), 23°C soil, and balanced NPK nutrition.
            </p>
          </button>

          <button
            onClick={() => handleApplyScenario('waterlogging')}
            className={`p-3.5 rounded-xl border text-left space-y-1 transition-all ${
              currentScenario === 'waterlogging'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300 shadow-xs'
                : 'bg-agri-bg border-agri-border hover:bg-blue-50/50'
            }`}
          >
            <div className="flex items-center space-x-1.5 font-bold text-blue-700">
              <Waves className="w-4 h-4" />
              <span>Waterlogging Rain</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-tight">
              Moisture spikes to 72%. Triggers drainage alert.
            </p>
          </button>

          <button
            onClick={() => handleApplyScenario('heatwave')}
            className={`p-3.5 rounded-xl border text-left space-y-1 transition-all ${
              currentScenario === 'heatwave'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300 shadow-xs'
                : 'bg-agri-bg border-agri-border hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center space-x-1.5 font-bold text-amber-800">
              <Sun className="w-4 h-4" />
              <span>Heatwave Stress</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-tight">
              Air temperature spikes to 42.5°C with dry 22% humidity.
            </p>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. HISTORICAL TELEMETRY STREAM & CHART                        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-agri-border">
          <div>
            <h3 className="font-bold text-sm md:text-base text-agri-text-primary">
              Live Soil Moisture Trajectory (Real-Time Ingestion Stream)
            </h3>
            <p className="text-xs text-agri-text-secondary">
              Consecutive readings updating in real time as the smart pump or solar dry-down progresses
            </p>
          </div>
          <span className="text-[10px] text-agri-text-muted font-mono">
            {telemetry.length} readings recorded in database
          </span>
        </div>

        {/* Telemetry Visual Stream Bars */}
        <div className="space-y-2">
          <div className="h-44 flex items-end justify-between gap-1.5 border-b border-agri-border px-2">
            {telemetry.slice(0, 18).reverse().map((t, idx) => {
              const m = t.soilMoisturePct || 35;
              const heightPct = Math.min(100, Math.max(15, (m / 70) * 100));
              const isLow = m < 20;
              const isHigh = m > 60;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span
                    className={`text-[9px] font-bold group-hover:scale-110 transition-transform ${
                      isLow ? 'text-red-600' : isHigh ? 'text-blue-700' : 'text-emerald-700'
                    }`}
                  >
                    {m.toFixed(0)}%
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[28px] rounded-t-md shadow-2xs transition-all duration-300 ${
                      isLow
                        ? 'bg-gradient-to-t from-red-600 to-amber-500'
                        : isHigh
                        ? 'bg-gradient-to-t from-blue-700 to-teal-400'
                        : 'bg-gradient-to-t from-emerald-600 to-teal-400'
                    }`}
                  />
                  <span className="text-[8px] text-agri-text-muted truncate max-w-[32px]">
                    {new Date(t.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Telemetry Data Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-agri-border text-agri-text-muted uppercase text-[10px]">
                <th className="py-2">Recorded At</th>
                <th className="py-2">Device ID</th>
                <th className="py-2">Soil Moisture</th>
                <th className="py-2">Soil Temp</th>
                <th className="py-2">Air Temp</th>
                <th className="py-2">Humidity</th>
                <th className="py-2">NPK (N-P-K)</th>
                <th className="py-2 text-right">Battery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-agri-border font-medium">
              {telemetry.slice(0, 8).map((r) => (
                <tr key={r.id} className="hover:bg-agri-bg/50">
                  <td className="py-2 font-mono text-agri-text-primary text-[11px]">
                    {new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2 font-mono text-[10px] text-agri-text-secondary">{r.deviceId}</td>
                  <td className="py-2">
                    <span
                      className={`font-bold ${
                        (r.soilMoisturePct || 0) < 20
                          ? 'text-red-600'
                          : (r.soilMoisturePct || 0) > 60
                          ? 'text-blue-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {r.soilMoisturePct !== undefined ? `${r.soilMoisturePct}%` : 'N/A (Camera)'}
                    </span>
                  </td>
                  <td className="py-2">{r.soilTemperatureC ? `${r.soilTemperatureC}°C` : '-'}</td>
                  <td className="py-2 font-bold">{r.airTemperatureC ? `${r.airTemperatureC}°C` : '-'}</td>
                  <td className="py-2">{r.humidityPct ? `${r.humidityPct}%` : '-'}</td>
                  <td className="py-2 font-mono text-[11px] text-stone-600">
                    {r.nitrogenMgKg ? `${r.nitrogenMgKg}-${r.phosphorusMgKg}-${r.potassiumMgKg}` : '-'}
                  </td>
                  <td className="py-2 text-right font-mono text-[11px]">
                    {Math.round(r.batteryPct || 90)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. PROVISIONED PHYSICAL / VIRTUAL HARDWARE NODES              */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-agri-border">
          <div>
            <h3 className="font-bold text-sm md:text-base text-agri-text-primary">
              Registered Hardware Nodes & Edge Sensors ({devices.length})
            </h3>
            <p className="text-xs text-agri-text-secondary">
              ESP32 microcontrollers, camera traps, and SDI-12 soil sensors deployed in your fields
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {devices.map((dev) => (
            <div key={dev.id} className="p-4 rounded-xl border border-agri-border bg-[#FCFDFB] shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-agri-bg border border-agri-border text-agri-green">
                    {dev.deviceType === 'esp32_cam' ? <Camera className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-agri-text-primary">{dev.deviceName}</div>
                    <div className="font-mono text-[10px] text-agri-text-muted">{dev.deviceCode}</div>
                  </div>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    dev.isSimulated ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {dev.isSimulated ? 'Simulated' : 'Physical'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-agri-border">
                <div>
                  <span className="text-agri-text-muted block text-[10px]">Battery:</span>
                  <span className="font-bold text-agri-text-primary flex items-center space-x-1">
                    <Battery className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{Math.round(dev.batteryPct)}%</span>
                  </span>
                </div>
                <div>
                  <span className="text-agri-text-muted block text-[10px]">Status:</span>
                  <span className="font-bold text-emerald-700 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Online</span>
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-agri-text-muted flex items-center justify-between pt-1 border-t border-agri-border">
                <span>Firmware: {dev.firmwareVersion}</span>
                <span>Last: {dev.lastHeartbeat ? new Date(dev.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Register Device Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-agri-text-primary">Provision New Hardware Node</h3>
            <form onSubmit={handleRegisterDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">Device Name</label>
                <input
                  type="text"
                  placeholder="e.g. South Basin Soil Station"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">Serial Code</label>
                <input
                  type="text"
                  placeholder="e.g. ESP32-SOIL-LDH-03"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">Hardware Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 bg-white"
                >
                  <option value="soil_sensor">Soil Moisture & NPK Station</option>
                  <option value="esp32_cam">ESP32-CAM Field Camera</option>
                  <option value="microclimate_station">Microclimate Weather Node</option>
                  <option value="irrigation_node">Smart Irrigation Valve Actuator</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isSim"
                  checked={isSimulated}
                  onChange={(e) => setIsSimulated(e.target.checked)}
                  className="rounded text-agri-green focus:ring-agri-green"
                />
                <label htmlFor="isSim" className="text-xs text-agri-text-primary font-medium">
                  Enable simulated data generation (Development mode)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl border border-agri-border text-xs font-bold hover:bg-agri-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-agri-green hover:bg-agri-green-hover text-white text-xs font-bold"
                >
                  Provision Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
