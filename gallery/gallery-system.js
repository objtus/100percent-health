// システム設定クラス
class GalleryConfig {
    constructor() {
        this.config = null;
        this.pageConfig = null;
        this.isLoaded = false;
    }

    async loadConfig(configPath = '../data/config.json') {
        try {
            this.debugLog('Loading config from:', configPath);
            const response = await fetch(configPath);
            
            if (!response.ok) {
                throw new Error(`Config load failed: ${response.status}`);
            }
            
            this.config = await response.json();
            this.isLoaded = true;
            this.debugLog('Config loaded successfully:', this.config);
            
            return this.config;
        } catch (error) {
            this.debugLog('Config load error:', error);
            this.config = this.getDefaultConfig();
            this.isLoaded = true;
            return this.config;
        }
    }

    getDefaultConfig() {
        return {
            system: {
                version: "1.0.0",
                debug: true,
                basePath: "/gallery/"
            },
            series: {
                fanart: {
                    dataPath: "data/fanart.json",
                    displayName: "ファンアート"
                }
            },
            ui: {
                itemsPerCategory: 3,
                defaultView: "text",
                enableImageView: true,
                enableTextView: true
            },
            diversity: {
                randomize: true,
                seriesBalance: true,
                maxSameSeriesRatio: 0.6
            },
            tags: {
                excludeFromDisplay: [],
                priorityTags: [],
                seriesTags: ["fanart", "original", "works", "commission", "groundpolis_paint"]
            },
            paths: {
                imageBase: "/img/",
                galleryBase: "/gallery/",
                dataBase: "/gallery/data/"
            }
        };
    }

    setPageConfig(pageConfig) {
        this.pageConfig = pageConfig;
        this.debugLog('Page config set:', pageConfig);
    }

    get(path, defaultValue = null) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }

    getSeriesConfig(seriesName) {
        return this.get(`series.${seriesName}`, null);
    }

    getAllSeriesConfigs() {
        return this.get('series', {});
    }

    isDebugMode() {
        return this.pageConfig?.debug ?? this.get('system.debug', true);
    }

    getCurrentSeries() {
        return this.pageConfig?.currentSeries || 'fanart';
    }

    getCurrentId() {
        return this.pageConfig?.currentId || 'unknown';
    }

    getDataPath() {
        const series = this.getCurrentSeries();
        const seriesConfig = this.getSeriesConfig(series);
        return seriesConfig?.dataPath || `data/${series}.json`;
    }

    getAbsolutePath(relativePath) {
        const basePath = this.get('system.basePath', '/');
        if (relativePath.startsWith('/')) {
            return relativePath;
        }
        return basePath + relativePath.replace(/^\/+/, '');
    }

    getDataFileUrl(seriesName) {
        const seriesConfig = this.getSeriesConfig(seriesName);
        const dataPath = seriesConfig?.dataPath || `data/${seriesName}.json`;
        
        const dataBase = this.get('paths.dataBase');
        if (dataBase) {
            return dataBase + `${seriesName}.json`;
        }
        
        return this.getAbsolutePath(dataPath);
    }

    getImagePageBase() {
        return this.get('paths.galleryBase', '/gallery/') + 'image-page/';
    }

    getTagPageBase() {
        return this.get('paths.galleryBase', '/gallery/') + 'tag-page/';
    }

    debugLog(message, data) {
        if (this.isDebugMode()) {
            console.log('[Gallery Debug]', message, data);
        }
    }
}

const galleryConfig = new GalleryConfig();

