export interface PetroleumArticle {
  id: string;
  title: string;
  body: string;
  source: 'اليوم السابع' | 'وزارة البترول والثروة المعدنية';
  url: string;
  imageUrl: string | null;
  imageFallbackUrl?: string | null;
  publishedAt: string;
}

export interface PetroleumFeed {
  articles: PetroleumArticle[];
  source: PetroleumArticle['source'] | 'وزارة البترول واليوم السابع';
  updatedAt: string | null;
  status: 'fresh' | 'stale' | 'unavailable';
}

export interface PetroleumNewsProvider {
  get(): Promise<PetroleumFeed>;
}
