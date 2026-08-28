# 分散SNS関連年表 JSON化＋編集ツール 計画

## 現状

- 正本: `/100percent-health/txt/my_dsns_timeline.html`
- 行数: 3,838行（本番）／ 986K
- イベント数: 1,614件
- 年数: 91年（1876年〜2025年）
- 開発用ファイル（753行・74K）は2025年12月で更新停止。本番が正本

## 目的

1. **JSON化** — HTMLのままではデータの取り回しが悪い。dsns_today_bot がスクレイピング不要になる
2. **HTMLはJSONから生成** — Neocities公開用HTMLはJSONを変換して作る
3. **時系列順** — JSONは年月日でソートされて並ぶ

---

## Phase 1: 変換スクリプト（HTML→JSON）

### 入力

`my_dsns_timeline.html`（本番ファイル）

### パースルール

#### 年ブロック
```
<div id="2024">
  <h2 class="year">2024年</h2>
  <ul>
    <li class="d sns">MM月DD日　本文...</li>
    ...
  </ul>
</div>
```

#### 各イベントの抽出

| フィールド | 抽出元 | 備考 |
|---|---|---|
| `year` | 親 `<div id="YYYY">` のid属性 | — |
| `date` | 本文先頭の `MM月DD日` または `??月??日` | 「??」はnull扱い |
| `date_approx` | 「頃」「末頃」「月頃」などの表記 | precisionフラグで管理 |
| `categories` | `<li class="...">` のクラス属性 | スペース区切りで複数 |
| `text` | `<li>` の中身（MM月DD日除去後） | HTML fragment のまま保持（str/str2/a/br含む） |
| `links` | text内の `<a href="...">` から抽出 | 任意フィールド |

#### 日付精度（precision）

| 値 | 意味 | 対象 | ソート順 |
|---|---|---|---|
| `exact` | MM月DD日が特定 | `03月15日` | 最優先 |
| `month` | 月まで特定 | `03月頃` | exactの次 |
| `year` | 年のみ | `??月??日` | 上記の次 |
| `approximate` | 曖昧 | `末頃` など | 月末扱い |

### 出力

```json
[
  {
    "id": "2024-03",
    "year": 2024,
    "date": { "month": 7, "day": 5, "precision": "exact" },
    "categories": ["d", "sns"],
    "text": "Misskey v2024.7.0 リリース。<span class=\"str\">ActivityPub対応</span>が強化され…",
    "links": ["https://..."],
    "source": "my_dsns_timeline.html"
  }
]
```

- 配列は year → month → day → precision の順でソート
- `id` は `{year}-{連番}`（HTMLの出現順を保持できるように）

### 全カテゴリ定義（28種）

| カテゴリ | 表示名 | 説明 |
|---|---|---|
| `d` | d-sns | 分散SNS関連（核） |
| `sns` | sns | SNS一般 |
| `web` | web | Web技術 |
| `network` | network | ネットワーク |
| `web3` | web3 | Web3関連 |
| `hacker` | hacker | ハッカー文化 |
| `tech` | tech | テクノロジー |
| `culture` | culture | 文化 |
| `law` | law | 法律 |
| `bbs` | BBS | 電子掲示板 |
| `site` | site | 特定サイト |
| `p2p` | P2P | P2P技術 |
| `crypto` | crypto | 暗号技術 |
| `book` | book | 書籍 |
| `incident` | incident | 事件 |
| `metaverse` | metaverse | メタバース |
| `mentalhealth` | mentalculture | メンタル文化 |
| `meme` | meme | ミーム |
| `pol` | pol | 政治 |
| `art` | art | アート |
| `fire` | flame | 炎上 |
| `tool` | tool | ツール |
| `etc` | etc | その他 |
| `draft` | draft | 下書き |
| `thought` | thought | 思想 |
| `math` | math | 数学 |
| `science` | science | 科学 |
| `logic` | logic | 論理学 |
| `war` | war | 戦争 |
| `acid` | acid | サイケデリック |
| `company` | company | 企業 |
| `software` | software | ソフトウェア |
| `hard` | hard | ハードウェア |
| `mail` | mail | メール |
| `protcol` | protocol | プロトコル |
| `ai` | ai | AI |
| `politics` | politics | 政治（polと重複） |
| `event` | event | イベント |
| `magazine` | magazine | 雑誌 |
| `computer` | computer | コンピュータ |
| `--gui` | gui | GUI |

※ 現状のHTMLクラスをそのまま反映。正規化は後で。

