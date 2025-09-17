/**
 * Planet Aggregator v2 - 設定管理システム
 * データソースの動的管理とユーザー設定の永続化
 */

// ========================================
// 設定・定数
// ========================================

const CONFIG = {
    // キャッシュ設定
    CACHE_DURATION: 30 * 60 * 1000,           // 30分キャッシュ
    USER_CACHE_DURATION: 24 * 60 * 60 * 1000, // ユーザー情報24時間
    MAX_CACHE_SIZE: 100,                      // キャッシュ最大サイズ
    MAX_CACHED_POSTS: 1000,                   // キャッシュ投稿最大数
    
    // リクエスト設定
    REQUEST_TIMEOUT: 10000,                   // 10秒タイムアウト
    RETRY_ATTEMPTS: 3,                        // リトライ回数
    
    // レート制限設定（ミリ秒）
    RATE_LIMITS: {
        MISSKEY: 30 * 1000,                   // 30秒間隔
        MASTODON: 20 * 1000,                  // 20秒間隔
        RSS: 60 * 1000                        // 60秒間隔（RSSは更新頻度が低い）
    },
    
    // API制限設定
    API_LIMITS: {
        MISSKEY_MAX: 100,                     // Misskey API最大取得件数
        MASTODON_MAX: 40,                     // Mastodon API最大取得件数
        RSS_MAX: 50,                          // RSS最大処理件数
        MULTIPLIER: 2,                        // 取得倍率（時間フィルタリング用）
        FALLBACK_MULTIPLIER: 3                // フォールバック取得倍率
    },
    
    // UI表示制限
    UI_LIMITS: {
        MAX_POSTS: 20,                        // 最大投稿数
        MAX_IMAGES_PER_POST: 6,               // 投稿あたり最大画像数
        MAX_IMAGES_DISPLAY: 4,                // 表示最大画像数
        MAX_RECENT_POSTS: 10,                 // 最新投稿表示数
        MAX_DEBUG_POSTS: 5,                   // デバッグ表示最大数
        MAX_DATE_GROUPS: 10                   // 日付グループ表示最大数
    },
    
    // 自動更新設定
    AUTO_REFRESH_INTERVAL: 30 * 60 * 1000,    // 30分自動更新
    
    // プロキシ設定
    PROXY: {
        FAILURE_THRESHOLD: 3,                 // プロキシ失敗閾値
        RECOVERY_TIME: 5 * 60 * 1000          // プロキシ復旧時間（5分）
    },
    
    // バックオフ設定
    BACKOFF: {
        BASE_DELAY: 1000,                     // 基本遅延（1秒）
        MAX_DELAY: 10000,                     // 最大遅延（10秒）
        MULTIPLIER: 2                         // 遅延倍率
    }
};

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
            case 'lastfm_static':
                return this.validateLastfmStaticConfig(source.config);
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
    
    /**
     * Last.fm Static設定の妥当性チェック
     */
    validateLastfmStaticConfig(config) {
        const required = ['jsonUrl'];
        const missing = required.filter(field => !config[field]);
        
        if (missing.length > 0) {
            console.error(`Last.fm Static設定の必須フィールドが不足: ${missing.join(', ')}`);
            return false;
        }
        
        // JSONファイルのパスチェック（相対パスまたはHTTP URL）
        if (!config.jsonUrl.startsWith('./') && 
            !config.jsonUrl.startsWith('../') && 
            !config.jsonUrl.startsWith('/') &&
            !config.jsonUrl.startsWith('http')) {
            console.error(`無効なLast.fm JSON URL: ${config.jsonUrl}`);
            return false;
        }
        
        return true;
    }
}

/**
 * グローバル設定管理
 */
class GlobalSettingsManager {
    constructor() {
        this.globalSettings = null;
        this.loadGlobalSettings();
    }
    
    loadGlobalSettings() {
        try {
            // dataSourceManagerが存在し、nullでないことを確認
            if (typeof dataSourceManager !== 'undefined' && 
                dataSourceManager !== null && 
                typeof dataSourceManager.getGlobalSettings === 'function') {
                this.globalSettings = dataSourceManager.getGlobalSettings();
                console.log('グローバル設定を読み込み:', this.globalSettings);
            } else {
                this.globalSettings = {};
                console.log('グローバル設定が見つからないため、デフォルト設定を使用');
            }
        } catch (error) {
            console.warn('グローバル設定の読み込みに失敗:', error);
            this.globalSettings = {};
        }
    }
    
