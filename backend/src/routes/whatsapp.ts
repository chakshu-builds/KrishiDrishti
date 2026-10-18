import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';
import { mistralService } from '../services/mistralService.js';
import { weatherService } from '../services/weatherService.js';
import { mandiService } from '../services/mandiService.js';

const router = Router();

// Meta / WhatsApp Webhook verification handshake
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'krishak_drishti_verify_token';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsAppWebhook] Webhook verified successfully.');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Webhook verification token mismatch' });
});

async function processWhatsAppPayload(body: any) {
  // Standard Meta Cloud API entry
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return { status: 'ignored_or_status_receipt' };
  }

  const fromNumber = message.from || '919876543210';
  const messageType = message.type || 'text';

  // Match farmer profile
  const profile = store.getProfiles().find(
    (p) => p.phoneNumber.replace(/[^0-9]/g, '').endsWith(fromNumber.slice(-10))
  );
  const farmerId = profile?.id || 'usr-farmer-001';
  const lang = profile?.preferredLanguage || 'hi';

  let responseText = '';

  if (messageType === 'text') {
    const textBody = message.text?.body || '';
    const fields = store.getFields(undefined, farmerId);
    const weather = await weatherService.getWeather(30.901, 75.8573, 'Farm Center');
    const mandi = await mandiService.getMandiPrices({ commodity: 'All' });

    const aiRes = await mistralService.chatWithAssistant({
      message: textBody,
      farmerContext: profile,
      fields,
      weather,
      mandiRecords: mandi.records,
      preferredLanguage: lang,
    });

    responseText = aiRes.reply;
  } else if (messageType === 'image') {
    // Farmer sent a field photograph
    const fields = store.getFields(undefined, farmerId);
    const diagnosis = await mistralService.analyzeCropImage({
      cropName: fields[0]?.cropName || 'Field Crop',
      field: fields[0],
      farmer: profile,
      notes: 'Received via WhatsApp Business Channel',
    });

    const saved = store.addCropDiagnosis({
      ...diagnosis,
      fieldId: fields[0]?.id || 'field-101',
      farmerId,
      source: 'whatsapp',
    });

    responseText = `🌾 *कृषक दृष्टि फसल विश्लेषण (KrishakDrishti AI)*\n\n` +
      `• *फसल*: ${saved.cropDetected}\n` +
      `• *लक्षण / समस्या*: ${saved.primaryIssue}\n` +
      `• *गंभीरता*: ${saved.severity.toUpperCase()} (${saved.confidencePct}% सटीकता)\n\n` +
      `*प्राथमिक कदम:*\n` +
      saved.actionableSteps.map((s) => `• ${s}`).join('\n') +
      `\n\n⚠️ _${saved.disclaimer}_`;
  }

  return {
    status: 'success',
    from: fromNumber,
    farmerName: profile?.fullName || 'Guest Farmer',
    replySent: responseText,
  };
}

// Incoming message webhook receiver
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await processWhatsAppPayload(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[WhatsAppWebhook] Ingestion error:', err);
    return res.status(500).json({ error: 'WhatsApp webhook processing failed' });
  }
});

// Interactive Simulator endpoint for UI / dev testing
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { senderNumber, text, hasImage, imageUrl } = req.body;
    const mockPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUS_ACC_01',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '+919999000111', phone_number_id: 'DEV_PNID_01' },
                contacts: [{ wa_id: senderNumber || '919876543210' }],
                messages: [
                  hasImage
                    ? {
                        from: senderNumber || '919876543210',
                        id: `wamid_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'image',
                        image: { id: 'media_mock_01', mime_type: 'image/jpeg', url: imageUrl },
                      }
                    : {
                        from: senderNumber || '919876543210',
                        id: `wamid_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'text',
                        text: { body: text || 'What is the mandi price of wheat today?' },
                      },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const result = await processWhatsAppPayload(mockPayload);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[WhatsAppSimulator] Processing error:', err);
    return res.status(500).json({ error: 'WhatsApp simulation failed' });
  }
});

export default router;
