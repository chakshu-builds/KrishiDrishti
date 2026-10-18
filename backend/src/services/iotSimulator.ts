import { store } from '../db/store.js';
import { DeviceTelemetryReading } from '../types/index.js';

export class IoTSimulator {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isPumpActive: boolean = false;

  public start(intervalSeconds: number = 60) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[IoTSimulator] Started hardware simulation tick every ${intervalSeconds} seconds.`);
    this.intervalTimer = setInterval(() => {
      this.generateTick();
    }, intervalSeconds * 1000);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
    console.log('[IoTSimulator] Stopped simulation.');
  }

  public setPumpState(active: boolean): boolean {
    this.isPumpActive = active;
    console.log(`[IoTSimulator] Irrigation pump actuator switched ${active ? 'ON 🟢' : 'OFF ⚪'}`);
    // Immediately generate a tick reflecting the pump action
    this.generateTick();
    return this.isPumpActive;
  }

  public getPumpState(): boolean {
    return this.isPumpActive;
  }

  public injectScenario(scenario: 'drought' | 'optimal' | 'waterlogging' | 'heatwave'): DeviceTelemetryReading[] {
    const devices = store.getDevices().filter((d) => d.isActive && d.isSimulated);
    const generated: DeviceTelemetryReading[] = [];

    let targetMoisture = 42.0;
    let targetSoilTemp = 23.0;
    let targetAirTemp = 27.0;
    let targetHumidity = 52.0;

    switch (scenario) {
      case 'drought':
        targetMoisture = 14.5;
        targetSoilTemp = 32.5;
        targetAirTemp = 37.0;
        targetHumidity = 26.0;
        this.isPumpActive = false;
        break;
      case 'optimal':
        targetMoisture = 42.0;
        targetSoilTemp = 22.5;
        targetAirTemp = 26.0;
        targetHumidity = 55.0;
        break;
      case 'waterlogging':
        targetMoisture = 72.0;
        targetSoilTemp = 19.5;
        targetAirTemp = 21.0;
        targetHumidity = 92.0;
        this.isPumpActive = false;
        break;
      case 'heatwave':
        targetMoisture = 22.0;
        targetSoilTemp = 35.0;
        targetAirTemp = 42.5;
        targetHumidity = 22.0;
        break;
    }

    for (const dev of devices) {
      const reading = store.addDeviceReading({
        deviceId: dev.id,
        fieldId: dev.fieldId,
        soilMoisturePct: dev.deviceType === 'esp32_cam' ? undefined : targetMoisture,
        soilTemperatureC: dev.deviceType === 'esp32_cam' ? undefined : targetSoilTemp,
        airTemperatureC: targetAirTemp,
        humidityPct: targetHumidity,
        nitrogenMgKg: dev.deviceType === 'soil_sensor' ? (scenario === 'drought' ? 95 : 142) : undefined,
        phosphorusMgKg: dev.deviceType === 'soil_sensor' ? (scenario === 'drought' ? 22 : 36) : undefined,
        potassiumMgKg: dev.deviceType === 'soil_sensor' ? (scenario === 'drought' ? 140 : 195) : undefined,
        batteryPct: dev.batteryPct,
        signalRssi: -62,
      });

      store.updateDeviceHeartbeat(dev.deviceCode, reading.batteryPct);
      generated.push(reading);
    }

    return generated;
  }

  public generateTick(): DeviceTelemetryReading[] {
    const devices = store.getDevices().filter((d) => d.isActive && d.isSimulated);
    const generated: DeviceTelemetryReading[] = [];

    const now = new Date();
    const hour = now.getHours();

    for (const dev of devices) {
      const tempDiurnal = 22 + Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 7 + (Math.random() * 1.5 - 0.75);
      const humidityDiurnal = Math.max(30, Math.min(85, 70 - (tempDiurnal - 20) * 2.2 + (Math.random() * 4 - 2)));

      // Retrieve previous reading to model continuity
      const prevReadings = store.getDeviceReadings(dev.id, undefined, 1);
      const prevMoisture = prevReadings[0]?.soilMoisturePct ?? 35;

      let nextMoisture: number;
      if (this.isPumpActive) {
        // Pump is ON: rapid saturation (+4.5% to +6.0%) up to 52%
        nextMoisture = Number(Math.min(52.0, prevMoisture + 4.5 + Math.random() * 1.5).toFixed(1));
      } else {
        // Pump is OFF: natural drying (-0.35% to -0.65%)
        nextMoisture = Number(Math.max(14.0, prevMoisture - 0.45 + (Math.random() * 0.1 - 0.05)).toFixed(1));
      }

      const reading = store.addDeviceReading({
        deviceId: dev.id,
        fieldId: dev.fieldId,
        soilMoisturePct: dev.deviceType === 'esp32_cam' ? undefined : nextMoisture,
        soilTemperatureC: dev.deviceType === 'esp32_cam' ? undefined : Number((tempDiurnal - (this.isPumpActive ? 4.5 : 3.0)).toFixed(1)),
        airTemperatureC: Number(tempDiurnal.toFixed(1)),
        humidityPct: Number((humidityDiurnal + (this.isPumpActive ? 6 : 0)).toFixed(1)),
        nitrogenMgKg: dev.deviceType === 'soil_sensor' ? Math.round(138 + Math.sin(hour) * 8) : undefined,
        phosphorusMgKg: dev.deviceType === 'soil_sensor' ? Math.round(34 + Math.cos(hour) * 3) : undefined,
        potassiumMgKg: dev.deviceType === 'soil_sensor' ? Math.round(192 + Math.sin(hour) * 6) : undefined,
        batteryPct: Math.max(20, dev.batteryPct - 0.01),
        signalRssi: Math.round(-64 + (Math.random() * 4 - 2)),
      });

      store.updateDeviceHeartbeat(dev.deviceCode, reading.batteryPct);
      generated.push(reading);
    }

    return generated;
  }
}

export const iotSimulator = new IoTSimulator();
