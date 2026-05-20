# インナーグループ（Inner Groups）仕様書 — ドラフト

> **ステータス**: 実装済み（v1）  
> **関連**: [SPEC.md](./SPEC.md)（全体仕様）、[README.md](./README.md)（運用）  
> **バージョン**: parts-data.json v2.0 の拡張案

---

## 1. 目的

アウター（上着・コートなど）とインナー（セーラー服・制服など）を重ね着したとき、インナーの襟・袖・裾などがアウターの外側にはみ出して不自然に見える問題を防ぐ。

本機能は **専用マスク画像への差し替え** で対応する。Canvas 上での動的マスク合成は行わない。

### 1.1 解決しないこと（別手段で対応）

| 現象 | 対応 |
|------|------|
| レイヤーの前後関係（overray がアウターより手前に出る等） | 既存の `zIndex` / `blendMode` で調整 |
| 色の連動 | 既存の `colorGroup` |
| カテゴリごとの表示/非表示 | 既存の `hidden` / `unlocks` / `hides` |

---

## 2. 用語

| 用語 | 説明 |
|------|------|
| **インナーグループ（IG）** | マスク切り替えの単位。ID は `meta.innerGroups` でマスタ管理する |
| **通常画像** | レイヤーの `file`。マスクが無効なとき常に使用する |
| **マスク画像** | レイヤーの `maskedFile`。IG がマスク対象のとき `file` の**代わり**に描画する |
| **マスク対象 IG** | いずれかの着用パーツの `masksInnerGroups` に含まれ、現在「有効」になっている IG |
| **マスク指定パーツ** | `masksInnerGroups` を持つパーツ（主にアウター。中間レイヤーのアウターも可） |

---

## 3. 基本方針

1. **オプトイン** — 飛び出しの懸念があるパーツ・レイヤーだけ IG を設定する。未設定パーツは現行どおり
2. **通常画像は1系統** — `layers[].file` が通常時の唯一のソース。IG 用に別の「通常画像」は用意しない
3. **マスク画像は任意** — `maskedFile` は必要なレイヤーだけ設定する
4. **1レイヤー = 高々1つの `innerGroup`** — 同一レイヤーに複数 IG は付けない
5. **差し替えモデル** — マスク時は `file` の上に重ねるのではなく、`maskedFile` に**置き換える**

---

## 4. データ構造

### 4.1 meta.innerGroups（新規）

