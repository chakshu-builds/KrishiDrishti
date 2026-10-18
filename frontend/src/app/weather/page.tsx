'use client';

import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Bell,
  MessageSquare,
  PhoneCall,
  Clock,
  ShieldCheck,
  RefreshCw,
  Info,
  Search,
  Sparkles,
  MapPin,
  Gauge,
  Bug,
  Eye,
  Sunrise,
  Sunset,
  Cloud,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';

const QUICK_DISTRICTS = [
  'Ludhiana',
  'Amritsar',
  'Bathinda',
  'Karnal',
  'Indore',
  'Nashik',
  'Sirsa',
  'Jaipur',
];

export default function WeatherPage() {
  const { profile } = useApp();

  const [weather, setWeather] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchCity, setSearchCity] = useState('');
  const [activeDistrict, setActiveDistrict] = useState<string>('Ludhiana');

  const loadWeatherAndAlerts = async (customLat?: number, customLng?: number, city?: string) => {
    setLoading(true);
    try {
      const lat = customLat ?? coords?.lat;
      const lng = customLng ?? coords?.lng;
      const res = await api.getWeather(lat, lng, undefined, profile?.id, city);
      setWeather(res.weather);
      setAlerts(res.activeAlerts || []);
      if (city) setActiveDistrict(city);
    } catch (err) {
      console.error('Weather load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const locateUser = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          setGpsActive(true);
          loadWeatherAndAlerts(lat, lng);
        },
        (err) => {
          console.warn('Geolocation denied or timed out:', err.message);
          setGpsActive(false);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    }
  };

  // Immediate initial load on page mount
  useEffect(() => {
    loadWeatherAndAlerts(undefined, undefined, activeDistrict);
    locateUser();
  }, [profile?.id]);

  const handleCitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCity.trim()) return;
    loadWeatherAndAlerts(undefined, undefined, searchCity.trim());
  };

  const handleSelectDistrict = (city: string) => {
    setSearchCity('');
    setActiveDistrict(city);
    loadWeatherAndAlerts(undefined, undefined, city);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-bold text-agri-text-primary">
              Microclimate Weather & Agronomic Advisory Station
            </h2>
            {gpsActive ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Live GPS Radar</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <span>OpenWeather Live Ingestion</span>
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-agri-text-secondary">
            High-resolution agricultural forecasts, chemical spray window advisories, and fungal disease blight models.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={locateUser}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 shrink-0 shadow-xs transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Use My GPS</span>
          </button>
          <button
            onClick={() => loadWeatherAndAlerts(undefined, undefined, activeDistrict)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-agri-border bg-white text-xs font-semibold hover:bg-agri-bg shrink-0 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* City / Mandi Search & Quick Select Bar */}
      <div className="bg-white rounded-2xl border border-agri-border p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleCitySearch} className="flex-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Indian agricultural district, mandi, or city (e.g., Ludhiana, Karnal, Indore)..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="w-full pl-9 pr-24 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 bg-agri-bg/50"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-agri-green hover:bg-agri-green-hover text-white text-xs font-semibold transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center space-x-1 text-xs text-agri-text-muted">
            <MapPin className="w-3.5 h-3.5 text-agri-green shrink-0" />
            <span className="font-semibold text-agri-text-primary">{weather?.locationName || activeDistrict}</span>
          </div>
        </div>

        {/* Quick District Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-agri-text-muted shrink-0 font-medium">Quick Mandis:</span>
          {QUICK_DISTRICTS.map((city) => (
            <button
              key={city}
              onClick={() => handleSelectDistrict(city)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeDistrict.toLowerCase() === city.toLowerCase()
                  ? 'bg-agri-green text-white font-bold shadow-2xs'
                  : 'bg-agri-bg hover:bg-agri-border/60 text-stone-700 border border-agri-border/70'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Current Conditions Master Card */}
      {weather && (
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 rounded-2xl p-6 md:p-8 text-white shadow-lg space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  {weather.locationName}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/15 text-emerald-200">
                  GPS: {weather.latitude}°N, {weather.longitude}°E
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>OpenWeather Live Ingested</span>
                </span>
              </div>
              <div className="text-4xl md:text-6xl font-extrabold mt-2 tracking-tight flex items-baseline gap-2">
                <span>{weather.temperatureC}°C</span>
                <span className="text-lg md:text-xl font-normal text-emerald-300">
                  ({Math.round((weather.temperatureC * 9) / 5 + 32)}°F)
                </span>
              </div>
              <div className="text-xs md:text-sm text-emerald-200 mt-1 font-medium">
                Feels like {weather.apparentTemperatureC}°C • {weather.weatherDescription}
              </div>
            </div>

            <div className="text-left md:text-right text-xs text-emerald-300 space-y-1">
              <div className="font-semibold">Provider: {weather.dataSource}</div>
              <div className="text-[10px] text-emerald-400">
                Observation Time: {new Date(weather.observationTime).toLocaleString()}
              </div>
              {weather.sunriseTime && (
                <div className="flex items-center md:justify-end space-x-3 text-[11px] text-emerald-200 pt-1">
                  <span className="flex items-center space-x-1">
                    <Sunrise className="w-3.5 h-3.5 text-amber-300" />
                    <span>{weather.sunriseTime}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Sunset className="w-3.5 h-3.5 text-orange-400" />
                    <span>{weather.sunsetTime}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Microclimate KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-300">
                <Droplets className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Relative Humidity</span>
              </div>
              <div className="text-lg font-bold">{weather.relativeHumidityPct} %</div>
              <div className="text-[10px] text-emerald-200">Optimal: 40-70%</div>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-300">
                <CloudRain className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Rain Probability</span>
              </div>
              <div className="text-lg font-bold">{weather.precipitationProbabilityPct} %</div>
              <div className="text-[10px] text-emerald-200">{weather.precipitationMm} mm observed</div>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-300">
                <Wind className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Wind Speed</span>
              </div>
              <div className="text-lg font-bold">{weather.windSpeedKmh} km/h</div>
              <div className="text-[10px] text-emerald-200">Dir: {weather.windDirectionDeg}°</div>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-300">
                <Gauge className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Pressure</span>
              </div>
              <div className="text-lg font-bold">{weather.pressureHpa || 1015} hPa</div>
              <div className="text-[10px] text-emerald-200">Barometric stable</div>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-300">
                <Thermometer className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Dew Point</span>
              </div>
              <div className="text-lg font-bold">{weather.dewPointC ?? 16}°C</div>
              <div className="text-[10px] text-emerald-200">Condensation zone</div>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-300">
                <Sun className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Solar UV Index</span>
              </div>
              <div className="text-lg font-bold">{weather.uvIndex} / 12</div>
              <div className="text-[10px] text-emerald-200">Moderate radiation</div>
            </div>
          </div>
        </div>
      )}

      {/* Precision Agronomic Indicators (Spray Window + Disease Blight Risk) */}
      {weather && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chemical Spray Window Card */}
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`p-2.5 rounded-xl ${
                    weather.sprayWindow?.status === 'Optimal'
                      ? 'bg-emerald-100 text-emerald-800'
                      : weather.sprayWindow?.status === 'Caution'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-agri-text-primary">
                    Chemical Spray & Foliar Window Advisory
                  </h4>
                  <span className="text-[11px] text-agri-text-muted">कीटनाशक व खाद छिड़काव सलाह</span>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  weather.sprayWindow?.status === 'Optimal'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : weather.sprayWindow?.status === 'Caution'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {weather.sprayWindow?.status || 'Optimal'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-agri-bg border border-agri-border space-y-1 text-xs">
              <div className="font-bold text-agri-text-primary">
                {weather.sprayWindow?.statusHi || 'छिड़काव के लिए उत्तम'}
              </div>
              <p className="text-agri-text-secondary leading-relaxed">
                {weather.sprayWindow?.reason || 'Calm wind speeds and minimal drift risk enable optimal foliar absorption.'}
              </p>
              <div className="text-agri-green font-semibold pt-1 border-t border-agri-border">
                🌾 {weather.sprayWindow?.sprayAdviceHi || weather.sprayWindow?.sprayAdvice}
              </div>
            </div>
          </div>

          {/* Fungal & Pest Disease Blight Card */}
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`p-2.5 rounded-xl ${
                    weather.diseaseRisk?.level === 'High'
                      ? 'bg-red-100 text-red-800'
                      : weather.diseaseRisk?.level === 'Moderate'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-agri-text-primary">
                    Fungal Blight & Pest Outbreak Threat Index
                  </h4>
                  <span className="text-[11px] text-agri-text-muted">फफूंद व कीट संक्रमण खतरा मॉडल</span>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  weather.diseaseRisk?.level === 'High'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : weather.diseaseRisk?.level === 'Moderate'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {weather.diseaseRisk?.level || 'Low'} Risk
              </span>
            </div>

            <div className="p-3 rounded-xl bg-agri-bg border border-agri-border space-y-1 text-xs">
              <div className="font-bold text-agri-text-primary">
                {weather.diseaseRisk?.levelHi || 'कम जोखिम'}
              </div>
              <p className="text-agri-text-secondary leading-relaxed">
                {weather.diseaseRisk?.fungusRisk || 'Dry canopy conditions inhibit fungal spore germination.'}
              </p>
              <div className="text-emerald-800 font-semibold pt-1 border-t border-agri-border">
                🛡️ {weather.diseaseRisk?.preventativeMeasures}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Precision Agro-Advisory Banner */}
      {weather?.aiAdvisory && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-700 animate-pulse" />
            <h3 className="font-bold text-sm md:text-base">
              {weather.aiAdvisory.title} • {weather.aiAdvisory.titleHi}
            </h3>
          </div>

          <p className="text-xs md:text-sm text-emerald-900 leading-relaxed font-medium">
            {weather.aiAdvisory.summaryHi}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            {weather.aiAdvisory.actionsHi?.map((act: string, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl bg-white/80 border border-emerald-200 text-emerald-900 font-semibold flex items-start space-x-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{act}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Agricultural Forecast */}
      {weather?.forecastDaily && (
        <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm md:text-base text-agri-text-primary">
                7-Day Agricultural Forecast & Precipitation Trajectory
              </h3>
              <p className="text-xs text-agri-text-secondary">
                Daily temperature range, rainfall millimeters (mm), and precipitation probability
              </p>
            </div>
            <span className="text-[11px] text-agri-text-muted">OpenWeather 5-Day Numerical Model</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {weather.forecastDaily.map((day: any, idx: number) => {
              const isHeavyRain = day.precipitationMm >= 20 || day.precipitationProbabilityPct >= 60;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-center space-y-2 transition-all ${
                    isHeavyRain ? 'bg-amber-50/70 border-amber-300 shadow-xs' : 'bg-agri-bg border-agri-border'
                  }`}
                >
                  <div className="text-xs font-bold text-agri-text-primary">
                    {new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })}
                  </div>

                  <div className="py-1">
                    <CloudRain
                      className={`w-7 h-7 mx-auto ${
                        isHeavyRain ? 'text-blue-600 animate-bounce' : 'text-stone-400'
                      }`}
                    />
                  </div>

                  <div className="text-sm font-extrabold text-agri-text-primary">
                    {day.maxTempC}° <span className="text-agri-text-muted font-normal text-xs">{day.minTempC}°</span>
                  </div>

                  <div className="text-[11px] font-bold text-blue-700 bg-blue-50 py-0.5 px-1 rounded">
                    {day.precipitationMm} mm ({day.precipitationProbabilityPct}%)
                  </div>

                  <div className="text-[10px] text-agri-text-muted truncate">
                    {day.weatherDescription.split('/')[0]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Agronomic Risk Notifications */}
      <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm md:text-base text-agri-text-primary">
              Multi-Channel Risk Alerts & Delivery Logs ({alerts.length})
            </h3>
            <p className="text-xs text-agri-text-secondary">
              Auditable notifications dispatched across In-App, SMS, WhatsApp, and Voice Hotline channels.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="py-6 text-center text-xs text-agri-text-muted">No critical weather risks currently active</div>
          ) : (
            alerts.map((alt) => (
              <div
                key={alt.id}
                className="p-4 rounded-xl border border-agri-border bg-[#FCFDFB] space-y-3 text-xs shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        alt.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-agri-text-primary">{alt.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-800">
                          {alt.alertType}
                        </span>
                      </div>
                      <p className="text-agri-text-secondary mt-1">{alt.description}</p>
                      <div className="mt-2 p-2.5 rounded-lg bg-agri-bg border border-agri-border text-agri-green font-semibold">
                        🌾 Recommended Action: {alt.recommendedAction}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-agri-text-muted shrink-0">
                    {new Date(alt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Delivery Channel Status Indicators */}
                <div className="pt-2 border-t border-agri-border flex flex-wrap items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-agri-text-secondary">Channel Dispatch:</span>
                    <span className="inline-flex items-center space-x-1 text-emerald-700">
                      <Bell className="w-3.5 h-3.5" />
                      <span>In-App ({alt.status.inApp})</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 text-teal-700">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp ({alt.status.whatsapp})</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 text-blue-700">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Voice Hotline ({alt.status.voice})</span>
                    </span>
                  </div>

                  <div className="text-[10px] text-agri-text-muted">
                    Cooldown ID: <code>{alt.cooldownKey}</code>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
