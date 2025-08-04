import { app, InvocationContext, Timer } from '@azure/functions';
import { NewsScraper } from '../utils/scraper';
import { NewsStorage } from '../utils/storage';
import { ORGANIZATIONS } from '../config/organizations';
import { delay } from '../utils/helpers';

export async function newsCollector(myTimer: Timer, context: InvocationContext): Promise<void> {
  context.log('ニュース収集バッチを開始します');
  
  const scraper = new NewsScraper();
  const storage = new NewsStorage();
  
  try {
    await scraper.initialize();
    
    const allNewsItems = [];
    
    // 各団体のニュースを順次取得（サーバー負荷を考慮して間隔を開ける）
    for (let i = 0; i < ORGANIZATIONS.length; i++) {
      const organization = ORGANIZATIONS[i];
      
      context.log(`${organization.displayName}のニュースを取得中...`);
      
      const result = await scraper.scrapeNews(organization);
      
      if (result.success) {
        allNewsItems.push(...result.newsItems);
        context.log(`${organization.displayName}: ${result.newsItems.length}件取得`);
      } else {
        context.error(`${organization.displayName}でエラー: ${result.error}`);
      }
      
      // 次の団体との間隔（サーバー負荷軽減のため）
      if (i < ORGANIZATIONS.length - 1) {
        await delay(2000); // 2秒待機
      }
    }
    
    // 取得したニュースを保存
    if (allNewsItems.length > 0) {
      await storage.saveNews(allNewsItems);
      context.log(`合計 ${allNewsItems.length}件のニュースを保存しました`);
    } else {
      context.log('新しいニュースはありませんでした');
    }
    
    // 統計情報をログ出力
    const stats = await storage.getStatistics();
    context.log('現在の統計:', stats);
    
  } catch (error) {
    context.error('ニュース収集中にエラーが発生しました:', error);
    throw error;
  } finally {
    await scraper.close();
  }
}

// function.jsonファイルでタイマートリガーが定義されているため、
// プログラマブルモデルの登録は不要