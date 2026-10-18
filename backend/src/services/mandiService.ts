import { MandiPriceRecord } from '../types/index.js';

// Benchmark APMC Mandi database for Indian agricultural staples
const BENCHMARK_MANDI_RECORDS: MandiPriceRecord[] = [
  {
    id: 'mandi-wht-khanna',
    commodity: 'Wheat (गेहूं / ਕਣਕ)',
    variety: 'Dara / Lokwan High-Protein',
    state: 'Punjab',
    district: 'Ludhiana',
    market: 'Khanna Grain Market (Asia’s Largest)',
    minPrice: 2275, // MSP benchmark
    maxPrice: 2540,
    modalPrice: 2420,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 3850,
    observationDate: '2026-10-18',
    dataSource: 'Agmarknet Directorate of Marketing & Inspection (DMI)',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 2360 },
      { date: '2026-10-13', modalPrice: 2380 },
      { date: '2026-10-14', modalPrice: 2390 },
      { date: '2026-10-15', modalPrice: 2400 },
      { date: '2026-10-16', modalPrice: 2410 },
      { date: '2026-10-17', modalPrice: 2415 },
      { date: '2026-10-18', modalPrice: 2420 },
    ],
  },
  {
    id: 'mandi-wht-rajkot',
    commodity: 'Wheat (गेहूं / ઘઉં)',
    variety: 'Tukdi Super Grade',
    state: 'Gujarat',
    district: 'Rajkot',
    market: 'Rajkot APMC',
    minPrice: 2320,
    maxPrice: 2680,
    modalPrice: 2510,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 1420,
    observationDate: '2026-10-18',
    dataSource: 'Agmarknet Directorate of Marketing & Inspection (DMI)',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 2480 },
      { date: '2026-10-13', modalPrice: 2490 },
      { date: '2026-10-14', modalPrice: 2500 },
      { date: '2026-10-15', modalPrice: 2495 },
      { date: '2026-10-16', modalPrice: 2505 },
      { date: '2026-10-17', modalPrice: 2510 },
      { date: '2026-10-18', modalPrice: 2510 },
    ],
  },
  {
    id: 'mandi-oni-lasal',
    commodity: 'Onion (कांदा / प्याज)',
    variety: 'Nashik Red Pol Summer',
    state: 'Maharashtra',
    district: 'Nashik',
    market: 'Lasalgaon APMC (Asia’s Primary Onion Hub)',
    minPrice: 1950,
    maxPrice: 2850,
    modalPrice: 2480,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 9200,
    observationDate: '2026-10-18',
    dataSource: 'Maharashtra State Agricultural Marketing Board (MSAMB)',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 2150 },
      { date: '2026-10-13', modalPrice: 2220 },
      { date: '2026-10-14', modalPrice: 2280 },
      { date: '2026-10-15', modalPrice: 2350 },
      { date: '2026-10-16', modalPrice: 2410 },
      { date: '2026-10-17', modalPrice: 2460 },
      { date: '2026-10-18', modalPrice: 2480 },
    ],
  },
  {
    id: 'mandi-oni-pimpal',
    commodity: 'Onion (कांदा / प्याज)',
    variety: 'Nashik Red Medium',
    state: 'Maharashtra',
    district: 'Nashik',
    market: 'Pimpalgaon Baswant APMC',
    minPrice: 1900,
    maxPrice: 2790,
    modalPrice: 2430,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 6500,
    observationDate: '2026-10-18',
    dataSource: 'MSAMB & Agmarknet',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 2120 },
      { date: '2026-10-13', modalPrice: 2180 },
      { date: '2026-10-14', modalPrice: 2250 },
      { date: '2026-10-15', modalPrice: 2310 },
      { date: '2026-10-16', modalPrice: 2380 },
      { date: '2026-10-17', modalPrice: 2420 },
      { date: '2026-10-18', modalPrice: 2430 },
    ],
  },
  {
    id: 'mandi-oni-azad',
    commodity: 'Onion (कांदा / प्याज)',
    variety: 'Terminal Grade Desi',
    state: 'Delhi',
    district: 'North Delhi',
    market: 'Azadpur Terminal Mandi',
    minPrice: 2300,
    maxPrice: 3200,
    modalPrice: 2850,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 11400,
    observationDate: '2026-10-18',
    dataSource: 'Delhi Agricultural Marketing Board (DAMB) / Agmarknet',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 2600 },
      { date: '2026-10-13', modalPrice: 2650 },
      { date: '2026-10-14', modalPrice: 2700 },
      { date: '2026-10-15', modalPrice: 2750 },
      { date: '2026-10-16', modalPrice: 2800 },
      { date: '2026-10-17', modalPrice: 2830 },
      { date: '2026-10-18', modalPrice: 2850 },
    ],
  },
  {
    id: 'mandi-mus-alwar',
    commodity: 'Mustard (सरसों / ਰਾਇ)',
    variety: 'Oil Rich 42% (Bold Seed)',
    state: 'Rajasthan',
    district: 'Alwar',
    market: 'Alwar APMC',
    minPrice: 5350,
    maxPrice: 5850,
    modalPrice: 5620,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 4200,
    observationDate: '2026-10-18',
    dataSource: 'Agmarknet DMI',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 5540 },
      { date: '2026-10-13', modalPrice: 5560 },
      { date: '2026-10-14', modalPrice: 5580 },
      { date: '2026-10-15', modalPrice: 5600 },
      { date: '2026-10-16', modalPrice: 5610 },
      { date: '2026-10-17', modalPrice: 5615 },
      { date: '2026-10-18', modalPrice: 5620 },
    ],
  },
  {
    id: 'mandi-cot-rajkot',
    commodity: 'Cotton (कपास / કપાસ)',
    variety: 'Shankar-6 Long Staple',
    state: 'Gujarat',
    district: 'Rajkot',
    market: 'Rajkot APMC Yard',
    minPrice: 6800,
    maxPrice: 7750,
    modalPrice: 7420,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 5800,
    observationDate: '2026-10-18',
    dataSource: 'Cotton Corporation of India (CCI) & Agmarknet',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 7350 },
      { date: '2026-10-13', modalPrice: 7380 },
      { date: '2026-10-14', modalPrice: 7400 },
      { date: '2026-10-15', modalPrice: 7410 },
      { date: '2026-10-16', modalPrice: 7415 },
      { date: '2026-10-17', modalPrice: 7420 },
      { date: '2026-10-18', modalPrice: 7420 },
    ],
  },
  {
    id: 'mandi-tom-kolar',
    commodity: 'Tomato (टमाटर / ಟೊಮೇಟೊ)',
    variety: 'Hybrid F1 Salad',
    state: 'Karnataka',
    district: 'Kolar',
    market: 'Kolar APMC Yard',
    minPrice: 1200,
    maxPrice: 2100,
    modalPrice: 1650,
    unit: '₹ / Quintal',
    arrivalQuantityQuintals: 14800,
    observationDate: '2026-10-18',
    dataSource: 'Agmarknet DMI & Karnataka Agricultural Portal',
    isLiveFeed: false,
    historicalTrend: [
      { date: '2026-10-12', modalPrice: 1800 },
      { date: '2026-10-13', modalPrice: 1750 },
      { date: '2026-10-14', modalPrice: 1720 },
      { date: '2026-10-15', modalPrice: 1680 },
      { date: '2026-10-16', modalPrice: 1660 },
      { date: '2026-10-17', modalPrice: 1650 },
      { date: '2026-10-18', modalPrice: 1650 },
    ],
  },
];

