# 年別雑記ページ生成スクリプト

## 概要

月別の雑記HTMLファイルを読み込んで、年別の統合ページを自動生成するPythonスクリプトです。
`build_month.py` で生成された月別ページを使用して、1年分の記事を俯瞰できるページを作成します。

## 主な機能

### 1. 月別コンテンツの統合 📅
- 指定された年の全ての月を自動検出
- 各月の記事プレビューを統合表示
- 記事がない月は自動的にスキップ

### 2. 月の並び順制御 ⬆️⬇️
- **新しい順（デフォルト）**: 12月から1月へ
- **古い順**: 1月から12月へ
- コマンドライン引数または設定ファイルで制御可能

### 3. カレンダー風の月別目次 🗓️
- 12ヶ月全てを表示
- 記事がある月はリンク付き
- 記事数を表示
- 記事がない月はグレー表示

### 4. 年間統計情報 📊
- 総記事数
- 投稿月数
- 自動計算・表示

### 5. スマートなナビゲーション 🧭
- **前後年を自動検出**: 最大10年前後まで探索（カスタマイズ可能）
- **存在しない年は非表示**: `visibility: hidden` で処理
- 雑記トップへのリンク

### 6. 既存スタイルとの互換性 🎨
- 月別ページと同じ `.article-preview` クラスを使用
- 既存のCSSがそのまま適用可能
- `zakki-year.css` で年別ページ固有のスタイルを管理

## 必要な環境

- Python 3.6以上
- BeautifulSoup4ライブラリ
- PyYAML ライブラリ
- `build_month.py` で生成された月別HTMLファイル

## インストール

```bash
pip install beautifulsoup4 pyyaml
```

## 使い方

### 基本的な使い方

```bash
python build_year.py <年> <zakkiディレクトリのルートパス> [オプション]
```

### 実行例

```bash
# /scripts ディレクトリで実行
cd /scripts
```

```bash
# 2025年のページを生成（デフォルト: 新しい順）
python build_year.py 2025 D:\web\100percent-health\txt\zakki

# 相対パスでも可
python build_year.py 2025 ../txt/zakki

# 古い順で生成
python build_year.py 2025 ../txt/zakki --sort-order asc

# デバッグモードで実行
python build_year.py 2025 ../txt/zakki --debug

# カスタム設定ファイルを使用
python build_year.py 2025 ../txt/zakki --config build_pages_config.yaml
```

### コマンドライン引数

#### 必須引数
- `year`: 年（例: 2025）
- `zakki_root`: zakki ディレクトリのルートパス

#### オプション引数

| オプション | 短縮形 | 説明 | デフォルト値 |
|-----------|--------|------|-------------|
| `--config` | `-c` | 設定ファイルのパス（YAML形式） | なし |
| `--sort-order` | | 月の並び順（`asc`: 古い順, `desc`: 新しい順） | `desc` |
| `--debug` | | デバッグモードを有効化 | `False` |
| `--no-backup` | | バックアップを作成しない | バックアップを作成 |

### 設定ファイルの使用

`build_month_config.yaml` と同じ設定ファイルを共有できます。

**設定ファイルの例:**

```yaml
# 並び順（月別・年別で共通）
sort_order: "desc"

# 年別ページ用の設定
adjacent_year_search_range: 10  # 前後何年まで探すか

# その他の設定は build_month.py と共通
debug: false
create_backup: true
```

### 出力

- **入力**: `txt/zakki/2025/` 内の各月別HTMLファイル
- **出力**: `txt/zakki/2025/2025.html`

## 処理の流れ

1. 指定された年のディレクトリを確認
2. 年内の全ての月（記事がある月）を検索
3. 実在する前後の年を検出してナビゲーションリンクを生成
4. 各月のHTMLファイルから記事を抽出
5. 月別目次（カレンダー風）を生成
6. 年間統計情報を計算
7. 年別HTMLテンプレートに埋め込んでファイルに書き出し

## 出力されるHTML構造

