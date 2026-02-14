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
  let currentTableName = "imported_table";
  let tableIndent = ""; // テーブルのインデントレベルを保持

  // Pre-scan to find minimum list indent per block
  const listBlockMinIndents: Map<number, number> = new Map();
  let currentBlockStart = -1;
  let minIndentInBlock = Infinity;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^(\s*)([-*])\s(.*)/);

    if (listMatch) {
      const indent = listMatch[1].length;
      if (currentBlockStart === -1) {
        currentBlockStart = i;
        minIndentInBlock = indent;
      } else {
        minIndentInBlock = Math.min(minIndentInBlock, indent);
      }
    } else if (currentBlockStart !== -1 && line.trim() !== "") {
      // End of list block
      for (let j = currentBlockStart; j < i; j++) {
        listBlockMinIndents.set(j, minIndentInBlock);
      }
      currentBlockStart = -1;
      minIndentInBlock = Infinity;
    }
  }
  // Handle last block
  if (currentBlockStart !== -1) {
    for (let j = currentBlockStart; j < lines.length; j++) {
      listBlockMinIndents.set(j, minIndentInBlock);
    }
  }

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

    // Check for table name in HTML comment
    const tableNameMatch = line.match(/^(\s*)<!--\s*table:(.+?)\s*-->$/);
    if (tableNameMatch) {
      tableIndent = tableNameMatch[1]; // インデントを保存
      currentTableName = tableNameMatch[2];
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
        // テーブルの開始時にインデントを保存（まだ保存されていない場合）
        if (!tableIndent) {
          const leadingSpaces = line.match(/^(\s*)/);
          tableIndent = leadingSpaces ? leadingSpaces[1] : "";
        }
        inTable = true;
        tableRows.push(cells.join("\t"));
      } else {
        tableRows.push(cells.join("\t"));
      }
      continue;
    }

    if (inTable) {
      // テーブルのインデントがない場合、デフォルトでスペース1つを追加
      const finalIndent = tableIndent || " ";
      processedLines.push(finalIndent + `table:${currentTableName}`);
      processedLines.push(...tableRows.map((row) => finalIndent + "\t" + row));
      inTable = false;
      tableRows.length = 0;
      currentTableName = "imported_table"; // リセット
      tableIndent = ""; // インデントをリセット
    }

    // Inline element conversion (order is important)

    // Images: ![alt](url) → [url]
    line = line.replace(/!\[[^\]]*\]\(([^)]+)\)/g, "[$1]");

    // Links: [text](url)
    // Special case: [link](link) → [link]
    line = line.replace(/\[([^\]]+)\]\(\1\)/g, "[$1]");
    // General case: [text](url) → [text url] (Scrapbox形式)
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
      // h2 → [**], h3 → [*], h4+ → [**]
      if (level === 2) {
        processedLines.push(`[** ${title}]`);
      } else {
        processedLines.push(`[* ${title}]`);
      }
      continue;
    }

    // List processing
    const listMatch = line.match(/^(\s*)([-*])\s(.*)/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const minIndent = listBlockMinIndents.get(i) || 0;

      // Convert markdown list to scrapbox indented line
      // Calculate relative indent from the minimum indent in the block
      // Markdown uses 2 spaces per level, Scrapbox uses 1 space per level
      // Scrapbox requires at least 1 space for list items
      const relativeIndent = indent - minIndent;
      const scrapboxIndent = Math.floor(relativeIndent / 2) + 1;

      processedLines.push(" ".repeat(scrapboxIndent) + listMatch[3]);
      continue;
    }

    processedLines.push(line);
  }

  // Process any remaining table
  if (inTable) {
    // テーブルのインデントがない場合、デフォルトでスペース1つを追加
    const finalIndent = tableIndent || " ";
    processedLines.push(finalIndent + `table:${currentTableName}`);
    processedLines.push(...tableRows.map((row) => finalIndent + "\t" + row));
  }

  return processedLines.join("\n");
}
