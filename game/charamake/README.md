# Character Creator

透過 PNG/GIF を重ね合わせてキャラクターを作成・着せ替えできる HTML + JavaScript アプリです。

**ビジュアルエディタ**（`editor.html`）でパーツ定義を編集し、**着せ替えゲーム**（`game.html`）で実際にキャラクターを組み立てます。マスターデータは `parts-data.json` に集約されています。

## ファイル構成

```
game/charamake/
├── editor.html          # ビジュアルエディタ（パーツ管理）
├── editor.css
├── editor.js
├── game.html            # 着せ替えゲーム本体
├── game.css
├── game.js
├── inner-groups.js      # インナーグループ共有ロジック
├── layer-resolve.js     # レイヤー画像解決（ポーズ + IG 2段階）
├── secrets.js           # シークレット解放（パスワードハッシュ照合）
├── parts-order.js       # パーツ一覧 order 共有ロジック
├── parts-data.json      # パーツマスターデータ（ゲームが自動読込）
├── sampledata.json      # 小さなサンプルデータ（エディタの動作確認用）
├── SPEC.md              # 詳細仕様書
├── README.md
└── parts/               # パーツ画像（PNG / GIF）
    ├── none.png         # 透過（なし）用
    ├── basics/          # 背景・体型・フレームなど
    ├── face/            # 顔パーツ
    ├── hair/            # 髪
    ├── clothes/         # 服
    └── accessories/     # アクセサリー
```

## 実装状況

### エディタ（editor.html）

- [x] 3カラム UI（カテゴリ / パーツ一覧 / 編集＋プレビュー）
- [x] カテゴリ・カテゴリグループの管理
- [x] パーツ CRUD（作成・編集・削除・複製）
- [x] パーツ一覧の並び替え（`order` + ドラッグ＆ドロップ）
- [x] レイヤー管理（追加・削除・並び替え、zIndex / side / blendMode / animated）
- [x] 色設定（ブレンドモード＋専用画像、色相シフト対応）
- [x] 依存関係（requires / unlocks / hides）
- [x] インナーグループ（meta / レイヤー maskedFile / masksInnerGroups）
- [x] ポーズ差し替え（体型 `poseId` / レイヤー `poseFiles`・`poseMaskedFiles`）— `SPEC-pose-files.md`
- [x] シークレット解放（`meta.secrets` / パスワード / カテゴリ・パーツ `secret`）— `SPEC-secrets.md`
- [x] バリデーション（警告表示、循環依存検出、IG 参照チェック）
- [x] プレビュー（他パーツと重ねて表示）
- [x] JSON 読込 / 出力、LocalStorage 自動保存

### ゲーム（game.html）

- [x] `parts-data.json` の自動読込
- [x] カテゴリグループ付きカテゴリ選択 UI
- [x] 単一選択 / 複数選択カテゴリ
- [x] 条件付きカテゴリ表示（hidden / unlocks / hides・パーツ単位 hides 含む）
- [x] 色プリセット・カスタム色（ブレンド・不透明度・色相シフト）
- [x] カラーグループ連動（髪色・肌色など）
- [x] 左右別レイヤー（side 指定パーツの表示切替）
- [x] Canvas プレビュー描画
- [x] キャラクター保存 / 読込（`character.json`）
- [x] PNG 出力
- [x] モバイル向けタブ UI
- [x] インナーグループ（服の重ね着マスク差し替え）— 詳細は `SPEC-inner-groups.md`
- [x] ポーズ差し替え（体型選択で袖などを差し替え）— 詳細は `SPEC-pose-files.md`
- [x] シークレット解放（パスワード入力）— 詳細は `SPEC-secrets.md`

### 未着手・将来

- [ ] GIF アニメのゲーム側プレビュー
- [ ] GIF 出力（複数レイヤー合成）
- [ ] 複合条件依存（`requiresCondition` 等、SPEC.md 参照）

## 使い方

### 開発フロー

```
1. editor.html をブラウザで開く
2. パーツ画像を parts/ に配置
3. エディタでカテゴリ・パーツを定義・編集
4. 「JSON出力」で parts-data.json をダウンロードし、このフォルダに配置
5. game.html を開いて着せ替えを確認
6. 必要に応じて「キャラ保存」「PNG出力」
```

> **注意**: `fetch` で JSON を読み込むため、ローカルでは簡易 HTTP サーバー経由での起動を推奨します（`file://` 直開きだと読込に失敗することがあります）。

### エディタ

