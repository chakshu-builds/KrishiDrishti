import { Router, Request, Response } from 'express';
import { voiceService } from '../services/voiceService.js';

const router = Router();

// Twilio Voice incoming call webhook
router.post('/incoming', (req: Request, res: Response) => {
  const callerNumber = req.body.From || req.body.callerNumber || '+919876543210';
  const callSid = req.body.CallSid || `sid_${Date.now()}`;
  const { twiml } = voiceService.handleIncomingCall(callerNumber, callSid);

  res.type('text/xml');
  return res.send(twiml);
});

// Step 2: Language Selection
router.post('/select-language', (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || req.body.CallSid || 'default';
  const digit = req.body.Digits || '1';
  const { twiml } = voiceService.handleLanguageSelection(sessionId, digit);

  res.type('text/xml');
  return res.send(twiml);
});

// Step 3: Menu Option Selection
router.post('/menu-select', async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || req.body.CallSid || 'default';
  const lang = (req.query.lang as string) || 'hi';
  const digit = req.body.Digits || '1';

  const twiml = await voiceService.handleMenuSelection(sessionId, digit, lang);
  res.type('text/xml');
  return res.send(twiml);
});

// Step 4: Spoken Question Transcription Processing
router.post('/process-speech', async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || req.body.CallSid || 'default';
  const lang = (req.query.lang as string) || 'hi';
  const speechResult = req.body.SpeechResult || req.body.TranscriptionText || 'फसल में पीला रतुआ लग रहा है, क्या उपाय करें?';

  const twiml = await voiceService.processSpokenQuestion(sessionId, speechResult, lang);
  res.type('text/xml');
  return res.send(twiml);
});

// Interactive Simulator Runner for UI testing without real Twilio billing
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { action, callerNumber, digit, spokenText, language, sessionId } = req.body;
    const sid = sessionId || `sim_session_${Date.now()}`;

    if (action === 'start') {
      const result = voiceService.handleIncomingCall(callerNumber || '+919876543210', sid);
      return res.json({
        sessionId: sid,
        step: 'language_selection',
        promptText: 'कृषक दृष्टि किसान हेल्पलाइन में आपका स्वागत है। हिंदी के लिए 1 दबाएं। ਪੰਜਾਬੀ ਲਈ 2 ਦਬਾਓ। मराठीसाठी 3 दाबा. For English, press 4.',
        options: [
          { digit: '1', label: 'Hindi (हिंदी)' },
          { digit: '2', label: 'Punjabi (ਪੰਜਾਬੀ)' },
          { digit: '3', label: 'Marathi (मराठी)' },
          { digit: '4', label: 'English' },
        ],
        rawTwiml: result.twiml,
      });
    } else if (action === 'select_language') {
      const result = voiceService.handleLanguageSelection(sid, digit || '1');
      const prompts: Record<string, string> = {
        hi: 'मौसम और जोखिम अलर्ट के लिए 1 दबाएं। मंडी भाव के लिए 2 दबाएं। बोलकर प्रश्न पूछने के लिए 3 दबाएं। विशेषज्ञ से संपर्क के लिए 4 दबाएं।',
        pa: 'ਮੌਸਮ ਅਤੇ ਚੇਤਾਵਨੀ ਸੁਣਨ ਲਈ 1 ਦਬਾਓ। ਮੰਡੀ ਦੇ ਭਾਅ ਲਈ 2 ਦਬਾਓ। ਬੋਲ ਕੇ ਸਵਾਲ ਪੁੱਛਣ ਲਈ 3 ਦਬਾਓ। ਮਾਹਿਰ ਨਾਲ ਸੰਪਰਕ ਲਈ 4 ਦਬਾਓ।',
        mr: 'हवामान व सतर्कतेसाठी 1 दाबा. बाजार भाव माहितीसाठी 2 दाबा. बोलून प्रश्न विचारण्यासाठी 3 दाबा. तज्ज्ञांशी संपर्कासाठी 4 दाबा.',
        en: 'Press 1 for Weather Alerts. Press 2 for Mandi Prices. Press 3 to Ask Spoken Question. Press 4 for Expert Callback.',
      };
      return res.json({
        sessionId: sid,
        selectedLanguage: result.lang,
        step: 'main_menu',
        promptText: prompts[result.lang] || prompts.hi,
        options: [
          { digit: '1', label: 'Weather and Risk Alerts' },
          { digit: '2', label: 'Live Mandi Market Prices' },
          { digit: '3', label: 'Ask Spoken Agricultural Question' },
          { digit: '4', label: 'Request FPO Expert Callback' },
        ],
      });
    } else if (action === 'select_menu') {
      const lang = language || 'hi';
      const twiml = await voiceService.handleMenuSelection(sid, digit || '1', lang);
      return res.json({
        sessionId: sid,
        step: digit === '3' ? 'speak_question' : 'completed',
        twiml,
        message: digit === '3' ? 'Please speak or enter your agricultural question.' : 'Information played to caller.',
      });
    } else if (action === 'speak_question') {
      const lang = language || 'hi';
      const twiml = await voiceService.processSpokenQuestion(sid, spokenText || 'मेरी गेहूं की फसल में पीले पत्ते दिख रहे हैं, क्या करूं?', lang);
      const session = voiceService.getSession(sid);
      return res.json({
        sessionId: sid,
        step: 'completed',
        transcription: session?.transcription,
        aiResponse: session?.aiResponse,
        twiml,
      });
    }

    return res.status(400).json({ error: 'Unknown simulation action' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Voice simulator error', details: err.message });
  }
});

export default router;
