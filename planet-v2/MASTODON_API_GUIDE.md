# Mastodon API: 認証なしでアカウント情報と公開投稿を取得する方法

## 概要

このドキュメントでは、Mastodon APIを使用して認証なしでアカウント情報と公開投稿を取得する方法について説明します。

## 前提条件

- インターネット接続
- HTTP リクエストを送信できる環境（cURL、Python、JavaScript等）
- 対象のMastodonインスタンスが公開データアクセスを許可している

## 重要な制限事項

- インスタンスがホワイトリストモードの場合、認証が必要
- 管理者が公開プレビューを無効にしている場合、アプリトークンが必要
- IPアドレスベースのレート制限が適用される
- 取得できるのは公開投稿のみ（プライベート・限定公開投稿は不可）

## 1. アカウント情報の取得

### エンドポイント
```
GET /api/v1/accounts/:id
```

### パラメータ
- `:id` (必須): アカウントの内部ID

### リクエスト例
```bash
# 基本的な取得
curl "https://mastodon.social/api/v1/accounts/1"

# 複数アカウントの取得
curl "https://mastodon.social/api/v1/accounts?id[]=1&id[]=2"
```

### レスポンス例
```json
{
  "id": "1",
  "username": "Gargron",
  "acct": "Gargron",
  "display_name": "Eugen",
  "locked": false,
  "bot": false,
  "created_at": "2016-03-16T14:34:26.392Z",
  "note": "<p>Developer of Mastodon and administrator of mastodon.social.</p>",
  "url": "https://mastodon.social/@Gargron",
  "avatar": "https://files.mastodon.social/accounts/avatars/000/000/001/original/d96d39a0abb45b92.jpg",
  "header": "https://files.mastodon.social/accounts/headers/000/000/001/original/c91b871f294ea63e.png",
  "followers_count": 318699,
  "following_count": 453,
  "statuses_count": 61013,
  "last_status_at": "2019-11-30T20:02:08.277Z",
  "fields": [
    {
      "name": "Patreon",
      "value": "<a href=\"https://www.patreon.com/mastodon\" rel=\"me nofollow noopener noreferrer\" target=\"_blank\">patreon.com/mastodon</a>",
      "verified_at": null
    }
  ]
}
```

## 2. ユーザー名からアカウントIDを取得

### エンドポイント
```
GET /api/v1/accounts/lookup
```

### パラメータ
- `acct` (必須): ユーザー名またはWebfingerアドレス

### リクエスト例
```bash
# ローカルユーザーの場合
curl "https://mastodon.social/api/v1/accounts/lookup?acct=Gargron"

# リモートユーザーの場合
curl "https://mastodon.social/api/v1/accounts/lookup?acct=user@other-instance.com"
```

## 3. アカウントの公開投稿取得

### エンドポイント
```
GET /api/v1/accounts/:id/statuses
```

### パラメータ
| パラメータ | 型 | 説明 | デフォルト |
|-----------|----|----|-----------|
| `max_id` | String | この ID より小さい ID の結果を返す | なし |
| `since_id` | String | この ID より大きい ID の結果を返す | なし |
| `min_id` | String | この ID より新しい結果を即座に返す | なし |
| `limit` | Integer | 返す結果の最大数（最大40） | 20 |
| `only_media` | Boolean | メディア添付のある投稿のみ | false |
| `exclude_replies` | Boolean | 他アカウントへの返信を除外 | false |
| `exclude_reblogs` | Boolean | ブーストを除外 | false |
| `pinned` | Boolean | 固定投稿のみ | false |
| `tagged` | String | 特定のハッシュタグの投稿のみ | なし |

### リクエスト例
```bash
# 基本的な取得
curl "https://mastodon.social/api/v1/accounts/1/statuses?limit=10"

# 返信とブーストを除外
curl "https://mastodon.social/api/v1/accounts/1/statuses?exclude_replies=true&exclude_reblogs=true&limit=10"

# メディア付き投稿のみ
curl "https://mastodon.social/api/v1/accounts/1/statuses?only_media=true&limit=5"

# 特定ハッシュタグの投稿のみ
curl "https://mastodon.social/api/v1/accounts/1/statuses?tagged=mastodon&limit=5"

# ページネーション（過去の投稿を取得）
curl "https://mastodon.social/api/v1/accounts/1/statuses?max_id=108880211901672326&limit=10"
```

