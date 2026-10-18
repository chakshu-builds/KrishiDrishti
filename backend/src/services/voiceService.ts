import { store } from '../db/store.js';
import { weatherService } from './weatherService.js';
import { mandiService } from './mandiService.js';
import { geminiService } from './geminiService.js';

export interface IVRCallSession {
  sessionId: string;
  callerNumber: string;
  selectedLanguage: 'hi' | 'pa' | 'mr' | 'en';
  currentStep: 'welcome' | 'menu' | 'question_recording' | 'completed';
  farmerName?: string;
  transcription?: string;
  aiResponse?: string;
  createdAt: string;
}

export class VoiceService {
  private activeSessions: Map<string, IVRCallSession> = new Map();

  public handleIncomingCall(callerNumber: string, callSid: string = `call_${Date.now()}`): { twiml: string; session: IVRCallSession } {
    // Look up registered farmer by phone number
    const profile = store.getProfiles().find((p) => p.phoneNumber === callerNumber || callerNumber.endsWith(p.phoneNumber.replace('+91', '')));
    const lang = (profile?.preferredLanguage as any) || 'hi';

    const session: IVRCallSession = {
      sessionId: callSid,
      callerNumber,
      selectedLanguage: ['hi', 'pa', 'mr', 'en'].includes(lang) ? lang : 'hi',
      currentStep: 'welcome',
      farmerName: profile?.fullName || 'Farmer',
      createdAt: new Date().toISOString(),
    };
    this.activeSessions.set(callSid, session);

    // Generate TwiML Voice XML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="/api/voice/select-language?sessionId=${callSid}" method="POST" timeout="8">
        <Say language="hi-IN">कृषक दृष्टि किसान हेल्पलाइन में आपका स्वागत है। हिंदी के लिए 1 दबाएं।</Say>
        <Say language="pa-IN">ਪੰਜਾਬੀ ਲਈ 2 ਦਬਾਓ।</Say>
        <Say language="mr-IN">मराठीसाठी 3 दाबा।</Say>
        <Say language="en-IN">For English, press 4.</Say>
    </Gather>
    <Redirect>/api/voice/menu?sessionId=${callSid}&amp;lang=${session.selectedLanguage}</Redirect>
</Response>`;

    return { twiml, session };
  }

  public handleLanguageSelection(sessionId: string, digit: string): { twiml: string; lang: string } {
    const session = this.activeSessions.get(sessionId);
    let lang: 'hi' | 'pa' | 'mr' | 'en' = 'hi';
    if (digit === '2') lang = 'pa';
    else if (digit === '3') lang = 'mr';
    else if (digit === '4') lang = 'en';

    if (session) {
      session.selectedLanguage = lang;
      session.currentStep = 'menu';
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="/api/voice/menu-select?sessionId=${sessionId}&amp;lang=${lang}" method="POST" timeout="10">
        ${this.getMenuPrompt(lang)}
    </Gather>
    <Say>${lang === 'hi' ? 'कोई विकल्प नहीं चुना गया। मुख्य मेनू दोहराया जा रहा है।' : 'No option chosen. Repeating menu.'}</Say>
    <Redirect>/api/voice/menu?sessionId=${sessionId}&amp;lang=${lang}</Redirect>
</Response>`;

    return { twiml, lang };
  }

  private getMenuPrompt(lang: string): string {
    switch (lang) {
      case 'pa':
        return `<Say language="pa-IN">ਮੌਸਮ ਅਤੇ ਚੇਤਾਵਨੀ ਸੁਣਨ ਲਈ 1 ਦਬਾਓ। ਮੰਡੀ ਦੇ ਭਾਅ ਜਾਣਨ ਲਈ 2 ਦਬਾਓ। ਬੋਲ ਕੇ ਸਵਾਲ ਪੁੱਛਣ ਲਈ 3 ਦਬਾਓ। ਖੇਤੀ ਮਾਹਿਰ ਨਾਲ ਗੱਲ ਕਰਨ ਲਈ 4 ਦਬਾਓ।</Say>`;
      case 'mr':
        return `<Say language="mr-IN">हवामान व सतर्कतेसाठी 1 दाबा. बाजार भाव माहितीसाठी 2 दाबा. बोलून प्रश्न विचारण्यासाठी 3 दाबा. कृषी तज्ज्ञांशी संपर्क साधण्यासाठी 4 दाबा.</Say>`;
      case 'en':
        return `<Say language="en-IN">Press 1 for Weather and Risk Alerts. Press 2 for Mandi Market Prices. Press 3 to Ask a Spoken Question. Press 4 for Expert Callback.</Say>`;
      case 'hi':
      default:
        return `<Say language="hi-IN">मौसम और जोखिम अलर्ट के लिए 1 दबाएं। मंडी भाव जानने के लिए 2 दबाएं। बोलकर प्रश्न पूछने के लिए 3 दबाएं। कृषि अधिकारी से संपर्क के लिए 4 दबाएं।</Say>`;
    }
  }

