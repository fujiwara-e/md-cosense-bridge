# md2cosense

ScrapboxとMarkdown(Obsidian)記法を相互変換するCLIツール

## インストール

```bash
npm install
npm run build
npm link
```

## セットアップ

1. `.env`ファイルを作成し、Scrapbox Cookieを設定:

```bash
cp .env.example .env
```

2. `.env`ファイルを編集し、`COOKIE`にScrapboxの`connect.sid`の値を設定:

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
md2cosense export <project> <page> <output.md>
```

例:

```bash
md2cosense export my-project "Page Title" output.md
```

オプションでCookieを直接指定:

```bash
md2cosense export my-project "Page Title" output.md --cookie your_cookie
```

### Import: Markdown → Scrapbox

```bash
md2cosense import <project> <page> <input.md>
```

例:

```bash
md2cosense import my-project "Page Title" input.md
```

変換結果は`input.txt`に出力されます。このファイルの内容をScrapboxページに手動でコピー&ペーストしてください。

## 変換仕様

### Scrapbox → Markdown

- `[** text]`, `[* text]` → `**text**` (太字)
- `[/ text]` → `*text*` (イタリック)
- `[- text]` → `~~text~~` (取り消し線)
- ``[`code`]`` → `` `code` `` (インラインコード)
- `[link]` → `[link](link)` (リンク)
- `[text url]` → `[text](url)` (テキスト付きリンク)
- `[image.png]` → `![](image.png)` (画像)
- インデント → Markdownリスト
- `table:` → Markdownテーブル
- `code:lang` → コードブロック

### Markdown → Scrapbox

- `**text**` → `[** text]`
- `*text*` → `[/ text]`
- `~~text~~` → `[- text]`
- `` `code` `` → ``[`code`]``
- `[text](url)` → `[text url]`
- `[link](link)` → `[link]`
- `![alt](url)` → `[url]`
- Markdownリスト → インデント
- Markdownテーブル → `table:imported_table`
- コードブロック → `code:lang`

## 開発

```bash
# TypeScript実行 (開発用)
npm run dev

# ビルド
npm run build

# 実行
npm start
```
