// 手動でニュースコレクターを実行してデータベースを更新
import { newsCollector } from '../functions/newsCollector';

async function updateNews() {
  console.log('🔄 ニュースデータベースを最新情報で更新中...');
  
  const mockContext = {
    log: Object.assign(
      (message: any, ...args: any[]) => console.log(message, ...args),
      {
        error: (message: any, ...args: any[]) => console.error('[ERROR]', message, ...args),
        warn: (message: any, ...args: any[]) => console.warn('[WARN]', message, ...args),
        info: (message: any, ...args: any[]) => console.info('[INFO]', message, ...args),
        verbose: (message: any, ...args: any[]) => console.log('[VERBOSE]', message, ...args)
      }
    ),
    done: (err?: Error, result?: any) => {}
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
    await newsCollector(mockContext, mockTimer);
    console.log('✅ ニュースデータベースの更新が完了しました！');
  } catch (error) {
    console.error('❌ 更新中にエラーが発生:', error);
  }
}

// 直接実行された場合
if (require.main === module) {
  updateNews().catch(console.error);
}