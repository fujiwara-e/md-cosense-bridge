# md-cosense-bridge

Cosense (旧 Scrapbox) と Markdown (Obsidian) 記法を相互変換するCLIツール

## インストール

```bash
npm install
npm run build
```

## セットアップ

1. `.env`ファイルを作成し、Scrapbox Cookieを設定:

```bash
cp .env.example .env
```

2. `.env`ファイルを編集し，`COOKIE`にScrapboxの`connect.sid`の値を設定:

```
COOKIE=your_actual_cookie_value
```

### Cookieの取得方法

1. ブラウザでScrapboxにログイン
2. 開発者ツールを開く (F12)
3. Application/Storage タブ → Cookies → `https://scrapbox.io`
4. `connect.sid`の値をコピー

## 使用方法

### Export: Scrapbox → Markdown

```bash
npm start -- export <project> <page> <output.md>
```

例:

```bash
npm start -- export my-project "Page Title" output.md
```

オプションでCookieを直接指定:

```bash
npm start -- export my-project "Page Title" output.md --cookie your_cookie
```

### Import: Markdown → Scrapbox

```bash
npm start -- import <project> <page> <input.md>
```

例:

```bash
npm start -- import my-project "Page Title" input.md
```

変換結果は`input.txt`に出力されます．このファイルの内容をScrapboxページに手動でコピー&ペーストしてください．
