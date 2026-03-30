# Misskey API ガイド

このドキュメントでは、Misskey APIを使用してアカウント情報・公開ノートを取得する方法（認証なし）と、認証を行ってホーム・フォロワー限定投稿を含めて取得する方法（認証あり）について説明します。

---

# Part 1: 認証なしで公開ノートを取得する

## 概要

認証なしでは、公開範囲が `public` のノートのみ取得できます。

## Mastodon APIとの主な違い

| 項目 | Mastodon | Misskey |
|------|----------|---------|
| リクエスト方式 | GET（URLパラメータ） | POST（JSONボディ） |
| Content-Type | 不要 | `application/json` |
| 投稿の呼び方 | ステータス (status) | ノート (note) |
| ブースト/リブログ | reblog | リノート (renote) |
| お気に入り | favourite | リアクション (reaction) |
| ページネーション | `max_id` / `since_id` | `untilId` / `sinceId` |

## 前提条件

- インターネット接続
- HTTP リクエストを送信できる環境（cURL、Python、JavaScript等）
- 対象のMisskeyインスタンスが公開データアクセスを許可している

## 重要な制限事項

- インスタンスの設定により、認証（アクセストークン）が必要な場合がある
- 公開範囲が「ホーム」「フォロワー限定」「ダイレクト」のノートは取得できない
- IPアドレスベースのレート制限が適用される
- 取得できるのは公開（パブリック）ノートのみ

## 1. アカウント情報の取得

### エンドポイント
```
POST /api/users/show
```

### リクエストボディ（JSON）

ユーザーIDで指定する場合:
- `userId` (string): ユーザーの内部ID

ユーザー名で指定する場合:
- `username` (string): ユーザー名（`@`を除いた部分）
- `host` (string | null): リモートユーザーのホスト名。ローカルユーザーは `null` または省略

### リクエスト例
```bash
# ユーザー名でローカルユーザーを取得
curl -X POST "https://misskey.io/api/users/show" \
  -H "Content-Type: application/json" \
  -d '{"username": "Misskey"}'

# ユーザー名でリモートユーザーを取得
curl -X POST "https://misskey.io/api/users/show" \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "host": "other-instance.example"}'

# ユーザーIDで取得
curl -X POST "https://misskey.io/api/users/show" \
  -H "Content-Type: application/json" \
  -d '{"userId": "8wm5exampleid"}'
```

### レスポンス例
```json
{
  "id": "8wm5exampleid",
  "name": "表示名",
  "username": "Misskey",
  "host": null,
  "avatarUrl": "https://misskey.io/files/avatar.webp",
  "avatarBlurhash": "eQFRnh~q...",
  "isBot": false,
  "isCat": false,
  "emojis": {},
  "onlineStatus": "online",
  "badgeRoles": [],
  "url": "https://misskey.io/@Misskey",
  "uri": null,
  "createdAt": "2018-05-14T05:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "lastFetchedAt": null,
  "bannerUrl": null,
  "bannerBlurhash": null,
  "isLocked": false,
  "isSilenced": false,
  "isSuspended": false,
  "description": "プロフィール文がここに入ります",
  "location": null,
  "birthday": null,
  "lang": "ja",
  "fields": [],
  "verifiedLinks": [],
  "followersCount": 12345,
  "followingCount": 678,
  "notesCount": 9012,
  "pinnedNoteIds": [],
  "pinnedNotes": [],
  "ffVisibility": "public",
  "twoFactorEnabled": false,
  "usePasswordLessLogin": false,
  "securityKeys": false,
  "roles": [],
  "memo": null,
  "moderationNote": ""
}
```

## 2. ユーザーの公開ノート取得

### エンドポイント
```
POST /api/users/notes
```

### リクエストボディ（JSON）