// シンプル多様性システム
class SimpleDiversityEnhancer {
    constructor() {
        this.config = galleryConfig.get('diversity', {
            randomize: true,
            seriesBalance: true,
            maxSameSeriesRatio: 0.6
        });
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    balanceSeriesDistribution(items, maxItems) {
        if (!this.config.seriesBalance || items.length <= maxItems) {
            return items.slice(0, maxItems);
        }

        const maxSameSeriesCount = Math.ceil(maxItems * this.config.maxSameSeriesRatio);
        const seriesCount = {};
        const result = [];

        for (const item of items) {
            const series = item.series;
            const currentCount = seriesCount[series] || 0;

            if (currentCount < maxSameSeriesCount && result.length < maxItems) {
                result.push(item);
                seriesCount[series] = currentCount + 1;
            }
        }

        if (result.length < maxItems) {
            for (const item of items) {
                if (!result.find(r => r.id === item.id) && result.length < maxItems) {
                    result.push(item);
                }
            }
        }

        return result;
    }

    selectDiverseItems(items, maxItems, category) {
        galleryConfig.debugLog(`Selecting diverse items for ${category}: ${items.length} candidates`);

        let candidates = [...items];

        if (this.config.randomize) {
            candidates = this.shuffleArray(candidates);
        }

        const selected = this.balanceSeriesDistribution(candidates, maxItems);

        const seriesBreakdown = {};
        selected.forEach(item => {
            seriesBreakdown[item.series] = (seriesBreakdown[item.series] || 0) + 1;
        });
        
        galleryConfig.debugLog(`${category} diversity results:`, {
            candidates: items.length,
            selected: selected.length,
            seriesBreakdown
        });

        return selected;
    }
}

const simpleDiversityEnhancer = new SimpleDiversityEnhancer();

// 全シリーズデータマネージャー
class MultiSeriesDataManager {
    constructor() {
        this.allSeriesData = new Map();
        this.flattenedData = [];
        this.isLoaded = false;
    }

    async loadAllSeriesData() {
        galleryConfig.debugLog('Loading all series data...');
        
        const seriesConfigs = galleryConfig.getAllSeriesConfigs();
        const loadPromises = [];
        
        Object.entries(seriesConfigs).forEach(([seriesName, config]) => {
            const promise = this.loadSeriesData(seriesName, config.dataPath);
            loadPromises.push(promise);
        });
        
        try {
            const results = await Promise.allSettled(loadPromises);
            
            results.forEach((result, index) => {
                const seriesName = Object.keys(seriesConfigs)[index];
                if (result.status === 'fulfilled') {
                    galleryConfig.debugLog(`✅ ${seriesName}: loaded successfully`);
                } else {
                    galleryConfig.debugLog(`❌ ${seriesName}: failed to load`, result.reason);
                }
            });
            
            this.flattenAllData();
            this.isLoaded = true;
            
            const loadedCount = results.filter(r => r.status === 'fulfilled').length;
            const totalCount = results.length;
            
            galleryConfig.debugLog(`Multi-series loading completed: ${loadedCount}/${totalCount} series loaded`);
            
            return this.flattenedData;
        } catch (error) {
            galleryConfig.debugLog('Critical error in multi-series loading:', error);
            throw error;
        }
    }

    async loadSeriesData(seriesName, dataPath) {
        try {
            galleryConfig.debugLog(`Loading ${seriesName} from ${dataPath}...`);
            
            const fullDataPath = galleryConfig.getDataFileUrl(seriesName);
            const response = await fetch(fullDataPath);
            
            if (!response.ok) {
                galleryConfig.debugLog(`Failed to load ${seriesName}: ${response.status}`);
                return;
            }
            
            const data = await response.json();
            
            const mainSeries = data.mainSeries || seriesName;
            
            const seriesKey = `${seriesName}_series`;
            const seriesData = data[seriesKey];
            
            if (seriesData && Array.isArray(seriesData)) {
                const enrichedData = seriesData.map(item => ({
                    ...item,
                    mainSeries: mainSeries
                }));
                
                this.allSeriesData.set(seriesName, enrichedData);
                galleryConfig.debugLog(`Loaded ${seriesName}: ${seriesData.length} items with mainSeries: ${mainSeries}`);
            } else {
                galleryConfig.debugLog(`No valid data found for ${seriesName} (expected key: ${seriesKey})`);
            }
        } catch (error) {
            galleryConfig.debugLog(`Error loading ${seriesName}:`, error);
        }
    }

    flattenAllData() {
        this.flattenedData = [];
        this.allSeriesData.forEach((data, seriesName) => {
            this.flattenedData.push(...data);
        });
        galleryConfig.debugLog(`Flattened data: ${this.flattenedData.length} total items`);
    }

