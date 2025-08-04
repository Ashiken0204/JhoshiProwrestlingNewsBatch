# 女子プロレスニュース収集バッチ

女子プロレス団体のニュースを自動収集し、API経由で提供するAzure Functionsアプリケーションです。

## 機能

### 定期実行機能
- 30分間隔で各女子プロレス団体のニュースをスクレイピング
- サムネイル、日時、タイトル、概要、詳細URLを取得
- 重複チェックとデータ統合

### API機能
- `GET /api/news` - ニュース一覧取得
  - `?organization={団体名}` - 特定団体のニュースを取得
  - `?limit={件数}` - 取得件数を指定（デフォルト: 20件）
- `GET /api/organizations` - 対応団体一覧取得
- `GET /api/statistics` - 統計情報取得

## 対応団体
- スターダム (stardom)
- 東京女子プロレス (tjpw)
- アイスリボン (ice_ribbon)
- プロレスリングWAVE (wave)

## セットアップ

### 開発環境
```bash
# 依存関係のインストール
npm install

# TypeScriptコンパイル
npm run build

# ローカル実行
npm start
```

### Azure へのデプロイ

1. Azure Functions アプリを作成
2. GitHub Secrets に以下を設定:
   - `AZURE_FUNCTIONAPP_NAME`: Functions アプリ名
   - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: 発行プロファイル

3. main ブランチにpushすると自動デプロイされます

## 技術スタック
- Azure Functions (Node.js 18)
- TypeScript
- Puppeteer (動的サイト対応)
- Cheerio (HTML解析)
- Axios (HTTP通信)

## API使用例

```javascript
// 最新ニュース20件を取得
fetch('https://your-function-app.azurewebsites.net/api/news')
  .then(response => response.json())
  .then(data => console.log(data));

// スターダムのニュース10件を取得
fetch('https://your-function-app.azurewebsites.net/api/news?organization=stardom&limit=10')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 注意事項
- スクレイピング対象サイトの利用規約を遵守してください
- 過度なアクセスを避けるため、各団体間で2秒の間隔を設けています
- データは一時的なストレージに保存され、最新100件のみ保持されます