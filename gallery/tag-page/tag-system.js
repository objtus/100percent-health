class TagPageSystem {
    constructor() {
        this.targetTag = null;
        this.allWorks = [];
        this.filteredWorks = [];
        this.config = null;
        this.currentSort = 'date-desc';
        this.currentSeriesFilter = '';
        this.currentTagFilter = '';
        this.headingFeaturesInitialized = false;
    }
    
    async initialize(targetTag) {
        console.log(`Initializing tag page for: ${targetTag}`);
        
        this.targetTag = targetTag;
        
        try {
            // ローディング表示を開始
            this.showLoadingIndicator();
            
            await this.loadConfig();
            await this.loadAllWorksData();
            this.filterWorksByTag();
            this.setupControls();
            this.renderWorks();
            
            // ローディング表示を隠す
            this.hideLoadingIndicator();
            
            // タイトル更新
            document.title = `#${targetTag} の作品一覧 - 100%health`;
            
            console.log(`Tag page initialized: ${this.filteredWorks.length} works found`);
        } catch (error) {
            console.error('Tag page initialization failed:', error);
            this.showError('初期化に失敗しました');
            this.hideLoadingIndicator();
        }
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/gallery/data/config.json');
            if (!response.ok) {
                throw new Error(`Config load failed: ${response.status}`);
            }
            this.config = await response.json();
            console.log('Config loaded successfully');
        } catch (error) {
            console.error('Config load error:', error);
            // フォールバック設定
            this.config = {
                series: {
                    fanart: { dataPath: "data/fanart.json" },
                    original: { dataPath: "data/original.json" },
                    works: { dataPath: "data/works.json" },
                    commission: { dataPath: "data/commission.json" },
                    groundpolis_paint: { dataPath: "data/groundpolis_paint.json" }
                }
            };
        }
    }
    
    async loadAllWorksData() {
        console.log('Loading all series data...');
        this.updateLoadingStatus('シリーズ設定を確認中...', 5);
        
        const seriesConfigs = this.config.series;
        const seriesNames = Object.keys(seriesConfigs);
        const totalSeries = seriesNames.length;
        let loadedSeries = 0;
        
        this.updateLoadingStatus(`${totalSeries}個のシリーズを順次読み込み中...`, 10);
        
        // シリーズを順次読み込み（進捗表示のため）
        this.allWorks = [];
        for (const seriesName of seriesNames) {
            this.updateLoadingStatus(`${seriesName} を読み込み中...`, 10 + (loadedSeries / totalSeries) * 70);
            
            try {
                const seriesData = await this.loadSeriesData(seriesName);
                if (seriesData) {
                    this.allWorks.push(...seriesData);
                    console.log(`✅ ${seriesName}: ${seriesData.length} works loaded`);
                } else {
                    console.log(`❌ ${seriesName}: failed to load`);
                }
            } catch (error) {
                console.error(`Error loading ${seriesName}:`, error);
            }
            
            loadedSeries++;
        }
        
        this.updateLoadingStatus('全データの統合完了', 90);
        console.log(`Total works loaded: ${this.allWorks.length}`);
    }
    
    async loadSeriesData(seriesName) {
        try {
            const dataPath = `/gallery/data/${seriesName}.json`;
            console.log(`Loading ${seriesName} from ${dataPath}...`);
            
            const response = await fetch(dataPath);
            if (!response.ok) {
                console.warn(`Failed to load ${seriesName}: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            const seriesKey = `${seriesName}_series`;
            const seriesData = data[seriesKey];
            
            if (seriesData && Array.isArray(seriesData)) {
                return seriesData;
            } else {
                console.warn(`No valid data found for ${seriesName} (expected key: ${seriesKey})`);
                return null;
            }
        } catch (error) {
            console.error(`Error loading ${seriesName}:`, error);
            return null;
        }
    }
    
    filterWorksByTag() {
        this.filteredWorks = this.allWorks.filter(work => 
            work.tags && work.tags.includes(this.targetTag)
        );
        
        // シリーズフィルター適用
        if (this.currentSeriesFilter) {
            this.filteredWorks = this.filteredWorks.filter(work => 
                work.series === this.currentSeriesFilter
            );
        }
        
        // 追加タグフィルター適用
        if (this.currentTagFilter) {
            this.filteredWorks = this.filteredWorks.filter(work => 
                work.tags && work.tags.includes(this.currentTagFilter)
            );
        }
        
        // ソート適用
        this.sortWorks(this.currentSort);
        
        console.log(`Filtered works: ${this.filteredWorks.length} for tag "${this.targetTag}"`);
        if (this.currentSeriesFilter) {
            console.log(`Series filter: ${this.currentSeriesFilter}`);
        }
        if (this.currentTagFilter) {
            console.log(`Additional tag filter: ${this.currentTagFilter}`);
        }
    }
    
    sortWorks(sortType) {
        this.currentSort = sortType;
        
        switch (sortType) {
            case 'date-desc':
                this.filteredWorks.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date-asc':
                this.filteredWorks.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'series':
                this.filteredWorks.sort((a, b) => {
                    if (a.series === b.series) {
                        return new Date(b.date) - new Date(a.date); // 同シリーズ内では新しい順
                    }
                    return a.series.localeCompare(b.series);
                });
                break;
            default:
                break;
        }
    }
    
    renderWorks() {
        const container = document.getElementById('works-container');
        if (!container) {
            console.error('works-container not found');
            return;
        }
        
        container.innerHTML = '';
        
        if (this.filteredWorks.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>♥ タグ「${this.targetTag}」の作品が見つかりませんでした ♥</p>
                </div>
            `;
            return;
        }
        
        // 作品数表示
        const countInfo = document.createElement('div');
        countInfo.className = 'works-count';
        countInfo.textContent = `${this.filteredWorks.length}件の作品が見つかりました`;
        container.appendChild(countInfo);
        
        // 作品グリッド
        const worksGrid = document.createElement('div');
        worksGrid.className = 'works-grid';
        
        this.filteredWorks.forEach(work => {
            const cardElement = this.createWorkCard(work);
            worksGrid.appendChild(cardElement);
        });
        
        container.appendChild(worksGrid);
        
        console.log(`Rendered ${this.filteredWorks.length} works`);
        
        // ライトボックスを再初期化
        this.initializeLightbox();
        
        // フィルター変更時は初期化フラグをリセット
        this.headingFeaturesInitialized = false;
        
        // サイドバーの見出し機能を再初期化（動的コンテンツ生成後）
        this.reinitializeHeadingFeatures();
    }
    
    initializeLightbox() {
        // 既存のLuminousGalleryインスタンスがあれば破棄
        if (window.luminousGallery) {
            try {
                window.luminousGallery.destroy();
            } catch (error) {
                console.log('Previous lightbox cleanup:', error);
            }
        }
        
        // 新しい画像リンクを対象にライトボックスを初期化
        const imageLinks = document.querySelectorAll('#works-container a[href$=jpg], #works-container a[href$=png], #works-container a[href$=gif], #works-container a[href$=webp], #works-container a[href$=avif]');
        
        if (imageLinks.length > 0 && typeof LuminousGallery !== 'undefined') {
            window.luminousGallery = new LuminousGallery(imageLinks);
            console.log(`Lightbox initialized for ${imageLinks.length} images`);
            
            // デバッグ用：最初の画像リンクのURLを確認
            if (imageLinks.length > 0) {
                console.log('First image link:', imageLinks[0].href);
            }
        } else {
            console.log('No images found or LuminousGallery not available');
            console.log('Image links found:', imageLinks.length);
            console.log('LuminousGallery available:', typeof LuminousGallery !== 'undefined');
        }
    }
    
    createWorkCard(work) {
        const card = document.createElement('section');
        card.className = 'card';
        
        // nsfwタグがある場合の判定
        const hasNsfwTag = work.tags && work.tags.includes('nsfw');
        const piccardClass = hasNsfwTag ? 'piccard nsfw' : 'piccard';
        
        card.innerHTML = `
            <div class="${piccardClass}">
                <h2 class="title">
                    <a href="${work.path}">${work.id}</a>
                </h2>
                <a href="${work.image_path}">
                    <img src="${work.image_path}" alt="${work.id}" loading="lazy">
                </a>
                <p class="date"><time datetime="${work.date}">${work.date}</time></p>
                <div class="series-info">${work.series}</div>
                
                <!-- タグ一覧セクション -->
                <nav class="tags-section" aria-label="作品タグ">
                    <div class="tags-title">tags:</div>
                    <div class="tags-list">
                        ${this.createTagsHtml(work.tags)}
                    </div>
                </nav>
            </div>
        `;
        
        return card;
    }
    
    createTagsHtml(tags) {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return '<span class="no-tags">タグなし</span>';
        }
        
        // 表示から除外するタグ（config.jsonの設定を参照）
        const excludeTags = this.config?.tags?.excludeFromDisplay || ['nsfw'];
        const visibleTags = tags.filter(tag => !excludeTags.includes(tag));
        
        if (visibleTags.length === 0) {
            return '<span class="no-tags">表示可能なタグがありません</span>';
        }
        
        return visibleTags.map(tag => {
            return `<a href="/gallery/tag-page/${tag}.html" class="tag-link">#${tag}</a>`;
        }).join(' ');
    }
    
    setupControls() {
        // シリーズフィルターの選択肢を動的生成
        this.populateSeriesFilter();
        
        // タグフィルターの選択肢を動的生成
        this.populateTagFilter();
        
        // ソート機能
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortWorks(e.target.value);
                this.renderWorks();
            });
        }
        
        // シリーズフィルター
        const seriesFilter = document.getElementById('series-filter');
        if (seriesFilter) {
            seriesFilter.addEventListener('change', (e) => {
                this.currentSeriesFilter = e.target.value;
                this.filterWorksByTag();
                this.renderWorks();
                // タグフィルターの選択肢を更新
                this.populateTagFilter();
            });
        }
        
        // タグフィルター
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.currentTagFilter = e.target.value;
                this.filterWorksByTag();
                this.renderWorks();
            });
        }
        
        // リセットボタン
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
    }
    
    resetFilters() {
        console.log('Resetting all filters...');
        
        // フィルター状態をリセット
        this.currentSeriesFilter = '';
        this.currentTagFilter = '';
        this.currentSort = 'date-desc';
        
        // UI要素をリセット
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.value = 'date-desc';
        }
        
        const seriesFilter = document.getElementById('series-filter');
        if (seriesFilter) {
            seriesFilter.value = '';
        }
        
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter) {
            tagFilter.value = '';
        }
        
        // データを再フィルタリング・再描画
        this.filterWorksByTag();
        this.renderWorks();
        
        // タグフィルターの選択肢を更新
        this.populateTagFilter();
        
        console.log('Filters reset successfully');
    }
    
    populateSeriesFilter() {
        const seriesFilter = document.getElementById('series-filter');
        if (!seriesFilter) return;
        
        // 現在のタグに含まれるシリーズを取得
        const availableSeries = [...new Set(
            this.allWorks
                .filter(work => work.tags && work.tags.includes(this.targetTag))
                .map(work => work.series)
        )].sort();
        
        // 選択肢をクリア
        seriesFilter.innerHTML = '<option value="">全シリーズ</option>';
        
        // シリーズオプションを追加
        availableSeries.forEach(series => {
            const option = document.createElement('option');
            option.value = series;
            option.textContent = series;
            seriesFilter.appendChild(option);
        });
    }
    
    populateTagFilter() {
        const tagFilter = document.getElementById('tag-filter');
        if (!tagFilter) return;
        
        // 現在の条件（メインタグ + シリーズフィルター）に該当する作品を取得
        let candidateWorks = this.allWorks.filter(work => 
            work.tags && work.tags.includes(this.targetTag)
        );
        
        if (this.currentSeriesFilter) {
            candidateWorks = candidateWorks.filter(work => 
                work.series === this.currentSeriesFilter
            );
        }
        
        // 除外タグの設定
        const excludeTags = this.config?.tags?.excludeFromDisplay || ['nsfw'];
        const seriesTags = this.config?.tags?.seriesTags || ['fanart', 'original', 'works', 'commission'];
        
        // 候補作品からすべてのタグを収集
        const allTags = new Set();
        candidateWorks.forEach(work => {
            work.tags.forEach(tag => {
                // メインタグ、除外タグ、シリーズタグを除く
                if (tag !== this.targetTag && 
                    !excludeTags.includes(tag) && 
                    !seriesTags.includes(tag)) {
                    allTags.add(tag);
                }
            });
        });
        
        // タグを使用頻度順でソート
        const tagFrequency = {};
        allTags.forEach(tag => {
            tagFrequency[tag] = candidateWorks.filter(work => 
                work.tags && work.tags.includes(tag)
            ).length;
        });
        
        const sortedTags = Array.from(allTags).sort((a, b) => 
            tagFrequency[b] - tagFrequency[a]
        );
        
        // 選択肢をクリア
        tagFilter.innerHTML = '<option value="">追加タグなし</option>';
        
        // タグオプションを追加
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = `#${tag} (${tagFrequency[tag]}件)`;
            tagFilter.appendChild(option);
        });
        
        // 現在の選択を維持
        if (this.currentTagFilter && sortedTags.includes(this.currentTagFilter)) {
            tagFilter.value = this.currentTagFilter;
        } else {
            this.currentTagFilter = '';
            tagFilter.value = '';
        }
    }
    
    showError(message) {
        const container = document.getElementById('works-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <p>♥ ${message} ♥</p>
                </div>
            `;
        }
    }
    
    // ローディング表示関連のメソッド
    showLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            // タグ名を動的に更新
            const loadingText = loadingIndicator.querySelector('p');
            if (loadingText) {
                loadingText.textContent = `♥ #${this.targetTag} タグ付き作品を読み込み中 ♥`;
            }
        }
    }
    
    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
    
    updateLoadingStatus(message, percentage = null) {
        const loadingStatus = document.getElementById('loading-status');
        const progressBar = document.querySelector('.progress-bar');
        
        if (loadingStatus) {
            loadingStatus.textContent = message;
        }
        
        if (progressBar && percentage !== null) {
            progressBar.style.width = `${percentage}%`;
        }
        
        console.log(`Loading: ${message} ${percentage ? `(${percentage}%)` : ''}`);
    }
    
    // サイドバーの見出し機能を再初期化
    reinitializeHeadingFeatures() {
        // 一度だけ実行するように制御
        if (this.headingFeaturesInitialized) {
            return;
        }
        
        // DOM更新とNSFWフィルター処理の完了を待つ
        setTimeout(() => {
            // 現在のh3要素数を確認
            const h3Elements = document.querySelectorAll('h3');
            console.log(`Reinitializing sidebar features for ${h3Elements.length} headings`);
            
            // グローバルな見出し機能の再初期化を呼び出し
            if (window.initHeadingFeatures && typeof window.initHeadingFeatures === 'function') {
                window.initHeadingFeatures();
                this.headingFeaturesInitialized = true;
                
                // 初期位置を正確に設定（動的コンテンツ用）
                setTimeout(() => {
                    if (window.updateActiveIndexByScroll && typeof window.updateActiveIndexByScroll === 'function') {
                        window.updateActiveIndexByScroll();
                    }
                }, 100);
            } else {
                console.warn('initHeadingFeatures function not available');
            }
        }, 500); // NSFWフィルター処理完了を待つ時間を延長
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, checking TagPageConfig...');
    
    if (window.TagPageConfig && window.TagPageConfig.targetTag) {
        const tagSystem = new TagPageSystem();
        await tagSystem.initialize(window.TagPageConfig.targetTag);
    } else {
        console.error('TagPageConfig not found or targetTag not specified');
    }
});