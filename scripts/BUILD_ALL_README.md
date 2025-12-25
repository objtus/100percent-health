# 雑記ページ一括生成スクリプト

## 概要

複数の月別ページや年別ページを一括で生成するPythonスクリプトです。
`build_month.py` と `build_year.py` を内部で呼び出し、効率的に大量のページを生成できます。

## 主な機能

### 1. 年単位の一括生成 📅
- 指定した年の全ての月（記事がある月）を自動検出して生成
- 年別ページも同時に生成可能

### 2. 複数月の個別指定 🎯
- カンマ区切りで複数の月を指定して生成
- 異なる年の月も同時に指定可能

### 3. 範囲指定での生成 📊
- 開始月と終了月を指定して、その範囲の全月を生成
- 年をまたぐ範囲指定も可能

### 4. 進捗表示 📈
- 処理中の月と進捗状況をリアルタイム表示
- 成功・失敗・スキップを明確に表示

### 5. 柔軟なエラーハンドリング 🛡️
- デフォルトでエラー発生時も続行（`--stop-on-error` で停止可能）
- 最後にサマリーを表示

## 必要な環境

- Python 3.6以上
- BeautifulSoup4ライブラリ
- PyYAML ライブラリ
- `build_month.py` と `build_year.py`

## インストール

```bash
pip install beautifulsoup4 pyyaml
```

## 使い方

### 基本的な使い方

```bash
python build_all.py <モード指定> <zakkiディレクトリのルートパス> [オプション]
```

### モード1: 年単位での生成

```bash
# 2025年の全月を生成
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki

# 2025年の全月 + 年別ページを生成
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki --with-year
```

**出力例:**
```
============================================================
雑記ページ一括生成スクリプト
============================================================
Configuration:
  Sort order: desc
  Debug mode: False
  Create backup: True
  Continue on error: True
Found 9 month(s) with articles in 2025: 01, 02, 03, 05, 07, 08, 09, 10, 12

============================================================
Building 9 month page(s)...
============================================================

[1/9] Building 2025-01... ✓ SUCCESS (1 article(s))
[2/9] Building 2025-02... ✓ SUCCESS (1 article(s))
[3/9] Building 2025-03... ✓ SUCCESS (1 article(s))
[4/9] Building 2025-05... ✓ SUCCESS (1 article(s))
[5/9] Building 2025-07... ✓ SUCCESS (1 article(s))
[6/9] Building 2025-08... ✓ SUCCESS (1 article(s))
[7/9] Building 2025-09... ✓ SUCCESS (2 article(s))
[8/9] Building 2025-10... ✓ SUCCESS (1 article(s))
[9/9] Building 2025-12... ✓ SUCCESS (6 article(s))

============================================================
Building year page for 2025...
============================================================

✓ Year page generated successfully

============================================================
Summary:
============================================================
✓ Success: 9 page(s)
Total: 9 page(s)
============================================================
```

### モード2: 複数月の個別指定

```bash
# 特定の月を複数生成（カンマ区切り）
python build_all.py --months 2025-01,2025-03,2025-05 D:\web\100percent-health\txt\zakki

# 異なる年の月も指定可能
python build_all.py --months 2024-12,2025-01,2025-02 D:\web\100percent-health\txt\zakki
```

### モード3: 範囲指定での生成

```bash
# 2025年1月から6月まで
python build_all.py --range 2025-01 2025-06 D:\web\100percent-health\txt\zakki

# 年をまたぐ範囲も可能
python build_all.py --range 2024-11 2025-02 D:\web\100percent-health\txt\zakki
```

## コマンドライン引数

### 必須引数

| 引数 | 説明 |
|------|------|
| `zakki_root` | zakki ディレクトリのルートパス |

### モード指定（いずれか1つ必須）

| オプション | 説明 | 例 |
|-----------|------|-----|
| `--year YEAR` | 年を指定（その年の全月を生成） | `--year 2025` |
| `--months MONTHS` | 複数月を指定（カンマ区切り） | `--months 2025-01,2025-03,2025-05` |
| `--range START END` | 月の範囲を指定 | `--range 2025-01 2025-06` |

