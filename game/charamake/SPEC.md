# キャラクタークリエイター 仕様書

## 1. プロジェクト概要

### 1.1 目的
HTML+CSS+JavaScriptでキャラクターの着せ替え＆キャラクリエイトができるゲームを作成する。
透明度が設定された画像の重ね合わせでキャラクターを表現し、パーツの組み合わせで多様なキャラクターを作成できるようにする。

### 1.2 対象キャラクター
- **スタイル**: アニメ調
- **表示範囲**: バストアップ〜膝上程度
- **解像度**: 800px × 900px程度（高解像度ではないがドット絵でもない）

### 1.3 前回プロジェクトからの改善点
- パーツはモノクロで作成してコストを削減（初期段階）
- 色変更機能で柔軟性を確保（後期段階）
- JSONファイルの編集負担を軽減するビジュアルエディタの導入
- GIFアニメ対応（目パーツなど）

---

## 2. 技術仕様

### 2.1 技術スタック
- **フロントエンド**: HTML + CSS + Vanilla JavaScript
- **データ形式**: JSON
- **画像形式**: PNG（透過）、GIF（アニメーション）

### 2.2 画像レイヤー方式
- 各パーツは透明度を持つPNG画像
- CSS `position: absolute` と `z-index` で重ね合わせ
- 1つのパーツが複数の画像レイヤーを持てる構造
  - 例: 耳パーツ → 前面（z:400）+ 後面（z:150）
  - 例: 後ろ髪 → 背面（z:50）+ 前面（z:590）

### 2.3 zIndex設計方針
レイヤーの重なり順序を以下のように定義：

```
0-99:     背景
100-199:  体・下着
200-299:  頭部・肌
300-399:  後ろ髪・鼻・口
400-499:  顔パーツ（耳・目・眉）
500-599:  横髪・アクセサリー（後）
600-699:  前髪・アクセサリー（前）
700-799:  最前面アクセサリー（眼鏡など）
```

---

## 3. データ構造設計

### 3.1 JSON形式（v2.0）

```json
{
  "meta": {
    "version": "2.0",
    "canvasWidth": 800,
    "canvasHeight": 900
  },
  "categoryGroups": [
    {
      "id": "グループID",
      "name": "表示名",
      "order": 表示順序,
      "collapsed": false
    }
  ],
  "parts": [
    {
      "id": "パーツ一意ID",
      "name": "表示名",
      "category": "所属カテゴリID",
      "zIndex": 基本zIndex値,
      "layers": [
        {
          "file": "画像ファイルパス",
          "zIndex": レイヤー個別zIndex（省略可）,
          "animated": true/false（GIF対応）
        }
      ],
      "colors": {
        "カラー名": {
          "blend": "ブレンドモード",
          "color": "#カラーコード",
          "opacity": 不透明度
        },
        "カラー名2": {
          "image": "専用カラー画像パス"
        }
      },
      "unlocks": ["表示するパーツID配列"],
      "requires": "必須パーツID"
    }
  ],
  "categories": [
    {
      "id": "カテゴリID",
      "name": "表示名",
      "group": "所属グループID（任意、nullまたは未指定でグループなし）",
      "order": 表示順序,
      "hidden": true/false（条件付き表示）,
      "selectionMode": "single/multiple（省略可、デフォルト: single）"
    }
  ]
}
```

### 3.2 主要フィールド説明

#### categoryGroups配列（任意）
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| id | string | ✓ | グループの一意識別子 |
| name | string | ✓ | UI表示用の名前 |
| order | number | ✓ | グループの表示順序 |
| collapsed | boolean | - | 初期状態で折りたたむか（将来の拡張用） |

**カテゴリグループ機能について:**
- カテゴリを階層的に整理して表示するための機能
- UIで折りたたみ/展開が可能
- グループに所属しないカテゴリも許容（group: null）
- 後方互換性: categoryGroupsがない場合は従来通りフラット表示