    getSeriesCounts() {
        const counts = {};
        this.allSeriesData.forEach((data, seriesName) => {
            counts[seriesName] = data.length;
        });
        return counts;
    }

    findWorkById(id) {
        return this.flattenedData.find(work => work.id === id);
    }

    getAllData() {
        return this.flattenedData;
    }

    getSeriesData(seriesName) {
        return this.allSeriesData.get(seriesName) || [];
    }
}

const multiSeriesDataManager = new MultiSeriesDataManager();

// 動的コンテンツ生成システム
class RelatedWorksManager {
    constructor() {
        this.currentData = null;
        this.allData = null;
        this.isLoading = false;
    }

    async initialize() {
        galleryConfig.debugLog('RelatedWorksManager initializing...');
        
        if (!galleryConfig.isLoaded) {
            galleryConfig.debugLog('Waiting for config to load...');
            await new Promise(resolve => {
                const checkConfig = () => {
                    if (galleryConfig.isLoaded) {
                        resolve();
                    } else {
                        setTimeout(checkConfig, 100);
                    }
                };
                checkConfig();
            });
        }
        
        galleryConfig.debugLog('RelatedWorksManager initialized');
    }

    setState(container, state) {
        container.setAttribute('data-state', state);
        galleryConfig.debugLog(`State changed to: ${state}`, container);
        
        const placeholders = container.querySelectorAll('.loading-placeholder, .error-placeholder, .empty-placeholder');
        placeholders.forEach(p => p.style.display = 'none');

        switch(state) {
            case 'loading':
                const loading = container.querySelector('.loading-placeholder');
                if (loading) loading.style.display = 'block';
                break;
            case 'error':
                const error = container.querySelector('.error-placeholder');
                if (error) error.style.display = 'block';
                break;
            case 'empty':
                const empty = container.querySelector('.empty-placeholder');
                if (empty) empty.style.display = 'block';
                break;
        }
    }

    createRelatedItem(data) {
        const template = document.getElementById('related-item-template');
        if (!template) {
            galleryConfig.debugLog('ERROR: related-item-template not found!');
            throw new Error('Template not found: related-item-template');
        }
        
        const clone = template.content.cloneNode(true);
        
        const item = clone.querySelector('.related-item');
        item.setAttribute('data-id', data.id);
        item.setAttribute('data-series', data.series);

        if (data.tags && data.tags.includes('nsfw')) {
            item.classList.add('nsfw');
        }
        
        const imageLink = clone.querySelector('.image-link');
        imageLink.href = data.path;
        
        const img = clone.querySelector('img');
        img.src = data.image_path;
        img.alt = `${data.id} (${data.series})`;
        
        const titleLink = clone.querySelector('.title-link');
        titleLink.href = data.path;
        
        const span = clone.querySelector('span');
        span.textContent = data.id;
        
        return clone;
    }

    createTextLink(data) {
        const template = document.getElementById('text-link-template');
        if (!template) {
            galleryConfig.debugLog('ERROR: text-link-template not found!');
            throw new Error('Template not found: text-link-template');
        }
        
        const clone = template.content.cloneNode(true);
        
        const link = clone.querySelector('.text-item-link');
        link.href = data.path;
        link.textContent = data.id;
        link.setAttribute('data-series', data.series);
        
        return clone;
    }

    createTagLink(tag, url) {
        const template = document.getElementById('tag-link-template');
        if (!template) {
            galleryConfig.debugLog('ERROR: tag-link-template not found!');
            throw new Error('Template not found: tag-link-template');
        }
        
        const clone = template.content.cloneNode(true);
        
        const link = clone.querySelector('.tag-link');
        const tagPageBase = galleryConfig.getTagPageBase();
        
        if (url.startsWith('gallery/tag-page/')) {
            link.href = '/' + url;
        } else if (url.startsWith('/')) {
            link.href = url;
        } else {
            link.href = tagPageBase + url.replace(/^\/+/, '');
        }
        
        link.textContent = `#${tag}`;
        
        return clone;
    }

