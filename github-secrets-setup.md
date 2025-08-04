# GitHub Actions Secrets 設定手順

## 必要なSecrets

以下のSecretsをGitHubリポジトリに設定してください：

### 1. AZURE_FUNCTIONAPP_NAME
```
func-jhoshi-news
```

### 2. AZURE_FUNCTIONAPP_PUBLISH_PROFILE
先ほど取得したpublish profileの全内容：
```xml
<publishData><publishProfile profileName="func-jhoshi-news - Web Deploy" publishMethod="MSDeploy" publishUrl="func-jhoshi-news.scm.azurewebsites.net:443" msdeploySite="func-jhoshi-news" userName="$func-jhoshi-news" userPWD="GCFYhLBaClaHD2wFmp29KrLjzKSFd4XSFubSGuRCF7lEAo8rjNjKRMcKlfDi" destinationAppUrl="http://func-jhoshi-news.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites"><databases /></publishProfile><publishProfile profileName="func-jhoshi-news - FTP" publishMethod="FTP" publishUrl="ftps://waws-prod-ty1-021.ftp.azurewebsites.windows.net/site/wwwroot" ftpPassiveMode="True" userName="func-jhoshi-news\$func-jhoshi-news" userPWD="GCFYhLBaClaHD2wFmp29KrLjzKSFd4XSFubSGuRCF7lEAo8rjNjKRMcKlfDi" destinationAppUrl="http://func-jhoshi-news.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites"><databases /></publishProfile><publishProfile profileName="func-jhoshi-news - Zip Deploy" publishMethod="ZipDeploy" publishUrl="func-jhoshi-news.scm.azurewebsites.net:443" userName="$func-jhoshi-news" userPWD="GCFYhLBaClaHD2wFmp29KrLjzKSFd4XSFubSGuRCF7lEAo8rjNjKRMcKlfDi" destinationAppUrl="http://func-jhoshi-news.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites"><databases /></publishProfile><publishProfile profileName="func-jhoshi-news - ReadOnly - FTP" publishMethod="FTP" publishUrl="ftps://waws-prod-ty1-021dr.ftp.azurewebsites.windows.net/site/wwwroot" ftpPassiveMode="True" userName="func-jhoshi-news\$func-jhoshi-news" userPWD="GCFYhLBaClaHD2wFmp29KrLjzKSFd4XSFubSGuRCF7lEAo8rjNjKRMcKlfDi" destinationAppUrl="http://func-jhoshi-news.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites"><databases /></publishProfile></publishData>
```

## 設定手順

1. GitHubリポジトリページで **Settings** タブをクリック
2. 左サイドバーの **Secrets and variables** → **Actions** をクリック
3. **New repository secret** ボタンをクリック
4. **Name** に `AZURE_FUNCTIONAPP_NAME`、**Secret** に `func-jhoshi-news` を入力して **Add secret**
5. 再度 **New repository secret** ボタンをクリック
6. **Name** に `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`、**Secret** に上記のXML全体をコピー＆ペーストして **Add secret**

## 確認方法

設定完了後、コードをプッシュするとGitHub Actionsが自動実行されます：
- Actions タブで実行状況を確認
- 成功すると Azure Functions にデプロイされます

## Azure Functions エンドポイント

デプロイ成功後は以下のURLでAPIにアクセス可能：
- **ニュース一覧**: https://func-jhoshi-news.azurewebsites.net/api/news
- **団体一覧**: https://func-jhoshi-news.azurewebsites.net/api/organizations  
- **統計情報**: https://func-jhoshi-news.azurewebsites.net/api/statistics