#### parts配列
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| id | string | ✓ | パーツの一意識別子 |
| name | string | ✓ | UI表示用の名前 |
| category | string | ✓ | 所属カテゴリのID |
| zIndex | number | ✓ | 基本の重ね順序 |
| layers | array | ✓ | 画像レイヤーの配列 |
| colors | object | - | 色変更設定（後述） |
| unlocks | array | - | このパーツ選択時に表示されるパーツID |
| requires | string | - | 必須となるパーツID（簡易依存関係） |

#### layers配列の要素
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| file | string | ✓ | 画像ファイルのパス |
| zIndex | number | - | 個別zIndex（未指定時は親のzIndex） |
| animated | boolean | - | GIFアニメかどうか |

#### categories配列
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| id | string | ✓ | カテゴリの一意識別子 |
| name | string | ✓ | UI表示用の名前 |
| group | string | - | 所属するグループのID（nullまたは未指定でグループなし） |
| order | number | ✓ | UIでの表示順序（グループ内での順序） |
| hidden | boolean | - | 条件付き表示カテゴリか |
| selectionMode | string | - | 選択モード: "single"（デフォルト、1つのみ選択）/ "multiple"（複数選択可能、アクセサリー用） |

---

## 4. 機能仕様

### 4.1 色変更機能

#### 4.1.1 方式
パーツごとに色変更可能かを定義し、以下2つの方式をサポート：

**方式A: ブレンドモード**
```json
"colors": {
  "black": {
    "blend": "multiply",
    "color": "#333333",
    "opacity": 0.8
  }
}
```
- モノクロ画像に対してCSSブレンドモードで色を適用
- ファイル数削減、自由な色調整が可能
- 意図しない色になる可能性あり

**方式B: 専用画像**
```json
"colors": {
  "brown": {
    "image": "parts/hair/hair1_brown.png"
  }
}
```
- 色ごとに専用の画像を用意
- 高品質、陰影や質感を細かく調整可能
- ファイル数が増加

#### 4.1.2 ハイブリッド運用
- 主要カラー（5-8色）→ 専用画像で用意
- マイナーカラー・カスタムカラー → ブレンドモードで対応

#### 4.1.3 実装方針
- Phase 1: 設計のみ組み込み、実装は後回し
- Phase 2: ブレンドモード対応
- Phase 3: 専用画像対応

### 4.2 GIFアニメーション対応

#### 4.2.1 基本仕様
- 目パーツなど特定パーツのみGIFアニメ対応
- `layers`配列で`animated: true`フラグで識別
- プレビュー表示時はGIFをそのまま表示

#### 4.2.2 出力機能
- 静止画出力（PNG/JPG）: Phase 1で実装
- GIFアニメ出力: Phase 3で実装
  - Canvas APIで各フレームを描画
  - gif.jsなどのライブラリで合成

### 4.3 依存関係機能

#### 4.3.1 シンプルな依存関係（Phase 1）
```json
{
  "id": "tshirt_plain",
  "unlocks": ["tshirt_pattern"]
}
```
- `unlocks`: このパーツ選択時に表示されるカテゴリ/パーツ
- `requires`: このパーツを表示するために必要なパーツ

#### 4.3.2 将来の拡張（Phase 4）
```json
{
  "requiresCondition": {
    "type": "any",
    "parts": ["body_normal", "body_slim"]
  },
  "excludes": ["tshirt_plain"]
}
```
- 複雑な条件分岐
- 排他制御
- 多対多の関係

### 4.4 バリデーション機能

#### 4.4.1 チェック項目
- [ ] パーツIDの重複
- [ ] 存在しないカテゴリIDの参照
- [ ] 存在しないパーツIDの参照（unlocks/requires）
- [ ] 画像ファイルの存在確認
- [ ] 循環依存の検出
- [ ] zIndex値の妥当性

#### 4.4.2 表示
エディタ画面に警告セクションを設け、問題がある場合に表示

