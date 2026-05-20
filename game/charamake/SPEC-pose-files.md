# ポーズ差し替え（Pose Files）仕様書

> **ステータス**: 実装済み（v1）  
> **関連**: [SPEC.md](./SPEC.md)、[SPEC-inner-groups.md](./SPEC-inner-groups.md)（インナーグループ / 服の重ね着マスク）

---

## 1. 目的

体型（基本 → 体型）の選択に応じて、手・袖などのレイヤー画像を差し替え、長袖と手の接続がずれないようにする。

- **トリガー**: 選択中の `body` カテゴリパーツの `poseId`
- **`meta.poseGroups` は作らない**（体型の `poseId` とレイヤーの `poseFiles` キーで足りる）
- **ゲーム UI にポーズ専用セレクターは付けない**（体型選択で間接的に決まる）

### 1.1 インナーグループ（IG）との関係

| 軸 | トリガー | レイヤーフィールド |
|----|----------|-------------------|
| ポーズ | 体型パーツ `poseId` | `poseFiles`, `poseMaskedFiles` |
| IG マスク | 着用パーツ `masksInnerGroups` | `innerGroup`, `maskedFile` |

**解決順は常にポーズ → IG マスク（2段階）**。詳細は §5。

`alternatives` マップ方式は v1 では採用しない（将来の例外用）。

---

## 2. データ構造

### 2.1 体型パーツ（`category: "body"`）

```json
{
  "id": "body_peace",
  "name": "通常体型 (ピース)",
  "category": "body",
  "poseId": "peace",
  "layers": [ ... ]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| poseId | string | - | 省略・空 → ポーズ未指定。他レイヤーの `poseFiles` / `poseMaskedFiles` のキーと一致させる |

### 2.2 レイヤー（layers[] の拡張）

```json
{
  "file": "parts/clothes/sleeve_default.png",
  "poseFiles": {
    "peace": "parts/clothes/sleeve_peace.png"
  },
  "innerGroup": "uniform_upper",
  "maskedFile": "parts/clothes/sleeve_masked.png",
  "poseMaskedFiles": {
    "peace": "parts/clothes/sleeve_peace_masked.png"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| file | string | ✓ | 通常時（ポーズ未指定時）の画像 |
| poseFiles | object | - | キー = `poseId`、値 = 画像パス |
| poseMaskedFiles | object | - | ポーズ + IG マスク両方時。`innerGroup` があるときのみ有効 |

### 2.3 character.json

変更なし。`body: "body_peace"` の選択が `poseId` を間接的に決める。

---

## 3. 作者向けチェックリスト（レイヤーごと）

| 服のパターン | 必要フィールド |
|-------------|----------------|
| 通常のみ | `file` |
| タイト長袖（ポーズのみ） | `file` + `poseFiles` |
| 大きい半袖（IG のみ） | `file` + `innerGroup` + `maskedFile` |
| ポーズ + IG 両方 | 上記 + `poseMaskedFiles` |
| 袖なし下着など | `file` のみ |

---

## 4. activePoseId の算出

着用中（選択中）のパーツ ID 一覧から、`category === "body"` のパーツを探し、その `poseId` を返す。

- 未選択・`poseId` 省略 → `null`（第1段は常に `file`）
- 複数 body は想定しない（`body` は single 選択）

---

## 5. 描画ロジック（2段階解決）

実装: [layer-resolve.js](./layer-resolve.js) の `resolveLayerFile(layer, { poseId, activeMaskGroups })`

```
第1段（ポーズ）:
  path = file
  if poseId かつ poseFiles[poseId] があれば path = poseFiles[poseId]

第2段（IG マスク）:
  if innerGroup があり innerGroup ∈ activeMaskGroups:
    if poseId かつ poseMaskedFiles[poseId] があれば return それ
    if maskedFile があれば return maskedFile
  return path
```

`activeMaskGroups` の算出は [SPEC-inner-groups.md](./SPEC-inner-groups.md) §5.1 と同じ（`computeActiveMaskGroups`）。

色設定は **解決後のパス** に既存ロジックを適用する。

---

## 6. エディタ

- 体型パーツ: 基本情報に `poseId` 入力
- レイヤー: `poseFiles` 行の追加・削除、IG 選択時のみ `poseMaskedFiles`
- 単体プレビュー: 「プレビュー用ポーズ」ドロップダウン（`collectKnownPoseIds`）
- 「他パーツと重ね表示」ON: `body` カテゴリの選択を `activePoseId` に優先使用

---

## 7. バリデーション（警告）

- `poseMaskedFiles` があるが `innerGroup` なし
- `poseFiles` / `poseMaskedFiles` のキーが、いずれの `body.poseId` にも存在しない（孤立キー）
- `poseId` がある体型だが、プロジェクト内にそのキーの `poseFiles` が1つもない（情報）

---

## 8. スコープ外（v1）

- `alternatives` マップ
- `meta.poseGroups` マスタ
- ゲーム側ポーズ専用 UI
- Canvas `rotate` による連続角度
- `character.json` への `poseId` 直書き
