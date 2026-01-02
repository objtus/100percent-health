#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
年別雑記ページ生成スクリプト

Usage:
    python build_year.py <year> <zakki_root_dir> [options]
    
Example:
    python build_year.py 2025 D:\\web\\100percent-health\\txt\\zakki
    python build_year.py 2025 ./txt/zakki --sort-order asc --debug
    python build_year.py 2025 ./txt/zakki --config build_pages_config.yaml
"""

from bs4 import BeautifulSoup
from pathlib import Path
import sys
import argparse
from build_utils import (
    load_config,
    create_backup,
    find_adjacent_years,
    get_months_in_year,
    count_articles_in_month,
    generate_html_head,
    generate_html_footer,
    generate_breadcrumb
)

# UTF-8で出力（Windows対応）
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass


def build_year_page(year: str, zakki_root: str, config=None):
    """
    月別記事を統合して年別ページを生成
    
    Args:
        year: 年（例: "2025"）
        zakki_root: zakki ディレクトリのルートパス
        config: 設定辞書（省略時はデフォルト設定）
    """
    # デフォルト設定を使用
    if config is None:
        config = load_config()
    
    zakki_path = Path(zakki_root)
    year_dir = zakki_path / year
    
    if not year_dir.exists():
        print(f'Error: Year directory not found: {year_dir}')
        sys.exit(1)
    
    # 実際に存在する前後の年を検出
    print('Searching for adjacent years...')
    search_range = config.get('adjacent_year_search_range', 10)
    prev_year, next_year = find_adjacent_years(year, zakki_path, search_range)
    
    # 年内の全ての月を取得
    months = get_months_in_year(year, zakki_path)
    
    # 並び順の制御
    sort_order = config.get('sort_order', 'desc')
    if sort_order == 'desc':
        months = list(reversed(months))
        print(f'✓ Sort order: newest first (descending)')
    else:
        print(f'✓ Sort order: oldest first (ascending)')
    
    if not months:
        print(f'Warning: No months with articles found in {year}')
        sys.exit(1)
    
    print(f'Found {len(months)} months with articles: {", ".join(months)}')
    
    # 年間統計
    total_articles = sum(count_articles_in_month(year, month, zakki_path) for month in months)
    print(f'Total articles in {year}: {total_articles}')
    
    # truncate 設定を取得
    truncate_config = config.get('truncate', {})
    truncate_config['debug'] = config.get('debug', False)
    
    # 月別目次（カレンダー風ナビゲーション）を生成
    month_index_items = []
    all_months = [str(i).zfill(2) for i in range(1, 13)]
    
    for month in all_months:
        article_count = count_articles_in_month(year, month, zakki_path)
        if article_count > 0:
            month_index_items.append(
                f'<a href="#month-{month}" class="month-link has-articles">{int(month)}月 ({article_count})</a>'
            )
        else:
            month_index_items.append(
                f'<span class="month-link no-articles">{int(month)}月</span>'
            )
    
    month_index_html = '\n    '.join(month_index_items)
    
    # 各月のセクションを生成
    month_sections = []
    
    for month in months:
        print(f'\nProcessing month: {year}-{month}')
        
        # 月別HTMLファイルを読み込む
        month_html_path = zakki_path / year / month / f'{year}-{month}.html'
        
        if not month_html_path.exists():
            print(f'  Warning: Month HTML not found: {month_html_path}')
            continue
        
        try:
            with open(month_html_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
            
            # zakki{月} の div を探す
            month_div = soup.find('div', id=f'zakki{month}')
            if not month_div:
                print(f'  Warning: No zakki{month} div found in {month_html_path}')
                continue
            
            # 月別セクションの開始
            article_count = count_articles_in_month(year, month, zakki_path)
            month_section = f'''
    <section class="month-section" id="month-{month}">
      <h2><a href="/txt/zakki/{year}/{month}/{year}-{month}.html">{year}年{int(month)}月</a></h2>
      <p class="month-info">{article_count}件の記事</p>
      
      <div class="month-articles">'''
            
            # 記事を取得
            articles = month_div.find_all('article', class_='daily-article')
            
            for article in articles:
                # 記事をそのまま追加（既に省略処理済み）
                month_section += '\n        ' + str(article)
            
            month_section += '''
      </div>
    </section>'''
            
            month_sections.append(month_section)
            print(f'  ✓ Processed {len(articles)} articles')
            
        except Exception as e:
            print(f'  Error processing month {month}: {e}')
            continue
    
    # ナビゲーションリンクの生成
    if prev_year:
        prev_link = f'<a class="leftarrow" href="../{prev_year}/{prev_year}.html" aria-label="前の年へ移動">&lt; {prev_year}</a>'
    else:
        prev_link = '<a class="leftarrow" style="visibility: hidden;" aria-label="前の年へ移動">&lt;</a>'
    
    if next_year:
        next_link = f'<a class="rightarrow" href="../{next_year}/{next_year}.html" aria-label="次の年へ移動">{next_year} &gt;</a>'
    else:
        next_link = '<a class="rightarrow" style="visibility: hidden;" aria-label="次の年へ移動">&gt;</a>'
    
    # パンくずナビゲーション
    breadcrumb = generate_breadcrumb([
        ('100%health', '/index.html'),
        ('txt', '/txt/txt_main.html'),
        (year, f'/txt/zakki/{year}/{year}.html')
    ])
    
    # HTMLヘッダー
    html_head = generate_html_head(
        title=f'{year} - 100%health',
        additional_css=[
            '/txt/zakki/tag-style.css',
            '/txt/zakki/zakki-year.css'
        ]
    )
    
    # 年別HTMLテンプレート
    year_html = f'''<!DOCTYPE html>
<html lang="ja">

{html_head}

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
          {breadcrumb}
        </nav>
      </div>
    </header>
    <main id="main">
      <br>
      <h1>{year}年の雑記帳</h1>
      
      <!-- 年間統計 -->
      <div class="year-stats">
        <p>総記事数: {total_articles}件 | 投稿月数: {len(months)}ヶ月</p>
      </div>
      
      <!-- 前後年へのナビゲーション -->
      <nav class='arrow' aria-label="前後年へのリンク">
        <div class='rowarrow'>
          {prev_link}
          <a class="uparrow" href="/txt/txt_main.html" aria-label="雑記トップへ">雑記トップ</a>
          {next_link}
        </div>
      </nav>
      
      <!-- 月別目次（カレンダー風） -->
      <nav class="year-index">
    {month_index_html}
      </nav>
      
      <!-- 月別コンテンツ -->
      <div class="year-content">
{''.join(month_sections)}
      </div>
      
      <!-- 下部ナビゲーション -->
      <nav class='arrow' aria-label="前後年へのリンク">
        <div class='rowarrow'>
          {prev_link}
          <a class="uparrow" href="/txt/txt_main.html" aria-label="雑記トップへ">雑記トップ</a>
          {next_link}
        </div>
      </nav>
      
    </main>
    {generate_html_footer()}
</body>

</html>'''
    
    # 出力先を決定
    output_path = year_dir / f'{year}.html'
    
    # バックアップの作成
    create_backup(output_path, config.get('create_backup', True))
    
    # ファイルに書き出し
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(year_html)
        
        print(f'\n✓ Successfully generated: {output_path}')
        print(f'✓ Months included: {len(month_sections)}')
        print(f'✓ Total articles: {total_articles}')
        print(f'\nYou can now open the file in your browser!')
        
    except Exception as e:
        print(f'\nError writing output file: {e}')
        sys.exit(1)


def parse_arguments():
    """
    コマンドライン引数を解析
    """
    parser = argparse.ArgumentParser(
        description='年別雑記ページ生成スクリプト',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
例:
  # 基本的な使い方
  python build_year.py 2025 ./txt/zakki
  
  # 新しい順（デフォルト）
  python build_year.py 2025 ./txt/zakki --sort-order desc
  
  # 古い順
  python build_year.py 2025 ./txt/zakki --sort-order asc
  
  # デバッグモード
  python build_year.py 2025 ./txt/zakki --debug
  
  # カスタム設定ファイル使用
  python build_year.py 2025 ./txt/zakki --config custom.yaml
        '''
    )
    
    # 必須引数
    parser.add_argument('year', type=str, help='年（例: 2025）')
    parser.add_argument('zakki_root', type=str, help='zakki ディレクトリのルートパス')
    
    # オプション引数
    parser.add_argument(
        '--config', '-c',
        type=str,
        default=None,
        help='設定ファイルのパス（YAML形式）'
    )
    
    parser.add_argument(
        '--sort-order',
        type=str,
        choices=['asc', 'desc'],
        help='月の並び順（asc: 古い順, desc: 新しい順）'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='デバッグモードを有効化（詳細なログを出力）'
    )
    
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='バックアップを作成しない'
    )
    
    return parser.parse_args()


def main():
    args = parse_arguments()
    
    year = args.year
    zakki_root = args.zakki_root
    
    # 設定を読み込み
    config = load_config(args.config)
    
    # コマンドライン引数で設定を上書き
    if args.sort_order:
        config['sort_order'] = args.sort_order
    
    if args.debug:
        config['debug'] = True
    
    if args.no_backup:
        config['create_backup'] = False
    
    # 実行情報を表示
    print(f'Building year page for {year}...')
    print(f'Configuration:')
    print(f'  Sort order: {config["sort_order"]}')
    print(f'  Debug mode: {config["debug"]}')
    print(f'  Create backup: {config["create_backup"]}')
    print()
    
    build_year_page(year, zakki_root, config)


if __name__ == '__main__':
    main()

