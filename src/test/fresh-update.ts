// データをクリアして最新ニュースで完全更新
import { NewsStorage } from '../utils/storage';
import { NewsScraper } from '../utils/scraper';
import { ORGANIZATIONS } from '../config/organizations';
import { delay } from '../utils/helpers';
import * as fs from 'fs';
import * as path from 'path';

async function freshUpdate() {
  console.log('🔄 データベースを完全クリアして最新ニュースで更新中...');
  
  const storage = new NewsStorage();
  const scraper = new NewsScraper();
  
  try {
    // 一時ファイルを削除してデータベースをクリア
    const tempDir = process.env.TEMP || '/tmp';
    const dataFilePath = path.join(tempDir, 'news-data.json');
    
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
      console.log('📁 既存データをクリアしました');
    }
    
    await scraper.initialize();
    
    const allNewsItems = [];
    
    // 各団体から最新ニュースを取得
    for (let i = 0; i < ORGANIZATIONS.length; i++) {
      const organization = ORGANIZATIONS[i];
      
      console.log(`🔍 ${organization.displayName} から最新ニュースを取得中...`);
      
      const result = await scraper.scrapeNews(organization);
      
      if (result.success && result.newsItems.length > 0) {
        console.log(`✅ ${organization.displayName}: ${result.newsItems.length}件取得`);
        allNewsItems.push(...result.newsItems);
        
        // 取得したニュースの最初の1件を表示
        const first = result.newsItems[0];
        console.log(`   最新: ${first.title.substring(0, 50)}...`);
        console.log(`   日時: ${first.publishedAt.toLocaleDateString('ja-JP')}`);
      } else {
        console.log(`❌ ${organization.displayName}: データなし`);
      }
      
      // サーバー負荷軽減のため間隔を開ける
      if (i < ORGANIZATIONS.length - 1) {
        await delay(2000);
      }
    }
    
    // 新しいデータベースに保存
    if (allNewsItems.length > 0) {
      await storage.saveNews(allNewsItems);
      console.log(`💾 合計 ${allNewsItems.length}件の最新ニュースを保存しました`);
      
      // 統計表示
      const stats = await storage.getStatistics();
      console.log('📊 更新後の統計:');
      console.log(`   総件数: ${stats.total}件`);
      Object.entries(stats.byOrganization).forEach(([org, count]) => {
        const orgConfig = ORGANIZATIONS.find(o => o.name === org);
        const displayName = orgConfig ? orgConfig.displayName : org;
        console.log(`   ${displayName}: ${count}件`);
      });
    }
    
  } catch (error) {
    console.error('❌ 更新中にエラー:', error);
  } finally {
    await scraper.close();
  }
  
  console.log('✅ データベースの完全更新が完了しました！');
}

// 直接実行された場合
if (require.main === module) {
  freshUpdate().catch(console.error);
}