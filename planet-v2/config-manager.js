/**
 * Planet Aggregator v2 - 設定管理システム
 * データソースの動的管理とユーザー設定の永続化
 */

// ========================================
// 設定管理クラス
// ========================================

/**
 * データソース設定管理
 */
class DataSourceManager {
    constructor() {
        this.config = null;
        this.userOverrides = new Map();
        this.localStorageKey = 'planet-v2-user-config';
    }
    
    /**
     * 設定ファイルを読み込み
     */
    async loadConfig() {
        try {
            const response = await fetch('./data-sources.json');
            if (!response.ok) {
                throw new Error(`設定ファイル読み込み失敗: ${response.status}`);
            }
            
            this.config = await response.json();
            console.log(`設定読み込み完了: ${this.config.dataSources.length}件のデータソース`);
            
            // ユーザー設定をマージ
            this.loadUserOverrides();
            
            return this.config;
            
        } catch (error) {
            console.error('設定読み込みエラー:', error);
            // フォールバック設定を使用
            return this.getFallbackConfig();
        }
    }
    
    /**
     * フォールバック設定（設定ファイルが読み込めない場合）
     */
    getFallbackConfig() {
        console.log('フォールバック設定を使用');
        
        // デフォルトのデータソース定義（設定可能）
        const defaultSources = this.getDefaultDataSources();
        
        return {
            version: "2.0",
            description: "フォールバック設定",
            dataSources: defaultSources,
            globalSettings: {
                autoRefreshInterval: 1800000,
                maxTotalPosts: 100,
                defaultCacheDuration: 600000
            }
        };
    }
    
    /**
     * デフォルトデータソースの定義
     */
    getDefaultDataSources() {
        // 環境変数やlocalStorageからデフォルト値を取得する拡張ポイント
        const envDefaults = this.getEnvironmentDefaults();
        
        return envDefaults.length > 0 ? envDefaults : [
            {
                id: "primary_source_fallback",
                type: "misskey",
                enabled: true,
                config: {
                    instanceUrl: "https://tanoshii.site",
                    username: "health",
                    displayName: "tanoshii.site",
                    sourceIconImage: "./tanoshiisite.jpg",
                    description: "プライマリフォールバック設定"
                },
                fetchSettings: {
                    maxPosts: 20,
                    includeReplies: false,
                    includeReblogs: false,
                    rateLimit: 30000
                }
            }
        ];
    }
    
    /**
     * 環境固有のデフォルト設定を取得
     * 将来的にlocalStorage、環境変数、URL パラメータなどから取得可能
     */
    getEnvironmentDefaults() {
        try {
            // localStorage から緊急フォールバック設定を確認
            const emergencyConfig = localStorage.getItem('planet-v2-emergency-config');
            if (emergencyConfig) {
                const parsed = JSON.parse(emergencyConfig);
                console.log('緊急フォールバック設定を使用');
                return parsed.dataSources || [];
            }
        } catch (error) {
            console.warn('緊急設定の読み込みに失敗:', error);
        }
        
        return [];
    }
    