### HTMLタグの扱い

- **`<span class="str">` / `<span class="str2">` / `<span class="str3">`** — HTML fragment として保持。変換時に再現。強調度合いの区別は維持
- **`<a href="..." target="_blank">`** — 同左。別フィールド `links` にも抽出（任意）
- **`<br>`** — 改行として保持
- **`<span lang="...">`** — 言語タグとして保持

### 出力先

`/100percent-health/txt/my_dsns_timeline.json`

---

## Phase 2: 簡易エディタ

### 位置づけ

- 単一HTMLファイル（+JS）で動作するブラウザアプリ
- ローカルで開いて使う（サーバ不要）
- JSONファイルの読み込み・編集・保存を担当
- JSONが正本。HTMLはこのツールから生成（プレビュー＋エクスポート）

### 画面構成

#### 画面1: 一覧ビュー

- 全イベントを年別にグループ化（折りたためる）
- カテゴリ・年・月・テキストでフィルタ/検索
- 各行：年 | 日付 | カテゴリタグ | テキスト（1行） | [編集] [削除]

#### 画面2: 編集フォーム（新規追加／既存編集）

| 項目 | 型 | 説明 |
|---|---|---|
| 年 | number | 必須。西暦4桁 |
| 月 | number (1-12) or null | — |
| 日 | number (1-31) or null | — |
| 精度 | select | exact / month / year / approximate |
| カテゴリ | checkbox群 | 28種から選択。複数可 |
| テキスト | textarea | 本文。太字・リンクを簡易マークダウンかボタンで挿入 |
| リンク | text（繰り返し可） | URLのみ or 表示テキスト＋URL |

#### 画面3: プレビュー・エクスポート

- 現在のJSONからHTMLを生成してプレビュー表示
- 「HTMLにエクスポート」→ ファイル保存（Neocitiesに上げる用）
- 「JSONに保存」→ ファイル保存（正本）

### テキスト入力のUI

課題：HTML fragment（`<span class="str">`等）をどう入力させるか。

候補：
- **簡易マークダウン方式**：`**強調**` → `<span class="str">強調</span>`、`[リンク](url)` → `<a href="url">リンク</a>`
- **WYSIWYG**：contentEditable + execCommand（too much）
- **ボタン挿入**：テキスト選択→「強調」ボタンで `**` で囲む

**簡易マークダウン方式** が軽くて良さそう。

#### マークダウン→HTML変換ルール

| 入力 | 変換後 |
|---|---|
| `**テキスト**` | `<span class="str">テキスト</span>` |
| `*テキスト*` | `<span class="str2">テキスト</span>` |
| `[表示テキスト](https://...)` | `<a href="..." target="_blank">表示テキスト</a>` |
| 改行 | `<br>` |

### 技術スタック

- **1ファイル** HTML + CSS + JavaScript（Vanilla JS、フレームワークなし）
- JSONの読み書きは File API（`<input type="file">` + Blob download）
- CSSは最小限（プレビュー以外はフォームとして機能すれば十分）
- 保存先: `/100percent-health/tools/dsns-editor.html` など

---

## Phase 3: dsns_today_bot の参照先変更（任意）

- 現在: HTMLをスクレイピングして「今日はなんの日？」を取得
- 変更後: `my_dsns_timeline.json` を直接読み、月日が一致するイベントを抽出
- 変換スクリプト＋エディタが安定した後の話

---

## 依存関係・配置

```
100percent-health/
├── txt/
│   ├── my_dsns_timeline.html      ← 現行正本（編集は当面こちらでも可）
│   ├── my_dsns_timeline.json       ← Phase1で生成（将来の正本）
│   └── …
├── tools/
│   └── dsns-editor.html            ← Phase2で作成（簡易エディタ）
└── scripts/
    └── dsns_convert.py             ← Phase1 変換スクリプト
```

## 想定工数

| Phase | 内容 | 目安 |
|---|---|---|
| 1 | 変換スクリプト（Python） | 1〜2時間 |
| 2 | 簡易エディタ（HTML+JS） | 2〜4時間 |
| 3 | bot参照変更 | 30分〜1時間 |

## 未確定・後で決めること

- JSONのid付与ルール（連番方式 vs year-連番）
- カテゴリ名の正規化（`politics`と`pol`の統合等）
- テキスト入力の簡易マークダウン記法の詳細
- エディタの保存先指定（ダウンロード vs ローカルファイル直接書き込み）