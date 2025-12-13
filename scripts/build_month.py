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
                    # そのままHTML文字列として保存
                    articles_html.append(str(article))
                else:
                    print(f'  Warning: No <article> found in {html_file.name}')
        except Exception as e:
            print(f'  Error reading {html_file.name}: {e}')
            continue
    
    # 前後の月を計算（簡易版）
    prev_month = str(int(month) - 1).zfill(2) if int(month) > 1 else "12"
    prev_year = year if int(month) > 1 else str(int(year) - 1)
    next_month = str(int(month) + 1).zfill(2) if int(month) < 12 else "01"
    next_year = year if int(month) < 12 else str(int(year) + 1)
    
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
          <a class="leftarrow" href="../{prev_month}/{prev_year}-{prev_month}.html" aria-label="前の月へ移動">&lt;</a>
          <a class="uparrow" href="../{year}.html" aria-label="年間表示へ戻る">&lt;&lt;</a>
          <a class="rightarrow" href="../{next_month}/{next_year}-{next_month}.html" aria-label="次の月へ移動">&gt;</a>
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
          <a class="leftarrow" href="../{prev_month}/{prev_year}-{prev_month}.html" aria-label="前の月へ移動">&lt;</a>
          <a class="uparrow" href="../{year}.html" aria-label="年間表示へ戻る">&lt;&lt;</a>
          <a class="rightarrow" href="../{next_month}/{next_year}-{next_month}.html" aria-label="次の月へ移動">&gt;</a>
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