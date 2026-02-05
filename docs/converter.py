#!/usr/bin/env python3
import sys
import requests
import re
import json
from urllib.parse import quote
import os
from dotenv import load_dotenv

def get_cookie_from_env():
    """環境変数または.envファイルからCOOKIEを取得"""
    load_dotenv()
    return os.getenv("COOKIE")

def get_page_text(project_name, page_title, cookie=None):
    """Scrapboxからページのテキストを取得"""
    if cookie is None:
        cookie = get_cookie_from_env()
    encoded_title = quote(page_title)
    url = f"https://scrapbox.io/api/pages/{project_name}/{encoded_title}/text"
    print(f"Requesting: {url}")
    
    headers = {}
    if cookie:
        headers['Cookie'] = f'connect.sid={cookie}'
    
    response = requests.get(url, headers=headers)
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        return response.text
    else:
        print(f"Response content: {response.text}")
        print(f"Error: Failed to get page {page_title} from {project_name}")
        return None

def _convert_scrapbox_brackets(match):
    content = match.group(1)

    # 1. Decoration (bold, italic, strikethrough)
    bold_match = re.match(r'\*\*? (.*)', content)
    if bold_match:
        return f"**{bold_match.group(1)}**"
    if content.startswith('/ '):
        return f"*{content[2:]}*"
    if content.startswith('- '):
        return f"~~{content[2:]}~~"

    # 2. Code
    if content.startswith('`') and content.endswith('`'):
        return f"`{content[1:-1]}`"

    # 3. Image
    if re.match(r'.*\.(png|jpg|jpeg|gif|webp)$', content, re.IGNORECASE):
        return f'![]({content})'
    gyazo_match = re.match(r'(https?://gyazo.com/\w+)', content)
    if gyazo_match:
        url_part = gyazo_match.group(1)
        text_part = content.replace(url_part, '').strip()
        if text_part:
             return f'[![{text_part}]({url_part})]({url_part})'
        return f'![]({url_part})'

    # 4. Link with text (annotated link)
    parts = content.split()
    if len(parts) > 1 and (parts[-1].startswith('http') or parts[-1].startswith('/')):
        url = parts[-1]
        text = ' '.join(parts[:-1])
        return f'[{text}]({url})'

    # 5. Simple link
    return f'[{content}]({content})'

