# 雑記ページ生成スクリプト

このディレクトリには、雑記ページを自動生成するためのPythonスクリプトが含まれています。

## 📁 ファイル構成

```
scripts/
├── build_month.py              # 月別ページ生成スクリプト
├── build_year.py               # 年別ページ生成スクリプト
├── build_all.py                # 一括生成スクリプト ★NEW!
├── build_utils.py              # 共通ユーティリティモジュール
├── build_month_config.yaml     # 設定ファイル（サンプル）
├── build_month_config.yaml.example  # 詳細な説明付き設定ファイル
├── BUILD_MONTH_README.md       # 月別ページスクリプトの詳細ドキュメント
├── BUILD_YEAR_README.md        # 年別ページスクリプトの詳細ドキュメント
├── BUILD_ALL_README.md         # 一括生成スクリプトの詳細ドキュメント ★NEW!
├── build_tags.py               # タグページ生成スクリプト（既存）
└── build_tags_config.yaml      # タグページ用設定ファイル（既存）
```

## 🚀 クイックスタート

### 1. 環境準備

```bash
pip install beautifulsoup4 pyyaml
```

### 2. 月別ページの生成

```bash
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days
```

### 3. 年別ページの生成

```bash
python build_year.py 2025 D:\web\100percent-health\txt\zakki
```

### 4. 複数月の一括生成 ★NEW!

```bash
# 2025年の全月を一括生成
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki

# 年別ページも同時に生成
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki --with-year
```

## 📚 詳細ドキュメント

- **[BUILD_MONTH_README.md](./BUILD_MONTH_README.md)** - 月別ページ生成の詳細
- **[BUILD_YEAR_README.md](./BUILD_YEAR_README.md)** - 年別ページ生成の詳細
- **[BUILD_ALL_README.md](./BUILD_ALL_README.md)** - 一括生成の詳細 ★NEW!

## 🔧 主な機能

### build_month.py
- 日別の雑記を統合して月別ページを生成
- 記事の省略処理（文字数・要素数の制御）
- 並び順制御（新しい順/古い順）
- 前後月への自動ナビゲーション

### build_year.py ★NEW!
- 月別ページを統合して年別ページを生成
- カレンダー風の月別目次
- 年間統計情報（総記事数、投稿月数）
- 前後年への自動ナビゲーション

### build_all.py ★NEW!
- 複数月を一括生成
- 年の全月を一括生成
- 範囲指定での生成
- 進捗表示とエラーハンドリング
- 年別ページの同時生成

### build_utils.py
- 設定ファイルの読み込み
- バックアップ機能
- ディレクトリ探索機能
- HTMLテンプレート生成

## 🎨 推奨ワークフロー

### パターン1: 毎月の更新（単一月）

```bash
# 今月だけ生成
python build_month.py 2025 12 ./txt/zakki/2025/12/days

# 年別ページを更新
python build_year.py 2025 ./txt/zakki
```

### パターン2: 年初めの一括生成

```bash
# 前年の全月 + 年別ページを一括生成
python build_all.py --year 2025 ./txt/zakki --with-year
```

### パターン3: 複数月の更新

```bash
# 最近の3ヶ月を一括更新
python build_all.py --months 2025-10,2025-11,2025-12 ./txt/zakki

# その後、年別ページを更新
python build_year.py 2025 ./txt/zakki
```

## ⚙️ 設定のカスタマイズ

設定ファイル（`build_month_config.yaml`）で以下をカスタマイズ可能：

- 記事の並び順（新しい順/古い順）
- 省略処理のパラメータ（文字数、要素数など）
- デバッグモードの有効化
- バックアップの有効/無効

```bash
# 設定ファイルを使用
python build_month.py 2025 12 ./txt/zakki/2025/12/days --config build_month_config.yaml
python build_year.py 2025 ./txt/zakki --config build_month_config.yaml
```

## 🆕 更新情報

### v3.0.0 (2025-12-25)
- ✨ **一括生成スクリプトを追加**（`build_all.py`）
- ✨ 複数月の一括生成機能
- ✨ 年単位での一括生成機能
- ✨ 進捗表示とエラーハンドリング
- 🐛 月別ページの `class="daily-article"` が確実に付与されるよう修正

### v2.1.0 (2025-12-25)
- ✨ **年別ページ生成機能を追加**（`build_year.py`）
- ✨ **共通モジュールを作成**（`build_utils.py`）
- ♻️ `build_month.py` をリファクタリング（共通モジュール使用）
- 📝 ドキュメントを大幅に拡充

### v2.0.0 (2025-12-14)
- 記事の並び順制御機能
- 設定ファイルのサポート
- コマンドライン引数の拡張
- バックアップ機能

## 📄 ライセンス

個人利用を目的としています。

## 🔗 関連リンク

- [100%health](https://100health.neocities.org/)
- [雑記ページ](https://100health.neocities.org/txt/txt_main.html)

