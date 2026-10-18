'use client';

import React, { useEffect, useState } from 'react';
import {
  Layers,
  MapPin,
  Camera,
  Cpu,
  AlertTriangle,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Plane,
} from 'lucide-react';
import { api } from '../lib/api';

// Dynamic Leaflet loader to prevent SSR window reference errors
let L: any = null;

interface FieldMapProps {
  fields: any[];
  devices: any[];
  diagnoses: any[];
  selectedFieldId?: string;
  onSelectField: (field: any) => void;
}

export default function FieldMapComponent({
  fields,
  devices,
  diagnoses,
  selectedFieldId,
  onSelectField,
}: FieldMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [overlays, setOverlays] = useState<any[]>([]);
  const [activeOverlayLayer, setActiveOverlayLayer] = useState<any>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const [showSensors, setShowSensors] = useState(true);
  const [showIssues, setShowIssues] = useState(true);
  const [selectedOverlayType, setSelectedOverlayType] = useState<'rgb' | 'ndvi' | 'none'>('rgb');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        L = leaflet.default;
        // Fix Leaflet marker icons in React
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setMapLoaded(true);
      });
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !L || mapInstance) return;

    const container = document.getElementById('agri-leaflet-map');
    if (!container) return;

    // Center on Ludhiana, Punjab (30.901, 75.8573)
    const map = L.map('agri-leaflet-map', {
      center: [30.901, 75.8573],
      zoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // High quality satellite and terrain tile provider (Esri World Imagery + OpenStreetMap)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
      }
    ).addTo(map);

    setMapInstance(map);

    return () => {
      map.remove();
    };
  }, [mapLoaded]);

  // Load Overlays and render field polygons & markers
  useEffect(() => {
    if (!mapInstance || !L) return;

    // Clear existing dynamic layers
    const layerGroup = L.layerGroup().addTo(mapInstance);

    // 1. Render Field Polygons
    fields.forEach((f) => {
      if (f.boundaryGeoJson && f.boundaryGeoJson.coordinates) {
        // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
        const latLngs = f.boundaryGeoJson.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
        const isSelected = f.id === selectedFieldId;

        const polygon = L.polygon(latLngs, {
          color: isSelected ? '#D9822B' : '#1B4D3E',
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#D9822B' : '#1B4D3E',
          fillOpacity: 0.25,
        }).addTo(layerGroup);

        polygon.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <b style="color: #1B4D3E;">${f.name}</b><br/>
            Crop: ${f.cropName}<br/>
            Stage: ${f.growthStage}<br/>
            Area: ${f.areaAcres} Acres
          </div>
        `);

        polygon.on('click', () => {
          onSelectField(f);
        });
      }
    });

    // 2. Render Drone Overlays (RGB Orthomosaic or NDVI)
    if (selectedOverlayType !== 'none') {
      const droneBounds: [[number, number], [number, number]] = [
        [30.898, 75.853],
        [30.903, 75.859],
      ];
      const imageUrl =
        selectedOverlayType === 'ndvi'
          ? 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80'
          : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';

      const overlay = L.imageOverlay(imageUrl, droneBounds, {
        opacity: overlayOpacity,
        interactive: true,
      }).addTo(layerGroup);

      overlay.bindPopup(`
        <div style="font-size: 11px;">
          <b>${selectedOverlayType === 'ndvi' ? 'NDVI Vegetation Vigour Index' : 'Post-Irrigation Orthomosaic RGB'}</b><br/>
          Resolution: 2.8 cm/pixel<br/>
          Acquisition: 12 Oct 2026 (DJI Mavic 3M)
        </div>
      `);
    }

    // 3. Render IoT Sensor Node Markers
    if (showSensors) {
      devices.forEach((dev) => {
        // Sensor coordinate near field center
        const lat = 30.9015 + (Math.random() * 0.002 - 0.001);
        const lng = 75.8565 + (Math.random() * 0.002 - 0.001);

        const sensorIcon = L.divIcon({
          className: 'custom-sensor-icon',
          html: `<div style="background-color: #0288D1; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">📡</div>`,
          iconSize: [28, 28],
        });

        L.marker([lat, lng], { icon: sensorIcon })
          .addTo(layerGroup)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px;">
              <b>Sensor Node: ${dev.deviceName}</b><br/>
              Serial: <code>${dev.deviceCode}</code><br/>
              Status: <span style="color: green; font-weight: bold;">Active (94% Battery)</span><br/>
              Soil Moisture: <b>36.2%</b> | Temp: <b>23.1°C</b>
            </div>
          `);
      });
    }

    // 4. Render Crop Issues / Pathology Pins
    if (showIssues) {
      diagnoses.forEach((diag) => {
        const lat = diag.coordinates?.lat || 30.902;
        const lng = diag.coordinates?.lng || 75.856;

        const alertIcon = L.divIcon({
          className: 'custom-alert-icon',
          html: `<div style="background-color: #C62828; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">⚠️</div>`,
          iconSize: [26, 26],
        });

        L.marker([lat, lng], { icon: alertIcon })
          .addTo(layerGroup)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px;">
              <b style="color: #C62828;">Crop Issue: ${diag.primaryIssue}</b><br/>
              Crop: ${diag.cropDetected}<br/>
              Severity: <b>${diag.severity.toUpperCase()}</b> (${diag.confidencePct}% Confidence)<br/>
              Action: Check leaf pustules.
            </div>
          `);
      });
    }

    return () => {
      mapInstance.removeLayer(layerGroup);
    };
  }, [mapInstance, fields, devices, diagnoses, selectedFieldId, selectedOverlayType, overlayOpacity, showSensors, showIssues]);

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-agri-border shadow-md">
      {/* Map Container */}
      <div id="agri-leaflet-map" className="w-full h-full" />

      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-agri-border shadow-md space-y-2.5 max-w-xs text-xs">
        <div className="font-bold text-agri-text-primary flex items-center justify-between border-b pb-1.5">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-agri-green" />
            <span>GIS Map Overlays & Drone</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
            Esri Satellite
          </span>
        </div>

        {/* Drone Layer Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-agri-text-muted uppercase">Drone Raster Overlays:</label>
          <div className="flex space-x-1">
            <button
              onClick={() => setSelectedOverlayType('none')}
              className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold border ${
                selectedOverlayType === 'none' ? 'bg-agri-green text-white' : 'bg-agri-bg text-stone-700'
              }`}
            >
              Base Satellite
            </button>
            <button
              onClick={() => setSelectedOverlayType('rgb')}
              className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold border ${
                selectedOverlayType === 'rgb' ? 'bg-agri-green text-white' : 'bg-agri-bg text-stone-700'
              }`}
            >
              Drone RGB
            </button>
            <button
              onClick={() => setSelectedOverlayType('ndvi')}
              className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold border ${
                selectedOverlayType === 'ndvi' ? 'bg-agri-green text-white' : 'bg-agri-bg text-stone-700'
              }`}
            >
              NDVI Vigour
            </button>
          </div>
        </div>

        {/* Opacity Slider */}
        {selectedOverlayType !== 'none' && (
          <div className="space-y-1 pt-1 border-t border-agri-border/60">
            <div className="flex justify-between text-[10px] font-semibold text-agri-text-secondary">
              <span>Raster Opacity</span>
              <span>{Math.round(overlayOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-agri-green"
            />
          </div>
        )}

        {/* Marker Toggles */}
        <div className="pt-1.5 border-t border-agri-border/60 flex items-center justify-between text-[11px]">
          <button
            onClick={() => setShowSensors(!showSensors)}
            className={`flex items-center space-x-1 px-2 py-1 rounded font-medium ${
              showSensors ? 'text-blue-700 bg-blue-50' : 'text-stone-400'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>Sensors ({devices.length})</span>
          </button>

          <button
            onClick={() => setShowIssues(!showIssues)}
            className={`flex items-center space-x-1 px-2 py-1 rounded font-medium ${
              showIssues ? 'text-red-700 bg-red-50' : 'text-stone-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Pest Issues ({diagnoses.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
