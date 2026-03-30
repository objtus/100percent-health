# Mastodon API ガイド

このドキュメントでは、Mastodon APIを使用してアカウント情報・公開投稿を取得する方法（認証なし）と、認証を行ってホームタイムライン・非公開投稿を含めて取得する方法（認証あり）について説明します。

---

# Part 1: 認証なしで公開投稿を取得する

## 概要

認証なしでは、公開範囲が `public` の投稿のみ取得できます。インスタンスの設定によっては、アプリトークンのみ必要な場合もあります（後述）。

## 前提条件

- インターネット接続
- HTTP リクエストを送信できる環境（cURL、Python、JavaScript等）
- 対象のMastodonインスタンスが公開データアクセスを許可している

## 重要な制限事項

- インスタンスがホワイトリストモードの場合、認証が必要
- 管理者が公開プレビューを無効にしている場合、アプリトークンが必要（v3.0.0以降）
- IPアドレスベースのレート制限が適用される
- 取得できるのは公開投稿のみ（`public`のみ。`unlisted`・`private`・`direct`は不可）

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

```python
import requests
from typing import Optional, List, Dict

class MastodonPublicAPI:
    def __init__(self, instance_url: str):
        self.instance_url = instance_url.rstrip('/')

    def get_account_by_username(self, username: str) -> Optional[Dict]:
        """ユーザー名からアカウント情報を取得"""
        url = f"{self.instance_url}/api/v1/accounts/lookup"
        try:
            response = requests.get(url, params={'acct': username})
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
    api = MastodonPublicAPI("https://mastodon.social")
    account = api.get_account_by_username("Gargron")
    if not account:
        print("アカウントが見つかりません")
        return

    print(f"アカウント名: {account['display_name']} (@{account['username']})")
    print(f"フォロワー数: {account['followers_count']}")
    print("-" * 50)

    statuses = api.get_account_statuses(
        account['id'], limit=5, exclude_replies=True, exclude_reblogs=True
    )
    if statuses:
        for status in statuses:
            print(f"投稿ID: {status['id']}")
            print(f"内容: {status['content'][:100]}...")
            print(f"♥ {status['favourites_count']}  🔁 {status['reblogs_count']}")
            print("-" * 30)

if __name__ == "__main__":
    main()
```

## 5. JavaScriptでの実装例

```javascript
class MastodonPublicAPI {
    constructor(instanceUrl) {
        this.instanceUrl = instanceUrl.replace(/\/$/, '');
    }

    async getAccountByUsername(username) {
        try {
            const response = await fetch(
                `${this.instanceUrl}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('投稿取得エラー:', error);
            return null;
        }
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
| 422 | バリデーションエラー | リクエストパラメータを確認 |
| 429 | レート制限に達した | 時間をおいて再試行（`Retry-After`ヘッダーを参照） |
| 503 | サーバーが利用できない | インスタンスの状態を確認 |