---

## 5. ビジュアルエディタ仕様

### 5.1 画面構成
**3カラム1画面方式**

```
┌─────────────────────────────────────────────────┐
│ ヘッダー: タイトル、JSON入出力、保存ボタン      │
├──────────┬──────────────┬───────────────────────┤
│          │              │                       │
│ カテゴリ │ パーツ一覧   │ プレビュー & 編集     │
│ 選択     │              │                       │
│ (200px)  │  (300px)     │  (500px)              │
│          │              │                       │
└──────────┴──────────────┴───────────────────────┘
```

### 5.2 左カラム: カテゴリ選択
- カテゴリをツリー表示
- 展開/折りたたみ可能
- 🔒アイコンで条件付きカテゴリを表示
- [+カテゴリ]ボタンで新規追加

### 5.3 中央カラム: パーツ一覧
- 選択中カテゴリのパーツを一覧表示
- 各パーツに以下を表示：
  - パーツ名
  - zIndex値
  - レイヤー数
  - (GIF)マーク
- [+新規パーツ]ボタン
- [編集][削除]ボタン

### 5.4 右カラム: プレビュー & 編集

#### 5.4.1 プレビューエリア
- 800x900pxのキャンバス
- 編集中パーツをリアルタイム表示
- 「他パーツと重ねて表示」チェックボックス
  - ONにすると他カテゴリのパーツを選択可能
  - 重なり具合を確認

#### 5.4.2 編集フォーム（アコーディオン形式）

**基本情報（常に展開）**
- ID入力欄
- 名前入力欄
- カテゴリ選択
- zIndex入力欄

**レイヤー設定（展開可能）**
- レイヤー一覧（カード形式）
  - ファイルパス入力 + [参照]ボタン
  - 個別zIndex入力
  - ☑アニメーションチェックボックス
  - [↑][↓]順序変更、[×]削除ボタン
  - サムネイル表示
- [+レイヤー追加]ボタン

**色設定（展開可能）**
- ☑色変更可能チェックボックス
- 色プリセット一覧
  - カラー名
  - ●ブレンド / ○画像 選択
  - ブレンド時: BlendMode, Color, Opacity
  - 画像時: ファイルパス
- [+色追加]ボタン

**依存関係（展開可能）**
- 必須パーツ選択
- 表示するカテゴリ/パーツ追加

**警告表示**
- バリデーションエラー/警告を表示

### 5.5 必須機能

#### 5.5.1 JSON入出力
- [JSON読込]ボタン: ファイル選択ダイアログ
- [JSON出力]ボタン: JSONファイルをダウンロード
- 自動保存機能（LocalStorage）

#### 5.5.2 プレビュー機能
- リアルタイム更新
- 他パーツとの組み合わせ表示
- 拡大表示オプション（将来）

#### 5.5.3 バリデーション
- 保存時に自動チェック
- エラーがある場合は警告表示
- 重大なエラーは保存をブロック

---

## 6. 開発フェーズ

### Phase 1: 基本機能（MVP）
**目標**: ビジュアルエディタで基本的なパーツ管理ができる + 着せ替えゲーム本体の基本機能

**ビジュアルエディタ**:
- [ ] 3カラムレイアウト
- [ ] パーツCRUD（作成・読込・更新・削除）
- [ ] レイヤー管理（複数画像、zIndex）
- [ ] プレビュー表示（重ね合わせ）
- [ ] 他パーツとの組み合わせプレビュー
- [ ] JSON読込/出力
- [ ] 基本バリデーション
- [ ] シンプルな依存関係（unlocks/requires）

**着せ替えゲーム本体**:
- [ ] 3カラムレイアウト（カテゴリ/プレビュー/パーツ選択）
- [ ] パーツ選択機能（サムネイル表示）
  - [ ] 単一選択モード（ラジオボタン風）
  - [ ] 複数選択モード（チェックボックス風、アクセサリー用）
