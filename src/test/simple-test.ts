// シンプルなnewsCollectorテスト
import { newsCollector } from '../functions/newsCollector';

async function simpleTest() {
  console.log('🔍 newsCollector の詳細エラー調査を開始...');
  
  const mockContext = {
    log: (message: any, ...args: any[]) => {
      console.log('📝 [LOG]', message, ...args);
    },
    error: (message: any, ...args: any[]) => {
      console.error('❌ [ERROR]', message, ...args);
    },
    done: (err?: Error, result?: any) => {
      if (err) {
        console.error('❌ [DONE WITH ERROR]', err);
      } else {
        console.log('✅ [DONE SUCCESS]', result);
      }
    }
  };
  
  const mockTimer = {
    isPastDue: false,
    schedule: '0 */30 * * * *',
    scheduleStatus: {
        last: '2025-08-04T12:00:00.000Z',
        next: '2025-08-04T12:30:00.000Z',
        lastUpdated: '2025-08-04T12:00:00.000Z'
    }
  };
  
  try {
    console.log('🚀 newsCollector関数を呼び出し...');
    await newsCollector(mockContext, mockTimer);
    console.log('✅ newsCollectorが正常に完了しました！');
  } catch (error) {
    console.error('❌ newsCollectorでエラーが発生:');
    console.error('  - Message:', error.message);
    console.error('  - Stack:', error.stack);
    console.error('  - Full Error:', error);
  }
}

// 直接実行された場合
if (require.main === module) {
  simpleTest().catch(console.error);
}