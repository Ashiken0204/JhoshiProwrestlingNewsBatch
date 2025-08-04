// 手動テスト用スクリプト
// npm run test:manual で実行

import { NewsScraper } from '../utils/scraper';
import { NewsStorage } from '../utils/storage';
import { ORGANIZATIONS } from '../config/organizations';

async function testScraping() {
  console.log('スクレイピングテストを開始...');
  
  const scraper = new NewsScraper();
  
  try {
    await scraper.initialize();
    
    // 最初の団体のみテスト
    const testOrg = ORGANIZATIONS[0];
    console.log(`テスト対象: ${testOrg.displayName}`);
    
    const result = await scraper.scrapeNews(testOrg);
    
    if (result.success) {
      console.log(`✅ 成功: ${result.newsItems.length}件取得`);
      console.log('取得したニュース:');
      result.newsItems.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   日時: ${item.publishedAt}`);
        console.log(`   URL: ${item.detailUrl}`);
        console.log('');
      });
    } else {
      console.log(`❌ 失敗: ${result.error}`);
    }
    
  } catch (error) {
    console.error('テスト中にエラー:', error);
  } finally {
    await scraper.close();
  }
}

async function testStorage() {
  console.log('ストレージテストを開始...');
  
  const storage = new NewsStorage();
  
  try {
    // サンプルデータ
    const sampleNews = [
      {
        id: 'test-1',
        title: 'テストニュース1',
        summary: 'これはテスト用のニュースです',
        thumbnail: 'https://example.com/thumb1.jpg',
        publishedAt: new Date(),
        detailUrl: 'https://example.com/news/1',
        organization: 'test',
        sourceUrl: 'https://example.com'
      }
    ];
    
    // 保存テスト
    await storage.saveNews(sampleNews);
    console.log('✅ ニュース保存成功');
    
    // 読み込みテスト
    const loadedNews = await storage.loadNews();
    console.log(`✅ ニュース読み込み成功: ${loadedNews.length}件`);
    
    // 統計テスト
    const stats = await storage.getStatistics();
    console.log('✅ 統計情報取得成功:', stats);
    
  } catch (error) {
    console.error('ストレージテスト中にエラー:', error);
  }
}

async function runAllTests() {
  console.log('=== 女子プロレスニュース収集システム 手動テスト ===\n');
  
  await testStorage();
  console.log('\n' + '='.repeat(50) + '\n');
  await testScraping();
  
  console.log('\n=== テスト完了 ===');
}

// 直接実行された場合
if (require.main === module) {
  runAllTests().catch(console.error);
}