// デバッグ用：newsCollectorの詳細テスト
import { newsCollector } from '../functions/newsCollector';

async function debugNewsCollector() {
  console.log('🔍 newsCollectorのデバッグテストを開始...');
  
  // より詳細なmockContextオブジェクト
  const mockContext = {
    log: function(message: any, ...args: any[]) {
      console.log('📝 [LOG]', message, ...args);
    },
    error: function(message: any, ...args: any[]) {
      console.error('❌ [ERROR]', message, ...args);
    },
    done: function(err?: Error, result?: any) {
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
  
  // contextオブジェクトの内容を確認
  console.log('🔍 mockContext properties:', Object.keys(mockContext));
  console.log('🔍 mockContext.log type:', typeof mockContext.log);
  console.log('🔍 mockContext.error type:', typeof mockContext.error);
  
  try {
    console.log('🚀 newsCollector関数を呼び出し中...');
    await newsCollector(mockContext, mockTimer);
    console.log('✅ newsCollectorが正常に完了しました！');
  } catch (error) {
    console.error('❌ newsCollectorでエラーが発生:', error);
    console.error('❌ エラースタック:', error.stack);
  }
}

// 直接実行された場合
if (require.main === module) {
  debugNewsCollector().catch(console.error);
}