    getGlobalSettings() {
        return this.globalSettings || {};
    }
    
    // グローバル設定とローカル設定をマージ（簡素化版）
    mergeSettings(localConfig) {
        const global = this.getGlobalSettings();
        
        // 設定の優先順位: ローカル > グローバル > デフォルト
        return {
            // 基本設定
            maxPosts: this.getConfigValue(localConfig.maxPosts, global.maxPosts, CONFIG.UI_LIMITS.MAX_POSTS),
            includeReplies: this.getConfigValue(localConfig.includeReplies, global.includeReplies, false),
            includeReblogs: this.getConfigValue(localConfig.includeReblogs, global.includeReblogs, false),
            maxImages: this.getConfigValue(localConfig.maxImages, global.maxImages, CONFIG.UI_LIMITS.MAX_IMAGES_PER_POST),
            
            // 時間フィルタリング設定
            timeBasedFetch: this.getBooleanConfigValue(localConfig.timeBasedFetch, global.timeBasedFetch, false),
            daysBack: this.getConfigValue(localConfig.daysBack, global.daysBack, 5),
            
            // プロキシ設定
            useProxy: this.getBooleanConfigValue(localConfig.useProxy, global.useProxy, true),
            
            // 自動更新設定
            autoRefreshInterval: this.getConfigValue(
                localConfig.autoRefreshInterval, 
                global.autoRefreshInterval, 
                CONFIG.AUTO_REFRESH_INTERVAL
            ),
            
            // 表示設定
            displayName: localConfig.displayName || global.displayName,
            sourceIcon: localConfig.sourceIcon || global.sourceIcon,
            sourceIconImage: localConfig.sourceIconImage || global.sourceIconImage,
            description: localConfig.description || global.description,
            
            // レート制限設定（アダプター固有）
            rateLimit: localConfig.rateLimit || global.rateLimit
        };
    }
    
    // 設定値の取得（優先順位付き）
    getConfigValue(localValue, globalValue, defaultValue) {
        if (localValue !== undefined && localValue !== null) return localValue;
        if (globalValue !== undefined && globalValue !== null) return globalValue;
        return defaultValue;
    }
    
    // ブール値設定の取得（優先順位付き）
    getBooleanConfigValue(localValue, globalValue, defaultValue) {
        if (localValue !== undefined && localValue !== null) return Boolean(localValue);
        if (globalValue !== undefined && globalValue !== null) return Boolean(globalValue);
        return Boolean(defaultValue);
    }
    
    // グローバル設定の更新
    updateGlobalSettings(newSettings) {
        // 設定値を検証してから更新
        const validatedSettings = this.validateSettings(newSettings);
        this.globalSettings = { ...this.globalSettings, ...validatedSettings };
        console.log('グローバル設定を更新:', this.globalSettings);
    }
    
    // 設定値の検証
    validateSettings(settings) {
        const validated = {};
        
        for (const [key, value] of Object.entries(settings)) {
            switch (key) {
                case 'maxPosts':
                    validated[key] = this.validatePositiveInteger(value, CONFIG.UI_LIMITS.MAX_POSTS, 1, 1000);
                    break;
                case 'daysBack':
                    validated[key] = this.validatePositiveInteger(value, 5, 1, 365);
                    break;
                case 'maxImages':
                    validated[key] = this.validatePositiveInteger(value, CONFIG.UI_LIMITS.MAX_IMAGES_PER_POST, 1, 20);
                    break;
                case 'timeBasedFetch':
                    validated[key] = Boolean(value);
                    break;
                case 'useProxy':
                    validated[key] = Boolean(value);
                    break;
                case 'includeReplies':
                case 'includeReblogs':
                    validated[key] = Boolean(value);
                    break;
                case 'autoRefreshInterval':
                    validated[key] = this.validatePositiveInteger(value, CONFIG.AUTO_REFRESH_INTERVAL, 60000, 3600000); // 1分〜1時間
                    break;
                case 'displayName':
                case 'sourceIcon':
                case 'sourceIconImage':
                case 'description':
                    validated[key] = typeof value === 'string' ? value : '';
                    break;
                case 'rateLimit':
                    validated[key] = this.validatePositiveInteger(value, 15000, 1000, 300000); // 1秒〜5分
                    break;
                default:
                    // 未知の設定項目はそのまま保持
                    validated[key] = value;
                    break;
            }
        }
        
        return validated;
    }
    