### Python リトライ例
```python
import time
import requests

def get_with_retry(url, params=None, headers=None, max_retries=3, delay=1):
    """リトライ機能付きでリクエストを送信"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers)

            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', delay))
                print(f"レート制限。{retry_after}秒待機...")
                time.sleep(retry_after)
                delay *= 2
                continue

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
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
4. **レート制限への配慮**: `Retry-After`レスポンスヘッダーを尊重する

### セキュリティ
1. **入力検証**: ユーザー入力は適切に検証・サニタイズ
2. **HTTPS使用**: 必ずHTTPSを使用
3. **エラー情報の適切な処理**: 詳細なエラー情報をユーザーに露出しない

### データ処理
1. **HTMLコンテンツの処理**: `content`フィールドはHTMLなので適切にサニタイズ
2. **日時の処理**: ISO 8601形式の日時を適切にパース
3. **メディアファイルの処理**: 画像や動画URLは有効期限がある場合がある

## 8. 制限とトラブルシューティング

### 制限事項
- 認証なしでは公開データのみアクセス可能（`public` 投稿のみ）
- インスタンス管理者の設定により利用不可の場合がある
- レート制限（通常、IPアドレス毎に時間あたりの制限）
- v4.5.0以降、タイムライン系エンドポイントにアクセス制御設定が追加された

### トラブルシューティング
1. **CORSエラー（ブラウザ）**: プロキシサーバーの使用を検討
2. **SSL証明書エラー**: インスタンスのSSL設定を確認
3. **データが取得できない**: インスタンスの公開設定を確認
4. **古いデータが返される**: キャッシュの影響を考慮

---

# Part 2: 認証を行い、非公開投稿も含めて取得する

## 9. 認証の概要

Mastodonでは、OAuth 2.0による認証（アクセストークン）を使うことで以下が可能になります。

- 公開範囲 `unlisted`（未収載）の投稿の取得
- 公開範囲 `private`（フォロワー限定）の投稿の取得（フォローしている場合）
- 自分のホームタイムラインを取得（フォローしているユーザー全員の投稿）
- 自分の通知・ブックマーク・お気に入りの取得
- 投稿・フォロー操作など書き込み系API

### 投稿の公開範囲（visibility）

| visibility 値 | 説明 | 認証なしで取得可能か |
|--------------|------|------------------|
| `public` | 全体公開（全タイムラインに表示） | ✓ |
| `unlisted` | 未収載（公開TLには流れない） | ✗（認証ありでも他人のは取得困難） |
| `private` | フォロワー限定 | ✗（フォローしていればホームTLで取得可能） |
| `direct` | ダイレクト（メンションしたユーザーのみ） | ✗ |

### バージョンによる認証機能の変化

| バージョン | 変更内容 |
|-----------|---------|
| v2.4.0 | `push` スコープ追加 |
| v2.4.3 | 細粒度スコープ（`read:statuses` 等）追加 |
| v3.0.0 | 公開プレビュー無効化時にアプリトークンが必要に |
| v3.5.0 | `follow` スコープ非推奨（細粒度スコープを使用すること） |
| v4.3.0 | **PKCE サポート追加**、`profile` スコープ追加、`/.well-known/oauth-authorization-server` 追加 |
| v4.4.0 | `GET /oauth/userinfo` エンドポイント追加 |
| v4.5.0 | クォート投稿 (`quoted_status_id`) サポート、タイムラインアクセス制御設定追加 |

---

## 10. アプリの登録

アクセストークンを取得するには、まずアプリをインスタンスに登録する必要があります。

### エンドポイント
```
POST /api/v1/apps
```

### リクエスト例
```bash
curl -X POST "https://mastodon.social/api/v1/apps" \
  -F "client_name=MyApp" \
  -F "redirect_uris=urn:ietf:wg:oauth:2.0:oob" \
  -F "scopes=read:accounts read:statuses" \
  -F "website=https://myapp.example.com"
```

### パラメータ

| パラメータ | 説明 |
|-----------|------|
| `client_name` | アプリ名（必須） |
| `redirect_uris` | リダイレクトURI（必須）。OOBの場合は `urn:ietf:wg:oauth:2.0:oob` |
| `scopes` | 要求するスコープをスペース区切りで（省略時は `read`） |
| `website` | アプリのWebサイトURL（任意） |

### レスポンス例
```json
{
  "id": "563419",
  "name": "MyApp",
  "website": "https://myapp.example.com",
  "redirect_uri": "urn:ietf:wg:oauth:2.0:oob",
  "client_id": "TWhM-tNSuncnqN7DBJmoyeLnk6K3iJJ71KKXxgL1ydc",
  "client_secret": "ZEaFUFmF0umgBX1qKJDjaU99Q31lDkOU8NutzTOoliw"
}
```

> **重要**: `client_id` と `client_secret` はパスワードと同様に扱い、安全に保管すること。

---

## 11. アクセストークンの取得

### 方法A: Authorization Code フロー（ユーザー認証あり）

他のユーザーに認証を求める場合のフローです。

#### Step 1: ユーザーを認証ページへ誘導

```
GET /oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}
```

```bash
# ブラウザで開くURL（例）
https://mastodon.social/oauth/authorize?response_type=code&client_id=TWhM-tNSuncnqN7DBJmoyeLnk6K3iJJ71KKXxgL1ydc&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&scope=read%3Aaccounts+read%3Astatuses
```

| パラメータ | 説明 |
|-----------|------|
| `response_type` | 常に `code` を指定 |
| `client_id` | アプリ登録時に取得した値 |
| `redirect_uri` | アプリ登録時に指定したURI |
| `scope` | 要求するスコープをスペース区切りで |
| `state` | CSRF対策の任意文字列（任意） |
| `code_challenge` | PKCEのコードチャレンジ（v4.3.0以降、任意だが推奨） |
| `code_challenge_method` | PKCEの場合は `S256` を指定 |
| `force_login` | 再ログインを強制（複数アカウント対応時に有用） |

#### Step 2: 認証コードをトークンに交換

```bash
curl -X POST "https://mastodon.social/oauth/token" \
  -F "grant_type=authorization_code" \
  -F "code=AUTH_CODE_HERE" \
  -F "client_id=TWhM-tNSuncnqN7DBJmoyeLnk6K3iJJ71KKXxgL1ydc" \
  -F "client_secret=ZEaFUFmF0umgBX1qKJDjaU99Q31lDkOU8NutzTOoliw" \
  -F "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

