import test, { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GeminiService } from '../services/geminiService.js';
import { store } from '../db/store.js';

describe('Google Gemini Multimodal Crop-Health Diagnostic Suite', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService();
  });

  afterEach(() => {
    service.setClient(null);
  });

  // 1. Successful Mocked Response
  it('1. Successful mocked response returns structured pathology output with live provider metadata', async () => {
    const mockResponsePayload = {
      cropDetected: 'Basmati Rice (Oryza sativa)',
      primaryIssue: 'Bacterial Leaf Blight (Xanthomonas oryzae pv. oryzae)',
      severity: 'high',
      confidencePct: 87.5,
      visibleEvidence: 'Wavy translucent water-soaked streaks turning necrotic yellow along leaf margins.',
      actionableSteps: [
        'Drain excess standing water from the paddy field to lower microclimate humidity.',
        'Delay scheduled top-dressing of urea; excess nitrogen exacerbates bacterial leaf lesion expansion.',
        'Consult the local Krishi Vigyan Kendra (KVK) for regional bio-control guidelines.',
      ],
      preventativeMeasures: [
        'Use certified disease-free seed and soak in PAU-recommended bio-agent solution.',
        'Maintain balanced potassium fertilization to bolster plant cell wall thickness.',
      ],
      disclaimer: 'AI preliminary observation based on optical visual patterns. Never treat as confirmed lab diagnosis. Confirm with Krishi Vigyan Kendra (KVK) officer before applying chemical controls.',
      escalationNeeded: true,
      escalationNotes: 'High severity foliar lesion identified. Queued for district KVK expert inspection.',
      followUpQuestions: [
        'Are leaf margins displaying yellow-orange wavy margins starting from leaf tips?',
        'Was high nitrogen applied shortly before these symptoms surfaced?',
      ],
    };

    service.setClient({
      models: {
        generateContent: async (_params: any) => ({
          text: JSON.stringify(mockResponsePayload),
        }),
      },
    });

    const result = await service.analyzeCropImage({
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
      cropName: 'Basmati Rice',
    });

    assert.strictEqual(result.provider, 'gemini', 'Must tag live provider as gemini');
    assert.strictEqual(result.dataStatus, 'live', 'Must tag live provider status as live');
    assert.strictEqual(result.cropDetected, 'Basmati Rice (Oryza sativa)');
    assert.strictEqual(result.primaryIssue, 'Bacterial Leaf Blight (Xanthomonas oryzae pv. oryzae)');
    assert.strictEqual(result.severity, 'high');
    assert.strictEqual(result.confidencePct, 87.5);
    assert.strictEqual(result.escalationNeeded, true);
    assert.ok(Array.isArray(result.actionableSteps));
    assert.ok(result.actionableSteps.length >= 3);
    assert.ok(result.disclaimer.includes('KVK'), 'Disclaimer must mention KVK validation');
  });

  // 2. Image Bytes & MIME Forwarding Verification
  it('2. Forwards actual image bytes and MIME type in inlineData payload to Gemini API', async () => {
    let capturedParams: any = null;
    const testMimeType = 'image/webp';
    const rawBuffer = Buffer.from('RIFF....WEBPVP8 ...fake-image-bytes...');
    const expectedBase64 = rawBuffer.toString('base64');

    service.setClient({
      models: {
        generateContent: async (params: any) => {
          capturedParams = params;
          return {
            text: JSON.stringify({
              cropDetected: 'Wheat',
              primaryIssue: 'Early Stripe Rust',
              severity: 'moderate',
              confidencePct: 82,
              visibleEvidence: 'Linear chlorotic pustules',
              actionableSteps: ['Isolate sample and send to KVK'],
              preventativeMeasures: ['Crop rotation'],
              disclaimer: 'Preliminary KVK advisory',
              escalationNeeded: true,
              followUpQuestions: ['Has humidity been high?'],
            }),
          };
        },
      },
    });

    await service.analyzeCropImage({
      imageBuffer: rawBuffer,
      mimeType: testMimeType,
      cropName: 'Wheat',
    });

    assert.ok(capturedParams, 'client.models.generateContent should have been called');
    assert.strictEqual(capturedParams.model, service.getModel());
    assert.ok(Array.isArray(capturedParams.contents), 'contents must be an array');
    const userMessage = capturedParams.contents[0];
    assert.strictEqual(userMessage.role, 'user');
    assert.ok(Array.isArray(userMessage.parts), 'parts must be an array');

    // Part 0 is prompt text, Part 1 is inlineData
    const textPart = userMessage.parts.find((p: any) => p.text);
    const inlinePart = userMessage.parts.find((p: any) => p.inlineData);

    assert.ok(textPart, 'Text prompt part must be present');
    assert.ok(inlinePart, 'Inline image data part must be present');
    assert.strictEqual(inlinePart.inlineData.mimeType, testMimeType, 'MIME type must be preserved');
    assert.strictEqual(inlinePart.inlineData.data, expectedBase64, 'Raw image base64 bytes must be forwarded');

    // Verify structured JSON format is requested
    assert.strictEqual(capturedParams.config?.responseMimeType, 'application/json');
  });

  // 3. Missing Credentials Handling
  it('3. Transparently falls back to agronomic pathology engine when credentials are unconfigured', async () => {
    service.setClient(null); // Ensure no mock client

    const result = await service.analyzeCropImage({
      imageBase64: 'dGVzdA==',
      cropName: 'Wheat',
    });

    assert.strictEqual(result.provider, 'offline_pathology_engine', 'Must label unconfigured provider as offline engine');
    assert.strictEqual(result.dataStatus, 'fallback', 'Must label data status as fallback');
    assert.strictEqual(result.modelUsed, 'agronomic-rules-v1');
    assert.ok(result.primaryIssue.includes('Yellow Stripe Rust'));
    assert.ok(result.disclaimer.includes('KVK') || result.disclaimer.includes('PAU'));
    assert.strictEqual(typeof result.confidencePct, 'number');
    assert.ok(result.confidencePct < 100, 'Optical confidence must never claim 100%');
  });

  // 4. HTTP / API Error Handling
  it('4. Gracefully catches HTTP 500 error from provider and safely routes to fallback engine', async () => {
    service.setClient({
      models: {
        generateContent: async () => {
          throw new Error('Google Generative AI 500 Internal Server Error: backend timeout');
        },
      },
    });

    const result = await service.analyzeCropImage({
      imageBase64: 'dGVzdA==',
      cropName: 'Onion',
    });

    assert.strictEqual(result.provider, 'offline_pathology_engine', 'Must safely fall back on HTTP 500');
    assert.strictEqual(result.dataStatus, 'fallback', 'Data status must be fallback');
    assert.ok(result.fallbackReason?.includes('500'), 'Fallback reason should record the error');
    assert.ok(result.primaryIssue.includes('Alternaria Purple Blotch'));
  });

  // 5. Quota / Rate Limit (HTTP 429) Handling
  it('5. Handles quota exhaustion (429 / ResourceExhausted) transparently without throwing', async () => {
    service.setClient({
      models: {
        generateContent: async () => {
          const quotaErr = new Error('[GoogleGenAI Error]: 429 Too Many Requests - ResourceExhausted: Quota exceeded for gemini-2.5-flash');
          throw quotaErr;
        },
      },
    });

    const result = await service.analyzeCropImage({
      imageBase64: 'dGVzdA==',
      cropName: 'Wheat',
    });

    assert.strictEqual(result.provider, 'offline_pathology_engine');
    assert.strictEqual(result.dataStatus, 'fallback');
    assert.ok(result.fallbackReason?.includes('Quota') || result.fallbackReason?.includes('429'));
    assert.ok(result.actionableSteps.length > 0);
  });

  // 6. Malformed JSON Response Handling
  it('6. Catches malformed or unparseable JSON from model and triggers safe fallback', async () => {
    service.setClient({
      models: {
        generateContent: async () => ({
          text: 'I observed the crop leaf and here is the result: { cropDetected: "Wheat", broken-json-here',
        }),
      },
    });

    const result = await service.analyzeCropImage({
      imageBase64: 'dGVzdA==',
      cropName: 'Field Crop',
    });

    assert.strictEqual(result.provider, 'offline_pathology_engine');
    assert.strictEqual(result.dataStatus, 'fallback');
    assert.ok(result.primaryIssue);
  });

  // 7. Fallback Transparency & Mandatory Disclaimer Preservation
  it('7. Enforces non-chemical cultural steps and mandatory KVK/ICAR consultation disclaimers', async () => {
    // When model omits disclaimer or gives chemical advice without disclaimer
    service.setClient({
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            cropDetected: 'Mustard',
            primaryIssue: 'White Rust (Albugo candida)',
            severity: 'moderate',
            confidencePct: 79,
            visibleEvidence: 'White blister-like pustules on lower leaf surface.',
            actionableSteps: ['Rogue out affected plants'],
            preventativeMeasures: ['Crop rotation'],
            disclaimer: '', // Empty disclaimer
            escalationNeeded: false,
            followUpQuestions: ['Are symptoms present on flowers?'],
          }),
        }),
      },
    });

    const result = await service.analyzeCropImage({
      imageBase64: 'dGVzdA==',
      cropName: 'Mustard',
    });

    assert.strictEqual(result.provider, 'gemini');
    assert.strictEqual(result.dataStatus, 'live');
    assert.ok(
      result.disclaimer.includes('KVK') || result.disclaimer.includes('preliminary'),
      'Normalized output must inject mandatory KVK/ICAR disclaimer if omitted'
    );
  });

  // 8. Grounded AI Assistant Chat with Fallback
  it('8. Chat Assistant provides localized agricultural advice grounded in farmer context', async () => {
    const farmer = store.getProfileById('usr-farmer-001');
    const fields = store.getFields(undefined, 'usr-farmer-001');

    // Test Punjabi localized weather query fallback
    const resPa = await service.chatWithAssistant({
      message: 'ਕੀ ਅੱਜ ਮੀਂਹ ਪਵੇਗਾ?',
      farmerContext: farmer,
      fields,
      preferredLanguage: 'pa',
    });
    assert.ok(resPa.reply.includes('ਮੀਂਹ') || resPa.reply.includes('ਮੌਸਮ'));
    assert.ok(resPa.suggestedActions.length > 0);

    // Test Hindi Mandi query fallback
    const resHi = await service.chatWithAssistant({
      message: 'आज गेहूं का मंडी भाव क्या है?',
      farmerContext: farmer,
      fields,
      preferredLanguage: 'hi',
    });
    assert.ok(resHi.reply.includes('गेहूं') || resHi.reply.includes('भाव'));
    assert.ok(resHi.linksToScreens.some((l) => l.href === '/mandi'));
  });
});
