'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  Smartphone,
  Clock,
  Filter,
  Check,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export default function AlertsPage() {
  const { t, profile, speakText } = useApp();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAlerts(profile?.id || 'usr-farmer-001');
      setAlerts(res.alerts || []);
    } catch (err: any) {
      console.error('[AlertsPage] Error loading alerts:', err);
      setError(err.message || 'Failed to fetch agricultural risk alerts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [profile?.id]);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      await api.acknowledgeAlert(alertId, profile?.id || 'usr-farmer-001');
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, inAppStatus: 'acknowledged' } : a))
      );
    } catch (err: any) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity?.toLowerCase() === filterSeverity.toLowerCase();
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800 border-red-300',
          icon: ShieldAlert,
          iconColor: 'text-red-600',
        };
      case 'warning':
      case 'advisory':
        return {
          border: 'border-amber-300',
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
        };
      case 'info':
      default:
        return {
          border: 'border-blue-300',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Info,
          iconColor: 'text-blue-600',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-100 rounded-xl text-red-700">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-agri-text-primary">
              {t.nav.alerts || 'Alerts & Risk Notifications (कृषि अलर्ट)'}
            </h1>
            <p className="text-xs text-agri-text-secondary">
              Automated agronomic risk triggers, severe weather warnings, and multi-channel delivery logs
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-agri-border bg-agri-surface hover:bg-agri-bg transition-colors text-agri-text-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-agri-surface border border-agri-border rounded-xl p-4 shadow-xs">
          <div className="text-xs text-agri-text-muted font-medium">Total Alerts Generated</div>
          <div className="text-2xl font-bold text-agri-text-primary mt-1">{alerts.length}</div>
          <div className="text-[11px] text-agri-text-secondary mt-1">Across all registered fields</div>
        </div>
        <div className="bg-agri-surface border border-red-200 rounded-xl p-4 shadow-xs bg-red-50/30">
          <div className="text-xs text-red-700 font-semibold">Critical Risks</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {alerts.filter((a) => a.severity === 'critical').length}
          </div>
          <div className="text-[11px] text-red-600/80 mt-1">Immediate action required</div>
        </div>
        <div className="bg-agri-surface border border-amber-200 rounded-xl p-4 shadow-xs bg-amber-50/30">
          <div className="text-xs text-amber-800 font-semibold">Agronomic Advisories</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {alerts.filter((a) => a.severity === 'warning' || a.severity === 'advisory').length}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">Proactive crop protection</div>
        </div>
        <div className="bg-agri-surface border border-agri-border rounded-xl p-4 shadow-xs">
          <div className="text-xs text-agri-text-muted font-medium">Deduplication Cooldown</div>
          <div className="text-sm font-bold text-agri-green mt-2 flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>6-Hour Window</span>
          </div>
          <div className="text-[11px] text-agri-text-secondary mt-1">Prevents alert fatigue</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-agri-surface border border-agri-border p-3 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-agri-text-muted" />
          <span className="text-xs font-semibold text-agri-text-primary">Filter by Severity:</span>
          <div className="flex items-center space-x-1">
            {['all', 'critical', 'warning', 'advisory', 'info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  filterSeverity === sev
                    ? 'bg-agri-green text-white shadow-xs'
                    : 'text-agri-text-secondary hover:bg-agri-bg'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-agri-text-muted">
          Showing <span className="font-bold text-agri-text-primary">{filteredAlerts.length}</span> alert
          {filteredAlerts.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-agri-surface border border-agri-border rounded-xl p-5 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              <div className="h-12 bg-gray-50 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAlerts} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredAlerts.length === 0 && (
        <div className="bg-agri-surface border border-agri-border rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-agri-text-primary">All Clear on Your Fields</h3>
          <p className="text-xs text-agri-text-secondary mt-1 max-w-xs mx-auto">
            No active severe weather triggers or biological risk conditions have been detected for your selected filter.
          </p>
          <div className="mt-4 inline-flex items-center space-x-1.5 text-xs text-agri-green font-semibold bg-agri-green-light px-3 py-1.5 rounded-lg border border-agri-border">
            <Clock className="w-3.5 h-3.5" />
            <span>Automated sensor evaluation scans every 60s</span>
          </div>
        </div>
      )}

      {/* Alerts Feed */}
      {!isLoading && filteredAlerts.length > 0 && (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const style = getSeverityStyle(alert.severity);
            const Icon = style.icon;
            const isAcknowledged = alert.inAppStatus === 'acknowledged';

            return (
              <div
                key={alert.id}
                className={`bg-agri-surface border ${
                  isAcknowledged ? 'border-agri-border opacity-85' : style.border
                } rounded-xl p-5 shadow-xs transition-all`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-lg ${style.bg} ${style.iconColor} shrink-0 mt-0.5`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm text-agri-text-primary">{alert.title}</h3>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}
                        >
                          {alert.severity}
                        </span>
                        {isAcknowledged && (
                          <span className="text-[10px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                            ✓ Acknowledged
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-agri-text-secondary leading-relaxed pt-1">
                        {alert.description}
                      </p>

                      {/* Recommended Cultural Action Box */}
                      {alert.recommendedAction && (
                        <div className="mt-3 p-3 bg-[#FAFBF8] border border-agri-border rounded-lg text-xs space-y-1">
                          <div className="font-bold text-agri-green flex items-center space-x-1.5">
                            <span>🌱 Actionable Agronomic Advice:</span>
                          </div>
                          <div className="text-agri-text-primary font-medium pl-1">
                            {alert.recommendedAction}
                          </div>
                        </div>
                      )}

                      {/* Channel delivery metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-agri-text-muted pt-2">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(alert.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                        </span>
                        <span>•</span>
                        <span>Source: {alert.sourceAttribution || 'OpenWeather & Agronomic Engine'}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center space-x-0.5 text-emerald-700">
                            <Smartphone className="w-3 h-3" />
                            <span>In-App</span>
                          </span>
                          <span className="flex items-center space-x-0.5 text-agri-text-muted">
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp ({alert.whatsappStatus || 'configured'})</span>
                          </span>
                          <span className="flex items-center space-x-0.5 text-agri-text-muted">
                            <PhoneCall className="w-3 h-3" />
                            <span>Voice IVR ({alert.voiceStatus || 'standby'})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center md:flex-col md:items-end justify-between md:justify-start gap-2 shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => speakText(`${alert.title}. ${alert.description}. ${alert.recommendedAction}`)}
                      className="px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      title="Read alert aloud"
                    >
                      🔊 Speak Alert
                    </button>

                    {!isAcknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledgingId === alert.id}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-agri-green text-white hover:bg-agri-green-hover transition-colors shadow-xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{acknowledgingId === alert.id ? 'Saving...' : 'Acknowledge'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
