export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/uploads')) {
    return `${API_BASE}${url}`;
  }
  return url;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error(`[API] Error calling ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Profiles & Authentication
  getProfile: (id: string = 'usr-farmer-001') => request<{ profile: any }>(`/api/auth/profile?id=${id}`),
  updateProfile: (id: string, updates: any) =>
    request<{ profile: any; message: string }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ id, ...updates }),
    }),
  getUsers: () => request<{ profiles: any[] }>('/api/auth/users'),
  login: (credentials: { phoneNumber?: string; profileId?: string }) =>
    request<{ profile: any; token: string; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  signup: (data: { fullName: string; phoneNumber: string; preferredLanguage?: string; role?: string; fpoId?: string }) =>
    request<{ profile: any; token: string; message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  switchRole: (profileId: string) =>
    request<{ profile: any; message: string }>('/api/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    }),

  // Farms & Fields
  getFarms: (farmerId?: string) => request<{ farms: any[] }>(`/api/farms${farmerId ? `?farmerId=${farmerId}` : ''}`),
  getFarm: (id: string) => request<{ farm: any; fields: any[] }>(`/api/farms/${id}`),
  createFarm: (farm: any) =>
    request<{ farm: any; message: string }>('/api/farms', {
      method: 'POST',
      body: JSON.stringify(farm),
    }),
  updateFarm: (id: string, updates: any) =>
    request<{ farm: any; message: string }>(`/api/farms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteFarm: (id: string) =>
    request<{ message: string }>(`/api/farms/${id}`, {
      method: 'DELETE',
    }),
  getFields: (farmId?: string, farmerId?: string) => {
    const params = new URLSearchParams();
    if (farmId) params.append('farmId', farmId);
    if (farmerId) params.append('farmerId', farmerId);
    return request<{ fields: any[] }>(`/api/fields?${params.toString()}`);
  },
  getField: (id: string) => request<{ field: any }>(`/api/fields/${id}`),
  createField: (field: any) =>
    request<{ field: any; message: string }>('/api/fields', {
      method: 'POST',
      body: JSON.stringify(field),
    }),
  updateField: (id: string, updates: any) =>
    request<{ field: any; message: string }>(`/api/fields/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteField: (id: string) =>
    request<{ message: string }>(`/api/fields/${id}`, {
      method: 'DELETE',
    }),
  getFieldOverlays: (fieldId: string) => request<{ overlays: any[] }>(`/api/fields/${fieldId}/overlays`),
  saveFieldOverlay: (fieldId: string, overlay: any) =>
    request<{ overlay: any; message: string }>(`/api/fields/${fieldId}/overlays`, {
      method: 'POST',
      body: JSON.stringify(overlay),
    }),

  // Weather & Alerts
  getWeather: (lat?: number, lng?: number, location?: string, farmerId?: string, city?: string) => {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (lat !== undefined && lng !== undefined) {
      params.append('lat', lat.toString());
      params.append('lng', lng.toString());
    }
    if (location) params.append('location', location);
    if (farmerId) params.append('farmerId', farmerId);
    return request<{ weather: any; activeAlerts: any[]; newTriggeredAlertsCount: number; farmCoordinates: any }>(
      `/api/weather?${params.toString()}`
    );
  },
  getAlerts: (farmerId: string = 'usr-farmer-001') => request<{ alerts: any[] }>(`/api/alerts?farmerId=${farmerId}`),
  acknowledgeAlert: (id: string, farmerId: string = 'usr-farmer-001') =>
    request<{ alert: any; message: string }>(`/api/alerts/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ farmerId }),
    }),

  // Mandi
  getMandiPrices: (filters?: { commodity?: string; state?: string; district?: string; market?: string }) => {
    const params = new URLSearchParams();
    if (filters?.commodity && filters.commodity !== 'All') params.append('commodity', filters.commodity);
    if (filters?.state && filters.state !== 'All') params.append('state', filters.state);
    if (filters?.market && filters.market !== 'All') params.append('market', filters.market);
    return request<{
      records: any[];
      total: number;
      sourceAttribution: string;
      isLiveFeed: boolean;
      availableFilters: any;
      dataStatus?: string;
      retrievalTime?: string;
      blockerDetails?: string;
    }>(`/api/mandi?${params.toString()}`);
  },
  compareMandiMarkets: (commodity: string = 'Onion') =>
    request<{ commodity: string; comparison: any[]; sourceAttribution: string; isLiveFeed: boolean }>(
      `/api/mandi/compare?commodity=${encodeURIComponent(commodity)}`
    ),

  // Crop Marketplace (Buy & Sell Produce)
  getMarketplaceListings: (filters?: { crop?: string; state?: string; type?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.crop && filters.crop !== 'All') params.append('crop', filters.crop);
    if (filters?.state && filters.state !== 'All') params.append('state', filters.state);
    if (filters?.type && filters.type !== 'All') params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    return request<{
      listings: any[];
      totalCount: number;
      metrics: {
        totalQuintalsAvailable: number;
        activeFarmerSellers: number;
        commoditiesAvailable: string[];
      };
      sourceAttribution: string;
      retrievalTime: string;
    }>(`/api/marketplace/listings?${params.toString()}`);
  },
  createMarketplaceListing: (payload: any) =>
    request<{ message: string; listing: any }>('/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  contactMarketplaceSeller: (payload: { listingId: string; buyerName?: string; buyerPhone?: string; requestedQuintals?: number }) =>
    request<{ success: boolean; farmerName: string; farmerPhone: string; whatsappUrl: string; message: string }>(
      '/api/marketplace/contact',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  // IoT
  getDevices: (farmerId?: string) => request<{ devices: any[] }>(`/api/iot/devices${farmerId ? `?farmerId=${farmerId}` : ''}`),
  registerDevice: (device: any) =>
    request<{ device: any; message: string }>('/api/iot/devices', {
      method: 'POST',
      body: JSON.stringify(device),
    }),
  getTelemetry: (deviceId?: string, fieldId?: string, limit: number = 30) => {
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', deviceId);
    if (fieldId) params.append('fieldId', fieldId);
    params.append('limit', limit.toString());
    return request<{ readings: any[] }>(`/api/iot/telemetry?${params.toString()}`);
  },
  triggerSimulatorTick: () =>
    request<{ message: string; readingsGenerated: number; readings: any[]; pumpActive: boolean }>('/api/iot/simulator/tick', {
      method: 'POST',
    }),
  getPumpStatus: () =>
    request<{ pumpActive: boolean; flowRateLpm: number; wattageKw: number; lastToggled: string }>('/api/iot/pump/status'),
  togglePump: (active?: boolean) =>
    request<{ success: boolean; pumpActive: boolean; message: string; flowRateLpm: number; wattageKw: number }>(
      '/api/iot/pump/toggle',
      {
        method: 'POST',
        body: JSON.stringify({ active }),
      }
    ),
  injectSimulatorScenario: (scenario: 'drought' | 'optimal' | 'waterlogging' | 'heatwave') =>
    request<{ success: boolean; scenario: string; readings: any[]; pumpActive: boolean; message: string }>(
      '/api/iot/simulator/scenario',
      {
        method: 'POST',
        body: JSON.stringify({ scenario }),
      }
    ),

  // Crop Health Diagnostics
  getCropDiagnoses: (fieldId?: string, farmerId?: string) => {
    const params = new URLSearchParams();
    if (fieldId) params.append('fieldId', fieldId);
    if (farmerId) params.append('farmerId', farmerId);
    return request<{ diagnoses: any[] }>(`/api/diagnoses?${params.toString()}`);
  },
  analyzeCropHealth: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/api/diagnoses/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Crop analysis request failed');
    }
    return await res.json();
  },

  // AI Assistant Chatbot
  chatWithAssistant: (message: string, farmerId: string = 'usr-farmer-001', preferredLanguage: string = 'hi') =>
    request<{ reply: string; suggestedActions: string[]; linksToScreens: any[]; timestamp: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, farmerId, preferredLanguage }),
    }),

  // FPO Coordinator Workspace
  getFPOMembers: () => request<{ members: any[] }>('/api/fpo/members'),
  getFPOCases: () => request<{ cases: any[] }>('/api/fpo/cases'),
  assignFPOCase: (caseId: string, updates: any) =>
    request<{ case: any; message: string }>(`/api/fpo/cases/${caseId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  getFPOMetrics: () => request<any>('/api/fpo/metrics'),

  // Voice Hotline / IVR Simulator
  simulateVoiceCall: (payload: { action: string; callerNumber?: string; digit?: string; spokenText?: string; language?: string; sessionId?: string }) =>
    request<any>('/api/voice/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // WhatsApp Webhook Simulator
  simulateWhatsApp: (payload: { senderNumber?: string; text?: string; hasImage?: boolean; imageUrl?: string }) =>
    request<any>('/api/webhooks/whatsapp/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