- [ ] リアルタイムプレビュー
- [ ] プリセット色選択
- [ ] 拡張設定（カスタムカラー）
  - [ ] BlendMode選択
  - [ ] カラーピッカー（リアルタイム反映）
  - [ ] Opacityスライダー（リアルタイム反映）
- [ ] 依存関係処理（条件付きカテゴリ表示）
- [ ] PNG画像出力（複数選択対応）
- [ ] キャラクターデータ保存/読込（JSON、複数選択対応）

**実装しない（Phase 2以降）**:
- GIFアニメ対応（設計のみ）
- ドラッグ&ドロップ
- ランダム生成
- URL共有

### Phase 2: 色変更機能
- [ ] ブレンドモード方式の実装
- [ ] プレビューでの色変更
- [ ] 専用画像方式の実装
- [ ] 色プリセットUI

### Phase 3: アニメーション対応
- [ ] GIFプレビュー対応
- [ ] GIF出力機能（gif.js導入）
- [ ] Canvas APIでの合成処理

### Phase 4: 高度な機能
- [ ] 複雑な依存関係（条件分岐）
- [ ] ドラッグ&ドロップUI
- [ ] 一括編集機能
- [ ] テンプレート機能

---

## 7. ファイル構成

```
/
├── index.html              # ビジュアルエディタ
├── style.css               # スタイルシート
├── app.js                  # メインロジック
├── data.json               # パーツデータ（サンプル）
├── parts/                  # パーツ画像フォルダ
│   ├── none.png           # 透明画像（なし選択用）
│   ├── basics/
│   │   ├── background/
│   │   ├── body/
│   │   └── head/
│   ├── face/
│   │   ├── eyes/
│   │   ├── nose/
│   │   ├── mouth/
│   │   ├── eyebrow/
│   │   └── ear/
│   ├── hair/
│   │   ├── basehair/
│   │   ├── maegami/
│   │   ├── yokogami/
│   │   └── ushirogami/
│   ├── clothes/
│   │   ├── underwear/
│   │   ├── tops/
│   │   └── ribbons/
│   └── accessories/
│       └── head/
└── README.md               # プロジェクト説明
```

---

## 8. 技術的課題と対策

### 8.1 JSON編集の負担
**課題**: 手作業でのJSON編集はインデント整理が面倒
**対策**: ビジュアルエディタで完全にGUI化

### 8.2 画像パスの管理
**課題**: ファイルパスのタイプミスや存在チェック
**対策**: 
- ファイル選択ダイアログ（`<input type="file">`）
- バリデーション機能で存在確認

### 8.3 プレビューパフォーマンス
**課題**: レイヤーが多いと描画が重くなる可能性
**対策**:
- CSS transform でハードウェアアクセラレーション
- 必要に応じてCanvas描画に切り替え

### 8.4 色変更の実装
**課題**: CSS filterだけでは意図した色にならない
**対策**: ブレンドモード + 専用画像のハイブリッド方式

### 8.5 GIF出力の処理時間
**課題**: 複数レイヤーのGIF合成は時間がかかる
**対策**:
- Web Worker で非同期処理
- プログレスバー表示

---

## 9. 着せ替えゲーム本体の仕様

### 9.1 概要
ビジュアルエディタで作成したパーツデータ（JSON）を使用して、ユーザーがキャラクターをカスタマイズできるWebアプリケーション。

### 9.2 データ連携

#### 9.2.1 JSON共有方式
- エディタと本体で**同じJSON**を使用
- エディタ: パーツ定義JSONを作成・編集
- 本体: 同じJSONを読み込んで使用
- メリット: シンプル、一元管理、メンテナンスが容易

#### 9.2.2 キャラクター保存形式
```json
{
  "character": {
    "background": "bg_simple",
    "body": "body_normal",
    "head": "head_normal",
    "eyes": {
      "id": "eyes_basic",
      "color": "blue"
    },
    "hair_base": {
      "id": "hair_long",
      "color": "brown"
    },
    "nose": "nose1",
    "mouth": "mouth3",
    "accessories_head": [
      "ribbon_red",
      "hairpin_flower"
    ]
  }
}
```