    async loadData() {
        this.isLoading = true;
        galleryConfig.debugLog('Starting multi-series data load...');
        
        const containers = document.querySelectorAll('[data-grid-container], [data-text-container], [data-tags-container]');
        containers.forEach(container => {
            this.setState(container, 'loading');
        });

        try {
            await multiSeriesDataManager.loadAllSeriesData();
            
            this.allData = multiSeriesDataManager.getAllData();
            this.currentData = multiSeriesDataManager.findWorkById(galleryConfig.getCurrentId());
            
            if (!this.currentData) {
                throw new Error(`Current work not found: ${galleryConfig.getCurrentId()}`);
            }
            
            galleryConfig.debugLog('Multi-series data loaded:', {
                totalWorks: this.allData.length,
                currentWork: this.currentData
            });
            
            this.renderContent();
            this.isLoading = false;
            
        } catch (error) {
            galleryConfig.debugLog('Multi-series data load failed', error);
            containers.forEach(container => {
                this.setState(container, 'error');
            });
            this.isLoading = false;
        }
    }

    renderContent() {
        galleryConfig.debugLog('Starting content render with multi-series data...');
        
        this.renderTags(this.currentData.tags);
        
        const relatedWorks = this.getRelatedWorks();
        galleryConfig.debugLog('Multi-series related works calculated', relatedWorks);

        Object.keys(relatedWorks).forEach(category => {
            this.renderCategory(category, relatedWorks[category]);
        });

        this.updateHeadings();
    }

    getRelatedWorks() {
        const current = this.currentData;
        const all = this.allData;
        const maxItems = galleryConfig.get('ui.itemsPerCategory', 3);
        
        galleryConfig.debugLog(`Calculating diverse related works from ${all.length} total works across all series`);
        
        const topTags = this.getTopTwoFrequentTags(current, all);
        galleryConfig.debugLog(`Top tags for common sections:`, topTags);
        
        const currentYear = this.getYearFromDate(current.date);
        galleryConfig.debugLog(`Current work year: ${currentYear}`);
        
        // mainSeriesを使用した同シリーズ判定
        const currentMainSeries = current.mainSeries || current.series;
        
        const candidates = {
            'same-series': all.filter(item => 
                item.id !== current.id && 
                (item.mainSeries || item.series) === currentMainSeries
            ),
            
            'same-period': all.filter(item => 
                item.id !== current.id && this.getYearFromDate(item.date) === currentYear
            ),
            
            'common-tags-1': topTags.first ? all.filter(item => 
                item.id !== current.id && item.tags.includes(topTags.first)
            ) : [],
            
            'common-tags-2': topTags.second ? all.filter(item => 
                item.id !== current.id && item.tags.includes(topTags.second)
            ) : []
        };
        
        const relatedWorks = {};
        
        Object.entries(candidates).forEach(([category, items]) => {
            if (typeof simpleDiversityEnhancer !== 'undefined') {
                relatedWorks[category] = simpleDiversityEnhancer.selectDiverseItems(items, maxItems, category);
            } else {
                const shuffled = items.sort(() => Math.random() - 0.5);
                relatedWorks[category] = shuffled.slice(0, maxItems);
            }
            
            galleryConfig.debugLog(`${category}: ${items.length} candidates → ${relatedWorks[category].length} selected`);
        });
        
        // デバッグ情報を追加
        galleryConfig.debugLog(`Current mainSeries: ${currentMainSeries}`);
        galleryConfig.debugLog(`Same-series filter found: ${candidates['same-series'].length} items`);
        
        return relatedWorks;
    }

    getYearFromDate(dateString) {
        return dateString.split('-')[0];
    }

