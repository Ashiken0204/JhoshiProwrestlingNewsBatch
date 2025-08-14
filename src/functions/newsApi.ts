import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AzureNewsStorage } from '../utils/azure-storage';
import { ORGANIZATIONS } from '../config/organizations';

export async function getNews(context: any, req: any): Promise<void> {
  context.log('ニュース取得API呼び出し');
  
  try {
    const storage = new AzureNewsStorage();
    const url = new URL(req.url);
    
    // クエリパラメータの取得
    const organization = url.searchParams.get('organization');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    let newsItems;
    let totalCount = 0;
    
    if (organization && organization !== 'all') {
      // 特定の団体のニュースを取得
      newsItems = await storage.getNewsByOrganization(organization);
      totalCount = newsItems.length;
      
      // ページング処理
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      newsItems = newsItems.slice(startIndex, endIndex);
    } else {
      // 全団体の最新ニュースを取得
      if (limit >= 1000) {
        // 全件取得の場合
        newsItems = await storage.getLatestNews(1000);
        totalCount = newsItems.length;
      } else {
        // ページング付きで取得
        newsItems = await storage.getLatestNews(limit);
        totalCount = newsItems.length;
      }
    }
    
    // レスポンスの作成
    const response = {
      success: true,
      data: newsItems,
      count: newsItems.length,
      totalCount: totalCount,
      page: page,
      totalPages: Math.ceil(totalCount / limit),
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
    const storage = new AzureNewsStorage();
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