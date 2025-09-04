# 🌍 Planet 100%health

[eniehack さんの Planet ページ](https://www.eniehack.net/~eniehack/planet/) を参考に作成した、複数のSNS投稿を集約表示するPlanetサイトです。

## 特徴

### 📊 データ集約
- 複数のRSSフィードを統合
- 時系列での統一表示
- 自動データ更新

### 🎨 Planet風デザイン
- Planet DebianやPlanet masakaのような日付別表示
- 投稿の概要表示
- レスポンシブ対応

### ⚙️ 設定管理
- ローカルストレージによる設定保存
- データソースの有効/無効切り替え
- RSS URLの動的設定

## ファイル構成

```
planet/
├── planet_main.html          # メインページ
├── planet-aggregator.js      # データ集約システム
├── planet-config.js          # 設定管理
├── planet-config.json        # デフォルト設定
└── README.md                 # このファイル
```

## 使用方法

### 1. 基本的な使用
`planet_main.html` にアクセスするだけで、設定済みのデータソースから投稿を表示します。

### 2. データソースの追加
以下のようなRSSフィードを追加できます：

- **GitHub**: `https://github.com/username.atom`
- **Fediverse**: `https://your-instance.example/@username.rss`
- **note**: `https://note.com/username/rss`
- **Zenn**: `https://zenn.dev/username/feed`
- **Qiita**: `https://qiita.com/username/feed.atom`
- **ブログ**: 独自のRSSフィード

### 3. 設定方法
1. ページ上の設定項目でデータソースを有効化
2. RSSのURLを入力
3. 「更新」ボタンで最新データを取得

## 対応データソース

### 現在実装済み
- ✅ 雑記帳（静的データ）
- ✅ 更新履歴RSS
- ✅ 外部RSSフィード

### 追加予定
- 🚧 JSON Feed対応
- 🚧 AtomPub対応
- 🚧 ActivityPub対応

## 技術仕様

### フロントエンド
- **HTML5/CSS3**: レスポンシブデザイン
- **JavaScript ES6+**: モジュール化されたアーキテクチャ
- **RSS解析**: DOMParserによるクライアントサイド処理

### データフォーマット
- **RSS 2.0**: 標準的なRSSフィード
- **Atom 1.0**: Atomフィードにも対応
- **JSON**: 設定ファイル形式

### ブラウザ対応
- モダンブラウザ（ES6+対応）
- CORS制限に配慮した設計

## カスタマイズ

### CSS変数
```css
:root {
  --accent-color: #ff6b9d;
  --text-color: #333;
  --link-color: #0066cc;
}
```

### 設定ファイル
`planet-config.json` を編集してデフォルト設定を変更可能：

```json
{
  "site": {
    "title": "planet 100%health",
    "maxPostsPerSource": 10,
    "autoRefreshInterval": 1800000
  }
}
```

## セキュリティ考慮事項

- XSS対策：HTMLエスケープ処理
- CORS制限：Same-Origin Policyに準拠
- ローカルストレージ：機密情報は保存しない

## ライセンス

このプロジェクトは 100%health の一部として公開されています。

## 参考資料

- [Planet Debian](https://planet.debian.org/)
- [eniehack さんの Planet ページ](https://www.eniehack.net/~eniehack/planet/)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom 1.0 Specification](https://datatracker.ietf.org/doc/html/rfc4287)

---

📝 最終更新: 2025年9月