| パラメータ | 型 | 説明 | デフォルト |
|-----------|----|----|-----------|
| `userId` | String (必須) | ユーザーID | — |
| `limit` | Integer | 返す結果の最大数（最大100） | 10 |
| `sinceId` | String | この ID より新しいノートを返す | なし |
| `untilId` | String | この ID より古いノートを返す | なし |
| `sinceDate` | Integer | この日時（Unixタイムスタンプ ms）以降のノートを返す | なし |
| `untilDate` | Integer | この日時（Unixタイムスタンプ ms）以前のノートを返す | なし |
| `withReplies` | Boolean | リプライを含める | false |
| `withRenotes` | Boolean | リノートを含める | true |
| `withFiles` | Boolean | ファイル添付があるノートのみ | false |
| `withChannelNotes` | Boolean | チャンネルのノートを含める | false |
| `allowPartial` | Boolean | 部分的な結果を許可 | false |

### リクエスト例
```bash
# 基本的な取得
curl -X POST "https://misskey.io/api/users/notes" \
  -H "Content-Type: application/json" \
  -d '{"userId": "8wm5exampleid", "limit": 10}'

# リプライとリノートを除外
curl -X POST "https://misskey.io/api/users/notes" \
  -H "Content-Type: application/json" \
  -d '{"userId": "8wm5exampleid", "withReplies": false, "withRenotes": false, "limit": 10}'

# ファイル添付のあるノートのみ
curl -X POST "https://misskey.io/api/users/notes" \
  -H "Content-Type: application/json" \
  -d '{"userId": "8wm5exampleid", "withFiles": true, "limit": 10}'

# ページネーション（特定IDより古いノートを取得）
curl -X POST "https://misskey.io/api/users/notes" \
  -H "Content-Type: application/json" \
  -d '{"userId": "8wm5exampleid", "untilId": "9xx0examplenoteid", "limit": 10}'
```

### レスポンス例
```json
[
  {
    "id": "9xx0examplenoteid",
    "createdAt": "2024-06-01T12:00:00.000Z",
    "userId": "8wm5exampleid",
    "user": {
      "id": "8wm5exampleid",
      "name": "表示名",
      "username": "Misskey",
      "host": null,
      "avatarUrl": "https://misskey.io/files/avatar.webp"
    },
    "text": "ノートの本文テキスト（MFM形式）",
    "cw": null,
    "visibility": "public",
    "localOnly": false,
    "reactionAcceptance": null,
    "renoteCount": 5,
    "repliesCount": 2,
    "reactions": {
      ":heart@.:": 10,
      ":like@.:": 3
    },
    "reactionCount": 13,
    "reactionEmojis": {},
    "fileIds": [],
    "files": [],
    "replyId": null,
    "renoteId": null,
    "mentions": [],
    "tags": [],
    "emojis": {}
  }
]
```

## 3. Pythonでの実装例

