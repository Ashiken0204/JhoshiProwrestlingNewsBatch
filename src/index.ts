// Azure Functions のエントリーポイント
// 各関数は個別のファイルで定義され、app.setup() で自動的に登録されます

import './functions/newsCollector';
import './functions/newsApi';

console.log('女子プロレスニュース収集バッチアプリケーションが起動しました');