1. `editor.html` をブラウザで開く
2. 初回は空の場合、「JSON読込」から `sampledata.json` または `parts-data.json` を読み込む
3. カテゴリを選択してパーツを編集

**基本操作**

1. **カテゴリ追加**: 左カラム下部の「+ カテゴリ追加」
   - 複数選択モード（アクセサリー用）
   - 条件付き表示（hidden）
   - カラーグループ ID（同色連動用）
2. **パーツ追加**: カテゴリ選択後、中央カラムの「+ 新規パーツ」
3. **パーツ並び替え**: パーツカード左の `⋮⋮` ハンドルをドラッグ（`order` が JSON に保存される）
4. **パーツ編集**: パーツカードをクリック（ハンドル・ボタン以外）
5. **レイヤー管理**: ファイルパス、zIndex、side（左/右）、blendMode、animated
6. **色設定**: ブレンドモードまたは専用画像でプリセット追加、`allowCustomColor` の ON/OFF
7. **依存関係**:
   - `requires`: 必須パーツ
   - `unlocks`: 選択時に表示するカテゴリ/パーツ（ゲームはカテゴリ解放が主）
   - `hides`: 選択時に非表示にするカテゴリ/パーツ（unlocks が優先）— `SPEC-dependencies.md`
8. **インナーグループ**: メタデータ編集で IG マスタ登録 → レイヤーに IG・マスク画像 → アウターにマスク指定
9. **ポーズ差し替え**: 体型パーツに `poseId` → 服レイヤーに `poseFiles`（必要なら `poseMaskedFiles`）。プレビューは「プレビュー用ポーズ」または他パーツ重ねで体型を選択
10. **プレビュー**: 右カラムのキャンバス。**マスク確認は「他パーツと重ねて表示」** でアウターも選択
11. **シークレット**: メタデータで束登録（パスワードはハッシュ保存）→ カテゴリ/パーツに `secret` 指定。ゲームヘッダーでパスワード入力
12. **保存**: 「パーツを保存」で編集中パーツを確定、「JSON出力」で `parts-data.json` をダウンロード

### ゲーム

1. `game.html` をブラウザで開く（`parts-data.json` が同フォルダにあること）
2. 左のカテゴリから部位を選び、右でパーツと色を変更
3. ヘッダーの操作:
   - **シークレット**: パスワード入力 →「解放」（セッション内のみ。キャラ保存で `unlockedSecrets` を引き継ぎ）
   - **JSONを再読込**: 別の `parts-data.json` を手動読込
   - **キャラ読込 / キャラ保存**: `character.json` の読み書き
   - **PNG出力**: 現在のプレビューを PNG でダウンロード

## データ形式（概要）

詳細は `SPEC.md` を参照。

インナーグループ（服の重ね着マスク）の詳細は [SPEC-inner-groups.md](SPEC-inner-groups.md)、ポーズ差し替えは [SPEC-pose-files.md](SPEC-pose-files.md)、依存関係は [SPEC-dependencies.md](SPEC-dependencies.md)、シークレットは [SPEC-secrets.md](SPEC-secrets.md) を参照。

### parts-data.json

| セクション | 内容 |
|-----------|------|
| `meta` | バージョン、キャンバスサイズ、`innerGroups`、`secrets`（パスワードハッシュ） |
| `categoryGroups` | UI 上のグループ（基本・顔・髪・服など） |
| `categories` | 着せ替えカテゴリ（selectionMode, hidden, `secret`, colorGroup 等） |
| `parts` | パーツ定義（`order`, `poseId`, `secret`, layers, colors, unlocks, hides, `masksInnerGroups` 等） |
| `layers[]` | `poseFiles`, `poseMaskedFiles`, `innerGroup`, `maskedFile`（任意） |

### character.json（保存データ）

カテゴリ ID をキーに、選択したパーツ ID と色設定を保存します。`unlockedSecrets` に解放済みシークレット束 ID の配列を含みます。複数選択カテゴリは配列、カスタム色は blend / colorValue / opacity 等を含みます。

## 開発メモ

- エディタの作業内容は LocalStorage に自動保存されます（キー: `characterCreatorData`）。リセットする場合はブラウザの開発者ツールで LocalStorage をクリアしてください
- エディタとゲームは描画ロジック（ブレンド・色相シフト・レイヤー合成）を共通化しており、プレビューとゲームの見た目は揃う設計です
- ゲーム起動時は各カテゴリの先頭パーツがデフォルト選択されます（hidden カテゴリを除く）