    getTopTwoFrequentTags(currentWork, allWorks) {
        const excludeTags = galleryConfig.get('tags.seriesTags', []);
        const candidateTags = currentWork.tags.filter(tag => !excludeTags.includes(tag));
        
        if (candidateTags.length === 0) {
            galleryConfig.debugLog('No candidate tags found (excluding series tags)');
            return { first: null, second: null, frequency: {} };
        }
        
        const tagFrequency = {};
        candidateTags.forEach(tag => {
            tagFrequency[tag] = allWorks.filter(work => 
                work.id !== currentWork.id && work.tags.includes(tag)
            ).length;
        });
        
        galleryConfig.debugLog('Multi-series tag frequency analysis:', tagFrequency);
        
        const sortedTags = candidateTags
            .filter(tag => tagFrequency[tag] > 0)
            .sort((a, b) => tagFrequency[b] - tagFrequency[a]);
        
        if (sortedTags.length === 0) {
            galleryConfig.debugLog('No tags with frequency > 0 found');
            return { first: null, second: null, frequency: tagFrequency };
        }
        
        // 3位〜8位のタグを選択対象とする（1-2位を避けて多様性を確保）
        const selectableTags = sortedTags.slice(2, 8);
        
        // フォールバック: 選択可能なタグが少ない場合は元のロジックを使用
        const first = selectableTags.length > 0 ? selectableTags[0] : sortedTags[0];
        const second = selectableTags.length > 1 ? selectableTags[1] : 
                       (selectableTags.length === 1 ? sortedTags[1] : sortedTags[1]);
        
        const result = {
            first: first || null,
            second: second || null,
            frequency: tagFrequency
        };
        
        // デバッグ情報
        galleryConfig.debugLog('Tag selection results:');
        galleryConfig.debugLog(`- Top tags (excluded): ${sortedTags.slice(0, 2).map(tag => `${tag}(${tagFrequency[tag]})`).join(', ')}`);
        galleryConfig.debugLog(`- Selectable tags (3rd-8th): ${selectableTags.map(tag => `${tag}(${tagFrequency[tag]})`).join(', ')}`);
        galleryConfig.debugLog(`- Selected first: ${result.first} (${tagFrequency[result.first] || 0} works)`);
        galleryConfig.debugLog(`- Selected second: ${result.second} (${tagFrequency[result.second] || 0} works)`);
        
        return result;
    }

    renderTags(tags) {
        const container = document.querySelector('[data-tags-container]');
        const excludeTags = galleryConfig.get('tags.excludeFromDisplay', []);
        const visibleTags = tags.filter(tag => !excludeTags.includes(tag));
        
        container.innerHTML = '';

        visibleTags.forEach(tag => {
            const url = `/gallery/tag-page/${tag}.html`;
            const tagLink = this.createTagLink(tag, url);
            container.appendChild(tagLink);
        });
    }

    renderCategory(category, items) {
        const gridContainer = document.querySelector(`[data-grid-container="${category}"]`);
        const textContainer = document.querySelector(`[data-text-container="${category}"]`);
        const countInfo = document.querySelector(`[data-count-info="${category}"]`);

        if (items.length === 0) {
            this.setState(gridContainer, 'empty');
            this.setState(textContainer, 'empty');
            return;
        }

        gridContainer.innerHTML = '';
        items.forEach(item => {
            const element = this.createRelatedItem(item);
            gridContainer.appendChild(element);
        });
        this.setState(gridContainer, 'ready');

        textContainer.innerHTML = '';
        items.forEach((item, index) => {
            const link = this.createTextLink(item);
            textContainer.appendChild(link);
            
            if (index < items.length - 1) {
                textContainer.appendChild(document.createTextNode(' | '));
            }
        });
        this.setState(textContainer, 'ready');

        if (countInfo) {
            const categoryLabels = {
                'same-series': '同シリーズ',
                'same-period': '同年制作', 
                'common-tags-1': '同じタグ',
                'common-tags-2': '同じタグ'
            };
            countInfo.textContent = categoryLabels[category] || '';
        }
    }