### 基本的な実装
```python
import requests
import json
from typing import Optional, List, Dict

class MisskeyPublicAPI:
    def __init__(self, instance_url: str):
        self.instance_url = instance_url.rstrip('/')
        self.headers = {'Content-Type': 'application/json'}
    
    def _post(self, endpoint: str, body: dict) -> Optional[dict | list]:
        """POSTリクエストを送信"""
        url = f"{self.instance_url}/api/{endpoint}"
        try:
            response = requests.post(url, headers=self.headers, json=body)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"リクエストエラー ({endpoint}): {e}")
            return None

    def get_account_by_username(self, username: str, host: Optional[str] = None) -> Optional[Dict]:
        """ユーザー名からアカウント情報を取得"""
        body = {'username': username}
        if host:
            body['host'] = host
        return self._post('users/show', body)
    
    def get_account_by_id(self, user_id: str) -> Optional[Dict]:
        """ユーザーIDからアカウント情報を取得"""
        return self._post('users/show', {'userId': user_id})
    
    def get_user_notes(
        self,
        user_id: str,
        limit: int = 10,
        since_id: Optional[str] = None,
        until_id: Optional[str] = None,
        since_date: Optional[int] = None,
        until_date: Optional[int] = None,
        with_replies: bool = False,
        with_renotes: bool = True,
        with_files: bool = False,
    ) -> Optional[List[Dict]]:
        """ユーザーの公開ノートを取得"""
        body: dict = {
            'userId': user_id,
            'limit': limit,
            'withReplies': with_replies,
            'withRenotes': with_renotes,
            'withFiles': with_files,
        }
        if since_id: body['sinceId'] = since_id
        if until_id: body['untilId'] = until_id
        if since_date: body['sinceDate'] = since_date
        if until_date: body['untilDate'] = until_date
        
        return self._post('users/notes', body)

# 使用例
def main():
    api = MisskeyPublicAPI("https://misskey.io")
    
    # ユーザー名からアカウント情報を取得
    account = api.get_account_by_username("Misskey")
    if not account:
        print("アカウントが見つかりません")
        return
    
    print(f"アカウント名: {account['name']} (@{account['username']})")
    print(f"フォロワー数: {account['followersCount']}")
    print(f"ノート数: {account['notesCount']}")
    print("-" * 50)
    
    # 公開ノートを取得（リプライとリノートを除外）
    notes = api.get_user_notes(
        account['id'],
        limit=5,
        with_replies=False,
        with_renotes=False
    )
    
    if notes:
        for note in notes:
            print(f"ノートID: {note['id']}")
            print(f"作成日時: {note['createdAt']}")
            text = note.get('text') or '（テキストなし）'
            print(f"内容: {text[:100]}")
            print(f"リノート数: {note['renoteCount']}  リプライ数: {note['repliesCount']}")
            print("-" * 30)

if __name__ == "__main__":
    main()
```

## 4. JavaScriptでの実装例

### ブラウザ環境での実装
```javascript
class MisskeyPublicAPI {
    constructor(instanceUrl) {
        this.instanceUrl = instanceUrl.replace(/\/$/, '');
    }
    
    async _post(endpoint, body) {
        try {
            const response = await fetch(`${this.instanceUrl}/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`リクエストエラー (${endpoint}):`, error);
            return null;
        }
    }
    
    async getAccountByUsername(username, host = null) {
        const body = { username };
        if (host) body.host = host;
        return this._post('users/show', body);
    }
    
    async getAccountById(userId) {
        return this._post('users/show', { userId });
    }
    
    async getUserNotes(userId, options = {}) {
        const body = {
            userId,
            limit: options.limit ?? 10,
            withReplies: options.withReplies ?? false,
            withRenotes: options.withRenotes ?? true,
            withFiles: options.withFiles ?? false,
            ...(options.sinceId && { sinceId: options.sinceId }),
            ...(options.untilId && { untilId: options.untilId }),
            ...(options.sinceDate && { sinceDate: options.sinceDate }),
            ...(options.untilDate && { untilDate: options.untilDate }),
        };
        return this._post('users/notes', body);
    }
}

// 使用例
async function example() {
    const api = new MisskeyPublicAPI('https://misskey.io');
    
    // アカウント情報を取得
    const account = await api.getAccountByUsername('Misskey');
    if (!account) {
        console.log('アカウントが見つかりません');
        return;
    }
    
    console.log(`${account.name} (@${account.username})`);
    console.log(`フォロワー: ${account.followersCount}`);
    
    // ノートを取得（リプライ・リノートを除外）
    const notes = await api.getUserNotes(account.id, {
        limit: 10,
        withReplies: false,
        withRenotes: false
    });
    
    if (notes) {
        notes.forEach(note => {
            const text = note.text ?? '（テキストなし）';
            console.log(`${note.createdAt}: ${text}`);
        });
    }
}
```

## 5. エラーハンドリング

### よくあるエラーと対処法

| HTTPステータス / エラーコード | エラー内容 | 対処法 |
|------------------------------|-----------|-------|
| 400 / `INVALID_PARAM` | パラメータが不正 | リクエストボディの内容を確認 |
| 400 / `NO_SUCH_USER` | ユーザーが見つからない | ユーザー名・IDを確認 |
| 400 / `FAILED_TO_RESOLVE_REMOTE_USER` | リモートユーザーの解決失敗 | ホスト名・ユーザー名を確認 |
| 401 / `CREDENTIAL_REQUIRED` | 認証が必要 | インスタンス設定によるもの。アクセストークンの取得を検討 |
| 403 / `YOUR_ACCOUNT_SUSPENDED` | アカウントが停止されている | 対象アカウントの状態を確認 |
| 429 | レート制限に達した | 時間をおいて再試行 |
| 503 | サーバーが利用できない | インスタンスの状態を確認 |

### Misskeyのエラーレスポンス形式

Misskeyではエラー時にJSONボディでエラー詳細が返ります：
```json
{
  "error": {
    "message": "No such user.",
    "code": "NO_SUCH_USER",
    "id": "1acefcb5-0959-43fd-9685-b48305736cb5",
    "kind": "client"
  }
}
```

### Python エラーハンドリング例
```python
import time
import requests

