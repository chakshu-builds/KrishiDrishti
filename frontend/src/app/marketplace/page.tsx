'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Search,
  Filter,
  Plus,
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
  Scale,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Wheat,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';

const CROP_MODAL_BENCHMARKS: Record<string, { hi: string; modal: number; unit: string; varieties: string[] }> = {
  Wheat: { hi: 'गेहूं', modal: 2425, unit: '₹ / Quintal', varieties: ['Sharbati HD-3086', 'PBW-824', 'HD-3226', 'Desi Bansi'] },
  'Basmati Rice': { hi: 'बासमती धान', modal: 4050, unit: '₹ / Quintal', varieties: ['Pusa 1121', 'Pusa 1509', 'Traditional Basmati', 'CSR 30'] },
  Onion: { hi: 'प्याज', modal: 2220, unit: '₹ / Quintal', varieties: ['Nashik Red', 'Bhima Super', 'Garwa Late'] },
  Mustard: { hi: 'सरसों', modal: 5700, unit: '₹ / Quintal', varieties: ['Pusa Bold', 'Giriraj', 'Yellow Sarson'] },
  'Chickpea / Desi Chana': { hi: 'चना', modal: 5900, unit: '₹ / Quintal', varieties: ['JG-11 Malwa', 'Vishal', 'Kabuli Dollar'] },
  Cotton: { hi: 'कपास (रुई)', modal: 7100, unit: '₹ / Quintal', varieties: ['Shankar-6', 'BT Cotton Hybrid', 'DCH-32'] },
  Soybean: { hi: 'सोयाबीन', modal: 4600, unit: '₹ / Quintal', varieties: ['JS-335', 'JS-9560', 'NRC-37'] },
  Maize: { hi: 'मक्का', modal: 2150, unit: '₹ / Quintal', varieties: ['African Tall', 'Pioneer 30V92', 'DeKalb Hybrid'] },
  Potato: { hi: 'आलू', modal: 1450, unit: '₹ / Quintal', varieties: ['Kufri Pukhraj', 'Kufri Jyoti', 'Lady Rosetta'] },
};

