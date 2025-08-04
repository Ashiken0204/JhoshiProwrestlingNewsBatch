// 手動でニュースコレクターを実行してデータベースを更新
import { newsCollector } from '../functions/newsCollector';

async function updateNews() {
  console.log('🔄 ニュースデータベースを最新情報で更新中...');
  
  const mockContext = {
    log: (message: any, ...args: any[]) => console.log(message, ...args),
    error: (message: any, ...args: any[]) => console.error(message, ...args)
  };
  
  const mockTimer = {
    isPastDue: false,
    schedule: '0 */30 * * * *'
  };
  
  try {
    await newsCollector(mockTimer, mockContext);
    console.log('✅ ニュースデータベースの更新が完了しました！');
  } catch (error) {
    console.error('❌ 更新中にエラーが発生:', error);
  }
}

// 直接実行された場合
if (require.main === module) {
  updateNews().catch(console.error);
}