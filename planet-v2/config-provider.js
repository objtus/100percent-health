/**
 * Planet Aggregator v2 - 設定プロバイダーパターン
 * 統一された設定管理システム
 */

/**
 * 設定プロバイダーの基底クラス
 */
class ConfigProvider {
    constructor(priority = 0) {
        this.priority = priority;
    }
    
    /**
     * 設定値を取得
     * @param {string} key - 設定キー
     * @param {*} defaultValue - デフォルト値
     * @returns {*} 設定値
     */
    get(key, defaultValue) {
        throw new Error('get method must be implemented by subclass');
    }
    
    /**
     * 設定値が存在するかチェック
     * @param {string} key - 設定キー
     * @returns {boolean} 存在するかどうか
     */
    has(key) {
        throw new Error('has method must be implemented by subclass');
    }
    
    /**
     * 設定値を更新
     * @param {string} key - 設定キー
     * @param {*} value - 新しい値
     */
    set(key, value) {
        throw new Error('set method must be implemented by subclass');
    }
}

/**
 * デフォルト設定プロバイダー
 */
class DefaultConfigProvider extends ConfigProvider {
    constructor(config = {}) {
        super(1000); // 最低優先度
        this.config = config;
    }
    
    get(key, defaultValue) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value !== undefined ? value : defaultValue;
    }
    
    has(key) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return false;
            }
        }
        
        return value !== undefined;
    }
    
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        let target = this.config;
        
        for (const k of keys) {
            if (!target[k] || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        
        target[lastKey] = value;
    }
}

/**
 * グローバル設定プロバイダー
 */
class GlobalConfigProvider extends ConfigProvider {
    constructor() {
        super(500); // 中優先度
        this.globalSettings = null;
    }
    
    setGlobalSettings(settings) {
        this.globalSettings = settings;
    }
    
    get(key, defaultValue) {
        if (!this.globalSettings) {
            return defaultValue;
        }
        
        const keys = key.split('.');
        let value = this.globalSettings;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value !== undefined ? value : defaultValue;
    }
    
    has(key) {
        if (!this.globalSettings) {
            return false;
        }
        
        const keys = key.split('.');
        let value = this.globalSettings;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return false;
            }
        }
        
        return value !== undefined;
    }
    
    set(key, value) {
        if (!this.globalSettings) {
            this.globalSettings = {};
        }
        
        const keys = key.split('.');
        const lastKey = keys.pop();
        let target = this.globalSettings;
        
        for (const k of keys) {
            if (!target[k] || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        
        target[lastKey] = value;
    }
}

/**
 * ローカル設定プロバイダー（localStorage）
 */
class LocalConfigProvider extends ConfigProvider {
    constructor(storageKey = 'planet-v2-local-config') {
        super(300); // 高優先度
        this.storageKey = storageKey;
        this.localConfig = this.loadFromStorage();
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('ローカル設定の読み込みに失敗:', error);
            return {};
        }
    }
    
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.localConfig));
        } catch (error) {
            console.error('ローカル設定の保存に失敗:', error);
        }
    }
    
    get(key, defaultValue) {
        const keys = key.split('.');
        let value = this.localConfig;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value !== undefined ? value : defaultValue;
    }
    
    has(key) {
        const keys = key.split('.');
        let value = this.localConfig;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return false;
            }
        }
        
        return value !== undefined;
    }
    
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        let target = this.localConfig;
        
        for (const k of keys) {
            if (!target[k] || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        
        target[lastKey] = value;
        this.saveToStorage();
    }
}

/**
 * 環境設定プロバイダー（URL パラメータ、環境変数など）
 */
class EnvironmentConfigProvider extends ConfigProvider {
    constructor() {
        super(200); // 最高優先度
        this.envConfig = this.loadFromEnvironment();
    }
    
    loadFromEnvironment() {
        const config = {};
        
        // URL パラメータから設定を読み込み
        if (typeof window !== 'undefined' && window.location) {
            const urlParams = new URLSearchParams(window.location.search);
            for (const [key, value] of urlParams) {
                if (key.startsWith('config.')) {
                    const configKey = key.replace('config.', '');
                    config[configKey] = this.parseValue(value);
                }
            }
        }
        
        // 環境変数から設定を読み込み（Node.js環境）
        if (typeof process !== 'undefined' && process.env) {
            for (const [key, value] of Object.entries(process.env)) {
                if (key.startsWith('PLANET_CONFIG_')) {
                    const configKey = key.replace('PLANET_CONFIG_', '').toLowerCase().replace(/_/g, '.');
                    config[configKey] = this.parseValue(value);
                }
            }
        }
        
        return config;
    }
    
    parseValue(value) {
        // 数値の解析
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        if (/^\d+\.\d+$/.test(value)) {
            return parseFloat(value);
        }
        
        // ブール値の解析
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // 配列の解析
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        
        // オブジェクトの解析
        if (value.startsWith('{') && value.endsWith('}')) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        
        return value;
    }
    
