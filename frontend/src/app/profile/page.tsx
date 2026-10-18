'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Globe,
  MapPin,
  Shield,
  Sprout,
  Plus,
  CheckCircle2,
  Cpu,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INDIAN_LANGUAGES } from '../../i18n/languages';
import { api } from '../../lib/api';

export default function ProfilePage() {
  const { profile, setLanguage, currentLanguage, refreshProfile } = useApp();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [locationConsent, setLocationConsent] = useState(true);
  const [smsConsent, setSmsConsent] = useState(true);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Farm Form state
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [newState, setNewState] = useState('Punjab');
  const [newDistrict, setNewDistrict] = useState('Ludhiana');
  const [newVillage, setNewVillage] = useState('Sidhwan Bet');
  const [newAcreage, setNewAcreage] = useState('5.0');
  const [newLat, setNewLat] = useState('30.9010');
  const [newLng, setNewLng] = useState('75.8573');

  // New Field Form state
  const [showAddField, setShowAddField] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newCropName, setNewCropName] = useState('Wheat (गेहूं / ਕਣਕ)');
  const [newCropVariety, setNewCropVariety] = useState('HD-3226');
  const [newSowingDate, setNewSowingDate] = useState('2026-11-10');
  const [newGrowthStage, setNewGrowthStage] = useState('Vegetative');
  const [newFieldArea, setNewFieldArea] = useState('2.5');

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setLocationConsent(profile.locationConsent ?? true);
      setSmsConsent(profile.alertConsent?.sms ?? true);
      setVoiceConsent(profile.alertConsent?.voice ?? false);
      setWhatsappConsent(profile.alertConsent?.whatsapp ?? true);
    }
  }, [profile]);

  const loadEntities = async () => {
    if (!profile?.id) return;
    try {
      const [farmsRes, fieldsRes, devicesRes] = await Promise.all([
        api.getFarms(profile.id),
        api.getFields(undefined, profile.id),
        api.getDevices(profile.id),
      ]);
      setFarms(farmsRes.farms || []);
      setFields(fieldsRes.fields || []);
      setDevices(devicesRes.devices || []);
      if (farmsRes.farms?.length > 0) {
        setSelectedFarmId(farmsRes.farms[0].id);
      }
    } catch (err) {
      console.error('Error loading farms and fields:', err);
    }
  };

  useEffect(() => {
    loadEntities();
  }, [profile?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await api.updateProfile(profile.id, {
        fullName,
        phoneNumber,
        locationConsent,
        alertConsent: {
          sms: smsConsent,
          voice: voiceConsent,
          whatsapp: whatsappConsent,
        },
      });
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Profile update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmName.trim() || !profile?.id) return;

    try {
      await api.createFarm({
        farmerId: profile.id,
        name: newFarmName,
        state: newState,
        district: newDistrict,
        village: newVillage,
        totalAreaAcres: parseFloat(newAcreage) || 5.0,
        centerCoordinates: {
          lat: parseFloat(newLat) || 30.901,
          lng: parseFloat(newLng) || 75.8573,
        },
      });
      setShowAddFarm(false);
      setNewFarmName('');
      loadEntities();
    } catch (err) {
      console.error('Farm creation failed:', err);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim() || !selectedFarmId || !profile?.id) return;

    try {
      await api.createField({
        farmId: selectedFarmId,
        farmerId: profile.id,
        name: newFieldName,
        cropName: newCropName,
        cropVariety: newCropVariety,
        sowingDate: newSowingDate,
        growthStage: newGrowthStage,
        areaAcres: parseFloat(newFieldArea) || 2.0,
      });
      setShowAddField(false);
      setNewFieldName('');
      loadEntities();
    } catch (err) {
      console.error('Field creation failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-agri-text-primary">
            My Profile & Agricultural Holdings Setup
          </h2>
          <p className="text-xs md:text-sm text-agri-text-secondary">
            Configure verified farmer identity, notification consents, farm parcels, and crops.
          </p>
        </div>
        <a
          href="/farms"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-agri-green text-white text-xs font-semibold hover:bg-agri-green-hover transition-colors shadow-xs self-start sm:self-center"
        >
          <Sprout className="w-4 h-4" />
          <span>Full Farm & Field Manager</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Form (Span 1) */}
        <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-agri-border">
            <div className="w-12 h-12 rounded-full bg-agri-green text-white flex items-center justify-center font-bold text-lg">
              {fullName.charAt(0) || 'K'}
            </div>
            <div>
              <h3 className="font-bold text-sm text-agri-text-primary">{fullName || 'Farmer Profile'}</h3>
              <p className="text-xs text-agri-text-muted capitalize">Role: {profile?.role?.replace('_', ' ') || 'Farmer'}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-agri-text-secondary block mb-1">Full Legal Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-agri-border bg-agri-bg focus:ring-1 focus:ring-agri-green focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-agri-text-secondary block mb-1">Mobile Phone (for IVR & SMS)</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-agri-border bg-agri-bg focus:ring-1 focus:ring-agri-green focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-agri-text-secondary block mb-1">Preferred Language (22 Indian Languages)</label>
              <select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-agri-border bg-agri-bg focus:ring-1 focus:ring-agri-green focus:outline-hidden"
              >
                {INDIAN_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-agri-border space-y-2">
              <span className="font-bold text-agri-text-primary block">Alert Channels & Consent</span>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationConsent}
                  onChange={(e) => setLocationConsent(e.target.checked)}
                  className="rounded text-agri-green focus:ring-agri-green"
                />
                <span className="text-agri-text-secondary">Enable Farm GPS Location Permissions</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="rounded text-agri-green focus:ring-agri-green"
                />
                <span className="text-agri-text-secondary">Receive SMS Weather & Pest Alerts</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceConsent}
                  onChange={(e) => setVoiceConsent(e.target.checked)}
                  className="rounded text-agri-green focus:ring-agri-green"
                />
                <span className="text-agri-text-secondary">Allow Automated Voice Calls (Critical Frost / Rain)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  className="rounded text-agri-green focus:ring-agri-green"
                />
                <span className="text-agri-text-secondary">Allow WhatsApp Advisory Broadcasts</span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-agri-green text-white font-bold hover:bg-agri-green-hover transition-colors shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>

              {saveSuccess && (
                <div className="mt-2 text-center text-xs text-emerald-700 font-bold flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Profile updated in persistent database!</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Farms & Fields Management (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Farms Section */}
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm md:text-base text-agri-text-primary">Registered Farms ({farms.length})</h3>
                <p className="text-xs text-agri-text-secondary">Agricultural land parcels and center GPS locations</p>
              </div>
              <button
                onClick={() => setShowAddFarm(!showAddFarm)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-agri-green-light text-agri-green text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Farm</span>
              </button>
            </div>

            {showAddFarm && (
              <form onSubmit={handleCreateFarm} className="p-4 rounded-xl bg-agri-bg border border-agri-border space-y-3 text-xs">
                <div className="font-bold text-agri-text-primary">Register New Farm Parcel</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-semibold">Farm Name</label>
                    <input
                      type="text"
                      value={newFarmName}
                      onChange={(e) => setNewFarmName(e.target.value)}
                      placeholder="e.g. South Canal Farm"
                      className="w-full p-2 rounded-lg border bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Total Area (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newAcreage}
                      onChange={(e) => setNewAcreage(e.target.value)}
                      className="w-full p-2 rounded-lg border bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">State & District</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={newState}
                        onChange={(e) => setNewState(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white"
                      />
                      <input
                        type="text"
                        value={newDistrict}
                        onChange={(e) => setNewDistrict(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Center Coordinates (Lat, Lng)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        step="0.0001"
                        value={newLat}
                        onChange={(e) => setNewLat(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={newLng}
                        onChange={(e) => setNewLng(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFarm(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-agri-green text-white font-bold text-xs"
                  >
                    Save Farm
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {farms.map((f) => (
                <div key={f.id} className="p-3.5 rounded-xl border border-agri-border bg-[#FCFDFB] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-agri-text-primary text-sm">{f.name}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                      {f.totalAreaAcres} Acres
                    </span>
                  </div>
                  <div className="text-agri-text-secondary flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-agri-green" />
                    <span>{f.village}, {f.district}, {f.state}</span>
                  </div>
                  <div className="text-[10px] text-agri-text-muted">
                    Coordinates: {f.centerCoordinates?.lat?.toFixed(4)}, {f.centerCoordinates?.lng?.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fields / Plots Section */}
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm md:text-base text-agri-text-primary">Fields & Sowing Schedule ({fields.length})</h3>
                <p className="text-xs text-agri-text-secondary">Specific crops, growth stages, and acreage boundaries</p>
              </div>
              <button
                onClick={() => setShowAddField(!showAddField)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-agri-green-light text-agri-green text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>

            {showAddField && (
              <form onSubmit={handleCreateField} className="p-4 rounded-xl bg-agri-bg border border-agri-border space-y-3 text-xs">
                <div className="font-bold text-agri-text-primary">Add Crop Plot to Farm</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-semibold">Select Farm</label>
                    <select
                      value={selectedFarmId}
                      onChange={(e) => setSelectedFarmId(e.target.value)}
                      className="w-full p-2 rounded-lg border bg-white"
                      required
                    >
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Field Name / Strip</label>
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="e.g. East Tube Well Basin"
                      className="w-full p-2 rounded-lg border bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Crop & Variety</label>
                    <input
                      type="text"
                      value={newCropName}
                      onChange={(e) => setNewCropName(e.target.value)}
                      className="w-full p-2 rounded-lg border bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Growth Stage</label>
                    <select
                      value={newGrowthStage}
                      onChange={(e) => setNewGrowthStage(e.target.value)}
                      className="w-full p-2 rounded-lg border bg-white"
                    >
                      <option value="Germination">Germination</option>
                      <option value="Vegetative">Vegetative</option>
                      <option value="Flowering">Flowering</option>
                      <option value="Grain Filling">Grain Filling</option>
                      <option value="Maturity">Maturity</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddField(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-agri-green text-white font-bold text-xs"
                  >
                    Save Field
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2.5">
              {fields.map((f) => (
                <div key={f.id} className="p-3.5 rounded-xl border border-agri-border bg-[#FCFDFB] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-agri-text-primary text-sm">{f.name}</div>
                    <div className="text-agri-text-secondary mt-0.5">
                      {f.cropName} • Stage: <span className="font-semibold text-agri-green">{f.growthStage}</span>
                    </div>
                    <div className="text-[10px] text-agri-text-muted mt-0.5">
                      Sown on: {f.sowingDate} • Area: {f.areaAcres} Acres
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    {f.healthStatus || 'Good'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
