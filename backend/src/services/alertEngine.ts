import { store } from '../db/store.js';
import { AlertNotification, Field, IoTDevice, UserProfile, WeatherCondition } from '../types/index.js';

export interface AgronomicThresholds {
  heavyRainPrecipitationCurrentMm: number; // default: 25.0 mm in current observation
  heavyRainPrecipitationForecastMm: number; // default: 30.0 mm in 24h daily forecast
  heatwaveCurrentTempC: number; // default: 38.0 °C
  heatwaveForecastMaxTempC: number; // default: 40.0 °C
  frostRiskMinTempC: number; // default: 4.0 °C (cold wave for Rabi crops)
  highWindSpeedKmh: number; // default: 35.0 km/h (crop lodging risk)
  soilMoistureDepletionPct: number; // default: 22.0% root-zone moisture
  deviceOfflineHours: number; // default: 6.0 hours without heartbeat
  cooldownHours: number; // default: 6.0 hours deduplication window
}

export const DEFAULT_AGRONOMIC_THRESHOLDS: AgronomicThresholds = {
  heavyRainPrecipitationCurrentMm: 25.0,
  heavyRainPrecipitationForecastMm: 30.0,
  heatwaveCurrentTempC: 38.0,
  heatwaveForecastMaxTempC: 40.0,
  frostRiskMinTempC: 4.0,
  highWindSpeedKmh: 35.0,
  soilMoistureDepletionPct: 22.0,
  deviceOfflineHours: 6.0,
  cooldownHours: 6.0,
};

export interface EvaluationInput {
  farmer: UserProfile;
  fields: Field[];
  weather: WeatherCondition;
  devices?: IoTDevice[];
  latestSoilMoisturePct?: number;
}

export class AlertEngine {
  private thresholds: AgronomicThresholds = { ...DEFAULT_AGRONOMIC_THRESHOLDS };

  public getThresholds(): AgronomicThresholds {
    return { ...this.thresholds };
  }

  public updateThresholds(updates: Partial<AgronomicThresholds>): AgronomicThresholds {
    this.thresholds = { ...this.thresholds, ...updates };
    return this.thresholds;
  }

