# 月別雑記ページ生成スクリプト

## 概要

日別の雑記HTMLファイルを読み込んで、月別の統合ページを自動生成するPythonスクリプトです。
JavaScriptの `BalancedArticleProcessor` と同等の高度な省略処理を実装しており、文字数・要素数のバランスを考慮した最適な省略表示を生成します。

## 主な機能

### 1. 記事の並び順制御（NEW! v2.1.0）
- **新しい順（デフォルト）**: 最新の記事が上に表示
- **古い順**: 古い記事から時系列順に表示
- コマンドライン引数または設定ファイルで制御可能

### 2. 高度な省略処理（JavaScript版と完全同等）
- **文字数ベースの制御**: デフォルト300文字まで（カスタマイズ可能）
- **要素数の範囲制御**: 最小2個、最大6個
- **段落の自動切り詰め**: 120文字を超える段落は `<span class="ellipsis">...</span>` で省略
- **リストの項目数制限**: 3項目まで表示、残りは「他N項目」で表示
- **全要素をフラット化**: sectionタグを無視して全要素を統一的に処理
- **iframe/画像のサポート**: 埋め込みコンテンツや画像を表示（文字数カウント0）

### 3. 柔軟な設定管理（NEW! v2.1.0）
- **設定ファイルサポート**: YAML形式でデフォルト値を管理
- **コマンドライン引数**: 一時的な設定変更が可能
- **優先順位**: コマンドライン引数 > 設定ファイル > デフォルト値

### 4. スマートなナビゲーション
- **実在する前後月を自動検出**: 最大24ヶ月前後まで探索（カスタマイズ可能）
- **年をまたぐリンクに対応**: 相対パスを自動調整
- **存在しない月は非表示**: `visibility: hidden` で処理

### 5. バックアップ機能（NEW! v2.1.0）
- 既存ファイルを上書きする前に自動的に `.bak` ファイルを作成
- `--no-backup` フラグで無効化可能

### 6. 既存スタイルとの互換性
- `.article-preview` クラスを使用
- `.article-ellipsis` と `.read-more-link` を自動生成
- 既存のCSSがそのまま適用可能

## 必要な環境

- Python 3.6以上
- BeautifulSoup4ライブラリ
- PyYAML ライブラリ（設定ファイルを使用する場合）

## インストール

```bash
pip install beautifulsoup4 pyyaml
```

## 使い方

### 基本的な使い方

```bash
python build_month.py <年> <月> <日別HTMLが入っているディレクトリ> [オプション]
```

### 実行例

```bash
# /scripts ディレクトリで実行
cd /scripts
```

```bash
# 2025年12月のページを生成（デフォルト: 新しい順）
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days

# 相対パスでも可
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days

# 古い順で生成
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days --sort-order asc

# デバッグモードで実行
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days --debug

# デフォルト設定ファイルを使用
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days --config build_month_config.yaml

# カスタム設定ファイルを使用
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days --config custom_config.yaml

# 複数のオプションを組み合わせ
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days --sort-order asc --max-chars 500 --debug
```

### コマンドライン引数

#### 必須引数
- `year`: 年（例: 2025）
- `month`: 月（例: 12）
- `days_dir`: 日別HTMLファイルのディレクトリパス

#### オプション引数

| オプション | 短縮形 | 説明 | デフォルト値 |
|-----------|--------|------|-------------|
| `--config` | `-c` | 設定ファイルのパス（YAML形式） | なし（デフォルト設定を使用） |
| `--sort-order` | | 記事の並び順（`asc`: 古い順, `desc`: 新しい順） | `desc` |
| `--debug` | | デバッグモードを有効化（詳細なログを出力） | `False` |
| `--no-backup` | | バックアップを作成しない | バックアップを作成 |
| `--max-chars` | | 最大文字数 | `300` |
| `--min-elements` | | 最小要素数 | `2` |
| `--max-elements` | | 最大要素数 | `6` |
| `--text-truncate-length` | | 段落の切り詰め文字数 | `120` |
| `--max-list-items` | | リストの最大項目数 | `3` |

### 設定ファイルの使用