**仕様**:
- 色設定がないパーツ: IDのみ（文字列）
- 色設定があるパーツ: オブジェクト形式（id + color）
- **複数選択カテゴリ（selectionMode: "multiple"）: 配列形式**
- カスタム色の場合: blend, color, opacityも保存

```json
{
  "hair_base": {
    "id": "hair_long",
    "color": "custom",
    "blend": "multiply",
    "colorValue": "#8B4513",
    "opacity": 0.8
  }
}
```

### 9.3 UI設計

#### 9.3.1 レイアウト（3カラム構成）

```
┌──────────────────────────────────────────────────────────┐
│ Character Creator              [保存][読込][PNG出力]     │
├──────────┬───────────────────────────┬───────────────────┤
│          │                           │                   │
│ カテゴリ │  キャラプレビュー         │  パーツ・色設定   │
│          │  ┌─────────────────────┐ │                   │
│▼ 基本    │  │                     │ │  パーツ選択       │
│  • 背景  │  │   [キャラ表示]      │ │  ┌─────────────┐ │
│  • 体型  │  │   800x900px         │ │  │[img][img]   │ │
│  • 頭部  │  │                     │ │  │[img][img]   │ │
│▼ 顔      │  │   リアルタイム      │ │  │ 目のパーツ  │ │
│  • 耳    │  │   プレビュー        │ │  └─────────────┘ │
│  • 眉    │  │                     │ │                   │
│  • 目    │  └─────────────────────┘ │  色設定           │
│  • 鼻    │                           │  プリセット:      │
│  • 口    │                           │  ○黒 ○茶 ●拡張  │
│▼ 髪      │                           │  ┌─────────────┐ │
│  • ベース│                           │  │BlendMode:   │ │
│  • 前髪  │                           │  │[multiply▼] │ │
│  • 横髪  │                           │  │Color: 🎨   │ │
│  • 後髪  │                           │  │Opacity: ━━●│ │
│▼ 服装    │                           │  └─────────────┘ │
│  • 下着  │                           │                   │
│  • トップ│                           │                   │
│  🔒 柄   │                           │                   │
│▼ アクセ  │                           │                   │
│          │                           │                   │
└──────────┴───────────────────────────┴───────────────────┘

幅比率: 200px : 400px : 400px
```

#### 9.3.2 左カラム: カテゴリ選択
- カテゴリグループがある場合、グループごとに折りたたみ可能
- グループヘッダーをクリックで展開/折りたたみ
- グループに所属しないカテゴリは一番上に表示
- 選択中のカテゴリをハイライト
- 🔒マークで条件付きカテゴリを表示

**カテゴリグループの表示例:**
```
背景（グループなし）

▼ 基本
  • 体型
  • 頭部
▼ 顔パーツ
  • 目
  • 眉毛
  • 鼻
  • 口
▼ 髪
  • ベース
  • 前髪
  • 横髪
  • 後髪
▼ 服装
  • 下着
  • トップス
  • ボトムス
  🔒 柄
▼ アクセサリー
  • 頭
  • 耳
```


#### 9.3.3 中央カラム: キャラクタープレビュー
- 800x900pxのキャンバス
- すべてのパーツを重ね合わせて表示
- **リアルタイム更新**: パーツ選択、色変更が即座に反映
- 背景パーツも含めて表示（none.png選択時は透過）

#### 9.3.4 右カラム: パーツ選択・色設定

