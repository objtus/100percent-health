#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
雑記ページ生成スクリプト用の共通ユーティリティモジュール

このモジュールは以下の機能を提供します:
- 設定ファイルの読み込み
- バックアップ機能
- ディレクトリ/ファイル探索
- HTMLテンプレート生成
"""

from pathlib import Path
import yaml
import shutil
import sys
from typing import Dict, Any, Tuple, Optional, List

# UTF-8で出力（Windows対応）
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    設定ファイルを読み込む
    
    Args:
        config_path: 設定ファイルのパス（None の場合はデフォルト設定）
    
    Returns:
        設定辞書
    """
    # デフォルト設定
    default_config = {
        'sort_order': 'desc',
        'truncate': {
            'max_chars': 300,
            'min_elements': 2,
            'max_elements': 6,
            'text_truncate_length': 120,
            'max_list_items': 3,
            'list_item_estimate': 25,
        },
        'debug': False,
        'create_backup': True,
        'adjacent_month_search_range': 24,
        'adjacent_year_search_range': 10,  # 年別ページ用
    }
    
    # 設定ファイルが指定されている場合は読み込み
    if config_path:
        config_file = Path(config_path)
        if not config_file.exists():
            print(f'Warning: Config file not found: {config_path}')
            print('Using default configuration.')
            return default_config
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                user_config = yaml.safe_load(f)
                if user_config:
                    # デフォルト設定とマージ（truncate は深くマージ）
                    if 'truncate' in user_config:
                        default_config['truncate'].update(user_config['truncate'])
                        del user_config['truncate']
                    default_config.update(user_config)
                    print(f'✓ Loaded configuration from: {config_path}')
        except Exception as e:
            print(f'Error reading config file: {e}')
            print('Using default configuration.')
    
    return default_config


def create_backup(file_path: Path, enabled: bool = True) -> bool:
    """
    ファイルのバックアップを作成する
    
    Args:
        file_path: バックアップ対象のファイルパス
        enabled: バックアップを作成するかどうか
    
    Returns:
        バックアップが成功したかどうか
    """
    if not enabled:
        return True
    
    if not file_path.exists():
        return True  # ファイルが存在しない場合はスキップ
    
    backup_path = file_path.parent / f'{file_path.name}.bak'
    
    try:
        shutil.copy2(file_path, backup_path)
        print(f'✓ Backup created: {backup_path}')
        return True
    except Exception as e:
        print(f'Warning: Could not create backup: {e}')
        return False


def find_adjacent_months(
    year: str, 
    month: str, 
    days_dir: str, 
    search_range: int = 24
) -> Tuple[Tuple[Optional[str], Optional[str]], Tuple[Optional[str], Optional[str]]]:
    """
    実際に存在する前後の月を検出
    
    Args:
        year: 現在の年
        month: 現在の月
        days_dir: 日別HTMLディレクトリのパス
        search_range: 探索範囲（最大何ヶ月前後まで探すか）
    
    Returns:
        ((prev_year, prev_month), (next_year, next_month))
        存在しない場合は (None, None)
    """
    days_path = Path(days_dir)
    # txt/zakki/ ディレクトリを取得
    zakki_root = days_path.parent.parent.parent
    
    current_ym = int(year) * 12 + int(month)
    
    # 前の月を探す
    prev_year, prev_month = None, None
    for i in range(1, search_range + 1):
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
    
    # 次の月を探す
    next_year, next_month = None, None
    for i in range(1, search_range + 1):
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


