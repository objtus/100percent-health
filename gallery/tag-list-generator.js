/**
 * タグ一覧表示システム v1.0
 * 全シリーズのJSONファイルを読み込んでタグ一覧を生成
 */

class TagListGenerator {
    constructor() {
        this.tagData = new Map(); // タグ名 → {count, works: [...]}
        this.isLoaded = false;
        this.config = null;
    }

    /**
     * 初期化
     */
    async initialize() {
        console.log('TagListGenerator initializing...');
        
        // gallery-system.jsのconfigを使用（存在する場合）
        if (typeof galleryConfig !== 'undefined') {
            this.config = galleryConfig;
        } else {
            // 独立して動作する場合: config.jsonを読み込み
            this.config = await this.loadIndependentConfig();
        }
    }

    /**
     * 独立動作時のconfig.json読み込み
     */
    async loadIndependentConfig() {
        try {
            const response = await fetch('/gallery/config.json');
            if (!response.ok) {
                throw new Error(`Config load failed: ${response.status}`);
            }
            
            const configData = await response.json();
            
            return {
                getAllSeriesConfigs: () => configData.series || {},
                getDataFileUrl: (seriesName) => {
                    const seriesConfig = configData.series?.[seriesName];
                    const dataPath = seriesConfig?.dataPath || `data/${seriesName}.json`;
                    // ルート相対パスに変換
                    return dataPath.startsWith('/') ? dataPath : `/gallery/${dataPath}`;
                },
                debugLog: (msg, data) => {
                    if (configData.system?.debug) {
                        console.log('[TagList]', msg, data);
                    }
                }
            };
        } catch (error) {
            console.warn('[TagList] Failed to load config.json, using fallback:', error);
            
            // フォールバック: 既知のシリーズのみ
            return {
                getAllSeriesConfigs: () => ({
                    fanart: { dataPath: "data/fanart.json" },
                    original: { dataPath: "data/original.json" },
                    works: { dataPath: "data/works.json" },
                    commission: { dataPath: "data/commission.json" },
                    groundpolis_paint: { dataPath: "data/groundpolis_paint.json" }
                }),
                getDataFileUrl: (seriesName) => `/gallery/data/${seriesName}.json`,
                debugLog: (msg, data) => console.log('[TagList]', msg, data)
            };
        }
    }
    async loadAllTagData() {
        this.config.debugLog('Loading all series data for tag analysis...');
        
        const seriesConfigs = this.config.getAllSeriesConfigs();
        const loadPromises = [];
        
        Object.entries(seriesConfigs).forEach(([seriesName, config]) => {
            const promise = this.loadSeriesTags(seriesName);
            loadPromises.push(promise);
        });
        
        try {
            const results = await Promise.allSettled(loadPromises);
            
            results.forEach((result, index) => {
                const seriesName = Object.keys(seriesConfigs)[index];
                if (result.status === 'fulfilled') {
                    this.config.debugLog(`✅ ${seriesName}: tags loaded successfully`);
                } else {
                    this.config.debugLog(`❌ ${seriesName}: failed to load tags`, result.reason);
                }
            });
            
            this.isLoaded = true;
            
            const loadedCount = results.filter(r => r.status === 'fulfilled').length;
            const totalCount = results.length;
            
            this.config.debugLog(`Tag loading completed: ${loadedCount}/${totalCount} series loaded`);
            this.config.debugLog(`Total unique tags: ${this.tagData.size}`);
            
            return this.tagData;
        } catch (error) {
            this.config.debugLog('Critical error in tag loading:', error);
            throw error;
        }
    }

    /**
     * 個別シリーズのタグを読み込み
     */
    async loadSeriesTags(seriesName) {
        try {
            this.config.debugLog(`Loading tags from ${seriesName}...`);
            
            const dataUrl = this.config.getDataFileUrl(seriesName);
            const response = await fetch(dataUrl);
            
            if (!response.ok) {
                this.config.debugLog(`Failed to load ${seriesName}: ${response.status}`);
                return;
            }
            
            const data = await response.json();
            const seriesKey = `${seriesName}_series`;
            const seriesData = data[seriesKey];
            
            if (seriesData && Array.isArray(seriesData)) {
                this.processTags(seriesData, seriesName);
                this.config.debugLog(`Processed tags from ${seriesName}: ${seriesData.length} works`);
            } else {
                this.config.debugLog(`No valid data found for ${seriesName} (expected key: ${seriesKey})`);
            }
        } catch (error) {
            this.config.debugLog(`Error loading tags from ${seriesName}:`, error);
        }
    }

    /**
     * タグデータを処理・集計
     */
    processTags(seriesData, seriesName) {
        seriesData.forEach(work => {
            if (work.tags && Array.isArray(work.tags)) {
                work.tags.forEach(tag => {
                    if (!this.tagData.has(tag)) {
                        this.tagData.set(tag, {
                            count: 0,
                            works: []
                        });
                    }
                    
                    const tagInfo = this.tagData.get(tag);
                    tagInfo.count++;
                    tagInfo.works.push({
                        id: work.id,
                        series: seriesName,
                        path: work.path
                    });
                });
            }
        });
    }