def scrapbox_to_markdown(text):
    """ScrapboxテキストをMarkdownに変換"""
    lines = text.splitlines()
    if not lines:
        return ""

    processed_lines = []
    # 最初の行はタイトルとして処理
    title_line = lines[0]
    processed_lines.append(f'# {title_line}')
    processed_lines.append('')  # タイトルの後に改行を追加

    i = 1  # 2行目から処理を開始
    while i < len(lines):
        line = lines[i]

        # テーブル記法の処理
        if re.sub('[\u3000]', ' ', line).strip().startswith('table:'):
            table_data = []
            i += 1  # 'table:' の行をスキップ

            # 次の行が存在し、インデントで始まっているか確認
            if i < len(lines) and lines[i] and lines[i][0] in (' ', '\t', '\u3000'):
                # 最初のデータ行のインデントを基準とする（全角スペースも含む）
                first_data_line = lines[i]
                indent_match = re.match(r'^([ \t\u3000]+)', first_data_line)
                indent_prefix = indent_match.group(1) if indent_match else ''

                # 同じインデントが続く限りテーブルデータとして収集
                while i < len(lines) and lines[i].startswith(indent_prefix):
                    table_data.append(lines[i])
                    i += 1
            
            if table_data:
                processed_lines.append('')  # テーブルの前に改行を追加
                header_cells = table_data[0].strip().split('\t')
                processed_lines.append('| ' + ' | '.join(header_cells) + ' |')
                processed_lines.append('| ' + ' | '.join(['---' for _ in header_cells]) + ' |')
                for row in table_data[1:]:
                    cells = row.strip().split('\t')
                    processed_lines.append('| ' + ' | '.join(cells) + ' |')
            
            # 消費した行については通常の処理をスキップ
            continue

        # 通常の行の処理
        converted_line = re.sub(r'\[([^\]]+)\]', _convert_scrapbox_brackets, line)

        # 全角スペースも半角スペースに変換してからインデント判定
        line_expanded_tabs = re.sub('[\u3000]', ' ', converted_line).expandtabs(4)
        indent_level = len(line_expanded_tabs) - len(line_expanded_tabs.lstrip(' '))
        # lstripで全角スペースも除去
        content = re.sub(r'^[ \t\u3000]+', '', converted_line)

        if content:
            if indent_level > 0:
                processed_lines.append('  ' * (indent_level // 2) + '- ' + content)
            else:
                processed_lines.append(content)
        else:
            processed_lines.append('')
        
        i += 1

    return '\n'.join(processed_lines)

def markdown_to_scrapbox(text):
    """MarkdownテキストをScrapboxに変換"""
    lines = text.splitlines()
    processed_lines = []
    in_code_block = False
    in_table = False
    code_block_content = []
    code_block_lang = ""
    table_rows = []

    for i, line in enumerate(lines):
        # Code block processing
        if line.strip().startswith('```'):
            if in_code_block:
                processed_lines.append(f'code:{code_block_lang}')
                processed_lines.extend([' ' + row for row in code_block_content])
                in_code_block = False
                code_block_content = []
            else:
                in_code_block = True
                code_block_lang = line.strip()[3:]
            continue
        
        if in_code_block:
            code_block_content.append(line)
            continue

        # Table processing
        if line.strip().startswith('|') and line.strip().endswith('|'):
            cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
            if not in_table:
                # Skip header separator line
                if all('---' in c for c in cells):
                    continue
                in_table = True
                table_rows.append('\t'.join(cells))
            else:
                 # Skip header separator line
                if all('---' in c for c in cells):
                    continue
                table_rows.append('\t'.join(cells))
            continue

        if in_table:
            processed_lines.append('table:imported_table')
            processed_lines.extend(['\t' + row for row in table_rows])
            in_table = False
            table_rows = []
        
        # Inline element conversion (order is important)
        # Images: ![alt](url) -> [url]
        line = re.sub(r'!\[[^\]]*\]\(([^)]+)\)', r'[\1]', line)
        # Links: [text](url) -> [text url], but [link](link) -> [link]
        line = re.sub(r'\[([^\]]+)\]\(\1\)', r'[\1]', line)
        line = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'[\1 \2]', line)
        # Bold: **text** -> [** text]
        line = re.sub(r'\*\*(.+?)\*\*', r'[** \1]', line)
        # Italics: *text* -> [/ text]
        line = re.sub(r'\*(.+?)\*', r'[/ \1]', line)
        # Strikethrough: ~~text~~ -> [- text]
        line = re.sub(r'~~(.+?)~~', r'[- \1]', line)
        # Inline code: `code` -> [`code`]
        line = re.sub(r'`(.+?)`', r'[`\1`]', line)

        # Heading processing
        if i == 0 and line.startswith('# '):
            processed_lines.append(line[2:])
            continue
        
        heading_match = re.match(r'^(#+)\s(.+)', line)
        if heading_match:
            level = len(heading_match.group(1))
            title = heading_match.group(2)
            processed_lines.append(f'[{("*" * level)} {title}]')
            continue

        # List processing
        list_match = re.match(r'^(\s*)([-*])\s(.*)', line)
        if list_match:
            indent = len(list_match.group(1))
            # Convert markdown list to scrapbox indented line
            # Markdown uses 2 spaces per level, Scrapbox uses 1 space per level
            scrapbox_indent = indent // 2 + 1
            processed_lines.append(' ' * scrapbox_indent + list_match.group(3))
            continue

        processed_lines.append(line)

    # Process any remaining table
    if in_table:
        processed_lines.append('table:imported_table')
        processed_lines.extend(['\t' + row for row in table_rows])

    return '\n'.join(processed_lines)

def export_to_markdown(project_name, page_title, output_file, cookie=None):
    """ScrapboxページをMarkdownファイルにエクスポート"""
    if cookie is None:
        cookie = get_cookie_from_env()
    text = get_page_text(project_name, page_title, cookie)
    if text:
        markdown = scrapbox_to_markdown(text)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(markdown)
        print(f"Exported {page_title} to {output_file}")

def import_from_markdown(project_name, page_title, input_file):
    """MarkdownファイルからScrapbox形式に変換してinput.txtに出力"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            markdown = f.read()
        scrapbox_text = markdown_to_scrapbox(markdown)
        
        output_filename = "input.txt"
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(scrapbox_text)
            
        print(f"Converted {input_file} to Scrapbox format and saved as {output_filename}")
        print(f"(Note: Upload content from {output_filename} to {project_name}/{page_title})")
        
    except FileNotFoundError:
        print(f"Error: File {input_file} not found")

def main():
    if len(sys.argv) < 4:
        print("Usage:")
        print("  Export: python converter.py export PROJECT_NAME PAGE_TITLE OUTPUT_FILE [COOKIE]")
        print("  Import: python converter.py import PROJECT_NAME PAGE_TITLE INPUT_FILE")
        sys.exit(1)
    
    command = sys.argv[1]
    project_name = sys.argv[2]
    page_title = sys.argv[3]
    
    if command == "export":
        if len(sys.argv) < 5:
            print("Error: OUTPUT_FILE required for export")
            sys.exit(1)
        output_file = sys.argv[4]
        cookie = sys.argv[5] if len(sys.argv) > 5 else None
        export_to_markdown(project_name, page_title, output_file, cookie)
    
    elif command == "import":
        if len(sys.argv) < 5:
            print("Error: INPUT_FILE required for import")
            sys.exit(1)
        input_file = sys.argv[4]
        import_from_markdown(project_name, page_title, input_file)
    
    else:
        print("Error: Command must be 'export' or 'import'")
        sys.exit(1)

if __name__ == "__main__":
    main()