def post_with_retry(url, body, max_retries=3, delay=1):
    """リトライ機能付きでPOSTリクエストを送信"""
    headers = {'Content-Type': 'application/json'}
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=body)
            
            if response.status_code == 429:
                print(f"レート制限に達しました。{delay}秒待機...")
                time.sleep(delay)
                delay *= 2  # Exponential backoff
                continue
            
            if response.status_code == 400:
                error_data = response.json().get('error', {})
                print(f"クライアントエラー: {error_data.get('code')} - {error_data.get('message')}")
                return None  # リトライしても意味がないのでNoneを返す
            
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

## 6. ベストプラクティス

### パフォーマンス最適化
1. **適切なlimit設定**: 必要以上に大きな値を設定しない（最大100）
2. **ページネーション**: 大量データ取得時は`untilId`を使用して古いノートへ遡る
3. **キャッシュ**: 同じデータを頻繁に取得する場合はキャッシュを実装
4. **レート制限への配慮**: 連続リクエスト時は適切な間隔を空ける

### セキュリティ
1. **入力検証**: ユーザー入力は適切に検証・サニタイズ
2. **HTTPS使用**: 必ずHTTPSを使用
3. **エラー情報の適切な処理**: 詳細なエラー情報をユーザーに露出しない

### データ処理
1. **MFMコンテンツの処理**: `text`フィールドはMFM（Misskey Flavored Markdown）形式
2. **CW（コンテンツ警告）**: `cw`フィールドが`null`でない場合、警告文が含まれる
3. **日時の処理**: ISO 8601形式の日時を適切にパース
4. **リノートの判定**: `renoteId`が`null`でなく`text`が`null`の場合は純粋なリノート
5. **リアクション数の取り扱い**: `reactions`は絵文字ごとのカウントオブジェクト、`reactionCount`は合計数。単純な集計には`reactionCount`が便利

## 7. 制限とトラブルシューティング

### 制限事項
- 認証なしでは公開データのみアクセス可能（公開範囲が`public`のノートのみ）
- インスタンス管理者の設定により利用不可の場合がある
- レート制限（通常、IPアドレス毎に時間あたりの制限）
- Misskeyのフォーク（Calckey、Firefish、Sharkey等）は一部APIが異なる場合がある

### トラブルシューティング
1. **CORSエラー（ブラウザ）**: プロキシサーバーの使用を検討
2. **SSL証明書エラー**: インスタンスのSSL設定を確認
3. **データが取得できない**: インスタンスの公開設定・ノートの公開範囲を確認
4. **リモートユーザーが取得できない**: インスタンスがそのユーザーを連合済みかどうかを確認

---

# Part 2: 認証を行い、非公開ノートを含めて取得する

## 8. 認証の概要

Misskeyでは、認証（アクセストークン）を使うことで以下が可能になります。

- 公開範囲 `home`（ホームのみ公開）のノートを取得
- 公開範囲 `followers`（フォロワー限定）のノートを取得（フォローしている場合）
- 自分のホームタイムラインを取得（フォローしているユーザー全員の投稿）
- その他、認証が必要なエンドポイント全般