  public evaluateRisks(
    input: EvaluationInput,
    customThresholds?: Partial<AgronomicThresholds>
  ): AlertNotification[] {
    const config = { ...this.thresholds, ...(customThresholds || {}) };
    const generatedAlerts: AlertNotification[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const field of input.fields) {
      // 1. Heavy Precipitation Rule (> heavyRainPrecipitationForecastMm in next 24-48h or > heavyRainPrecipitationCurrentMm now)
      const heavyRainForecast = input.weather.forecastDaily.find(
        (d) => d.precipitationMm >= config.heavyRainPrecipitationForecastMm
      );
      if (heavyRainForecast || input.weather.precipitationMm > config.heavyRainPrecipitationCurrentMm) {
        const cooldownKey = `heavy_rain_${field.id}_${todayStr}`;
        const newAlert = store.addAlert({
          farmerId: input.farmer.id,
          fieldId: field.id,
          alertType: 'heavy_rain',
          severity: 'warning',
          title: `Heavy Rain Alert for ${field.name}`,
          description: `Weather prediction indicates ${heavyRainForecast ? heavyRainForecast.precipitationMm : input.weather.precipitationMm}mm rainfall over your ${field.cropName} field. Risk of waterlogging and nutrient leaching.`,
          recommendedAction: 'Clear field drainage trenches immediately. Suspend scheduled chemical spray or nitrogen top-dressing.',
          sourceAttribution: input.weather.dataSource,
          status: {
            inApp: 'delivered',
            sms: input.farmer.alertConsent.sms ? 'delivered' : 'opted_out',
            voice: input.farmer.alertConsent.voice ? 'completed' : 'opted_out',
            whatsapp: input.farmer.alertConsent.whatsapp ? 'delivered' : 'opted_out',
          },
          cooldownKey,
        });
        if (newAlert) generatedAlerts.push(newAlert);
      }

      // 2. Heatwave & High Evaporation (> heatwaveCurrentTempC or forecast >= heatwaveForecastMaxTempC)
      if (
        input.weather.temperatureC >= config.heatwaveCurrentTempC ||
        input.weather.forecastDaily.some((d) => d.maxTempC >= config.heatwaveForecastMaxTempC)
      ) {
        const cooldownKey = `heatwave_${field.id}_${todayStr}`;
        const newAlert = store.addAlert({
          farmerId: input.farmer.id,
          fieldId: field.id,
          alertType: 'heatwave',
          severity: 'warning',
          title: `Extreme Heat Advisory (${input.weather.temperatureC}°C)`,
          description: `High temperature combined with low humidity poses thermal stress during ${field.growthStage} stage for ${field.cropName}.`,
          recommendedAction: 'Apply light evening micro-irrigation to maintain canopy microclimate. Avoid midday irrigation.',
          sourceAttribution: input.weather.dataSource,
          status: {
            inApp: 'delivered',
            sms: input.farmer.alertConsent.sms ? 'delivered' : 'opted_out',
            voice: 'not_configured',
            whatsapp: input.farmer.alertConsent.whatsapp ? 'delivered' : 'opted_out',
          },
          cooldownKey,
        });
        if (newAlert) generatedAlerts.push(newAlert);
      }

      // 3. Frost / Cold Wave Rule (< frostRiskMinTempC in Rabi season)
      const frostDay = input.weather.forecastDaily.find((d) => d.minTempC <= config.frostRiskMinTempC);
      if (input.weather.temperatureC <= config.frostRiskMinTempC || frostDay) {
        const cooldownKey = `frost_${field.id}_${todayStr}`;
        const newAlert = store.addAlert({
          farmerId: input.farmer.id,
          fieldId: field.id,
          alertType: 'frost',
          severity: 'critical',
          title: `Frost & Ground Freezing Warning (${frostDay ? frostDay.minTempC : input.weather.temperatureC}°C)`,
          description: `Freezing temperatures predicted for ${field.name}. Extreme frost injury risk for sensitive flowering/vegetative stages of ${field.cropName}.`,
          recommendedAction: 'Provide light overnight furrow irrigation to keep soil temperature above freezing, or create protective thatch/smoke barriers.',
          sourceAttribution: input.weather.dataSource,
          status: {
            inApp: 'delivered',
            sms: input.farmer.alertConsent.sms ? 'delivered' : 'opted_out',
            voice: input.farmer.alertConsent.voice ? 'completed' : 'opted_out',
            whatsapp: input.farmer.alertConsent.whatsapp ? 'delivered' : 'opted_out',
          },
          cooldownKey,
        });
        if (newAlert) generatedAlerts.push(newAlert);
      }

      // 4. High Wind Lodging Risk (> highWindSpeedKmh km/h)
      if (input.weather.windSpeedKmh >= config.highWindSpeedKmh) {
        const cooldownKey = `wind_${field.id}_${todayStr}`;
        const newAlert = store.addAlert({
          farmerId: input.farmer.id,
          fieldId: field.id,
          alertType: 'heavy_rain',
          severity: 'advisory',
          title: `High Wind Warning (${input.weather.windSpeedKmh} km/h)`,
          description: `Gusty wind conditions increase the risk of stem lodging in tall crops (Wheat / Mustard).`,
          recommendedAction: 'Do not irrigate dry fields right before wind gusts; saturated wet root zones reduce anchorage.',
          sourceAttribution: input.weather.dataSource,
          status: {
            inApp: 'delivered',
            sms: input.farmer.alertConsent.sms ? 'delivered' : 'opted_out',
            voice: 'not_configured',
            whatsapp: input.farmer.alertConsent.whatsapp ? 'delivered' : 'opted_out',
          },
          cooldownKey,
        });
        if (newAlert) generatedAlerts.push(newAlert);
      }

      // 5. Soil Moisture Stress Rule (< soilMoistureDepletionPct moisture)
      if (input.latestSoilMoisturePct !== undefined && input.latestSoilMoisturePct < config.soilMoistureDepletionPct) {
        const cooldownKey = `water_stress_${field.id}_${todayStr}`;
        const newAlert = store.addAlert({
          farmerId: input.farmer.id,
          fieldId: field.id,
          alertType: 'water_stress',
          severity: 'warning',
          title: `Critical Soil Moisture Depletion in ${field.name}`,
          description: `Root zone moisture is at ${input.latestSoilMoisturePct.toFixed(1)}%, approaching wilting threshold for ${field.cropName}.`,
          recommendedAction: 'Schedule drip or furrow irrigation within the next 8 to 12 hours.',
          sourceAttribution: 'On-Farm Soil IoT Telemetry Node',
          status: {
            inApp: 'delivered',
            sms: input.farmer.alertConsent.sms ? 'delivered' : 'opted_out',
            voice: input.farmer.alertConsent.voice ? 'completed' : 'opted_out',
            whatsapp: input.farmer.alertConsent.whatsapp ? 'delivered' : 'opted_out',
          },
          cooldownKey,
        });
        if (newAlert) generatedAlerts.push(newAlert);
      }
    }

    // 5. Device Heartbeat Stale Check
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    for (const dev of (input.devices || [])) {
      if (dev.isActive && dev.lastHeartbeat && new Date(dev.lastHeartbeat).getTime() < sixHoursAgo) {
        const cooldownKey = `device_offline_${dev.id}_${todayStr}`;
        const newAlert = store.addAlert({
          farmerId: input.farmer.id,
          fieldId: dev.fieldId,
          alertType: 'sensor_offline',
          severity: 'info',
          title: `Device Disconnected: ${dev.deviceName}`,
          description: `Device ${dev.deviceCode} has not reported telemetry in over 6 hours. Battery was ${dev.batteryPct}%.`,
          recommendedAction: 'Check on-field solar panel, battery connections, or cellular 4G/WiFi reception.',
          sourceAttribution: 'KrishakDrishti Device Health Watchdog',
          status: {
            inApp: 'delivered',
            sms: 'not_configured',
            voice: 'not_configured',
            whatsapp: 'not_configured',
          },
          cooldownKey,
        });
        if (newAlert) generatedAlerts.push(newAlert);
      }
    }

    return generatedAlerts;
  }
}

export const alertEngine = new AlertEngine();