export class MandiService {
  private records: MandiPriceRecord[] = [...BENCHMARK_MANDI_RECORDS];

  public async getMandiPrices(filters?: {
    commodity?: string;
    state?: string;
    district?: string;
    market?: string;
  }): Promise<{
    records: MandiPriceRecord[];
    total: number;
    sourceAttribution: string;
    isLiveFeed: boolean;
    dataStatus?: string;
    retrievalTime?: string;
    blockerDetails?: string;
  }> {
    const apiKey = process.env.DATA_GOV_IN_API_KEY || process.env.AGMARKNET_API_KEY;

    // If official Data.gov.in API Key is supplied, attempt live fetch from official portal
    if (apiKey && apiKey !== 'your_data_gov_in_api_key' && apiKey.length > 10) {
      try {
        const resourceId = '9ef84268-d588-465a-a308-a864a43d0070';
        let queryUrl = `https://api.data.gov.in/resource/${resourceId}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=50`;
        if (filters?.commodity) {
          queryUrl += `&filters[commodity]=${encodeURIComponent(filters.commodity)}`;
        }
        if (filters?.state) {
          queryUrl += `&filters[state]=${encodeURIComponent(filters.state)}`;
        }

        const res = await fetch(queryUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          if (json.records && Array.isArray(json.records) && json.records.length > 0) {
            const liveRecords: MandiPriceRecord[] = json.records.map((r: any, idx: number) => ({
              id: `live-mandi-${idx}-${r.commodity || 'comm'}`,
              commodity: r.commodity || 'Agricultural Commodity',
              variety: r.variety || 'Standard Grade',
              state: r.state || 'India',
              district: r.district || '',
              market: r.market || 'APMC Yard',
              minPrice: parseFloat(r.min_price) || 0,
              maxPrice: parseFloat(r.max_price) || 0,
              modalPrice: parseFloat(r.modal_price) || 0,
              unit: '₹ / Quintal',
              arrivalQuantityQuintals: parseFloat(r.arrivals) || undefined,
              observationDate: r.arrival_date || new Date().toISOString().split('T')[0],
              retrievalTime: new Date().toISOString(),
              dataSource: 'Data.gov.in Agmarknet API (Official Live Feed)',
              dataStatus: 'live',
              isLiveFeed: true,
            }));

            return {
              records: liveRecords,
              total: liveRecords.length,
              sourceAttribution: 'Ministry of Agriculture & Farmers Welfare, Govt of India (data.gov.in)',
              isLiveFeed: true,
              dataStatus: 'live' as const,
              retrievalTime: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.warn('[MandiService] Real Agmarknet live call failed or timed out, using baseline APMC index:', err);
      }
    }

    // Filter baseline benchmarks
    let filtered = this.records;
    if (filters?.commodity && filters.commodity !== 'All') {
      const q = filters.commodity.toLowerCase();
      filtered = filtered.filter((r) => r.commodity.toLowerCase().includes(q));
    }
    if (filters?.state && filters.state !== 'All') {
      const q = filters.state.toLowerCase();
      filtered = filtered.filter((r) => r.state.toLowerCase().includes(q));
    }
    if (filters?.market && filters.market !== 'All') {
      const q = filters.market.toLowerCase();
      filtered = filtered.filter((r) => r.market.toLowerCase().includes(q));
    }

    const currentIsoTime = new Date().toISOString();
    const mapped = filtered.map((r) => ({
      ...r,
      dataStatus: 'demo_benchmark' as const,
      retrievalTime: currentIsoTime,
      blockerDetails: 'Requires DATA_GOV_IN_API_KEY from https://data.gov.in (Resource ID: 9ef84268-d588-465a-a308-a864a43d0070)',
    }));

    return {
      records: mapped,
      total: mapped.length,
      sourceAttribution: 'Agmarknet DMI & State APMC Mandi Daily Bulletins (Demo Mode - Live Key Configurable)',
      isLiveFeed: false,
      dataStatus: 'demo_benchmark' as const,
      retrievalTime: currentIsoTime,
      blockerDetails: 'Requires DATA_GOV_IN_API_KEY from https://data.gov.in (Resource ID: 9ef84268-d588-465a-a308-a864a43d0070)',
    };
  }

  public async compareMarkets(commodity: string): Promise<Array<{
    market: string;
    state: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    variety: string;
    arrivalQuantityQuintals?: number;
    observationDate: string;
  }>> {
    const result = await this.getMandiPrices({ commodity });
    return result.records.map((r) => ({
      market: r.market,
      state: r.state,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      modalPrice: r.modalPrice,
      variety: r.variety,
      arrivalQuantityQuintals: r.arrivalQuantityQuintals,
      observationDate: r.observationDate,
    }));
  }

  public getCommodityList(): string[] {
    return Array.from(new Set(this.records.map((r) => r.commodity.split(' ')[0])));
  }

  public getStateList(): string[] {
    return Array.from(new Set(this.records.map((r) => r.state)));
  }

  public getMarketList(): string[] {
    return Array.from(new Set(this.records.map((r) => r.market)));
  }
}

export const mandiService = new MandiService();