### アクセストークンの取得方法（3種類）

| 方法 | 対象用途 | 必要バージョン |
|------|---------|---------------|
| **手動発行** | 自分自身のアカウント専用スクリプト | 全バージョン |
| **MiAuth** | 他ユーザーへのアプリ認可 | v12.27.0以降 |
| **OAuth 2.0** | 他ユーザーへのアプリ認可（標準方式） | v2023.9.0以降 |

---

## 9. 方法1: アクセストークンを手動で発行する（自分用）

自分のアカウント専用のスクリプトやツールを作る場合に最もシンプルな方法です。

### 手順

1. Misskeyにログインした状態で、**設定 → API** を開く
2. 「アクセストークンを発行する」から必要な権限を選択してトークンを発行
3. 表示されたトークンを安全な場所に保存する（**再表示不可**）

> **注意**: トークンは絶対に他人に公開しないこと。ソースコードに直接埋め込む場合は、環境変数やシークレット管理ツールを使用すること。

---

## 10. 方法2: MiAuth（アプリとしてユーザー認証）

アプリを登録せずにUUIDベースのセッションでトークンを取得できるMisskey独自の方式です（v12.27.0以降）。

### フロー概要

```
アプリ → セッションID生成（UUID）
       → ユーザーをブラウザで認証ページへ誘導
       → ユーザーが許可
       → アプリがトークンを取得
```

### Step 1: セッションIDの生成

毎回新しいUUIDを生成します（使い回し禁止）。

```javascript
const sessionId = crypto.randomUUID();
```

### Step 2: ユーザーを認証ページへ誘導

以下のURLをブラウザで開かせます。

```
https://{インスタンスのホスト}/miauth/{sessionId}?name={アプリ名}&callback={コールバックURL}&permission={権限リスト}
```

| パラメータ | 説明 |
|-----------|------|
| `name` | アプリの名前（ユーザーに表示される） |
| `icon` | アプリのアイコン画像URL（任意） |
| `callback` | 認証後のリダイレクト先URL（任意） |
| `permission` | 要求する権限をカンマ区切りで指定 |

```
# 例
https://misskey.io/miauth/c1f6d42b-468b-4fd2-8274-e58abdedef6f?name=MyApp&callback=https%3A%2F%2Fmyapp.example.com%2Fcallback&permission=read:account
```

### Step 3: アクセストークンの取得

ユーザーが認証を許可したら、以下にPOSTリクエストを送りトークンを取得します。

```bash
curl -X POST "https://{host}/api/miauth/{sessionId}/check"
```

#### レスポンス例
```json
{
  "token": "YOUR_ACCESS_TOKEN_HERE",
  "user": {
    "id": "8wm5exampleid",
    "name": "ユーザー名",
    "username": "username"
  }
}
```

---

## 11. 方法3: OAuth 2.0 + IndieAuth（標準方式）

標準的なOAuth 2.0にIndieAuth拡張を組み合わせた方式です（v2023.9.0以降）。Webページが必要で、より複雑ですが広く使われているOAuthライブラリが利用できます。

### フロー概要

```
アプリ紹介ページを用意（HTTPS必須）
→ PKCE用の code_verifier / code_challenge を生成
→ サーバーの認証エンドポイントを取得
→ ユーザーを認証ページへ誘導
→ リダイレクトで認証コードを受け取る
→ 認証コードをアクセストークンに交換
```

### Step 1: アプリ紹介ページの準備

HTTPS対応のWebページにHTMLを記述します。

```html
<!-- リダイレクト先（必須） -->
<link rel="redirect_uri" href="https://myapp.example.com/callback">

<div class="h-app">
  <img src="/logo.png" class="u-logo">
  <a href="https://myapp.example.com/" class="u-url p-name">My Misskey App</a>
</div>
```

### Step 2: PKCE文字列と state の生成

