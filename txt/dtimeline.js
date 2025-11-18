      // =============================================================================
      // TimelineFilter モジュール
      // =============================================================================
      // タイムライン表示のフィルタリング機能を提供するモジュール
      //
      // 主な機能:
      // - カテゴリ別フィルタリング（ラジオボタン・チェックボックス）
      // - テキスト検索
      // - URL パラメータによる状態管理
      // - テキスト選択からの検索
      // - DOM要素のキャッシュによるパフォーマンス最適化
      //
      // アーキテクチャ:
      // - IIFE でカプセル化し、グローバルスコープの汚染を防止
      // - 状態管理の一元化
      // - CSS駆動による効率的な表示制御
      // =============================================================================

      (function(global) {
        'use strict';

      // =============================================================================
      // 定数定義
      // =============================================================================

      const CONSTANTS = {
        // UI関連
        SEARCH_BUTTON: {
          WIDTH: 50,
          HEIGHT: 28,
          MARGIN: 8,
          Z_INDEX_BASE: 9999,
          Z_INDEX_ACTIVE: 10000
        },
        
        // タイミング関連
        DELAYS: {
          TEXT_SELECTION: 50,        // テキスト選択検出の遅延
          SEARCH_DEBOUNCE: 300,      // 検索入力のデバウンス
          UI_UPDATE: 10,             // UI更新の遅延
          SYSTEM_INIT: 50            // システム初期化の遅延
        },
        
        // デフォルト値
        DEFAULTS: {
          SELECTED_CLASS: 'mixed',
          FALLBACK_CATEGORIES: ['d', 'sns', 'web', 'tech', 'culture']
        }
      };

      // =============================================================================
      // TimelineFilter 基盤クラス
      // =============================================================================

      class TimelineFilter {
        /**
         * TimelineFilter コンストラクタ
         * フィルタリングシステムの初期状態を設定
         */
        constructor() {
          // フィルタリング状態の初期化
          this.state = {
            searchText: '',                                    // 検索テキスト
            selectedClass: CONSTANTS.DEFAULTS.SELECTED_CLASS,  // 選択されたラジオボタン値
            selectedCheckboxes: new Set()                      // 選択されたチェックボックスのSet
          };
          
          // 年の表示状態キャッシュ（yearId -> boolean）
          this.yearCache = new Map();
          
          // テキスト選択用検索ボタン
          this.searchButton = null;
          
          // カテゴリ情報のキャッシュ
          this.categoryCache = null;
          
          // DOM要素のキャッシュ（パフォーマンス最適化）
          this.cachedElements = {
            body: null,                    // body要素
            searchInput: null,             // 検索入力フィールド
            timelineLayout: null,          // タイムラインコンテナ
            checkboxes: null,              // 全チェックボックス
            radioButtons: null,            // 全ラジオボタン
            resetButton: null,             // リセットボタン（サイドバー内）
            clearButton: null,             // クリアボタン
            timelineSidebarToggle: null,   // 年表サイドバートグルボタン
            timelineQuickReset: null       // クイックリセットボタン
          };
        }

        // =============================================================================
        // 状態管理
        // =============================================================================

        /**
         * 状態を更新する
         * @param {Object} changes - 更新する状態のオブジェクト
         */
        updateState(changes) {
          const oldState = { ...this.state };
          Object.assign(this.state, changes);
        }

        /**
         * フィルタリングが適用されているかを判定
         * @returns {boolean} フィルタリング中の場合true
         */
        isFilteringActive() {
          // 検索テキストが入力されている
          if (this.state.searchText && this.state.searchText.trim() !== '') {
            return true;
          }

          // ラジオボタンが "mixed" 以外
          if (this.state.selectedClass !== CONSTANTS.DEFAULTS.SELECTED_CLASS) {
            return true;
          }

          // チェックボックスが全選択でない
          const allCategories = this.getAvailableCategories();
          if (this.state.selectedCheckboxes.size !== allCategories.length) {
            return true;
          }

          // 全てのカテゴリがチェックされているか確認
          const allChecked = allCategories.every(category => 
            this.state.selectedCheckboxes.has(category)
          );

          return !allChecked;
        }

        /**
         * 年表サイドバートグルボタンの表示を更新
         * フィルタリング状態に応じてボタンの見た目とテキストを変更
         */
        updateSidebarToggleButton() {
          const $toggle = this.getCachedElement('timelineSidebarToggle');
          const $quickReset = this.getCachedElement('timelineQuickReset');
          
          if (!$toggle || $toggle.length === 0) {
            return;
          }

          const isFiltering = this.isFilteringActive();

          if (isFiltering) {
            // フィルタリング中
            $toggle.addClass('filtering-active');
            $toggle.html('menu<span class="filter-status">(filtered)</span>');
            $toggle.attr('aria-label', 'メニュー - フィルタリング中');
            
            // クイックリセットボタンを表示
            if ($quickReset && $quickReset.length > 0) {
              $quickReset.show();
            }
          } else {
            // デフォルト状態
            $toggle.removeClass('filtering-active');
            $toggle.html('menu');
            $toggle.attr('aria-label', 'メニュー');
            
            // クイックリセットボタンを非表示
            if ($quickReset && $quickReset.length > 0) {
              $quickReset.hide();
            }
          }
        }

        // =============================================================================
        // DOM要素キャッシュ管理（パフォーマンス最適化）
        // =============================================================================

        /**
         * DOM要素をキャッシュに保存
         * 頻繁にアクセスする要素を事前に取得してパフォーマンスを向上
         */
        initializeCachedElements() {
          this.cachedElements.body = $('body');
          this.cachedElements.searchInput = $('#searchInput');
          this.cachedElements.timelineLayout = $('#timeline_layout');
          this.cachedElements.checkboxes = $('input[type="checkbox"]');
          this.cachedElements.radioButtons = $('input[name="class"]');
          this.cachedElements.resetButton = $('#reset-all');
          this.cachedElements.clearButton = $('#clearButton');
          this.cachedElements.timelineSidebarToggle = $('#timeline-sidebar-toggle');
          this.cachedElements.timelineQuickReset = $('#timeline-quick-reset');
        }

        /**
         * キャッシュされたDOM要素を取得
         * キャッシュが無効な場合は自動的に再取得
         * @param {string} key - 要素のキー名
         * @returns {jQuery} キャッシュされたjQueryオブジェクト
         */
        getCachedElement(key) {
          if (!this.cachedElements[key] || this.cachedElements[key].length === 0) {
            // キャッシュが無効な場合は再取得
            this.initializeCachedElements();
          }
          return this.cachedElements[key];
        }

        // =============================================================================
        // カテゴリタグ表示機能
        // =============================================================================

        /**
         * 全てのli要素にカテゴリタグを追加
         * 各項目の下部に控えめなカテゴリタグを表示
         */
        initializeCategoryTags() {
          const $timelineLayout = this.getCachedElement('timelineLayout');
          if (!$timelineLayout || $timelineLayout.length === 0) {
            return;
          }

          const availableCategories = this.getAvailableCategories();
          
          $timelineLayout.find('li').each((index, item) => {
            const $item = $(item);
            
            // 既にタグが追加されている場合はスキップ
            if ($item.find('.category-tags-subtle').length > 0) {
              return;
            }

            // li要素のクラスを取得
            const classes = $item.attr('class');
            if (!classes) {
              return;
            }

            // カテゴリのみを抽出
            const itemClasses = classes.split(' ');
            const categories = itemClasses.filter(cls => 
              availableCategories.includes(cls)
            );

            if (categories.length === 0) {
              return;
            }

            // カテゴリタグのコンテナを作成
            const $tagsContainer = $('<div class="category-tags-subtle"></div>');
            
            // 各カテゴリのタグを作成
            categories.forEach(category => {
              const $tag = $('<span class="category-tag"></span>')
                .text(category)
                .attr('data-category', category);
              $tagsContainer.append($tag);
            });

            // li要素の末尾に追加
            $item.append($tagsContainer);
          });

          console.log('[TimelineFilter] カテゴリタグ初期化完了');
        }

        /**
         * カテゴリタグのクリックイベントを設定
         * タグをクリックすると、そのカテゴリでフィルタリング
         */
        setupCategoryTagEvents() {
          // イベント委譲を使用してパフォーマンスを最適化
          const $timelineLayout = this.getCachedElement('timelineLayout');
          if (!$timelineLayout || $timelineLayout.length === 0) {
            return;
          }

          // 既存のイベントを削除
          $timelineLayout.off('click.categoryTag');

          // カテゴリタグのクリックイベント
          $timelineLayout.on('click.categoryTag', '.category-tag', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const category = $(e.target).attr('data-category');
            if (!category) {
              return;
            }

            console.log(`[TimelineFilter] カテゴリタグクリック: ${category}`);

            // ラジオボタンを選択
            const $radioButton = $(`input[name="class"][value="${category}"]`);
            if ($radioButton.length > 0) {
              $radioButton.prop('checked', true);
              
              // フィルタリング実行
              this.onFilterEvent('radio_change', e);
            }
          });

          console.log('[TimelineFilter] カテゴリタグイベント設定完了');
        }

        // =============================================================================
        // カテゴリ管理機能
        // =============================================================================

        /**
         * HTMLからカテゴリを動的に取得
         * チェックボックスのvalue属性から利用可能なカテゴリを抽出
         * @returns {Array<string>} カテゴリ名の配列
         */
        getAvailableCategories() {
          if (this.categoryCache) {
            return this.categoryCache; // キャッシュがあれば使用
          }

          try {
            const categories = [];
            const $checkboxes = $('input[type="checkbox"][name="class"]');
            
            if ($checkboxes.length === 0) {
              throw new Error('チェックボックス要素が見つかりません');
            }

            $checkboxes.each((index, checkbox) => {
              const value = $(checkbox).val();
              if (value && value.trim()) {
                categories.push(value.trim());
              }
            });

            if (categories.length === 0) {
              throw new Error('有効なカテゴリが見つかりません');
            }

            this.categoryCache = categories;
            console.log('[TimelineFilter] カテゴリ取得成功:', categories);
            return categories;

          } catch (error) {
            console.warn('[TimelineFilter] カテゴリ取得エラー:', error.message);
            const fallback = this.getFallbackCategories();
            this.categoryCache = fallback;
            console.log('[TimelineFilter] フォールバック使用:', fallback);
            return fallback;
          }
        }

        /**
         * フォールバック用の最小限カテゴリを返す
         * カテゴリ取得に失敗した場合に使用
         * @returns {Array<string>} フォールバックカテゴリの配列
         */
        getFallbackCategories() {
          return CONSTANTS.DEFAULTS.FALLBACK_CATEGORIES;
        }

        /**
         * デフォルト状態を動的に生成
         * @returns {Object} デフォルト状態オブジェクト
         */
        getDefaultState() {
          return {
            class: CONSTANTS.DEFAULTS.SELECTED_CLASS,
            checkboxes: this.getAvailableCategories()
          };
        }

        /**
         * デフォルトチェックボックス選択をSetとして返す
         * @returns {Set<string>} カテゴリ名のSet
         */
        getDefaultCheckboxesSet() {
          return new Set(this.getAvailableCategories());
        }

        // =============================================================================
        // テキスト選択機能
        // =============================================================================

        /**
         * テキスト選択機能を初期化
         * ユーザーがテキストを選択した際に検索ボタンを表示する機能を設定
         */
        initializeTextSelection() {

          // 検索ボタンを作成
          this.createTextSelectionSearchButton();

          // 既存のTimelineFilter関連のイベントを削除
          $(document).off('.timelineTextSelection');

          // mouseupイベントリスナーを設定
          $(document).on('mouseup.timelineTextSelection', (e) => {

            // 検索ボタン自体のクリックは無視
            if (this.searchButton && $(e.target).is(this.searchButton)) {
              return;
            }

            // handleTextSelectionを呼び出し
            this.handleTextSelection(e);
          });

          // 他の場所をクリックした時にボタンを非表示
          $(document).on('click.timelineTextSelection', (e) => {
            if (this.searchButton && !$(e.target).is(this.searchButton)) {
              this.hideTextSelectionSearchButton();
            }
          });

        }

        // 文字選択用検索ボタンを作成
        createTextSelectionSearchButton() {
          // 既存のボタンがあれば削除
          if (this.searchButton) {
            this.searchButton.remove();
          }

          this.searchButton = $('<button>')
            .text('検索')
            .addClass('timeline-text-selection-button');

          $('body').append(this.searchButton);
        }

        // テキスト選択時の処理
        handleTextSelection(event) {
          // 少し遅延させて確実に選択状態を取得
          setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText && selectedText.length > 0) {
              // 選択範囲の位置情報を取得
              try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                this.showTextSelectionSearchButton(rect, selectedText, event);
              } catch (e) {
                // 選択範囲の取得に失敗
                this.hideTextSelectionSearchButton();
              }
            } else {
              this.hideTextSelectionSearchButton();
            }
          }, CONSTANTS.DELAYS.TEXT_SELECTION);
        }

        // 文字選択用検索ボタンを表示
        showTextSelectionSearchButton(rect, selectedText, originalEvent) {
          if (!this.searchButton) return;

          // 既存のクリックイベントを削除
          this.searchButton.off('click.textSelectionSearch');

          // 新しいクリックイベントを設定
          this.searchButton.on('click.textSelectionSearch', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 検索フィールドに選択テキストを設定
            this.getCachedElement('searchInput').val(selectedText);

            // 検索ボタンを非表示
            this.hideTextSelectionSearchButton();

            // 選択を解除
            window.getSelection().removeAllRanges();

            // フィルタリング実行（基本的な検索機能）
            this.performBasicSearch(selectedText);
          });

          // 改良された位置計算
          const buttonWidth = CONSTANTS.SEARCH_BUTTON.WIDTH;
          const buttonHeight = CONSTANTS.SEARCH_BUTTON.HEIGHT;
          const margin = CONSTANTS.SEARCH_BUTTON.MARGIN;

          // 基本位置：選択範囲の右上
          let left = rect.right + margin;
          let top = rect.top - buttonHeight - margin;

          // ビューポートの境界を取得
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;

          // 右端チェック：画面外に出る場合は左側に配置
          if (left + buttonWidth > viewportWidth + scrollX) {
            left = rect.left - buttonWidth - margin;
          }

          // 左端チェック：画面外に出る場合は最小値に設定
          if (left < scrollX) {
            left = scrollX + margin;
          }

          // 上端チェック：画面外に出る場合は選択範囲の下に配置
          if (top < scrollY) {
            top = rect.bottom + margin;
          }

          // 下端チェック：画面外に出る場合は上に移動
          if (top + buttonHeight > viewportHeight + scrollY) {
            top = rect.top - buttonHeight - margin;
            // それでも画面外の場合は選択範囲内に配置
            if (top < scrollY) {
              top = rect.top + margin;
            }
          }

          // 最終的な位置調整（最小限の表示領域を確保）
          left = Math.max(scrollX + 5, Math.min(left, viewportWidth + scrollX - buttonWidth - 5));
          top = Math.max(scrollY + 5, Math.min(top, viewportHeight + scrollY - buttonHeight - 5));

          // 位置とz-indexのみをJavaScriptで動的に設定
          this.searchButton.css({
            top: top + 'px',
            left: left + 'px',
            'z-index': CONSTANTS.SEARCH_BUTTON.Z_INDEX_ACTIVE
          }).show();
        }

        /**
         * 文字選択用検索ボタンを非表示
         */
        hideTextSelectionSearchButton() {
          if (this.searchButton) {
            this.searchButton.hide();
            this.searchButton.off('click.textSelectionSearch');
          }
        }

        /**
         * テキスト選択からの検索を実行
         * @param {string} searchText - 検索テキスト
         */
        performBasicSearch(searchText) {
          // 状態を更新
          this.updateState({ searchText: searchText });

          // 統合されたフィルタリングロジックを実行
          this.performSearch();
        }

        // =============================================================================
        // URLパラメータ管理
        // =============================================================================

        /**
         * 現在の状態をURLパラメータに反映
         * デフォルト状態と異なる場合のみパラメータを追加
         */
        updateUrlParams() {

          const urlParams = new URLSearchParams();
          const searchValue = this.state.searchText.trim();
          const selectedClass = this.state.selectedClass;
          const selectedCheckboxes = Array.from(this.state.selectedCheckboxes);

          // 【修正】デフォルト状態を動的取得に変更
          const defaultState = this.getDefaultState();

          if (searchValue) {
            urlParams.set('search', searchValue);
          }

          // デフォルト状態と異なる場合のみパラメータを追加
          if (selectedClass !== defaultState.class) {
            urlParams.set('class', selectedClass);
          }

          if (JSON.stringify(selectedCheckboxes.sort()) !== JSON.stringify(defaultState.checkboxes.sort())) {
            urlParams.set('checkboxes', selectedCheckboxes.join(','));
          }

          const newUrl = window.location.origin + window.location.pathname +
            (urlParams.toString() ? '?' + urlParams.toString() : '');

          window.history.replaceState(null, null, newUrl);
        }

        /**
         * URLパラメータから状態を復元
         * ページ読み込み時やURL変更時にフィルタ状態を復元
         * パラメータ例: ?class=d&checkboxes=d,sns&search=mastodon
         */
        restoreFromUrl() {
          const urlParams = new URLSearchParams(window.location.search);
          const selectedClass = urlParams.get('class');
          const selectedCheckboxes = urlParams.get('checkboxes');
          const searchQuery = urlParams.get('search');

          // 状態オブジェクトの更新
          const updates = {};

          if (selectedClass) {
            updates.selectedClass = selectedClass;
          }

          if (selectedCheckboxes) {
            const checkboxValues = selectedCheckboxes.split(',');
            updates.selectedCheckboxes = new Set(checkboxValues);
          } else {
            // デフォルトチェックボックス選択を動的取得
            updates.selectedCheckboxes = this.getDefaultCheckboxesSet();
          }

          if (searchQuery) {
            updates.searchText = searchQuery;
          }

          // 状態を一括更新
          this.updateState(updates);

          // フォーム要素にも反映
          this.syncStateToForm();
        }

        /**
         * 内部状態をフォーム要素に同期
         * 状態オブジェクトの内容をUIに反映（URLから復元時などに使用）
         */
        syncStateToForm() {
          // 検索フィールドの同期
          const $searchInput = this.getCachedElement('searchInput');
          if ($searchInput.length && $searchInput.val() !== this.state.searchText) {
            $searchInput.val(this.state.searchText);
          }

          // ラジオボタンの同期
          const $selectedRadio = $(`input[name="class"][value="${this.state.selectedClass}"]`);
          if ($selectedRadio.length && !$selectedRadio.prop('checked')) {
            $selectedRadio.prop('checked', true);
          }

          // チェックボックスの同期
          const $checkboxes = this.getCachedElement('checkboxes');
          $checkboxes.each((index, checkbox) => {
            const $checkbox = $(checkbox);
            const value = $checkbox.val();
            const shouldBeChecked = this.state.selectedCheckboxes.has(value);

            if ($checkbox.prop('checked') !== shouldBeChecked) {
              $checkbox.prop('checked', shouldBeChecked);
            }
          });
        }

        /**
         * フォーム要素から現在の状態を読み取る
         * UIの状態を内部状態オブジェクトに変換
         * @returns {Object} 状態オブジェクト
         */
        readStateFromForm() {
          const searchText = this.getCachedElement('searchInput').val() || '';
          const selectedClass = this.getCachedElement('radioButtons').filter(':checked').val() || 'all';
          const selectedCheckboxes = new Set();

          this.getCachedElement('checkboxes').filter(':checked').each((index, checkbox) => {
            selectedCheckboxes.add($(checkbox).val());
          });

          const newState = {
            searchText: searchText,
            selectedClass: selectedClass,
            selectedCheckboxes: selectedCheckboxes
          };

          return newState;
        }

        /**
         * 年の表示状態をキャッシュに設定
         * @param {string} yearId - 年のID
         * @param {boolean} isVisible - 表示状態
         * @note 現在は直接yearCache.setを使用しているため未使用（将来の拡張用）
         */
        setYearVisibility(yearId, isVisible) {
          this.yearCache.set(yearId, isVisible);
        }

        /**
         * 年の表示状態をキャッシュから取得
         * @param {string} yearId - 年のID
         * @returns {boolean} 表示状態
         * @note 現在は未使用（将来の拡張用）
         */
        getYearVisibility(yearId) {
          return this.yearCache.get(yearId);
        }

        /**
         * フィルタリングを実行（メインエントリーポイント）
         * 内部的にrecalculateAffectedYearsを呼び出す
         */
        performSearch() {
          this.recalculateAffectedYears();
        }

        // =============================================================================
        // フィルタリングロジック
        // =============================================================================

        /**
         * タイムラインの全項目をフィルタリングして表示を更新
         * - 各項目の表示/非表示を判定
         * - 年ごとの表示項目数を集計
         * - 統計情報をbody要素のdata属性に保存
         * - パフォーマンス測定を実施
         */
        recalculateAffectedYears() {

          const startTime = performance.now();
          let processedYears = 0;
          let visibleYears = 0;
          let totalItems = 0;
          let visibleItems = 0;

          // CSS駆動による効率的な表示制御
          // CSSクラスを使用してDOM操作を最小限に抑え、パフォーマンスを向上
          const $timelineLayout = this.getCachedElement('timelineLayout');
          $timelineLayout.children('div').each((index, yearDiv) => {
            const $yearDiv = $(yearDiv);
            const yearId = $yearDiv.attr('id');
            processedYears++;

            // その年のli要素を取得してフィルタリング
            const $items = $yearDiv.find('li');
            const totalItemsInYear = $items.length;
            totalItems += totalItemsInYear;

            let yearVisibleCount = 0;

            $items.each((itemIndex, item) => {
              const $item = $(item);
              const shouldShow = this.shouldShowItem($item);

              // CSSクラスによる表示制御（display プロパティは CSS で管理）
              $item.toggleClass('timeline-visible', shouldShow);
              $item.toggleClass('timeline-hidden', !shouldShow);

              if (shouldShow) {
                yearVisibleCount++;
                visibleItems++;
              }
            });

            // 年全体の表示判定
            const shouldShowYear = yearVisibleCount > 0;

            // 年の表示状態をキャッシュに保存
            this.yearCache.set(yearId, shouldShowYear);

            // CSSクラスで年の表示制御（display プロパティは CSS で管理）
            $yearDiv.toggleClass('has-visible-items', shouldShowYear);
            $yearDiv.toggleClass('no-visible-items', !shouldShowYear);

            // データ属性による詳細情報の追加（修正版）
            $yearDiv.attr('data-visible-count', yearVisibleCount);
            $yearDiv.attr('data-total-count', totalItemsInYear);

            if (shouldShowYear) {
              visibleYears++;
            }
          });

          // 全体の統計情報をbody要素のデータ属性に設定
          // CSSセレクタや外部スクリプトから統計情報を参照可能にする
          const $body = this.getCachedElement('body');
          $body.attr('data-timeline-visible-years', visibleYears);
          $body.attr('data-timeline-total-years', processedYears);
          $body.attr('data-timeline-visible-items', visibleItems);
          $body.attr('data-timeline-total-items', totalItems);

          const endTime = performance.now();
          const duration = endTime - startTime;

          // フィルタリング完了イベントの発火
          // 統計情報と処理時間を含むカスタムイベントを発火
          this.triggerFilteringComplete({
            visibleYears,
            totalYears: processedYears,
            visibleItems,
            totalItems,
            duration
          });
        }

        /**
         * フィルタリング完了イベントを発火
         * @param {Object} stats - フィルタリング統計情報
         * @param {number} stats.visibleYears - 表示されている年の数
         * @param {number} stats.totalYears - 全年の数
         * @param {number} stats.visibleItems - 表示されている項目の数
         * @param {number} stats.totalItems - 全項目の数
         * @param {number} stats.duration - 処理時間（ミリ秒）
         */
        triggerFilteringComplete(stats) {
          const event = new CustomEvent('timelineFilteringComplete', {
            detail: stats
          });
          document.dispatchEvent(event);

          // 項目数表示を更新（年ごとの表示項目数を表示）
          this.updateItemCountsDisplay();

          // サイドバートグルボタンの表示を更新
          this.updateSidebarToggleButton();
        }

        /**
         * 年ごとの項目数表示を更新
         * 各年の見出しに「(表示数/全体数)」形式で項目数を追加
         * CSSスタイルは timeline.css の .timeline-item-count で管理
         */
        updateItemCountsDisplay() {
          // 既存の項目数表示を削除
          $('.timeline-item-count').remove();

          let updatedCount = 0;

          const $timelineLayout = this.getCachedElement('timelineLayout');
          $timelineLayout.children('div').each((index, div) => {
            const $div = $(div);
            const $h2 = $div.find('h2.year');

            if ($h2.length > 0) {
              const visibleCount = parseInt($div.attr('data-visible-count') || '0');
              const totalCount = parseInt($div.attr('data-total-count') || '0');

              // 表示される年のみに項目数を追加
              if ($div.hasClass('has-visible-items') && totalCount > 0) {
                const countText = ` (${visibleCount}/${totalCount})`;
                $h2.append(`<span class="timeline-item-count">${countText}</span>`);
                updatedCount++;
              }
            }
          });
        }

        /**
         * 個別項目の表示判定
         * ラジオボタン、チェックボックス、検索テキストの3つの条件を評価
         * @param {jQuery} $item - 判定対象のli要素
         * @returns {boolean} 表示すべきかどうか
         */
        shouldShowItem($item) {
          const classMatch = this.checkClassMatch($item);
          const checkboxMatch = this.checkCheckboxMatch($item);
          const searchMatch = this.checkSearchMatch($item);

          // 全ての条件を満たす場合のみ表示
          return classMatch && checkboxMatch && searchMatch;
        }

        /**
         * ラジオボタン選択によるクラスマッチング判定
         * @param {jQuery} $item - 判定対象のli要素
         * @returns {boolean} マッチするかどうか
         */
        checkClassMatch($item) {
          // "mixed" モードの場合は全て表示
          if (this.state.selectedClass === CONSTANTS.DEFAULTS.SELECTED_CLASS) {
            return true;
          }

          return $item.hasClass(this.state.selectedClass);
        }

        /**
         * チェックボックス選択によるマッチング判定
         * 項目が選択されたカテゴリのいずれかに属するかを判定
         * @param {jQuery} $item - 判定対象のli要素
         * @returns {boolean} マッチするかどうか
         */
        checkCheckboxMatch($item) {
          // チェックボックスが1つも選択されていない場合は非表示
          if (this.state.selectedCheckboxes.size === 0) {
            return false;
          }

          const itemClasses = $item.attr('class') ? $item.attr('class').split(' ') : [];

          // 項目のクラスのいずれかが選択されたカテゴリに含まれるか
          return itemClasses.some(className =>
            this.state.selectedCheckboxes.has(className)
          );
        }

        /**
         * 検索テキストによるマッチング判定
         * 項目のテキストに検索文字列が含まれるかを判定（大文字小文字を区別しない）
         * @param {jQuery} $item - 判定対象のli要素
         * @returns {boolean} マッチするかどうか
         */
        checkSearchMatch($item) {
          // 検索テキストが空の場合は全て表示
          if (!this.state.searchText || this.state.searchText.trim() === '') {
            return true;
          }

          const searchText = this.state.searchText.toLowerCase();
          const itemText = $item.text().toLowerCase();

          return itemText.includes(searchText);
        }

        // =============================================================================
        // イベント管理
        // =============================================================================

        /**
         * フィルタリング状態をbodyのCSSクラスに反映
         * - timeline-filtered: フィルタリング中
         * - timeline-no-results: 結果なし
         * - timeline-partial-results: 部分的な結果
         * - timeline-all-results: 全て表示
         */
        updateFilteringStatus() {
          const $body = this.getCachedElement('body');
          const visibleYears = parseInt($body.attr('data-timeline-visible-years') || '0');
          const totalYears = parseInt($body.attr('data-timeline-total-years') || '0');
          const visibleItems = parseInt($body.attr('data-timeline-visible-items') || '0');
          const totalItems = parseInt($body.attr('data-timeline-total-items') || '0');

          // フィルタリング状態のCSSクラスを body に適用
          $body.toggleClass('timeline-filtered', visibleItems < totalItems);
          $body.toggleClass('timeline-no-results', visibleItems === 0);
          $body.toggleClass('timeline-partial-results', visibleItems > 0 && visibleItems < totalItems);
          $body.toggleClass('timeline-all-results', visibleItems === totalItems);
        }

        /**
         * フィルタ関連のイベントリスナーを設定
         * - 検索入力（デバウンス、IME対応）
         * - ラジオボタン変更
         * - チェックボックス変更
         * - リセットボタン
         * - クリアボタン
         */
        interceptFilterEvents() {
          const $searchInput = this.getCachedElement('searchInput');
          if ($searchInput.length) {
            let isComposing = false;

            $searchInput.on('compositionstart.timelineFilter', () => {
              isComposing = true;
            });

            $searchInput.on('compositionend.timelineFilter', () => {
              isComposing = false;
              setTimeout(() => {
                this.onFilterEvent('search_input', { type: 'compositionend' });
              }, CONSTANTS.DELAYS.UI_UPDATE);
            });

            $searchInput.on('input.timelineFilter', (e) => {
              if (!isComposing) {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                  this.onFilterEvent('search_input', e);
                }, CONSTANTS.DELAYS.SEARCH_DEBOUNCE);
              }
            });

            $searchInput.on('blur.timelineFilter', (e) => {
              if (!isComposing) {
                this.onFilterEvent('search_blur', e);
              }
            });
          }

          const $radioButtons = this.getCachedElement('radioButtons');
          if ($radioButtons.length) {
            $radioButtons.on('change.timelineFilter', (e) => {
              this.onFilterEvent('radio_change', e);
            });
          }

          const $checkboxes = this.getCachedElement('checkboxes');
          if ($checkboxes.length) {
            $checkboxes.on('change.timelineFilter', (e) => {
              this.onFilterEvent('checkbox_change', e);
            });
          }

          const $resetButton = this.getCachedElement('resetButton');
          if ($resetButton.length) {
            $resetButton.on('click.timelineFilter', (e) => {
              this.onFilterEvent('reset_click', e);
            });
          }

          const $clearButton = this.getCachedElement('clearButton');
          if ($clearButton.length) {
            $clearButton.on('click.timelineFilter', (e) => {
              this.getCachedElement('searchInput').val('');
              this.onFilterEvent('clear_click', e);
            });
          }

          const $quickResetButton = this.getCachedElement('timelineQuickReset');
          if ($quickResetButton.length) {
            $quickResetButton.on('click.timelineFilter', (e) => {
              this.onFilterEvent('reset_click', e);
            });
          }
        }

        /**
         * フィルタイベントの統一ハンドラ
         * 各種フィルタリング操作（検索、ラジオボタン、チェックボックス）を処理
         * @param {string} eventType - イベントタイプ（'search_input', 'radio_change', 'checkbox_change', etc.）
         * @param {Event} event - jQueryイベントオブジェクト
         */
        onFilterEvent(eventType, event) {
          // リセットの場合は特別処理
          if (eventType === 'reset_click') {
            this.handleReset();
            return;
          }

          // ラジオボタン変更時のチェックボックス同期
          if (eventType === 'radio_change') {
            this.syncCheckboxes();
          }

          // チェックボックス変更時のラジオボタン同期
          if (eventType === 'checkbox_change') {
            this.syncRadioButtons();
          }

          // フォームからの状態読み取りと更新
          const newState = this.readStateFromForm();
          this.updateState({
            searchText: newState.searchText,
            selectedClass: newState.selectedClass,
            selectedCheckboxes: newState.selectedCheckboxes
          });

          // URL パラメータの更新
          this.updateUrlParams();

          // フィルタリング実行
          this.performSearch();

          // フィルタリング完了後の処理
          setTimeout(() => {
            this.updateFilteringStatus();
          }, CONSTANTS.DELAYS.UI_UPDATE);
        }

        /**
         * ラジオボタンに応じてチェックボックスを同期
         * ラジオボタンで特定のカテゴリが選択された場合、対応するチェックボックスのみをチェック
         */
        syncCheckboxes() {
          const selectedClass = this.getCachedElement('radioButtons').filter(':checked').val();

          if (selectedClass !== CONSTANTS.DEFAULTS.SELECTED_CLASS) {
            // 特定のクラスが選択された場合、そのクラスのみチェック
            const $checkboxes = this.getCachedElement('checkboxes');
            $checkboxes.prop('checked', false);
            $checkboxes.filter(`[value="${selectedClass}"]`).prop('checked', true);
            console.log(`[TimelineFilter] チェックボックス同期: ${selectedClass} のみ選択`);
          }
          // "mixed" の場合は何もしない（現在の状態を維持）
        }

        /**
         * チェックボックス変更時にラジオボタンを "mixed" に同期
         * チェックボックスが手動で変更された場合、ラジオボタンを "mixed" モードに設定
         */
        syncRadioButtons() {
          // チェックボックスが変更された場合、ラジオボタンを "mixed" に設定
          const $mixedRadio = this.getCachedElement('radioButtons').filter(`[value="${CONSTANTS.DEFAULTS.SELECTED_CLASS}"]`);
          if (!$mixedRadio.prop('checked')) {
            $mixedRadio.prop('checked', true);
          }
        }

        /**
         * リセット処理の専用ハンドラ
         * フィルタ状態をデフォルトにリセット（全カテゴリ選択、検索クリア、URLパラメータクリア）
         */
        handleReset() {
          // デフォルト状態に戻す
          this.updateState({
            searchText: '',
            selectedClass: CONSTANTS.DEFAULTS.SELECTED_CLASS,
            selectedCheckboxes: this.getDefaultCheckboxesSet()
          });

          // フォームを更新
          this.getCachedElement('searchInput').val('');
          this.getCachedElement('radioButtons').filter(`[value="${CONSTANTS.DEFAULTS.SELECTED_CLASS}"]`).prop('checked', true);
          this.getCachedElement('checkboxes').prop('checked', true);

          // URLをクリア
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, null, newUrl);

          // フィルタリング実行
          this.performSearch();

          // サイドバートグルボタンの表示を更新
          this.updateSidebarToggleButton();
        }

        // =============================================================================
        // ライフサイクル管理
        // =============================================================================

        /**
         * TimelineFilterシステムを有効化
         * 初期化の流れ:
         * 1. DOM要素のキャッシュ
         * 2. カテゴリ情報の取得
         * 3. テキスト選択機能の初期化
         * 4. イベントリスナーの設定
         * 5. URLからの状態復元とフィルタリング実行
         */
        enable() {
          console.log('[TimelineFilter] システム有効化');

          // DOM要素のキャッシュ初期化
          this.initializeCachedElements();
          console.log('[TimelineFilter] DOM要素キャッシュ完了');

          // カテゴリ情報を事前に取得・キャッシュ
          this.getAvailableCategories();
          console.log('[TimelineFilter] カテゴリキャッシュ完了');

          // テキスト選択機能の初期化
          if (!this.searchButton) {
            this.initializeTextSelection();
          }

          // イベントインターセプトの設定
          setTimeout(() => {
            this.interceptFilterEvents();

            // 初期状態での自動フィルタリング実行
            this.restoreFromUrl();
            this.syncStateToForm();
            this.performSearch();

            // 初期状態でのボタン表示更新
            this.updateSidebarToggleButton();

            // カテゴリタグの初期化
            this.initializeCategoryTags();
            this.setupCategoryTagEvents();
            
            console.log('[TimelineFilter] 初期化完了');
          }, CONSTANTS.DELAYS.SYSTEM_INIT);
        }

        /**
         * システムを無効化
         * イベントリスナーやリソースを削除してシステムを停止する
         * @note 現在は未実装（将来の拡張用）
         * @see cleanup() - リソースのクリーンアップには cleanup() を使用
         */
        disable() {
          // 将来の実装用プレースホルダー
          // 必要に応じて以下を実装:
          // - イベントリスナーの削除
          // - タイマーのクリア
          // - キャッシュのクリア
          // - 状態のリセット
        }

        /**
         * TimelineFilterのクリーンアップ
         * - イベントリスナーの削除
         * - タイマーのクリア
         * - キャッシュのクリア
         */
        cleanup() {
          // 追加したイベントリスナーを削除
          if (this.cachedElements.searchInput) {
            this.cachedElements.searchInput.off('.timelineFilter');
          }
          if (this.cachedElements.radioButtons) {
            this.cachedElements.radioButtons.off('.timelineFilter');
          }
          if (this.cachedElements.checkboxes) {
            this.cachedElements.checkboxes.off('.timelineFilter');
          }
          if (this.cachedElements.resetButton) {
            this.cachedElements.resetButton.off('.timelineFilter');
          }
          if (this.cachedElements.timelineQuickReset) {
            this.cachedElements.timelineQuickReset.off('.timelineFilter');
          }

          // タイムアウトのクリア
          if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
          }

          // 文字選択関連のクリーンアップを追加
          $(document).off('.timelineTextSelection');
          if (this.searchButton) {
            this.searchButton.remove();
            this.searchButton = null;
          }

          // カテゴリタグイベントのクリーンアップ
          if (this.cachedElements.timelineLayout) {
            this.cachedElements.timelineLayout.off('.categoryTag');
          }

          // キャッシュのクリア
          this.cachedElements = {
            body: null,
            searchInput: null,
            timelineLayout: null,
            checkboxes: null,
            radioButtons: null,
            resetButton: null,
            clearButton: null
          };
        }
      }

      // =============================================================================
      // モジュールの初期化とグローバル公開
      // =============================================================================

      // TimelineFilterインスタンスの作成
      const timelineFilter = new TimelineFilter();

      // フィルタリングイベントのリスナー設定
      document.addEventListener('timelineFilteringComplete', function (event) {
        // 将来の拡張用（現在は空実装）
      });

      // システムを有効化
      timelineFilter.enable();

      // =============================================================================
      // グローバル公開 API
      // =============================================================================
      // 必要最小限のインターフェースのみをグローバルスコープに公開し、
      // 内部実装の詳細を隠蔽

      /**
       * TimelineFilterインスタンス
       * @type {TimelineFilter}
       * @global
       */
      global.timelineFilter = timelineFilter;

      /**
       * TimelineFilterを初期化（再初期化）
       * HTMLから直接呼び出し可能
       * @global
       * @function
       */
      global.initializeTimelineFilter = function() {
        timelineFilter.enable();
      };

      /**
       * デバッグ情報をコンソールに出力
       * 開発環境では追加の整合性チェックを実行
       * @global
       * @function
       */
      global.debugTimelineFilter = function() {
        console.log('取得カテゴリ:', timelineFilter.getAvailableCategories());
        console.log('デフォルト状態:', timelineFilter.getDefaultState());
        console.log('現在の状態:', timelineFilter.state);
        
        // カテゴリ整合性チェック（開発環境のみ）
        if (global.location.hostname === 'localhost') {
          const htmlCategories = timelineFilter.getAvailableCategories();
          const stateCategories = Array.from(timelineFilter.state.selectedCheckboxes);
          
          const missing = stateCategories.filter(cat => !htmlCategories.includes(cat));
          if (missing.length > 0) {
            console.warn('[Debug] 状態とHTMLの不整合:', missing);
          }
          
          console.log('[Debug] HTMLカテゴリ:', htmlCategories);
          console.log('[Debug] 状態カテゴリ:', stateCategories);
        }
      };

      })(window);