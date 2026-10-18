# KrishakDrishti (कृषक दृष्टि)
### Multilingual Agricultural Intelligence & Farmer Assistance Platform

KrishakDrishti is a production-oriented agricultural operating MVP for Indian farmers, Farmer Producer Organizations (FPOs), agricultural experts, and extension officers. Designed for low digital literacy, mobile-first usage, and slow rural cellular connectivity, the system supports 22 official Indian languages, on-farm IoT telemetry, satellite & drone GIS mapping, live APMC Mandi market intelligence, microclimate weather risk alerts, and AI-driven crop pathology diagnostics.

---

## 🌾 Core Features & Architectural Modules

1. **Dashboard Shell**: Real-time KPI summaries of registered acreage, live local weather radar, daily APMC modal prices, IoT telemetry streams, active severe weather risks, and recent AI pathology observations.
2. **My Profile & Farm Parcels**: Persistent farmer profile, 22 Indian language selection, location consent, SMS/Voice/WhatsApp alert dispatch permissions, and multi-field parcel registry with sowing dates and crop growth stages.
3. **Crop Health & Multimodal Diagnostics**: Upload foliar photographs or inspect connected camera streams. Evaluated via Google Gemini Multimodal AI (`gemini-2.5-flash`) with structured visual evidence, confidence scoring, non-chemical actionable steps, farmer follow-up questions, safety disclaimers, and automated escalation to FPO expert desks.
4. **Field GIS Mapping & Drone Orthomosaics**: Interactive Leaflet satellite map displaying WGS84 GeoJSON field boundaries, drone orthomosaic raster overlays (RGB & NDVI vigour), IoT sensor nodes, and georeferenced crop issue pins. Includes an explicit bounding-box alignment workflow for aerial imagery.
5. **Live Mandi Intelligence**: Agmarknet & state marketing board daily modal/min/max prices, inter-market arbitrage comparisons (e.g. Lasalgaon vs. Pimpalgaon vs. Azadpur), and 7-day price trajectory charts.
6. **Microclimate Radar & Risk Alerts**: Real-time Open-Meteo & IMD high-resolution weather, 7-day agricultural forecasts, automated agronomic risk rules (heavy rain, extreme heatwave, wind lodging, root-zone moisture stress), and cooldown deduplication preventing alert spam.
7. **Hardware & IoT Telemetry**: Secure device provisioning for ESP32-CAM optical traps and soil moisture/NPK RS485 sensors, live telemetry stream charts, and an agronomic hardware simulator modeling physical diurnal cycles.
8. **Persistent Multilingual AI Assistant**: Floating/docked chat assistant powered by Gemini AI, grounded with real farmer context, live weather, and Mandi rates, featuring Web Speech API text-to-speech (TTS) and speech-to-text (STT).
9. **FPO Coordinator Hub**: Role-based triage desk for FPO leaders to oversee member farmer holdings, review consented field records, assign crop disease cases to agricultural experts (e.g. PAU/ICAR officers), and track status.
10. **Independent Voice Hotline (IVR) & WhatsApp Gateway**: Dedicated toll-free IVR workflow (TwiML) with language selection keypad, weather/mandi voice readouts, spoken question transcription, and WhatsApp Business API webhook module with interactive development sandbox runners.

---

## 🛠 Technology Stack

- **Web Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, Leaflet
- **Core Backend**: Node.js, Express.js REST APIs, Socket.IO
- **Database & Persistence**: Supabase PostgreSQL with Row Level Security (RLS) schemas; resilient local JSON persistence bridge for offline/local development
- **AI Diagnostics & Assistant**: Google Gemini API (`@google/genai`, `gemini-2.5-flash`) with agricultural pathology engine fallback
- **Weather Provider**: Open-Meteo High-Resolution Agricultural Weather & IMD Numerical Weather Prediction
- **Market Data**: Agmarknet / Directorate of Marketing & Inspection (DMI) & e-NAM
- **Voice & IVR**: Twilio / Exotel TwiML Gateway with interactive sandbox simulator

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js v18+ (tested on Node.js v24)
- npm v9+

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

