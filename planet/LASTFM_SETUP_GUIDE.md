# 🎵 Last.fm統合セットアップガイド

GitHub Actions + Neocitiesで安全にLast.fm scrobblesを表示する方法

## 📋 必要なもの

- **GitHubアカウント**（無料）
- **Last.fmアカウント**とAPIキー（無料）
- **NeocitiesアカウントとAPIキー**（無料）

## 🚀 セットアップ手順

### ステップ1: Last.fm APIキーを取得

1. [Last.fm API](https://www.last.fm/api)にアクセス
2. 「Get an API account」をクリック
3. アプリケーション情報を入力:
   - **Application name**: `My Personal Site Last.fm Integration`
   - **Application description**: `Personal website music integration`
   - **Application homepage**: あなたのNeocitiesサイトURL
4. **API Key**と**Shared Secret**を取得（API Keyのみ使用）

### ステップ2: Neocities APIキーを取得

1. [Neocities](https://neocities.org/)にログイン
2. 設定ページ → API → APIキーを生成
3. APIキーをコピー

### ステップ3: GitHubリポジトリを作成

1. GitHubで**プライベートリポジトリ**を作成
   - 名前: `lastfm-sync`（任意）
   - プライバシー: **Private**（重要）
2. リポジトリを作成

### ステップ4: GitHub Secretsを設定

リポジトリの設定で以下のSecretsを追加:

1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**で以下を**1つずつ**追加:

#### 追加手順（各Secretごとに実行）:
1. **New repository secret**をクリック
2. **Name**フィールドに下記のSecret名を**コピー&ペースト**
3. **Secret**フィールドに対応する値を入力
4. **Add secret**をクリック

| Secret名（正確に入力） | 値の例 | 説明 |
|----------|-----|------|
| `LASTFM_API_KEY` | `1234567890abcdef1234567890abcdef` | 32文字の英数字（Last.fm APIから取得） |
| `LASTFM_USERNAME` | `your_username` | あなたのLast.fmユーザー名（公開プロフィール名） |
| `NEOCITIES_API_KEY` | `abcd1234-5678-90ef-ghij-klmnopqrstuv` | Neocities APIキー（ダッシュ含む） |
| `NEOCITIES_SITENAME` | `mysite` | あなたのNeocitiesサイト名（例: mysite.neocities.org の場合は `mysite`） |

**⚠️ 重要**: Secret名は**大文字・小文字を区別**し、**スペースや日本語は使用不可**です。上記の通り正確に入力してください。

#### 📝 実際の入力例

**1つ目のSecret（Last.fm APIキー）:**
- **Name**: `LASTFM_API_KEY` （バッククォートなし）
- **Secret**: `あなたの実際のAPIキー` （例: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p）

**2つ目のSecret（Last.fmユーザー名）:**
- **Name**: `LASTFM_USERNAME` （バッククォートなし）
- **Secret**: `あなたのLast.fmユーザー名` （例: music_lover_2024）

**3つ目のSecret（Neocities APIキー）:**
- **Name**: `NEOCITIES_API_KEY` （バッククォートなし）
- **Secret**: `あなたのNeocities APIキー` （例: abc12345-6789-def0-1234-567890abcdef）

**4つ目のSecret（Neocitiesサイト名）:**
- **Name**: `NEOCITIES_SITENAME` （バッククォートなし）
- **Secret**: `あなたのサイト名` （例: mysite ※ .neocities.org は不要）

### ステップ5: GitHub Actionsワークフローを追加

#### 📁 GitHubでフォルダ・ファイルを作成する方法

1. **リポジトリのメインページ**で **Add file** → **Create new file** をクリック

2. **ファイル名の欄**に以下を入力：
   ```
   .github/workflows/lastfm-sync.yml
   ```
   ※ スラッシュ（/）を入力すると自動的にフォルダが作成されます

3. **ファイルの内容**に [lastfm-sync-workflow.yml](./lastfm-sync-workflow.yml) の内容をコピー&ペースト

4. **Commit new file** をクリック

#### 🖼️ 詳しい手順（画像で説明）

**手順1: Add fileをクリック**
```
リポジトリページ → 緑色の「Add file」ボタン → 「Create new file」
```

**手順2: ファイルパスを入力**
```
ファイル名欄: .github/workflows/lastfm-sync.yml
```
- `.github` と入力してスラッシュ（/）を入力
- `workflows` と入力してスラッシュ（/）を入力  
- `lastfm-sync.yml` と入力

**手順3: ファイル内容をペースト**
- 下の大きなテキストエリアに、ワークフローの内容をコピー&ペースト

**手順4: コミット**
- ページ下部の「Commit new file」をクリック

#### 📄 ワークフローファイルの内容

ファイル内容として以下をコピー&ペーストしてください：

```yaml
name: Last.fm Scrobbles Sync

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  sync-lastfm:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Fetch Last.fm data
        env:
          LASTFM_API_KEY: ${{ secrets.LASTFM_API_KEY }}
          LASTFM_USERNAME: ${{ secrets.LASTFM_USERNAME }}
        run: |
          curl -s "https://ws.audioscrobbler.com/2.0/?method=user.getRecentTracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&limit=20&extended=1" \
            -o lastfm-data.json
          
          if ! jq -e '.recenttracks' lastfm-data.json > /dev/null; then
            echo "Error: Invalid Last.fm API response"
            cat lastfm-data.json
            exit 1
          fi
          
          echo "✅ Last.fm data fetched successfully"
      
      - name: Upload to Neocities
        env:
          NEOCITIES_API_KEY: ${{ secrets.NEOCITIES_API_KEY }}
        run: |
          UPLOAD_RESULT=$(curl -s -X POST \
            -H "Authorization: Bearer ${NEOCITIES_API_KEY}" \
            -F "lastfm-data.json=@lastfm-data.json" \
            "https://neocities.org/api/upload")
          
          if echo "$UPLOAD_RESULT" | jq -e '.result == "success"' > /dev/null; then
            echo "✅ Successfully uploaded to Neocities"
          else
            echo "❌ Upload failed: $UPLOAD_RESULT"
            exit 1
          fi
```

**重要**: 上記のコードを**そのまま**コピー&ペーストしてください。インデント（スペース）も重要です。

### ステップ6: ワークフローをテスト

1. **Actions**タブで「Last.fm Scrobbles Sync」を確認
2. **Run workflow**で手動実行してテスト
3. 成功すると `lastfm-data.json` がNeocitiesにアップロードされます

### ステップ7: Planet Yuinoidで確認

1. Planet Yuinoidページを開く
2. 「更新」ボタンをクリック
3. Last.fmの音楽データが表示されることを確認

## ⚙️ 設定のカスタマイズ

### 実行間隔を変更

```yaml
# ワークフローファイルの cron 設定を変更
schedule:
  - cron: '*/15 * * * *'  # 15分ごと
  - cron: '0 * * * *'     # 1時間ごと
```

### 取得件数を変更

```yaml
# APIリクエストの limit パラメータを変更
curl "...&limit=30&..."  # 30件取得
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. 「JSONファイルが見つかりません」
- GitHub Actionsが実行されていない
- Neocitiesへのアップロードが失敗している
- APIキーが間違っている

**解決方法:**
- Actionsタブでワークフローログをチェック
- Secretsの値を再確認

#### 2. 「APIエラー」が表示される
- Last.fm APIキーが無効
- ユーザー名が間違っている
- プロフィールが非公開

**解決方法:**
- Last.fmプロフィールを公開に設定
- APIキーを再生成

#### 3. 「アップロードエラー」
- Neocities APIキーが無効
- サイト名が間違っている

**解決方法:**
- Neocities APIキーを再生成
- サイト名を正確に入力

## 📊 料金について

すべて**無料**で利用できます:

- **GitHub Actions**: パブリックリポジトリは無料、プライベートは月2,000分まで無料
- **Last.fm API**: 無料
- **Neocities**: 無料プランで十分

## 🔒 セキュリティ

- APIキーはGitHub Secretsで暗号化保存
- プライベートリポジトリでコードを管理
- APIキーがNeocitiesサイトに公開されることはありません

## 🎯 完成後の流れ

1. **30分ごと**にGitHub Actionsが実行
2. **Last.fm API**から最新のscrobblesを取得
3. **JSONファイル**として生成
4. **Neocities**に自動アップロード
5. **Planet Yuinoid**で表示

---

**注意**: セットアップには30分程度かかる場合があります。最初の同期が完了するまでお待ちください。