### オプション引数

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--with-year` | 年別ページも同時に生成（`--year`指定時のみ有効） | 生成しない |
| `--config PATH` | 設定ファイルのパス（YAML形式） | なし |
| `--sort-order [asc\|desc]` | 記事の並び順 | `desc` |
| `--debug` | デバッグモードを有効化 | `False` |
| `--no-backup` | バックアップを作成しない | バックアップを作成 |
| `--stop-on-error` | エラー発生時に処理を停止 | 続行 |

## 実行例

### 例1: 2025年を完全に生成

```bash
cd scripts
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki --with-year
```

**効果:**
- 2025年の全ての月別ページを生成
- 2025年の年別ページも生成

### 例2: 特定の月だけ更新

```bash
python build_all.py --months 2025-10,2025-11,2025-12 D:\web\100percent-health\txt\zakki
```

**効果:**
- 2025年10月、11月、12月の月別ページのみを生成

### 例3: 半年分を一括生成

```bash
python build_all.py --range 2025-01 2025-06 D:\web\100percent-health\txt\zakki
```

**効果:**
- 2025年1月から6月までの月別ページを生成

### 例4: デバッグモードで実行

```bash
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki --debug
```

**効果:**
- 詳細なログを出力しながら生成

## エラーハンドリング

### デフォルトの動作（続行モード）

エラーやスキップが発生しても、他の月の処理を続行します：

```
[1/5] Building 2025-01... ✓ SUCCESS (1 article(s))
[2/5] Building 2025-02... ✗ SKIPPED (days directory not found)
[3/5] Building 2025-03... ✓ SUCCESS (1 article(s))
[4/5] Building 2025-04... ✗ SKIPPED (no HTML files found)
[5/5] Building 2025-05... ✓ SUCCESS (1 article(s))

Summary:
✓ Success: 3 page(s)
✗ Failed/Skipped: 2 page(s)
Total: 5 page(s)
```

### 停止モード

`--stop-on-error` を指定すると、エラー発生時に即座に停止します：

```bash
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki --stop-on-error
```

## スキップされるケース

以下の場合、その月はスキップされます：

1. **days ディレクトリが存在しない**
   ```
   ✗ SKIPPED (days directory not found)
   ```

2. **HTMLファイルが存在しない**
   ```
   ✗ SKIPPED (no HTML files found)
   ```

## 設定ファイルの使用

`build_month_config.yaml` と同じ設定ファイルを使用できます：

```bash
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki --config build_month_config.yaml
```

## build_month.py / build_year.py との違い

| 機能 | build_month.py | build_year.py | build_all.py |
|------|---------------|---------------|--------------|
| 単一月の生成 | ✓ | - | ✓ |
| 複数月の生成 | - | - | ✓ |
| 年の全月を生成 | - | - | ✓ |
| 年別ページ生成 | - | ✓ | ✓ |
| 進捗表示 | - | - | ✓ |
| バッチ処理 | - | - | ✓ |
| エラー時も続行 | - | - | ✓ |

## ワークフロー例

### シナリオ1: 新しい年を開始

```bash
# まず月別ページを全て生成
python build_all.py --year 2026 D:\web\100percent-health\txt\zakki

# その後、年別ページを生成
python build_year.py 2026 D:\web\100percent-health\txt\zakki

# または一括で
python build_all.py --year 2026 D:\web\100percent-health\txt\zakki --with-year
```

### シナリオ2: 毎月の更新作業

```bash
# 当月だけ生成
python build_month.py 2025 12 D:\web\100percent-health\txt\zakki\2025\12\days

# 年別ページを更新
python build_year.py 2025 D:\web\100percent-health\txt\zakki
```

### シナリオ3: 全体を再生成

```bash
# 全ての年を再生成
python build_all.py --year 2024 D:\web\100percent-health\txt\zakki --with-year
python build_all.py --year 2025 D:\web\100percent-health\txt\zakki --with-year
python build_all.py --year 2026 D:\web\100percent-health\txt\zakki --with-year
```

## トラブルシューティング

### `Invalid month format` エラー

```
✗ Fatal error: Invalid month format: 2025/01. Use YYYY-MM format (e.g., 2025-01)
```

**解決方法:** 月の形式は `YYYY-MM` を使用してください（スラッシュではなくハイフン）

### `Start month must be before or equal to end month` エラー

```
✗ Fatal error: Start month (2025-06) must be before or equal to end month (2025-01)
```

**解決方法:** `--range` では開始月が終了月より前である必要があります

### すべての月がスキップされる

**原因:** days ディレクトリが存在しないか、HTMLファイルがない

**解決方法:** 
1. days ディレクトリのパスを確認
2. 日別HTMLファイルが存在するか確認

## 更新履歴

### v1.0.0 (2025-12-25) 🎉
- 初回リリース
- 年単位での一括生成機能
- 複数月の個別指定機能
- 範囲指定での生成機能
- 進捗表示とエラーハンドリング
- 年別ページの同時生成機能

## ライセンス

このスクリプトは個人利用を目的としています。

## 関連ドキュメント

- **[BUILD_MONTH_README.md](./BUILD_MONTH_README.md)** - 月別ページ生成スクリプトの説明
- **[BUILD_YEAR_README.md](./BUILD_YEAR_README.md)** - 年別ページ生成スクリプトの説明
- **[README.md](./README.md)** - scripts フォルダ全体の概要
- **[build_month_config.yaml](./build_month_config.yaml)** - 設定ファイルのサンプル

