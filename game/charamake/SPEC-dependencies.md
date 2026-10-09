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

## 5. 依存関係フィード（ゲーム UI）

プレビュー直下に最大 **3 行** のメッセージを表示する（初回読込・キャラ読込直後の `processDependencies` では出さない）。

| 変化 | 表示例 |
|------|--------|
| カテゴリ解放（`unlocks`） | 「虹彩」が表示されました |
| カテゴリ非表示（`hides`） | 「ハイライト」が非表示になりました |
| カテゴリ再表示 | 「ハイライト」が再表示されました |
| パーツ非表示（`hides`） | 「制服B」が選べなくなりました |
| パーツ再表示 | 「制服B」が選べるようになりました |
| グレーアウトしたパーツをクリック | 「ジャケット1」を選択中のため「制服B」は選べません |

---

## 6. 処理フロー（ゲーム）

`processDependencies()`（パーツ選択のたびに実行）:

1. [`dependencies.js`](./dependencies.js) の `resolveSelection()` で **表示中の選択のみ**から `unlocks` / `hides` を集約し、新規 unlock の先頭パーツ自動選択・非表示パーツ差し替えを **固定点まで反復**（非表示カテゴリの選択は保持され、再表示で元に戻る）
2. `state.hiddenByParts` / `state.hiddenPartIds` / `state.selectedParts` を結果で更新

**プレイ UI**: `hidden: true` の修飾カテゴリは左のカテゴリ一覧に出さず、unlock 元を選んだとき **パーツ設定** ペイン内でパーツを選ぶ（[`index.html`](./index.html) / [`game.js`](./game.js)）。

表示判定:

- カテゴリ: `hides`（カテゴリ）→ `hidden` + `unlocks` → `secret`（[SPEC-secrets.md](./SPEC-secrets.md)）
- パーツ: `secret` 未解放 → 非表示、`hiddenPartIds` に含まれる → 非表示

一覧での見せ方（プレビュー・ランダムの判定は上記のまま）:

- `hides` で非表示のカテゴリ: 左一覧に **グレー + 「非表示中」バッジ** で残す。開くとパーツ一覧上部に原因パーツ名を表示し、パーツはすべてグレー（選択不可）。保持中の選択は薄い選択枠で示す。表示中のカテゴリが隠れても別カテゴリへ移動しない
- `hides` で非表示のパーツ: 一覧の並びを保ったまま **グレー（選択不可）**。クリックでフィードに原因パーツ名を表示
- 原因パーツ名は、表示中の選択パーツの `hides` を逆引きして求める（`getHideSourceParts`）
- お知らせ・フィード内の原因パーツ名はリンク。押すとそのパーツのカテゴリを開き、一覧の項目を強調する（同じカテゴリならスクロールして強調のみ。修飾カテゴリのパーツは親カテゴリのパーツ設定内を強調）

---

## 7. データ例

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

## 8. エディタ

- 「表示するカテゴリ/パーツ」: `unlocks`（カテゴリ・パーツ optgroup）
- 「非表示にするカテゴリ/パーツ」: `hides`（同上）
- バリデーション: `hides` / `unlocks` の各 ID がカテゴリまたはパーツに存在するか。`unlocks` にパーツ ID がある場合は、打ち消す `hides`（どのパーツのものか）を警告に出す

---

## 9. 描画・インナーグループとの関係

非表示カテゴリ・非表示パーツ（`isPartVisible` が false）は、`getVisibleSelectedPartIds` から除外され、Canvas 描画および IG の `activeMaskGroups` 算出に含めない（[SPEC-inner-groups.md](./SPEC-inner-groups.md)）。

---

## 10. スコープ外（v1）

- `hidesParts` など別フィールド
- `unlocks` によるパーツ単位の表示解放（ゲームロジック）
- 循環依存の自動検出
