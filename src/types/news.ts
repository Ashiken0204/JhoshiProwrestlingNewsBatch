export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  thumbnail: string;
  publishedAt: Date;
  detailUrl: string;
  organization: string;
  sourceUrl: string;
}

export interface NewsOrganization {
  name: string;
  displayName: string;
  baseUrl: string;
  newsListUrl: string;
  useSelenium?: boolean; // Seleniumを使用して動的コンテンツを取得するかどうか
  selectors: {
    newsItems: string;
    title: string;
    summary: string;
    thumbnail: string;
    publishedAt: string;
    detailUrl: string;
  };
}

export interface ScrapingResult {
  success: boolean;
  newsItems: NewsItem[];
  error?: string;
  organization: string;
}