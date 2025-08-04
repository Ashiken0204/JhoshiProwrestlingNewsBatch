import { NewsItem } from '../types/news';
import * as fs from 'fs';
import * as path from 'path';

export class NewsStorage {
  private dataFilePath: string;

  constructor() {
    // Azure Functions環境では一時ディレクトリを使用
    const tempDir = process.env.TEMP || '/tmp';
    this.dataFilePath = path.join(tempDir, 'news-data.json');
  }

  async saveNews(newsItems: NewsItem[]): Promise<void> {
    try {
      // 既存のニュースを読み込み
      const existingNews = await this.loadNews();
      
      // 新しいニュースを追加（重複チェック）
      const mergedNews = this.mergeNews(existingNews, newsItems);
      
      // 日付順でソート（新しい順）
      mergedNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      
      // 最新100件のみ保持
      const limitedNews = mergedNews.slice(0, 100);
      
      // ファイルに保存
      await fs.promises.writeFile(this.dataFilePath, JSON.stringify(limitedNews, null, 2), 'utf8');
      
      console.log(`ニュース保存完了: ${limitedNews.length}件`);
    } catch (error) {
      console.error('ニュース保存エラー:', error);
      throw error;
    }
  }

  async loadNews(): Promise<NewsItem[]> {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        return [];
      }
      
      const data = await fs.promises.readFile(this.dataFilePath, 'utf8');
      const newsItems = JSON.parse(data) as NewsItem[];
      
      // Date型に変換
      return newsItems.map(item => ({
        ...item,
        publishedAt: new Date(item.publishedAt)
      }));
    } catch (error) {
      console.error('ニュース読み込みエラー:', error);
      return [];
    }
  }

  async getNewsByOrganization(organization?: string): Promise<NewsItem[]> {
    const allNews = await this.loadNews();
    
    if (!organization) {
      return allNews;
    }
    
    return allNews.filter(item => item.organization === organization);
  }

  async getLatestNews(limit: number = 20): Promise<NewsItem[]> {
    const allNews = await this.loadNews();
    return allNews.slice(0, limit);
  }

  private mergeNews(existingNews: NewsItem[], newNews: NewsItem[]): NewsItem[] {
    const existingIds = new Set(existingNews.map(item => item.id));
    const uniqueNewNews = newNews.filter(item => !existingIds.has(item.id));
    
    console.log(`新規ニュース: ${uniqueNewNews.length}件`);
    
    return [...existingNews, ...uniqueNewNews];
  }

  async getStatistics(): Promise<any> {
    const allNews = await this.loadNews();
    
    const stats = {
      total: allNews.length,
      byOrganization: {} as Record<string, number>,
      latestUpdate: allNews.length > 0 ? allNews[0].publishedAt : null
    };

    allNews.forEach(item => {
      stats.byOrganization[item.organization] = (stats.byOrganization[item.organization] || 0) + 1;
    });

    return stats;
  }
}