**パーツ選択エリア（単一選択カテゴリ）**:
```html
<div class="parts-selector" data-mode="single">
  <!-- サムネイル一覧（ラジオボタン風） -->
  <div class="parts-grid">
    <div class="part-item selected">
      <img src="parts/eyes/eye1.png" class="part-thumbnail" data-id="eyes1">
      <span class="part-name">基本の目</span>
    </div>
    <div class="part-item">
      <img src="parts/eyes/eye2.png" class="part-thumbnail" data-id="eyes2">
      <span class="part-name">つり目</span>
    </div>
    <div class="part-item">
      <img src="parts/eyes/eye3.png" class="part-thumbnail" data-id="eyes3">
      <span class="part-name">たれ目</span>
    </div>
  </div>
</div>
```

**パーツ選択エリア（複数選択カテゴリ）**:
```html
<div class="parts-selector" data-mode="multiple">
  <!-- サムネイル一覧（チェックボックス風） -->
  <div class="parts-grid">
    <div class="part-item">
      <input type="checkbox" id="ribbon_red" checked>
      <label for="ribbon_red">
        <img src="parts/accessories/ribbon_red.png" class="part-thumbnail">
        <span class="part-name">赤いリボン</span>
      </label>
    </div>
    <div class="part-item">
      <input type="checkbox" id="hairpin_flower" checked>
      <label for="hairpin_flower">
        <img src="parts/accessories/hairpin_flower.png" class="part-thumbnail">
        <span class="part-name">花のヘアピン</span>
      </label>
    </div>
    <div class="part-item">
      <input type="checkbox" id="headband">
      <label for="headband">
        <img src="parts/accessories/headband.png" class="part-thumbnail">
        <span class="part-name">カチューシャ</span>
      </label>
    </div>
  </div>
</div>
```

**サムネイル表示**:
- 元画像をCSSで縮小表示（専用サムネイル画像不要）
- グリッド表示（3-4列）
- 単一選択: 選択中パーツに枠線でハイライト
- 複数選択: チェックボックスで選択状態を表示

**色設定エリア**:
```
色設定（選択中: 髪）
┌─────────────────────────────────────┐
│ プリセット:                         │
│ ○ 黒  ○ 茶  ○ 金  ● 拡張設定      │
├─────────────────────────────────────┤
│ 拡張設定                            │
│ BlendMode: [multiply ▼]            │
│ Color: [#8B4513] 🎨                │
│ Opacity: [━━━━━━━━━●] 1.0         │
└─────────────────────────────────────┘
```

### 9.4 色変更機能

#### 9.4.1 プリセット選択
- ラジオボタン形式
- JSONで定義された色を表示
- クリックで即座にキャラプレビューに反映

#### 9.4.2 拡張設定（カスタムカラー）
- ラジオボタンの1つとして配置
- 選択時のみ詳細設定が有効化
- プリセット選択時はグレーアウト＋disabled

**詳細設定項目**:

1. **BlendMode**: ドロップダウン
   - multiply（乗算）
   - overlay（オーバーレイ）
   - screen（スクリーン）
   - darken（比較（暗））
   - lighten（比較（明））
   - color（カラー）

2. **Color**: カラーピッカー
   - `<input type="color">` を使用
   - 16進数カラーコード表示
   - **変更時、キャラプレビューに即座に反映**

3. **Opacity**: スライダー
   - `<input type="range">` を使用
   - 範囲: 0.0 - 1.0（0.1刻み）
   - デフォルト: 1.0
   - **変更時、キャラプレビューに即座に反映**

#### 9.4.3 リアルタイムプレビュー
```javascript
// カラーピッカー操作
colorPicker.addEventListener('input', (e) => {
  const partElement = document.querySelector(`.part-${currentCategory}`);
  partElement.style.setProperty('--custom-color', e.target.value);
  // キャラプレビューの該当パーツの色が即座に変わる
});

// Opacityスライダー操作
opacitySlider.addEventListener('input', (e) => {
  const partElement = document.querySelector(`.part-${currentCategory}`);
  partElement.style.opacity = e.target.value;
  // キャラプレビューの該当パーツの透明度が即座に変わる
});
```

### 9.5 背景の扱い

