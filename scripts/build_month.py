#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
月別雑記ページ生成スクリプト（省略処理なし版）

Usage:
    python build_month.py <year> <month> <days_dir>
    
Example:
    python build_month.py 2025 12 /path/to/txt/zakki/2025/12/days
"""

from bs4 import BeautifulSoup
from pathlib import Path
import sys


def find_adjacent_months(year, month, days_dir):
    """
    実際に存在する前後の月を検出
    
    Args:
        year: 現在の年
        month: 現在の月
        days_dir: 日別HTMLディレクトリのパス
    
    Returns:
        ((prev_year, prev_month), (next_year, next_month))
        存在しない場合は (None, None)
    """
    days_path = Path(days_dir)
    # txt/zakki/ ディレクトリを取得
    zakki_root = days_path.parent.parent.parent
    
    current_ym = int(year) * 12 + int(month)
    
    # 前の月を探す（最大24ヶ月前まで）
    prev_year, prev_month = None, None
    for i in range(1, 25):
        check_ym = current_ym - i
        check_year = check_ym // 12
        check_month = check_ym % 12
        if check_month == 0:
            check_year -= 1
            check_month = 12
        
        check_year_str = str(check_year)
        check_month_str = str(check_month).zfill(2)
        
        # days/ディレクトリが存在し、HTMLファイルがあるかチェック
        check_days_dir = zakki_root / check_year_str / check_month_str / 'days'
        if check_days_dir.exists():
            html_files = list(check_days_dir.glob('*.html'))
            if html_files:
                prev_year = check_year_str
                prev_month = check_month_str
                print(f'  Found previous month: {prev_year}-{prev_month}')
                break
    
    # 次の月を探す（最大24ヶ月後まで）
    next_year, next_month = None, None
    for i in range(1, 25):
        check_ym = current_ym + i
        check_year = check_ym // 12
        check_month = check_ym % 12
        if check_month == 0:
            check_year -= 1
            check_month = 12
        
        check_year_str = str(check_year)
        check_month_str = str(check_month).zfill(2)
        
        check_days_dir = zakki_root / check_year_str / check_month_str / 'days'
        if check_days_dir.exists():
            html_files = list(check_days_dir.glob('*.html'))
            if html_files:
                next_year = check_year_str
                next_month = check_month_str
                print(f'  Found next month: {next_year}-{next_month}')
                break
    
    return (prev_year, prev_month), (next_year, next_month)


def advanced_truncate_article(article_soup, year, month, config=None):
    """
    JavaScriptのBalancedArticleProcessorと同等の省略処理
    - 文字数ベースの制御（デフォルト300文字）
    - 要素数の範囲制御（最小2個、最大6個）
    - 段落の自動切り詰め（120文字超過時）
    - リストの項目数制限（3項目まで）
    - 全要素をフラットに処理（sectionを無視）
    
    Args:
        article_soup: BeautifulSoup の article 要素
        year: 年
        month: 月
        config: カスタム設定（オプション）
    
    Returns:
        省略処理されたHTML文字列
    """
    # デフォルト設定
    default_config = {
        'maxChars': 300,
        'minElements': 2,
        'maxElements': 6,
        'textTruncateLength': 120,
        'maxListItems': 3,
        'listItemEstimate': 25,
        'debug': False
    }
    
    if config:
        default_config.update(config)
    cfg = default_config
    
    # articleをコピー
    truncated = BeautifulSoup(str(article_soup), 'html.parser').find('article')
    
    # .article-body を取得
    article_body = truncated.find(class_='article-body')
    if not article_body:
        return str(truncated)
    
    # article-previewを新規作成
    preview_div = BeautifulSoup('<div class="article-preview"></div>', 'html.parser').div
    
    # 全要素をフラットに取得（sectionを無視）
    all_elements = get_all_relevant_elements(article_body)
    
    if cfg['debug']:
        print(f"  Found {len(all_elements)} elements to process")
    
    total_chars = 0
    element_count = 0
    
    for element in all_elements:
        # 最小要素数未満なら必ず追加
        if element_count < cfg['minElements']:
            processed = process_element(element, cfg)
            preview_div.append(processed['element'])
            total_chars += processed['chars']
            element_count += 1
            if cfg['debug']:
                print(f"  Added element {element_count} (minimum guarantee): {processed['chars']} chars, total: {total_chars}")
            continue
        
        # 最大要素数に達したら停止
        if element_count >= cfg['maxElements']:
            if cfg['debug']:
                print(f"  Reached maximum elements ({cfg['maxElements']}), stopping")
            break
        
        # 文字数制限チェック
        processed = process_element(element, cfg)
        if total_chars + processed['chars'] > cfg['maxChars'] and element_count > 0:
            if cfg['debug']:
                print(f"  Would exceed character limit ({total_chars + processed['chars']} > {cfg['maxChars']}), stopping")
            break
        
        preview_div.append(processed['element'])
        total_chars += processed['chars']
        element_count += 1
        if cfg['debug']:
            print(f"  Added element {element_count}: {processed['chars']} chars, total: {total_chars}")
    
    if cfg['debug']:
        print(f"  Preview completed: {element_count} elements, {total_chars} chars")
    
    # 「続きを読む」リンクをarticle-previewの最後に追加
    article_id = truncated.get('id', '')
    if article_id and len(article_id) == 6:
        date_str = article_id
        year_part = '20' + date_str[0:2]
        month_part = date_str[2:4]
        day_part = date_str[4:6]
        full_date = f'{year_part}-{month_part}-{day_part}'
        
        read_more_html = f'<p class="article-ellipsis"><a href="/txt/zakki/{year}/{month}/days/{full_date}.html" class="read-more-link">続きを読む / <span lang="en">read more</span></a></p>'
        read_more_tag = BeautifulSoup(read_more_html, 'html.parser').p
        preview_div.append(read_more_tag)
    
    # article-bodyを置き換え
    article_body.replace_with(preview_div)
    
    return str(truncated)


def get_all_relevant_elements(container):
    """
    コンテナ内の全ての関連要素を再帰的に取得（sectionを無視してフラット化）
    
    Args:
        container: BeautifulSoup要素
    
    Returns:
        要素のリスト
    """
    elements = []
    relevant_tags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'BLOCKQUOTE', 'HR', 'BR', 'IFRAME', 'IMG']
    container_tags = ['SECTION', 'DIV', 'ARTICLE']
    
    def traverse(node):
        for child in node.children:
            if child.name is None:  # テキストノードはスキップ
                continue
            
            tag_upper = child.name.upper()
            
            if tag_upper in relevant_tags:
                elements.append(child)
            elif tag_upper in container_tags:
                # コンテナ要素の場合は中身を再帰的に処理
                traverse(child)
            # else: その他の要素は無視
    
    traverse(container)
    return elements


def process_element(element, config):
    """
    個別要素を処理（切り詰めや省略）
    
    Args:
        element: BeautifulSoup要素
        config: 設定辞書
    
    Returns:
        {'element': 処理済み要素, 'chars': 推定文字数}
    """
    cloned = BeautifulSoup(str(element), 'html.parser').find()
    estimated_chars = 0
    tag_upper = element.name.upper()
    
    if tag_upper == 'P':
        text = element.get_text()
        if len(text) > config['textTruncateLength']:
            # 段落を切り詰め
            truncated_text = text[:config['textTruncateLength']]
            cloned.clear()
            cloned.append(truncated_text)
            ellipsis = BeautifulSoup('<span class="ellipsis">...</span>', 'html.parser').span
            cloned.append(ellipsis)
            estimated_chars = config['textTruncateLength']
            if config['debug']:
                print(f"    Truncated paragraph: {len(text)} → {config['textTruncateLength']} chars")
        else:
            estimated_chars = len(text)
            if config['debug']:
                print(f"    Kept full paragraph: {len(text)} chars")
    
    elif tag_upper in ['UL', 'OL']:
        items = list(element.find_all('li', recursive=False))
        max_items = config['maxListItems']
        
        if len(items) > max_items:
            # リストを切り詰め
            cloned.clear()
            for item in items[:max_items]:
                cloned.append(BeautifulSoup(str(item), 'html.parser').li)
            
            # 省略表示を追加
            remaining_count = len(items) - max_items
            ellipsis_html = f'<li class="list-ellipsis" style="font-style: italic; color: #666;"><em>... (他{remaining_count}項目)</em></li>'
            ellipsis_li = BeautifulSoup(ellipsis_html, 'html.parser').li
            cloned.append(ellipsis_li)
            
            estimated_chars = max_items * config['listItemEstimate']
            if config['debug']:
                print(f"    Truncated list: {len(items)} → {max_items} items ({remaining_count} hidden)")
        else:
            estimated_chars = len(items) * config['listItemEstimate']
            if config['debug']:
                print(f"    Kept full list: {len(items)} items")
    
    elif tag_upper in ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']:
        estimated_chars = len(element.get_text())
        if config['debug']:
            print(f"    Processed heading: {element.name} - \"{element.get_text().strip()}\"")
    
    elif tag_upper == 'BLOCKQUOTE':
        quote_text = element.get_text()
        if len(quote_text) > config['textTruncateLength']:
            truncated_text = quote_text[:config['textTruncateLength']]
            cloned.clear()
            p_tag = BeautifulSoup(f'<p>{truncated_text}<span class="ellipsis">...</span></p>', 'html.parser').p
            cloned.append(p_tag)
            estimated_chars = config['textTruncateLength']
        else:
            estimated_chars = len(quote_text)
        if config['debug']:
            print(f"    Processed blockquote: {len(quote_text)} chars")
    
    elif tag_upper in ['HR', 'BR']:
        estimated_chars = 0
        if config['debug']:
            print(f"    Processed {element.name}")
    
    elif tag_upper == 'IFRAME':
        # iframeはそのまま保持、文字数は0
        estimated_chars = 0
        if config['debug']:
            print(f"    Processed iframe")
    
    elif tag_upper == 'IMG':
        # 画像もそのまま保持、文字数は0
        estimated_chars = 0
        if config['debug']:
            print(f"    Processed img")
    
    else:
        estimated_chars = len(element.get_text())
        if config['debug']:
            print(f"    Processed other element: {element.name}")
    
    return {'element': cloned, 'chars': estimated_chars}


def build_month_page(year, month, days_dir):
    """
    日別記事を統合して月別ページを生成
    
    Args:
        year: 年（例: "2025"）
        month: 月（例: "12"）
        days_dir: 日別HTMLファイルが格納されているディレクトリパス
    """
    days_path = Path(days_dir)
    
    if not days_path.exists():
        print(f'Error: Directory not found: {days_path}')
        sys.exit(1)
    
    # 実際に存在する前後の月を検出
    print('Searching for adjacent months...')
    (prev_year, prev_month), (next_year, next_month) = find_adjacent_months(year, month, days_dir)
    
    # 記事を格納するリスト
    articles_html = []
    
    # days/フォルダ内の全HTMLファイルを処理（日付順にソート）
    html_files = sorted(days_path.glob('*.html'))
    
    if not html_files:
        print(f'Warning: No HTML files found in {days_path}')
    
    for html_file in html_files:
        print(f'Processing: {html_file.name}')
        
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                
                # <article>要素を取得
                article = soup.find('article')
                if article:
                    # 高度な省略処理を適用（JavaScriptと同等）
                    truncated_html = advanced_truncate_article(article, year, month)
                    articles_html.append(truncated_html)
                else:
                    print(f'  Warning: No <article> found in {html_file.name}')
        except Exception as e:
            print(f'  Error reading {html_file.name}: {e}')
            continue
    
    # ナビゲーションリンクの生成
    if prev_year and prev_month:
        # 年が異なる場合は ../../年/月/ の形式
        if prev_year != year:
            prev_link = f'<a class="leftarrow" href="../../{prev_year}/{prev_month}/{prev_year}-{prev_month}.html" aria-label="前の月へ移動">&lt;</a>'
        else:
            prev_link = f'<a class="leftarrow" href="../{prev_month}/{prev_year}-{prev_month}.html" aria-label="前の月へ移動">&lt;</a>'
    else:
        prev_link = '<a class="leftarrow" style="visibility: hidden;" aria-label="前の月へ移動">&lt;</a>'
    
    if next_year and next_month:
        # 年が異なる場合は ../../年/月/ の形式
        if next_year != year:
            next_link = f'<a class="rightarrow" href="../../{next_year}/{next_month}/{next_year}-{next_month}.html" aria-label="次の月へ移動">&gt;</a>'
        else:
            next_link = f'<a class="rightarrow" href="../{next_month}/{next_year}-{next_month}.html" aria-label="次の月へ移動">&gt;</a>'
    else:
        next_link = '<a class="rightarrow" style="visibility: hidden;" aria-label="次の月へ移動">&gt;</a>'
    
    # 月別HTMLテンプレート
    month_html = f'''<!DOCTYPE html>
<html lang="ja">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{year}-{month} - 100%health</title>
  <link rel="stylesheet" href="/1column.css">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script src="/js/jquery-3.6.0.min.js"></script>
  <script src="/js/main.js"></script>
  <script src="/js/mouse.js"></script>
  <script>
    $(function () {{
      $("#zakkihtml").load("/txt/txt_main.html #zakki-list");
      $("#taghtml").load("/txt/txt_main.html #tag-list");
    }});
  </script>
  <link rel="stylesheet" href="/txt/zakki/zakki-month.css">
  <link rel="stylesheet" href="/txt/zakki/tag-style.css">
</head>

<body>
  <div id="wrapper">
    <header id="header">
      <div id="header-flex">
        <nav id="back" aria-label="戻るナビゲーション">
          <a id="backicon" href="/index.html">
            &lt;
          </a>
        </nav>
        <nav id="address" class="addressbar" aria-label="パンくずナビゲーション">
          <a class="addressbar" href="/index.html">
            100%health
          </a>/
          <a class="addressbar" href="/txt/txt_main.html">
            txt
          </a>/
          <a class="addressbar" href="../{year}.html">
            {year}
          </a>/
          <a class="addressbar" href="../{month}/{year}-{month}.html">
            {year}-{month}
          </a>
        </nav>
      </div>
    </header>
    <main id="main">
      <br>
      <h1>{year}年{month}月の雑記</h1>
      <nav class='arrow' aria-label="前後月へのリンク">
        <div class='rowarrow' aria-label="前後月へのリンク">
          {prev_link}
          <a class="uparrow" href="../{year}.html" aria-label="年間表示へ戻る">&lt;&lt;</a>
          {next_link}
        </div>
      </nav>

      <div id="zakki{month}">
        <h2><a href="/txt/zakki/{year}/{month}/{year}-{month}.html">{year}-{month}</a></h2>
        <div class="month-article">
{chr(10).join('          ' + line for article in articles_html for line in article.split(chr(10)))}
        </div> 
      </div>

      <nav class='arrow' aria-label="前後月へのリンク"> 
        <div class='rowarrow' aria-label="前後月へのリンク">
          {prev_link}
          <a class="uparrow" href="../{year}.html" aria-label="年間表示へ戻る">&lt;&lt;</a>
          {next_link}
        </div>
      </nav>

    </main>
    <footer id="main-footer">
      <div id="zakkihtml"></div>
      <div id="taghtml"></div>
      <!-- main.jsから#footerへfooter.htmlの挿入 -->
      <div id="footerhtml"></div>
    </footer>

  </div>
  <div id="lightbox">
    <link rel="stylesheet" href="/luminous-basic.min.css">
    <script src="/Luminous.min.js" defer></script>
    <script>
      // LuminousGalleryが読み込まれてから実行
      if (typeof LuminousGallery !== 'undefined') {{
        new LuminousGallery(document.querySelectorAll('a[href$=jpg],a[href$=png],a[href$=gif]'));
      }}
    </script>
  </div>
</body>

</html>'''
    
    # 出力先を決定（days_dirの親ディレクトリ）
    output_dir = days_path.parent
    output_path = output_dir / f'{year}-{month}.html'
    
    # ファイルに書き出し
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(month_html)
        
        print(f'\n✓ Successfully generated: {output_path}')
        print(f'✓ Articles included: {len(articles_html)}')
        print(f'\nYou can now open the file in your browser!')
        
    except Exception as e:
        print(f'\nError writing output file: {e}')
        sys.exit(1)


def main():
    if len(sys.argv) != 4:
        print('Usage: python build_month.py <year> <month> <days_dir>')
        print('\nExample:')
        print('  python build_month.py 2025 12 /path/to/txt/zakki/2025/12/days')
        print('  python build_month.py 2025 12 ./txt/zakki/2025/12/days')
        sys.exit(1)
    
    year = sys.argv[1]
    month = sys.argv[2].zfill(2)  # 1桁の月を2桁に変換（例: "1" → "01"）
    days_dir = sys.argv[3]
    
    print(f'Building month page for {year}-{month}...\n')
    build_month_page(year, month, days_dir)


if __name__ == '__main__':
    main()