#### レスポンス例
```json
{
  "access_token": "ZA-Yj3aBD8U8Cm7lKUp-lm9O9BmDgdhHzDeqsY8tlL0",
  "token_type": "Bearer",
  "scope": "read:accounts read:statuses",
  "created_at": 1573979017
}
```

### 方法B: Authorization Code フロー + PKCE（v4.3.0以降推奨）

PKCEを使用するとクライアントシークレットなしで安全に認証できます。SPAやモバイルアプリで推奨されます。

```javascript
import crypto from "node:crypto";

// PKCE用の文字列を生成
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
const codeVerifier = Array.from(
    { length: 128 },
    () => chars[Math.floor(Math.random() * chars.length)]
).join("");

const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier, "ascii")
    .digest("base64url");

// Step 1: 認証URLを構築（code_challenge を含める）
const params = new URLSearchParams({
    response_type: "code",
    client_id: "YOUR_CLIENT_ID",
    redirect_uri: "https://myapp.example.com/callback",
    scope: "read:accounts read:statuses",
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
});
const authUrl = `https://mastodon.social/oauth/authorize?${params}`;

// Step 2: トークン取得時に code_verifier を含める
const tokenResponse = await fetch("https://mastodon.social/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        grant_type: "authorization_code",
        code: "AUTH_CODE_HERE",
        client_id: "YOUR_CLIENT_ID",
        redirect_uri: "https://myapp.example.com/callback",
        code_verifier: codeVerifier
    })
});
const { access_token } = await tokenResponse.json();
```

### 方法C: Client Credentials フロー（アプリレベルのアクセス）

ユーザー認証なしにアプリレベルのアクセストークンを取得します。公開プレビューが無効なインスタンスへの認証なしアクセスに使用できます。

```bash
curl -X POST "https://mastodon.social/oauth/token" \
  -F "grant_type=client_credentials" \
  -F "client_id=TWhM-tNSuncnqN7DBJmoyeLnk6K3iJJ71KKXxgL1ydc" \
  -F "client_secret=ZEaFUFmF0umgBX1qKJDjaU99Q31lDkOU8NutzTOoliw" \
  -F "redirect_uri=urn:ietf:wg:oauth:2.0:oob" \
  -F "scope=read"
```

> **注意**: Client Credentials で得られるトークンはアプリレベルのアクセスのみで、ユーザー固有の情報（ホームTL等）は取得できません。

### v4.3.0以降: OAuth認証サーバーメタデータの取得

インスタンスが対応しているスコープや認証エンドポイントを動的に取得できます。

```bash
curl "https://mastodon.social/.well-known/oauth-authorization-server"
```

```json
{
  "issuer": "https://mastodon.social/",
  "authorization_endpoint": "https://mastodon.social/oauth/authorize",
  "token_endpoint": "https://mastodon.social/oauth/token",
  "scopes_supported": ["read", "write", "read:accounts", "read:statuses", "..."],
  "code_challenge_methods_supported": ["S256"],
  "grant_types_supported": ["authorization_code", "client_credentials"]
}
```

---

## 12. アクセストークンを使ったAPIリクエスト

取得したアクセストークンは、全リクエストの `Authorization` ヘッダーに含めます。

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://mastodon.social/api/v1/timelines/home?limit=10"
```

---

## 13. 認証後に使えるエンドポイント

### ホームタイムラインの取得

フォローしているユーザーの全投稿を取得します。`private`（フォロワー限定）投稿も含まれます。

#### エンドポイント
```
GET /api/v1/timelines/home
```

**必要なスコープ**: `read:statuses`（または `read`）

#### パラメータ

| パラメータ | 型 | 説明 | デフォルト |
|-----------|----|----|-----------|
| `max_id` | String | この ID より小さい ID の結果を返す | なし |
| `since_id` | String | この ID より大きい ID の結果を返す | なし |
| `min_id` | String | この ID より新しい結果を即座に返す | なし |
| `limit` | Integer | 返す結果の最大数（最大40） | 20 |

