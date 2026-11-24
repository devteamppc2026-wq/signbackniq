import type { SettingsInput, TickerInput } from './ticker.dto.js';

export const TICKER_REPOSITORY = Symbol('TickerRepository');
export type Settings = Required<SettingsInput> & { tickerNewsIds: number[] | null };

export interface TickerRepository {
  settings(): Promise<Settings>;
  saveSettings(input: SettingsInput): Promise<void>;
  saveTicker(input: TickerInput): Promise<void>;
}