#### 9.5.1 背景パーツの仕様
- 背景も通常のパーツと同じ扱い
- `parts/none.png`（完全透過）を共通利用

**背景パーツ例**:
```json
{
  "id": "bg_transparent",
  "name": "透過（なし）",
  "layers": [{"file": "parts/none.png"}]
},
{
  "id": "bg_black",
  "name": "黒背景",
  "layers": [{"file": "parts/bg/black.png"}]
},
{
  "id": "bg_green",
  "name": "グリーンバック",
  "layers": [{"file": "parts/bg/green.png"}]
},
{
  "id": "bg_illustration1",
  "name": "背景イラスト1",
  "layers": [{"file": "parts/bg/illustration1.png"}]
}
```

#### 9.5.2 出力時の動作
- **場合分けなし**
- 現在のプレビュー状態をそのまま出力
- 背景パーツが`none.png`の場合 → 透過PNG出力
- 背景パーツが画像の場合 → 背景込みで出力

### 9.6 画像出力機能

#### 9.6.1 出力仕様
- **形式**: PNG（Phase 1）、GIF（Phase 3）
- **サイズ**: JSON定義の`canvasWidth`×`canvasHeight`を使用（800x900px）
- **背景**: 選択中の背景パーツを含む
- **透かし**: なし

#### 9.6.2 実装方法
```javascript
function exportPNG() {
  const canvas = document.getElementById('preview-canvas');
  const ctx = canvas.getContext('2d');
  
  // JSONから取得
  canvas.width = partsData.meta.canvasWidth;   // 800
  canvas.height = partsData.meta.canvasHeight; // 900
  
  // 全パーツをzIndex順に描画
  drawAllLayers(ctx);
  
  // PNG出力
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character.png';
    a.click();
  });
}

function drawAllLayers(ctx) {
  // 全パーツを収集
  const allLayers = [];
  
  for (let [categoryId, selection] of Object.entries(selectedParts)) {
    const category = categoriesData.find(c => c.id === categoryId);
    
    if (category.selectionMode === 'multiple') {
      // 複数選択: 配列の各要素を追加
      for (let partId of selection) {
        const partData = partsDatabase[partId];
        if (partData) {
          for (let layer of partData.layers) {
            allLayers.push({
              ...layer,
              zIndex: layer.zIndex || partData.zIndex
            });
          }
        }
      }
    } else {
      // 単一選択: 1つだけ追加
      const partId = typeof selection === 'string' ? selection : selection.id;
      const partData = partsDatabase[partId];
      if (partData) {
        for (let layer of partData.layers) {
          allLayers.push({
            ...layer,
            zIndex: layer.zIndex || partData.zIndex
          });
        }
      }
    }
  }
  
  // zIndex順にソート
  allLayers.sort((a, b) => a.zIndex - b.zIndex);
  
  // 描画
  for (let layer of allLayers) {
    const img = new Image();
    img.src = layer.file;
    ctx.drawImage(img, 0, 0);
    
    // 色変更処理を適用（blend mode等）
    applyColorEffect(ctx, layer);
  }
}
```

### 9.7 保存・読込機能

#### 9.7.1 キャラクターデータ保存
```javascript
function saveCharacter() {
  const characterData = {
    character: {}
  };
  
  for (let [categoryId, selection] of Object.entries(selectedParts)) {
    const category = categoriesData.find(c => c.id === categoryId);
    
    if (category.selectionMode === 'multiple') {
      // 複数選択カテゴリ: 配列で保存
      characterData.character[categoryId] = selection;
    } else {
      // 単一選択カテゴリ: ID or オブジェクト
      if (selectedColors[categoryId]) {
        characterData.character[categoryId] = {
          id: selection,
          color: selectedColors[categoryId]
        };
      } else {
        characterData.character[categoryId] = selection;
      }
    }
  }
  
  // JSONファイルとしてダウンロード
  const blob = new Blob([JSON.stringify(characterData, null, 2)], 
                        {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-character.json';
  a.click();
}
```