```html
<main id="main">
  <h1>2025年の雑記帳</h1>
  
  <!-- 年間統計 -->
  <div class="year-stats">
    <p>総記事数: 23件 | 投稿月数: 9ヶ月</p>
  </div>
  
  <!-- ナビゲーション -->
  <nav class='arrow'>
    <div class='rowarrow'>
      <a class="leftarrow" href="../2024/2024.html">&lt; 2024</a>
      <a class="uparrow" href="/txt/txt_main.html">雑記トップ</a>
      <a class="rightarrow" href="../2026/2026.html">2026 &gt;</a>
    </div>
  </nav>
  
  <!-- 月別目次 -->
  <nav class="year-index">
    <a href="#month-12" class="month-link has-articles">12月 (6)</a>
    <span class="month-link no-articles">11月</span>
    <a href="#month-10" class="month-link has-articles">10月 (1)</a>
    <!-- ... 他の月 ... -->
  </nav>
  
  <!-- 月別コンテンツ -->
  <div class="year-content">
    <section class="month-section" id="month-12">
      <h2><a href="/txt/zakki/2025/12/2025-12.html">2025年12月</a></h2>
      <p class="month-info">6件の記事</p>
      
      <div class="month-articles">
        <article class="daily-article" id="251223">
          <!-- 月別ページと同じプレビュー表示 -->
        </article>
      </div>
    </section>
  </div>
</main>
```

### 特徴
- ハイブリッド構造：上部に目次、下部に詳細
- 月別ページと同じ記事プレビュー
- 記事がない月は目次でグレー表示
- ページ内アンカーリンクで特定の月にジャンプ可能

## CSSスタイリングの推奨

年別ページ用のCSSクラスを `zakki-year.css` に追加することを推奨します：

```css
/* 年間統計 */
.year-stats {
  text-align: center;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin: 1rem 0;
}

/* 月別目次（カレンダー風） */
.year-index {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
  margin: 2rem 0;
  padding: 1rem;
  background-color: #fafafa;
  border-radius: 8px;
}

.month-link {
  padding: 0.75rem;
  text-align: center;
  border-radius: 4px;
  display: block;
  transition: all 0.2s;
}

.month-link.has-articles {
  background-color: #4a90e2;
  color: white;
  text-decoration: none;
}

.month-link.has-articles:hover {
  background-color: #357abd;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.month-link.no-articles {
  background-color: #e0e0e0;
  color: #999;
}

/* 月別セクション */
.month-section {
  margin: 3rem 0;
  padding: 2rem 0;
  border-bottom: 2px solid #eee;
}

.month-section:last-child {
  border-bottom: none;
}

.month-section h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.month-info {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.month-articles {
  margin-top: 1rem;
}
```

## `build_month.py` との連携

1. **まず月別ページを生成**
   ```bash
   python build_month.py 2025 01 ./txt/zakki/2025/01/days
   python build_month.py 2025 02 ./txt/zakki/2025/02/days
   # ... 他の月
   ```

2. **次に年別ページを生成**
   ```bash
   python build_year.py 2025 ./txt/zakki
   ```

これで、年別ページに全ての月の記事プレビューが統合表示されます。

## 注意事項

### 前提条件

- 月別HTMLファイルが既に生成されている必要があります
- 月別HTMLファイルに `<div id="zakki{月}">` 要素が含まれている必要があります
- 記事には `.daily-article` クラスが必要です

### 既存ファイルの上書き

このスクリプトは既存の年別HTMLファイルを上書きします。
バックアップを取ってから実行することをお勧めします（デフォルトで自動バックアップ）。

## トラブルシューティング

### `Year directory not found` と表示される
→ zakki ディレクトリのパスが正しいか確認してください

### `No months with articles found` という警告が出る
→ 指定した年に記事がある月が存在しません。まず `build_month.py` で月別ページを生成してください

### 月別HTMLが見つからない
→ `build_month.py` を実行して月別ページを先に生成してください

### スタイルが適用されない
→ `zakki-year.css` ファイルが存在し、適切に読み込まれているか確認してください

## `build_month.py` との違い

| 項目 | build_month.py | build_year.py |
|------|---------------|---------------|
| 対象 | 1ヶ月分の日別記事 | 1年分の月別記事 |
| 入力 | days/*.html | {月}/*.html |
| 出力 | {年}-{月}.html | {年}.html |
| ナビゲーション | 前後月 | 前後年 |
| 統計情報 | 記事数 | 総記事数、投稿月数 |
| 目次 | なし | 12ヶ月の目次 |

## 更新履歴

### v1.0.0 (2025-12-25) 🎉
- 初回リリース
- 月別ページの統合機能
- カレンダー風の月別目次
- 年間統計情報の表示
- 前後年の自動検出
- 月の並び順制御（新しい順/古い順）
- 設定ファイルのサポート
- バックアップ機能

## ライセンス

このスクリプトは個人利用を目的としています。

## 関連ドキュメント

- [BUILD_MONTH_README.md](./BUILD_MONTH_README.md) - 月別ページ生成スクリプトの説明
- [build_month_config.yaml](./build_month_config.yaml) - 設定ファイルのサンプル