設定ファイル（YAML形式）でデフォルトの動作をカスタマイズできます。

**設定ファイルの例（`build_month_config.yaml`）:**

```yaml
# 記事の並び順
sort_order: "desc"  # "desc": 新しい順, "asc": 古い順

# 省略処理の設定
truncate:
  max_chars: 300
  min_elements: 2
  max_elements: 6
  text_truncate_length: 120
  max_list_items: 3
  list_item_estimate: 25

# デバッグモード
debug: false

# バックアップの作成
create_backup: true

# 前後月の探索範囲
adjacent_month_search_range: 24
```

**設定ファイルの使い方:**

```bash
# デフォルトの設定ファイル（build_month_config.yaml）を作成してスクリプトと同じディレクトリに配置
python build_month.py 2025 12 ./txt/zakki/2025/12/days --config build_month_config.yaml

# カスタム設定ファイルを使用
python build_month.py 2025 12 ./txt/zakki/2025/12/days --config my_custom_config.yaml
```

**注意:** コマンドライン引数は設定ファイルの値を上書きします。

### 出力

- **入力**: `txt/zakki/2025/12/days/` 内の全HTMLファイル
- **出力**: `txt/zakki/2025/12/2025-12.html`（日別HTMLの親ディレクトリに生成）

## 処理の流れ

1. 指定されたディレクトリ内の全HTMLファイルを検索（日付順）
2. 各ファイルから `<article>` 要素を抽出
3. **高度な省略処理を適用**:
   - 全要素をフラット化（見出し、段落、リスト、iframe等）
   - 文字数・要素数をカウントしながら最適な省略
   - 段落の自動切り詰め、リストの項目数制限
4. 実在する前後月を検出してナビゲーションリンクを生成
5. 月別HTMLテンプレートに埋め込んでファイルに書き出し

## 省略処理の詳細

### 対応要素

| 要素 | 処理内容 | 文字数カウント |
|------|----------|----------------|
| 見出し（H1-H6） | そのまま表示 | 実際の文字数 |
| 段落（P） | 120文字超過時は切り詰め + `...` | 実際の文字数（最大120） |
| リスト（UL/OL） | 3項目まで表示、残りは「他N項目」 | 項目数 × 25 |
| 引用（BLOCKQUOTE） | 120文字超過時は切り詰め + `...` | 実際の文字数（最大120） |
| iframe | そのまま表示 | **0文字** |
| 画像（IMG） | そのまま表示 | **0文字** |
| 区切り（HR/BR） | そのまま表示 | 0文字 |

### 省略例

**元の段落（220文字）:**
```
一ヶ月に3回も雑記を書くのは2024年07月ぶりでは？ いいね～。......と思っていたのだが、書いてる途中で飽きてしまって、寝たら日付が変わってしまった。残念。でもまあ、書けただけ良しとしよう。最近は文章を書く習慣が戻ってきた気がする。これは良い傾向だ。
```

**省略後（120文字）:**
```
一ヶ月に3回も雑記を書くのは2024年07月ぶりでは？ いいね～。......と思っていたのだが、書いてる途中で飽きてしまって、寝たら日付が変わってし<span class="ellipsis">...</span>
```

**元のリスト（6項目）:**
```html
<ul>
  <li>項目1</li>
  <li>項目2</li>
  <li>項目3</li>
  <li>項目4</li>
  <li>項目5</li>
  <li>項目6</li>
</ul>
```

**省略後（3項目 + 省略表示）:**
```html
<ul>
  <li>項目1</li>
  <li>項目2</li>
  <li>項目3</li>
  <li class="list-ellipsis" style="font-style: italic; color: #666;">
    <em>... (他3項目)</em>
  </li>
</ul>
```

## 出力されるHTML構造