    // 正の整数の検証
    validatePositiveInteger(value, defaultValue, min = 1, max = Infinity) {
        const num = parseInt(value);
        if (isNaN(num) || num < min || num > max) {
            console.warn(`設定値 ${value} が無効です。デフォルト値 ${defaultValue} を使用します。`);
            return defaultValue;
        }
        return num;
    }
    
    // 設定プリセットの取得
    getConfigPresets() {
        return {
            // 高速モード（少ない投稿数、短い間隔）
            fast: {
                maxPosts: 10,
                daysBack: 3,
                autoRefreshInterval: 5 * 60 * 1000, // 5分
                timeBasedFetch: true,
                useProxy: true
            },
            
            // 標準モード（バランスの取れた設定）
            standard: {
                maxPosts: CONFIG.UI_LIMITS.MAX_POSTS,
                daysBack: 5,
                autoRefreshInterval: CONFIG.AUTO_REFRESH_INTERVAL,
                timeBasedFetch: true,
                useProxy: true
            },
            
            // 詳細モード（多くの投稿数、長い間隔）
            detailed: {
                maxPosts: 50,
                daysBack: 7,
                autoRefreshInterval: 60 * 60 * 1000, // 1時間
                timeBasedFetch: true,
                useProxy: true
            },
            
            // オフラインモード（プロキシなし、時間フィルタリングなし）
            offline: {
                maxPosts: 20,
                daysBack: 30,
                autoRefreshInterval: 0, // 自動更新なし
                timeBasedFetch: false,
                useProxy: false
            }
        };
    }
    
    // プリセット設定の適用
    applyPreset(presetName) {
        const presets = this.getConfigPresets();
        const preset = presets[presetName];
        
        if (!preset) {
            console.warn(`プリセット "${presetName}" が見つかりません。`);
            return false;
        }
        
        console.log(`プリセット "${presetName}" を適用します。`);
        this.updateGlobalSettings(preset);
        return true;
    }
    
    // 現在の設定をプリセットに近いものにマッチング
    findMatchingPreset() {
        const presets = this.getConfigPresets();
        const current = this.getGlobalSettings();
        
        for (const [name, preset] of Object.entries(presets)) {
            let match = true;
            for (const [key, value] of Object.entries(preset)) {
                if (current[key] !== value) {
                    match = false;
                    break;
                }
            }
            if (match) return name;
        }
        
        return 'custom'; // カスタム設定
    }
    
    // 設定項目のドキュメント取得
    getConfigDocumentation() {
        return {
            maxPosts: {
                description: '一度に取得する最大投稿数',
                type: 'integer',
                range: '1-1000',
                default: CONFIG.UI_LIMITS.MAX_POSTS,
                example: 20
            },
            daysBack: {
                description: '何日前までの投稿を取得するか',
                type: 'integer',
                range: '1-365',
                default: 5,
                example: 7
            },
            maxImages: {
                description: '1投稿あたりの最大画像数',
                type: 'integer',
                range: '1-20',
                default: CONFIG.UI_LIMITS.MAX_IMAGES_PER_POST,
                example: 6
            },
            timeBasedFetch: {
                description: '時間ベースの投稿フィルタリングを有効にするか',
                type: 'boolean',
                default: false,
                example: true
            },
            useProxy: {
                description: 'プロキシを使用してAPIにアクセスするか',
                type: 'boolean',
                default: true,
                example: true
            },
            includeReplies: {
                description: '返信を含めるか',
                type: 'boolean',
                default: false,
                example: false
            },
            includeReblogs: {
                description: 'リノート/ブーストを含めるか',
                type: 'boolean',
                default: false,
                example: false
            },
            autoRefreshInterval: {
                description: '自動更新の間隔（ミリ秒）',
                type: 'integer',
                range: '60000-3600000',
                default: CONFIG.AUTO_REFRESH_INTERVAL,
                example: 1800000
            },
            displayName: {
                description: '表示名',
                type: 'string',
                default: '',
                example: 'My Account'
            },
            sourceIcon: {
                description: 'ソースアイコンのテキスト',
                type: 'string',
                default: '',
                example: '[API]'
            },
            sourceIconImage: {
                description: 'ソースアイコンの画像URL',
                type: 'string',
                default: '',
                example: './icon.png'
            },
            description: {
                description: '説明文',
                type: 'string',
                default: '',
                example: 'My social media account'
            },
            rateLimit: {
                description: 'API取得の間隔（ミリ秒）',
                type: 'integer',
                range: '1000-300000',
                default: 15000,
                example: 30000
            }
        };
    }
    
