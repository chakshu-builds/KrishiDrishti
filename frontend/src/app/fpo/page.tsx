'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Search,
  Building,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';

export default function FPOWorkspacePage() {
  const { profile, setProfileId } = useApp();

  const [members, setMembers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [expertName, setExpertName] = useState('Dr. Virender K. Ahluwalia');
  const [caseStatus, setCaseStatus] = useState('under_review');
  const [expertNotes, setExpertNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const isAuthorized =
    profile?.role === 'fpo_coordinator' ||
    profile?.role === 'agri_expert' ||
    profile?.role === 'admin';

  const loadFPOData = async () => {
    try {
      const [membersRes, casesRes, metricsRes] = await Promise.all([
        api.getFPOMembers(),
        api.getFPOCases(),
        api.getFPOMetrics(),
      ]);
      setMembers(membersRes.members || []);
      setCases(casesRes.cases || []);
      setMetrics(metricsRes);
      if (casesRes.cases?.length > 0 && !selectedCase) {
        setSelectedCase(casesRes.cases[0]);
      }
    } catch (err) {
      console.error('FPO data load error:', err);
    }
  };

  useEffect(() => {
    loadFPOData();
  }, [profile?.role]);

  const handleAssignCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setUpdating(true);
    try {
      await api.assignFPOCase(selectedCase.id, {
        assignedExpertName: expertName,
        status: caseStatus,
        expertNotes,
      });
      await loadFPOData();
    } catch (err) {
      console.error('Failed to update case:', err);
    } finally {
      setUpdating(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.village.toLowerCase().includes(q) ||
      m.district.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-agri-text-primary">
            FPO Coordinator & Agricultural Expert Workspace
          </h2>
          <p className="text-xs md:text-sm text-agri-text-secondary">
            Cluster-wide crop pathology oversight, member farmer management, and field officer triage.
          </p>
        </div>

        {/* Role verification badge */}
        {!isAuthorized ? (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center space-x-2 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <span>Current profile is <strong>Farmer</strong>. Switch to <strong>FPO Lead</strong> to test triage: </span>
              <button
                onClick={() => setProfileId('usr-fpo-coord')}
                className="underline font-bold text-amber-950 ml-1"
              >
                Switch to Sunita Sharma (FPO Lead)
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Role Verified: {profile?.fullName} ({profile?.role?.replace('_', ' ')})</span>
          </div>
        )}
      </div>

      {/* Aggregate Cluster Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-agri-border shadow-xs">
            <span className="text-xs font-semibold text-agri-text-secondary">Supervised Farmers</span>
            <div className="text-2xl font-bold text-agri-text-primary mt-1">
              {metrics.totalFarmersSupervised} <span className="text-sm font-normal text-agri-text-muted">Members</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">100% Location Consented</div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-agri-border shadow-xs">
            <span className="text-xs font-semibold text-agri-text-secondary">Total Supervised Land</span>
            <div className="text-2xl font-bold text-agri-text-primary mt-1">
              {metrics.totalSupervisedAcreage} <span className="text-sm font-normal text-agri-text-muted">Acres</span>
            </div>
            <div className="text-[11px] text-agri-text-secondary mt-1">{metrics.totalActiveFields} Registered Field Plots</div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-agri-border shadow-xs">
            <span className="text-xs font-semibold text-agri-text-secondary">Active Cluster Risk Alerts</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {metrics.activeAlertsInCluster}
            </div>
            <div className="text-[11px] text-amber-800 font-semibold mt-1">Heavy Rain & Water Stress</div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-agri-border shadow-xs">
            <span className="text-xs font-semibold text-agri-text-secondary">Issue Resolution Rate</span>
            <div className="text-2xl font-bold text-agri-green mt-1">
              {metrics.casesSummary?.resolutionRatePct}%
            </div>
            <div className="text-[11px] text-agri-text-secondary mt-1">
              {metrics.casesSummary?.open} open / {metrics.casesSummary?.total} total cases
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Triage Cases (Left) & Member Farmers (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Agronomic Triage Desk (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-agri-border">
              <div>
                <h3 className="font-bold text-sm md:text-base text-agri-text-primary">
                  Agronomic Triage & Escalation Desk ({cases.length})
                </h3>
                <p className="text-xs text-agri-text-secondary">
                  Cases escalated by AI diagnostics requiring physical KVK / field officer intervention
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCase(c);
                    setCaseStatus(c.status);
                    setExpertName(c.assignedExpertName || 'Dr. Virender K. Ahluwalia');
                    setExpertNotes(c.expertNotes || '');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedCase?.id === c.id
                      ? 'border-agri-green bg-agri-green-light/40 shadow-xs'
                      : 'border-agri-border bg-[#FCFDFB] hover:bg-agri-bg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-agri-text-primary">{c.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            c.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </div>
                      <div className="text-xs text-agri-text-secondary mt-1">
                        Farmer: <strong>{c.farmerName}</strong> ({c.farmerPhone}) • Plot: <strong>{c.fieldName}</strong>
                      </div>
                      <div className="text-[11px] text-agri-text-muted mt-0.5">
                        Assigned: <strong>{c.assignedExpertName || 'Unassigned'}</strong> • Status: <span className="capitalize">{c.status.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-agri-green shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Case Triage Form */}
            {selectedCase && (
              <form onSubmit={handleAssignCase} className="p-4 rounded-xl bg-agri-bg border border-agri-border space-y-3 text-xs">
                <div className="font-bold text-agri-text-primary text-sm flex items-center justify-between">
                  <span>Assign / Update Case: {selectedCase.title}</span>
                  <span className="text-[10px] text-agri-text-muted">Case ID: {selectedCase.id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Assign Agricultural Expert</label>
                    <select
                      value={expertName}
                      onChange={(e) => setExpertName(e.target.value)}
                      className="w-full p-2 rounded-lg border bg-white"
                    >
                      <option value="Dr. Virender K. Ahluwalia">Dr. Virender K. Ahluwalia (PAU Ludhiana)</option>
                      <option value="Er. Manpreet Singh (Field Officer)">Er. Manpreet Singh (Field Officer)</option>
                      <option value="KVK Extension Desk">KVK Regional Extension Desk</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Workflow Status</label>
                    <select
                      value={caseStatus}
                      onChange={(e) => setCaseStatus(e.target.value)}
                      className="w-full p-2 rounded-lg border bg-white"
                    >
                      <option value="open">Open (Awaiting Review)</option>
                      <option value="under_review">Under Review</option>
                      <option value="field_visit_scheduled">Field Visit Scheduled</option>
                      <option value="resolved">Resolved / Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Expert Field Notes & Guidance</label>
                  <textarea
                    rows={3}
                    value={expertNotes}
                    onChange={(e) => setExpertNotes(e.target.value)}
                    placeholder="Document microscopic findings or specific cultural recommendations..."
                    className="w-full p-2 rounded-lg border bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-agri-green text-white font-bold rounded-lg hover:bg-agri-green-hover"
                  >
                    {updating ? 'Updating Case...' : 'Save Triage Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Member Farmers Roster (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm md:text-base text-agri-text-primary">
                Authorized Member Farmers ({filteredMembers.length})
              </h3>
              <p className="text-xs text-agri-text-secondary">Consented farm records for FPO cluster</p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-agri-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member name or village..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-agri-border bg-agri-bg text-xs"
              />
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredMembers.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl border border-agri-border bg-[#FCFDFB] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-agri-text-primary">{m.fullName}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                      {m.totalAcreage} Acres
                    </span>
                  </div>
                  <div className="text-agri-text-secondary">
                    {m.village}, {m.district} • Ph: {m.phoneNumber}
                  </div>
                  <div className="text-[10px] text-agri-text-muted">
                    Crops: {m.primaryCrops?.join(', ') || 'Wheat, Mustard'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
