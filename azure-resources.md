# Azure リソース設定（コスト最適化）

## 必要なAzureリソース

### 1. Azure Functions App
- **プラン**: 従量課金プラン（Consumption Plan）
- **ランタイム**: Node.js 18
- **OS**: Linux（コスト削減のため）
- **リージョン**: Japan East（東日本）

### 2. Storage Account
- **種類**: General Purpose v2
- **パフォーマンス**: Standard
- **レプリケーション**: LRS（Locally Redundant Storage）
- **アクセス層**: Hot（アクセス頻度が高いため）

## 推定月額コスト
- **Azure Functions**: 約￥0-500（無料枠内で収まる可能性大）
  - 100万実行/月、400,000 GB-s/月の無料枠あり
  - 30分間隔実行 = 約1,440回/月
- **Storage Account**: 約￥100-300
  - 1GB未満のデータ使用想定

**合計**: 約￥100-800/月

## Azure CLIでのリソース作成例

```bash
# リソースグループ作成
az group create --name rg-jhoshi-news --location japaneast

# Storage Account作成
az storage account create \
  --name stjhoshinews \
  --resource-group rg-jhoshi-news \
  --location japaneast \
  --sku Standard_LRS \
  --kind StorageV2

# Functions App作成
az functionapp create \
  --resource-group rg-jhoshi-news \
  --consumption-plan-location japaneast \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name func-jhoshi-news \
  --storage-account stjhoshinews \
  --os-type Linux
```

## 環境変数設定

Functions Appの設定で以下の環境変数を設定：

```bash
# アプリケーション設定
az functionapp config appsettings set \
  --name func-jhoshi-news \
  --resource-group rg-jhoshi-news \
  --settings \
    FUNCTIONS_WORKER_RUNTIME=node \
    WEBSITE_NODE_DEFAULT_VERSION=~18 \
    FUNCTIONS_EXTENSION_VERSION=~4
```

## GitHub Actions Secrets設定

GitHub リポジトリの Settings > Secrets and variables > Actions で設定：

1. **AZURE_FUNCTIONAPP_NAME**: `func-jhoshi-news`
2. **AZURE_FUNCTIONAPP_PUBLISH_PROFILE**: 
   - Azure Portal > Functions App > Get publish profile からダウンロード
   - ファイル内容をそのままSecretに設定

## コスト監視設定

Azure Portal で以下を設定することを推奨：

1. **予算アラート**: 月額￥1,000で設定
2. **使用量アラート**: Functions実行回数が月10,000回を超えた場合
3. **Cost Management**: 週次レポート設定