#### 9.7.2 キャラクターデータ読込
```javascript
function loadCharacter(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target.result);
    
    // パーツを復元
    for (let [categoryId, partInfo] of Object.entries(data.character)) {
      const category = categoriesData.find(c => c.id === categoryId);
      
      if (category.selectionMode === 'multiple') {
        // 複数選択カテゴリ: 配列
        selectedParts[categoryId] = [];
        for (let partId of partInfo) {
          if (!partsDatabase[partId]) {
            console.warn(`Part ${partId} not found`);
            continue;
          }
          selectedParts[categoryId].push(partId);
        }
      } else {
        // 単一選択カテゴリ
        let partId = typeof partInfo === 'string' ? partInfo : partInfo.id;
        let color = typeof partInfo === 'object' ? partInfo.color : null;
        
        // 存在チェック（最低限のバリデーション）
        if (!partsDatabase[partId]) {
          console.warn(`Part ${partId} not found, using default`);
          partId = getDefaultPart(categoryId);
        }
        
        selectPart(categoryId, partId, color);
      }
    }
    
    updatePreview();
  };
  reader.readAsText(file);
}
```

### 9.8 バリデーション

#### 9.8.1 最低限のチェック
- 存在しないパーツIDの場合 → デフォルトパーツにフォールバック
- 警告をコンソールに出力
- エラー時もアプリは動作継続

#### 9.8.2 フォールバック処理
```javascript
function getDefaultPart(category) {
  // カテゴリごとの最初のパーツをデフォルトとする
  const categoryParts = partsData.parts.filter(p => p.category === category);
  return categoryParts.length > 0 ? categoryParts[0].id : null;
}
```

### 9.9 依存関係の処理

#### 9.9.1 条件付きカテゴリの表示
```javascript
function updateCategoryVisibility() {
  // 選択中のパーツに基づいて、カテゴリの表示/非表示を切り替え
  for (let category of categories) {
    if (category.hidden) {
      // このカテゴリを表示する条件をチェック
      const shouldShow = checkUnlockCondition(category.id);
      categoryElement.style.display = shouldShow ? 'block' : 'none';
    }
  }
}

function checkUnlockCondition(categoryId) {
  // 現在選択中のパーツのunlocksをチェック
  for (let selectedPart of Object.values(selectedParts)) {
    const partData = partsDatabase[selectedPart];
    if (partData.unlocks && partData.unlocks.includes(categoryId)) {
      return true;
    }
  }
  return false;
}
```

### 9.10 将来的な拡張機能

#### 9.10.1 Phase 2以降
- ランダム生成機能
- URL共有機能（`?char=bg1,body1,eyes2`）
- 複数サイズ出力（Twitter用、アイコン用）
- ローカルストレージ自動保存

#### 9.10.2 Phase 3以降
- GIFアニメ出力
- プリセットキャラクター
- お気に入り機能
- SNS共有ボタン

### 9.2 エディタ拡張
- パーツのプレビューサムネイル自動生成
- 一括色変換ツール
- パーツのグループ化
- バージョン管理（履歴機能）

### 9.3 最適化
- 画像の自動圧縮
- Lazy Loading
- PWA化

---

## 10. 参考情報

### 10.1 使用想定ライブラリ
- **gif.js**: GIFアニメ生成（Phase 3）
- **FileSaver.js**: ファイルダウンロード（オプション）

### 10.2 CSS Blend Modes
```css
mix-blend-mode: multiply;    /* 乗算 */
mix-blend-mode: screen;      /* スクリーン */
mix-blend-mode: overlay;     /* オーバーレイ */
mix-blend-mode: darken;      /* 比較（暗）*/
mix-blend-mode: lighten;     /* 比較（明）*/
mix-blend-mode: color;       /* カラー */
```

---

## 更新履歴

- 2026-02-16: 初版作成