    get(key, defaultValue) {
        const keys = key.split('.');
        let value = this.envConfig;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value !== undefined ? value : defaultValue;
    }
    
    has(key) {
        const keys = key.split('.');
        let value = this.envConfig;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return false;
            }
        }
        
        return value !== undefined;
    }
    
    set(key, value) {
        // 環境設定は読み取り専用
        console.warn('環境設定は読み取り専用です');
    }
}

/**
 * 統合設定マネージャー
 */
class ConfigManager {
    constructor() {
        this.providers = [];
        this.defaultProvider = null;
        this.cache = new Map();
        this.cacheTimeout = 5000; // 5秒キャッシュ
    }
    
    /**
     * 設定プロバイダーを追加
     * @param {ConfigProvider} provider - 設定プロバイダー
     */
    addProvider(provider) {
        this.providers.push(provider);
        // 優先度順にソート（数値が小さいほど高優先度）
        this.providers.sort((a, b) => a.priority - b.priority);
        this.clearCache();
    }
    
    /**
     * デフォルトプロバイダーを設定
     * @param {ConfigProvider} provider - デフォルトプロバイダー
     */
    setDefaultProvider(provider) {
        this.defaultProvider = provider;
    }
    
    /**
     * 設定値を取得
     * @param {string} key - 設定キー
     * @param {*} defaultValue - デフォルト値
     * @returns {*} 設定値
     */
    get(key, defaultValue) {
        // キャッシュをチェック
        const cacheKey = `${key}:${defaultValue}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.value;
            }
            this.cache.delete(cacheKey);
        }
        
        // プロバイダーから設定値を取得（優先度順）
        for (const provider of this.providers) {
            if (provider.has(key)) {
                const value = provider.get(key, defaultValue);
                if (value !== defaultValue) {
                    // キャッシュに保存
                    this.cache.set(cacheKey, {
                        value,
                        timestamp: Date.now()
                    });
                    return value;
                }
            }
        }
        
        // デフォルトプロバイダーを使用
        if (this.defaultProvider) {
            const value = this.defaultProvider.get(key, defaultValue);
            this.cache.set(cacheKey, {
                value,
                timestamp: Date.now()
            });
            return value;
        }
        
        return defaultValue;
    }
    
    /**
     * 設定値が存在するかチェック
     * @param {string} key - 設定キー
     * @returns {boolean} 存在するかどうか
     */
    has(key) {
        for (const provider of this.providers) {
            if (provider.has(key)) {
                return true;
            }
        }
        
        if (this.defaultProvider) {
            return this.defaultProvider.has(key);
        }
        
        return false;
    }
    
    /**
     * 設定値を設定
     * @param {string} key - 設定キー
     * @param {*} value - 設定値
     * @param {number} providerIndex - プロバイダーインデックス（省略時は最初の書き込み可能プロバイダー）
     */
    set(key, value, providerIndex = 0) {
        // 書き込み可能なプロバイダーを探す
        let targetProvider = null;
        
        if (providerIndex < this.providers.length) {
            const provider = this.providers[providerIndex];
            if (provider.set) {
                targetProvider = provider;
            }
        }
        
        if (!targetProvider) {
            // 最初の書き込み可能プロバイダーを探す
            for (const provider of this.providers) {
                if (provider.set) {
                    targetProvider = provider;
                    break;
                }
            }
        }
        
        if (targetProvider) {
            targetProvider.set(key, value);
            this.clearCache();
            return true;
        }
        
        console.warn('書き込み可能な設定プロバイダーが見つかりません');
        return false;
    }
    
    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * 型安全な設定値取得
     */
    getNumber(key, defaultValue = 0) {
        const value = this.get(key, defaultValue);
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    }
    
    getString(key, defaultValue = '') {
        const value = this.get(key, defaultValue);
        return String(value);
    }
    
    getBoolean(key, defaultValue = false) {
        const value = this.get(key, defaultValue);
        return Boolean(value);
    }
    
    getArray(key, defaultValue = []) {
        const value = this.get(key, defaultValue);
        return Array.isArray(value) ? value : defaultValue;
    }
    
    getObject(key, defaultValue = {}) {
        const value = this.get(key, defaultValue);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : defaultValue;
    }
    
    /**
     * 設定の検証
     */
    validate(key, value, validator) {
        if (typeof validator === 'function') {
            return validator(value);
        }
        
        if (typeof validator === 'object') {
            const { type, min, max, pattern, options } = validator;
            
            switch (type) {
                case 'number':
                    const num = Number(value);
                    if (isNaN(num)) return false;
                    if (min !== undefined && num < min) return false;
                    if (max !== undefined && num > max) return false;
                    return true;
                    
                case 'string':
                    if (typeof value !== 'string') return false;
                    if (pattern && !pattern.test(value)) return false;
                    return true;
                    
                case 'boolean':
                    return typeof value === 'boolean';
                    
                case 'array':
                    if (!Array.isArray(value)) return false;
                    if (min !== undefined && value.length < min) return false;
                    if (max !== undefined && value.length > max) return false;
                    return true;
                    
                case 'enum':
                    return options && options.includes(value);
                    
                default:
                    return true;
            }
        }
        
        return true;
    }
    
    /**
     * 設定の一覧を取得
     */
    getAllKeys() {
        const keys = new Set();
        
        for (const provider of this.providers) {
            if (provider.getAllKeys) {
                provider.getAllKeys().forEach(key => keys.add(key));
            }
        }
        
        if (this.defaultProvider && this.defaultProvider.getAllKeys) {
            this.defaultProvider.getAllKeys().forEach(key => keys.add(key));
        }
        
        return Array.from(keys);
    }
    
    /**
     * 設定の詳細情報を取得
     */
    getConfigInfo(key) {
        const info = {
            key,
            value: this.get(key),
            hasValue: this.has(key),
            providers: []
        };
        
        for (let i = 0; i < this.providers.length; i++) {
            const provider = this.providers[i];
            if (provider.has(key)) {
                info.providers.push({
                    index: i,
                    priority: provider.priority,
                    value: provider.get(key),
                    type: provider.constructor.name
                });
            }
        }
        
        return info;
    }
}

// グローバル設定マネージャーインスタンス
const configManager = new ConfigManager();

// 設定検証器を統合（config-validator.jsが読み込まれている場合）
if (typeof window !== 'undefined' && window.configValidator) {
    // 設定値の検証を有効化
    const originalGet = configManager.get.bind(configManager);
    configManager.get = function(key, defaultValue) {
        const value = originalGet(key, defaultValue);
        
        // 検証可能な設定値のみ検証
        if (window.configValidator.isValid(key, value)) {
            return value;
        } else {
            console.warn(`設定値 "${key}" が無効です。デフォルト値を使用します。`, value);
            return defaultValue;
        }
    };
}

// デフォルト設定を追加
const defaultConfig = {
    // キャッシュ設定
    CACHE_DURATION: 30 * 60 * 1000,
    USER_CACHE_DURATION: 24 * 60 * 60 * 1000,
    MAX_CACHE_SIZE: 100,
    MAX_CACHED_POSTS: 1000,
    
    // リクエスト設定
    REQUEST_TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    
    // レート制限設定
    RATE_LIMITS: {
        MISSKEY: 30 * 1000,
        MASTODON: 20 * 1000,
        RSS: 60 * 1000
    },
    
    // API制限設定
    API_LIMITS: {
        MISSKEY_MAX: 100,
        MASTODON_MAX: 40,
        RSS_MAX: 50,
        MULTIPLIER: 2,
        FALLBACK_MULTIPLIER: 3
    },
    
    // UI表示制限
    UI_LIMITS: {
        MAX_POSTS: 20,
        MAX_IMAGES_PER_POST: 6,
        MAX_IMAGES_DISPLAY: 4,
        MAX_RECENT_POSTS: 10,
        MAX_DEBUG_POSTS: 5,
        MAX_DATE_GROUPS: 10
    },
    
    // 自動更新設定
    AUTO_REFRESH_INTERVAL: 30 * 60 * 1000,
    
    // プロキシ設定
    PROXY: {
        FAILURE_THRESHOLD: 3,
        RECOVERY_TIME: 5 * 60 * 1000
    },
    
    // バックオフ設定
    BACKOFF: {
        BASE_DELAY: 1000,
        MAX_DELAY: 10000,
        MULTIPLIER: 2
    }
};

// プロバイダーを追加
configManager.addProvider(new EnvironmentConfigProvider());
configManager.addProvider(new LocalConfigProvider());
configManager.addProvider(new GlobalConfigProvider());
configManager.setDefaultProvider(new DefaultConfigProvider(defaultConfig));

// グローバル関数を提供（後方互換性のため）
function getConfigNumberLocal(key, defaultValue = 0) {
    return configManager.getNumber(key, defaultValue);
}

function getConfigStringLocal(key, defaultValue = '') {
    return configManager.getString(key, defaultValue);
}

function getConfigBooleanLocal(key, defaultValue = false) {
    return configManager.getBoolean(key, defaultValue);
}

function getConfigArrayLocal(key, defaultValue = []) {
    return configManager.getArray(key, defaultValue);
}

function getConfigObjectLocal(key, defaultValue = {}) {
    return configManager.getObject(key, defaultValue);
}

// グローバル関数を公開
if (typeof window !== 'undefined') {
    window.configManager = configManager;
    window.getConfigNumberLocal = getConfigNumberLocal;
    window.getConfigStringLocal = getConfigStringLocal;
    window.getConfigBooleanLocal = getConfigBooleanLocal;
    window.getConfigArrayLocal = getConfigArrayLocal;
    window.getConfigObjectLocal = getConfigObjectLocal;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConfigManager,
        ConfigProvider,
        DefaultConfigProvider,
        GlobalConfigProvider,
        LocalConfigProvider,
        EnvironmentConfigProvider,
        configManager,
        getConfigNumberLocal,
        getConfigStringLocal,
        getConfigBooleanLocal,
        getConfigArrayLocal,
        getConfigObjectLocal
    };
}