export default function MarketplacePage() {
  const { profile } = useApp();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [listings, setListings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalQuintalsAvailable: 1125,
    activeFarmerSellers: 6,
    commoditiesAvailable: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedState, setSelectedState] = useState('All');

  // Sell produce form state
  const [formCrop, setFormCrop] = useState('Wheat');
  const [formVariety, setFormVariety] = useState('Sharbati HD-3086');
  const [formQty, setFormQty] = useState<number>(100);
  const [formPrice, setFormPrice] = useState<number>(2450);
  const [formGrade, setFormGrade] = useState<'Grade A (FAQ)' | 'Grade B' | 'Certified Organic' | 'Premium Sharbati'>('Premium Sharbati');
  const [formState, setFormState] = useState('Punjab');
  const [formDistrict, setFormDistrict] = useState('Ludhiana');
  const [formMandi, setFormMandi] = useState('Jagraon APMC Mandi');
  const [formDescription, setFormDescription] = useState('High-density, golden grain with 11.2% moisture. Stored in covered dry warehouse.');
  const [formPhone, setFormPhone] = useState(profile?.phoneNumber || '+919876543210');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await api.getMarketplaceListings({
        crop: selectedCrop !== 'All' ? selectedCrop : undefined,
        state: selectedState !== 'All' ? selectedState : undefined,
      });
      setListings(res.listings || []);
      if (res.metrics) setMetrics(res.metrics);
    } catch (err) {
      console.error('Failed to load marketplace listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [selectedCrop, selectedState]);

  // Handle produce sell submit
  const handlePublishListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cropMeta = CROP_MODAL_BENCHMARKS[formCrop] || { hi: formCrop, modal: formPrice };
      await api.createMarketplaceListing({
        farmerId: profile?.id || 'usr-farmer-001',
        farmerName: profile?.fullName || 'Gurpreet Singh',
        farmerPhone: formPhone,
        cropName: formCrop,
        cropNameHi: cropMeta.hi,
        variety: formVariety,
        quantityQuintals: Number(formQty),
        expectedPricePerQtl: Number(formPrice),
        apmcModalPrice: cropMeta.modal,
        qualityGrade: formGrade,
        state: formState,
        district: formDistrict,
        mandi: formMandi,
        description: formDescription,
        listingType: 'sell',
      });

      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 5000);
      setActiveTab('buy');
      loadListings();
    } catch (err: any) {
      alert(`Error publishing listing: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactFarmer = async (listing: any) => {
    try {
      const res = await api.contactMarketplaceSeller({
        listingId: listing.id,
        buyerName: profile?.fullName || 'Interested Buyer',
        buyerPhone: profile?.phoneNumber || '+919876543210',
        requestedQuintals: listing.quantityQuintals,
      });
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to initiate contact:', err);
    }
  };

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.cropName.toLowerCase().includes(q) ||
      (item.cropNameHi && item.cropNameHi.includes(q)) ||
      item.variety.toLowerCase().includes(q) ||
      item.district.toLowerCase().includes(q) ||
      item.farmerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-bold text-agri-text-primary">
              Kisan Mandi Marketplace (फसल खरीद व बिक्री)
            </h2>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Direct APMC Benchmark</span>
            </span>
          </div>
          <p className="text-xs md:text-sm text-agri-text-secondary">
            Peer-to-peer agricultural commodity marketplace. Direct farmer-to-buyer transactions with zero commission.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-agri-bg p-1 rounded-xl border border-agri-border shrink-0">
          <button
            onClick={() => setActiveTab('buy')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'buy'
                ? 'bg-agri-green text-white shadow-xs'
                : 'text-agri-text-secondary hover:text-agri-text-primary'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Browse Crops (फसल खरीदें)</span>
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'sell'
                ? 'bg-agri-green text-white shadow-xs'
                : 'text-agri-text-secondary hover:text-agri-text-primary'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sell Produce (फसल बेचें)</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {publishSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">
            आपकी फसल सफलतापूर्वक लिस्ट हो गई है! खरीदार और FPOs अब आपसे सीधे संपर्क कर सकते हैं।
          </span>
        </div>
      )}

      {/* Marketplace Aggregate Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-agri-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-agri-text-muted uppercase">Available Produce</span>
          <div className="text-2xl font-black text-agri-text-primary">
            {metrics.totalQuintalsAvailable?.toLocaleString() || 1125} <span className="text-xs font-normal text-agri-text-muted">Quintals</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Ready for immediate pickup</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-agri-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-agri-text-muted uppercase">Verified Sellers</span>
          <div className="text-2xl font-black text-agri-text-primary">
            {metrics.activeFarmerSellers || 6} <span className="text-xs font-normal text-agri-text-muted">Farmers / FPOs</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Direct phone / WhatsApp verified</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-agri-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-agri-text-muted uppercase">Active Commodities</span>
          <div className="text-2xl font-black text-agri-text-primary">
            {metrics.commoditiesAvailable?.length || 6} <span className="text-xs font-normal text-agri-text-muted">Crops</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Wheat, Basmati, Onion, Mustard...</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-agri-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-agri-text-muted uppercase">Intermediation Fee</span>
          <div className="text-2xl font-black text-emerald-700">
            0% <span className="text-xs font-normal text-agri-text-muted">Commission</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">100% money goes to the farmer</span>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* TAB 1: BROWSE PRODUCE TO BUY                                */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'buy' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-agri-border p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search input */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by crop, variety, farmer name, or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 bg-agri-bg/50"
                />
              </div>

              {/* Commodity filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 bg-white font-medium"
                >
                  <option value="All">All Commodities (सभी फसलें)</option>
                  {Object.keys(CROP_MODAL_BENCHMARKS).map((c) => (
                    <option key={c} value={c}>
                      {c} ({CROP_MODAL_BENCHMARKS[c].hi})
                    </option>
                  ))}
                </select>
              </div>

              {/* State filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 bg-white font-medium"
                >
                  <option value="All">All States (सभी राज्य)</option>
                  <option value="Punjab">Punjab (पंजाब)</option>
                  <option value="Haryana">Haryana (हरियाणा)</option>
                  <option value="Rajasthan">Rajasthan (राजस्थान)</option>
                  <option value="Madhya Pradesh">Madhya Pradesh (मध्य प्रदेश)</option>
                  <option value="Maharashtra">Maharashtra (महाराष्ट्र)</option>
                  <option value="Gujarat">Gujarat (गुजरात)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Produce Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-agri-border p-12 text-center text-xs text-agri-text-muted space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-stone-300" />
                <div className="font-bold text-sm text-agri-text-primary">No crop listings match this search</div>
                <p>Try clearing filters or search query to see all verified produce.</p>
              </div>
            ) : (
              filteredListings.map((listing) => {
                const diff = listing.expectedPricePerQtl - listing.apmcModalPrice;
                const isUnderModal = diff < 0;
                const isBuyerRequest = listing.listingType === 'buy_request';

                return (
                  <div
                    key={listing.id}
                    className="bg-white rounded-2xl border border-agri-border p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
                  >
                    {/* Top Badges */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-base text-agri-text-primary">
                              {listing.cropName}
                            </span>
                            <span className="text-xs text-agri-text-muted font-medium">
                              ({listing.cropNameHi})
                            </span>
                          </div>
                          <div className="text-xs text-agri-green font-semibold mt-0.5">
                            {listing.variety}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase ${
                            isBuyerRequest
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isBuyerRequest ? 'Buyer Request' : listing.qualityGrade}
                        </span>
                      </div>

                      {/* Pricing Block */}
                      <div className="p-3 rounded-xl bg-agri-bg border border-agri-border space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-agri-text-muted">Asking Price:</span>
                          <span className="text-xl font-extrabold text-agri-text-primary">
                            ₹{listing.expectedPricePerQtl.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-agri-text-muted">/ Quintal</span>
                          </span>
                        </div>

                        {/* Modal benchmark comparison */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-agri-border/60">
                          <span className="text-agri-text-muted">APMC Modal Rate:</span>
                          <span className="font-semibold text-stone-700">
                            ₹{listing.apmcModalPrice.toLocaleString()} / qtl
                          </span>
                        </div>

                        {isUnderModal ? (
                          <div className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            <span>₹{Math.abs(diff)} below APMC Benchmark (High Value Deal!)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-700 font-medium">
                            Premium / organic lot benchmark
                          </div>
                        )}
                      </div>

                      {/* Details & Specs */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-agri-text-secondary">
                          <span className="text-[11px] text-agri-text-muted">Available Quantity:</span>
                          <span className="font-bold text-agri-text-primary">
                            {listing.quantityQuintals} Quintals ({(listing.quantityQuintals * 0.1).toFixed(1)} MT)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-agri-text-secondary">
                          <span className="text-[11px] text-agri-text-muted">Location & Mandi:</span>
                          <span className="font-medium text-stone-700 flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-agri-green" />
                            <span>
                              {listing.district}, {listing.state}
                            </span>
                          </span>
                        </div>

                        {listing.description && (
                          <p className="text-[11px] text-agri-text-secondary line-clamp-2 pt-1 border-t border-agri-border/50">
                            {listing.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Farmer Profile & Contact Actions */}
                    <div className="pt-4 border-t border-agri-border mt-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-stone-900">{listing.farmerName}</div>
                          <div className="text-[10px] text-agri-text-muted font-mono">{listing.mandi}</div>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Verified Farmer
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleContactFarmer(listing)}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-white" />
                          <span>WhatsApp</span>
                        </button>

                        <a
                          href={`tel:${listing.farmerPhone}`}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-agri-bg text-agri-text-primary border border-agri-border text-xs font-bold transition-all shadow-2xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-agri-green" />
                          <span>Call Seller</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 2: SELL YOUR PRODUCE FORM                               */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'sell' && (
        <div className="bg-white rounded-2xl border border-agri-border p-6 shadow-xs max-w-3xl mx-auto space-y-6">
          <div>
            <h3 className="font-bold text-lg text-agri-text-primary">
              List Your Harvest for Sale (अपनी फसल का विवरण दर्ज करें)
            </h3>
            <p className="text-xs text-agri-text-secondary">
              Reach thousands of verified institutional buyers, rice mills, FPOs, and APMC traders directly with zero middlemen fee.
            </p>
          </div>

          <form onSubmit={handlePublishListing} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Crop selection */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Crop Name (फसल का नाम) *
                </label>
                <select
                  value={formCrop}
                  onChange={(e) => {
                    const c = e.target.value;
                    setFormCrop(c);
                    const meta = CROP_MODAL_BENCHMARKS[c];
                    if (meta) {
                      setFormVariety(meta.varieties[0] || 'Standard');
                      setFormPrice(meta.modal);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 bg-white font-medium"
                >
                  {Object.keys(CROP_MODAL_BENCHMARKS).map((c) => (
                    <option key={c} value={c}>
                      {c} ({CROP_MODAL_BENCHMARKS[c].hi})
                    </option>
                  ))}
                </select>
              </div>

              {/* Variety selection */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Variety (किस्म / वेरायटी) *
                </label>
                <input
                  type="text"
                  value={formVariety}
                  onChange={(e) => setFormVariety(e.target.value)}
                  placeholder="e.g. Sharbati HD-3086, Pusa 1121"
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
                  required
                />
              </div>

              {/* Quantity (Quintals) */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Total Quantity (क्विंटल में मात्रा) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-agri-text-muted">
                    Quintals
                  </span>
                </div>
              </div>

              {/* Asking Price per Quintal */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Asking Price per Quintal (अपेक्षित भाव ₹/क्विंटल) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="500"
                    max="50000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 font-bold text-agri-text-primary"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-agri-text-muted">
                    ₹ / qtl
                  </span>
                </div>
                {CROP_MODAL_BENCHMARKS[formCrop] && (
                  <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                    💡 APMC Modal Benchmark: ₹{CROP_MODAL_BENCHMARKS[formCrop].modal} / Quintal
                  </span>
                )}
              </div>

              {/* Quality Grade */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Quality Grade (गुणवत्ता श्रेणी)
                </label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30 bg-white"
                >
                  <option value="Premium Sharbati">Premium Grade (सर्वोत्तम)</option>
                  <option value="Grade A (FAQ)">Grade A - Fair Average Quality (FAQ)</option>
                  <option value="Certified Organic">Certified Organic (जैविक)</option>
                  <option value="Grade B">Grade B (मानक)</option>
                </select>
              </div>

              {/* State & District */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  State & District (राज्य व जिला)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="State"
                    className="px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
                  />
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="District"
                    className="px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
                  />
                </div>
              </div>

              {/* Mandi Name */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Nearest APMC Mandi (नजदीकी मंडी)
                </label>
                <input
                  type="text"
                  value={formMandi}
                  onChange={(e) => setFormMandi(e.target.value)}
                  placeholder="e.g. Jagraon Mandi"
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
                />
              </div>

              {/* Phone / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-agri-text-primary mb-1">
                  Farmer Contact Phone (संपर्क नंबर) *
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
                  required
                />
              </div>
            </div>

            {/* Description & Lot Specifications */}
            <div>
              <label className="block text-xs font-bold text-agri-text-primary mb-1">
                Produce Specifications & Storage Notes (फसल का विवरण)
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mention moisture percentage, sortex cleaned status, bag packing (50kg gunny / jumbo), etc."
                className="w-full px-3 py-2 rounded-xl border border-agri-border text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/30"
              />
            </div>

            {/* Total Estimated Gross Income Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-900 font-semibold block">
                  Estimated Total Lot Valuation (अनुमानित कुल आय):
                </span>
                <div className="text-xl font-extrabold text-emerald-950">
                  ₹{(formQty * formPrice).toLocaleString()}{' '}
                  <span className="text-xs font-normal text-emerald-800">
                    ({formQty} Quintals × ₹{formPrice}/qtl)
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-emerald-800">
                <span>Direct Payment to Farmer</span>
                <div className="font-bold">Zero Mandi Commission</div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('buy')}
                className="px-4 py-2 rounded-xl border border-agri-border bg-white text-xs font-bold text-agri-text-secondary hover:bg-agri-bg transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-agri-green hover:bg-agri-green-hover text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing Listing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Crop for Sale (फसल लिस्ट करें)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
