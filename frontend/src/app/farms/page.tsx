'use client';

import React, { useState, useEffect } from 'react';
import {
  Tractor,
  Plus,
  MapPin,
  Calendar,
  Layers,
  Sprout,
  Trash2,
  Edit2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Droplet,
  Globe,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export default function FarmsAndFieldsPage() {
  const { t, profile } = useApp();

  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isAddFarmOpen, setIsAddFarmOpen] = useState(false);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [selectedFarmForField, setSelectedFarmForField] = useState<string>('');
  const [editingFarm, setEditingFarm] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'farm' | 'field'; id: string; name: string } | null>(null);

  // Farm Form State
  const [farmForm, setFarmForm] = useState({
    name: '',
    state: 'Punjab',
    district: 'Ludhiana',
    subDistrict: 'Jagraon',
    village: 'Sidhwan Bet',
    pincode: '142024',
    totalAreaAcres: 5.0,
    centerLat: 30.901,
    centerLng: 75.8573,
    irrigationSource: 'Solar Tube Well & Canal Siphon',
    soilType: 'Fertile Alluvial Loam',
  });

  // Field Form State
  const [fieldForm, setFieldForm] = useState({
    farmId: '',
    name: '',
    cropName: 'Wheat (गेहूं / ਕਣਕ)',
    cropVariety: 'HD-3226 (Pusa Yashasvi)',
    sowingDate: '2026-11-10',
    expectedHarvestDate: '2026-04-15',
    growthStage: 'Grain Filling',
    areaAcres: 3.5,
    healthStatus: 'Good',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [farmsRes, fieldsRes] = await Promise.all([
        api.getFarms(profile?.id),
        api.getFields(undefined, profile?.id),
      ]);
      setFarms(farmsRes.farms || []);
      setFields(fieldsRes.fields || []);
    } catch (err: any) {
      console.error('[FarmsPage] Error fetching data:', err);
      setError(err.message || 'Failed to load farms and fields');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  // Handle Create Farm
  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmForm.name.trim() || !farmForm.district.trim()) {
      setError('Farm name and district are required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.createFarm({
        farmerId: profile?.id || 'usr-farmer-001',
        name: farmForm.name,
        state: farmForm.state,
        district: farmForm.district,
        subDistrict: farmForm.subDistrict,
        village: farmForm.village,
        pincode: farmForm.pincode,
        totalAreaAcres: Number(farmForm.totalAreaAcres),
        centerCoordinates: {
          lat: Number(farmForm.centerLat),
          lng: Number(farmForm.centerLng),
        },
        irrigationSource: farmForm.irrigationSource,
        soilType: farmForm.soilType,
      });

      setSuccessMessage(res.message || 'Farm registered successfully!');
      setIsAddFarmOpen(false);
      setFarmForm({
        name: '',
        state: 'Punjab',
        district: 'Ludhiana',
        subDistrict: 'Jagraon',
        village: '',
        pincode: '',
        totalAreaAcres: 5.0,
        centerLat: 30.901,
        centerLng: 75.8573,
        irrigationSource: 'Solar Tube Well',
        soilType: 'Fertile Alluvial Loam',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create farm');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Field
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFarmId = fieldForm.farmId || selectedFarmForField || (farms.length > 0 ? farms[0].id : '');
    if (!targetFarmId) {
      setError('Please select a parent farm');
      return;
    }
    if (!fieldForm.name.trim() || !fieldForm.cropName.trim()) {
      setError('Field title and crop species are mandatory');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.createField({
        farmId: targetFarmId,
        farmerId: profile?.id || 'usr-farmer-001',
        name: fieldForm.name,
        cropName: fieldForm.cropName,
        cropVariety: fieldForm.cropVariety,
        sowingDate: fieldForm.sowingDate,
        expectedHarvestDate: fieldForm.expectedHarvestDate,
        growthStage: fieldForm.growthStage,
        areaAcres: Number(fieldForm.areaAcres),
        healthStatus: fieldForm.healthStatus,
      });

      setSuccessMessage(res.message || 'Field added successfully!');
      setIsAddFieldOpen(false);
      setFieldForm({
        farmId: '',
        name: '',
        cropName: 'Wheat (गेहूं / ਕਣਕ)',
        cropVariety: 'HD-3226 (Pusa Yashasvi)',
        sowingDate: new Date().toISOString().split('T')[0],
        expectedHarvestDate: '',
        growthStage: 'Vegetative',
        areaAcres: 2.0,
        healthStatus: 'Good',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to register field');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (deletingItem.type === 'farm') {
        await api.deleteFarm(deletingItem.id);
        setSuccessMessage(`Farm "${deletingItem.name}" and associated fields deleted.`);
      } else {
        await api.deleteField(deletingItem.id);
        setSuccessMessage(`Field "${deletingItem.name}" deleted.`);
      }
      setDeletingItem(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'Optimal':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Good':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Watch':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'At Risk':
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-agri-green-light rounded-lg text-agri-green">
              <Tractor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-agri-text-primary">
                {t.nav.farms || 'Farms & Fields (खेत व फसलें)'}
              </h1>
              <p className="text-sm text-agri-text-secondary">
                Registered agricultural parcels, crop records, GPS acreage, and soil profile
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-agri-border bg-agri-surface hover:bg-agri-bg transition-colors text-agri-text-secondary"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsAddFarmOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-agri-green text-white hover:bg-agri-green-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Farm</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-agri-surface border border-agri-border rounded-xl p-4 shadow-xs">
          <div className="text-xs text-agri-text-muted font-medium">Registered Farms</div>
          <div className="text-2xl font-bold text-agri-green mt-1">{farms.length}</div>
          <div className="text-[11px] text-agri-text-secondary mt-1">Parcels in Active Register</div>
        </div>
        <div className="bg-agri-surface border border-agri-border rounded-xl p-4 shadow-xs">
          <div className="text-xs text-agri-text-muted font-medium">Total Cultivated Fields</div>
          <div className="text-2xl font-bold text-agri-cyan mt-1">{fields.length}</div>
          <div className="text-[11px] text-agri-text-secondary mt-1">Sown & Monitored Plots</div>
        </div>
        <div className="bg-agri-surface border border-agri-border rounded-xl p-4 shadow-xs">
          <div className="text-xs text-agri-text-muted font-medium">Total Acreage</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {farms.reduce((acc, f) => acc + (Number(f.totalAreaAcres) || 0), 0).toFixed(1)}{' '}
            <span className="text-sm font-normal text-agri-text-muted">Acres</span>
          </div>
          <div className="text-[11px] text-agri-text-secondary mt-1">GPS Verified Boundary Area</div>
        </div>
        <div className="bg-agri-surface border border-agri-border rounded-xl p-4 shadow-xs">
          <div className="text-xs text-agri-text-muted font-medium">Healthy Fields Ratio</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {fields.length > 0
              ? `${Math.round((fields.filter((f) => f.healthStatus === 'Optimal' || f.healthStatus === 'Good').length / fields.length) * 100)}%`
              : '100%'}
          </div>
          <div className="text-[11px] text-agri-text-secondary mt-1">Optimal / Good Standing</div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-agri-surface border border-agri-border rounded-xl p-6 animate-pulse space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <div className="h-24 bg-gray-50 rounded-lg"></div>
                <div className="h-24 bg-gray-50 rounded-lg"></div>
                <div className="h-24 bg-gray-50 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && farms.length === 0 && (
        <div className="bg-agri-surface border border-agri-border rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-agri-green-light rounded-full flex items-center justify-center mx-auto text-agri-green mb-4">
            <Tractor className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-agri-text-primary">No Agricultural Holdings Registered</h2>
          <p className="text-xs text-agri-text-secondary mt-2 max-w-sm mx-auto">
            Get started by adding your agricultural farm acreage, soil classification, and crop plots to enable hyper-local weather alerts and satellite monitoring.
          </p>
          <button
            onClick={() => setIsAddFarmOpen(true)}
            className="mt-6 inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-agri-green text-white text-xs font-semibold hover:bg-agri-green-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Farm</span>
          </button>
        </div>
      )}

      {/* Farm Cards & Nested Fields */}
      {!isLoading && farms.length > 0 && (
        <div className="space-y-6">
          {farms.map((farm) => {
            const farmFields = fields.filter((f) => f.farmId === farm.id);

            return (
              <div key={farm.id} className="bg-agri-surface border border-agri-border rounded-2xl overflow-hidden shadow-xs">
                {/* Farm Header */}
                <div className="p-5 border-b border-agri-border bg-[#FCFDFB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg font-bold text-agri-text-primary">{farm.name}</h2>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {farm.totalAreaAcres} Acres
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-agri-text-secondary">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-agri-green" />
                        <span>
                          {farm.village ? `${farm.village}, ` : ''}
                          {farm.district}, {farm.state}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Globe className="w-3.5 h-3.5 text-agri-cyan" />
                        <span>
                          GPS: {farm.centerCoordinates?.lat?.toFixed(4)}, {farm.centerCoordinates?.lng?.toFixed(4)}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Droplet className="w-3.5 h-3.5 text-blue-500" />
                        <span>{farm.irrigationSource || 'Solar Tube Well'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Farm Header Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedFarmForField(farm.id);
                        setFieldForm((prev) => ({ ...prev, farmId: farm.id }));
                        setIsAddFieldOpen(true);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-agri-green-light text-agri-green border border-agri-border hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Field</span>
                    </button>
                    <button
                      onClick={() => setDeletingItem({ type: 'farm', id: farm.id, name: farm.name })}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Farm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Nested Fields List */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-agri-text-muted flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Cultivated Plots & Sown Fields ({farmFields.length})</span>
                    </div>
                  </div>

                  {farmFields.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-agri-border rounded-xl bg-agri-bg">
                      <Sprout className="w-8 h-8 mx-auto text-agri-text-muted mb-2" />
                      <div className="text-xs font-semibold text-agri-text-primary">No fields mapped under this farm yet</div>
                      <p className="text-[11px] text-agri-text-muted mt-1">
                        Register individual crop plots to enable disease tracking, satellite NDVI index, and harvest schedules.
                      </p>
                      <button
                        onClick={() => {
                          setSelectedFarmForField(farm.id);
                          setFieldForm((prev) => ({ ...prev, farmId: farm.id }));
                          setIsAddFieldOpen(true);
                        }}
                        className="mt-3 inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-agri-green text-white text-xs font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add First Field</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {farmFields.map((field) => (
                        <div
                          key={field.id}
                          className="border border-agri-border rounded-xl p-4 hover:border-agri-green transition-all bg-white shadow-2xs relative group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-sm text-agri-text-primary truncate">{field.name}</h3>
                              <div className="text-xs text-agri-green font-semibold mt-0.5">{field.cropName}</div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getHealthBadge(
                                field.healthStatus
                              )}`}
                            >
                              {field.healthStatus}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs text-agri-text-secondary border-t border-agri-border pt-3">
                            <div className="flex justify-between">
                              <span className="text-agri-text-muted">Variety:</span>
                              <span className="font-medium truncate max-w-[140px]">{field.cropVariety || 'Standard Certified'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-agri-text-muted">Acreage:</span>
                              <span className="font-bold text-agri-text-primary">{field.areaAcres} Acres</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-agri-text-muted">Stage:</span>
                              <span className="font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                                {field.growthStage}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-agri-text-muted">Sowing Date:</span>
                              <span>{field.sowingDate}</span>
                            </div>
                          </div>

                          {/* Quick delete button */}
                          <div className="mt-3 pt-2 border-t border-agri-border flex items-center justify-between">
                            <span className="text-[10px] text-agri-text-muted">
                              {field.boundaryGeoJson ? '🗺️ GeoJSON Boundary Set' : '📍 Point Centroid'}
                            </span>
                            <button
                              onClick={() => setDeletingItem({ type: 'field', id: field.id, name: field.name })}
                              className="text-xs text-red-500 hover:text-red-700 opacity-80 group-hover:opacity-100 transition-opacity"
                              title="Delete Field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Register New Farm */}
      {isAddFarmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-agri-surface border border-agri-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-agri-border flex items-center justify-between bg-[#FAFBF8]">
              <div className="flex items-center space-x-2">
                <Tractor className="w-5 h-5 text-agri-green" />
                <h3 className="font-bold text-base text-agri-text-primary">Register New Farm</h3>
              </div>
              <button onClick={() => setIsAddFarmOpen(false)} className="text-agri-text-muted hover:text-agri-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFarm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Farm Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Horizon Acreage"
                  value={farmForm.name}
                  onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs focus:ring-1 focus:ring-agri-green focus:border-agri-green outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">State *</label>
                  <select
                    value={farmForm.state}
                    onChange={(e) => setFarmForm({ ...farmForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs focus:ring-1 focus:ring-agri-green outline-none"
                  >
                    <option value="Punjab">Punjab</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Rajasthan">Rajasthan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ludhiana / Nashik"
                    value={farmForm.district}
                    onChange={(e) => setFarmForm({ ...farmForm, district: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Village</label>
                  <input
                    type="text"
                    placeholder="e.g. Sidhwan Bet"
                    value={farmForm.village}
                    onChange={(e) => setFarmForm({ ...farmForm, village: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Total Area (Acres) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={farmForm.totalAreaAcres}
                    onChange={(e) => setFarmForm({ ...farmForm, totalAreaAcres: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Center Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={farmForm.centerLat}
                    onChange={(e) => setFarmForm({ ...farmForm, centerLat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Center Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={farmForm.centerLng}
                    onChange={(e) => setFarmForm({ ...farmForm, centerLng: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Irrigation Source</label>
                  <input
                    type="text"
                    placeholder="e.g. Solar Tube Well / Canal"
                    value={farmForm.irrigationSource}
                    onChange={(e) => setFarmForm({ ...farmForm, irrigationSource: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Soil Classification</label>
                  <input
                    type="text"
                    placeholder="e.g. Alluvial Loam / Black Soil"
                    value={farmForm.soilType}
                    onChange={(e) => setFarmForm({ ...farmForm, soilType: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-agri-border flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddFarmOpen(false)}
                  className="px-4 py-2 border border-agri-border rounded-lg text-xs font-medium text-agri-text-secondary hover:bg-agri-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-agri-green text-white rounded-lg text-xs font-semibold hover:bg-agri-green-hover transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Save & Register Farm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Field to Farm */}
      {isAddFieldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-agri-surface border border-agri-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-agri-border flex items-center justify-between bg-[#FAFBF8]">
              <div className="flex items-center space-x-2">
                <Sprout className="w-5 h-5 text-agri-green" />
                <h3 className="font-bold text-base text-agri-text-primary">Add Cultivated Field</h3>
              </div>
              <button onClick={() => setIsAddFieldOpen(false)} className="text-agri-text-muted hover:text-agri-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateField} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">Parent Farm *</label>
                <select
                  value={fieldForm.farmId || selectedFarmForField}
                  onChange={(e) => setFieldForm({ ...fieldForm, farmId: e.target.value })}
                  className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs focus:ring-1 focus:ring-agri-green outline-none"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district}, {f.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">Field / Plot Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Basin (Kanal 1-4)"
                  value={fieldForm.name}
                  onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Crop Species *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wheat / Mustard / Onion"
                    value={fieldForm.cropName}
                    onChange={(e) => setFieldForm({ ...fieldForm, cropName: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Seed Variety</label>
                  <input
                    type="text"
                    placeholder="e.g. HD-3226 / Pusa Bold"
                    value={fieldForm.cropVariety}
                    onChange={(e) => setFieldForm({ ...fieldForm, cropVariety: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Sowing Date *</label>
                  <input
                    type="date"
                    required
                    value={fieldForm.sowingDate}
                    onChange={(e) => setFieldForm({ ...fieldForm, sowingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Expected Harvest</label>
                  <input
                    type="date"
                    value={fieldForm.expectedHarvestDate}
                    onChange={(e) => setFieldForm({ ...fieldForm, expectedHarvestDate: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Growth Stage</label>
                  <select
                    value={fieldForm.growthStage}
                    onChange={(e) => setFieldForm({ ...fieldForm, growthStage: e.target.value })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  >
                    <option value="Germination">Germination (अंकुरण)</option>
                    <option value="Vegetative">Vegetative (वानस्पतिक)</option>
                    <option value="Flowering">Flowering (पुष्पण)</option>
                    <option value="Grain Filling">Grain Filling (दाना भराव)</option>
                    <option value="Maturity">Maturity (परिपक्वता)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-agri-text-primary mb-1">Field Area (Acres) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={fieldForm.areaAcres}
                    onChange={(e) => setFieldForm({ ...fieldForm, areaAcres: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-agri-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-agri-green"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-agri-border flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddFieldOpen(false)}
                  className="px-4 py-2 border border-agri-border rounded-lg text-xs font-medium text-agri-text-secondary hover:bg-agri-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-agri-green text-white rounded-lg text-xs font-semibold hover:bg-agri-green-hover transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Save Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-agri-surface border border-agri-border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-agri-text-primary">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-agri-text-secondary">
              Are you sure you want to delete {deletingItem.type === 'farm' ? 'farm' : 'field'}{' '}
              <strong className="text-agri-text-primary font-semibold">{deletingItem.name}</strong>?
              {deletingItem.type === 'farm' && ' This will also remove all cultivated fields registered under this farm.'}
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-3.5 py-1.5 border border-agri-border rounded-lg text-xs font-medium text-agri-text-secondary hover:bg-agri-bg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
