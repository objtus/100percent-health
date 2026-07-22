# 100% Health — 個人サイト

**URL**: https://yuinoid.neocities.org/
**ソース**: `/workspace/100percent-health/`（git管理）
**最終コミット**: `7b92ad1` "Update introduction page layout and content"
**未ステージ変更**: 多数（300+ファイルに変更あり）

## サイト構成

```
100percent-health/
├── index.html          トップページ
├── aboutme.html        プロフィール
├── style.css           メインCSS
├── 1column.css         1カラム用CSS
├── gallery/            画像ギャラリー（システム＋画像ページ＋タグ）
├── txt/                文書（自己紹介・年表・メモ・雑記等）
│   ├── txt_main.html
│   ├── zakki/          雑記（月別アーカイブ）
│   ├── generations/    ジェネレーションズ年表
│   └── profile.html
├── works/              作品一覧
├── links/              リンク集（相互リンク・お気に入り等）
├── game/               ゲーム（charamake キャラメイク他）
├── dashboard/          自分用ダッシュボード（Misskey等）
├── planet/             連合タイムラインページ
├── guestbook/          ゲストブック
├── misc/               その他
├── include/            共通コンポーネント（ヘッダ・フッタ等）
├── js/                 JavaScript
├── img/                画像リソース
├── scripts/            ビルドスクリプト（Python）
├── rss.xml             RSSフィード
└── update-rss.sh       RSS更新用スクリプト
```

## メモ
- `txt/100phealth_introduction.html` が最近更新された（最新コミット）
- 大量の未ステージ変更がある（おそらく開発/編集作業の途中）
- node_modules/ と .gitignore が肥大（92KB）
- ギャラリーの画像ページが gallery/image-page/ と gallery/image-page_/ の2系統ある
- `planet/` は自分のPlanet/連合タイムラインページ