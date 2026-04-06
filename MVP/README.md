# MVP HTML Prototype

静的HTMLプロトタイプ（バックエンドなし）。ANZ Plus iOS アプリを参考にしたモバイルファーストデザイン。

## ディレクトリ構成

```
MVP/
├── README.md
├── styles.css              ← モバイルファーストCSS（ANZ Plus デザイン参照）
├── mvp.js                  ← ロール/ナビ/ボトムタブバー 共通ヘルパー
│
├── index.html              ← 入口（管理者/利用者の選択）
├── login.html              ← 管理者ログイン
├── user-login.html         ← 利用者ログイン
├── user-signup.html        ← 利用者新規登録
│
├── case-detail.html        ← 案件詳細（role パラメータで Admin/User を切替）
├── inbox.html              ← 受信箱一覧
├── inbox-thread.html       ← メッセージスレッド
├── vendors.html            ← 取引先
├── attachment-preview.html ← 添付ファイルプレビュー
├── sitemap.html            ← 画面一覧（クライアント向け）
│
├── admin/
│   ├── admin-cases.html        ← 管理者：案件一覧
│   ├── admin-case-detail.html  ← → case-detail.html へリダイレクト
│   └── status-update.html      ← 管理者：ステータス更新
│
└── user/
    ├── user-cases.html             ← 利用者：案件一覧
    ├── user-new-case.html          ← 利用者：新規依頼
    └── user-case-detail-upload.html ← → case-detail.html へリダイレクト
```

## 使い方

1. ブラウザで `MVP/index.html` を開く
2. 「利用者ログイン」または「管理者ログイン」を選択
3. 各画面のナビゲーションで機能を確認する

## ナビゲーション構造

| 画面 | URL |
|------|-----|
| 入口 | `index.html` |
| 利用者ログイン | `user-login.html` |
| 利用者登録 | `user-signup.html` |
| 管理者ログイン | `login.html` |
| 管理者 案件一覧 | `admin/admin-cases.html?role=admin&org=元請け` |
| 利用者 案件一覧 | `user/user-cases.html?role=user&org=Honda（例）` |
| 案件詳細（共通） | `case-detail.html?role=admin&caseId=000012` |
| 受信箱 | `inbox.html?role=user&org=Honda（例）` |
| 画面一覧 | `sitemap.html` |

## レスポンシブ対応

- **モバイル（< 900px）**: 固定上部ヘッダー + ボトムタブバー（ANZ Plus スタイル）
- **デスクトップ（≥ 900px）**: サイドバーナビ + トップナビ（SaaS スタイル）

## 注意事項

- バックエンドなし。添付ファイルは保存されません。
- URL クエリパラメータ `role`・`org`・`caseId` でデータを渡しています。
