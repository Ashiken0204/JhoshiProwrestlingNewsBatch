// テスト用ニュースデータ追加機能
import { NewsStorage } from '../utils/storage';
import { NewsItem } from '../types/news';

// テスト用のニュースデータ
const TEST_NEWS_DATA: NewsItem[] = [
  {
    id: 'test-stardom-001',
    title: '【スターダム】新春大興行 2025.1.4 後楽園ホール大会結果',
    summary: '後楽園ホールにて新春大興行が開催され、白熱した試合が繰り広げられました。',
    thumbnail: 'https://wwr-stardom.com/wp-content/uploads/2024/12/news-sample.jpg',
    publishedAt: new Date('2025-01-04T19:00:00+09:00'),
    detailUrl: 'https://wwr-stardom.com/news/2025/01/04/new-year-event/',
    organization: 'stardom',
    sourceUrl: 'https://wwr-stardom.com/news/'
  },
  {
    id: 'test-tjpw-001',
    title: '【東京女子プロレス】新年会大会 1月5日 品川プリンスホテル',
    summary: '東京女子プロレス新年会大会が品川プリンスホテルで開催されます。',
    thumbnail: 'https://www.tjpw.jp/images/news/sample-image.jpg',
    publishedAt: new Date('2025-01-03T15:30:00+09:00'),
    detailUrl: 'https://www.tjpw.jp/news/2025/01/03/new-year-party/',
    organization: 'tjpw',
    sourceUrl: 'https://www.tjpw.jp/news'
  },
  {
    id: 'test-ice-ribbon-001',
    title: '【アイスリボン】1月定期興行 Ice Ribbon #1400',
    summary: 'Ice Ribbon第1400戦記念大会が開催されます。',
    thumbnail: 'https://iceribbon.com/images/news/1400th-match.jpg',
    publishedAt: new Date('2025-01-02T20:15:00+09:00'),
    detailUrl: 'https://iceribbon.com/news/2025/01/02/1400th-match/',
    organization: 'ice_ribbon',
    sourceUrl: 'https://iceribbon.com/news_list.php'
  },
  {
    id: 'test-wave-001',
    title: '【WAVE】新年興行「New Wave 2025」開催決定',
    summary: 'プロレスリングWAVEの新年興行が決定しました。',
    thumbnail: 'https://pro-w-wave.com/images/new-wave-2025.jpg',
    publishedAt: new Date('2025-01-01T12:00:00+09:00'),
    detailUrl: 'https://pro-w-wave.com/news/2025/01/01/new-wave-2025/',
    organization: 'wave',
    sourceUrl: 'https://pro-w-wave.com/'
  }
];

// Azure Functions 従来モデル用の型定義
interface Context {
  log: {
    (msg: string, ...args: any[]): void;
    error: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    verbose: (msg: string, ...args: any[]) => void;
  };
  res?: any;
}

export async function addTestData(context: Context, req: any): Promise<void> {
  context.log('テストデータ追加API呼び出し');
  
  try {
    const storage = new NewsStorage();
    
    // テストデータを追加
    await storage.saveNews(TEST_NEWS_DATA);
    
    context.log(`テストデータ ${TEST_NEWS_DATA.length}件を追加しました`);
    
    // 統計情報を取得
    const stats = await storage.getStatistics();
    
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: {
        success: true,
        message: `テストデータ ${TEST_NEWS_DATA.length}件を追加しました`,
        data: {
          addedCount: TEST_NEWS_DATA.length,
          statistics: stats
        }
      }
    };
  } catch (error) {
    context.log.error('テストデータ追加エラー:', error);
    
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      }
    };
  }
}