#### リクエスト例
```bash
# ホームタイムラインを10件取得
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://mastodon.social/api/v1/timelines/home?limit=10"

# ページネーション（特定IDより古い投稿を取得）
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://mastodon.social/api/v1/timelines/home?max_id=108880211901672326&limit=10"
```

### 認証済みアカウント情報の取得

自分自身のアカウント情報（認証情報含む）を取得します。

#### エンドポイント
```
GET /api/v1/accounts/verify_credentials
```

**必要なスコープ**: `profile`（v4.3.0以降）または `read:accounts`

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://mastodon.social/api/v1/accounts/verify_credentials"
```

### 認証付きでアカウントの投稿を取得

自分のアカウントを指定した場合、`unlisted`（未収載）投稿も取得できます。

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://mastodon.social/api/v1/accounts/1/statuses?limit=20&exclude_replies=true"
```

---

## 14. 必要なスコープ（権限）一覧

アプリ登録時に指定する主要なスコープです。

| スコープ | 説明 |
|---------|------|
| `profile` | 自分のアカウント情報取得のみ（v4.3.0以降、最小権限） |
| `read:accounts` | アカウント情報の読み取り |
| `read:statuses` | 投稿・ホームタイムラインの読み取り |
| `read:notifications` | 通知の読み取り |
| `read:favourites` | お気に入りの読み取り |
| `read:bookmarks` | ブックマークの読み取り |
| `read:follows` | フォロー関係の読み取り |
| `read:lists` | リストの読み取り |
| `write:statuses` | 投稿・削除 |
| `write:favourites` | お気に入り操作 |
| `write:follows` | フォロー・アンフォロー |
| `write:bookmarks` | ブックマーク操作 |
| `push` | Web Push通知 |

> **注意**: `follow` スコープは v3.5.0以降**非推奨**です。代わりに `read:follows` / `write:follows` 等の細粒度スコープを使用してください。
> 必要最小限のスコープのみ要求することを強く推奨します。

---

## 15. 認証付きJavaScript実装例

```javascript
class MastodonAuthenticatedAPI {
    constructor(instanceUrl, accessToken) {
        this.instanceUrl = instanceUrl.replace(/\/$/, '');
        this.accessToken = accessToken;
    }

    async _get(endpoint, params = {}) {
        const url = new URL(`${this.instanceUrl}/api/v1/${endpoint}`);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) url.searchParams.set(k, v);
        });
        try {
            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(`${response.status}: ${err.error}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`リクエストエラー (${endpoint}):`, error);
            return null;
        }
    }

    async getHomeTimeline(options = {}) {
        return this._get('timelines/home', {
            limit: options.limit ?? 20,
            max_id: options.maxId,
            since_id: options.sinceId,
            min_id: options.minId
        });
    }

    async verifyCredentials() {
        return this._get('accounts/verify_credentials');
    }

    async getAccountStatuses(accountId, options = {}) {
        return this._get(`accounts/${accountId}/statuses`, {
            limit: options.limit ?? 20,
            max_id: options.maxId,
            exclude_replies: options.excludeReplies ? 'true' : undefined,
            exclude_reblogs: options.excludeReblogs ? 'true' : undefined,
            only_media: options.onlyMedia ? 'true' : undefined,
            tagged: options.tagged
        });
    }
}

// 使用例
async function example() {
    const api = new MastodonAuthenticatedAPI('https://mastodon.social', 'YOUR_ACCESS_TOKEN');

    // 自分のアカウント情報を確認
    const me = await api.verifyCredentials();
    if (me) console.log(`ログイン中: @${me.username}`);

    // ホームタイムラインを取得
    const timeline = await api.getHomeTimeline({ limit: 10 });
    if (timeline) {
        timeline.forEach(status => {
            console.log(`[${status.visibility}] @${status.account.username}: ${status.content.slice(0, 80)}`);
        });
    }
}
```

---

## 16. トークンの無効化

```bash
curl -X POST "https://mastodon.social/oauth/revoke" \
  -F "client_id=YOUR_CLIENT_ID" \
  -F "client_secret=YOUR_CLIENT_SECRET" \
  -F "token=YOUR_ACCESS_TOKEN"
```

このドキュメントを参考に、Mastodon APIを使用して公開・非公開を問わず自分のタイムラインを効率的に取得できます。