    updateHeadings() {
        const currentSeries = galleryConfig.getCurrentSeries();
        
        const seriesLink = document.querySelector('[data-series-link]');
        if (seriesLink) {
            seriesLink.href = `/gallery/tag-page/${currentSeries}.html`;
            seriesLink.textContent = `#${currentSeries}`;
        }

        const periodInfo = document.querySelector('[data-period-info]');
        if (periodInfo) {
            const year = this.getYearFromDate(this.currentData.date);
            periodInfo.textContent = `${year}年制作`;
            galleryConfig.debugLog(`Updated period info: ${year}年制作`);
        }

        const topTags = this.getTopTwoFrequentTags(this.currentData, this.allData);
        
        const tagLink1 = document.querySelector('[data-tag-link-1]');
        if (tagLink1 && topTags.first) {
            tagLink1.href = `/gallery/tag-page/${topTags.first}.html`;
            tagLink1.textContent = `#${topTags.first}`;
            galleryConfig.debugLog(`Updated heading tag link 1: #${topTags.first}`);
        }
        
        const tagLink2 = document.querySelector('[data-tag-link-2]');
        if (tagLink2 && topTags.second) {
            tagLink2.href = `/gallery/tag-page/${topTags.second}.html`;
            tagLink2.textContent = `#${topTags.second}`;
            galleryConfig.debugLog(`Updated heading tag link 2: #${topTags.second}`);
        }
    }
}

// 表示切り替え機能
class ViewToggleManager {
    constructor() {
        this.textViewBtn = document.getElementById('text-view-btn');
        this.imageViewBtn = document.getElementById('image-view-btn');
        this.galleryHtml = document.getElementById('galleryhtml');
        
        this.setupEventListeners();
        this.setDefaultView();
    }

    setupEventListeners() {
        if (!this.textViewBtn || !this.imageViewBtn || !this.galleryHtml) {
            galleryConfig.debugLog('ERROR: View toggle elements not found');
            return;
        }

        this.textViewBtn.addEventListener('click', () => this.switchToTextView());
        this.imageViewBtn.addEventListener('click', () => this.switchToImageView());
        
        this.textViewBtn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                this.imageViewBtn.focus();
            }
        });
        
        this.imageViewBtn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.textViewBtn.focus();
            }
        });
    }

    setDefaultView() {
        const defaultView = galleryConfig.get('ui.defaultView', 'text');
        if (defaultView === 'image') {
            this.switchToImageView();
        } else {
            this.switchToTextView();
        }
    }

    switchToTextView() {
        this.galleryHtml.className = 'view-mode-text';
        this.textViewBtn.setAttribute('aria-selected', 'true');
        this.imageViewBtn.setAttribute('aria-selected', 'false');
        galleryConfig.debugLog('Switched to text view');
    }

    switchToImageView() {
        this.galleryHtml.className = 'view-mode-image';
        this.textViewBtn.setAttribute('aria-selected', 'false');
        this.imageViewBtn.setAttribute('aria-selected', 'true');
        galleryConfig.debugLog('Switched to image view');
    }
}

// 初期化処理
document.addEventListener('DOMContentLoaded', async function () {
    galleryConfig.debugLog('DOM loaded, initializing gallery system v3.0...');
    
    try {
        await galleryConfig.loadConfig();
        
        if (typeof window.GalleryPageConfig !== 'undefined') {
            galleryConfig.setPageConfig(window.GalleryPageConfig);
        } else {
            galleryConfig.debugLog('No page-specific config found, using defaults');
        }
        
        const requiredTemplates = ['related-item-template', 'text-link-template', 'tag-link-template'];
        const missingTemplates = requiredTemplates.filter(id => !document.getElementById(id));
        
        if (missingTemplates.length > 0) {
            galleryConfig.debugLog('ERROR: Missing templates:', missingTemplates);
            alert(`テンプレートが見つかりません: ${missingTemplates.join(', ')}`);
            return;
        }
        
        galleryConfig.debugLog('All templates found successfully');
        
        const relatedWorksManager = new RelatedWorksManager();
        await relatedWorksManager.initialize();
        
        const viewToggleManager = new ViewToggleManager();
        
        await relatedWorksManager.loadData();
        
        galleryConfig.debugLog('Gallery system v3.0 initialized successfully!');
        
    } catch (error) {
        galleryConfig.debugLog('Gallery system initialization failed:', error);
        console.error('Gallery system initialization failed:', error);
    }
});

// 最小限のデバッグ機能
if (typeof window !== 'undefined') {
    window.galleryDebug = {
        config: galleryConfig,
        dataManager: multiSeriesDataManager,
        diversityEnhancer: simpleDiversityEnhancer,
        
        showConfig: () => console.log('Gallery Config:', galleryConfig.config),
        showData: () => console.log('Series Data:', multiSeriesDataManager.getSeriesCounts()),
        reloadData: async () => {
            await multiSeriesDataManager.loadAllSeriesData();
            console.log('Data reloaded');
        }
    };
}