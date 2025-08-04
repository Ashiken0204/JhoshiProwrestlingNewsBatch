// データクリア用の管理者向け機能
import { AzureNewsStorage } from '../utils/azure-storage';

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

export async function clearData(context: Context, req: any): Promise<void> {
  context.log('データクリアAPI呼び出し');
  
  try {
    const storage = new AzureNewsStorage();
    
    // テーブルを削除して再作成することでデータをクリア
    await storage.clearAllData();
    
    context.log('全データをクリアしました');
    
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: {
        success: true,
        message: '全データをクリアしました'
      }
    };
  } catch (error) {
    context.log.error('データクリアエラー:', error);
    
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