```javascript
import crypto from "node:crypto";

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
const codeVerifier = Array.from(
    { length: 128 },
    () => chars[Math.floor(Math.random() * chars.length)]
).join("");

const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier, "ascii")
    .digest("base64url");

const state = crypto.randomUUID();
```

### Step 3: サーバーの認証エンドポイントを取得

```bash
curl "https://{host}/.well-known/oauth-authorization-server"
```

レスポンスの `authorization_endpoint` と `token_endpoint` を使用します。

### Step 4: ユーザーを認証ページへ誘導

```
{authorization_endpoint}?client_id={アプリ紹介ページURL}&response_type=code&redirect_uri={リダイレクトURI}&scope={権限}&code_challenge={code_challenge}&code_challenge_method=S256&state={state}
```

### Step 5: 認証コードの受け取り

ユーザーが認可後、`redirect_uri` にリダイレクトされます。

```
https://myapp.example.com/callback?code=AUTH_CODE_HERE&state=...
```

`state` が一致することを確認してから次のステップへ。

### Step 6: アクセストークンの取得

```javascript
const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: "https://myapp.example.com/",
        redirect_uri: "https://myapp.example.com/callback",
        scope: "read:account",
        code: "AUTH_CODE_HERE",
        code_verifier: codeVerifier
    })
});

const { access_token } = await res.json();
```

---

## 12. アクセストークンを使ったAPIリクエスト

トークン取得後は、全てのAPIリクエストに認証情報を含めます。方法は2種類あります。

### 方法A: JSONボディの `i` パラメータ（推奨）

```bash
curl -X POST "https://misskey.io/api/notes/timeline" \
  -H "Content-Type: application/json" \
  -d '{
    "i": "YOUR_ACCESS_TOKEN",
    "limit": 10
  }'
```

### 方法B: `Authorization` ヘッダー

```bash
curl -X POST "https://misskey.io/api/notes/timeline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"limit": 10}'
```

---

## 13. 認証後に使えるエンドポイント

### ホームタイムラインの取得

フォローしているユーザーの全ノートを取得します。`home`・`followers` 公開範囲のノートも含まれます。

#### エンドポイント
```
POST /api/notes/timeline
```

**必要な権限**: `read:account`

#### パラメータ

| パラメータ | 型 | 説明 | デフォルト |
|-----------|----|----|-----------|
| `i` | String (必須) | アクセストークン | — |
| `limit` | Integer | 取得件数（最大100） | 10 |
| `sinceId` | String | このIDより新しいノートを返す | なし |
| `untilId` | String | このIDより古いノートを返す | なし |
| `sinceDate` | Integer | この日時（Unixタイムスタンプ ms）以降 | なし |
| `untilDate` | Integer | この日時（Unixタイムスタンプ ms）以前 | なし |
| `withRenotes` | Boolean | リノートを含める | true |
| `withFiles` | Boolean | ファイル添付のあるノートのみ | false |
| `includeMyRenotes` | Boolean | 自分のリノートを含める | true |
| `includeRenotedMyNotes` | Boolean | 自分のノートへのリノートを含める | true |
| `includeLocalRenotes` | Boolean | ローカルユーザーのリノートを含める | true |
| `allowPartial` | Boolean | 部分的な結果を許可 | false |

#### リクエスト例
```bash
# ホームタイムラインを10件取得
curl -X POST "https://misskey.io/api/notes/timeline" \
  -H "Content-Type: application/json" \
  -d '{"i": "YOUR_ACCESS_TOKEN", "limit": 10}'

# リノートを除外してファイル付きノートのみ取得
curl -X POST "https://misskey.io/api/notes/timeline" \
  -H "Content-Type: application/json" \
  -d '{"i": "YOUR_ACCESS_TOKEN", "withRenotes": false, "withFiles": true, "limit": 10}'

# ページネーション（特定IDより古いノートを取得）
curl -X POST "https://misskey.io/api/notes/timeline" \
  -H "Content-Type: application/json" \
  -d '{"i": "YOUR_ACCESS_TOKEN", "untilId": "9xx0examplenoteid", "limit": 10}'
```

