/**
 * MarkdownテキストをScrapboxに変換
 */
export function markdownToScrapbox(text: string): string {
  const lines = text.split("\n");
  const processedLines: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  const codeBlockContent: string[] = [];
  let codeBlockLang = "";
  const tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code block processing
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        processedLines.push(`code:${codeBlockLang}`);
        processedLines.push(...codeBlockContent.map((row) => " " + row));
        inCodeBlock = false;
        codeBlockContent.length = 0;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().substring(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Table processing
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());

      // Skip header separator line
      if (cells.every((c) => /^-+$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableRows.push(cells.join("\t"));
      } else {
        tableRows.push(cells.join("\t"));
      }
      continue;
    }

    if (inTable) {
      processedLines.push("table:imported_table");
      processedLines.push(...tableRows.map((row) => "\t" + row));
      inTable = false;
      tableRows.length = 0;
    }

    // Inline element conversion (order is important)

    // Images: ![alt](url) → [url]
    line = line.replace(/!\[[^\]]*\]\(([^)]+)\)/g, "[$1]");

    // Links: [text](url)
    // Special case: [link](link) → [link]
    line = line.replace(/\[([^\]]+)\]\(\1\)/g, "[$1]");
    // General case: [text](url) → [text url]
    line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "[$1 $2]");

    // Bold: **text** → [** text]
    line = line.replace(/\*\*(.+?)\*\*/g, "[** $1]");

    // Italics: *text* → [/ text]
    line = line.replace(/\*(.+?)\*/g, "[/ $1]");

    // Strikethrough: ~~text~~ → [- text]
    line = line.replace(/~~(.+?)~~/g, "[- $1]");

    // Inline code: `code` → [`code`]
    line = line.replace(/`(.+?)`/g, "[`$1`]");

    // Heading processing
    if (i === 0 && line.startsWith("# ")) {
      processedLines.push(line.substring(2));
      continue;
    }

    const headingMatch = line.match(/^(#+)\s(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];
      processedLines.push(`[${"*".repeat(level)} ${title}]`);
      continue;
    }

    // List processing
    const listMatch = line.match(/^(\s*)([-*])\s(.*)/);
    if (listMatch) {
      const indent = listMatch[1].length;
      // Convert markdown list to scrapbox indented line
      // Markdown uses 2 spaces per level, Scrapbox uses 1 space per level
      const scrapboxIndent = Math.floor(indent / 2) + 1;
      processedLines.push(" ".repeat(scrapboxIndent) + listMatch[3]);
      continue;
    }

    processedLines.push(line);
  }

  // Process any remaining table
  if (inTable) {
    processedLines.push("table:imported_table");
    processedLines.push(...tableRows.map((row) => "\t" + row));
  }

  return processedLines.join("\n");
}