### 3. Running Backend Tests
Execute the automated test suite verifying persistence, weather, mandi benchmarks, AI pathology, alert cooldowns, IoT ingestion, voice IVR, and FPO workflows:
```bash
cd backend
npm test
```

### 4. Running the Development Servers
In two separate terminals:

**Terminal 1 (Backend Core API Hub):**
```bash
cd backend
npm run dev
# Starts on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

**Terminal 2 (Next.js Farmer Web App):**
```bash
cd frontend
npm run dev
# Starts on http://localhost:3000
```

Open `http://localhost:3000` in your web browser.

---

## 📁 Repository Directory Structure

```
KrishakDrishti/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql         # Supabase PostgreSQL schema with RLS & indexes
│   │   │   └── store.ts            # Persistent data store with Supabase & JSON parity
│   │   ├── routes/
│   │   │   ├── auth.ts             # Profile management & role switcher
│   │   │   ├── farms.ts            # Farms & fields GeoJSON boundaries
│   │   │   ├── cropHealth.ts       # Crop image upload & AI pathology
│   │   │   ├── weather.ts          # Open-Meteo forecast & agronomic risk triggers
│   │   │   ├── mandi.ts            # APMC market rates & comparisons
│   │   │   ├── iot.ts              # ESP32-CAM & sensor telemetry ingestion
│   │   │   ├── alerts.ts           # Alert notifications & channel delivery logs
│   │   │   ├── ai.ts               # Conversational AI assistant
│   │   │   ├── fpo.ts              # FPO coordinator workspace & triage
│   │   │   ├── whatsapp.ts         # WhatsApp Business webhook receiver & simulator
│   │   │   └── voice.ts            # Voice IVR hotline webhook & TwiML generator
│   │   ├── services/
│   │   │   ├── weatherService.ts   # Open-Meteo & IMD weather client
│   │   │   ├── mandiService.ts     # Agmarknet market data service
│   │   │   ├── geminiService.ts    # Google Gemini API multimodal vision & agronomy assistant (@google/genai)
│   │   │   ├── mistralService.ts   # Backward compatibility proxy to geminiService
│   │   │   ├── alertEngine.ts      # Agronomic threshold evaluation & cooldown deduplication
│   │   │   ├── iotSimulator.ts     # Physical hardware telemetry simulator
│   │   │   └── voiceService.ts     # Multilingual IVR session state machine
│   │   ├── tests/
│   │   │   └── api.test.ts         # 8 automated unit & integration tests
│   │   └── server.ts               # Express & Socket.IO server entrypoint
│   ├── data/
│   │   └── krishak_db.json         # Local persistent database
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Dashboard screen
│   │   │   ├── profile/page.tsx    # My Profile & Farm Setup screen
│   │   │   ├── crop-health/page.tsx# Crop Health & Image Diagnostics screen
│   │   │   ├── field-map/page.tsx  # Field GIS Mapping & Drone Orthomosaics
│   │   │   ├── mandi/page.tsx      # Live Mandi Intelligence & Comparison screen
│   │   │   ├── weather/page.tsx    # Weather Radar & Risk Alerts screen
│   │   │   ├── devices/page.tsx    # Devices & IoT Monitoring screen
│   │   │   ├── fpo/page.tsx        # FPO Coordinator Workspace screen
│   │   │   ├── layout.tsx          # Root Next.js layout
│   │   │   └── globals.css         # Agricultural design tokens & styling
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Navigation header with 22 languages selector
│   │   │   ├── Sidebar.tsx         # Persistent sidebar navigation
│   │   │   ├── FieldMapComponent.tsx # Leaflet GIS map with drone overlays
│   │   │   ├── AIAssistantModal.tsx# Floating AI chat assistant with TTS/STT
│   │   │   ├── VoiceAssistantModal.tsx # Interactive telephone IVR simulator
│   │   │   └── WhatsAppSimulatorModal.tsx # WhatsApp Business webhook simulator
│   │   ├── context/
│   │   │   └── AppContext.tsx      # React context for language, user, and audio
│   │   ├── i18n/
│   │   │   └── languages.ts        # 22 official Indian languages dictionary
│   │   └── lib/
│   │       └── api.ts              # API client wrapper
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── .env.example
└── README.md
```
