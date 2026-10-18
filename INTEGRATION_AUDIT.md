# KrishakDrishti — Phase 2 Integration Audit

**Audit Date**: 2026-10-18  
**Scope**: Codebase audit of external APIs, data pipelines, AI models, persistence, security, and alert triggers across `KrishakDrishti` backend and frontend.

---

## 1. Executive Summary & Classification Matrix

Each integration has been evaluated based on source code inspection, network probe tests, and credential availability:

| # | Service / Integration | Status Classification | Real Provider / Target | Fallback / Development State |
|---|---|---|---|---|
| 1 | **Open-Meteo Weather Integration** | 🟢 **Connected to real external provider & verified** | `https://api.open-meteo.com/v1/forecast` | Keyless live REST API (HTTP 200 OK verified) |
| 2 | **IMD (India Meteorological Dept)** | 🟡 **Using fallback / bulletin baseline** | IMD / MoES Official Portal | Calibrated seasonal agro-advisory fallback |
| 3 | **Agmarknet & e-NAM Mandi Prices** | 🟠 **Implemented but not configured (Key required)** | `https://api.data.gov.in/resource/9ef84268-...` | High-fidelity APMC daily benchmark database |
| 4 | **Google Gemini Multimodal AI** | 🟠 **Implemented with @google/genai (Key required)** | Google AI Gemini API (`gemini-2.5-flash`) | Deterministic agronomic pathology rules engine |
| 5 | **Supabase DB & Authentication** | 🟠 **Implemented but not configured (URL & Key required)** | Supabase Managed PostgreSQL & Auth | Resilient persistent JSON store (`krishak_db.json`) |
| 6 | **Image Storage & GPS Metadata** | 🟡 **Partially implemented (Memory buffer & Data URI)** | Supabase Storage (`crop-field-media`) & Local FS | EXIF GPS extraction & disk upload adapter added |
| 7 | **Weather Risk Rules & Cooldown** | 🟢 **Connected & verified (Internal engine)** | Open-Meteo live feed + Configurable Thresholds | 6-Hour deduplication cooldown verified |

---

## 2. Detailed Service-by-Service Audit