  public async handleMenuSelection(sessionId: string, digit: string, lang: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (digit === '1') {
      // Weather readout
      const weather = await weatherService.getWeather(30.901, 75.8573, 'Ludhiana');
      let msg = '';
      if (lang === 'pa') {
        msg = `ਤੁਹਾਡੇ ਖੇਤਰ ਵਿੱਚ ਮੌਜੂਦਾ ਤਾਪਮਾਨ ${weather.temperatureC} ਡਿਗਰੀ ਸੈਲਸੀਅਸ ਹੈ। ਮੌਸਮ ${weather.weatherDescription} ਹੈ। 24 ਘੰਟਿਆਂ ਵਿੱਚ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ${weather.precipitationProbabilityPct} ਫ਼ੀਸਦੀ ਹੈ।`;
      } else if (lang === 'mr') {
        msg = `आपल्या भागात सध्याचे तापमान ${weather.temperatureC} अंश सेल्सिअस आहे. हवामान ${weather.weatherDescription} आहे. पावसाची शक्यता ${weather.precipitationProbabilityPct} टक्के आहे.`;
      } else if (lang === 'hi') {
        msg = `आपके क्षेत्र में तापमान ${weather.temperatureC} डिग्री सेल्सियस है। मौसम ${weather.weatherDescription} है। बारिश की संभावना ${weather.precipitationProbabilityPct} प्रतिशत है।`;
      } else {
        msg = `Current temperature is ${weather.temperatureC} degrees Celsius with ${weather.weatherDescription}. Rain probability is ${weather.precipitationProbabilityPct} percent.`;
      }

      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>${msg}</Say>
    <Say>धन्यवाद। कृषक दृष्टि हेल्पलाइन पर कॉल करने के लिए धन्यवाद।</Say>
    <Hangup/>
</Response>`;
    } else if (digit === '2') {
      // Mandi price readout
      const mandi = await mandiService.getMandiPrices({ commodity: 'Wheat' });
      const record = mandi.records[0];
      const rate = record ? record.modalPrice : 2420;
      let msg = `आज खन्ना मंडी में गेहूं का मॉडल भाव ₹${rate} प्रति क्विंटल है। प्याज का भाव लासलगांव मंडी में ₹2,480 प्रति क्विंटल है।`;
      if (lang === 'pa') msg = `ਅੱਜ ਖੰਨਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਮਾਡਲ ਭਾਅ ₹${rate} ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਰਿਹਾ।`;
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>${msg}</Say>
    <Hangup/>
</Response>`;
    } else if (digit === '3') {
      // Spoken question recording
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>${lang === 'hi' ? 'कृपया बीप के बाद अपनी फसल या समस्या का सवाल बोलें।' : 'Please speak your agricultural question after the beep.'}</Say>
    <Record action="/api/voice/process-speech?sessionId=${sessionId}&amp;lang=${lang}" maxLength="30" playBeep="true" transcribe="true" />
</Response>`;
    } else {
      // Expert callback request
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>${lang === 'hi' ? 'आपके एफपीओ कृषि अधिकारी को सूचना भेज दी गई है। वे शीघ्र संपर्क करेंगे।' : 'Your request has been queued for your FPO agricultural officer.'}</Say>
    <Hangup/>
</Response>`;
    }
  }

  public async processSpokenQuestion(sessionId: string, spokenText: string, lang: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.transcription = spokenText;
    }

    const aiRes = await geminiService.chatWithAssistant({
      message: spokenText,
      preferredLanguage: lang,
    });

    if (session) {
      session.aiResponse = aiRes.reply;
      session.currentStep = 'completed';
    }

    // Clean XML characters for TTS
    const cleanSpeech = aiRes.reply.replace(/[*_#]/g, '').slice(0, 300);

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>${cleanSpeech}</Say>
    <Say>यदि आप इस सलाह का एसएमएस प्राप्त करना चाहते हैं तो 1 दबाएं अन्यथा फोन काटें।</Say>
    <Gather numDigits="1" action="/api/voice/send-sms?sessionId=${sessionId}" timeout="5">
    </Gather>
    <Hangup/>
</Response>`;
  }

  public getSession(sessionId: string): IVRCallSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public getAllSessions(): IVRCallSession[] {
    return Array.from(this.activeSessions.values());
  }
}

export const voiceService = new VoiceService();
