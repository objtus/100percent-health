# Character Creator / healthy charamaker

透過 PNG/GIF を重ね合わせてキャラクターを作成・着せ替えできる HTML + JavaScript アプリです。

## 公開版と開発用（2026-03 時点）

| 用途 | ファイル | 説明 |
|------|----------|------|
| **サイト公開（正本）** | [`index.html`](index.html) | **healthy charamaker**。100%health の `1column.css` + [`charamake.css`](charamake.css)。URL: `/game/charamake/` |
| **着せ替えロジック** | [`game.js`](game.js) ほか `*.js` | `index.html` / アーカイブの両方から読み込む。**機能変更はここが中心** |
| **パーツ編集（非公開）** | [`editor.html`](editor.html) | 開発者向け。サイトからはリンクしない |
| **旧スタンドアロン UI（アーカイブ）** | [`game.archive.html`](game.archive.html) + [`game.archive.css`](game.archive.css) | 当初の 3 カラム Material 風 UI。**凍結**。`index.html` とは **同期しない** |

> **注意**: 旧名称 `game.html` / `game.css` は **`game.archive.*` にリネーム**済み。ブックマークやメモの更新を推奨。

### index.html（公開版）の要点

- サイト内位置: **misc** コーナー（[`misc/index.html`](../../misc/index.html) からリンク）
- プレイ向けツールバー: キャラ読込・保存・PNG・シークレット。**JSON 再読込ボタンは非表示**（`#loadDataBtn` は DOM に残すのみ）
- **カスタム色 UI は非公開** — `#charamake-app` の `data-hide-custom-color="true"` で「カスタム」ボタンと拡張設定を出さない（[`game.js`](game.js) が参照）
- レイアウト: プレビュー上段 → カテゴリ | パーツ・色（下段）→ 依存関係フィード（固定高さ、`#dependencyFeed`）
- カテゴリグループ: **アコーディオン**（同時に 1 グループのみ展開）
- 条件付き（`hidden`）カテゴリ: 左欄には出さず、unlock 元パーツ選択時に **パーツ設定** ペイン内で修飾として選択
- アセットパス: `<base href="/game/charamake/">` とルート絶対パス（Live Server でも `/game/charamake/index.html` 推奨）

## ファイル構成

```
game/charamake/
├── index.html           # 公開着せ替え（正本）
├── charamake.css        # 公開 UI 専用スタイル（game.archive.css は使わない）
├── game.js              # 着せ替え本体ロジック
├── inner-groups.js
├── layer-resolve.js
├── secrets.js
├── dependencies.js
├── randomize.js         # ランダム生成（RANDOM_CONFIG で確率を調整）
├── randomize.check.js   # ランダムの不変条件チェック（Node）
├── parts-order.js
├── editor.html          # ビジュアルエディタ（開発・非公開）
├── editor.css
├── editor.js
├── game.archive.html    # 旧着せ替え UI（アーカイブ・凍結）
├── game.archive.css
├── parts-data.json      # パーツマスタ（ゲームが自動 fetch）
├── sampledata.json      # エディタ動作確認用サンプル
├── SPEC.md              # 詳細仕様
├── SPEC-*.md            # 依存・IG・ポーズ・シークレット等
├── README.md
└── parts/               # パーツ画像（PNG / GIF）
```

## 実装状況

### エディタ（editor.html）

- [x] 3 カラム UI、パーツ CRUD、レイヤー・色・依存・IG・ポーズ・シークレット
- [x] JSON 読込 / 出力、LocalStorage 自動保存

### 着せ替え（ロジック: game.js / 公開: index.html）

- [x] `parts-data.json` 自動読込
- [x] カテゴリグループ、アコーディオン（公開 UI）
- [x] 単一 / 複数選択、hidden / unlocks / hides、シークレット
- [x] 依存関係フィード（最大 3 行・workspace 下・固定高さ）
- [x] 色プリセット、カラーグループ連動（**公開版はカスタム色 UI オフ**）
- [x] 左右レイヤー、Canvas プレビュー、キャラ JSON、PNG 出力
- [x] モバイルタブ（カテゴリ | パーツ・色）
- [x] インナーグループ・ポーズ差し替え（各 SPEC 参照）
- [x] 時刻枠（`dynamicOverlay` / パーツ設定パネル・PNG 焼き付け）
- [x] 全体ランダム / カテゴリランダム、固定（ロック）、戻す / やり直す（SPEC.md 9.11）

