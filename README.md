# Beauty Passport 🌸

Hair / Nail / Lash の施術記録アプリ（Firebase版）

## URL構成

| URL | 画面 |
|---|---|
| `https://あなたのURL.vercel.app/staff` | スタッフ用（Hair/Nail/Lash切替） |
| `https://あなたのURL.vercel.app/client?salon=hair&qr=お客様のQRID` | お客様用 |

---

## セットアップ手順

### 1. Firebaseの設定

1. [Firebase Console](https://console.firebase.google.com) を開く
2. プロジェクトを選択 → 「プロジェクトの設定」
3. 「アプリを追加」→ Webアプリ（`</>`）
4. アプリ名を入力して「アプリを登録」
5. 表示された `firebaseConfig` をコピー

### 2. `src/firebase/config.js` を編集

```js
const firebaseConfig = {
  apiKey:            "ここにコピーした値を貼り付け",
  authDomain:        "...",
  projectId:         "...",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "...",
}
```

### 3. FirestoreとStorageを有効化

Firebase Console で：
- 「Firestore Database」→「データベースを作成」→「テストモード」で開始
- 「Storage」→「始める」→「テストモード」で開始

### 4. GitHubにアップロード

1. [github.com](https://github.com) で新しいリポジトリを作成
2. このフォルダの中身を全部アップロード

### 5. Vercelで公開

1. [vercel.com](https://vercel.com) でGitHubアカウントでログイン
2. 「New Project」→ リポジトリを選択
3. Framework: **Vite**
4. 「Deploy」→ 完了！

---

## 使い方

### スタッフ
- `/staff` にアクセス
- お客様を登録 → 施術記録を追加 → QRコードでお客様に共有

### お客様
- スタッフから受け取ったリンクをタップ
- パスコードを入力 → 施術記録を閲覧・写真追加