### レスポンス例
```json
[
  {
    "id": "108880211901672326",
    "created_at": "2022-08-24T22:29:46.493Z",
    "in_reply_to_id": null,
    "in_reply_to_account_id": null,
    "sensitive": false,
    "spoiler_text": "",
    "visibility": "public",
    "language": "en",
    "uri": "https://mastodon.social/users/Gargron/statuses/108880211901672326",
    "url": "https://mastodon.social/@Gargron/108880211901672326",
    "replies_count": 15,
    "reblogs_count": 42,
    "favourites_count": 128,
    "content": "<p>投稿内容がここに表示されます</p>",
    "account": {
      "id": "1",
      "username": "Gargron",
      "display_name": "Eugen"
    },
    "media_attachments": [],
    "mentions": [],
    "tags": [],
    "emojis": []
  }
]
```

## 4. Pythonでの実装例

### 基本的な実装
```python
import requests
import json
from typing import Optional, List, Dict

class MastodonPublicAPI:
    def __init__(self, instance_url: str):
        self.instance_url = instance_url.rstrip('/')
    
    def get_account_by_username(self, username: str) -> Optional[Dict]:
        """ユーザー名からアカウント情報を取得"""
        url = f"{self.instance_url}/api/v1/accounts/lookup"
        params = {'acct': username}
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"アカウント取得エラー: {e}")
            return None
    
    def get_account_by_id(self, account_id: str) -> Optional[Dict]:
        """アカウントIDからアカウント情報を取得"""
        url = f"{self.instance_url}/api/v1/accounts/{account_id}"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"アカウント取得エラー: {e}")
            return None
    
    def get_account_statuses(
        self,
        account_id: str,
        limit: int = 20,
        max_id: Optional[str] = None,
        since_id: Optional[str] = None,
        min_id: Optional[str] = None,
        only_media: bool = False,
        exclude_replies: bool = False,
        exclude_reblogs: bool = False,
        pinned: bool = False,
        tagged: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """アカウントの公開投稿を取得"""
        url = f"{self.instance_url}/api/v1/accounts/{account_id}/statuses"
        
        params = {'limit': limit}
        if max_id: params['max_id'] = max_id
        if since_id: params['since_id'] = since_id
        if min_id: params['min_id'] = min_id
        if only_media: params['only_media'] = 'true'
        if exclude_replies: params['exclude_replies'] = 'true'
        if exclude_reblogs: params['exclude_reblogs'] = 'true'
        if pinned: params['pinned'] = 'true'
        if tagged: params['tagged'] = tagged
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"投稿取得エラー: {e}")
            return None

# 使用例
def main():
    # APIクライアントを初期化
    api = MastodonPublicAPI("https://mastodon.social")
    
    # ユーザー名からアカウント情報を取得
    account = api.get_account_by_username("Gargron")
    if not account:
        print("アカウントが見つかりません")
        return
    
    print(f"アカウント名: {account['display_name']} (@{account['username']})")
    print(f"フォロワー数: {account['followers_count']}")
    print(f"投稿数: {account['statuses_count']}")
    print("-" * 50)
    
    # 公開投稿を取得（返信とブーストを除外）
    statuses = api.get_account_statuses(
        account['id'],
        limit=5,
        exclude_replies=True,
        exclude_reblogs=True
    )
    
    if statuses:
        for status in statuses:
            print(f"投稿ID: {status['id']}")
            print(f"作成日時: {status['created_at']}")
            print(f"内容: {status['content'][:100]}...")
            print(f"♥ {status['favourites_count']} 🔁 {status['reblogs_count']}")
            print("-" * 30)

if __name__ == "__main__":
    main()
```

## 5. JavaScriptでの実装例

