import puppeteer, { Browser } from 'puppeteer';
import { load } from 'cheerio';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import { NewsItem, NewsOrganization, ScrapingResult } from '../types/news';
import { generateId, formatDate, isValidUrl } from './helpers';

export class NewsScraper {
  private browser: Browser | null = null;
  private seleniumDriver: WebDriver | null = null;

  async initialize(): Promise<void> {
    try {
      console.log('Puppeteerを初期化中... (Linux Azure Functions環境)');
      console.log('Environment variables:', {
        PUPPETEER_CACHE_DIR: process.env.PUPPETEER_CACHE_DIR,
        PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
      });
      
      // Chrome実行可能ファイルのパスを検出
      let executablePath = undefined;
      
      // 1. 環境変数から取得を試行
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log('Using PUPPETEER_EXECUTABLE_PATH:', executablePath);
      } else {
        // 2. globを使用してChromium実行ファイルを検索
        console.log('Chromium実行ファイルを検索中...');
        try {
          const chromiumPatterns = [
            'node_modules/puppeteer/.local-chromium/linux-*/chrome-linux/chrome',
            'node_modules/puppeteer/.cache/chrome/linux-*/chrome-linux/chrome',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium'
          ];
          
          for (const pattern of chromiumPatterns) {
            const matches = glob.sync(pattern);
            if (matches.length > 0) {
              executablePath = matches[0];
              console.log('Found Chromium executable:', executablePath);
              break;
            }
          }
          
          if (executablePath) {
            // 実行権限を確認・設定
            try {
              const stats = fs.statSync(executablePath);
              if (!(stats.mode & fs.constants.S_IXUSR)) {
                console.log('Setting executable permissions for:', executablePath);
                fs.chmodSync(executablePath, '755');
              }
              console.log('Chromium executable is ready:', executablePath);
            } catch (permError) {
              console.error('Permission setting failed:', permError);
              executablePath = undefined;
            }
          } else {
            console.log('No Chromium executable found in common locations');
          }
        } catch (globError) {
          console.error('Glob search failed:', globError);
        }
      }
      
      if (!executablePath) {
        console.log('⚠️ Chromium実行ファイルが見つかりません。Puppeteerを無効化します。');
        this.browser = null;
        return;
      }
      
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
        executablePath
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
        nodeVersion: process.version,
        chromePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        cacheDir: process.env.PUPPETEER_CACHE_DIR
      });
      
      // Puppeteerが失敗した場合、Axiosのみでのスクレイピングにフォールバック
      console.log('⚠️ Puppeteerが利用できません。Axiosのみでスクレイピングを継続します。');
      this.browser = null; // Puppeteerを無効化
      
      // エラーを再スローせず、Axiosフォールバックを使用
      return;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    if (this.seleniumDriver) {
      await this.seleniumDriver.quit();
      this.seleniumDriver = null;
    }
  }

  private async initializeSelenium(): Promise<void> {
    try {
      console.log('Seleniumを初期化中...');
      
      const options = new chrome.Options();
      options.addArguments('--headless');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
      options.addArguments('--disable-extensions');
      options.addArguments('--disable-background-timer-throttling');
      options.addArguments('--disable-backgrounding-occluded-windows');
      options.addArguments('--disable-renderer-backgrounding');
      options.addArguments('--disable-ipc-flooding-protection');
      options.addArguments('--disable-hang-monitor');
      options.addArguments('--disable-client-side-phishing-detection');
      options.addArguments('--disable-popup-blocking');
      options.addArguments('--disable-default-apps');
      options.addArguments('--disable-prompt-on-repost');
      options.addArguments('--disable-sync');
      options.addArguments('--metrics-recording-only');
      options.addArguments('--no-default-browser-check');
      options.addArguments('--no-first-run');
      options.addArguments('--no-zygote');
      options.addArguments('--disable-accelerated-2d-canvas');
      options.addArguments('--disable-web-security');
      options.addArguments('--allow-running-insecure-content');
      options.addArguments('--disable-features=VizDisplayCompositor');
      options.addArguments('--disable-software-rasterizer');
      options.addArguments('--disable-background-networking');
      options.addArguments('--disable-extensions');
      options.addArguments('--disable-sync');
      options.addArguments('--disable-translate');
      options.addArguments('--hide-scrollbars');
      options.addArguments('--mute-audio');
      options.addArguments('--safebrowsing-disable-auto-update');
      options.addArguments('--ignore-certificate-errors');
      options.addArguments('--ignore-ssl-errors');
      options.addArguments('--ignore-certificate-errors-spki-list');
      options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      this.seleniumDriver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
      
      console.log('Selenium初期化完了');
    } catch (error) {
      console.error('Selenium初期化エラー:', error);
      this.seleniumDriver = null;
    }
  }

  private async fetchDynamicContent(url: string): Promise<string> {
    if (!this.seleniumDriver) {
      await this.initializeSelenium();
    }
    
    if (!this.seleniumDriver) {
      throw new Error('Seleniumドライバーが初期化できませんでした');
    }
    
    try {
      console.log(`Seleniumで動的コンテンツを取得中: ${url}`);
      
      await this.seleniumDriver.get(url);
      
      // ページが完全に読み込まれるまで待機
      await this.seleniumDriver.wait(until.elementLocated(By.tagName('body')), 10000);
      
      // JavaScriptの実行完了を待機
      await this.seleniumDriver.sleep(3000);
      
      // ページのHTMLを取得
      const pageSource = await this.seleniumDriver.getPageSource();
      
      console.log(`Seleniumで動的コンテンツ取得成功: ${pageSource.length}文字`);
      
      return pageSource;
    } catch (error) {
      console.error('Seleniumで動的コンテンツ取得エラー:', error);
      throw error;
    }
  }

  private async getSeadlinnngDetailUrls(): Promise<Map<string, string>> {
    if (!this.seleniumDriver) {
      await this.initializeSelenium();
    }
    
    if (!this.seleniumDriver) {
      throw new Error('Seleniumドライバーが初期化できませんでした');
    }
    
    const detailUrls = new Map<string, string>();
    
    try {
      console.log('SEAdLINNNG詳細URL取得開始');
      
      // ニュースページにアクセス
      await this.seleniumDriver.get('https://seadlinnng.com/news');
      await this.seleniumDriver.wait(until.elementLocated(By.tagName('body')), 10000);
      await this.seleniumDriver.sleep(3000);
      
      // 各記事を順番にクリックして詳細URLを取得
      for (let i = 0; i < 10; i++) {
        try {
          // 毎回記事要素を再取得（StaleElementReferenceErrorを回避）
          const articles = await this.seleniumDriver.findElements(By.css('article.item-acvinfo'));
          if (articles.length <= i) {
            console.log(`記事${i + 1}が見つかりません。終了します。`);
            break;
          }
          
          // 記事のテキストを取得（キーとして使用）
          const articleText = await articles[i].getText();
          const titleMatch = articleText.match(/【(.+?)】/);
          const title = titleMatch ? titleMatch[1] : articleText.substring(0, 50);
          
          console.log(`記事${i + 1}をクリック中: "${title}"`);
          
          // 記事をクリック
          await articles[i].click();
          await this.seleniumDriver.sleep(2000);
          
          // 新しいURLを取得
          const detailUrl = await this.seleniumDriver.getCurrentUrl();
          
          if (detailUrl !== 'https://seadlinnng.com/news') {
            detailUrls.set(title, detailUrl);
            console.log(`詳細URL取得: "${title}" -> ${detailUrl}`);
          }
          
          // ニュースページに戻る
          await this.seleniumDriver.get('https://seadlinnng.com/news');
          await this.seleniumDriver.wait(until.elementLocated(By.tagName('body')), 10000);
          await this.seleniumDriver.sleep(2000);
          
        } catch (error) {
          console.error(`記事${i + 1}の詳細URL取得エラー:`, error);
          // エラーが発生した場合もニュースページに戻る
          try {
            await this.seleniumDriver.get('https://seadlinnng.com/news');
            await this.seleniumDriver.wait(until.elementLocated(By.tagName('body')), 10000);
            await this.seleniumDriver.sleep(2000);
          } catch (backError) {
            console.error('ニュースページへの復帰エラー:', backError);
          }
        }
      }
      
      console.log(`SEAdLINNNG詳細URL取得完了: ${detailUrls.size}件`);
      return detailUrls;
      
    } catch (error) {
      console.error('SEAdLINNNG詳細URL取得エラー:', error);
      return detailUrls;
    }
  }

    async scrapeNews(organization: NewsOrganization): Promise<ScrapingResult> {
    try {
      console.log(`スクレイピング開始: ${organization.displayName}`);
      
      // ページの取得
      const html = await this.fetchPageContent(organization.newsListUrl, organization);
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
      
      // アイスリボンの場合、Azure Functions環境での特別な処理
      if (organization.name === 'ice_ribbon' && process.env.FUNCTIONS_WORKER_RUNTIME) {
        console.log('🔄 アイスリボンAzure Functions環境: フォールバック処理を実行');
        
        // フォールバックとして、ダミーデータまたは空データを返す
        return {
          success: true, // エラーとして扱わず、空のデータとして処理
          newsItems: [], // 空のニュース配列
          error: `Azure Functions環境でのアイスリボン取得をスキップしました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          organization: organization.name
        };
      }
      
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
      
      case 'chocopro':
        return this.extractChocoproNews($);
      
      case 'sendaigirls':
        return this.extractSendaigirlsNews($);
      
      case 'diana':
        return this.extractDianaNews($);
      
      case 'oz_academy':
        return this.extractOzAcademyNews($);
      
      case 'seadlinnng':
        return await this.extractSeadlinnngNews($);
      
      case 'marigold':
        return this.extractMarigoldNews($);
      
      case 'marvelous':
        return this.extractMarvelousNews($);
      
              case 'purej':
          return this.extractPurejNews($);
        case 'gokigenpro':
          return this.extractGokigenproNews($);
        case 'jto':
          return this.extractJtoNews($);
        case 'evolution':
          return await this.extractEvolutionNewsWithSelenium();
      
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

  private extractChocoproNews($: any): any[] {
    const items: any[] = [];
    
    // チョコプロサイトのニュースリスト構造を解析
    console.log('チョコプロサイトの構造を解析中...');
    
    // メインコンテンツエリアからニュース項目を抽出
    $('article, .post, .news-item, .entry').each((index: number, element: any) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      
      if (!$link.length) return;
      
      let title = $link.text().trim();
      const detailUrl = $link.attr('href') || '';
      
      // タイトルが短すぎる場合、他の要素から取得を試行
      if (!title || title.length < 5) {
        title = $item.find('h1, h2, h3, .title').first().text().trim();
      }
      
      // チョコプロ特有のタイトル整形
      if (title) {
        // 日付とカテゴリを除去してメインタイトルを抽出
        title = title
          .replace(/^\d{4}\.\d{2}\.\d{2}\s+/, '') // 先頭の日付を除去
          .replace(/\s+(大会情報|試合結果|ニュース|インタビュー|メディア情報|物販情報|イベント情報)\/[^\s]+\s+/, ' ') // カテゴリを除去
          .replace(/\s+gtmv\s+/, ' ') // gtmvを除去
          .replace(/\s+/g, ' ') // 複数の空白を1つに
          .trim();
        
        // 長すぎるタイトルを適切な長さに切り詰め
        if (title.length > 100) {
          title = title.substring(0, 100).trim();
          // 文の途中で切れないように調整
          const lastSpace = title.lastIndexOf(' ');
          const lastPunctuation = Math.max(
            title.lastIndexOf('。'),
            title.lastIndexOf('！'),
            title.lastIndexOf('？'),
            title.lastIndexOf('」')
          );
          
          if (lastPunctuation > 80) {
            title = title.substring(0, lastPunctuation + 1);
          } else if (lastSpace > 80) {
            title = title.substring(0, lastSpace);
          }
          
          title = title.trim();
        }
      }
      
      // 日付の取得
      let publishedAt = '';
      const $dateElement = $item.find('.date, time, .published, .entry-date').first();
      if ($dateElement.length) {
        publishedAt = $dateElement.text().trim() || $dateElement.attr('datetime') || '';
      }
      
      // 日付が見つからない場合、テキストから抽出を試行
      if (!publishedAt) {
        const dateMatch = $item.text().match(/(\d{4}[-\.\/]\d{1,2}[-\.\/]\d{1,2})/);
        publishedAt = dateMatch ? dateMatch[1] : '';
      }
      
      // 概要の取得
      let summary = '';
      const $summaryElement = $item.find('.excerpt, .summary, .content, .entry-content').first();
      if ($summaryElement.length) {
        summary = $summaryElement.text().trim().substring(0, 200);
      }
      
      // サムネイル画像の取得
      const thumbnail = $item.find('img').first().attr('src') || '';
      
      // URLの正規化
      let fullDetailUrl = detailUrl;
      if (detailUrl && !detailUrl.startsWith('http')) {
        fullDetailUrl = detailUrl.startsWith('/') 
          ? `https://chocoprowrestling.com${detailUrl}`
          : `https://chocoprowrestling.com/${detailUrl}`;
      }
      
      // ニュース記事として有効かチェック
      const isValidNews = title && 
                         title.length > 5 && 
                         fullDetailUrl && 
                         !fullDetailUrl.includes('javascript:') &&
                         !fullDetailUrl.includes('#') &&
                         !title.match(/^(HOME|NEWS|SCHEDULE|CONTACT|ABOUT|トップ|ニュース|スケジュール|結果|選手紹介|チケット|YouTube|Instagram|X|Twitter)$/i);
      
      if (isValidNews) {
        items.push({
          title: title.replace(/\s+/g, ' ').trim(),
          summary: summary || '',
          thumbnail: thumbnail || '',
          publishedAt: publishedAt || new Date().toISOString(),
          detailUrl: fullDetailUrl
        });
      }
    });
    
    // リスト形式のニュースも確認
    if (items.length === 0) {
      console.log('記事形式で見つからないため、リスト形式を確認中...');
      
      $('li, .news-list-item, .post-list-item').each((index: number, element: any) => {
        const $item = $(element);
        const $link = $item.find('a').first();
        
        if (!$link.length) return;
        
        const title = $link.text().trim();
        const detailUrl = $link.attr('href') || '';
        
        if (title && title.length > 5 && detailUrl && !detailUrl.includes('javascript:')) {
          let fullDetailUrl = detailUrl;
          if (!detailUrl.startsWith('http')) {
            fullDetailUrl = detailUrl.startsWith('/') 
              ? `https://chocoprowrestling.com${detailUrl}`
              : `https://chocoprowrestling.com/${detailUrl}`;
          }
          
          // 日付の抽出
          const dateMatch = $item.text().match(/(\d{4}[-\.\/]\d{1,2}[-\.\/]\d{1,2})/);
          const publishedAt = dateMatch ? dateMatch[1] : '';
          
          items.push({
            title: title.replace(/\s+/g, ' ').trim(),
            summary: '',
            thumbnail: $item.find('img').first().attr('src') || '',
            publishedAt: publishedAt || new Date().toISOString(),
            detailUrl: fullDetailUrl
          });
        }
      });
    }
    
    console.log(`チョコプロニュース抽出完了: ${items.length}件`);
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractIceRibbonNews($: any): any[] {
    const items: any[] = [];
    
    // HTMLが空または不完全な場合の対処
    const htmlContent = $.html();
    if (!htmlContent || htmlContent.length < 100) {
      console.log('⚠️ アイスリボンHTML内容が不完全です:', htmlContent.length, '文字');
      return [];
    }
    
    console.log(`アイスリボンHTML解析開始: ${htmlContent.length}文字`);
    
    // Azure Functions環境での詳細ログ
    if (process.env.FUNCTIONS_WORKER_RUNTIME) {
      console.log('🔍 Azure Functions環境: アイスリボンHTML構造分析');
      console.log(`HTML内容サンプル: ${htmlContent.substring(0, 500)}...`);
      
      // 重要な要素の存在チェック
      const tableCount = (htmlContent.match(/<table/g) || []).length;
      const trCount = (htmlContent.match(/<tr/g) || []).length;
      const linkCount = (htmlContent.match(/<a[^>]+href/g) || []).length;
      const newsDetailCount = (htmlContent.match(/news_detail\.php/g) || []).length;
      
      console.log(`要素数統計: table=${tableCount}, tr=${trCount}, link=${linkCount}, news_detail=${newsDetailCount}`);
    }
    
    // アイスリボン公式サイトのニュースリスト構造を解析
    // 日本語サイトなので、日本語の日付パターンも考慮
    $('tr, .news-item, li').each((index: number, element: any) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      
      if (!$link.length) return;
      
      let title = $link.text().trim();
      const detailUrl = $link.attr('href') || '';
      
      // テーブル構造の場合、tdからタイトルを取得
      if (!title || title.length < 3) {
        const $titleCell = $item.find('td').last();
        title = $titleCell.text().trim();
      }
      
      // 日付の取得（テーブル構造を想定）
      let publishedAt = '';
      const $dateCell = $item.find('td').first();
      if ($dateCell.length) {
        publishedAt = $dateCell.text().trim();
      }
      
      // 日付が見つからない場合、記事内から抽出
      if (!publishedAt) {
        const dateMatch = $item.text().match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
        publishedAt = dateMatch ? dateMatch[1] : '';
      }
      
      // サムネイル画像の取得
      const thumbnail = $item.find('img').first().attr('src') || '';
      
              // ナビゲーションメニューや不要なリンクをスキップ
        // 日付パターンがあるもの（実際のニュース記事）のみを対象とする
        const hasDate = publishedAt && publishedAt.match(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/);
        const isNewsArticle = detailUrl.includes('news_detail.php');
        
        // 文字化けがあっても、news_detail.phpを含むリンクは有効なニュースとして扱う
        const isValidNewsLink = detailUrl.includes('news_detail.php') && title.length > 3;
        
        if (title && detailUrl && 
            !detailUrl.includes('javascript:') && 
            !detailUrl.includes('#') &&
            (hasDate || isNewsArticle || isValidNewsLink) &&
            !title.match(/^(HOME|NEWS|SCHEDULE|CONTACT|ABOUT|トップ|ニュース|スケジュール|結果|選手紹介|イベント|お問い合わせ|チケット|YouTube)$/i)) {
        
        items.push({
          title: title.replace(/\s+/g, ' ').trim(), // 余分な空白を除去
          summary: '', // 公式サイトでは概要は別途取得が必要
          thumbnail,
          publishedAt,
          detailUrl
        });
      }
    });
    
    console.log(`第1段階抽出完了: ${items.length}件 (tr, .news-item, li要素から)`);
    
    // テーブル構造でニュースが取得できない場合の代替手段
    if (items.length === 0) {
      console.log('第1段階で0件のため、第2段階抽出を実行 (全aタグから)');
      $('a').each((index: number, element: any) => {
        const $link = $(element);
        const title = $link.text().trim();
        const detailUrl = $link.attr('href') || '';
        
        // ニュース記事らしいリンクを検出（文字化け対応）
        const isValidNewsUrl = detailUrl.includes('news_detail.php') || detailUrl.includes('.php');
        const hasMinimumTitle = title && title.length > 3; // 最小タイトル長を短縮
        const isNotNavigation = !title.match(/^(HOME|NEWS|SCHEDULE|CONTACT|ABOUT|トップ|ニュース|スケジュール|結果|選手紹介)$/i);
        
        if (hasMinimumTitle && detailUrl && 
            isValidNewsUrl &&
            isNotNavigation &&
            !detailUrl.includes('javascript:')) {
          
          // 親要素から日付を探す
          const $parent = $link.closest('tr, li, .news-item');
          const dateMatch = $parent.text().match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
          const publishedAt = dateMatch ? dateMatch[1] : '';
          
          items.push({
            title: title.replace(/\s+/g, ' ').trim(),
            summary: '',
            thumbnail: '',
            publishedAt,
            detailUrl
          });
        }
      });
      
      console.log(`第2段階抽出完了: ${items.length}件 (全aタグから)`);
    }
    
    console.log(`アイスリボン最終抽出結果: ${items.length}件`);
    
    // Azure Functions環境での詳細結果ログ
    if (process.env.FUNCTIONS_WORKER_RUNTIME && items.length > 0) {
      console.log('🔍 Azure Functions環境: 抽出されたニュース詳細');
      items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. タイトル: ${item.title.substring(0, 50)}...`);
        console.log(`   URL: ${item.detailUrl}`);
        console.log(`   日付: ${item.publishedAt}`);
      });
    } else if (process.env.FUNCTIONS_WORKER_RUNTIME && items.length === 0) {
      console.log('⚠️ Azure Functions環境: ニュース抽出が0件でした');
    }
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractWaveNews($: any): any[] {
    const items: any[] = [];
    
    console.log('Waveニュース抽出開始');
    
    // WAVEの実際のサイト構造に基づく抽出
    $('.blog_list > div').each((index: number, element: any) => {
      const $item = $(element);
      
      // 日付の抽出（.blog_dateクラスから）
      const publishedAt = $item.find('.blog_date').first().text().trim();
      
      // タイトルの抽出（h3 > a > spanから）
      const $titleSpan = $item.find('h3 a span').first();
      const title = $titleSpan.text().trim();
      
      // URLの抽出
      const detailUrl = $item.find('h3 a').first().attr('href') || '';
      
      // サムネイルの抽出（blog_photo内の画像から）
      const thumbnail = $item.find('.blog_photo img').first().attr('src') || '';
      
      console.log(`Wave記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}"`);
      
      // 有効なデータの場合のみ追加
      if (title && detailUrl && publishedAt && 
          title.length > 3 && 
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
    
    console.log(`Wave抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractSendaigirlsNews($: any): any[] {
    const items: any[] = [];
    
    console.log('仙女ニュース抽出開始');
    
    // 仙女の実際のサイト構造に基づく抽出
    $('li').each((index: number, element: any) => {
      const $item = $(element);
      
      // 日付の抽出（li要素の最初の部分から）
      const dateMatch = $item.text().match(/(\d{4}\.\d{1,2}\.\d{1,2})/);
      if (!dateMatch) return;
      
      const publishedAt = dateMatch[1];
      
      // タイトルの抽出（h3 > aから）
      const $titleLink = $item.find('h3 a').first();
      const title = $titleLink.text().trim();
      
      // URLの抽出
      const detailUrl = $titleLink.attr('href') || '';
      
      // サムネイルの抽出
      const thumbnail = $item.find('img').first().attr('src') || '';
      
      // 概要の抽出（p要素から）
      const summary = $item.find('p').first().text().trim();
      
      console.log(`仙女記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}"`);
      
      // 有効なデータの場合のみ追加
      if (title && detailUrl && publishedAt && 
          title.length > 3 && 
          !detailUrl.includes('javascript:') && 
          !detailUrl.includes('#')) {
        
        items.push({
          title,
          summary,
          thumbnail,
          publishedAt,
          detailUrl
        });
      }
    });
    
    console.log(`仙女抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractDianaNews($: any): any[] {
    const items: any[] = [];
    
    console.log('ディアナニュース抽出開始');
    
    // rt-tpg-container-で始まるIDを持つ要素から抽出
    $('[id^="rt-tpg-container-"] .rt-detail').each((index: number, element: any) => {
      const $item = $(element);
      
      // タイトルの抽出
      const $titleLink = $item.find('.entry-title a').first();
      const title = $titleLink.text().trim();
      
      // URLの抽出
      const detailUrl = $titleLink.attr('href') || '';
      
      // 日付の抽出
      const publishedAt = $item.find('.date-meta').first().text().trim();
      
      // サムネイルの抽出
      const thumbnail = $item.find('.rt-img-holder img').first().attr('src') || '';
      
      // 概要の抽出
      const summary = $item.find('.entry-content').first().text().trim();
      
      console.log(`ディアナ記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}"`);
      
      // 有効なデータの場合のみ追加（日付がなくてもタイトルとURLがあれば追加）
      if (title && detailUrl && 
          title.length > 3 && 
          !detailUrl.includes('javascript:') && 
          !detailUrl.includes('#')) {
        
        items.push({
          title,
          summary,
          thumbnail,
          publishedAt: publishedAt || new Date().toISOString().split('T')[0], // 日付がない場合は今日の日付を使用
          detailUrl
        });
      }
    });
    
    console.log(`ディアナ抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractOzAcademyNews($: any): any[] {
    const items: any[] = [];
    
    console.log('OZアカデミーニュース抽出開始');
    
    // article.p-news__post要素から抽出
    $('article.p-news__post').each((index: number, element: any) => {
      const $item = $(element);
      
      // タイトルの抽出
      const title = $item.find('.p-news__post--title').first().text().trim();
      
      // URLの抽出
      const detailUrl = $item.find('a.p-news__post--link').first().attr('href') || '';
      
      // 日付の抽出
      const publishedAt = $item.find('.p-news__post--date').first().text().trim();
      
      // サムネイルの抽出
      const thumbnail = $item.find('.p-news__post--image img').first().attr('data-src') || 
                       $item.find('.p-news__post--image img').first().attr('src') || '';
      
      // 概要の抽出
      const summary = $item.find('.p-news__post--text').first().text().trim();
      
      console.log(`OZアカデミー記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}"`);
      
      // 有効なデータの場合のみ追加
      if (title && detailUrl && 
          title.length > 3 && 
          !detailUrl.includes('javascript:') && 
          !detailUrl.includes('#')) {
        
        items.push({
          title,
          summary,
          thumbnail,
          publishedAt: publishedAt || new Date().toISOString().split('T')[0],
          detailUrl
        });
      }
    });
    
    console.log(`OZアカデミー抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private async extractSeadlinnngNews($: any): Promise<any[]> {
    const items: any[] = [];
    
    console.log('SEAdLINNNGニュース抽出開始');
    
    // 詳細URLを取得
    const detailUrls = await this.getSeadlinnngDetailUrls();
    
    // article.item-acvinfo要素からニュース記事を抽出
    $('article.item-acvinfo').each((index: number, element: any) => {
      const $item = $(element);
      const text = $item.text().trim();
      
      // テキストから日付とタイトルを抽出
      const dateMatch = text.match(/(\d{4}\.\d{2}\.\d{2})/);
      const publishedAt = dateMatch ? dateMatch[1] : '';
      
      // 日付以降の部分をタイトルとして抽出
      let title = '';
      if (dateMatch) {
        title = text.substring(text.indexOf(dateMatch[1]) + dateMatch[1].length).trim();
        // カテゴリ情報（OTHERS等）を除去
        title = title.replace(/^[A-Z]+\s+/, '').trim();
      }
      
      // タイトルから詳細URLを検索
      let detailUrl = 'https://seadlinnng.com/news'; // デフォルト
      if (title) {
        // タイトルマッチングで詳細URLを検索
        for (const [urlTitle, url] of detailUrls.entries()) {
          if (title.includes(urlTitle) || urlTitle.includes(title.substring(0, 20))) {
            detailUrl = url;
            break;
          }
        }
      }
      
      console.log(`SEAdLINNNG記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}"`);
      
      // 有効なデータの場合のみ追加
      if (title && publishedAt && 
          title.length > 3 && 
          !title.includes('javascript:') && 
          !title.includes('#')) {
        
        items.push({
          title,
          summary: '',
          thumbnail: '/images/default-thumbnail.jpg', // デフォルト画像を使用
          publishedAt: publishedAt || new Date().toISOString().split('T')[0],
          detailUrl
        });
      }
    });
    
    console.log(`SEAdLINNNG抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractMarigoldNews($: any): any[] {
    const items: any[] = [];
    
    console.log('マリーゴールドニュース抽出開始');
    
    // ニュース記事要素から抽出
    $('.c-post1.c-post1--diff').each((index: number, element: any) => {
      const $item = $(element);
      
      // タイトルの抽出
      const title = $item.find('.c-post1__title').first().text().trim();
      
      // URLの抽出
      const detailUrl = $item.find('.c-post1__title').first().attr('href') || '';
      
      // 日付の抽出
      let publishedAt = $item.find('.c-post1__box').first().text().trim();
      // 日付から余分な文字を除去
      publishedAt = publishedAt.replace(/\s+/g, ' ').replace(/\s*(NEWS|EVENT)\s*$/i, '').trim();
      
      // サムネイルの抽出（画像を優先）
      let thumbnail = $item.find('img').first().attr('src') || '';
      if (thumbnail && !thumbnail.startsWith('http')) {
        thumbnail = `https://dsf-marigold.com${thumbnail}`;
      }
      
      // 概要の抽出
      const summary = $item.find('.c-post1__text').first().text().trim();
      
      console.log(`マリーゴールド記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}", サムネイル="${thumbnail}"`);
      
      // 有効なデータの場合のみ追加
      if (title && detailUrl && 
          title.length > 3 && 
          !detailUrl.includes('javascript:') && 
          !detailUrl.includes('#')) {
        
        items.push({
          title,
          summary,
          thumbnail: thumbnail || '/images/default-thumbnail.jpg',
          publishedAt: publishedAt || new Date().toISOString().split('T')[0],
          detailUrl
        });
      }
    });
    
    console.log(`マリーゴールド抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractMarvelousNews($: any): any[] {
    const items: any[] = [];
    
    console.log('マーベラスニュース抽出開始');
    
    // ニュース記事要素から抽出
    $('article.media').each((index: number, element: any) => {
      const $item = $(element);
      
      // タイトルの抽出
      const title = $item.find('h1.media-heading.entry-title a').first().text().trim();
      
      // URLの抽出
      const detailUrl = $item.find('h1.media-heading.entry-title a').first().attr('href') || '';
      
      // 日付の抽出
      let publishedAt = $item.find('.entry-meta').first().text().trim();
      // 日付から余分な文字を除去
      publishedAt = publishedAt.replace(/\s+/g, ' ').replace(/\/\s*最終更新日時\s*:\s*\d{4}年\d{1,2}月\d{1,2}日\s*/g, '').replace(/\s*marvelous\s*NEWS\s*/g, '').trim();
      
      // 概要の抽出
      const summary = $item.find('.entry-summary, p').first().text().trim();
      
      console.log(`マーベラス記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}"`);
      
      // 有効なデータの場合のみ追加
      if (title && detailUrl && 
          title.length > 3 && 
          !detailUrl.includes('javascript:') && 
          !detailUrl.includes('#')) {
        
        items.push({
          title,
          summary,
          thumbnail: '/images/default-thumbnail.jpg', // デフォルト画像を使用
          publishedAt: publishedAt || new Date().toISOString().split('T')[0],
          detailUrl
        });
      }
    });
    
    console.log(`マーベラス抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractPurejNews($: any): any[] {
    const items: any[] = [];
    
    console.log('PURE-Jニュース抽出開始');
    
    // #newsセクション内のニュース記事要素から抽出
    $('#news h3.elementor-heading-title').each((index: number, element: any) => {
      const $item = $(element);
      
      // タイトルの抽出
      const title = $item.text().trim();
      
      // 日付の抽出（親要素からtime要素を探す）
      let publishedAt = '';
      const $parent = $item.closest('.elementor-widget-wrap');
      if ($parent.length > 0) {
        publishedAt = $parent.find('time').first().text().trim();
      }
      
      // 日付が見つからない場合は、同じセクション内のtime要素を探す
      if (!publishedAt) {
        const $section = $item.closest('#news');
        if ($section.length > 0) {
          const timeElements = $section.find('time');
          if (timeElements.length > index) {
            publishedAt = $(timeElements[index]).text().trim();
          }
        }
      }
      
      // 詳細URLをsectionのdata-ha-element-link属性から取得
      let detailUrl = '';
      const $section = $item.closest('section');
      if ($section.length > 0) {
        const dataHaElementLink = $section.attr('data-ha-element-link');
        if (dataHaElementLink) {
          try {
            const linkData = JSON.parse(dataHaElementLink);
            detailUrl = linkData.url || '';
          } catch (e) {
            console.log(`PURE-J JSON解析エラー: ${dataHaElementLink}`);
          }
        }
      }
      
      // リンクが見つからない場合はデフォルトURL
      if (!detailUrl) {
        detailUrl = `https://pure-j.jp/news/${index + 1}`;
      }
      
      console.log(`PURE-J記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}"`);
      
      // 有効なデータの場合のみ追加
      if (title && title.length > 3) {
        
        items.push({
          title,
          summary: '',
          thumbnail: '/images/default-thumbnail.jpg', // デフォルト画像を使用
          publishedAt: publishedAt || new Date().toISOString().split('T')[0],
          detailUrl
        });
      }
    });
    
    console.log(`PURE-J抽出結果: ${items.length}件`);
    
    return items.slice(0, 10); // 最大10件に制限
  }

  private extractGokigenproNews($: any): any[] {
    const items: any[] = [];
    console.log('ゴキゲンプロレスニュース抽出開始');
    
    $('article').each((index: number, element: any) => {
      const $item = $(element);
      const title = $item.find('h2.entry-card-title').first().text().trim();
      
      // 詳細URLは親のa要素から取得
      let detailUrl = '';
      const $parentLink = $item.closest('a.entry-card-wrap');
      if ($parentLink.length > 0) {
        detailUrl = $parentLink.attr('href') || '';
      }
      
      let publishedAt = $item.find('.entry-date').first().text().trim();
      publishedAt = publishedAt.replace(/\s+/g, ' ').trim();
      
      // サムネイル画像を取得
      let thumbnail = $item.find('.entry-card-thumb-image').first().attr('src') || '';
      if (thumbnail && !thumbnail.startsWith('http')) {
        thumbnail = `https://gokigenpro.com${thumbnail}`;
      }
      
      const summary = $item.find('.entry-card-snippet').first().text().trim();
      
      console.log(`ゴキゲンプロレス記事${index + 1}: 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}", サムネイル="${thumbnail}"`);
      
      if (title && detailUrl && title.length > 3 && !detailUrl.includes('javascript:') && !detailUrl.includes('#')) {
        items.push({
          title,
          summary,
          thumbnail: thumbnail || '/images/default-thumbnail.jpg',
          publishedAt: publishedAt || new Date().toISOString().split('T')[0],
          detailUrl
        });
      }
    });
    
    console.log(`ゴキゲンプロレス抽出結果: ${items.length}件`);
    return items.slice(0, 10);
  }

  private extractJtoNews($: any): any[] {
    const items: any[] = [];
    console.log('JTOニュース抽出開始');
    
    // .p-postList__item要素を取得
    $('.p-postList__item').each((index: number, element: any) => {
      const $item = $(element);
      
      // カテゴリーチェック - "スケジュール/チケット"以外を取得
      const category = $item.find('.c-postThumb__cat.icon-folder').text().trim();
      if (category === 'スケジュール/チケット') {
        console.log(`JTO記事${index + 1}: スケジュール/チケットをスキップ`);
        return; // この記事をスキップ
      }
      
      // タイトルを取得
      const title = $item.find('.p-postList__title').first().text().trim();
      
      // 詳細URLを取得
      let detailUrl = $item.find('a').first().attr('href') || '';
      if (detailUrl && !detailUrl.startsWith('http')) {
        detailUrl = `https://prowrestlingjto.com${detailUrl}`;
      }
      
      // 日付を取得
      let publishedAt = $item.find('.c-postTimes__posted.icon-posted').first().text().trim();
      publishedAt = publishedAt.replace(/\s+/g, ' ').trim();
      
      // サムネイル画像を取得（遅延読み込み対応）
      let thumbnail = '';
      
      // まずdata-src属性をチェック（遅延読み込み）
      const $img = $item.find('.c-postThumb__figure img').first();
      thumbnail = $img.attr('data-src') || $img.attr('src') || '';
      
      // 相対URLの場合は絶対URLに変換
      if (thumbnail && !thumbnail.startsWith('http')) {
        thumbnail = `https://prowrestlingjto.com${thumbnail}`;
      }
      
      // base64画像の場合は、swiper-slide内の実際の画像を探す
      if (thumbnail && thumbnail.includes('data:image/gif;base64')) {
        const $swiperSlide = $item.closest('.swiper-slide');
        if ($swiperSlide.length > 0) {
          const $actualImg = $swiperSlide.find('img[src*="wp-content"]').first();
          if ($actualImg.length > 0) {
            thumbnail = $actualImg.attr('src') || '';
          }
        }
        
        // それでも見つからない場合はデフォルト画像を使用
        if (!thumbnail || thumbnail.includes('data:image/gif;base64')) {
          thumbnail = '/images/default-thumbnail.jpg';
        }
      }
      
      // 概要を取得
      const summary = $item.find('.p-postList__excerpt').first().text().trim();
      
      console.log(`JTO記事${index + 1}: カテゴリー="${category}", 日付="${publishedAt}", タイトル="${title}", URL="${detailUrl}", サムネイル="${thumbnail}"`);
      
      if (title && detailUrl && title.length > 3 && !detailUrl.includes('javascript:') && !detailUrl.includes('#')) {
        items.push({
          title,
          summary,
          thumbnail: thumbnail || '/images/default-thumbnail.jpg',
          publishedAt: publishedAt || new Date().toISOString().split('T')[0],
          detailUrl
        });
      }
    });
    
    console.log(`JTO抽出結果: ${items.length}件`);
    return items.slice(0, 10);
  }

  private async extractEvolutionNewsWithSelenium(): Promise<any[]> {
    const items: any[] = [];
    console.log('Evolution女子ニュース抽出開始（Selenium）');
    
    if (!this.browser) {
      console.log('⚠️ Seleniumが利用できません。空の配列を返します。');
      return items;
    }
    
    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      const url = 'https://evolutionofficialfc.com/news';
      console.log(`URL: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      console.log('ページを読み込みました');
      
      // 少し待機して動的コンテンツが読み込まれるのを待つ
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // .news__list .news-li要素を取得
      const newsItems = await page.$$('.news__list .news-li');
      console.log(`ニュース要素数: ${newsItems.length}`);
      
      for (let i = 0; i < Math.min(newsItems.length, 10); i++) {
        const item = newsItems[i];
        
        try {
          // タイトルを取得
          const titleElement = await item.$('.news-li__item__subject');
          const title = titleElement ? await titleElement.evaluate(el => el.textContent?.trim() || '') : '';
          
          // ファンクラブ会員限定のニュースをスキップ
          if (title.includes('ファンクラブ会員限定')) {
            console.log(`Evolution記事${i + 1}: ファンクラブ会員限定をスキップ`);
            continue;
          }
          
          // 日付を取得
          const dateElement = await item.$('.news-li__item__infom');
          const publishedAt = dateElement ? await dateElement.evaluate(el => el.textContent?.trim() || '') : '';
          
          // 詳細URLを取得
          const linkElement = await item.$('a');
          let detailUrl = '';
          if (linkElement) {
            detailUrl = await linkElement.evaluate(el => el.getAttribute('href') || '');
            if (detailUrl && !detailUrl.startsWith('http')) {
              detailUrl = `https://evolutionofficialfc.com${detailUrl}`;
            }
          }
          
          console.log(`Evolution記事${i + 1}: タイトル="${title}", 日付="${publishedAt}", URL="${detailUrl}"`);
          
          if (title && title.length > 3 && detailUrl && !detailUrl.includes('javascript:') && !detailUrl.includes('#')) {
            items.push({
              title,
              summary: title, // 概要はタイトルと同じ
              thumbnail: '/images/default-thumbnail.jpg', // デフォルト画像を使用
              publishedAt: publishedAt || new Date().toISOString().split('T')[0],
              detailUrl
            });
          }
        } catch (error) {
          console.log(`Evolution記事${i + 1}の処理中にエラー:`, error);
        }
      }
      
      await page.close();
      
    } catch (error) {
      console.error('Evolution女子Selenium抽出中にエラー:', error);
    }
    
    console.log(`Evolution抽出結果: ${items.length}件`);
    return items;
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

  private async fetchPageContent(url: string, organization?: NewsOrganization): Promise<string | null> {
    try {
      const isIceRibbon = url.includes('iceribbon.com');
      const isSeadlinnng = organization?.name === 'seadlinnng';
      
      // SEAdLINNNGの場合はSeleniumを使用して動的コンテンツを取得
      if (isSeadlinnng && organization?.useSelenium) {
        console.log('SEAdLINNNG検出: Seleniumで動的コンテンツを取得します');
        return await this.fetchDynamicContent(url);
      }
      
      // アイスリボンサイトの場合、Azure Functions環境ではより堅牢な処理
      if (isIceRibbon) {
        console.log(`アイスリボンサイト検出: ${url}`);
        
        // Azure Functions環境では、複数のフォールバック戦略を使用
        if (process.env.FUNCTIONS_WORKER_RUNTIME) {
          console.log('Azure Functions環境検出 - 複数の取得方法を試行します');
          
          // まずはシンプルなAxios UTF-8取得を試行（Azure Functions環境でも動作する可能性）
          try {
            console.log('Azure Functions環境: まずAxios UTF-8取得を試行');
            const response = await axios.get(url, {
              timeout: 20000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
              }
            });
            
            if (response.data && response.data.length > 1000) {
              console.log(`Azure Functions環境: Axios UTF-8取得成功: ${response.data.length}文字`);
              
              // 文字化けチェック - 大量の文字化け文字があればPuppeteerで再試行
              const mojibakeCount = (response.data.match(/�/g) || []).length;
              const mojibakeRatio = mojibakeCount / response.data.length;
              
              console.log(`文字化けチェック: ${mojibakeCount}個の文字化け文字 (${Math.round(mojibakeRatio * 100)}%)`);
              
              if (mojibakeRatio < 0.01) { // 1%未満なら許容
                console.log('Azure Functions環境: 文字化けが少ないため、このデータを使用');
                return response.data;
              } else {
                console.log('Azure Functions環境: 文字化けが多すぎます、Puppeteerで再試行');
              }
            } else {
              console.log('Azure Functions環境: Axiosレスポンスが小さすぎます、Puppeteerで再試行');
            }
          } catch (axiosError) {
            console.log('Azure Functions環境: Axios失敗、Puppeteerで再試行:', axiosError instanceof Error ? axiosError.message : axiosError);
          }
          
          // Axiosが失敗した場合のみPuppeteerを使用
          console.log('Azure Functions環境: Puppeteerでの取得を開始');
        } else {
          // ローカル環境では従来のAxios + iconv-lite方式を試行
          console.log('ローカル環境 - Axios + iconv-lite方式を試行');
          
          try {
            const response = await axios.get(url, {
              timeout: 15000,
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br'
              }
            });
            
            // iconv-liteを使用した変換（ローカル環境のみ）
            try {
              // iconv-liteが利用可能かチェック
              let iconv;
              try {
                iconv = require('iconv-lite');
              } catch (requireError) {
                console.log('iconv-liteが利用できません、Puppeteerで処理します');
                throw new Error('iconv-lite not available');
              }
              
              let html = iconv.decode(Buffer.from(response.data), 'Shift_JIS');
              
              // 文字化けチェック
              if (!html.includes('�')) {
                console.log(`ローカル環境でShift_JIS変換成功: ${html.length}文字`);
                return html;
              } else {
                console.log('文字化けが検出されました、Puppeteerで再試行します');
              }
            } catch (iconvError) {
              console.log('iconv-lite変換エラー、Puppeteerで再試行:', iconvError instanceof Error ? iconvError.message : iconvError);
            }
            
          } catch (axiosError) {
            console.log('Axiosエラー、Puppeteerで再試行:', axiosError instanceof Error ? axiosError.message : axiosError);
          }
        }
      } else {
        // 通常のサイト（UTF-8）の場合
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
      }

      // puppeteerで試行
      if (!this.browser) {
        await this.initialize();
      }

      // Azure Functions環境でPuppeteerが初期化できない場合の対処
      if (!this.browser) {
        console.log('⚠️ Puppeteerブラウザが初期化されていません。Axiosフォールバックを使用します。');
        
        // アイスリボンの場合、Axiosで再度試行（Shift_JIS対応）
        if (isIceRibbon) {
          try {
            console.log('Puppeteer失敗のためAxiosで再試行（Shift_JIS対応）');
            
            // まずはarraybufferで取得してShift_JIS変換を試行
            try {
              const response = await axios.get(url, {
                timeout: 15000,
                responseType: 'arraybuffer',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
                }
              });
              
              // iconv-liteを使用してShift_JISからUTF-8に変換
              try {
                const iconv = require('iconv-lite');
                const html = iconv.decode(Buffer.from(response.data), 'Shift_JIS');
                
                if (html && html.length > 1000) {
                  console.log(`Axios + iconv-liteフォールバック成功: ${html.length}文字（Shift_JIS変換）`);
                  return html;
                }
              } catch (iconvError) {
                console.log('iconv-lite変換失敗、UTF-8として処理:', iconvError instanceof Error ? iconvError.message : iconvError);
              }
              
              // iconv-liteが失敗した場合、UTF-8として処理
              const utf8Html = Buffer.from(response.data).toString('utf8');
              if (utf8Html && utf8Html.length > 1000) {
                console.log(`Axios UTF-8フォールバック成功: ${utf8Html.length}文字（文字化け許容）`);
                return utf8Html;
              }
              
            } catch (arraybufferError) {
              console.log('arraybuffer取得失敗、通常のUTF-8取得を試行:', arraybufferError instanceof Error ? arraybufferError.message : arraybufferError);
              
              // 通常のUTF-8取得を試行
              const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
                }
              });
              
              if (response.data && response.data.length > 1000) {
                console.log(`Axios UTF-8フォールバック成功: ${response.data.length}文字（文字化け許容）`);
                return response.data;
              }
            }
          } catch (axiosFallbackError) {
            console.log('Axiosフォールバックも失敗:', axiosFallbackError instanceof Error ? axiosFallbackError.message : axiosFallbackError);
          }
        }
        
        throw new Error('Puppeteerが利用できず、Axiosフォールバックも失敗しました');
      }

      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // アイスリボンサイトの場合、Azure Functions環境に最適化された堅牢な処理
      if (isIceRibbon) {
        console.log('Puppeteerでアイスリボンサイト処理（Azure Functions堅牢化）');
        
        // Azure Functions環境でのより慎重な処理
        try {
          // ページの設定を最小限にして確実性を高める
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
          });
          
          // より短いタイムアウトで複数回試行する戦略
          let attempts = 0;
          const maxAttempts = 3;
          let lastError: Error | null = null;
          
          while (attempts < maxAttempts) {
            attempts++;
            console.log(`アイスリボンページ読み込み試行 ${attempts}/${maxAttempts}...`);
            
            try {
              const response = await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 20000 // 短めのタイムアウトで複数回試行
              });
              
              if (!response) {
                throw new Error('No response received');
              }
              
              const status = response.status();
              console.log(`HTTP ${status}: レスポンス受信`);
              
              if (status >= 400) {
                throw new Error(`HTTP ${status}: ${response.statusText()}`);
              }
              
              // 成功した場合はループを抜ける
              console.log(`試行${attempts}: ページ読み込み成功`);
              break;
              
            } catch (attemptError) {
              lastError = attemptError instanceof Error ? attemptError : new Error(String(attemptError));
              console.log(`試行${attempts}失敗:`, lastError.message);
              
              if (attempts < maxAttempts) {
                console.log(`${2000 * attempts}ms待機後に再試行...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
              }
            }
          }
          
          // 全ての試行が失敗した場合
          if (attempts >= maxAttempts && lastError) {
            console.error(`${maxAttempts}回の試行すべてが失敗しました`);
            throw lastError;
          }
          
          // 最小限の待機時間
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (gotoError) {
          console.error('Puppeteerアイスリボンページ読み込み完全失敗:', gotoError);
          
          // Azure Functions環境での詳細なエラー情報
          if (gotoError instanceof Error) {
            console.error('エラー詳細:', {
              name: gotoError.name,
              message: gotoError.message,
              stack: gotoError.stack?.split('\n').slice(0, 5).join('\n')
            });
          }
          
          throw new Error(`ページの取得に失敗しました: ${gotoError instanceof Error ? gotoError.message : String(gotoError)}`);
        }
      } else {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      }
      
      const html = await page.content();
      await page.close();
      
      console.log(`Puppeteerで取得成功: ${html.length}文字`);
      return html;
    } catch (error) {
      console.error(`ページ取得エラー: ${url}`, error);
      
      // Azure Functions環境での詳細なエラー情報
      const isIceRibbonSite = url.includes('iceribbon.com');
      if (process.env.FUNCTIONS_WORKER_RUNTIME && isIceRibbonSite) {
        console.error('=== Azure Functions アイスリボンエラー詳細 ===');
        console.error('エラータイプ:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('エラーメッセージ:', error instanceof Error ? error.message : String(error));
        console.error('スタックトレース:', error instanceof Error ? error.stack : 'なし');
        
        // 一般的なAzure Functionsエラーの診断
        if (error instanceof Error) {
          if (error.message.includes('iconv')) {
            console.error('🔍 iconv-lite関連エラー: ライブラリの互換性問題の可能性');
          }
          if (error.message.includes('timeout')) {
            console.error('🔍 タイムアウトエラー: ネットワークまたは処理時間の問題');
          }
          if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.error('🔍 ネットワークエラー: DNS解決またはサーバー接続の問題');
          }
          if (error.message.includes('Protocol error')) {
            console.error('🔍 Puppeteerプロトコルエラー: ブラウザ通信の問題');
          }
        }
        console.error('=======================================');
      }
      
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