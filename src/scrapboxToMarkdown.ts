import parse from "@progfay/scrapbox-parser";

/**
 * ScrapboxテキストをMarkdownに変換
 */
export function scrapboxToMarkdown(text: string): string {
  const lines = text.split("\n");
  if (lines.length === 0) return "";

  const blocks = parse(text);
  const processedLines: string[] = [];

  // 最初の行はタイトルとして処理
  const titleLine = lines[0];
  processedLines.push(`# ${titleLine}`);
  processedLines.push(""); // タイトルの後に改行を追加

  // 2行目以降を処理
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Table block
    if (block.type === "table") {
      processedLines.push("");
      const rows = block.cells;
      if (rows.length > 0) {
        // Header row
        const headerCells = rows[0].map((cell) =>
          cell.map((node) => nodeToText(node)).join(""),
        );
        processedLines.push("| " + headerCells.join(" | ") + " |");
        processedLines.push(
          "| " + headerCells.map(() => "---").join(" | ") + " |",
        );

        // Data rows
        for (let j = 1; j < rows.length; j++) {
          const cells = rows[j].map((cell) =>
            cell.map((node) => nodeToText(node)).join(""),
          );
          processedLines.push("| " + cells.join(" | ") + " |");
        }
      }
      continue;
    }

    // Code block
    if (block.type === "codeBlock") {
      processedLines.push("");
      processedLines.push("```" + block.fileName);
      processedLines.push(block.content);
      processedLines.push("```");
      continue;
    }

    // Line block
    if (block.type === "line") {
      const indent = block.indent;
      const content = block.nodes.map((node) => nodeToMarkdown(node)).join("");

      if (content.trim()) {
        if (indent > 0) {
          processedLines.push("  ".repeat(indent) + "- " + content);
        } else {
          processedLines.push(content);
        }
      } else {
        processedLines.push("");
      }
    }
  }

  return processedLines.join("\n");
}

/**
 * Scrapbox NodeをMarkdown形式に変換
 */
function nodeToMarkdown(node: any): string {
  switch (node.type) {
    case "plain":
      return node.text;

    case "strong":
      // [** text] または [* text] → **text**
      return `**${node.nodes.map((n: any) => nodeToMarkdown(n)).join("")}**`;

    case "italic":
      // [/ text] → *text*
      return `*${node.nodes.map((n: any) => nodeToMarkdown(n)).join("")}*`;

    case "strike":
      // [- text] → ~~text~~
      return `~~${node.nodes.map((n: any) => nodeToMarkdown(n)).join("")}~~`;

    case "code":
      // [`code`] → `code`
      return `\`${node.text}\``;

    case "link":
      // 画像判定
      if (
        node.pathType === "absolute" &&
        /\.(png|jpg|jpeg|gif|webp)$/i.test(node.href)
      ) {
        return `![](${node.href})`;
      }
      // Gyazo画像
      if (node.href.startsWith("https://gyazo.com/")) {
        if (node.content) {
          return `[![${node.content}](${node.href})](${node.href})`;
        }
        return `![](${node.href})`;
      }
      // リンク（テキスト付き）
      if (node.content && node.content !== node.href) {
        return `[${node.content}](${node.href})`;
      }
      // シンプルなリンク
      return `[${node.href}](${node.href})`;

    case "image":
      // [image.png] → ![](image.png)
      return `![](${node.src})`;

    case "strongImage":
      // 強調画像も通常の画像として扱う
      return `![](${node.src})`;

    case "strongIcon":
      // アイコンはリンクとして扱う
      return `[${node.pathType === "root" ? "/" : ""}${node.path}]`;

    case "icon":
      // アイコンはリンクとして扱う
      return `[${node.pathType === "root" ? "/" : ""}${node.path}]`;

    case "quote":
      // 引用は > で表現
      return `> ${node.nodes.map((n: any) => nodeToMarkdown(n)).join("")}`;

    case "helpfeel":
      // Helpfeel記法はそのまま
      return node.text;

    case "blank":
      return "";

    default:
      // その他のノードはテキストとして扱う
      if (node.text) {
        return node.text;
      }
      if (node.nodes) {
        return node.nodes.map((n: any) => nodeToMarkdown(n)).join("");
      }
      return "";
  }
}

/**
 * Scrapbox NodeをPlain Textに変換（テーブル用）
 */
function nodeToText(node: any): string {
  switch (node.type) {
    case "plain":
      return node.text;
    case "code":
      return node.text;
    case "link":
      return node.content || node.href;
    case "image":
    case "strongImage":
      return node.src;
    case "blank":
      return "";
    default:
      if (node.text) {
        return node.text;
      }
      if (node.nodes) {
        return node.nodes.map((n: any) => nodeToText(n)).join("");
      }
      return "";
  }
}
