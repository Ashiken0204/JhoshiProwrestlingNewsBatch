// 実際のサイトからのスクレイピングテスト
import { NewsScraper } from '../utils/scraper';
import { NewsStorage } from '../utils/storage';
import { ORGANIZATIONS } from '../config/organizations';

async function testRealScraping() {
  console.log('=== 実際の女子プロレスサイトスクレイピングテスト ===\n');
  
  const scraper = new NewsScraper();
  const storage = new NewsStorage();
  
  try {
    await scraper.initialize();
    
    const allNewsItems = [];
    
    // 各団体を順番にテスト
    for (let i = 0; i < ORGANIZATIONS.length; i++) {
      const organization = ORGANIZATIONS[i];
      
      console.log(`🔍 ${organization.displayName} (${organization.newsListUrl}) のテスト開始...`);
      
      const result = await scraper.scrapeNews(organization);
      
      if (result.success && result.newsItems.length > 0) {
        console.log(`✅ 成功: ${result.newsItems.length}件取得\n`);
        
        // 最初の3件を表示
        result.newsItems.slice(0, 3).forEach((item, index) => {
          console.log(`${index + 1}. ${item.title}`);
          console.log(`   日時: ${item.publishedAt.toLocaleDateString('ja-JP')}`);
          console.log(`   URL: ${item.detailUrl}`);
          if (item.thumbnail) {
            console.log(`   画像: ${item.thumbnail}`);
          }
          console.log('');
        });
        
        allNewsItems.push(...result.newsItems);
      } else {
        console.log(`❌ 失敗または0件: ${result.error || 'データなし'}\n`);
      }
      
      // サーバー負荷軽減のため間隔を開ける
      if (i < ORGANIZATIONS.length - 1) {
        console.log('⏳ 3秒待機中...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // 取得したニュースを保存
    if (allNewsItems.length > 0) {
      console.log(`💾 合計 ${allNewsItems.length}件のニュースを保存中...`);
      await storage.saveNews(allNewsItems);
      
      // 統計表示
      const stats = await storage.getStatistics();
      console.log('📊 統計情報:');
      console.log(`   総件数: ${stats.total}件`);
      console.log('   団体別:');
      Object.entries(stats.byOrganization).forEach(([org, count]) => {
        const orgConfig = ORGANIZATIONS.find(o => o.name === org);
        const displayName = orgConfig ? orgConfig.displayName : org;
        console.log(`     ${displayName}: ${count}件`);
      });
    } else {
      console.log('❌ データが取得できませんでした');
    }
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error);
  } finally {
    await scraper.close();
  }
  
  console.log('\n=== テスト完了 ===');
}

// 直接実行された場合
if (require.main === module) {
  testRealScraping().catch(console.error);
}