def find_adjacent_years(
    year: str,
    zakki_root: Path,
    search_range: int = 10
) -> Tuple[Optional[str], Optional[str]]:
    """
    実際に存在する前後の年を検出
    
    Args:
        year: 現在の年
        zakki_root: zakki ディレクトリのルートパス
        search_range: 探索範囲（最大何年前後まで探すか）
    
    Returns:
        (prev_year, next_year)
        存在しない場合は None
    """
    current_year = int(year)
    
    # 前の年を探す
    prev_year = None
    for i in range(1, search_range + 1):
        check_year = current_year - i
        check_year_str = str(check_year)
        check_year_dir = zakki_root / check_year_str
        
        if check_year_dir.exists() and check_year_dir.is_dir():
            # 月のディレクトリがあるかチェック
            month_dirs = [d for d in check_year_dir.iterdir() if d.is_dir() and d.name.isdigit()]
            if month_dirs:
                prev_year = check_year_str
                print(f'  Found previous year: {prev_year}')
                break
    
    # 次の年を探す
    next_year = None
    for i in range(1, search_range + 1):
        check_year = current_year + i
        check_year_str = str(check_year)
        check_year_dir = zakki_root / check_year_str
        
        if check_year_dir.exists() and check_year_dir.is_dir():
            month_dirs = [d for d in check_year_dir.iterdir() if d.is_dir() and d.name.isdigit()]
            if month_dirs:
                next_year = check_year_str
                print(f'  Found next year: {next_year}')
                break
    
    return prev_year, next_year


def get_months_in_year(year: str, zakki_root: Path) -> List[str]:
    """
    指定された年に存在する月のリストを取得
    
    Args:
        year: 年
        zakki_root: zakki ディレクトリのルートパス
    
    Returns:
        月のリスト（例: ['01', '03', '12']）
    """
    year_dir = zakki_root / year
    
    if not year_dir.exists():
        return []
    
    months = []
    for month_dir in sorted(year_dir.iterdir()):
        # 数字のディレクトリ名のみ（01, 02, ...）
        if month_dir.is_dir() and month_dir.name.isdigit():
            # days/ ディレクトリが存在し、HTMLファイルがあるか確認
            days_dir = month_dir / 'days'
            if days_dir.exists():
                html_files = list(days_dir.glob('*.html'))
                if html_files:
                    months.append(month_dir.name.zfill(2))
    
    return months


def count_articles_in_month(year: str, month: str, zakki_root: Path) -> int:
    """
    指定された月の記事数をカウント
    
    Args:
        year: 年
        month: 月
        zakki_root: zakki ディレクトリのルートパス
    
    Returns:
        記事数
    """
    days_dir = zakki_root / year / month / 'days'
    
    if not days_dir.exists():
        return 0
    
    html_files = list(days_dir.glob('*.html'))
    return len(html_files)


def generate_html_head(
    title: str,
    additional_css: Optional[List[str]] = None,
    additional_js: Optional[List[str]] = None
) -> str:
    """
    HTML <head> セクションを生成
    
    Args:
        title: ページタイトル
        additional_css: 追加のCSSファイルパスのリスト
        additional_js: 追加のJavaScriptファイルパスのリスト
    
    Returns:
        HTML <head> セクションの文字列
    """
    css_links = additional_css or []
    js_scripts = additional_js or []
    
    css_html = '\n  '.join([f'<link rel="stylesheet" href="{css}">' for css in css_links])
    js_html = '\n  '.join([f'<script src="{js}"></script>' for js in js_scripts])
    
    head = f'''<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
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
  </script>'''
    
    if css_html:
        head += f'\n  {css_html}'
    if js_html:
        head += f'\n  {js_html}'
    
    head += '\n</head>'
    
    return head


def generate_html_footer() -> str:
    """
    HTML フッターセクションを生成
    
    Returns:
        HTML フッターの文字列
    """
    return '''  <footer id="main-footer">
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
    if (typeof LuminousGallery !== 'undefined') {
      new LuminousGallery(document.querySelectorAll('a[href$=jpg],a[href$=png],a[href$=gif]'));
    }
  </script>
</div>'''


def generate_breadcrumb(items: List[Tuple[str, str]]) -> str:
    """
    パンくずナビゲーションを生成
    
    Args:
        items: (リンクテキスト, URL) のタプルのリスト
    
    Returns:
        パンくずナビゲーションのHTML文字列
    """
    breadcrumb_items = []
    for i, (text, url) in enumerate(items):
        breadcrumb_items.append(f'<a class="addressbar" href="{url}">{text}</a>')
        if i < len(items) - 1:
            breadcrumb_items.append('/')
    
    return '\n          '.join(breadcrumb_items)


if __name__ == '__main__':
    # テスト用
    print('build_utils.py - 共通ユーティリティモジュール')
    print('このファイルは直接実行するものではありません。')
    print('build_month.py または build_year.py から import して使用してください。')