```json
{
  "meta": {
    "version": "2.0",
    "canvasWidth": 600,
    "canvasHeight": 845,
    "innerGroups": [
      {
        "id": "uniform_upper",
        "name": "制服・上半身"
      },
      {
        "id": "uniform_lower",
        "name": "制服・下半身"
      }
    ]
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| id | string | ✓ | IG の一意識別子（参照用） |
| name | string | ✓ | エディタ表示名 |

- `innerGroups` 省略時は空配列として扱う
- エディタではドロップダウン選択（自由入力のみは非推奨）

### 4.2 レイヤー（layers[] の拡張）

既存フィールドに加え、任意で以下を指定する。

```json
{
  "file": "parts/clothes/uniform/sailor_collar.png",
  "zIndex": 250,
  "animated": false,
  "innerGroup": "uniform_upper",
  "maskedFile": "parts/clothes/uniform/sailor_collar_masked.png"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| file | string | ✓ | 通常時の画像パス（現行どおり） |
| innerGroup | string | - | 所属 IG（`meta.innerGroups[].id`） |
| maskedFile | string | - | マスク対象時の差し替え画像。`innerGroup` があるときのみ有効 |

**ルール**

- `innerGroup` なし → 常に `file` を使用（マスクの影響を受けない）
- `innerGroup` あり・`maskedFile` なし → IG がマスク対象でも `file` のまま
- `maskedFile` あり・`innerGroup` なし → 無視（バリデーション警告）

### 4.3 パーツ — マスク指定（masksInnerGroups）

マスクを**かける側**のパーツに指定する（アウター専用フラグは必須としない。中間層のアウターも可）。

```json
{
  "id": "labcoat1",
  "name": "白衣",
  "category": "outer_tops",
  "zIndex": 380,
  "layers": [
    { "file": "parts/clothes/outer/labcoat.png" }
  ],
  "masksInnerGroups": ["uniform_upper", "uniform_lower"]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| masksInnerGroups | string[] | - | このパーツが着用されている間、マスク対象とする IG の ID 配列。**配列の順序は競合解決に使う**（後述） |

- 省略・空配列 → 他 IG をマスクしない（現行のマスク指定パーツと同様の振る舞い）

### 4.4 レイヤード（アウターが IG に属する場合）

アウターもインナーと同様、レイヤーに `innerGroup` / `maskedFile` を付けられる。

```json
{
  "id": "blazer1",
  "name": "ブレザー",
  "category": "outer_tops",
  "zIndex": 360,
  "layers": [
    {
      "file": "parts/clothes/outer/blazer.png",
      "innerGroup": "mid_layer",
      "maskedFile": "parts/clothes/outer/blazer_under_coat.png"
    }
  ],
  "masksInnerGroups": ["uniform_upper"]
}
```

- より外側のアウターが `mid_layer` を `masksInnerGroups` に含めると、ブレザーは `maskedFile` に差し替わる
- 同一パーツが「マスクする側」と「マスクされる側」の両方になりうる

---

## 5. 描画ロジック

### 5.1 activeMaskGroups の算出

着用中（選択中）の**すべてのパーツ**を走査し、`masksInnerGroups` の和集合を取る。

```
activeMaskGroups = ⋃ part.masksInnerGroups
  （part は selectedParts から列挙したすべてのパーツ）
```

- **OR 集約**: いずれか1つでも IG を指定していれば、その IG はマスク対象
- マスク指定パーツがすべて外れたら `activeMaskGroups` は空 → 全レイヤー `file`

`hides` / `unlocks` による非表示カテゴリのパーツは、既存どおり描画対象外（マスク算出にも含めない）。

### 5.2 レイヤーごとの画像パス決定

> **ポーズ差し替えとの関係**: ポーズ用の第1段解決（`poseFiles`）の**後**に、本節の IG マスク（第2段）を適用する。詳細は [SPEC-pose-files.md](./SPEC-pose-files.md)。

各レイヤーについて、描画に使うパス `resolvedFile` を次の順で決める（IG のみの場合）。

```
1. innerGroup が無い
   → resolvedFile = file

2. innerGroup があり、innerGroup ∉ activeMaskGroups
   → resolvedFile = file

3. innerGroup があり、innerGroup ∈ activeMaskGroups
   → maskedFile があれば resolvedFile = maskedFile
   → maskedFile が無ければ resolvedFile = file
```

色設定（`colors` / カスタム色）は `resolvedFile` に対して既存ロジックを適用する（現行の `getColorSettings` → `loadLayerRaster` と同様）。

### 5.3 複数 IG が同時にマスク対象 — 競合と優先度

#### 5.3.1 標準ケース（競合なし）

**1レイヤーに `innerGroup` は1つだけ**、という運用を標準とする。

例: インナー A がレイヤー1（IG①）、レイヤー2（IG②）を持つ。アウター C が `masksInnerGroups: ["uniform_upper", "uniform_lower"]` のとき、レイヤー1・2はそれぞれ独立に masked へ差し替わる。**優先度ルールは不要**。

#### 5.3.2 例外ケース（競合あり）

**同一レイヤーに複数 IG のマスクが同時に適用されうる**拡張（将来・例外的）では、次の優先度を使う。

1. 着用中の `masksInnerGroups` を持つパーツのうち、**zIndex が最大のパーツ**を「最外マスク指定パーツ」とする（同値の場合は part.id の辞書順で後ろを採用する等、実装で固定）
2. そのパーツの `masksInnerGroups` **配列を先頭から走査し、最後に出現する ID** が、そのレイヤーに紐づく `innerGroup` と一致するときに採用（**後勝ち**）

例:

```json
"masksInnerGroups": ["uniform_upper", "uniform_lower"]
```

→ 同一レイヤーで upper / lower が競合するとき **lower が勝つ**。

```json
"masksInnerGroups": ["uniform_lower", "uniform_upper"]
```

→ **upper が勝つ**。

**v1 実装の推奨**: 1レイヤー1 IG のみサポートし、5.3.2 の競合解決は実装しない（エディタで1レイヤー1 IG を強制）。必要になった段階で 5.3.2 を追加する。

### 5.4 zIndex との関係

- マスクは **ファイル差し替えのみ**。`zIndex` は変更しない
- overray 用の高 `zIndex` レイヤーは、IG / `maskedFile` を付けない運用もできる（形状は `file`、順序は zIndex で調整）

---

## 6. シナリオ例

### 6.1 レイヤード（中間アウター + 最外アウター）

| パーツ | IG（所属） | masksInnerGroups |
|--------|------------|------------------|
| インナー A（セーラー襟） | レイヤー: `uniform_upper` | — |
| アウター B（ブレザー） | レイヤー: `mid_layer` | `["uniform_upper"]` |
| アウター C（コート） | — | `["mid_layer"]` |

| 着用 | A | B | C |
|------|---|---|---|
| A のみ | full | — | — |
| A + B | upper→masked | full | — |
| A + B + C | upper→masked | mid_layer→masked | full |

`activeMaskGroups`: B のみ → `{upper}`、B+C → `{upper, mid_layer}`。

### 6.2 複数インナー・同一 IG

| パーツ | レイヤーと IG |
|--------|----------------|
| インナー A | L1: `uniform_upper`, L2: `uniform_lower` |
| インナー B | L1: `uniform_lower` |
| アウター C | `masksInnerGroups: ["uniform_upper", "uniform_lower"]` |

C 着用時: A の L1・L2 はそれぞれ masked（あれば）、B の L1 も lower の masked へ。同一 IG 内の複数パーツは**それぞれ独立**に差し替える。

### 6.3 マスク指定の順序（後勝ち）— 例外レイヤーのみ

インナー A の**単一レイヤー**にのみ、将来「複数 IG 参照」を入れる場合:

- C: `["uniform_upper", "uniform_lower"]` → そのレイヤーは **lower** の `maskedFile`
- C: `["uniform_lower", "uniform_upper"]` → そのレイヤーは **upper** の `maskedFile`

---

## 7. エディタ仕様（実装済み v1）

### 7.1 meta 編集

- メタデータ編集画面で `innerGroups` の CRUD（id, name）
- 保存時に `validateInnerGroupData` で警告

### 7.2 レイヤー編集

| UI | 内容 |
|----|------|
| 画像パス | 必須（現行どおり `file`） |
| インナーグループ | ドロップダウン（任意） |
| マスク画像 | パス入力 + 参照（`innerGroup` 選択時のみ有効） |

### 7.3 パーツ編集 — マスク指定

| UI | 内容 |
|----|------|
| マスク指定パーツ | チェックで `masksInnerGroups` セクション表示 |
| 対象 IG | `meta.innerGroups` から複数行で追加・削除 |

### 7.4 プレビュー

- **他パーツと重ねて表示** ON 時: `inner-groups.js` と同ロジックでマスク差し替えを反映
- 単体プレビュー: マスク指定アウターが同時に選ばれない限り `file` のまま（ゲーム側と同様）

### 7.5 バリデーション

| 警告 | 条件 |
|------|------|
| 未知の IG | `innerGroup` / `masksInnerGroups` が `meta.innerGroups` に存在しない |
| 孤立 maskedFile | `maskedFile` があるが `innerGroup` がない |
| 空の masksInnerGroups | マスク指定 ON だが配列が空 |
| 未使用 IG | どのレイヤー・パーツからも参照されない IG |

---

## 8. ゲーム本体（game.js）への影響（実装時）

1. `collectAllLayers` / `addPartLayers` で `resolvedFile` を算出してからレイヤー列に載せる
2. `activeMaskGroups` はプレビュー更新・パーツ選択変更のたびに再計算
3. `character.json` の保存形式は**変更不要**（パーツ ID のみ保存し、マスクは着用状態から導出）
4. 既存パーツ（IG なし）は現行コードパスと同一の結果になること

---

## 9. 後方互換性

| 項目 | 互換 |
|------|------|
| IG 未設定のパーツ | 現行どおり `file` のみ |
| `meta.innerGroups` 省略 | 空として扱う |
| `masksInnerGroups` 省略 | マスク指定なし |
| 既存 `parts-data.json` | そのまま読込可能 |

---

## 10. 制限とトレードオフ

1. **1 IG につきマスク画像は1種類** — アウターごとに切り口の違うマスクが必要な場合は、IG を細分化するか、組み合わせを割り切る
2. **マスクは形状の差し替え** — 前後関係の破綻は `zIndex` で別途調整
3. **制作** — はみ出しうるレイヤーだけ `maskedFile` を追加する運用を想定

---

## 11. 将来拡張（本ドラフトの範囲外）

- 同一レイヤー複数 IG と 5.3.2 の正式サポート
- `(outerPartId, innerGroupId) → maskedVariantId` の組み合わせ別マスク
- エディタでのマスクシミュレーション専用 UI
- `category` 単位のデフォルト IG

---

## 12. 実装ファイル

| ファイル | 役割 |
|----------|------|
| [inner-groups.js](inner-groups.js) | 共有ロジック |
| [game.js](game.js) | 着せ替えゲーム描画 |
| [editor.js](editor.js) | エディタ UI・プレビュー・バリデーション |

## 13. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-05-20 | v1 実装（game / editor / inner-groups.js） |
| 2026-05-20 | 初版ドラフト（会話での設計合意を文書化） |