    // 設定のヘルプ情報を表示
    showConfigHelp() {
        const docs = this.getConfigDocumentation();
        console.log('=== 設定項目の説明 ===');
        
        for (const [key, info] of Object.entries(docs)) {
            console.log(`${key}:`);
            console.log(`  説明: ${info.description}`);
            console.log(`  型: ${info.type}`);
            if (info.range) console.log(`  範囲: ${info.range}`);
            console.log(`  デフォルト: ${info.default}`);
            if (info.example !== undefined) console.log(`  例: ${info.example}`);
            console.log('');
        }
        
        console.log('=== プリセット設定 ===');
        const presets = this.getConfigPresets();
        for (const [name, preset] of Object.entries(presets)) {
            console.log(`${name}: ${JSON.stringify(preset, null, 2)}`);
        }
    }
}

// グローバルインスタンス
let dataSourceManager = null;
let globalSettingsManager = null;

/**
 * データソース管理の初期化
 */
async function initializeDataSourceManager() {
    dataSourceManager = new DataSourceManager();
    await dataSourceManager.loadConfig();
    return dataSourceManager;
}

/**
 * グローバル設定管理の初期化
 */
function initializeGlobalSettingsManager() {
    globalSettingsManager = new GlobalSettingsManager();
    return globalSettingsManager;
}

// ========================================
// 設定ローダー関数
// ========================================

/**
 * 設定値を取得する関数（型安全）
 */
function getConfigValue(key, defaultValue = null) {
    if (!CONFIG || typeof CONFIG !== 'object') {
        console.warn('CONFIGが利用できません。デフォルト値を使用します。');
        return defaultValue;
    }
    
    const keys = key.split('.');
    let value = CONFIG;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return defaultValue;
        }
    }
    
    return value !== undefined ? value : defaultValue;
}

/**
 * 設定値を取得（数値型）
 */
function getConfigNumber(key, defaultValue = 0) {
    const value = getConfigValue(key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
}

/**
 * 設定値を取得（文字列型）
 */
function getConfigString(key, defaultValue = '') {
    const value = getConfigValue(key, defaultValue);
    return String(value);
}

/**
 * 設定値を取得（ブール型）
 */
function getConfigBoolean(key, defaultValue = false) {
    const value = getConfigValue(key, defaultValue);
    return Boolean(value);
}

/**
 * 設定値を取得（配列型）
 */
function getConfigArray(key, defaultValue = []) {
    const value = getConfigValue(key, defaultValue);
    return Array.isArray(value) ? value : defaultValue;
}

/**
 * 設定値を取得（オブジェクト型）
 */
function getConfigObject(key, defaultValue = {}) {
    const value = getConfigValue(key, defaultValue);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : defaultValue;
}

/**
 * 設定値の存在チェック
 */
function hasConfigValue(key) {
    if (!CONFIG || typeof CONFIG !== 'object') {
        return false;
    }
    
    const keys = key.split('.');
    let value = CONFIG;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return false;
        }
    }
    
    return value !== undefined;
}

/**
 * 設定値を更新（実行時）
 */
function updateConfigValue(key, newValue) {
    if (!CONFIG || typeof CONFIG !== 'object') {
        console.warn('CONFIGが利用できません。');
        return false;
    }
    
    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = CONFIG;
    
    for (const k of keys) {
        if (!target[k] || typeof target[k] !== 'object') {
            target[k] = {};
        }
        target = target[k];
    }
    
    target[lastKey] = newValue;
    console.log(`設定値を更新: ${key} = ${newValue}`);
    return true;
}

/**
 * 設定の完全なコピーを取得
 */
function getConfigCopy() {
    if (!CONFIG || typeof CONFIG !== 'object') {
        return {};
    }
    
    return JSON.parse(JSON.stringify(CONFIG));
}

/**
 * 設定の検証
 */