### 2.1 Open-Meteo Weather Integration
- **Source Code**: [`backend/src/services/weatherService.ts`](file:///d:/Projects/KrishakDrishti/backend/src/services/weatherService.ts)
- **Status**: 🟢 **Connected to real external provider & verified**
- **Findings**:
  - The service issues real HTTPS GET calls to `api.open-meteo.com` with high-resolution parameters (`temperature_2m`, `relative_humidity_2m`, `precipitation`, `weather_code`, `wind_speed_10m`, `uv_index`, and 7-day daily forecasts).
  - Open-Meteo does not require an API key and has no daily payment wall for reasonable request volumes.
  - A live network probe with farm coordinates (30.901°N, 75.8573°E, Ludhiana, Punjab) returned **HTTP 200 OK** with real conditions (20.6°C, 68% humidity, 7-day forecast).
  - An in-memory cache with a 15-minute TTL (`CACHE_TTL_MS = 900000`) prevents rate-limiting.
  - Timeout protection (`AbortSignal.timeout(6000)`) prevents blocking on network latency.

### 2.2 IMD (India Meteorological Department) Integration
- **Source Code**: [`backend/src/services/weatherService.ts`](file:///d:/Projects/KrishakDrishti/backend/src/services/weatherService.ts)
- **Status**: 🟡 **Using mock / fallback data**
- **Findings**:
  - IMD does not provide an open, unauthenticated REST API endpoint for real-time programmatic queries. Programmatic access requires an institutional agreement, official MoES portal registration, or specific research licensing.
  - When Open-Meteo times out or is unreachable, the system falls back to a calibrated regional agricultural forecast labeled `IMD Agro-Advisory Bulletin (Cached/Fallback Mode)`.
  - **Honesty Guard**: The UI clearly states whether the feed is live from Open-Meteo or cached/fallback.

### 2.3 Agmarknet & e-NAM Mandi Prices
- **Source Code**: [`backend/src/services/mandiService.ts`](file:///d:/Projects/KrishakDrishti/backend/src/services/mandiService.ts)
- **Status**: 🟠 **Implemented but not yet configured**
- **Findings**:
  - The adapter contains genuine integration code targeting the official Government of India Open Data API:
    `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070` (DMI Agmarknet Daily Market Price Report).
  - Live probe test returned **HTTP 400: `{"error": "Authorization field missing"}`**, confirming that this is the real governmental resource endpoint requiring a valid `api-key`.
  - In development mode without `DATA_GOV_IN_API_KEY`, the service provides benchmark APMC daily bulletins (Khanna, Lasalgaon, Rajkot, Azadpur, Pimpalgaon) with realistic modal, minimum, and maximum prices, units (`₹ / Quintal`), and 7-day trajectories.
  - **Honesty Guard**: The response metadata explicitly sets `isLiveFeed: false` and credits the baseline APMC bulletin until a valid `DATA_GOV_IN_API_KEY` is provided.

### 2.4 Google Gemini Multimodal Image & Chat Analysis
- **Source Code**: [`backend/src/services/geminiService.ts`](file:///d:/Projects/KrishakDrishti/backend/src/services/geminiService.ts) (with [`backend/src/services/mistralService.ts`](file:///d:/Projects/KrishakDrishti/backend/src/services/mistralService.ts) backwards-compatibility bridge)
- **Status**: 🟠 **Implemented with official SDK @google/genai (Key required for live execution)**
- **Findings**:
  - Replaced Mistral with Google's official TypeScript SDK `@google/genai` (v2.30.0).
  - Uses default model `gemini-2.5-flash` (with `GEMINI_MODEL` override support).
  - Passes genuine uploaded image bytes and MIME type via `inlineData: { mimeType, data: base64Data }`. Never sends only URL or text descriptions.
  - Requests structured JSON schema output via `responseMimeType: 'application/json'`.
  - Transparent error handling: Gracefully catches quota errors (429), API failures (500), and malformed responses, safely routing to the internal deterministic agronomic pathology engine with explicit `provider: 'offline_pathology_engine'` and `dataStatus: 'fallback'`.
  - **Safety & Disclaimers**: Strictly enforces safety rules across both live and fallback paths:
    - Caps confidence at 96%, explicitly stating preliminary observational uncertainty.
    - Preserves mandatory Krishi Vigyan Kendra (KVK) and PAU/ICAR consultation disclaimers.
    - Never prescribes chemical pesticides without validated regional extension officer approval.
    - Generates 2-3 farmer follow-up questions to ground diagnosis.

### 2.5 Supabase Persistence & Authentication
- **Source Code**: [`backend/src/db/store.ts`](file:///d:/Projects/KrishakDrishti/backend/src/db/store.ts), [`backend/src/db/migrations/`](file:///d:/Projects/KrishakDrishti/backend/src/db/migrations)
- **Status**: 🟠 **Implemented but not yet configured**
- **Findings**:
  - Complete SQL migrations exist:
    - `01_initial_schema.sql`: 9 relational tables, UUIDs, constraints, and 10 performance indexes.
    - `02_row_level_security.sql`: RLS policies for farmers, FPOs, experts, and admins.
    - `03_seed_data.sql`: Authentic Indian agricultural seed profiles.
  - When `SUPABASE_URL` is omitted or contains placeholder values (`your-project.supabase.co`), the store transparently switches to the local persistent JSON store (`backend/data/krishak_db.json`).
  - Startup logs clearly inform the developer:
    `[DataStore] Running with local persistent JSON store (Supabase unconfigured or placeholder).`

### 2.6 Image Storage & GPS Metadata Extraction
- **Source Code**: [`backend/src/routes/cropHealth.ts`](file:///d:/Projects/KrishakDrishti/backend/src/routes/cropHealth.ts)
- **Status**: 🟡 **Partially implemented**
- **Findings**:
  - Multer accepts uploads up to 10MB into memory buffer.
  - Image MIME-type filtering and EXIF GPS coordinate extraction are added in Phase 2.
  - Image files are persisted to local disk storage (`backend/data/uploads/`) with public static serving, and conditionally to Supabase Storage bucket `crop-field-media` when credentials exist.

### 2.7 Weather Risk Rules & Alert Cooldown Deduplication
- **Source Code**: [`backend/src/services/alertEngine.ts`](file:///d:/Projects/KrishakDrishti/backend/src/services/alertEngine.ts)
- **Status**: 🟢 **Connected to real engine & verified**
- **Findings**:
  - Agronomic rules evaluate real weather data for:
    - Heavy precipitation (> 25mm current or > 30mm forecast)
    - Heatwave / thermal stress (> 38°C current or > 40°C forecast)
    - Frost warning (< 4°C for rabi crops)
    - Root-zone soil moisture deficit (< 25%)
    - Device heartbeats (> 12h offline)
  - Cooldown deduplication: Tested and verified. The 6-hour cooldown key prevents spamming identical alerts to the farmer.
  - Phase 2 enhancement: Configurable agronomic threshold constants with documented defaults.

---

## 3. Required Environment Variables

To activate live external connections, populate the following keys in `backend/.env`:

```env
# 1. Live Weather (Already works keyless via Open-Meteo)
WEATHER_PROVIDER=open-meteo

# 2. Official Agmarknet / e-NAM Live Feed (Register at https://data.gov.in)
DATA_GOV_IN_API_KEY=your_registered_data_gov_in_api_key

# 3. Google Gemini Multimodal Vision & Chat (Get key at https://aistudio.google.com)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# 4. Supabase Managed PostgreSQL & Storage (Create project at https://supabase.com)
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=crop-field-media
```