```html
<article class="daily-article" id="251212">
  <h3><a href="/txt/zakki/2025/12/days/2025-12-12.html">2025-12-12</a></h3>
  <div class="article-preview">
    <h4>今回の主題</h4>
    <iframe src="https://adventar.org/calendars/11303/embed" ...></iframe>
    <p>「えとねるん Advent Calendar 2025」の10日目の記事です。...こんにちは。yuinoidです。...<span class="ellipsis">...</span></p>
    <h4>年表と今回の更新</h4>
    <p>わたしは「分散SNS関連年表」という年表を2022年に公開し、...<span class="ellipsis">...</span></p>
    <h4>システムの変更</h4>
    <p class="article-ellipsis">
      <a href="/txt/zakki/2025/12/days/2025-12-12.html" class="read-more-link">続きを読む / <span lang="en">read more</span></a>
    </p>
  </div>
</article>
```

### 特徴
- `<section>` タグは削除され、中身が `.article-preview` に直接配置
- 「続きを読む」リンクは `.article-preview` の**中**に配置
- JavaScriptによる非同期読み込みは不要
- ページを開いた瞬間に全記事が表示される

## ナビゲーション機能

### 実在する月の検出

11月の記事がない場合でも、10月と12月のリンクが正しく生成されます：

```html
<!-- 2025-12.html のナビゲーション -->
<a class="leftarrow" href="../10/2025-10.html">&lt;</a>  <!-- 11月をスキップ -->
<a class="uparrow" href="../2025.html">&lt;&lt;</a>
<a class="rightarrow" href="../../2026/01/2026-01.html">&gt;</a>  <!-- 年をまたぐ -->
```

### 年をまたぐリンク

- **同じ年内**: `../月/` 形式（例: `../10/2025-10.html`）
- **年をまたぐ**: `../../年/月/` 形式（例: `../../2026/01/2026-01.html`）

## 設定のカスタマイズ

### 設定ファイル（推奨）

設定ファイル（`build_month_config.yaml`）を使用すると、毎回コマンドライン引数を入力する必要がなくなります。

```yaml
# 記事の並び順（"desc": 新しい順, "asc": 古い順）
sort_order: "desc"

# 省略処理の設定
truncate:
  max_chars: 300           # 最大文字数
  min_elements: 2          # 最小要素数
  max_elements: 6          # 最大要素数
  text_truncate_length: 120 # 段落の切り詰め文字数
  max_list_items: 3        # リストの最大項目数
  list_item_estimate: 25   # リスト1項目あたりの推定文字数

# デバッグモード
debug: false

# バックアップの作成
create_backup: true

# 前後月の探索範囲
adjacent_month_search_range: 24
```

### コマンドライン引数（一時的な変更）

コマンドライン引数を使用すると、設定ファイルの値を一時的に上書きできます。

```bash
# 並び順を一時的に変更
python build_month.py 2025 12 ./txt/zakki/2025/12/days --sort-order asc

# 最大文字数を増やす
python build_month.py 2025 12 ./txt/zakki/2025/12/days --max-chars 500

# 複数の設定を同時に変更
python build_month.py 2025 12 ./txt/zakki/2025/12/days --sort-order asc --max-chars 500 --max-elements 8
```

### 優先順位

設定の優先順位は以下の通りです（上が優先）:

1. **コマンドライン引数**（最優先）
2. **設定ファイル**（`--config` で指定）
3. **デフォルト値**（スクリプト内のハードコード値）

## デバッグモード

処理の詳細を確認したい場合は、スクリプト内で `debug: True` を設定します：

```
Found 15 elements to process
  Processed heading: h4 - "今回の主題" (5 chars)
  Processed iframe (0 chars)
  Truncated paragraph: 220 → 120 chars
  Processed heading: h4 - "年表と今回の更新" (8 chars)
  Truncated paragraph: 718 → 120 chars
  Processed heading: h4 - "システムの変更" (7 chars)
  Reached maximum elements (6), stopping
Preview completed: 6 elements, 260 chars
```

## 注意事項

### 既存ファイルの上書き

このスクリプトは既存の月別HTMLファイルを上書きします。
バックアップを取ってから実行することをお勧めします。

### 前提条件

- 日別HTMLファイルに `<article>` 要素が含まれている必要があります
- 記事には `id` 属性が必要です（例: `id="251212"`）
- `.article-body` クラスを持つ要素内に記事本文が含まれている必要があります
- ファイル名は日付順にソートされる想定です（例: `2025-12-06.html`, `2025-12-08.html`）

## JavaScript版との違い

