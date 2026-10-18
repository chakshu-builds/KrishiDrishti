export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
  validationStatus: 'verified' | 'beta_extensible';
}

export const INDIAN_LANGUAGES: LanguageMeta[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN', validationStatus: 'verified' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN', validationStatus: 'verified' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN', validationStatus: 'verified' },
  { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-IN', validationStatus: 'verified' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN', validationStatus: 'beta_extensible' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN', validationStatus: 'beta_extensible' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN', validationStatus: 'beta_extensible' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', bcp47: 'gu-IN', validationStatus: 'beta_extensible' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN', validationStatus: 'beta_extensible' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN', validationStatus: 'beta_extensible' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', bcp47: 'or-IN', validationStatus: 'beta_extensible' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', bcp47: 'as-IN', validationStatus: 'beta_extensible' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', bcp47: 'ur-IN', validationStatus: 'beta_extensible' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', bcp47: 'mai-IN', validationStatus: 'beta_extensible' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', bcp47: 'sat-IN', validationStatus: 'beta_extensible' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर', bcp47: 'ks-IN', validationStatus: 'beta_extensible' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', bcp47: 'ne-NP', validationStatus: 'beta_extensible' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', bcp47: 'kok-IN', validationStatus: 'beta_extensible' },
  { code: 'sd', name: 'Sindhi', nativeName: 'सिन्धी', bcp47: 'sd-IN', validationStatus: 'beta_extensible' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', bcp47: 'doi-IN', validationStatus: 'beta_extensible' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', bcp47: 'mni-IN', validationStatus: 'beta_extensible' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', bcp47: 'brx-IN', validationStatus: 'beta_extensible' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', bcp47: 'sa-IN', validationStatus: 'beta_extensible' },
];

export interface TranslationDict {
  brandName: string;
  tagline: string;
  nav: {
    dashboard: string;
    farms: string;
    profile: string;
    cropHealth: string;
    fieldMap: string;
    mandi: string;
    weather: string;
    devices: string;
    aiAssistant: string;
    alerts: string;
    fpo: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    activeFarms: string;
    cropHealthScore: string;
    todayWeather: string;
    mandiSnapshots: string;
    iotTelemetry: string;
    activeAlerts: string;
    quickActions: string;
  };
  cropHealth: {
    title: string;
    uploadPrompt: string;
    analyzeBtn: string;
    confidence: string;
    visibleEvidence: string;
    actionableSteps: string;
    disclaimer: string;
  };
  mandi: {
    title: string;
    commodity: string;
    modalPrice: string;
    marketComparison: string;
    priceTrend: string;
    liveAttribution: string;
  };
  weather: {
    title: string;
    currentConditions: string;
    rainProb: string;
    wind: string;
    riskIndicators: string;
    agronomicRules: string;
  };
  iot: {
    title: string;
    deviceList: string;
    soilMoisture: string;
    soilTemp: string;
    airTemp: string;
    humidity: string;
    npkReadings: string;
    batteryStatus: string;
    simulatorBanner: string;
  };
  assistant: {
    title: string;
    placeholder: string;
    disclaimer: string;
    suggestedQueries: string;
  };
  voiceHotline: {
    title: string;
    callSimulator: string;
    speakNow: string;
    hotlineDesc: string;
  };
}

const TRANSLATIONS: Record<string, TranslationDict> = {
  hi: {
    brandName: 'कृषक दृष्टि',
    tagline: 'भारतीय किसानों के लिए बहुभाषी कृषि एआई सहायक',
    nav: {
      dashboard: 'डैशबोर्ड',
      farms: 'खेत व फसलें',
      profile: 'मेरी प्रोफ़ाइल',
      cropHealth: 'फसल स्वास्थ्य व एआई जांच',
      fieldMap: 'खेत मानचित्र व ड्रोन छवि',
      mandi: 'लाइव मंडी भाव व तुलना',
      weather: 'मौसम व जोखिम अलर्ट',
      devices: 'उपकरण व आईओटी निगरानी',
      aiAssistant: 'एआई कृषि सहायक',
      alerts: 'कृषि अलर्ट व जोखिम',
      fpo: 'एफपीओ समन्वयक केंद्र',
    },
    dashboard: {
      title: 'किसान डैशबोर्ड',
      subtitle: 'आपके पंजीकृत खेतों की वास्तविक स्थिति और परामर्श',
      activeFarms: 'पंजीकृत खेत व भूखंड',
      cropHealthScore: 'फसल स्वास्थ्य स्थिति',
      todayWeather: 'स्थानीय मौसम व पूर्वानुमान',
      mandiSnapshots: 'आज के मंडी भाव',
      iotTelemetry: 'सेंसर व उपकरण डेटा',
      activeAlerts: 'सक्रिय जोखिम अलर्ट',
      quickActions: 'त्वरित कार्रवाई',
    },
    cropHealth: {
      title: 'फसल स्वास्थ्य व एआई जांच',
      uploadPrompt: 'पौधे या पत्ती की स्पष्ट फोटो अपलोड करें',
      analyzeBtn: 'एआई द्वारा रोग की जांच करें',
      confidence: 'एआई सटीकता विश्वास स्तर',
      visibleEvidence: 'दृश्यमान लक्षण व प्रमाण',
      actionableSteps: 'सुरक्षित कृषि उपाय व कदम',
      disclaimer: 'यह एक प्रारंभिक एआई परामर्श है। रासायनिक कीटनाशक डालने से पहले कृषि विज्ञान केंद्र (KVK) के अधिकारी से परामर्श अवश्य लें।',
    },
    mandi: {
      title: 'लाइव मंडी भाव व बाजार विश्लेषण',
      commodity: 'फसल / जिंस',
      modalPrice: 'मॉडल भाव (₹/क्विंटल)',
      marketComparison: 'मंडियों के बीच तुलना',
      priceTrend: '७-दिवसीय मूल्य रुझान चार्ट',
      liveAttribution: 'स्रोत: एगमार्कनेट (Agmarknet) एवं राज्य कृषि विपणन बोर्ड',
    },
    weather: {
      title: 'कृषि मौसम रडार व गंभीर जोखिम अलर्ट',
      currentConditions: 'वर्तमान तापमान व आर्द्रता',
      rainProb: 'बारिश की संभावना',
      wind: 'हवा की गति व दिशा',
      riskIndicators: 'कृषि मौसम जोखिम संकेतक',
      agronomicRules: 'फसल-विशिष्ट स्वचालित नियम',
    },
    iot: {
      title: 'खेत सेंसर व ESP32 उपकरण प्रबंधन',
      deviceList: 'पंजीकृत सेंसर व कैमरे',
      soilMoisture: 'मिट्टी की नमी',
      soilTemp: 'मिट्टी का तापमान',
      airTemp: 'हवा का तापमान',
      humidity: 'सापेक्ष आर्द्रता',
      npkReadings: 'एन.पी.के. (NPK) पोषक स्तर',
      batteryStatus: 'बैटरी व सिग्नल',
      simulatorBanner: 'सिम्युलेटर मोड सक्रिय: परीक्षण के लिए कृत्रिम सेंसर चक्र चल रहा है।',
    },
    assistant: {
      title: 'कृषक दृष्टि एआई मित्र',
      placeholder: 'मौसम, मंडी भाव या फसल रोग के बारे में पूछें...',
      disclaimer: 'मिस्ट्रल एआई द्वारा संचालित। आधिकारिक वैज्ञानिक कृषि डेटा पर आधारित।',
      suggestedQueries: 'सुझाए गए प्रश्न:',
    },
    voiceHotline: {
      title: 'किसान टेलीफोन हेल्पलाइन (IVR)',
      callSimulator: 'वॉयस कॉल सिम्युलेटर चलाएं',
      speakNow: 'बीप के बाद अपना सवाल बोलें...',
      hotlineDesc: 'बिना इंटरनेट के सामान्य मोबाइल से मौसम व मंडी भाव सुनने के लिए टोल-फ्री आईवीआर चैनल।',
    },
  },
  pa: {
    brandName: 'ਕ੍ਰਿਸ਼ਕ ਦ੍ਰਿਸ਼ਟੀ',
    tagline: 'ਭਾਰਤੀ ਕਿਸਾਨਾਂ ਲਈ ਬਹੁਭਾਸ਼ਾਈ ਖੇਤੀਬਾੜੀ ਏਆਈ ਸਹਾਇਕ',
    nav: {
      dashboard: 'ਡੈਸ਼ਬੋਰਡ',
      farms: 'ਖੇਤ ਅਤੇ ਫ਼ਸਲਾਂ',
      profile: 'ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ',
      cropHealth: 'ਫ਼ਸਲ ਸਿਹਤ ਤੇ ਏਆਈ ਜਾਂਚ',
      fieldMap: 'ਖੇਤ ਦਾ ਨਕਸ਼ਾ ਤੇ ਡਰੋਨ ਫੋਟੋ',
      mandi: 'ਲਾਈਵ ਮੰਡੀ ਭਾਅ',
      weather: 'ਮੌਸਮ ਤੇ ਜੋਖਮ ਚੇਤਾਵਨੀ',
      devices: 'ਸੈਂਸਰ ਤੇ ਆਈਓਟੀ ਨਿਗਰਾਨੀ',
      aiAssistant: 'ਏਆਈ ਖੇਤੀ ਸਹਾਇਕ',
      alerts: 'ਖੇਤੀ ਚੇਤਾਵਨੀਆਂ',
      fpo: 'ਐਫਪੀਓ ਕੇਂਦਰ',
    },
    dashboard: {
      title: 'ਕਿਸਾਨ ਡੈਸ਼ਬੋਰਡ',
      subtitle: 'ਤੁਹਾਡੇ ਰਜਿਸਟਰਡ ਖੇਤਾਂ ਦੀ ਤਾਜ਼ਾ ਸਥਿਤੀ ਅਤੇ ਖੇਤੀ ਸਲਾਹ',
      activeFarms: 'ਰਜਿਸਟਰਡ ਖੇਤ',
      cropHealthScore: 'ਫ਼ਸਲ ਸਿਹਤ ਸਥਿਤੀ',
      todayWeather: 'ਅੱਜ ਦਾ ਮੌਸਮ ਤੇ ਪੂਰਵ-ਅਨੁਮਾਨ',
      mandiSnapshots: 'ਅੱਜ ਦੇ ਮੰਡੀ ਭਾਅ',
      iotTelemetry: 'ਸੈਂਸਰ ਡਾਟਾ',
      activeAlerts: 'ਸਰਗਰਮ ਚੇਤਾਵਨੀਆਂ',
      quickActions: 'ਜ਼ਰੂਰੀ ਕਾਰਵਾਈਆਂ',
    },
    cropHealth: {
      title: 'ਫ਼ਸਲ ਸਿਹਤ ਤੇ ਏਆਈ ਜਾਂਚ',
      uploadPrompt: 'ਬਿਮਾਰੀ ਵਾਲੇ ਪੱਤੇ ਦੀ ਸਾਫ਼ ਫ਼ੋਟੋ ਅੱਪਲੋਡ ਕਰੋ',
      analyzeBtn: 'ਏਆਈ ਨਾਲ ਰੋਗ ਦੀ ਜਾਂਚ ਕਰੋ',
      confidence: 'ਏਆਈ ਭਰੋਸੇਯੋਗਤਾ ਦਰ',
      visibleEvidence: 'ਦਿਖਾਈ ਦੇ ਰਹੇ ਲੱਛਣ',
      actionableSteps: 'ਸੁਰੱਖਿਅਤ ਖੇਤੀ ਕਦਮ',
      disclaimer: 'ਇਹ ਇੱਕ ਸ਼ੁਰੂਆਤੀ ਏਆਈ ਸਲਾਹ ਹੈ। ਰਸਾਇਣਕ ਸਪਰੇਅ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਪੀਏਯੂ / ਕੇਵੀਕੇ ਦੇ ਮਾਹਿਰ ਨਾਲ ਜ਼ਰੂਰ ਸਲਾਹ ਕਰੋ।',
    },
    mandi: {
      title: 'ਲਾਈਵ ਮੰਡੀ ਭਾਅ ਅਤੇ ਤੁਲਨਾ',
      commodity: 'ਫ਼ਸਲ / ਜਿਣਸ',
      modalPrice: 'ਮਾਡਲ ਭਾਅ (₹/ਕੁਇੰਟਲ)',
      marketComparison: 'ਮੰਡੀਆਂ ਦੀ ਤੁਲਨਾ',
      priceTrend: '੭-ਦਿਨਾਂ ਦਾ ਭਾਅ ਰੁਝਾਨ',
      liveAttribution: 'ਸਰੋਤ: ਐਗਮਾਰਕਨੈੱਟ (Agmarknet) ਅਤੇ ਪੰਜਾਬ ਮੰਡੀ ਬੋਰਡ',
    },
    weather: {
      title: 'ਖੇਤੀ ਮੌਸਮ ਅਤੇ ਮੀਂਹ ਦਾ ਜੋਖਮ',
      currentConditions: 'ਮੌਜੂਦਾ ਤਾਪਮਾਨ ਅਤੇ ਨਮੀ',
      rainProb: 'ਮੀਂਹ ਪੈਣ ਦੀ ਸੰਭਾਵਨਾ',
      wind: 'ਹਵਾ ਦੀ ਗਤੀ',
      riskIndicators: 'ਮੌਸਮੀ ਜੋਖਮ ਸੂਚਕ',
      agronomicRules: 'ਸਵੈ-ਚਾਲਿਤ ਖੇਤੀ ਨਿਯਮ',
    },
    iot: {
      title: 'ਖੇਤ ਸੈਂਸਰ ਅਤੇ ESP32 ਯੰਤਰ',
      deviceList: 'ਚੱਲ ਰਹੇ ਸੈਂਸਰ ਅਤੇ ਕੈਮਰੇ',
      soilMoisture: 'ਮਿੱਟੀ ਦੀ ਨਮੀ',
      soilTemp: 'ਮਿੱਟੀ ਦਾ ਤਾਪਮਾਨ',
      airTemp: 'ਹਵਾ ਦਾ ਤਾਪਮਾਨ',
      humidity: 'ਹਵਾ ਵਿੱਚ ਨਮੀ',
      npkReadings: 'ਐਨ.ਪੀ.ਕੇ. (NPK) ਖਾਦ ਪੱਧਰ',
      batteryStatus: 'ਬੈਟਰੀ ਸਥਿਤੀ',
      simulatorBanner: 'ਸਿਮੂਲੇਟਰ ਮੋਡ ਚਾਲੂ ਹੈ: ਟੈਸਟਿੰਗ ਲਈ ਨਕਲੀ ਸੈਂਸਰ ਡਾਟਾ ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਹੈ।',
    },
    assistant: {
      title: 'ਕ੍ਰਿਸ਼ਕ ਦ੍ਰਿਸ਼ਟੀ ਏਆਈ ਮਿੱਤਰ',
      placeholder: 'ਮੌਸਮ, ਮੰਡੀ ਭਾਅ ਜਾਂ ਫ਼ਸਲ ਦੇ ਰੋਗ ਬਾਰੇ ਪੁੱਛੋ...',
      disclaimer: 'ਮਿਸਟਰਾਲ ਏਆਈ ਦੁਆਰਾ ਸੰਚਾਲਿਤ। ਅਧਿਕਾਰਤ ਖੇਤੀ ਡਾਟਾ ਤੇ ਆਧਾਰਿਤ।',
      suggestedQueries: 'ਸੁਝਾਏ ਗਏ ਸਵਾਲ:',
    },
    voiceHotline: {
      title: 'ਕਿਸਾਨ ਫ਼ੋਨ ਹੈਲਪਲਾਈਨ (IVR)',
      callSimulator: 'ਕਾਲ ਸਿਮੂਲੇਟਰ ਚਲਾਓ',
      speakNow: 'ਬੀਪ ਤੋਂ ਬਾਅਦ ਆਪਣਾ ਸਵਾਲ ਬੋਲੋ...',
      hotlineDesc: 'ਬਿਨਾਂ ਇੰਟਰਨੈੱਟ ਦੇ ਸਾਧਾਰਨ ਮੋਬਾਈਲ ਫ਼ੋਨ ਤੋਂ ਮੌਸਮ ਅਤੇ ਮੰਡੀ ਦੇ ਭਾਅ ਸੁਣਨ ਲਈ ਟੋਲ-ਫ੍ਰੀ ਆਈਵੀਆਰ।',
    },
  },
  mr: {
    brandName: 'कृषक दृष्टी',
    tagline: 'भारतीय शेतकऱ्यांसाठी बहुभाषिक कृषी एआय सहाय्यक',
    nav: {
      dashboard: 'डॅशबोर्ड',
      farms: 'शेत व पिके',
      profile: 'माझे प्रोफाईल',
      cropHealth: 'पीक आरोग्य व एआय तपासणी',
      fieldMap: 'शेत नकाशा व ड्रोन छायाचित्र',
      mandi: 'थेट बाजार भाव व तुलना',
      weather: 'हवामान व धोका सूचना',
      devices: 'आयओटी उपकरणे व निरीक्षण',
      aiAssistant: 'एआय कृषी सहाय्यक',
      alerts: 'सतर्कता व जोखीम',
      fpo: 'एफपीओ केंद्र',
    },
    dashboard: {
      title: 'शेतकरी डॅशबोर्ड',
      subtitle: 'आपल्या नोंदणीकृत शेतांची सद्यस्थिती व कृषी सल्ला',
      activeFarms: 'नोंदणीकृत शेतजमीन',
      cropHealthScore: 'पीक आरोग्य निर्देशांक',
      todayWeather: 'स्थानिक हवामान अंदाज',
      mandiSnapshots: 'आजचे बाजार भाव',
      iotTelemetry: 'सेन्सर व हवामान डेटा',
      activeAlerts: 'सक्रिय सतर्कता सूचना',
      quickActions: 'त्वरित कृषी कृती',
    },
    cropHealth: {
      title: 'पीक आरोग्य व एआय रोग निदान',
      uploadPrompt: 'झाडाच्या किंवा पानाचा स्पष्ट फोटो अपलोड करा',
      analyzeBtn: 'एआय द्वारे रोगाची तपासणी करा',
      confidence: 'एआय विश्वासार्हता पातळी',
      visibleEvidence: 'दृश्यमान लक्षणे व पुरावे',
      actionableSteps: 'सुरक्षित पीक उपाय व पावले',
      disclaimer: 'हा प्राथमिक एआय सल्ला आहे. रासायनिक फवारणीपूर्वी कृषी विज्ञान केंद्र (KVK) च्या तज्ज्ञांचा सल्ला आवर्जून घ्या.',
    },
    mandi: {
      title: 'थेट बाजार भाव व कृषी मंडई विश्लेषण',
      commodity: 'पीक / शेतमाल',
      modalPrice: 'सरासरी भाव (₹/क्विंटल)',
      marketComparison: 'बाजारांमधील तुलना',
      priceTrend: '७-दिवसीय भाव चढ-उतार चार्ट',
      liveAttribution: 'स्रोत: अ‍ॅगमार्कनेट व महाराष्ट्र राज्य कृषी पणन मंडळ (MSAMB)',
    },
    weather: {
      title: 'हवामान रडार व अतिवृष्टी सतर्कता',
      currentConditions: 'सध्याचे तापमान व आर्द्रता',
      rainProb: 'पावसाची शक्यता',
      wind: 'वाऱ्याचा वेग',
      riskIndicators: 'हवामान जोखीम निर्देशक',
      agronomicRules: 'पीक-विशिष्ट स्वयंचलित नियम',
    },
    iot: {
      title: 'शेत सेन्सर व ESP32 उपकरणे',
      deviceList: 'नोंदणीकृत सेन्सर व कॅमेरा',
      soilMoisture: 'मातीतील ओलावा',
      soilTemp: 'मातीचे तापमान',
      airTemp: 'हवेचे तापमान',
      humidity: 'हवेतील सापेक्ष आर्द्रता',
      npkReadings: 'एन.पी.के. खत पातळी',
      batteryStatus: 'बॅटरी सद्यस्थिती',
      simulatorBanner: 'सिम्युलेटर मोड सक्रिय: चाचणीसाठी कृत्रिम सेन्सर रीडिंग सुरू आहे.',
    },
    assistant: {
      title: 'कृषक दृष्टी एआय मित्र',
      placeholder: 'हवामान, कांदा बाजार भाव किंवा रोगाबद्दल विचारा...',
      disclaimer: 'मिस्ट्रल एआय द्वारे समर्थित. अधिकृत कृषी संशोधन डेटावर आधारित.',
      suggestedQueries: 'सुचवलेले प्रश्न:',
    },
    voiceHotline: {
      title: 'शेतकरी टोल-फ्री हेल्पलाइन (IVR)',
      callSimulator: 'कॉल सिम्युलेटर सुरू करा',
      speakNow: 'बीप नंतर आपला प्रश्न बोला...',
      hotlineDesc: 'इंटरनेट नसतानाही साध्या फोनवरून हवामान व भाव ऐकण्यासाठी टोल-फ्री आयव्हीआर चॅनेल.',
    },
  },
  en: {
    brandName: 'KrishakDrishti',
    tagline: 'Multilingual Agricultural AI Assistance Platform for Indian Farmers',
    nav: {
      dashboard: 'Dashboard',
      farms: 'Farms & Fields',
      profile: 'My Profile',
      cropHealth: 'Crop Health & AI Diagnostics',
      fieldMap: 'Field GIS & Drone Map',
      mandi: 'Live Mandi Intelligence',
      weather: 'Weather & Risk Alerts',
      devices: 'Devices & IoT Monitoring',
      aiAssistant: 'AI Assistant',
      alerts: 'Alerts & Risks',
      fpo: 'FPO Coordinator Hub',
    },
    dashboard: {
      title: 'Farmer Dashboard',
      subtitle: 'Real-time agronomic status, microclimate conditions & actionable advice',
      activeFarms: 'Registered Farms & Plots',
      cropHealthScore: 'Crop Health Index',
      todayWeather: 'Local Weather & Forecast',
      mandiSnapshots: 'Today’s APMC Mandi Rates',
      iotTelemetry: 'On-Farm Sensor Readings',
      activeAlerts: 'Active Risk Alerts',
      quickActions: 'Recommended Actions',
    },
    cropHealth: {
      title: 'Crop Health & Image Diagnostics',
      uploadPrompt: 'Upload a clear photograph of affected leaf or canopy',
      analyzeBtn: 'Analyze Crop Pathology with AI',
      confidence: 'AI Confidence Score',
      visibleEvidence: 'Visible Pathological Evidence',
      actionableSteps: 'Cautious Actionable Cultural Steps',
      disclaimer: 'AI preliminary observation based on optical visual patterns. Never treat as a confirmed diagnosis. Confirm with Krishi Vigyan Kendra (KVK) officer before applying chemical controls.',
    },
    mandi: {
      title: 'Live Mandi Intelligence & Price Trends',
      commodity: 'Commodity & Variety',
      modalPrice: 'Modal Price (₹ / Quintal)',
      marketComparison: 'Inter-Market Price Comparison',
      priceTrend: '7-Day Price Trajectory',
      liveAttribution: 'Source: Agmarknet DMI & State Agricultural Marketing Boards',
    },
    weather: {
      title: 'Microclimate Radar & Severe Weather Alerts',
      currentConditions: 'Current Temperature & Humidity',
      rainProb: 'Rainfall Probability',
      wind: 'Wind Velocity & Direction',
      riskIndicators: 'Severe Weather Agricultural Indicators',
      agronomicRules: 'Automated Agronomic Trigger Rules',
    },
    iot: {
      title: 'Field Sensors & ESP32-CAM Management',
      deviceList: 'Provisioned Sensors & Field Nodes',
      soilMoisture: 'Root-Zone Soil Moisture',
      soilTemp: 'Soil Temperature',
      airTemp: 'Canopy Ambient Temp',
      humidity: 'Relative Humidity',
      npkReadings: 'Available Soil NPK (mg/kg)',
      batteryStatus: 'Device Health & RSSI',
      simulatorBanner: 'Simulator Active: Demonstrating realistic diurnal telemetry cycles for development.',
    },
    assistant: {
      title: 'KrishakDrishti AI Assistant',
      placeholder: 'Ask about weather, mandi rates, or crop symptoms...',
      disclaimer: 'Powered by Gemini AI. Grounded in live farm sensors and verified market feeds.',
      suggestedQueries: 'Suggested inquiries:',
    },
    voiceHotline: {
      title: 'Telephone & Voice IVR Hotline',
      callSimulator: 'Launch Voice Call Simulator',
      speakNow: 'Speak your question after the beep...',
      hotlineDesc: 'Interactive voice hotline supporting speech recognition and localized TTS playback for farmers with basic phones.',
    },
  },
};

export function getTranslation(langCode: string = 'hi'): TranslationDict {
  return TRANSLATIONS[langCode] || TRANSLATIONS['hi'] || TRANSLATIONS['en'];
}
