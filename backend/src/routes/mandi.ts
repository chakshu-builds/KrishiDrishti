import { Router, Request, Response } from 'express';
import { mandiService } from '../services/mandiService.js';

const router = Router();

// Query mandi prices with filters
router.get('/mandi', async (req: Request, res: Response) => {
  try {
    const commodity = req.query.commodity as string | undefined;
    const state = req.query.state as string | undefined;
    const district = req.query.district as string | undefined;
    const market = req.query.market as string | undefined;

    const result = await mandiService.getMandiPrices({
      commodity,
      state,
      district,
      market,
    });

    const commodities = mandiService.getCommodityList();
    const states = mandiService.getStateList();
    const markets = mandiService.getMarketList();

    return res.json({
      ...result,
      availableFilters: {
        commodities,
        states,
        markets,
      },
    });
  } catch (err: any) {
    console.error('[MandiRoute] Error retrieving prices:', err);
    return res.status(500).json({ error: 'Failed to retrieve mandi prices', details: err.message });
  }
});

// Compare multiple markets for a single commodity
router.get('/mandi/compare', async (req: Request, res: Response) => {
  try {
    const commodity = (req.query.commodity as string) || 'Onion';
    const result = await mandiService.getMandiPrices({ commodity });

    // Group by market
    const comparison = result.records.map((r) => ({
      market: r.market,
      state: r.state,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      modalPrice: r.modalPrice,
      variety: r.variety,
      arrivalQuantityQuintals: r.arrivalQuantityQuintals,
      observationDate: r.observationDate,
    }));

    return res.json({
      commodity,
      comparison,
      sourceAttribution: result.sourceAttribution,
      isLiveFeed: result.isLiveFeed,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Market comparison failed', details: err.message });
  }
});

export default router;