### 同等の機能
- ✅ 文字数・要素数のバランス制御
- ✅ 段落の自動切り詰め（120文字）
- ✅ リストの項目数制限（3項目）
- ✅ sectionのフラット化
- ✅ デバッグモード

### 優れている点
- ✅ **サーバー側で事前生成**: ビルド時に一度だけ実行
- ✅ **JavaScriptなしで動作**: ページ表示が高速
- ✅ **SEO最適化**: 静的HTMLで全内容が即座に利用可能
- ✅ **スマートなナビゲーション**: 実在する月を自動検出
- ✅ **年をまたぐ対応**: 相対パスを自動調整

## トラブルシューティング

### `No HTML files found` と表示される
→ 指定したディレクトリパスが正しいか確認してください

### `No <article> found` という警告が出る
→ 該当の日別HTMLに `<article>` 要素が含まれていません

### 文字化けする
→ HTMLファイルがUTF-8エンコーディングで保存されているか確認してください

### リンク切れになる
→ 前後の月に日別HTMLが存在するか確認してください（スクリプトは自動的に存在する月を検出します）

## 今後の拡張予定

### Phase 1 - 完了 ✅
- [x] コマンドライン引数での設定カスタマイズ
- [x] 設定ファイル（YAML）のサポート
- [x] 記事の並び順制御（新しい順/古い順）
- [x] デバッグモードのコマンドライン制御
- [x] バックアップ機能

### Phase 2 - 高優先
- [ ] 年別ページの生成
- [ ] 複数月の一括処理（`--range` オプション）
- [ ] より詳細なエラーハンドリング
- [ ] プレビューモード（`--dry-run`）

### Phase 3 - 中優先
- [ ] 進捗バーの表示
- [ ] HTML/CSS のバリデーション
- [ ] 画像の最適化チェック

## ライセンス

このスクリプトは個人利用を目的としています。

## 関連ドキュメント

- **[BUILD_YEAR_README.md](./BUILD_YEAR_README.md)** - 年別ページ生成スクリプトの説明
- **[build_month_config.yaml](./build_month_config.yaml)** - 設定ファイルのサンプル
- **[build_utils.py](./build_utils.py)** - 共通ユーティリティモジュール

## ワークフロー例

月別ページと年別ページを両方生成する場合の推奨ワークフロー：

```bash
# 1. 各月の月別ページを生成
python build_month.py 2025 01 D:\web\100percent-health\txt\zakki\2025\01\days
python build_month.py 2025 02 D:\web\100percent-health\txt\zakki\2025\02\days
# ... 他の月

# 2. 年別ページを生成（全ての月を統合）
python build_year.py 2025 D:\web\100percent-health\txt\zakki
```

これで、月別ページと年別ページの両方が自動生成されます。

## 更新履歴

### v2.1.0 (2025-12-25) ✨
- **記事の並び順制御を追加**: `--sort-order` で新しい順/古い順を選択可能（デフォルト: 新しい順）
- **設定ファイルのサポート**: YAML形式の設定ファイルでデフォルト値をカスタマイズ可能
- **コマンドライン引数の拡張**: argparseによる柔軟な引数処理
- **バックアップ機能**: 既存ファイルを上書きする前に `.bak` ファイルを自動作成
- **デバッグモードの改善**: `--debug` フラグでコマンドラインから制御可能
- **省略処理のカスタマイズ**: `--max-chars`, `--max-elements` など各種パラメータを指定可能

### v2.0.0 (2025-12-14)
- JavaScriptと同等の高度な省略処理を実装
- 文字数・要素数のバランス制御
- 段落の自動切り詰め（120文字）
- リストの項目数制限（3項目 + 「他N項目」）
- iframe/画像のサポート（文字数カウント0）
- sectionタグの削除とフラット化
- デバッグモードの追加

### v1.1.0 (2025-12-14)
- 実在する前後月の自動検出機能を追加
- 年をまたぐリンクの相対パス対応
- 存在しない月の非表示処理

### v1.0.0 (2025-12-14)
- 初回リリース
- 基本的な月別ページ生成機能
- 記事全文を含む静的HTML生成