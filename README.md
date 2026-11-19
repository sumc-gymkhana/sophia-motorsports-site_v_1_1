# 上智大学自動車部 公式サイト
## 更新方法（HTML編集は不要）
- 写真追加: `images/album/` に画像を置き、`data/gallery.json` に1件追加（`"featured": true` でトップの「注目記事」に表示）
- 部員 / 車両 / 活動 / 戦績: `data/*.json` に追記し、画像は `images/*/` へ
- メニュー・連絡先・メールアドレス: `js/main.js` 冒頭の `NAV` / `SITE` のみ編集
- 日付は `YYYY-MM-DD`。画像がない場合は代替画像が出ます。
## 公開前に
- 全HTMLの `https://YOUR-DOMAIN` を実際の公開URLに置換（OGP/canonical用）
- `images/hero/hero.jpg`（トップ画像・OGP画像）を設置
- `file://` ではJSONが読めません。確認は `python3 -m http.server` など経由で。
