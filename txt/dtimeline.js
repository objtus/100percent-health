      // =============================================================================
      // メインシステム初期化
      // =============================================================================

      // メイン初期化関数
      function initializeTimelineFilter() {
        // TimelineFilterシステムを有効化
        window.timelineFilter.enable();
      }

      // =============================================================================
      // TimelineFilter 基盤クラス
      // =============================================================================

      class TimelineFilter {
        constructor() {
          // 基本状態の初期化
          this.state = {
            searchText: '',
            selectedClass: 'mixed',
            selectedCheckboxes: new Set()
          };
          this.yearCache = new Map();
          this.searchButton = null;
          
          // Phase 1: カテゴリ管理機能の追加
          this.categoryCache = null; // カテゴリキャッシュ
        }

        // システムを有効化
        enable() {
          // 文字選択機能の初期化
          if (!this.searchButton) {
            this.initializeTextSelection();
          }
        }

        // 基本的な状態管理メソッド
        updateState(changes) {
          const oldState = { ...this.state };
          Object.assign(this.state, changes);
          // URLパラメータの更新は必要に応じて実装
        }

        // =============================================================================
        // Phase 1: カテゴリ管理機能
        // =============================================================================

        // HTMLからカテゴリを動的取得
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

        // フォールバック用最小限カテゴリ
        getFallbackCategories() {
          return ['d', 'sns', 'web', 'tech', 'culture']; // 確実に存在するもののみ
        }

        // 動的なデフォルト状態生成
        getDefaultState() {
          return {
            class: 'mixed',
            checkboxes: this.getAvailableCategories()
          };
        }

        // URLパラメータ管理で使用
        getDefaultCheckboxesSet() {
          return new Set(this.getAvailableCategories());
        }

        // 文字選択機能の初期化
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
            .addClass('timeline-text-selection-button')
            .css({
              'position': 'absolute',
              'z-index': '9999',
              'display': 'none',
              'background': '#ffffffaa',
              'backdrop-filter': 'blur(2px)',
              '-webkit-backdrop-filter': 'blur(2px)',
              'color': 'black',
              'border': 'none',
              'padding': '5px 10px',
              'border-radius': '2px',
              'cursor': 'pointer',
              'font-size': '14px',
              'transition': 'all 0.2s ease'
            });

          // ホバー効果
          this.searchButton.hover(
            function () {
              $(this).css({
                'background': '#f0f0f0',
                'transform': 'scale(1.05)'
              });
            },
            function () {
              $(this).css({
                'background': '#ffffffaa',
                'transform': 'scale(1)'
              });
            }
          );

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
          }, 50);
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
            $('#searchInput').val(selectedText);

            // 検索ボタンを非表示
            this.hideTextSelectionSearchButton();

            // 選択を解除
            window.getSelection().removeAllRanges();

            // フィルタリング実行（基本的な検索機能）
            this.performBasicSearch(selectedText);
          });

          // 改良された位置計算
          const buttonWidth = 50;
          const buttonHeight = 28;
          const margin = 8;

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

          this.searchButton.css({
            display: 'block',
            position: 'absolute',
            top: top + 'px',
            left: left + 'px',
            'z-index': '10000'
          });
        }

        // 文字選択用検索ボタンを非表示
        hideTextSelectionSearchButton() {
          if (this.searchButton) {
            this.searchButton.hide();
            this.searchButton.off('click.textSelectionSearch');
          }
        }

        // 基本的な検索機能（Phase 3改良版：addYearControl相当の処理を統合）
        performBasicSearch(searchText) {
          // 状態を更新
          this.updateState({ searchText: searchText });

          // 既存の検索イベントを発火してフィルタリングをトリガー
          const searchInput = $('#searchInput');
          if (searchInput.length) {
            // 各種イベントを発火（既存システムが何に反応するか不明なため）
            searchInput.trigger('input');
            searchInput.trigger('keyup');
            searchInput.trigger('change');

            // 少し遅延しても一度発火（非同期処理への対応）
            setTimeout(() => {
              searchInput.trigger('input');
            }, 10);
          }

          // Phase 3改良: 既存の検索機能に加えて年単位制御も実行
          if (typeof window.performSearch === 'function') {
            window.performSearch();
          }
          
          // addYearControl相当の処理を直接実行
          this.addYearControl();
        }

        // =============================================================================
        // Phase 2: URL パラメータ管理機能
        // =============================================================================

        // URLパラメータの更新（既存のupdateUrlParams関数を移植）
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

        // URLからの状態復元（既存のrestoreSelectionFromUrlParams関数を移植）
        restoreFromUrl() {
          const urlParams = new URLSearchParams(window.location.search);
          const selectedClass = urlParams.get('class');
          const selectedCheckboxes = urlParams.get('checkboxes');
          const searchQuery = urlParams.get('search');

          // 状態オブジェクトの更新
          if (selectedClass) {
            this.state.selectedClass = selectedClass;
          }

          if (selectedCheckboxes) {
            const checkboxValues = selectedCheckboxes.split(',');
            this.state.selectedCheckboxes = new Set(checkboxValues);
          } else {
            // 【修正】デフォルトチェックボックス選択を動的取得に変更
            this.state.selectedCheckboxes = this.getDefaultCheckboxesSet();
          }

          if (searchQuery) {
            this.state.searchText = searchQuery;
          }

          // 既存のフォーム要素にも反映（Phase 2では参考実装のみ）
          this.syncStateToForm();
        }

        // 状態をフォーム要素に同期
        syncStateToForm() {

          // 検索フィールドの同期
          const $searchInput = $('#searchInput');
          if ($searchInput.length && $searchInput.val() !== this.state.searchText) {
            $searchInput.val(this.state.searchText);
          }

          // ラジオボタンの同期
          const $selectedRadio = $(`input[name="class"][value="${this.state.selectedClass}"]`);
          if ($selectedRadio.length && !$selectedRadio.prop('checked')) {
            $selectedRadio.prop('checked', true);
          }

          // チェックボックスの同期
          $('input[type="checkbox"]').each((index, checkbox) => {
            const $checkbox = $(checkbox);
            const value = $checkbox.val();
            const shouldBeChecked = this.state.selectedCheckboxes.has(value);

            if ($checkbox.prop('checked') !== shouldBeChecked) {
              $checkbox.prop('checked', shouldBeChecked);
            }
          });

        }

        // フォーム要素から状態を読み取り
        readStateFromForm() {
          const searchText = $('#searchInput').val() || '';
          const selectedClass = $('input[name="class"]:checked').val() || 'all';
          const selectedCheckboxes = new Set();

          $('input[type="checkbox"]:checked').each((index, checkbox) => {
            selectedCheckboxes.add($(checkbox).val());
          });

          const newState = {
            searchText: searchText,
            selectedClass: selectedClass,
            selectedCheckboxes: selectedCheckboxes
          };

          return newState;
        }

        // 年キャッシュの基本操作
        setYearVisibility(yearId, isVisible) {
          this.yearCache.set(yearId, isVisible);
        }

        getYearVisibility(yearId) {
          return this.yearCache.get(yearId);
        }

        // Phase 1では何もしないプレースホルダーメソッド
        performSearch() {
          this.recalculateAffectedYears();
        }

        // =============================================================================
        // Phase 3: フィルタリングロジック
        // =============================================================================

        // 影響を受ける年の再計算（メインフィルタリングロジック）
        recalculateAffectedYears() {

          const startTime = performance.now();
          let processedYears = 0;
          let visibleYears = 0;
          let totalItems = 0;
          let visibleItems = 0;

          // Phase 4: CSS駆動による効率的な表示制御
          $('#timeline_layout > div').each((index, yearDiv) => {
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

              // Phase 4: CSS クラスによる表示制御
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

            // Phase 4: CSS classで年の表示制御
            $yearDiv.toggleClass('has-visible-items', shouldShowYear);
            $yearDiv.toggleClass('no-visible-items', !shouldShowYear);

            // データ属性による詳細情報の追加（修正版）
            $yearDiv.attr('data-visible-count', yearVisibleCount);
            $yearDiv.attr('data-total-count', totalItemsInYear);

            if (shouldShowYear) {
              visibleYears++;
            }
          });

          // Phase 4: 全体の統計情報をbody要素のデータ属性に設定
          $('body').attr('data-timeline-visible-years', visibleYears);
          $('body').attr('data-timeline-total-years', processedYears);
          $('body').attr('data-timeline-visible-items', visibleItems);
          $('body').attr('data-timeline-total-items', totalItems);

          const endTime = performance.now();
          const duration = endTime - startTime;

          // Phase 4: フィルタリング完了イベントの発火
          this.triggerFilteringComplete({
            visibleYears,
            totalYears: processedYears,
            visibleItems,
            totalItems,
            duration
          });
        }

        // Phase 4: フィルタリング完了イベントの発火
        triggerFilteringComplete(stats) {
          const event = new CustomEvent('timelineFilteringComplete', {
            detail: stats
          });
          document.dispatchEvent(event);

          // Phase 4: JavaScript による項目数表示の更新
          this.updateItemCountsDisplay();
        }

        // JavaScript による項目数表示の実装
        updateItemCountsDisplay() {

          // 既存の項目数表示を削除
          $('.timeline-item-count').remove();

          let updatedCount = 0;

          $('#timeline_layout > div').each((index, div) => {
            const $div = $(div);
            const $h2 = $div.find('h2.year');

            if ($h2.length > 0) {
              const visibleCount = parseInt($div.attr('data-visible-count') || '0');
              const totalCount = parseInt($div.attr('data-total-count') || '0');

              // 表示される年のみに項目数を追加
              if ($div.hasClass('has-visible-items') && totalCount > 0) {
                const countText = ` (${visibleCount}/${totalCount})`;
                $h2.append(`<span class="timeline-item-count" style="font-size: 0.8em; color: #666; font-weight: normal;">${countText}</span>`);
                updatedCount++;
              }
            }
          });
        }

        // 個別項目の表示判定
        shouldShowItem($item) {
          const classMatch = this.checkClassMatch($item);
          const checkboxMatch = this.checkCheckboxMatch($item);
          const searchMatch = this.checkSearchMatch($item);

          const result = classMatch && checkboxMatch && searchMatch;

          return result;
        }

        // クラスマッチングの判定
        checkClassMatch($item) {
          if (this.state.selectedClass === 'mixed') {
            return true;
          }

          return $item.hasClass(this.state.selectedClass);
        }

        // チェックボックスマッチングの判定
        checkCheckboxMatch($item) {
          if (this.state.selectedCheckboxes.size === 0) {
            return false;
          }

          const itemClasses = $item.attr('class') ? $item.attr('class').split(' ') : [];

          return itemClasses.some(className =>
            this.state.selectedCheckboxes.has(className)
          );
        }

        // 検索マッチングの判定
        checkSearchMatch($item) {
          if (!this.state.searchText || this.state.searchText.trim() === '') {
            return true;
          }

          const searchText = this.state.searchText.toLowerCase();
          const itemText = $item.text().toLowerCase();

          return itemText.includes(searchText);
        }

        // 既存のフィルタリング結果に年単位制御を追加（文字選択→検索ボタン用）
        addYearControl() {
          let visibleYears = 0;

          $('#timeline_layout > div').each((index, yearDiv) => {
            const $yearDiv = $(yearDiv);
            const yearId = $yearDiv.attr('id');

            // その年に表示されているli要素があるかチェック
            const $allItems = $yearDiv.find('li');
            const $visibleItems = $yearDiv.find('li:visible');
            const totalItemsInYear = $allItems.length;
            const visibleItemsInYear = $visibleItems.length;
            const shouldShowYear = visibleItemsInYear > 0;

            // 年の表示状態をキャッシュに保存
            this.yearCache.set(yearId, shouldShowYear);

            // Phase 4: CSS classで年の表示制御（統一）
            $yearDiv.toggleClass('has-visible-items', shouldShowYear);
            $yearDiv.toggleClass('no-visible-items', !shouldShowYear);

            // データ属性の更新（修正版）
            $yearDiv.attr('data-visible-count', visibleItemsInYear);
            $yearDiv.attr('data-total-count', totalItemsInYear);

            if (shouldShowYear) {
              visibleYears++;
            }

          });

          // 統計情報の更新
          $('body').attr('data-timeline-visible-years', visibleYears);

          // イベント発火（項目数表示も含む）
          this.triggerFilteringComplete({
            visibleYears,
            method: 'addYearControl'
          });
        }

        // =============================================================================
        // フィルタリング状態管理機能
        // =============================================================================

        // フィルタリング状態の視覚的フィードバック
        updateFilteringStatus() {
          const visibleYears = parseInt($('body').attr('data-timeline-visible-years') || '0');
          const totalYears = parseInt($('body').attr('data-timeline-total-years') || '0');
          const visibleItems = parseInt($('body').attr('data-timeline-visible-items') || '0');
          const totalItems = parseInt($('body').attr('data-timeline-total-items') || '0');

          // フィルタリング状態のCSSクラスを body に適用
          $('body').toggleClass('timeline-filtered', visibleItems < totalItems);
          $('body').toggleClass('timeline-no-results', visibleItems === 0);
          $('body').toggleClass('timeline-partial-results', visibleItems > 0 && visibleItems < totalItems);
          $('body').toggleClass('timeline-all-results', visibleItems === totalItems);
        }

        // フィルタ関連イベントのインターセプト
        interceptFilterEvents() {
          const $searchInput = $('#searchInput');
          if ($searchInput.length) {
            let isComposing = false;

            $searchInput.on('compositionstart.timelineFilter', () => {
              isComposing = true;
            });

            $searchInput.on('compositionend.timelineFilter', () => {
              isComposing = false;
              setTimeout(() => {
                this.onFilterEvent('search_input', { type: 'compositionend' });
              }, 10);
            });

            $searchInput.on('input.timelineFilter', (e) => {
              if (!isComposing) {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                  this.onFilterEvent('search_input', e);
                }, 300);
              }
            });

            $searchInput.on('blur.timelineFilter', (e) => {
              if (!isComposing) {
                this.onFilterEvent('search_blur', e);
              }
            });
          }

          const $radioButtons = $('input[name="class"]');
          if ($radioButtons.length) {
            $radioButtons.on('change.timelineFilter', (e) => {
              this.onFilterEvent('radio_change', e);
            });
          }

          const $checkboxes = $('input[type="checkbox"]');
          if ($checkboxes.length) {
            $checkboxes.on('change.timelineFilter', (e) => {
              this.onFilterEvent('checkbox_change', e);
            });
          }

          const $resetButton = $('#reset-all');
          if ($resetButton.length) {
            $resetButton.on('click.timelineFilter', (e) => {
              this.onFilterEvent('reset_click', e);
            });
          }

          const $clearButton = $('#clearButton');
          if ($clearButton.length) {
            $clearButton.on('click.timelineFilter', (e) => {
              $('#searchInput').val('');
              this.onFilterEvent('clear_click', e);
            });
          }
        }

        // フィルタイベントハンドラ
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

          // Phase 2: フォームからの状態読み取りとURL更新
          const newState = this.readStateFromForm();
          this.state.searchText = newState.searchText;
          this.state.selectedClass = newState.selectedClass;
          this.state.selectedCheckboxes = newState.selectedCheckboxes;

          // URL パラメータの更新
          this.updateUrlParams();

          // Phase 3: フィルタリング実行
          this.performSearch();

          // Phase 4: フィルタリング完了後の処理
          setTimeout(() => {
            this.updateFilteringStatus();
          }, 10);
        }

        // ラジオボタンに応じてチェックボックスを同期（既存ロジック移植）
        syncCheckboxes() {
          const selectedClass = $('input[name="class"]:checked').val();

          if (selectedClass !== "mixed") {
            // 特定のクラスが選択された場合、そのクラスのみチェック
            $('input[type="checkbox"]').prop('checked', false);
            $(`input[type="checkbox"][value="${selectedClass}"]`).prop('checked', true);
            console.log(`[TimelineFilter] チェックボックス同期: ${selectedClass} のみ選択`);
          }
          // "mixed" の場合は何もしない（現在の状態を維持）
        }

        // チェックボックス変更時にラジオボタンを同期（既存ロジック移植）
        syncRadioButtons() {
          // チェックボックスが変更された場合、ラジオボタンを "mixed" に設定
          const $mixedRadio = $('input[name="class"][value="mixed"]');
          if (!$mixedRadio.prop('checked')) {
            $mixedRadio.prop('checked', true);
          }
        }

        // リセット処理の専用ハンドラ
        handleReset() {
          // 【修正】デフォルト状態を動的取得に変更
          this.state.searchText = '';
          this.state.selectedClass = 'mixed';
          this.state.selectedCheckboxes = this.getDefaultCheckboxesSet();

          // フォームを更新
          $('#searchInput').val('');
          $('input[name="class"][value="mixed"]').prop('checked', true);
          $('input[type="checkbox"]').prop('checked', true);

          // URLをクリア
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, null, newUrl);

          // フィルタリング実行
          this.performSearch();
        }

        // 有効化メソッド（統合版）
        enable() {
          console.log('[TimelineFilter] システム有効化');

          // Phase 1: カテゴリ情報を事前に取得・キャッシュ
          this.getAvailableCategories();
          console.log('[TimelineFilter] カテゴリキャッシュ完了');

          // 文字選択機能の初期化
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
            
            console.log('[TimelineFilter] 初期化完了');
          }, 50);
        }

        disable() {
        }

        // クリーンアップメソッド
        cleanup() {
          // 追加したイベントリスナーを削除
          $('#searchInput').off('.timelineFilter');
          $('input[name="class"]').off('.timelineFilter');
          $('input[type="checkbox"]').off('.timelineFilter');
          $('#reset-all').off('.timelineFilter');

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
        }
      }

      // グローバルインスタンスの作成
      window.timelineFilter = new TimelineFilter();

      // =============================================================================
      // システム初期化とイベント管理
      // =============================================================================

      // フィルタリングイベントのリスナー設定
      document.addEventListener('timelineFilteringComplete', function (event) {
      });

      // 新システムを有効化
      window.timelineFilter.enable();
      
      // =============================================================================
      // Phase 4: デバッグと検証機能
      // =============================================================================
      
      // コンソールで実行可能な検証関数
      window.debugTimelineFilter = function() {
        const filter = window.timelineFilter;
        console.log('取得カテゴリ:', filter.getAvailableCategories());
        console.log('デフォルト状態:', filter.getDefaultState());
        console.log('現在の状態:', filter.state);
        
        // デバッグ用：カテゴリ整合性チェック（開発時のみ有効）
        if (window.location.hostname === 'localhost') {
          const htmlCategories = filter.getAvailableCategories();
          const stateCategories = Array.from(filter.state.selectedCheckboxes);
          
          const missing = stateCategories.filter(cat => !htmlCategories.includes(cat));
          if (missing.length > 0) {
            console.warn('[Debug] 状態とHTMLの不整合:', missing);
          }
          
          console.log('[Debug] HTMLカテゴリ:', htmlCategories);
          console.log('[Debug] 状態カテゴリ:', stateCategories);
        }
      };