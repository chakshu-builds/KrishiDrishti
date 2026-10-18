import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';

const router = Router();

// GET /api/marketplace/listings: Retrieve verified farmer crop produce listings
router.get('/listings', (req: Request, res: Response) => {
  try {
    const cropName = req.query.crop as string | undefined;
    const state = req.query.state as string | undefined;
    const listingType = req.query.type as string | undefined;
    const status = (req.query.status as string) || 'active';

    const listings = store.getCropListings({
      cropName,
      state,
      listingType,
      status: status === 'all' ? undefined : status,
    });

    // Compute marketplace overview statistics
    const totalQuintals = listings.reduce((sum, item) => sum + (item.quantityQuintals || 0), 0);
    const uniqueFarmers = new Set(listings.map((l) => l.farmerId)).size;
    const availableCrops = Array.from(new Set(listings.map((l) => l.cropName)));

    return res.json({
      listings,
      totalCount: listings.length,
      metrics: {
        totalQuintalsAvailable: totalQuintals,
        activeFarmerSellers: uniqueFarmers,
        commoditiesAvailable: availableCrops,
      },
      sourceAttribution: 'KrishakDrishti Verified Farmer-to-Buyer Direct Mandi Marketplace',
      retrievalTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[MarketplaceRoute] Failed to get listings:', err);
    return res.status(500).json({ error: 'Failed to retrieve marketplace listings', details: err.message });
  }
});

// POST /api/marketplace/listings: Farmer creates new crop listing to sell
router.post('/listings', (req: Request, res: Response) => {
  try {
    const {
      farmerId,
      farmerName,
      farmerPhone,
      cropName,
      cropNameHi,
      variety,
      quantityQuintals,
      expectedPricePerQtl,
      apmcModalPrice,
      qualityGrade,
      state,
      district,
      mandi,
      harvestDate,
      imageUrl,
      description,
      listingType,
    } = req.body;

    if (!cropName || !quantityQuintals || !expectedPricePerQtl) {
      return res.status(400).json({
        error: 'Missing required produce listing fields: cropName, quantityQuintals, expectedPricePerQtl',
      });
    }

    const listing = store.createCropListing({
      farmerId: farmerId || 'usr-farmer-001',
      farmerName: farmerName || 'Gurpreet Singh',
      farmerPhone: farmerPhone || '+919876543210',
      cropName,
      cropNameHi: cropNameHi || cropName,
      variety: variety || 'Standard Quality',
      quantityQuintals: Number(quantityQuintals),
      expectedPricePerQtl: Number(expectedPricePerQtl),
      apmcModalPrice: Number(apmcModalPrice) || Number(expectedPricePerQtl),
      qualityGrade: qualityGrade || 'Grade A (FAQ)',
      state: state || 'Punjab',
      district: district || 'Ludhiana',
      mandi: mandi || 'Ludhiana APMC',
      harvestDate: harvestDate || new Date().toISOString().split('T')[0],
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
      description,
      listingType: listingType || 'sell',
    });

    return res.status(201).json({
      message: 'Crop listing published successfully to Kisan Marketplace!',
      listing,
    });
  } catch (err: any) {
    console.error('[MarketplaceRoute] Failed to publish listing:', err);
    return res.status(500).json({ error: 'Failed to publish crop listing', details: err.message });
  }
});

// PATCH /api/marketplace/listings/:id/status: Mark listing as negotiating or sold
router.patch('/listings/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'negotiating', 'sold'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be active, negotiating, or sold.' });
  }

  const updated = store.updateCropListingStatus(id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  return res.json({ message: `Listing status updated to ${status}`, listingId: id, status });
});

// POST /api/marketplace/contact: Initiate direct WhatsApp / Call connection with farmer
router.post('/contact', (req: Request, res: Response) => {
  const { listingId, buyerName, buyerPhone, offerPricePerQtl, requestedQuintals } = req.body;

  const listing = store.getCropListingById(listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Crop listing not found' });
  }

  const cleanPhone = (listing.farmerPhone || '+919876543210').replace(/[^0-9]/g, '');
  const greetingText = `नमस्ते ${listing.farmerName} जी! मुझे KrishakDrishti पर आपकी फसल का विज्ञापन दिखा:\n\n🌾 फसल: ${listing.cropName} (${listing.variety})\n📦 मात्रा: ${requestedQuintals || listing.quantityQuintals} क्विंटल\n💰 आपका भाव: ₹${listing.expectedPricePerQtl}/क्विंटल\n\nमैं इसे खरीदना चाहता हूँ। कृपया बताएं कब बात कर सकते हैं। धन्यवाद! - ${buyerName || 'Buyer'}`;

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greetingText)}`;

  return res.json({
    success: true,
    farmerName: listing.farmerName,
    farmerPhone: listing.farmerPhone,
    whatsappUrl,
    message: 'Buyer inquiry prepared. Direct WhatsApp channel initiated.',
  });
});

export default router;
