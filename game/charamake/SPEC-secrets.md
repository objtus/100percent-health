# シークレット解放（Secrets）仕様書

> **ステータス**: 実装済み（v1）  
> **関連**: [SPEC.md](./SPEC.md)、[README.md](./README.md)

---

## 1. 目的

パスワード入力で、通常は非表示のカテゴリ・パーツ（シークレット束）を解放する。イベント・裏要素・おまけ向け。

**本機能は厳密なセキュリティではない**（クライアント完結、`parts-data.json` はブラウザに配信される）。JSON を開けばハッシュは見える。合言葉ゲームとして設計する。

---

## 2. データ構造

### 2.1 `meta.secrets[]`

```json
{
  "meta": {
    "secrets": [
      {
        "id": "event2026",
        "name": "イベント2026",
        "passwordHash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
      }
    ]
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| id | string | ✓ | 束 ID（カテゴリ/パーツの `secret` が参照） |
| name | string | - | エディタ表示名 |
| passwordHash | string | ✓ | パスワードの SHA-256（小文字 hex）。平文は JSON に保存しない |

### 2.2 カテゴリ / パーツ

```json
{ "id": "bonus", "name": "ボーナス", "secret": "event2026" }
{ "id": "rare_part", "category": "tops", "secret": "event2026" }
```

- `secret` 省略 → 常に表示
- `secret` あり → `unlockedSecrets` に含まれるときのみ表示

### 2.3 `character.json`

```json
{
  "unlockedSecrets": ["event2026"],
  "character": { "body": "body_normal", ... }
}
```

- ゲームの解放状態は **セッションのみ**（`localStorage` 不使用）
- キャラ保存・読込で `unlockedSecrets` を引き継ぐ

---

## 3. パスワード照合

- アルゴリズム: **SHA-256** → 小文字 hex 64 文字
- 実装: [secrets.js](./secrets.js) の `crypto.subtle`
- 入力は trim してからハッシュ

---

## 4. 表示判定

優先順（カテゴリ）:

1. `hides`（既存）
2. `hidden` + `unlocks`（既存）
3. `secret` 未解放 → 非表示

パーツ: `isPartVisible(part)` — `part.secret` が未解放なら一覧・描画から除外。

`hidden` / `unlocks` との **v1 併用は非推奨**（実装は独立。作者はどちらか一方の運用を推奨）。

---

## 5. 解放後の挙動

- `processSecretUnlocks()` — 新規解放されたカテゴリで、表示可能な先頭パーツを自動選択（`processDependencies` と同型）
- UI: `.secret-category` / `.secret-part`（控えめな左ボーダー・✦）

---

## 6. エディタ

- メタデータ編集で `meta.secrets` CRUD（パスワードは保存時にハッシュ化）
- カテゴリ・パーツに `secret` ドロップダウン
- エディタプレビューは **シークレットも常に表示**（作者用）

---

## 7. スコープ外（v1）

- localStorage 永続化
- URL クエリ解放
- 試行回数制限
- サーバー認証