function validateConfig() {
    const errors = [];
    
    // 必須設定のチェック
    const requiredSettings = [
        'CACHE_DURATION',
        'REQUEST_TIMEOUT',
        'RATE_LIMITS.MISSKEY',
        'RATE_LIMITS.MASTODON',
        'RATE_LIMITS.RSS',
        'UI_LIMITS.MAX_POSTS',
        'UI_LIMITS.MAX_IMAGES_PER_POST'
    ];
    
    for (const setting of requiredSettings) {
        if (!hasConfigValue(setting)) {
            errors.push(`必須設定が不足: ${setting}`);
        }
    }
    
    // 数値設定の範囲チェック
    const numericSettings = [
        { key: 'CACHE_DURATION', min: 60000, max: 3600000 }, // 1分〜1時間
        { key: 'REQUEST_TIMEOUT', min: 1000, max: 30000 }, // 1秒〜30秒
        { key: 'UI_LIMITS.MAX_POSTS', min: 1, max: 1000 }, // 1〜1000件
        { key: 'UI_LIMITS.MAX_IMAGES_PER_POST', min: 1, max: 20 } // 1〜20枚
    ];
    
    for (const setting of numericSettings) {
        const value = getConfigNumber(setting.key);
        if (value < setting.min || value > setting.max) {
            errors.push(`設定値が範囲外: ${setting.key} = ${value} (範囲: ${setting.min}-${setting.max})`);
        }
    }
    
    if (errors.length > 0) {
        console.error('設定検証エラー:', errors);
        return false;
    }
    
    console.log('設定検証: OK');
    return true;
}

// ========================================
// グローバル関数（外部API）
// ========================================

/**
 * グローバル設定を更新
 */
function updateGlobalSettings(newSettings) {
    if (globalSettingsManager) {
        globalSettingsManager.updateGlobalSettings(newSettings);
    } else {
        console.warn('GlobalSettingsManagerが初期化されていません');
    }
}

/**
 * グローバル設定を取得
 */
function getGlobalSettings() {
    return globalSettingsManager ? globalSettingsManager.getGlobalSettings() : {};
}

/**
 * 設定プリセットを適用
 */
function applyConfigPreset(presetName) {
    return globalSettingsManager ? globalSettingsManager.applyPreset(presetName) : false;
}

/**
 * 設定のヘルプを表示
 */
function showConfigHelp() {
    if (globalSettingsManager) {
        globalSettingsManager.showConfigHelp();
    } else {
        console.warn('GlobalSettingsManagerが初期化されていません');
    }
}

/**
 * 設定を検証
 */
function validateConfig(settings) {
    return globalSettingsManager ? globalSettingsManager.validateSettings(settings) : settings;
}

/**
 * 利用可能なプリセットを取得
 */
function getAvailablePresets() {
    return globalSettingsManager ? Object.keys(globalSettingsManager.getConfigPresets()) : [];
}

/**
 * 現在の設定にマッチするプリセットを取得
 */
function getMatchingPreset() {
    return globalSettingsManager ? globalSettingsManager.findMatchingPreset() : 'custom';
}

// グローバル関数を公開（ブラウザ環境用）
if (typeof window !== 'undefined') {
    window.getConfigValue = getConfigValue;
    window.getConfigNumber = getConfigNumber;
    window.getConfigString = getConfigString;
    window.getConfigBoolean = getConfigBoolean;
    window.getConfigArray = getConfigArray;
    window.getConfigObject = getConfigObject;
    window.hasConfigValue = hasConfigValue;
    window.updateConfigValue = updateConfigValue;
    window.getConfigCopy = getConfigCopy;
    window.validateConfig = validateConfig;
    window.initializeDataSourceManager = initializeDataSourceManager;
    window.initializeGlobalSettingsManager = initializeGlobalSettingsManager;
    window.updateGlobalSettings = updateGlobalSettings;
    window.getGlobalSettings = getGlobalSettings;
    window.applyConfigPreset = applyConfigPreset;
    window.showConfigHelp = showConfigHelp;
    window.getAvailablePresets = getAvailablePresets;
    window.getMatchingPreset = getMatchingPreset;
    window.globalSettingsManager = globalSettingsManager;
}

// エクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        DataSourceManager, 
        GlobalSettingsManager,
        CONFIG,
        initializeDataSourceManager,
        initializeGlobalSettingsManager,
        updateGlobalSettings,
        getGlobalSettings,
        applyConfigPreset,
        showConfigHelp,
        validateConfig,
        getAvailablePresets,
        getMatchingPreset,
        // 設定ローダー関数
        getConfigValue,
        getConfigNumber,
        getConfigString,
        getConfigBoolean,
        getConfigArray,
        getConfigObject,
        hasConfigValue,
        updateConfigValue,
        getConfigCopy,
        validateConfig
    };
}
