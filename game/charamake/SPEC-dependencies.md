# 依存関係（requires / unlocks / hides）仕様書

> **ステータス**: 実装済み（hides パーツ単位対応含む）  
> **関連**: [SPEC.md](./SPEC.md)、[README.md](./README.md)  
> **実装**: [dependencies.js](./dependencies.js)、[game.js](./game.js)、[editor.js](./editor.js)

---

## 1. 概要

パーツ選択に応じて、他のカテゴリ・パーツの表示を制御する。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `requires` | string | このパーツを選ぶために必要なパーツ ID（1件） |
| `unlocks` | string[] | このパーツ選択中に**表示**するカテゴリ ID またはパーツ ID |
| `hides` | string[] | このパーツ選択中に**非表示**にするカテゴリ ID またはパーツ ID |

いずれも `parts[]` の各要素に任意で付与する。

---

## 2. `hides` の ID 解決

`hides` 配列の各要素は、次の順で種別を判定する（[dependencies.js](./dependencies.js) の `classifyHideTargetId`）。

1. `categories[].id` に一致 → **カテゴリ非表示**
2. 上記でなければ `parts[].id` に一致 → **パーツ非表示**
3. どちらにもない → 無視（エディタバリデーションで警告）

**ID 衝突**: 同じ文字列がカテゴリ ID とパーツ ID の両方にある場合、**カテゴリとして扱う**。

### 2.1 カテゴリ非表示

- 左のカテゴリ一覧から当該カテゴリを除外（`isCategoryVisible`）
- 選択状態は保持するが、一覧・描画・マスク算出からは除外（既存挙動）

### 2.2 パーツ非表示

- カテゴリ自体は一覧に残る
- 当該パーツのみパーツグリッドから除外（`isPartVisible`）
- 選択中だった場合は、表示可能な先頭パーツへ差し替え、なければ選択を削除（`sanitizeHiddenPartSelections`）

---

## 3. `unlocks` と `hides` の優先

**`unlocks` が `hides` より優先**する。

選択中のいずれかのパーツが、ある ID を `unlocks` に含めていれば、その ID は `hiddenCategoryIds` / `hiddenPartIds` の両方から除外される。

例: パーツ A が `hides: ["iris"]`、同時にパーツ B が `unlocks: ["iris"]` を持ち B が選択中 → `iris` カテゴリは表示される。

---

## 4. `unlocks` の既知制限（v1）

エディタでは `unlocks` にカテゴリ・パーツの両方を選べるが、ゲーム側の **条件付きカテゴリ表示**（`category.hidden`）は **カテゴリ ID のみ** を参照する（`isCategoryUnlocked`）。

パーツ ID を `unlocks` に書いても、通常カテゴリ内の別パーツを「出す」効果は **v1 ではない**。将来拡張の余地としてデータ形式は許容する。

---

## 5. 処理フロー（ゲーム）

`processDependencies()`（パーツ選択のたびに実行）:

1. `collectDependencySets(selectedPartIds, partsData)` で Set を集約
2. `state.hiddenByParts` / `state.hiddenPartIds` を更新
3. 新規 `unlocks` カテゴリで、未選択なら `getFirstVisiblePartInCategory` で先頭パーツを自動選択
4. `hidden: true` で未解放のカテゴリをデセレクト（選択保持設計）
5. カテゴリ `hides` 対象をデセレクト（同上）
6. `sanitizeHiddenPartSelections()` で非表示パーツの選択を修正

表示判定:

- カテゴリ: `hides`（カテゴリ）→ `hidden` + `unlocks` → `secret`（[SPEC-secrets.md](./SPEC-secrets.md)）
- パーツ: `secret` 未解放 → 非表示、`hiddenPartIds` に含まれる → 非表示

---

## 6. データ例

### カテゴリごと非表示（既存）

瞳パーツがハイライトカテゴリごと隠す:

```json
{
  "id": "pupil5",
  "hides": ["eye-highlight"]
}
```

`eye-highlight` はカテゴリ ID。

### パーツのみ非表示

上着 A 選択中、同カテゴリの上着 B だけ隠す:

```json
{
  "id": "jacket_a",
  "category": "tops",
  "hides": ["jacket_b"]
}
```

`jacket_b` はパーツ ID。`tops` カテゴリは一覧に残る。

---

## 7. エディタ

- 「表示するカテゴリ/パーツ」: `unlocks`（カテゴリ・パーツ optgroup）
- 「非表示にするカテゴリ/パーツ」: `hides`（同上）
- バリデーション: `hides` / `unlocks` の各 ID がカテゴリまたはパーツに存在するか

---

## 8. 描画・インナーグループとの関係

非表示カテゴリ・非表示パーツ（`isPartVisible` が false）は、`getVisibleSelectedPartIds` から除外され、Canvas 描画および IG の `activeMaskGroups` 算出に含めない（[SPEC-inner-groups.md](./SPEC-inner-groups.md)）。

---

## 9. スコープ外（v1）

- `hidesParts` など別フィールド
- `unlocks` によるパーツ単位の表示解放（ゲームロジック）
- 循環依存の自動検出