### 未着手・将来

- [ ] 公開版でカスタム色 UI のブラッシュアップと `data-hide-custom-color` 解除
- [ ] GIF アニメプレビュー / GIF 出力
- [ ] 複合条件依存（`requiresCondition` 等）
- [ ] 公開時: changelog / RSS（サイト全体の運用タイミング）

## 使い方

### パーツデータの更新（開発）

```
1. editor.html を HTTP サーバー経由で開く
2. パーツ画像を parts/ に配置
3. エディタで編集 → JSON 出力 → parts-data.json をこのフォルダに配置
4. index.html（/game/charamake/）で着せ替えを確認
```

> `fetch` 利用のため、ローカルは **`file://` 直開き非推奨**。ルートをサイト直下にした Live Server 等で `/game/charamake/index.html` を開く。

### 公開着せ替え（index.html）

1. カテゴリ（グループ）→ パーツ・色で組み立て
2. **キャラ読込 / キャラ保存**（`character.json`）、**PNG 出力**
3. シークレットパーツはツールバーのパスワード → 解放
4. プレビュー下のランダムバー: 全体ランダム（`R`）、戻す（`Ctrl+Z`）/ やり直す（`Ctrl+Y`）。左一覧の錠前で固定したカテゴリは全体ランダムで変わらない。パーツ欄見出しの「ランダム」はそのカテゴリだけ引き直す（固定中でも可）

### アーカイブ UI（game.archive.html）

- 旧 3 カラム UI・全ツールバー（JSON 再読込含む）・カスタム色あり
- 比較・退避用。**正本への変更は反映しない**

## データ形式（概要）

詳細は [`SPEC.md`](SPEC.md)。付録 SPEC（inner-groups / pose-files / dependencies / secrets）も参照。

### character.json

カテゴリ ID → パーツ ID（複数選択は配列）、色、`unlockedSecrets` 等。複数選択の配列要素は ID 文字列、または `{ "id", "side"?, "color"? }`（旧形式の文字列配列も読める）。

ルートに **`locks`**（任意）: 全体ランダムで固定するカテゴリ ID の配列。無い JSON は既定（フレーム・背景・ベース髪）。

ルートに **`colorGroups`**（任意）: カテゴリの `colorGroup` ID ごとの共有色意図。例: `"skin": { "preset": "肌色2" }`。カスタム時は `preset: "custom"` と blend / colorValue 等。旧 saves はパーツごとの `color` から読込時に復元。

ルートに **`clockDisplayMode`**（任意）: 時刻枠パーツの表示モード。`jst`（デフォルト）| `local` | `unix` | `both`。

### parts-data.json — 特例パーツ（`dynamicOverlay`）

通常の色プリセット以外の UI・キャンバス描画が必要なパーツは、パーツオブジェクトに `dynamicOverlay` を付ける。

| フィールド | 例 | 説明 |
|------------|-----|------|
| `dynamicOverlay.type` | `"datetime"` | [`game.js`](game.js) の UI / 描画レジストリが参照 |

- **`datetime`**: 枠（時刻）など。プレビュー右下に **`signature`**（任意）と時刻を **右揃え**（署名は時刻の 1 行上、saitamaar・1 秒更新）。例: 署名 `♥100%health`。公開 UI では **パーツ設定** パネル内（色プリセットの上）にモードボタン（`jst` / `local` / `unix` / `both`、ラベルなし・`aria-label` あり）。`both` は **JST と Unix 秒（小数3桁）を横並び**（右端から Unix → その左に JST）。
- 参照実装: パーツ ID `frame1-clock`（画像は `frame1.png` と共通）。

## 開発メモ

- エディタ作業は LocalStorage（`characterCreatorData`）。リセットは DevTools から削除
- ランダムの確率・件数・既定の固定は [`randomize.js`](randomize.js) 先頭の `RANDOM_CONFIG`。カテゴリ単位の上書きはエディタの「ランダム」（`categories[].random`）、「なし」扱いはパーツの「ランダムでの扱い」（`parts[].isNone`）。変更後は `node game/charamake/randomize.check.js` で確認
- **正本は index.html のみ**。HTML 構造を変えた場合、アーカイブは意図的に更新しない
- カスタム色を再度公開するとき: `index.html` の `data-hide-custom-color` を削除または `false` に