### ブラウザ環境での実装
```javascript
class MastodonPublicAPI {
    constructor(instanceUrl) {
        this.instanceUrl = instanceUrl.replace(/\/$/, '');
    }
    
    async getAccountByUsername(username) {
        try {
            const response = await fetch(
                `${this.instanceUrl}/api/v1/accounts/lookup?acct=${username}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('アカウント取得エラー:', error);
            return null;
        }
    }
    
    async getAccountStatuses(accountId, options = {}) {
        const params = new URLSearchParams({
            limit: options.limit || 20,
            ...(options.maxId && { max_id: options.maxId }),
            ...(options.sinceId && { since_id: options.sinceId }),
            ...(options.minId && { min_id: options.minId }),
            ...(options.onlyMedia && { only_media: 'true' }),
            ...(options.excludeReplies && { exclude_replies: 'true' }),
            ...(options.excludeReblogs && { exclude_reblogs: 'true' }),
            ...(options.pinned && { pinned: 'true' }),
            ...(options.tagged && { tagged: options.tagged })
        });
        
        try {
            const response = await fetch(
                `${this.instanceUrl}/api/v1/accounts/${accountId}/statuses?${params}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('投稿取得エラー:', error);
            return null;
        }
    }
}

// 使用例
async function example() {
    const api = new MastodonPublicAPI('https://mastodon.social');
    
    // アカウント情報を取得
    const account = await api.getAccountByUsername('Gargron');
    if (!account) {
        console.log('アカウントが見つかりません');
        return;
    }
    
    console.log(`${account.display_name} (@${account.username})`);
    console.log(`フォロワー: ${account.followers_count}`);
    
    // 投稿を取得
    const statuses = await api.getAccountStatuses(account.id, {
        limit: 10,
        excludeReplies: true,
        excludeReblogs: true
    });
    
    if (statuses) {
        statuses.forEach(status => {
            console.log(`${status.created_at}: ${status.content}`);
        });
    }
}
```

## 6. エラーハンドリング

### よくあるエラーと対処法

| HTTPステータス | エラー内容 | 対処法 |
|---------------|-----------|-------|
| 401 | 認証が必要 | インスタンス設定によるもの。アプリトークンの取得を検討 |
| 404 | アカウントまたは投稿が見つからない | IDやユーザー名を確認 |
| 410 | アカウントが停止されている | 対象アカウントの状態を確認 |
| 429 | レート制限に達した | 時間をおいて再試行 |
| 503 | サーバーが利用できない | インスタンスの状態を確認 |

### Python エラーハンドリング例
```python
import time
import requests
from requests.exceptions import RequestException

def get_with_retry(url, params=None, max_retries=3, delay=1):
    """リトライ機能付きでリクエストを送信"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params)
            
            if response.status_code == 429:  # Rate limited
                print(f"レート制限に達しました。{delay}秒待機...")
                time.sleep(delay)
                delay *= 2  # Exponential backoff
                continue
            
            response.raise_for_status()
            return response.json()
            
        except RequestException as e:
            print(f"試行 {attempt + 1}/{max_retries} 失敗: {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                raise
    
    return None
```

## 7. ベストプラクティス

### パフォーマンス最適化
1. **適切なlimit設定**: 必要以上に大きな値を設定しない（最大40）
2. **ページネーション**: 大量データ取得時は`max_id`を使用
3. **キャッシュ**: 同じデータを頻繁に取得する場合はキャッシュを実装
4. **レート制限への配慮**: 連続リクエスト時は適切な間隔を空ける

### セキュリティ
1. **入力検証**: ユーザー入力は適切に検証・サニタイズ
2. **HTTPS使用**: 必ずHTTPSを使用
3. **エラー情報の適切な処理**: 詳細なエラー情報をユーザーに露出しない

### データ処理
1. **HTMLコンテンツの処理**: `content`フィールドはHTMLなので適切に処理
2. **日時の処理**: ISO 8601形式の日時を適切にパース
3. **メディアファイルの処理**: 画像や動画URLは有効期限がある場合がある

## 8. 制限とトラブルシューティング

### 制限事項
- 認証なしでは公開データのみアクセス可能
- インスタンス管理者の設定により利用不可の場合がある
- レート制限（通常、IPアドレス毎に時間あたりの制限）

### トラブルシューティング
1. **CORSエラー（ブラウザ）**: プロキシサーバーの使用を検討
2. **SSL証明書エラー**: インスタンスのSSL設定を確認
3. **データが取得できない**: インスタンスの公開設定を確認
4. **古いデータが返される**: キャッシュの影響を考慮

このドキュメントを参考に、Mastodon APIを使用してアカウント情報と公開投稿を効率的に取得できます。