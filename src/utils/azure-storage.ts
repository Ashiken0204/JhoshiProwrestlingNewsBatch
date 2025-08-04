import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';
import { NewsItem } from '../types/news';

export class AzureNewsStorage {
  private tableClient: TableClient;
  private tableName = 'newsitems';

  constructor() {
    // Azure Storage Account の接続情報を環境変数から取得
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'stjhoshinews';
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = process.env.AzureWebJobsStorage;

    if (connectionString) {
      // 接続文字列を使用（推奨）
      this.tableClient = TableClient.fromConnectionString(connectionString, this.tableName);
    } else if (accountName && accountKey) {
      // アカウント名とキーを使用
      const credential = new AzureNamedKeyCredential(accountName, accountKey);
      this.tableClient = new TableClient(
        `https://${accountName}.table.core.windows.net`,
        this.tableName,
        credential
      );
    } else {
      throw new Error('Azure Storage の接続情報が設定されていません');
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.tableClient.createTable();
      console.log(`Table ${this.tableName} initialized successfully`);
    } catch (error) {
      if (error.statusCode !== 409) { // Table already exists
        console.error('Table initialization error:', error);
        throw error;
      }
      console.log(`Table ${this.tableName} already exists`);
    }
  }

  async saveNews(newsItems: NewsItem[]): Promise<void> {
    try {
      await this.initialize();
      
      console.log(`Saving ${newsItems.length} news items to Azure Table Storage`);
      
      // 各ニュースアイテムをテーブルに保存
      for (const item of newsItems) {
        const entity = {
          partitionKey: item.organization, // 団体名でパーティション分割
          rowKey: item.id,
          title: item.title,
          summary: item.summary,
          thumbnail: item.thumbnail,
          publishedAt: item.publishedAt.toISOString(),
          detailUrl: item.detailUrl,
          organization: item.organization,
          sourceUrl: item.sourceUrl,
          timestamp: new Date()
        };

        try {
          await this.tableClient.upsertEntity(entity, 'Replace');
        } catch (error) {
          console.error(`Error saving news item ${item.id}:`, error);
        }
      }
      
      console.log(`Successfully saved ${newsItems.length} news items`);
    } catch (error) {
      console.error('Error saving news to Azure Table Storage:', error);
      throw error;
    }
  }

  async getLatestNews(limit: number = 20): Promise<NewsItem[]> {
    try {
      await this.initialize();
      
      const entities = this.tableClient.listEntities();
      const newsItems: NewsItem[] = [];
      
      for await (const entity of entities) {
        newsItems.push(this.entityToNewsItem(entity));
      }
      
      // 日付順でソート（新しい順）
      newsItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      
      return newsItems.slice(0, limit);
    } catch (error) {
      console.error('Error getting latest news from Azure Table Storage:', error);
      return [];
    }
  }

  async getNewsByOrganization(organization: string): Promise<NewsItem[]> {
    try {
      await this.initialize();
      
      const entities = this.tableClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${organization}'` }
      });
      
      const newsItems: NewsItem[] = [];
      for await (const entity of entities) {
        newsItems.push(this.entityToNewsItem(entity));
      }
      
      // 日付順でソート（新しい順）
      newsItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      
      return newsItems;
    } catch (error) {
      console.error(`Error getting news for organization ${organization}:`, error);
      return [];
    }
  }

  async getStatistics() {
    try {
      await this.initialize();
      
      const entities = this.tableClient.listEntities();
      const newsItems: NewsItem[] = [];
      
      for await (const entity of entities) {
        newsItems.push(this.entityToNewsItem(entity));
      }
      
      const byOrganization: { [key: string]: number } = {};
      let latestUpdate: Date | null = null;
      
      for (const item of newsItems) {
        byOrganization[item.organization] = (byOrganization[item.organization] || 0) + 1;
        
        if (!latestUpdate || item.publishedAt > latestUpdate) {
          latestUpdate = item.publishedAt;
        }
      }
      
      return {
        total: newsItems.length,
        byOrganization,
        latestUpdate
      };
    } catch (error) {
      console.error('Error getting statistics from Azure Table Storage:', error);
      return {
        total: 0,
        byOrganization: {},
        latestUpdate: null
      };
    }
  }

  async clearAllData(): Promise<void> {
    try {
      console.log('Clearing all data from Azure Table Storage...');
      
      // すべてのエンティティを取得
      const entities = this.tableClient.listEntities();
      const entitiesToDelete = [];
      
      for await (const entity of entities) {
        entitiesToDelete.push({
          partitionKey: entity.partitionKey,
          rowKey: entity.rowKey
        });
      }
      
      // 各エンティティを削除
      for (const entity of entitiesToDelete) {
        try {
          await this.tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
        } catch (error) {
          console.warn(`Failed to delete entity ${entity.partitionKey}/${entity.rowKey}:`, error);
        }
      }
      
      console.log(`Cleared ${entitiesToDelete.length} entities from table`);
    } catch (error) {
      console.error('Error clearing data from Azure Table Storage:', error);
      throw error;
    }
  }

  private entityToNewsItem(entity: any): NewsItem {
    return {
      id: entity.rowKey,
      title: entity.title,
      summary: entity.summary || '',
      thumbnail: entity.thumbnail,
      publishedAt: new Date(entity.publishedAt),
      detailUrl: entity.detailUrl,
      organization: entity.organization,
      sourceUrl: entity.sourceUrl
    };
  }
}