### 認証付きでユーザーの全ノートを取得

`users/notes` に認証トークンを追加すると、**自分のアカウントの場合**は `home` ・`followers` 公開範囲のノートも取得できます。

```bash
curl -X POST "https://misskey.io/api/users/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "i": "YOUR_ACCESS_TOKEN",
    "userId": "YOUR_USER_ID",
    "limit": 20,
    "withReplies": true,
    "withRenotes": true
  }'
```

---

## 14. ノートの公開範囲（visibility）について

認証後に取得できるノートの `visibility` フィールドの値は以下の4種類です。

| visibility 値 | 説明 | 認証なしで取得可能か |
|--------------|------|------------------|
| `public` | 全体公開 | ✓ |
| `home` | ホームのみ公開（TLには流れないが誰でも閲覧可） | ✓（URLがわかれば直接閲覧可、TLには不可） |
| `followers` | フォロワー限定 | ✗（フォローしていればTLで取得可能） |
| `specified` | ダイレクト（指定ユーザーのみ） | ✗ |

> **注意**: `users/notes` では、**他人**のアカウントを指定した場合は認証があっても `public` ノートのみ返ります。`followers` のノートはホームタイムライン（`notes/timeline`）経由でのみ取得できます。

---

## 15. 必要な権限（パーミッション）一覧

アクセストークン発行時に指定する主要な権限です。

| 権限名 | 説明 |
|--------|------|
| `read:account` | アカウント情報・ホームタイムラインの読み取り |
| `read:notifications` | 通知の読み取り |
| `read:drive` | ドライブファイルの読み取り |
| `read:favorites` | ブックマークの読み取り |
| `write:notes` | ノートの投稿・削除 |
| `write:reactions` | リアクションの追加・削除 |
| `write:following` | フォロー・アンフォロー |
| `write:drive` | ドライブへのファイルアップロード |

> 権限は必要最小限のみ要求することを推奨します。完全なリストは [Misskeyの権限ドキュメント](https://misskey-hub.net/en/docs/for-developers/api/permission/) を参照してください。

---

## 16. 認証付きリクエストのJavaScript実装例

```javascript
class MisskeyAuthenticatedAPI {
    constructor(instanceUrl, accessToken) {
        this.instanceUrl = instanceUrl.replace(/\/$/, '');
        this.accessToken = accessToken;
    }

    async _post(endpoint, body = {}) {
        try {
            const response = await fetch(`${this.instanceUrl}/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ i: this.accessToken, ...body })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`${err.error?.code}: ${err.error?.message}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`リクエストエラー (${endpoint}):`, error);
            return null;
        }
    }

    async getHomeTimeline(options = {}) {
        return this._post('notes/timeline', {
            limit: options.limit ?? 10,
            withRenotes: options.withRenotes ?? true,
            withFiles: options.withFiles ?? false,
            ...(options.untilId && { untilId: options.untilId }),
            ...(options.sinceId && { sinceId: options.sinceId }),
        });
    }

    async getMyNotes(userId, options = {}) {
        return this._post('users/notes', {
            userId,
            limit: options.limit ?? 10,
            withReplies: options.withReplies ?? false,
            withRenotes: options.withRenotes ?? true,
            ...(options.untilId && { untilId: options.untilId }),
        });
    }
}

// 使用例
async function example() {
    const api = new MisskeyAuthenticatedAPI('https://misskey.io', 'YOUR_ACCESS_TOKEN');

    const timeline = await api.getHomeTimeline({ limit: 20, withRenotes: false });

    if (timeline) {
        timeline.forEach(note => {
            const text = note.text ?? '（テキストなし）';
            const visibility = note.visibility;
            console.log(`[${visibility}] ${note.createdAt}: ${text.slice(0, 80)}`);
        });
    }
}
```

このドキュメントを参考に、Misskey APIを使用して公開・非公開を問わず自分のノートを効率的に取得できます。
