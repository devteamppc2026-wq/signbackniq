export type PriceGroupId = 'gasoline' | 'products' | 'crude';
export interface PetroleumPrice {
  id: string;
  name: string;
  value: number;
  currency: 'EGP' | 'USD';
  unit: string;
  sourceDate: string | null;
}
export interface PetroleumPriceGroup {
  id: PriceGroupId;
  title: string;
  items: PetroleumPrice[];
}
export interface PetroleumPriceFeed {
  groups: PetroleumPriceGroup[];
  source: string;
  sourceUrl: string;
  fetchedAt: string | null;
  status: 'fresh' | 'stale' | 'unavailable';
}
export interface PetroleumPriceProvider {
  get(): Promise<PetroleumPriceFeed>;
}
export const MINISTRY_PRICES_URL = 'https://www.petroleum.gov.eg/ar-eg/Pages/HomePage.aspx';
export const MINISTRY_SOURCE = 'وزارة البترول والثروة المعدنية';
