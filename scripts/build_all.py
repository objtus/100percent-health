#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
雑記ページ一括生成スクリプト

複数の月別ページや年別ページを一括で生成できます。

Usage:
    python build_all.py --year <year> <zakki_root> [options]
    python build_all.py --months <months> <zakki_root> [options]
    python build_all.py --range <start> <end> <zakki_root> [options]
    
Example:
    # 2025年の全月を生成
    python build_all.py --year 2025 D:\\web\\100percent-health\\txt\\zakki
    
    # 特定の月を複数生成
    python build_all.py --months 2025-01,2025-03,2025-05 D:\\web\\100percent-health\\txt\\zakki
    
    # 範囲指定で生成
    python build_all.py --range 2025-01 2025-06 D:\\web\\100percent-health\\txt\\zakki
    
    # 年別ページも同時に生成
    python build_all.py --year 2025 D:\\web\\100percent-health\\txt\\zakki --with-year
"""

from pathlib import Path
import sys
import argparse
from typing import List, Tuple, Optional
from build_utils import (
    load_config,
    get_months_in_year
)
from build_month import build_month_page
from build_year import build_year_page

# UTF-8で出力（Windows対応）
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass


def parse_month_string(month_str: str) -> Tuple[str, str]:
    """
    月の文字列をパース（例: "2025-01" → ("2025", "01")）
    
    Args:
        month_str: 月の文字列（YYYY-MM形式）
    
    Returns:
        (year, month) のタプル
    """
    try:
        parts = month_str.split('-')
        if len(parts) != 2:
            raise ValueError(f'Invalid month format: {month_str}')
        
        year = parts[0]
        month = parts[1].zfill(2)
        
        return year, month
    except Exception as e:
        raise ValueError(f'Invalid month format: {month_str}. Use YYYY-MM format (e.g., 2025-01)')


def get_month_range(start: str, end: str) -> List[Tuple[str, str]]:
    """
    開始月から終了月までの範囲を生成
    
    Args:
        start: 開始月（YYYY-MM形式）
        end: 終了月（YYYY-MM形式）
    
    Returns:
        (year, month) のタプルのリスト
    """
    start_year, start_month = parse_month_string(start)
    end_year, end_month = parse_month_string(end)
    
    start_ym = int(start_year) * 12 + int(start_month)
    end_ym = int(end_year) * 12 + int(end_month)
    
    if start_ym > end_ym:
        raise ValueError(f'Start month ({start}) must be before or equal to end month ({end})')
    
    months = []
    for ym in range(start_ym, end_ym + 1):
        year = ym // 12
        month = ym % 12
        if month == 0:
            year -= 1
            month = 12
        
        months.append((str(year), str(month).zfill(2)))
    
    return months


def build_all_months(
    months: List[Tuple[str, str]],
    zakki_root: Path,
    config: dict,
    continue_on_error: bool = True
) -> Tuple[int, int]:
    """
    複数の月別ページを一括生成
    
    Args:
        months: (year, month) のタプルのリスト
        zakki_root: zakki ディレクトリのルートパス
        config: 設定辞書
        continue_on_error: エラー発生時も続行するか
    
    Returns:
        (成功数, 失敗数) のタプル
    """
    success_count = 0
    failure_count = 0
    total = len(months)
    
    print(f'\n{"="*60}')
    print(f'Building {total} month page(s)...')
    print(f'{"="*60}\n')
    
    for i, (year, month) in enumerate(months, 1):
        month_str = f'{year}-{month}'
        days_dir = zakki_root / year / month / 'days'
        
        # days ディレクトリが存在するかチェック
        if not days_dir.exists():
            print(f'[{i}/{total}] {month_str}: ✗ SKIPPED (days directory not found)')
            failure_count += 1
            continue
        
        # HTMLファイルがあるかチェック
        html_files = list(days_dir.glob('*.html'))
        if not html_files:
            print(f'[{i}/{total}] {month_str}: ✗ SKIPPED (no HTML files found)')
            failure_count += 1
            continue
        
        try:
            print(f'[{i}/{total}] Building {month_str}...', end=' ')
            build_month_page(year, month, str(days_dir), config)
            print(f'✓ SUCCESS ({len(html_files)} article(s))')
            success_count += 1
        except Exception as e:
            print(f'✗ FAILED: {e}')
            failure_count += 1
            
            if not continue_on_error:
                raise
    
    return success_count, failure_count


def build_all_for_year(
    year: str,
    zakki_root: Path,
    config: dict,
    with_year_page: bool = False,
    continue_on_error: bool = True
) -> Tuple[int, int]:
    """
    指定された年の全月を一括生成
    
    Args:
        year: 年
        zakki_root: zakki ディレクトリのルートパス
        config: 設定辞書
        with_year_page: 年別ページも生成するか
        continue_on_error: エラー発生時も続行するか
    
    Returns:
        (成功数, 失敗数) のタプル
    """
    # 年内の全ての月を取得
    months_list = get_months_in_year(year, zakki_root)
    
    if not months_list:
        print(f'Warning: No months with articles found in {year}')
        return 0, 0
    
    # (year, month) のタプルに変換
    months = [(year, month) for month in months_list]
    
    print(f'Found {len(months)} month(s) with articles in {year}: {", ".join(months_list)}')
    
    # 月別ページを生成
    success_count, failure_count = build_all_months(
        months, zakki_root, config, continue_on_error
    )
    
    # 年別ページを生成
    if with_year_page and success_count > 0:
        print(f'\n{"="*60}')
        print(f'Building year page for {year}...')
        print(f'{"="*60}\n')
        
        try:
            build_year_page(year, str(zakki_root), config)
            print(f'✓ Year page generated successfully')
        except Exception as e:
            print(f'✗ Failed to generate year page: {e}')
            if not continue_on_error:
                raise
    
    return success_count, failure_count


def parse_arguments():
    """
    コマンドライン引数を解析
    """
    parser = argparse.ArgumentParser(
        description='雑記ページ一括生成スクリプト',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
例:
  # 2025年の全月を生成
  python build_all.py --year 2025 ./txt/zakki
  
  # 2025年の全月 + 年別ページを生成
  python build_all.py --year 2025 ./txt/zakki --with-year
  
  # 特定の月を複数生成
  python build_all.py --months 2025-01,2025-03,2025-05 ./txt/zakki
  
  # 範囲指定で生成
  python build_all.py --range 2025-01 2025-06 ./txt/zakki
  
  # デバッグモード
  python build_all.py --year 2025 ./txt/zakki --debug
  
  # エラー時に停止
  python build_all.py --year 2025 ./txt/zakki --stop-on-error
        '''
    )
    
    # 必須引数
    parser.add_argument('zakki_root', type=str, help='zakki ディレクトリのルートパス')
    
    # 生成モード（いずれか1つ必須）
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        '--year',
        type=str,
        help='年を指定（その年の全月を生成）'
    )
    mode_group.add_argument(
        '--months',
        type=str,
        help='複数月を指定（カンマ区切り、例: 2025-01,2025-03,2025-05）'
    )
    mode_group.add_argument(
        '--range',
        nargs=2,
        metavar=('START', 'END'),
        help='月の範囲を指定（例: 2025-01 2025-06）'
    )
    
    # オプション引数
    parser.add_argument(
        '--with-year',
        action='store_true',
        help='年別ページも同時に生成（--year指定時のみ有効）'
    )
    
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
        help='記事の並び順（asc: 古い順, desc: 新しい順）'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='デバッグモードを有効化'
    )
    
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='バックアップを作成しない'
    )
    
    parser.add_argument(
        '--stop-on-error',
        action='store_true',
        help='エラー発生時に処理を停止（デフォルトは続行）'
    )
    
    return parser.parse_args()


def main():
    args = parse_arguments()
    
    zakki_root = Path(args.zakki_root)
    
    if not zakki_root.exists():
        print(f'Error: Directory not found: {zakki_root}')
        sys.exit(1)
    
    # 設定を読み込み
    config = load_config(args.config)
    
    # コマンドライン引数で設定を上書き
    if args.sort_order:
        config['sort_order'] = args.sort_order
    
    if args.debug:
        config['debug'] = True
    
    if args.no_backup:
        config['create_backup'] = False
    
    continue_on_error = not args.stop_on_error
    
    # 実行情報を表示
    print('='*60)
    print('雑記ページ一括生成スクリプト')
    print('='*60)
    print(f'Configuration:')
    print(f'  Sort order: {config["sort_order"]}')
    print(f'  Debug mode: {config["debug"]}')
    print(f'  Create backup: {config["create_backup"]}')
    print(f'  Continue on error: {continue_on_error}')
    
    success_count = 0
    failure_count = 0
    
    try:
        # モードに応じて処理
        if args.year:
            # 年単位で生成
            success_count, failure_count = build_all_for_year(
                args.year,
                zakki_root,
                config,
                args.with_year,
                continue_on_error
            )
        
        elif args.months:
            # 複数月を個別に指定
            month_strings = [m.strip() for m in args.months.split(',')]
            months = [parse_month_string(m) for m in month_strings]
            success_count, failure_count = build_all_months(
                months,
                zakki_root,
                config,
                continue_on_error
            )
        
        elif args.range:
            # 範囲指定
            months = get_month_range(args.range[0], args.range[1])
            success_count, failure_count = build_all_months(
                months,
                zakki_root,
                config,
                continue_on_error
            )
        
        # サマリー表示
        print(f'\n{"="*60}')
        print(f'Summary:')
        print(f'{"="*60}')
        print(f'✓ Success: {success_count} page(s)')
        if failure_count > 0:
            print(f'✗ Failed/Skipped: {failure_count} page(s)')
        print(f'Total: {success_count + failure_count} page(s)')
        print(f'{"="*60}\n')
        
        if failure_count > 0:
            sys.exit(1)
        
    except Exception as e:
        print(f'\n✗ Fatal error: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()