    /**
     * タグ一覧を取得（ソート・フィルタリング付き）
     */
    getTagList(options = {}) {
        const {
            sortBy = 'count', // 'count' | 'name'
            order = 'desc',   // 'asc' | 'desc'
            minCount = 1,     // 最小出現回数
            excludeTags = [], // 除外するタグ
            limit = null      // 表示件数制限
        } = options;

        let tags = Array.from(this.tagData.entries())
            .filter(([tag, data]) => 
                data.count >= minCount && 
                !excludeTags.includes(tag)
            )
            .map(([tag, data]) => ({
                name: tag,
                count: data.count,
                works: data.works
            }));

        // ソート
        if (sortBy === 'count') {
            tags.sort((a, b) => order === 'desc' ? b.count - a.count : a.count - b.count);
        } else if (sortBy === 'name') {
            tags.sort((a, b) => order === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
        }

        // 制限
        if (limit) {
            tags = tags.slice(0, limit);
        }

        return tags;
    }

    /**
     * HTMLを生成
     */
    generateTagListHTML(tags, options = {}) {
        const {
            showCount = true,
            linkPrefix = '/gallery/tag-page/',
            linkSuffix = '.html',
            className = 'tag-list',
            itemClassName = 'tag-item'
        } = options;

        const tagItems = tags.map(tag => {
            const countText = showCount ? ` (${tag.count})` : '';
            const href = `${linkPrefix}${tag.name}${linkSuffix}`;
            
            return `<a href="${href}" class="${itemClassName}" data-tag="${tag.name}" data-count="${tag.count}">#${tag.name}${countText}</a>`;
        }).join('\n        ');

        return `<div class="${className}">
        ${tagItems}
    </div>`;
    }

    /**
     * 指定要素にタグ一覧を挿入
     */
    async renderTagList(containerSelector, options = {}) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error(`Container not found: ${containerSelector}`);
            return;
        }

        // ローディング表示
        container.innerHTML = '<div class="loading">タグ一覧を読み込み中...</div>';

        try {
            if (!this.isLoaded) {
                await this.loadAllTagData();
            }

            const tags = this.getTagList(options);
            const html = this.generateTagListHTML(tags, options);
            
            container.innerHTML = html;
            
            this.config.debugLog(`Tag list rendered: ${tags.length} tags displayed`);
        } catch (error) {
            console.error('Failed to render tag list:', error);
            container.innerHTML = '<div class="error">タグ一覧の読み込みに失敗しました</div>';
        }
    }

    /**
     * タグ統計情報を取得
     */
    getTagStats() {
        if (!this.isLoaded) {
            return null;
        }

        const tags = Array.from(this.tagData.values());
        const totalTags = this.tagData.size;
        const totalUsages = tags.reduce((sum, tag) => sum + tag.count, 0);
        const avgUsage = totalUsages / totalTags;
        
        const sortedCounts = tags.map(t => t.count).sort((a, b) => b - a);
        const mostUsed = sortedCounts[0];
        const leastUsed = sortedCounts[sortedCounts.length - 1];

        return {
            totalTags,
            totalUsages,
            avgUsage: Math.round(avgUsage * 100) / 100,
            mostUsed,
            leastUsed
        };
    }
}

// グローバルインスタンス
const tagListGenerator = new TagListGenerator();

// DOM読み込み完了時の自動初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('TagListGenerator auto-initializing...');
    
    try {
        await tagListGenerator.initialize();
        
        // data-tag-list属性を持つ要素を自動処理
        const autoContainers = document.querySelectorAll('[data-tag-list]');
        
        for (const container of autoContainers) {
            const options = {
                sortBy: container.dataset.sortBy || 'count',
                order: container.dataset.order || 'desc',
                minCount: parseInt(container.dataset.minCount) || 1,
                limit: parseInt(container.dataset.limit) || null,
                showCount: container.dataset.showCount !== 'false',
                excludeTags: container.dataset.excludeTags ? 
                    container.dataset.excludeTags.split(',').map(s => s.trim()) : []
            };
            
            await tagListGenerator.renderTagList(`#${container.id}`, options);
        }
        
        console.log('TagListGenerator auto-initialization completed');
    } catch (error) {
        console.error('TagListGenerator auto-initialization failed:', error);
    }
});

// デバッグ用のグローバル露出
if (typeof window !== 'undefined') {
    window.tagListGenerator = tagListGenerator;
    window.tagDebug = {
        stats: () => tagListGenerator.getTagStats(),
        tags: (options) => tagListGenerator.getTagList(options),
        reload: () => tagListGenerator.loadAllTagData()
    };
}