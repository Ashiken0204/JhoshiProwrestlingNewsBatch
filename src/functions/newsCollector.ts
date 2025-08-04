import { NewsScraper } from '../utils/scraper';
import { NewsStorage } from '../utils/storage';
import { ORGANIZATIONS } from '../config/organizations';
import { delay } from '../utils/helpers';

// Azure Functions 従来モデル用の型定義
interface Context {
  log: {
    (msg: string, ...args: any[]): void;
    error: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    verbose: (msg: string, ...args: any[]) => void;
  };
  done: (err?: Error, result?: any) => void;
}

interface Timer {
  isPastDue: boolean;
  schedule: any;
  scheduleStatus: any;
}

export async function newsCollector(context: Context, myTimer: Timer): Promise<void> {
  context.log('ニュース収集バッチを開始します');
  context.log('実行環境:', process.platform, process.arch);
  context.log('Node.js バージョン:', process.version);
  
  const scraper = new NewsScraper();
  const storage = new NewsStorage();
  
  try {
    context.log('Step 1: スクレイパーを初期化中...');
    await scraper.initialize();
    context.log('Step 1: スクレイパー初期化完了');
    
    context.log('Step 2: ストレージを初期化中...');
    // ストレージの初期化テスト
    const testStats = await storage.getStatistics();
    context.log('Step 2: ストレージ初期化完了', testStats);
    
    const allNewsItems = [];
    
    // 各団体のニュースを順次取得（サーバー負荷を考慮して間隔を開ける）
    for (let i = 0; i < ORGANIZATIONS.length; i++) {
      const organization = ORGANIZATIONS[i];
      
      try {
        context.log(`Step 3.${i+1}: ${organization.displayName}のニュースを取得中...`);
        
        const result = await scraper.scrapeNews(organization);
        
        if (result.success) {
          allNewsItems.push(...result.newsItems);
          context.log(`Step 3.${i+1}: ${organization.displayName}: ${result.newsItems.length}件取得成功`);
        } else {
          context.log.error(`Step 3.${i+1}: ${organization.displayName}でエラー: ${result.error}`);
        }
      } catch (orgError) {
        context.log.error(`Step 3.${i+1}: ${organization.displayName}で例外発生:`, orgError);
      }
      
      // 次の団体との間隔（サーバー負荷軽減のため）
      if (i < ORGANIZATIONS.length - 1) {
        await delay(2000); // 2秒待機
      }
    }
    
    // 取得したニュースを保存
    context.log('Step 4: ニュース保存処理開始...');
    if (allNewsItems.length > 0) {
      await storage.saveNews(allNewsItems);
      context.log(`Step 4: 合計 ${allNewsItems.length}件のニュースを保存しました`);
    } else {
      context.log('Step 4: 新しいニュースはありませんでした');
    }
    
    // 統計情報をログ出力
    context.log('Step 5: 統計情報取得中...');
    const stats = await storage.getStatistics();
    context.log('Step 5: 現在の統計:', JSON.stringify(stats));
    
    context.log('✅ ニュース収集バッチが正常に完了しました');
    
  } catch (error) {
    context.log.error('❌ ニュース収集中にエラーが発生しました:');
    context.log.error('エラータイプ:', error.constructor.name);
    context.log.error('エラーメッセージ:', error.message);
    context.log.error('エラースタック:', error.stack);
    throw error;
  } finally {
    context.log('Cleanup: スクレイパーを終了中...');
    try {
      await scraper.close();
      context.log('Cleanup: スクレイパー終了完了');
    } catch (cleanupError) {
      context.log.error('Cleanup: スクレイパー終了エラー:', cleanupError);
    }
  }
}

// function.jsonファイルでタイマートリガーが定義されているため、
// プログラマブルモデルの登録は不要