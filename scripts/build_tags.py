#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
タグページ自動生成スクリプト

Usage:
    python build_tags.py [tags...]
    
Example:
    python build_tags.py                    # 全タグを生成
    python build_tags.py timeline music     # 特定のタグのみ生成
    python build_tags.py --debug            # デバッグモード
"""

from bs4 import BeautifulSoup
from pathlib import Path
import sys
import argparse
import json
from collections import defaultdict

# PyYAMLは必須ではない（オプショナル）
try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


def load_config(config_path=None, script_dir=None):
    """
    設定ファイルを読み込む
    
    Args:
        config_path: 設定ファイルのパス（Noneの場合は自動検出）
        script_dir: スクリプトのディレクトリ（自動検出用）
    
    Returns:
        dict: 設定辞書（見つからない場合は空辞書）
    """
    if script_dir is None:
        script_dir = Path(__file__).resolve().parent
    
    # 設定ファイルのパスを決定
    if config_path:
        config_file = Path(config_path)
    else:
        # 自動検出：YAML → JSON の順
        yaml_config = script_dir / 'build_tags_config.yaml'
        json_config = script_dir / 'build_tags_config.json'
        
        if YAML_AVAILABLE and yaml_config.exists():
            config_file = yaml_config
        elif json_config.exists():
            config_file = json_config
        else:
            # 設定ファイルが見つからない場合は空辞書を返す
            return {}
    
    # 設定ファイルが存在しない場合
    if not config_file.exists():
        print(f'Warning: Config file not found: {config_file}')
        return {}
    
    # ファイル形式に応じて読み込み
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            if config_file.suffix in ['.yaml', '.yml']:
                if not YAML_AVAILABLE:
                    print('Warning: PyYAML is not installed. Install with: pip install pyyaml')
                    return {}
                config = yaml.safe_load(f)
            elif config_file.suffix == '.json':
                config = json.load(f)
            else:
                print(f'Warning: Unsupported config file format: {config_file.suffix}')
                return {}
        
        print(f'OK Loaded config from: {config_file}')
        return config if config else {}
    
    except Exception as e:
        print(f'Error loading config file: {e}')
        return {}


def parse_data_tags(data_tags_str):
    """
    data-tags属性をパースして {tagName: relevance} 辞書を返す
    
    Args:
        data_tags_str: data-tags属性の文字列
        例: "timeline=100,music=80" または "timeline,music"
    
    Returns:
        dict: {tagName: relevance}
    """
    if not data_tags_str or not isinstance(data_tags_str, str):
        return {}
    
    trimmed = data_tags_str.strip()
    if not trimmed:
        return {}
    
    # JSON形式の検出（将来の拡張用）
    if trimmed.startswith('{'):
        try:
            import json
            parsed = json.loads(trimmed)
            validated = {}
            for key, value in parsed.items():
                rel = int(value) if isinstance(value, (int, str)) else 100
                validated[key] = rel if 0 <= rel <= 100 else 100
            return validated
        except:
            return {}
    
    # イコール区切り形式: "music=80,timeline,anime=60"
    tags = {}
    for item in trimmed.split(','):
        cleaned = item.strip()
        if not cleaned:
            continue
        
        if '=' in cleaned:
            parts = cleaned.split('=', 1)
            tag = parts[0].strip()
            try:
                relevance = int(parts[1].strip())
                relevance = relevance if 0 <= relevance <= 100 else 100
            except:
                relevance = 100
        else:
            tag = cleaned
            relevance = 100
        
        if tag:
            tags[tag] = relevance
    
    return tags


def scan_zakki_directory(zakki_root, debug=False):
    """
    zakki ディレクトリを走査して全タグとセクションを収集
    
    Args:
        zakki_root: zakki ディレクトリのパス
        debug: デバッグモード
    
    Returns:
        dict: {tagName: [section_data, ...]}
    """
    zakki_path = Path(zakki_root)
    if not zakki_path.exists():
        print(f'Error: Directory not found: {zakki_path}')
        sys.exit(1)
    
    tags_data = defaultdict(list)
    total_files = 0
    total_sections = 0
    
    # 年ディレクトリを走査
    for year_dir in sorted(zakki_path.glob('[0-9][0-9][0-9][0-9]')):
        year = year_dir.name
        
        # 月ディレクトリを走査
        for month_dir in sorted(year_dir.glob('[0-9][0-9]')):
            month = month_dir.name
            days_dir = month_dir / 'days'
            
            if not days_dir.exists():
                continue
            
            if debug:
                print(f'\nProcessing {year}-{month}...')
            
            # 日別HTMLファイルを走査
            for html_file in sorted(days_dir.glob('*.html')):
                total_files += 1
                date = html_file.stem  # ファイル名から日付を取得（例: 2024-12-13）
                
                if debug:
                    print(f'  Reading: {html_file.name}')
                
                try:
                    with open(html_file, 'r', encoding='utf-8') as f:
                        soup = BeautifulSoup(f.read(), 'html.parser')
                        
                        # data-tags属性を持つすべてのsectionを検索
                        sections = soup.find_all('section', attrs={'data-tags': True})
                        
                        for section in sections:
                            data_tags = section.get('data-tags', '')
                            parsed_tags = parse_data_tags(data_tags)
                            
                            if debug and parsed_tags:
                                print(f'    Found section with tags: {list(parsed_tags.keys())}')
                            
                            # 各タグについてセクション情報を保存
                            for tag_name, relevance in parsed_tags.items():
                                section_data = {
                                    'date': date,
                                    'year': year,
                                    'month': month,
                                    'section_html': str(section),
                                    'relevance': relevance,
                                    'file_path': str(html_file)
                                }
                                tags_data[tag_name].append(section_data)
                                total_sections += 1
                
                except Exception as e:
                    print(f'  Error reading {html_file.name}: {e}')
                    continue
    
    print(f'\nScan complete:')
    print(f'  Files processed: {total_files}')
    print(f'  Sections found: {total_sections}')
    print(f'  Unique tags: {len(tags_data)}')
    
    return dict(tags_data)


def generate_tag_page_html(tag_name, sections, sort_by='date-desc', description='', debug=False):
    """
    タグページのHTMLを生成
    
    Args:
        tag_name: タグ名
        sections: セクションデータのリスト
        sort_by: ソート方法（'date-desc', 'date-asc', 'relevance-desc', 'relevance-asc'）
        description: タグの説明文（設定ファイルから読み込まれる）
        debug: デバッグモード
    
    Returns:
        str: 生成されたHTML
    """
    # ソート
    if sort_by == 'date-desc':
        sorted_sections = sorted(sections, key=lambda x: x['date'], reverse=True)
    elif sort_by == 'date-asc':
        sorted_sections = sorted(sections, key=lambda x: x['date'], reverse=False)
    elif sort_by == 'relevance-desc':
        sorted_sections = sorted(sections, key=lambda x: (x['relevance'], x['date']), reverse=True)
    elif sort_by == 'relevance-asc':
        sorted_sections = sorted(sections, key=lambda x: (x['relevance'], x['date']), reverse=False)
    else:
        # デフォルトは日付降順
        sorted_sections = sorted(sections, key=lambda x: x['date'], reverse=True)
    
    # 統計情報を計算
    total_count = len(sorted_sections)
    latest_date = sorted_sections[0]['date'] if sorted_sections else 'N/A'
    oldest_date = sorted_sections[-1]['date'] if sorted_sections else 'N/A'
    
    # 平均関連度を計算
    if sorted_sections:
        avg_relevance = sum(s['relevance'] for s in sorted_sections) / len(sorted_sections)
    else:
        avg_relevance = 0
    
    if debug:
        print(f'  Generating HTML for tag: {tag_name}')
        print(f'    Total sections: {total_count}')
        print(f'    Date range: {oldest_date} to {latest_date}')
        print(f'    Average relevance: {avg_relevance:.1f}%')
        print(f'    Sort method: {sort_by}')
        if description:
            print(f'    Description: {description}')
    
    # 説明文のHTML（設定ファイルで指定されている場合）
    description_html = ''
    if description:
        description_html = f'<p class="tag-description">{description}</p>'
    
    # 日付でグループ化
    grouped_by_date = defaultdict(list)
    for section in sorted_sections:
        grouped_by_date[section['date']].append(section)
    
    # 記事HTMLを生成
    articles_html = []
    for date in sorted(grouped_by_date.keys(), reverse=True):
        date_sections = grouped_by_date[date]
        
        # 日付部分を分解
        date_parts = date.split('-')
        if len(date_parts) == 3:
            year, month, day = date_parts
            date_url = f'/txt/zakki/{year}/{month}/days/{date}.html'
        else:
            date_url = '#'
        
        # この日の最大関連度を取得（記事全体の関連度として使用）
        max_relevance = max(s['relevance'] for s in date_sections)
        
        # article要素を構築
        article_html = f'''        <article class="tag-article" data-date="{date}" data-relevance="{max_relevance}">
          <h3><a href="{date_url}">{date}</a></h3>
'''
        
        # セクションを追加
        for section_data in date_sections:
            # セクションHTMLをインデント
            section_lines = section_data['section_html'].split('\n')
            indented_section = '\n'.join('          ' + line if line.strip() else '' for line in section_lines)
            article_html += indented_section.rstrip() + '\n'
        
        article_html += '        </article>\n'
        articles_html.append(article_html)
    
    # JavaScriptコード（f-stringの外で定義）
    client_script = """
    document.addEventListener('DOMContentLoaded', function() {
      const allArticles = Array.from(document.querySelectorAll('.tag-article')).map(article => ({
        element: article,
        date: article.getAttribute('data-date'),
        relevance: parseInt(article.getAttribute('data-relevance') || '100'),
        html: article.outerHTML
      }));
      
      const totalCount = allArticles.length;
      let currentSort = 'date-desc';
      let minRelevance = 0;
      
      console.log('Tag page client sort initialized. Total articles:', totalCount);
      
      function sortArticles(articles, sortMethod) {
        const sorted = [...articles];
        switch (sortMethod) {
          case 'date-desc':
            return sorted.sort((a, b) => b.date.localeCompare(a.date));
          case 'date-asc':
            return sorted.sort((a, b) => a.date.localeCompare(b.date));
          case 'relevance-desc':
            return sorted.sort((a, b) => b.relevance - a.relevance || b.date.localeCompare(a.date));
          case 'relevance-asc':
            return sorted.sort((a, b) => a.relevance - b.relevance || a.date.localeCompare(b.date));
          default:
            return sorted;
        }
      }
      
      function filterArticles(articles, minRel) {
        return articles.filter(article => article.relevance >= minRel);
      }
      
      function reverseTimelineLists(container, shouldReverse) {
        const timelineLists = container.querySelectorAll('ul.timeline_md, ul.timeline_ymd');
        timelineLists.forEach(list => {
          const items = Array.from(list.querySelectorAll('li'));
          if (items.length === 0) return;
          
          if (shouldReverse) {
            items.reverse().forEach(item => list.appendChild(item));
          }
        });
      }
      
      function updateDisplay() {
        const filtered = filterArticles(allArticles, minRelevance);
        const sorted = sortArticles(filtered, currentSort);
        
        const container = document.getElementById('articles-container');
        container.innerHTML = sorted.map(article => article.html).join('');
        
        const shouldReverseTimeline = (currentSort === 'date-desc');
        reverseTimelineLists(container, shouldReverseTimeline);
        
        const statsDisplay = document.getElementById('stats-display');
        if (filtered.length > 0) {
          const dates = sorted.map(a => a.date).sort();
          const latest = dates[dates.length - 1];
          const oldest = dates[0];
          const avgRel = filtered.reduce((sum, a) => sum + a.relevance, 0) / filtered.length;
          statsDisplay.textContent = '全' + totalCount + '件中' + filtered.length + '件表示中 | 最新: ' + latest + ' | 最古: ' + oldest + ' | 平均関連度: ' + Math.round(avgRel) + '%';
        } else {
          statsDisplay.textContent = '全' + totalCount + '件中0件表示中';
        }
        
        console.log('Display updated:', {sort: currentSort, minRelevance: minRelevance, displayed: filtered.length, listReversed: shouldReverseTimeline});
      }
      
      document.querySelectorAll('.tag-sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          currentSort = this.getAttribute('data-sort');
          document.querySelectorAll('.tag-sort-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          console.log('Sort changed to:', currentSort);
          updateDisplay();
        });
      });
      
      console.log('Sort buttons:', document.querySelectorAll('.tag-sort-btn').length);
      
      const slider = document.getElementById('relevance-slider');
      const sliderValue = document.getElementById('slider-value');
      
      if (slider && sliderValue) {
        slider.addEventListener('input', function() {
          sliderValue.textContent = this.value + '%';
        });
        
        slider.addEventListener('change', function() {
          minRelevance = parseInt(this.value);
          console.log('Relevance filter changed to:', minRelevance);
          updateDisplay();
        });
      }
      
      const resetBtn = document.getElementById('reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', function() {
          currentSort = 'date-desc';
          minRelevance = 0;
          slider.value = 0;
          sliderValue.textContent = '0%';
          document.querySelectorAll('.tag-sort-btn').forEach(b => b.classList.remove('active'));
          const defaultBtn = document.querySelector('[data-sort="date-desc"]');
          if (defaultBtn) defaultBtn.classList.add('active');
          console.log('Reset to defaults');
          updateDisplay();
        });
      }
      
      const shouldReverseInitial = (currentSort === 'date-desc');
      reverseTimelineLists(document.getElementById('articles-container'), shouldReverseInitial);
    });
    """
    
    # 完全なHTMLテンプレート
    html_content = f'''<!DOCTYPE html>
<html lang="ja">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>tag: {tag_name} - 100%health</title>
  <link rel="stylesheet" href="/1column.css">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script src="/js/jquery-3.6.0.min.js"></script>
  <script src="/js/main.js"></script>
  <script src="/js/mouse.js"></script>
  <style>
    /* タグページ用スタイル */
    article.tag-article {{
      margin-bottom: 2em;
      padding-bottom: 1em;
      border-bottom: 2px dotted #000000;
      animation: fadeIn 0.5s ease-in;
    }}
    
    article.tag-article h3 {{
      margin-bottom: 0.5em;
      padding-bottom: 0.3em;
    }}
    
    article.tag-article h3 a:hover {{
      text-decoration: underline;
    }}
    
    article.tag-article h3 a:hover::after {{
      content: ' \\2197'; /* 右上向き矢印 */
      font-size: 0.8em;
      position: relative;
      top: -0.3em;
    }}
    
    .tag-articles section {{
      margin-bottom: 1em;
    }}

    article{{
      h3,
      h4 {{padding-top: 0.5em!important;margin-left: 0;}}
    }}
    
    .tag-description {{
      font-size: 1em;
      color: #555;
      margin: 1em 0;
      padding: 0.8em 1.2em;

      &::before {{ content: "♥"; }}
    }}
    
    @keyframes fadeIn {{
      from {{ opacity: 0; transform: translateY(10px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}
  </style>
  <script>
    $(function () {{
      $("#zakkihtml").load("/txt/txt_main.html #zakki-list");
      $("#taghtml").load("/txt/txt_main.html #tag-list");
    }});
  </script>
  <link rel="stylesheet" href="/txt/zakki/zakki-style.css">
  <link rel="stylesheet" href="/txt/zakki/tag-style.css">
  <link rel="stylesheet" href="/txt/zakki/tag/tag-controls.css">
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
          <a class="addressbar" href="/txt/zakki/tag/tag_main.html">
            tag
          </a>/
          <a class="addressbar" href="{tag_name}.html">
            {tag_name}
          </a>
        </nav>
      </div>
    </header>
    <main id="main">
      <h1>{tag_name} タグ一覧</h1>
      {description_html}
      
      <!-- ソート・フィルターコントロール -->
      <div class="tag-controls">
        <h2 class="tag-controls-heading">表示とソートの設定</h2>
        
        <!-- ソートボタン行 -->
        <div class="tag-controls-row">
          <div class="tag-control-group">
            <label>日付でソート:</label>
            <div class="tag-control-buttons">
              <button class="tag-sort-btn active" data-sort="date-desc">新しい順</button>
              <button class="tag-sort-btn" data-sort="date-asc">古い順</button>
            </div>
          </div>
          <div class="tag-control-group">
            <label>関連度でソート:</label>
            <div class="tag-control-buttons">
              <button class="tag-sort-btn" data-sort="relevance-desc">関連度高い順</button>
              <button class="tag-sort-btn" data-sort="relevance-asc">関連度低い順</button>
            </div>
          </div>
        </div>
        
        <!-- フィルター行 -->
        <div class="tag-controls-row">
          <div class="tag-control-group">
            <label>最小関連度でフィルター:</label>
            <div class="tag-slider-container">
              <input type="range" min="0" max="100" step="10" value="0" class="tag-slider" id="relevance-slider">
              <span class="tag-slider-value" id="slider-value">0%</span>
            </div>
          </div>
          <div class="tag-control-group">
            <label>設定をリセット:</label>
            <button class="tag-reset-btn" id="reset-btn">リセット</button>
          </div>
        </div>
        
        <!-- 統計情報 -->
        <p class="tag-stats" id="stats-display">全{total_count}件 | 最新: {latest_date} | 最古: {oldest_date} | 平均関連度: {avg_relevance:.0f}%</p>
      </div>
      
      <!-- タグ付きセクション一覧 -->
      <h2>記事一覧</h2>
      <div class="tag-articles" id="articles-container">
{''.join(articles_html)}
      </div>
    </main>
    <footer id="main-footer">
      <div id="zakkihtml"></div>
      <div id="taghtml"></div>
      <div id="footerhtml"></div>
    </footer>
  </div>
  
  <!-- クライアント側ソートスクリプト -->
  <script>
    {client_script}
  </script>
</body>

</html>'''
    
    return html_content


def build_tag_pages(zakki_root, output_dir, tag_filter=None, sort_by='date-desc', tag_configs=None, debug=False):
    """
    タグページを生成
    
    Args:
        zakki_root: zakki ディレクトリのパス
        output_dir: 出力先ディレクトリ
        tag_filter: 生成するタグのリスト（None の場合は全タグ）
        sort_by: ソート方法（'date-desc', 'date-asc', 'relevance-desc', 'relevance-asc'）
        tag_configs: タグ別設定の辞書（設定ファイルから読み込まれる）
        debug: デバッグモード
    """
    if tag_configs is None:
        tag_configs = {}
    
    print(f'Scanning zakki directory: {zakki_root}')
    
    # 全タグとセクションを収集
    tags_data = scan_zakki_directory(zakki_root, debug=debug)
    
    if not tags_data:
        print('Warning: No tags found in zakki directory')
        return
    
    # 出力先ディレクトリを作成
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # タグフィルターが指定されている場合は絞り込み
    if tag_filter:
        tags_to_generate = {tag: sections for tag, sections in tags_data.items() if tag in tag_filter}
        if not tags_to_generate:
            print(f'Warning: None of the specified tags found: {tag_filter}')
            return
    else:
        tags_to_generate = tags_data
    
    print(f'\nGenerating {len(tags_to_generate)} tag page(s)...')
    if sort_by != 'date-desc':
        print(f'Sort method: {sort_by}\n')
    else:
        print('')
    
    # 各タグについてHTMLを生成
    generated_count = 0
    for tag_name, sections in sorted(tags_to_generate.items()):
        print(f'Generating: {tag_name}.html ({len(sections)} sections)')
        
        # タグ別設定を取得
        tag_config = tag_configs.get(tag_name, {})
        tag_sort = tag_config.get('sort', sort_by)
        tag_description = tag_config.get('description', '')
        
        if debug and tag_config:
            print(f'  Using config: sort={tag_sort}, description="{tag_description}"')
        
        try:
            html_content = generate_tag_page_html(
                tag_name, 
                sections, 
                sort_by=tag_sort,
                description=tag_description,
                debug=debug
            )
            output_file = output_path / f'{tag_name}.html'
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f'  OK Saved to: {output_file}')
            generated_count += 1
            
        except Exception as e:
            print(f'  ERROR: Error generating {tag_name}.html: {e}')
            continue
    
    print(f'\nSuccessfully generated {generated_count} tag page(s)')
    
    # タグ一覧ページを生成
    return tags_to_generate


def generate_tag_main_page(tags_data, output_dir, tag_configs=None, debug=False):
    """
    タグ一覧ページ（tag_main.html）を生成
    
    Args:
        tags_data: {tag_name: sections} の辞書
        output_dir: 出力先ディレクトリ
        tag_configs: タグ別設定の辞書（設定ファイルから読み込まれる）
        debug: デバッグモード
    """
    if tag_configs is None:
        tag_configs = {}
    
    if not tags_data:
        print('No tags to generate tag_main.html')
        return
    
    if debug:
        print('\nGenerating tag_main.html...')
    
    # タグ情報を収集
    tag_info_list = []
    for tag_name, sections in sorted(tags_data.items()):
        count = len(sections)
        dates = sorted([s['date'] for s in sections])
        latest = dates[-1] if dates else 'N/A'
        oldest = dates[0] if dates else 'N/A'
        avg_relevance = sum(s['relevance'] for s in sections) / count if count > 0 else 0
        
        # 設定ファイルから説明文を取得
        tag_config = tag_configs.get(tag_name, {})
        description = tag_config.get('description', '')
        
        tag_info_list.append({
            'name': tag_name,
            'count': count,
            'latest': latest,
            'oldest': oldest,
            'avg_relevance': avg_relevance,
            'description': description
        })
    
    # カウント順でソート（降順）
    tag_info_list.sort(key=lambda x: x['count'], reverse=True)
    
    # タグリストHTMLを生成
    tag_items_html = []
    for info in tag_info_list:
        # 説明文があれば表示
        description_html = ''
        if info['description']:
            description_html = f'\n          <p class="tag-item-description">{info["description"]}</p>'
        
        item_html = f'''        <li class="tag-item">
          <a href="{info['name']}.html" class="tag-link">
            <span class="tag-name">#{info['name']}</span>
            <span class="tag-count">({info['count']}件)</span>
          </a>{description_html}
          <div class="tag-meta">
            <span class="tag-date-range">{info['oldest']} 〜 {info['latest']}</span>
            <span class="tag-relevance">平均関連度: {info['avg_relevance']:.0f}%</span>
          </div>
        </li>'''
        tag_items_html.append(item_html)
    
    # 完全なHTMLテンプレート
    html_content = f'''<!DOCTYPE html>
<html lang="ja">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>タグ一覧 - 100%health</title>
  <link rel="stylesheet" href="/1column.css">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script src="/js/jquery-3.6.0.min.js"></script>
  <script src="/js/main.js"></script>
  <script src="/js/mouse.js"></script>
  <style>
    /* タグ一覧ページ用スタイル */
    .tag-list {{
      list-style: none;
      padding: 0;
      margin: 2em 0;
    }}
    
    .tag-item {{
      margin-bottom: 1.5em;
      padding: 1em;
      border: 2px solid #000000;
    }}
    
    .tag-item:hover {{
      background-color: #f5f5f5;
    }}
    
    .tag-link {{
      text-decoration: none;
      color: #000000;
      display: block;
      margin-bottom: 0.5em;
    }}
    
    .tag-name {{
      font-size: 1.3em;
      font-weight: bold;
      margin-right: 0.5em;
    }}
    
    .tag-count {{
      color: #666;
      font-size: 0.9em;
    }}
    
    .tag-item-description {{
      font-size: 0.95em;
      color: #555;
      margin: 0.5em 0 0.3em 0;
      padding: 0.5em 0.8em;

      &::before {{content: "♥";}}
    }}
    
    .tag-meta {{
      font-size: 0.85em;
      color: #666;
      margin-top: 0.5em;
    }}
    
    .tag-date-range {{
      margin-right: 1em;
    }}
    
    .tag-stats-summary {{
      text-align: center;
      padding: 1em 0;
      margin: 1em 0;
      font-family: "saitamaar", 'PikoA', system-ui, sans-serif;
      color: #666;
      border-top: 2px dotted #000000;
      border-bottom: 2px dotted #000000;
    }}
    
  </style>
  <script>
    $(function () {{
      $("#zakkihtml").load("/txt/txt_main.html #zakki-list");
      $("#taghtml").load("/txt/txt_main.html #tag-list");
    }});
  </script>
  <link rel="stylesheet" href="/txt/zakki/zakki-style.css">
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
          <a class="addressbar" href="/txt/zakki/tag/tag_main.html">
            tag
          </a>
        </nav>
      </div>
    </header>
    <main id="main">
      <h1>タグ一覧</h1>
      
      <!-- 統計情報 -->
      <div class="tag-stats-summary">
        <p>全{len(tag_info_list)}タグ | 総セクション数: {sum(info['count'] for info in tag_info_list)}件</p>
      </div>
      
      <!-- タグリスト -->
      <ul class="tag-list">
{chr(10).join(tag_items_html)}
      </ul>
    </main>
    <footer id="main-footer">
      <div id="zakkihtml"></div>
      <div id="taghtml"></div>
      <div id="footerhtml"></div>
    </footer>
  </div>
</body>

</html>'''
    
    # ファイルに書き出し
    output_path = Path(output_dir) / 'tag_main.html'
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f'\nOK Generated tag_main.html: {output_path}')
        if debug:
            print(f'  Total tags: {len(tag_info_list)}')
            print(f'  Total sections: {sum(info["count"] for info in tag_info_list)}')
        
    except Exception as e:
        print(f'\nERROR: Failed to generate tag_main.html: {e}')


def update_txt_main_taglist(tags_data, txt_main_path, tag_sort='count-desc', debug=False):
    """
    txt_main.html のタグリストを更新
    
    Args:
        tags_data: {tag_name: sections} の辞書
        txt_main_path: txt_main.html のパス
        tag_sort: タグのソート順（'count-desc', 'count-asc', 'name-asc', 'name-desc'）
        debug: デバッグモード
    """
    if not tags_data:
        print('Warning: No tags to update txt_main.html')
        return
    
    txt_main_file = Path(txt_main_path)
    if not txt_main_file.exists():
        print(f'Warning: txt_main.html not found: {txt_main_path}')
        return
    
    if debug:
        print(f'\nUpdating txt_main.html tag list...')
        print(f'  File: {txt_main_path}')
        print(f'  Sort: {tag_sort}')
    
    # タグ情報を収集
    tag_info_list = []
    for tag_name, sections in tags_data.items():
        tag_info_list.append({
            'name': tag_name,
            'count': len(sections)
        })
    
    # ソート
    if tag_sort == 'count-desc':
        tag_info_list.sort(key=lambda x: x['count'], reverse=True)
    elif tag_sort == 'count-asc':
        tag_info_list.sort(key=lambda x: x['count'], reverse=False)
    elif tag_sort == 'name-asc':
        tag_info_list.sort(key=lambda x: x['name'])
    elif tag_sort == 'name-desc':
        tag_info_list.sort(key=lambda x: x['name'], reverse=True)
    else:
        # デフォルトは件数降順
        tag_info_list.sort(key=lambda x: x['count'], reverse=True)
    
    try:
        # ファイルを読み込む
        with open(txt_main_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 新しいタグリストのHTMLを生成
        new_taglist_items = []
        for tag_info in tag_info_list:
            item = f'                    <li class="tags"><a href="/txt/zakki/tag/{tag_info["name"]}.html">#{tag_info["name"]}</a></li>'
            new_taglist_items.append(item)
        
        new_taglist_content = '\n'.join(new_taglist_items)
        
        # 正規表現で #taglist の中身だけを置換
        import re
        pattern = r'(<ol id="taglist">)(.*?)(</ol>)'
        replacement = f'\\1\n{new_taglist_content}\n                    \\3'
        
        updated_html = re.sub(pattern, replacement, html_content, flags=re.DOTALL)
        
        # 変更があった場合のみファイルに書き出し
        if updated_html != html_content:
            with open(txt_main_file, 'w', encoding='utf-8') as f:
                f.write(updated_html)
            
            print(f'OK Updated txt_main.html tag list ({len(tag_info_list)} tags)')
            if debug:
                print(f'  Tags: {[t["name"] for t in tag_info_list]}')
        else:
            print('No changes needed in txt_main.html')
    
    except Exception as e:
        print(f'ERROR: Failed to update txt_main.html: {e}')


def main():
    # スクリプトのディレクトリからプロジェクトルートを計算
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    default_zakki_root = project_root / 'txt' / 'zakki'
    
    parser = argparse.ArgumentParser(
        description='タグページ自動生成スクリプト',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python build_tags.py                    # 全タグを生成
  python build_tags.py timeline music     # 特定のタグのみ生成
  python build_tags.py --debug            # デバッグモード
  python build_tags.py --config my_config.yaml  # 設定ファイル指定
'''
    )
    
    parser.add_argument(
        'tags',
        nargs='*',
        help='生成するタグ名（省略時は全タグ）'
    )
    
    parser.add_argument(
        '--zakki-root',
        default=None,
        help=f'zakki ディレクトリのパス（デフォルト: {default_zakki_root}）'
    )
    
    parser.add_argument(
        '--output-dir',
        default=None,
        help='出力先ディレクトリ（デフォルト: {{zakki-root}}/tag）'
    )
    
    parser.add_argument(
        '--sort-by',
        choices=['date-desc', 'date-asc', 'relevance-desc', 'relevance-asc'],
        default=None,
        help='ソート方法（デフォルト: date-desc）'
    )
    
    parser.add_argument(
        '--config',
        default=None,
        help='設定ファイルのパス（デフォルト: 自動検出）'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='デバッグ情報を表示'
    )
    
    args = parser.parse_args()
    
    # 設定ファイルを読み込み
    config = load_config(config_path=args.config, script_dir=script_dir)
    
    # 優先順位: コマンドライン引数 > 設定ファイル > デフォルト値
    zakki_root = args.zakki_root or config.get('zakki_root') or str(default_zakki_root)
    output_dir = args.output_dir or config.get('output_dir')
    sort_by = args.sort_by or config.get('default_sort') or 'date-desc'
    
    # zakki-root からの相対パスで output-dir を決定
    zakki_root = Path(zakki_root)
    if not output_dir:
        output_dir = zakki_root / 'tag'
    else:
        output_dir = Path(output_dir)
    
    print('=' * 60)
    print('タグページ自動生成スクリプト')
    print('=' * 60)
    
    # 設定情報をデバッグ表示
    if args.debug:
        print(f'\nConfiguration:')
        print(f'  zakki_root: {zakki_root}')
        print(f'  output_dir: {output_dir}')
        print(f'  sort_by: {sort_by}')
        print(f'  config_file: {args.config or "auto-detect"}')
        if config:
            print(f'  config_loaded: {len(config)} keys')
        print('')
    
    # タグ別設定を取得
    tag_configs = config.get('tags', {})
    
    # txt_main.html 更新設定を取得
    update_txt_main = config.get('update_txt_main', True)
    txt_main_path = config.get('txt_main_path')
    txt_main_tag_sort = config.get('txt_main_tag_sort', 'count-desc')
    
    # txt_main_path の絶対パス解決
    if txt_main_path:
        txt_main_path = Path(txt_main_path)
        if not txt_main_path.is_absolute():
            txt_main_path = script_dir / txt_main_path
    else:
        # デフォルトパス
        txt_main_path = project_root / 'txt' / 'txt_main.html'
    
    tags_data = build_tag_pages(
        zakki_root=str(zakki_root),
        output_dir=str(output_dir),
        tag_filter=args.tags if args.tags else None,
        sort_by=sort_by,
        tag_configs=tag_configs,
        debug=args.debug
    )
    
    # タグ一覧ページを生成（タグフィルターがない場合のみ）
    if tags_data and not args.tags:
        generate_tag_main_page(tags_data, str(output_dir), tag_configs=tag_configs, debug=args.debug)
        
        # txt_main.html を更新（設定で有効な場合）
        if update_txt_main:
            update_txt_main_taglist(tags_data, str(txt_main_path), tag_sort=txt_main_tag_sort, debug=args.debug)
    
    print('\nYou can now open the generated tag pages in your browser!')


if __name__ == '__main__':
    main()

