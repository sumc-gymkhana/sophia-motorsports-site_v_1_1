# 上智大学自動車部 公式サイト
## 更新方法（HTML編集は不要）
- News（ブログ）記事: `data/news.json` に1件追加（`parentId` で親子記事、`"featured": true` でトップの「注目記事」）
- ギャラリー: `images/gallery/イベントID/` に写真を置き、`data/gallery.json` にイベントを1件追加
- 記事・ギャラリー追加後は `tools/build.bat`（`python tools/build.py`）で SEO用ページと `sitemap.xml` を更新
- 部員 / 車両 / 活動 / 戦績: `data/*.json` に追記し、画像は `images/*/` へ
- メニュー・連絡先・メールアドレス: `js/main.js` 冒頭の `NAV` / `SITE` のみ編集
- 日付は `YYYY-MM-DD`。画像がない場合は代替画像が出ます。
## 公開前に
- 全HTMLと `data/site.json` の `https://YOUR-DOMAIN` を実際の公開URLに置換（OGP/canonical用）→ `tools/build.py` を再実行
- `images/hero/hero.jpg`（トップ画像・OGP画像）を設置
- `file://` ではJSONが読めません。確認は `python3 -m http.server` など経由で。
