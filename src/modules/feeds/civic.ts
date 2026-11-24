import { z } from 'zod';
const cairoDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
const weatherSchema = z.object({
  current: z.object({ temperature_2m: z.number(), weather_code: z.number().int(), is_day: z.number().int().min(0).max(1).optional() }),
});
const prayerSchema = z.object({
  data: z.object({
    timings: z.object({
      Fajr: z.string(),
      Dhuhr: z.string(),
      Asr: z.string(),
      Maghrib: z.string(),
      Isha: z.string(),
    }),
  }),
});
export class CairoInformationService {
  private weather = {
    temperature: '—',
    weather: 'غير متاح',
    weatherCode: undefined as number | undefined,
    weatherIsDay: undefined as boolean | undefined,
    weatherUpdatedAt: '',
    weatherSource: 'Open-Meteo',
  };
  private prayers = {
    prayerDate: '',
    prayers: ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'].map((name, index) => ({
      name,
      time: '--:--',
      icon: ['◒', '☼', '☀', '◒', '☾'][index],
    })),
  };
  private lastAttempt = 0;
  private pending: Promise<void> | undefined;
  async get() {
    if (Date.now() - this.lastAttempt > 10 * 60 * 1000) {
      this.lastAttempt = Date.now();
      this.pending = this.refresh();
    }
    await this.pending;
    return { city: 'القاهرة', ...this.weather, ...this.prayers };
  }
  private async refresh() {
    await Promise.allSettled([this.updateWeather(), this.updatePrayers()]);
  }
  private async updateWeather() {
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=30.0444&longitude=31.2357&current=temperature_2m,weather_code,is_day&timezone=Africa%2FCairo',
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error('Weather provider unavailable');
    const { current } = weatherSchema.parse(await response.json());
    this.weather = {
      temperature: String(Math.round(current.temperature_2m)),
      weatherCode: current.weather_code,
      weatherIsDay: current.is_day === undefined ? undefined : current.is_day === 1,
      weather:
        current.weather_code < 3
          ? 'صحو'
          : current.weather_code <= 48
            ? 'غائم'
            : current.weather_code >= 95
              ? 'عواصف رعدية'
              : 'أمطار',
      weatherUpdatedAt: new Date().toISOString(),
      weatherSource: 'Open-Meteo',
    };
  }
  private async updatePrayers() {
    const day = cairoDate();
    if (this.prayers.prayerDate === day) return;
    const apiDate = day.split('-').reverse().join('-');
    const response = await fetch(
      'https://api.aladhan.com/v1/timingsByCity/' + apiDate + '?city=Cairo&country=Egypt&method=5',
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error('Prayer provider unavailable');
    const { data } = prayerSchema.parse(await response.json());
    const timings = [
      data.timings.Fajr,
      data.timings.Dhuhr,
      data.timings.Asr,
      data.timings.Maghrib,
      data.timings.Isha,
    ];
    if (!timings.every((t) => /^\d{2}:\d{2}/.test(t))) throw new Error('Invalid prayer times');
    this.prayers = {
      prayerDate: day,
      prayers: this.prayers.prayers.map((prayer, index) => ({
        ...prayer,
        time: timings[index]!.slice(0, 5),
      })),
    };
  }
}