    /**
     * ユーザー設定オーバーライドを読み込み
     */
    loadUserOverrides() {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            if (stored) {
                const userConfig = JSON.parse(stored);
                
                // ユーザー設定をマップに変換
                Object.entries(userConfig).forEach(([id, overrides]) => {
                    this.userOverrides.set(id, overrides);
                });
                
                console.log(`ユーザー設定読み込み: ${this.userOverrides.size}件のオーバーライド`);
            }
        } catch (error) {
            console.warn('ユーザー設定読み込みエラー:', error);
        }
    }
    
    /**
     * ユーザー設定を保存
     */
    saveUserOverrides() {
        try {
            const userConfig = Object.fromEntries(this.userOverrides);
            localStorage.setItem(this.localStorageKey, JSON.stringify(userConfig));
            console.log('ユーザー設定を保存しました');
        } catch (error) {
            console.error('ユーザー設定保存エラー:', error);
        }
    }
    
    /**
     * 有効なデータソースを取得
     */
    getEnabledDataSources() {
        if (!this.config) {
            console.warn('設定が読み込まれていません');
            return [];
        }
        
        return this.config.dataSources
            .filter(source => source.enabled)
            .map(source => this.applyUserOverrides(source));
    }
    
    /**
     * ユーザー設定を適用
     */
    applyUserOverrides(source) {
        const overrides = this.userOverrides.get(source.id);
        if (!overrides) {
            return source;
        }
        
        // ディープマージ
        return this.deepMerge(source, overrides);
    }
    
    /**
     * データソース設定を更新
     */
    updateDataSource(id, updates) {
        this.userOverrides.set(id, {
            ...this.userOverrides.get(id),
            ...updates
        });
        
        this.saveUserOverrides();
        console.log(`データソース ${id} を更新しました`);
    }
    
    /**
     * データソースを有効/無効切り替え
     */
    toggleDataSource(id, enabled) {
        this.updateDataSource(id, { enabled });
    }
    
    /**
     * 新しいデータソースを追加
     */
    addDataSource(sourceConfig) {
        if (!this.config) {
            console.error('設定が読み込まれていません');
            return false;
        }
        
        // IDの重複チェック
        if (this.config.dataSources.some(s => s.id === sourceConfig.id)) {
            console.error(`データソース ID "${sourceConfig.id}" は既に存在します`);
            return false;
        }
        
        // デフォルト値を設定
        const newSource = {
            enabled: true,
            fetchSettings: {
                maxPosts: 20,
                includeReplies: false,
                includeReblogs: false,
                rateLimit: 30000
            },
            ...sourceConfig
        };
        
        this.config.dataSources.push(newSource);
        console.log(`新しいデータソースを追加: ${newSource.id}`);
        
        return true;
    }
    
    /**
     * データソースを削除
     */
    removeDataSource(id) {
        if (!this.config) {
            console.error('設定が読み込まれていません');
            return false;
        }
        
        const index = this.config.dataSources.findIndex(s => s.id === id);
        if (index === -1) {
            console.error(`データソース "${id}" が見つかりません`);
            return false;
        }
        
        this.config.dataSources.splice(index, 1);
        this.userOverrides.delete(id);
        this.saveUserOverrides();
        
        console.log(`データソースを削除: ${id}`);
        return true;
    }
    
    /**
     * 設定をリセット
     */
    resetToDefaults() {
        this.userOverrides.clear();
        localStorage.removeItem(this.localStorageKey);
        console.log('設定をデフォルトにリセットしました');
    }
    
    /**
     * グローバル設定を取得
     */
    getGlobalSettings() {
        return this.config?.globalSettings || {
            autoRefreshInterval: 1800000,
            maxTotalPosts: 100,
            defaultCacheDuration: 600000
        };
    }
    
    /**
     * ディープマージユーティリティ
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    /**
     * 設定の妥当性チェック
     */
    validateDataSource(source) {
        const required = ['id', 'type', 'config'];
        const missing = required.filter(field => !source[field]);
        
        if (missing.length > 0) {
            console.error(`データソースの必須フィールドが不足: ${missing.join(', ')}`);
            return false;
        }
        
        // 型別の妥当性チェック
        switch (source.type) {
            case 'misskey':
                return this.validateMisskeyConfig(source.config);
            case 'mastodon':
                return this.validateMastodonConfig(source.config);
            case 'rss':
                return this.validateRSSConfig(source.config);
            default:
                console.warn(`未知のデータソースタイプ: ${source.type}`);
                return true; // 警告だけで通す
        }
    }
    
    /**
     * Misskey設定の妥当性チェック
     */
    validateMisskeyConfig(config) {
        const required = ['instanceUrl', 'username'];
        const missing = required.filter(field => !config[field]);
        
        if (missing.length > 0) {
            console.error(`Misskey設定の必須フィールドが不足: ${missing.join(', ')}`);
            return false;
        }
        
        // URL形式チェック
        try {
            new URL(config.instanceUrl);
        } catch {
            console.error(`無効なMisskey URL: ${config.instanceUrl}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Mastodon設定の妥当性チェック
     */
    validateMastodonConfig(config) {
        // TODO: Mastodon固有の妥当性チェックを実装
        return this.validateMisskeyConfig(config); // 一時的にMisskeyと同じ
    }
    
    /**
     * RSS設定の妥当性チェック
     */
    validateRSSConfig(config) {
        const required = ['feedUrl'];
        const missing = required.filter(field => !config[field]);
        
        if (missing.length > 0) {
            console.error(`RSS設定の必須フィールドが不足: ${missing.join(', ')}`);
            return false;
        }
        
        // URLの妥当性チェック
        try {
            new URL(config.feedUrl);
        } catch {
            // 相対パスの場合は有効とする
            if (!config.feedUrl.startsWith('./') && !config.feedUrl.startsWith('../') && !config.feedUrl.startsWith('/')) {
                console.error(`無効なRSS URL: ${config.feedUrl}`);
                return false;
            }
        }
        
        return true;
    }
}

// グローバルインスタンス
let dataSourceManager = null;

/**
 * データソース管理の初期化
 */
async function initializeDataSourceManager() {
    dataSourceManager = new DataSourceManager();
    await dataSourceManager.loadConfig();
    return dataSourceManager;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataSourceManager, initializeDataSourceManager };
}
