'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Layers,
  Plane,
  Upload,
  Camera,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import VirtualDroneMissionControl from '../../components/VirtualDroneMissionControl';

const FieldMapComponent = dynamic(() => import('../../components/FieldMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-2xl bg-stone-100 flex items-center justify-center border border-agri-border">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-3 border-agri-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="text-xs font-semibold text-agri-text-muted">Loading Leaflet Agricultural GIS...</div>
      </div>
    </div>
  ),
});

export default function FieldMapPage() {
  const { profile } = useApp();

  const [fields, setFields] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [showVirtualDroneStation, setShowVirtualDroneStation] = useState(false);

  // Orthomosaic Georeference Modal
  const [showGeoreferenceModal, setShowGeoreferenceModal] = useState(false);
  const [rasterTitle, setRasterTitle] = useState('New Drone Orthomosaic');
  const [rasterUrl, setRasterUrl] = useState('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80');
  const [boundSouth, setBoundSouth] = useState('30.8980');
  const [boundWest, setBoundWest] = useState('75.8530');
  const [boundNorth, setBoundNorth] = useState('30.9030');
  const [boundEast, setBoundEast] = useState('75.8590');
  const [georefSuccess, setGeorefSuccess] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadMapData();
    }
  }, [profile?.id]);

  const loadMapData = async () => {
    try {
      const [fieldsRes, devicesRes, diagRes] = await Promise.all([
        api.getFields(undefined, profile?.id),
        api.getDevices(profile?.id),
        api.getCropDiagnoses(undefined, profile?.id),
      ]);
      setFields(fieldsRes.fields || []);
      setDevices(devicesRes.devices || []);
      setDiagnoses(diagRes.diagnoses || []);
      if (fieldsRes.fields?.length > 0 && !selectedField) {
        setSelectedField(fieldsRes.fields[0]);
      }
    } catch (err) {
      console.error('Error loading GIS map data:', err);
    }
  };

  const handleSaveGeoreferencedOverlay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField) return;

    try {
      await api.saveFieldOverlay(selectedField.id, {
        title: rasterTitle,
        imageUrl: rasterUrl,
        layerType: 'rgb_orthomosaic',
        bounds: [
          [parseFloat(boundSouth), parseFloat(boundWest)],
          [parseFloat(boundNorth), parseFloat(boundEast)],
        ],
        resolutionCmPerPixel: 2.5,
        flightDate: new Date().toISOString().split('T')[0],
      });
      setGeorefSuccess(true);
      setTimeout(() => {
        setGeorefSuccess(false);
        setShowGeoreferenceModal(false);
      }, 2000);
    } catch (err) {
      console.error('Save overlay failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-agri-text-primary">
            Field GIS Mapping & Drone Orthomosaics
          </h2>
          <p className="text-xs md:text-sm text-agri-text-secondary">
            Inspect GeoJSON parcel boundaries, high-resolution raster overlays, sensor telemetry markers, and crop pathologies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowVirtualDroneStation((prev) => !prev)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-xs font-bold transition-all shrink-0 shadow-xs"
          >
            <Smartphone className="w-4 h-4 text-emerald-200" />
            <span>{showVirtualDroneStation ? 'Hide Drone Mission Station' : 'Virtual Drone (Phone Camera)'}</span>
          </button>

          <button
            onClick={() => setShowGeoreferenceModal(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border border-agri-border text-agri-text-primary text-xs font-bold hover:bg-agri-bg transition-colors shrink-0 shadow-2xs"
          >
            <Plane className="w-4 h-4 text-agri-green" />
            <span>Upload Drone Imagery</span>
          </button>
        </div>
      </div>

      {/* Virtual Drone Mission Station (Phone Camera Scanning & Spatial Risk Zoning) */}
      {showVirtualDroneStation && (
        <VirtualDroneMissionControl
          fieldName={selectedField?.name || 'Punjab Wheat Field 1'}
          cropName={selectedField?.cropName || 'Wheat (गेहूं)'}
          onClose={() => setShowVirtualDroneStation(false)}
        />
      )}

      {/* Interactive Map */}
      <FieldMapComponent
        fields={fields}
        devices={devices}
        diagnoses={diagnoses}
        selectedFieldId={selectedField?.id}
        onSelectField={(f) => setSelectedField(f)}
      />

      {/* Explanatory Mapping Notice */}
      <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-start space-x-3 text-xs text-teal-900">
        <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Geographic Coordinate Notice: </span>
          Normal mobile photographs are checked for EXIF metadata. To prevent geographic distortion, non-georeferenced images are required to pass through the bounding-box alignment workflow below before rendering as map layers.
        </div>
      </div>

      {/* Selected Field Details & GeoJSON Boundary Inspector */}
      {selectedField && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Field Summary Card */}
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-agri-border">
              <span className="text-xs font-bold text-agri-green bg-agri-green-light px-2.5 py-0.5 rounded">
                Selected Plot
              </span>
              <span className="text-xs text-agri-text-muted">Area: {selectedField.areaAcres} Acres</span>
            </div>

            <h3 className="font-bold text-base text-agri-text-primary">{selectedField.name}</h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-agri-bg rounded-lg">
                <span className="text-agri-text-muted block text-[10px]">Crop & Variety:</span>
                <span className="font-bold text-agri-text-primary">{selectedField.cropName}</span>
              </div>
              <div className="p-2.5 bg-agri-bg rounded-lg">
                <span className="text-agri-text-muted block text-[10px]">Current Growth Stage:</span>
                <span className="font-bold text-emerald-800">{selectedField.growthStage}</span>
              </div>
              <div className="p-2.5 bg-agri-bg rounded-lg">
                <span className="text-agri-text-muted block text-[10px]">Sowing Date:</span>
                <span className="font-bold text-agri-text-primary">{selectedField.sowingDate}</span>
              </div>
              <div className="p-2.5 bg-agri-bg rounded-lg">
                <span className="text-agri-text-muted block text-[10px]">Health Scoring:</span>
                <span className="font-bold text-agri-green">{selectedField.healthStatus || 'Optimal'}</span>
              </div>
            </div>
          </div>

          {/* GeoJSON Polygon Coordinates Inspector */}
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-agri-border">
              <span className="text-xs font-bold text-agri-text-primary">GeoJSON Boundary Polygon</span>
              <span className="text-[10px] text-agri-text-muted">Standard WGS84 [Longitude, Latitude]</span>
            </div>

            <pre className="p-3 bg-stone-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-40">
              {JSON.stringify(selectedField.boundaryGeoJson || {}, null, 2)}
            </pre>
            <div className="text-[10px] text-agri-text-muted">
              Field boundaries can be drafted with GPS RTK receivers or edited using GIS polygons.
            </div>
          </div>
        </div>
      )}

      {/* Georeferenced Drone Imagery Upload Modal */}
      {showGeoreferenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-agri-border shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-agri-border">
              <div>
                <h3 className="font-bold text-base text-agri-text-primary">Upload Drone Orthomosaic / Geotagged Raster</h3>
                <p className="text-xs text-agri-text-muted">Explicit Bounding Box Alignment Workflow</p>
              </div>
              <button onClick={() => setShowGeoreferenceModal(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGeoreferencedOverlay} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Orthomosaic Title</label>
                <input
                  type="text"
                  value={rasterTitle}
                  onChange={(e) => setRasterTitle(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-agri-bg"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Raster Image URL (or upload orthomosaic TIFF/PNG)</label>
                <input
                  type="text"
                  value={rasterUrl}
                  onChange={(e) => setRasterUrl(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-agri-bg"
                  required
                />
              </div>

              <div className="p-3 bg-agri-bg rounded-xl border space-y-2">
                <span className="font-bold text-agri-text-primary block text-[11px]">
                  Manual Georeferenced Coordinates Bounds (South, West, North, East)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-agri-text-muted">South Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={boundSouth}
                      onChange={(e) => setBoundSouth(e.target.value)}
                      className="w-full p-1.5 border rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-agri-text-muted">West Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={boundWest}
                      onChange={(e) => setBoundWest(e.target.value)}
                      className="w-full p-1.5 border rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-agri-text-muted">North Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={boundNorth}
                      onChange={(e) => setBoundNorth(e.target.value)}
                      className="w-full p-1.5 border rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-agri-text-muted">East Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={boundEast}
                      onChange={(e) => setBoundEast(e.target.value)}
                      className="w-full p-1.5 border rounded bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {georefSuccess && (
                <div className="text-emerald-700 font-bold text-center flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Orthomosaic overlay aligned and mapped to field!</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGeoreferenceModal(false)}
                  className="px-3.5 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-agri-green text-white font-bold rounded-xl hover:bg-agri-green-hover"
                >
                  Align & Save Overlay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
