import puppeteer, { Browser } from 'puppeteer';
import { load } from 'cheerio';
import axios from 'axios';
import { NewsItem, NewsOrganization, ScrapingResult } from '../types/news';
import { generateId, formatDate, isValidUrl } from './helpers';

export class NewsScraper {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    try {
      console.log('Puppeteerを初期化中... (Linux Azure Functions環境)');
      
      // Linux Azure Functions用の最適化された設定
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-client-side-phishing-detection',
          '--disable-popup-blocking',
          '--disable-default-apps',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--no-pings',
          '--password-store=basic',
          '--use-mock-keychain',
          '--single-process'
        ],
        timeout: 30000,
        // Puppeteerが自動でChromiumを検出（推奨）
        // executablePath は指定せず、Puppeteerのバンドル版Chromiumを使用
      };
      
      console.log('Launch options:', JSON.stringify(launchOptions, null, 2));
      
      this.browser = await puppeteer.launch(launchOptions);
      console.log('Puppeteer初期化完了 - ブラウザインスタンス作成成功');
      
      // 初期化テスト
      const page = await this.browser.newPage();
      await page.goto('data:text/html,<h1>Test</h1>', { waitUntil: 'load' });
      await page.close();
      console.log('Puppeteer動作テスト完了');
      
    } catch (error) {
      console.error('Puppeteer初期化エラー:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

    async scrapeNews(organization: NewsOrganization): Promise<ScrapingResult> {
    try {
      console.log(`スクレイピング開始: ${organization.displayName}`);
      
      // ページの取得
      const html = await this.fetchPageContent(organization.newsListUrl);
      if (!html) {
        throw new Error('ページの取得に失敗しました');
      }

      // HTMLの解析
      const $ = load(html);
      const newsItems: NewsItem[] = [];

      // 組織別の特別なスクレイピングロジック
      const extractedItems = await this.extractNewsByOrganization($, organization);
      
      for (const item of extractedItems.slice(0, 10)) { // 最大10件に制限
        try {
          if (!item.title || !item.detailUrl) {
            console.warn(`必須項目が不足: ${organization.displayName}`);
            continue;
          }

          const newsItem: NewsItem = {
            id: generateId(`${organization.name}-${item.title}-${item.publishedAt}`),
            title: item.title.trim(),
            summary: item.summary?.trim() || '',
            thumbnail: this.resolveUrl(item.thumbnail, organization.baseUrl),
            publishedAt: this.parseDate(item.publishedAt),
            detailUrl: this.resolveUrl(item.detailUrl, organization.baseUrl),
            organization: organization.name,
            sourceUrl: organization.newsListUrl
          };

          newsItems.push(newsItem);
        } catch (error) {
          console.error(`アイテム解析エラー: ${organization.displayName}`, error);
        }
      }

      console.log(`スクレイピング完了: ${organization.displayName} - ${newsItems.length}件`);
      
      return {
        success: true,
        newsItems,
        organization: organization.name
      };

    } catch (error) {
      console.error(`スクレイピングエラー: ${organization.displayName}`, error);
      return {
        success: false,
        newsItems: [],
        error: error instanceof Error ? error.message : '不明なエラー',
        organization: organization.name
      };
    }
  }

  private async extractNewsByOrganization($: any, organization: NewsOrganization): Promise<any[]> {
    const items: any[] = [];

    switch (organization.name) {
      case 'stardom':
        return this.extractStardomNews($);
      
      case 'tjpw':
        return this.extractTjpwNews($);
      
      case 'ice_ribbon':
        return this.extractIceRibbonNews($);
      
      case 'wave':
        return this.extractWaveNews($);
      
      default:
        return this.extractGenericNews($, organization);
    }
  }

  private extractStardomNews($: any): any[] {
    const items: any[] = [];
    
    // STARDOMのニュース構造を解析 - 実際のニュース記事を対象にする
    $('ul li, .news-list li, article').each((index: number, element: any) => {
      const $item = $(element);
      const text = $item.text().trim();
      const $link = $item.find('a').first();
      
      if (!$link.length || !text) return;
      
      // ナビゲーションメニューやページネーションをスキップ
      if (text.match(/^(NEWS|SCHEDULE|RESULTS|DATABASE|WRESTLER|GOODS|TOP|PREV|NEXT|\d+)$/i)) {
        return;
      }
      
      // 日付がある行のみを対象にする（ニュース記事の判定）
      const dateMatch = text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
      if (!dateMatch) return;
      
      const publishedAt = dateMatch[1];
      
      // タイトルの抽出（日付以降の部分）
      let title = text.substring(text.indexOf(dateMatch[1]) + dateMatch[1].length).trim();
      
      // カテゴリ情報を除去（最初の単語がカテゴリの場合）
      const categoryMatch = title.match(/^(5star|INFO|イベント|グッズ|チケット|メディア出演|大会情報|対戦カード|試合結果|未分類)\s+(.+)$/);
      if (categoryMatch) {
        title = categoryMatch[2];
      }
      
      const detailUrl = $link.attr('href') || '';
      const thumbnail = $item.find('img').first().attr('src') || '';
      
      // タイトルが有効で、URLがニュース詳細ページの場合のみ追加
      if (title && detailUrl && title.length > 5 && !detailUrl.includes('#')) {
        items.push({
          title,
          summary: '',
          thumbnail,
          publishedAt,
          detailUrl
        });
      }
    });
    
    return items;
  }

  private extractTjpwNews($: any): any[] {
    const items: any[] = [];
    
    // 東京女子プロレスのニュース構造を解析
    $('article, .news-item, li').each((index: number, element: any) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      
      if (!$link.length) return;
      
      let title = $link.text().trim();
      if (!title) {
        title = $item.find('h1, h2, h3, .title').first().text().trim();
      }
      
      const detailUrl = $link.attr('href') || '';
      const thumbnail = $item.find('img').first().attr('src') || '';
      
      // 日付の抽出（複数パターンに対応）
      let publishedAt = '';
      const dateText = $item.text();
      const datePatterns = [
        /(\d{4}\/\d{1,2}\/\d{1,2})/,
        /(\d{1,2}月\d{1,2}日)/,
        /(\d{4}-\d{1,2}-\d{1,2})/,
        /(\d{1,2}\/\d{1,2})/
      ];
      
      for (const pattern of datePatterns) {
        const match = dateText.match(pattern);
        if (match) {
          publishedAt = match[1];
          break;
        }
      }
      
      if (title && detailUrl) {
        items.push({
          title,
          summary: '',
          thumbnail,
          publishedAt,
          detailUrl
        });
      }
    });
    
    return items;
  }

  private extractIceRibbonNews($: any): any[] {
    const items: any[] = [];
    
    // アイスリボンのニュース構造を解析
    $('table tr, .news-item, article').each((index: number, element: any) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      
      if (!$link.length) return;
      
      const title = $link.text().trim() || $item.find('td').last().text().trim();
      const detailUrl = $link.attr('href') || '';
      const thumbnail = $item.find('img').first().attr('src') || '';
      
      // テーブル形式の日付取得
      const publishedAt = $item.find('td').first().text().trim();
      
      if (title && detailUrl) {
        items.push({
          title,
          summary: '',
          thumbnail,
          publishedAt,
          detailUrl
        });
      }
    });
    
    return items;
  }

  private extractWaveNews($: any): any[] {
    const items: any[] = [];
    
    // WAVEのニュース構造を解析 - ブログ記事やニュース記事を対象にする
    $('.blog-entry, .news-entry, .post, article, .entry').each((index: number, element: any) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      
      if (!$link.length) return;
      
      let title = $link.text().trim() || $item.find('h1, h2, h3, .title, .entry-title').first().text().trim();
      const detailUrl = $link.attr('href') || '';
      const thumbnail = $item.find('img').first().attr('src') || '';
      
      // ナビゲーションメニューをスキップ
      if (title.match(/^(スケジュール|試合結果|選手紹介|グッズ|HOME|ABOUT|CONTACT)$/)) {
        return;
      }
      
      // 日付の抽出
      let publishedAt = $item.find('.date, time, .post-date').first().text().trim();
      if (!publishedAt) {
        const dateMatch = $item.text().match(/(\d{4}\/\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2})/);
        publishedAt = dateMatch ? dateMatch[1] : '';
      }
      
      // タイトルが有効で、URLが詳細ページの場合のみ追加
      if (title && detailUrl && title.length > 3 && 
          !detailUrl.includes('javascript:') && 
          !detailUrl.includes('#')) {
        items.push({
          title,
          summary: '',
          thumbnail,
          publishedAt,
          detailUrl
        });
      }
    });
    
    // より広範囲でニュースを探す
    if (items.length === 0) {
      $('a').each((index: number, element: any) => {
        const $link = $(element);
        const title = $link.text().trim();
        const detailUrl = $link.attr('href') || '';
        
        // ニュースらしいリンクを検出
        if (title && detailUrl && 
            title.length > 10 && 
            !title.match(/^(スケジュール|試合結果|選手紹介|グッズ|HOME|ABOUT|CONTACT)$/) &&
            detailUrl.includes('.html') &&
            !detailUrl.includes('javascript:')) {
          
          const dateMatch = $link.parent().text().match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
          const publishedAt = dateMatch ? dateMatch[1] : '';
          
          items.push({
            title,
            summary: '',
            thumbnail: '',
            publishedAt,
            detailUrl
          });
        }
      });
    }
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractGenericNews($: any, organization: NewsOrganization): any[] {
    const items: any[] = [];
    
    // 汎用的なニュース抽出
    $(organization.selectors.newsItems).each((index: number, element: any) => {
      const $item = $(element);
      
      const title = this.extractText($item, organization.selectors.title);
      const summary = this.extractText($item, organization.selectors.summary);
      const thumbnail = this.extractAttribute($item, organization.selectors.thumbnail, 'src');
      const publishedAtText = this.extractText($item, organization.selectors.publishedAt);
      const detailUrl = this.extractAttribute($item, organization.selectors.detailUrl, 'href');

      if (title && detailUrl) {
        items.push({
          title,
          summary,
          thumbnail,
          publishedAt: publishedAtText,
          detailUrl
        });
      }
    });
    
    return items;
  }

  private async fetchPageContent(url: string): Promise<string | null> {
    try {
      // まずはaxiosで試行
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        return response.data;
      } catch (axiosError) {
        console.log('axios失敗、puppeteerで再試行');
      }

      // puppeteerで試行
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser!.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const html = await page.content();
      await page.close();
      
      return html;
    } catch (error) {
      console.error(`ページ取得エラー: ${url}`, error);
      return null;
    }
  }

  private extractText($item: any, selector: string): string {
    return $item.find(selector).first().text().trim();
  }

  private extractAttribute($item: any, selector: string, attr: string): string {
    return $item.find(selector).first().attr(attr) || '';
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (!url) return '';
    
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    
    if (url.startsWith('http')) {
      return url;
    }
    
    return `${baseUrl}/${url}`;
  }

  private parseDate(dateText: string): Date {
    if (!dateText) return new Date();
    
    // 日付テキストのクリーンアップ
    const cleanDate = dateText.replace(/[^\d年月日\/\-]/g, '').trim();
    
    // 様々な日付形式に対応
    const patterns = [
      // YYYY/MM/DD, YYYY-MM-DD
      { pattern: /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, format: 'ymd' },
      // MM/DD/YYYY, MM-DD-YYYY
      { pattern: /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, format: 'mdy' },
      // DD/MM/YYYY, DD-MM-YYYY  
      { pattern: /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/, format: 'dmy' },
      // YYYY年MM月DD日
      { pattern: /(\d{4})年(\d{1,2})月(\d{1,2})日/, format: 'ymd' },
      // MM月DD日 (現在年を使用)
      { pattern: /(\d{1,2})月(\d{1,2})日/, format: 'md' },
      // MM/DD (現在年を使用)
      { pattern: /(\d{1,2})\/(\d{1,2})$/, format: 'md' },
      // YYYYMMDD
      { pattern: /(\d{4})(\d{2})(\d{2})/, format: 'ymd' }
    ];

    for (const { pattern, format } of patterns) {
      const match = cleanDate.match(pattern);
      if (match) {
        try {
          let year: number, month: number, day: number;
          const currentYear = new Date().getFullYear();
          
          switch (format) {
            case 'ymd':
              [, year, month, day] = match.map(Number);
              if (year < 100) year += 2000; // 2桁年は2000年代とする
              break;
            case 'mdy':
              [, month, day, year] = match.map(Number);
              if (year < 100) year += 2000;
              break;
            case 'dmy':
              [, day, month, year] = match.map(Number);
              if (year < 100) year += 2000;
              break;
            case 'md':
              year = currentYear;
              [, month, day] = match.map(Number);
              break;
            default:
              continue;
          }
          
          // 日付の妥当性チェック
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2050) {
            const date = new Date(year, month - 1, day);
            // 作成した日付が未来過ぎる場合は前年とする
            if (date > new Date() && format === 'md') {
              date.setFullYear(currentYear - 1);
            }
            return date;
          }
        } catch (error) {
          console.warn(`日付解析エラー: ${dateText}`, error);
        }
      }
    }

    // 自然言語での日付解析を試行
    try {
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000) {
        return parsed;
      }
    } catch (error) {
      // 無視
    }

    // 解析できない場合は現在日時
    console.warn(`日付解析できませんでした: ${dateText}`);
    return new Date();
  }
}