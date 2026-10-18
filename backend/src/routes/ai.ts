import { Router, Request, Response } from 'express';
import { geminiService } from '../services/geminiService.js';
import { weatherService } from '../services/weatherService.js';
import { mandiService } from '../services/mandiService.js';
import { store } from '../db/store.js';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, farmerId, preferredLanguage } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const currentFarmerId = farmerId || 'usr-farmer-001';
    const farmer = store.getProfileById(currentFarmerId);
    const fields = store.getFields(undefined, currentFarmerId);

    // Retrieve active live context
    const weather = await weatherService.getWeather(30.901, 75.8573, 'Farm Center');
    const mandi = await mandiService.getMandiPrices({ commodity: 'All' });

    const response = await geminiService.chatWithAssistant({
      message,
      farmerContext: farmer,
      fields,
      weather,
      mandiRecords: mandi.records,
      preferredLanguage: preferredLanguage || farmer?.preferredLanguage,
    });

    return res.json({
      ...response,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[AIRoute] Chat failed:', err);
    return res.status(500).json({ error: 'AI Assistant query failed', details: err.message });
  }
});

export default router;
