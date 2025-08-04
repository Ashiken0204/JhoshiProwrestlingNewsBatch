import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { NewsStorage } from '../utils/storage';
import { ORGANIZATIONS } from '../config/organizations';

export async function getNews(context: any, req: any): Promise<void> {
  context.log('ニュース取得API呼び出し');
  
  try {
    const storage = new NewsStorage();
    const url = new URL(req.url);
    
    // クエリパラメータの取得
    const organization = url.searchParams.get('organization');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    let newsItems;
    
    if (organization && organization !== 'all') {
      // 特定の団体のニュースを取得
      newsItems = await storage.getNewsByOrganization(organization);
      newsItems = newsItems.slice(0, limit);
    } else {
      // 全団体の最新ニュースを取得
      newsItems = await storage.getLatestNews(limit);
    }
    
    // レスポンスの作成
    const response = {
      success: true,
      data: newsItems,
      count: newsItems.length,
      timestamp: new Date().toISOString()
    };
    
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    context.log('ニュース取得エラー:', error);
    
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      })
    };
  }
}

export async function getOrganizations(context: any, req: any): Promise<void> {
  context.log('団体一覧API呼び出し');
  
  try {
    const organizations = ORGANIZATIONS.map(org => ({
      name: org.name,
      displayName: org.displayName
    }));
    
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: organizations,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    context.log('団体一覧取得エラー:', error);
    
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      })
    };
  }
}

export async function getStatistics(context: any, req: any): Promise<void> {
  context.log('統計情報API呼び出し');
  
  try {
    const storage = new NewsStorage();
    const stats = await storage.getStatistics();
    
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    context.log('統計情報取得エラー:', error);
    
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      })
    };
  }
}

// CORS対応
export async function handleOptions(context: InvocationContext, req: HttpRequest): Promise<HttpResponseInit> {
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  };
}

// function.jsonファイルで関数が定義されているため、
// プログラマブルモデルの登録は不要