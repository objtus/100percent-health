/**
 * Planet Aggregator v2 - 設定検証システム
 * 設定値の型安全性と妥当性を保証
 */

/**
 * 設定検証ルールの定義
 */
const CONFIG_VALIDATION_RULES = {
    // 数値設定の検証ルール
    'CACHE_DURATION': {
        type: 'number',
        min: 60000,        // 1分
        max: 3600000,      // 1時間
        default: 30 * 60 * 1000,
        description: 'キャッシュ期間（ミリ秒）'
    },
    'USER_CACHE_DURATION': {
        type: 'number',
        min: 300000,       // 5分
        max: 7 * 24 * 60 * 60 * 1000, // 7日
        default: 24 * 60 * 60 * 1000,
        description: 'ユーザー情報キャッシュ期間（ミリ秒）'
    },
    'MAX_CACHE_SIZE': {
        type: 'number',
        min: 10,
        max: 1000,
        default: 100,
        description: '最大キャッシュサイズ'
    },
    'REQUEST_TIMEOUT': {
        type: 'number',
        min: 1000,         // 1秒
        max: 30000,        // 30秒
        default: 10000,
        description: 'リクエストタイムアウト（ミリ秒）'
    },
    'RETRY_ATTEMPTS': {
        type: 'number',
        min: 0,
        max: 10,
        default: 3,
        description: 'リトライ回数'
    },
    
    // レート制限設定
    'RATE_LIMITS.MISSKEY': {
        type: 'number',
        min: 1000,         // 1秒
        max: 300000,       // 5分
        default: 30000,
        description: 'Misskey APIレート制限（ミリ秒）'
    },
    'RATE_LIMITS.MASTODON': {
        type: 'number',
        min: 1000,
        max: 300000,
        default: 20000,
        description: 'Mastodon APIレート制限（ミリ秒）'
    },
    'RATE_LIMITS.RSS': {
        type: 'number',
        min: 1000,
        max: 600000,       // 10分
        default: 60000,
        description: 'RSS APIレート制限（ミリ秒）'
    },
    
    // API制限設定
    'API_LIMITS.MISSKEY_MAX': {
        type: 'number',
        min: 1,
        max: 100,
        default: 100,
        description: 'Misskey API最大取得件数'
    },
    'API_LIMITS.MASTODON_MAX': {
        type: 'number',
        min: 1,
        max: 40,
        default: 40,
        description: 'Mastodon API最大取得件数'
    },
    'API_LIMITS.RSS_MAX': {
        type: 'number',
        min: 1,
        max: 100,
        default: 50,
        description: 'RSS最大処理件数'
    },
    'API_LIMITS.MULTIPLIER': {
        type: 'number',
        min: 1,
        max: 10,
        default: 2,
        description: '取得倍率'
    },
    
    // UI表示制限
    'UI_LIMITS.MAX_POSTS': {
        type: 'number',
        min: 1,
        max: 1000,
        default: 20,
        description: '最大投稿表示数'
    },
    'UI_LIMITS.MAX_IMAGES_PER_POST': {
        type: 'number',
        min: 1,
        max: 20,
        default: 6,
        description: '投稿あたり最大画像数'
    },
    'UI_LIMITS.MAX_IMAGES_DISPLAY': {
        type: 'number',
        min: 1,
        max: 10,
        default: 4,
        description: '表示最大画像数'
    },
    'UI_LIMITS.MAX_RECENT_POSTS': {
        type: 'number',
        min: 1,
        max: 100,
        default: 10,
        description: '最新投稿表示数'
    },
    'UI_LIMITS.MAX_DEBUG_POSTS': {
        type: 'number',
        min: 0,
        max: 50,
        default: 5,
        description: 'デバッグ表示最大数'
    },
    'UI_LIMITS.MAX_DATE_GROUPS': {
        type: 'number',
        min: 1,
        max: 50,
        default: 10,
        description: '日付グループ表示最大数'
    },
    
    // 自動更新設定
    'AUTO_REFRESH_INTERVAL': {
        type: 'number',
        min: 0,            // 0は無効
        max: 24 * 60 * 60 * 1000, // 24時間
        default: 30 * 60 * 1000,
        description: '自動更新間隔（ミリ秒）'
    },
    
    // プロキシ設定
    'PROXY.FAILURE_THRESHOLD': {
        type: 'number',
        min: 1,
        max: 10,
        default: 3,
        description: 'プロキシ失敗閾値'
    },
    'PROXY.RECOVERY_TIME': {
        type: 'number',
        min: 60000,        // 1分
        max: 60 * 60 * 1000, // 1時間
        default: 5 * 60 * 1000,
        description: 'プロキシ復旧時間（ミリ秒）'
    },
    
    // バックオフ設定
    'BACKOFF.BASE_DELAY': {
        type: 'number',
        min: 100,
        max: 10000,
        default: 1000,
        description: '基本遅延（ミリ秒）'
    },
    'BACKOFF.MAX_DELAY': {
        type: 'number',
        min: 1000,
        max: 60000,
        default: 10000,
        description: '最大遅延（ミリ秒）'
    },
    'BACKOFF.MULTIPLIER': {
        type: 'number',
        min: 1.1,
        max: 5.0,
        default: 2.0,
        description: '遅延倍率'
    },
    
    // 文字列設定
    'displayName': {
        type: 'string',
        maxLength: 100,
        default: '',
        description: '表示名'
    },
    'sourceIcon': {
        type: 'string',
        maxLength: 50,
        default: '',
        description: 'ソースアイコン'
    },
    'sourceIconImage': {
        type: 'string',
        pattern: /^(https?:\/\/|\/|\.\/|\.\.\/).*\.(png|jpg|jpeg|gif|webp|svg)$/i,
        default: '',
        description: 'ソースアイコン画像URL'
    },
    'description': {
        type: 'string',
        maxLength: 500,
        default: '',
        description: '説明文'
    },
    
    // ブール設定
    'timeBasedFetch': {
        type: 'boolean',
        default: false,
        description: '時間ベース取得の有効/無効'
    },
    'useProxy': {
        type: 'boolean',
        default: true,
        description: 'プロキシの使用'
    },
    'includeReplies': {
        type: 'boolean',
        default: false,
        description: '返信を含めるか'
    },
    'includeReblogs': {
        type: 'boolean',
        default: false,
        description: 'リノート/ブーストを含めるか'
    }
};

/**
 * 設定検証エラークラス
 */
class ConfigValidationError extends Error {
    constructor(key, value, rule, message) {
        super(message);
        this.name = 'ConfigValidationError';
        this.key = key;
        this.value = value;
        this.rule = rule;
    }
}

/**
 * 設定検証器クラス
 */
class ConfigValidator {
    constructor() {
        this.rules = CONFIG_VALIDATION_RULES;
        this.errors = [];
        this.warnings = [];
    }
    
    /**
     * 設定値を検証
     * @param {string} key - 設定キー
     * @param {*} value - 設定値
     * @param {boolean} strict - 厳密モード（デフォルト: false）
     * @returns {*} 検証済み設定値
     */
    validate(key, value, strict = false) {
        const rule = this.rules[key];
        
        if (!rule) {
            if (strict) {
                this.warnings.push(`未知の設定キー: ${key}`);
            }
            return value;
        }
        
        try {
            return this.validateValue(key, value, rule, strict);
        } catch (error) {
            this.errors.push(error);
            if (strict) {
                throw error;
            }
            return rule.default;
        }
    }
    
    /**
     * 設定値を検証（内部メソッド）
     * @param {string} key - 設定キー
     * @param {*} value - 設定値
     * @param {Object} rule - 検証ルール
     * @param {boolean} strict - 厳密モード
     * @returns {*} 検証済み設定値
     */
    validateValue(key, value, rule, strict) {
        const { type, min, max, pattern, maxLength, default: defaultValue } = rule;
        
        // 型変換
        let convertedValue = this.convertType(value, type);
        
        // 型チェック
        if (!this.checkType(convertedValue, type)) {
            throw new ConfigValidationError(
                key, 
                value, 
                rule, 
                `設定値 "${key}" の型が不正です。期待: ${type}, 実際: ${typeof convertedValue}`
            );
        }
        
        // 数値の範囲チェック
        if (type === 'number') {
            if (min !== undefined && convertedValue < min) {
                throw new ConfigValidationError(
                    key, 
                    convertedValue, 
                    rule, 
                    `設定値 "${key}" が最小値 ${min} を下回っています。実際: ${convertedValue}`
                );
            }
            if (max !== undefined && convertedValue > max) {
                throw new ConfigValidationError(
                    key, 
                    convertedValue, 
                    rule, 
                    `設定値 "${key}" が最大値 ${max} を上回っています。実際: ${convertedValue}`
                );
            }
        }
        
        // 文字列の長さチェック
        if (type === 'string') {
            if (maxLength !== undefined && convertedValue.length > maxLength) {
                if (strict) {
                    throw new ConfigValidationError(
                        key, 
                        convertedValue, 
                        rule, 
                        `設定値 "${key}" が最大長 ${maxLength} を超えています。実際: ${convertedValue.length}`
                    );
                } else {
                    convertedValue = convertedValue.substring(0, maxLength);
                    this.warnings.push(`設定値 "${key}" を最大長 ${maxLength} に切り詰めました`);
                }
            }
            
            // パターンマッチング
            if (pattern && !pattern.test(convertedValue)) {
                throw new ConfigValidationError(
                    key, 
                    convertedValue, 
                    rule, 
                    `設定値 "${key}" がパターンに一致しません。実際: ${convertedValue}`
                );
            }
        }
        
        return convertedValue;
    }
    
    /**
     * 型変換
     * @param {*} value - 変換前の値
     * @param {string} type - 期待する型
     * @returns {*} 変換後の値
     */
    convertType(value, type) {
        switch (type) {
            case 'number':
                const num = Number(value);
                return isNaN(num) ? value : num;
                
            case 'string':
                return String(value);
                
            case 'boolean':
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') {
                    const lower = value.toLowerCase();
                    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') return true;
                    if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') return false;
                }
                return Boolean(value);
                
            case 'array':
                return Array.isArray(value) ? value : [value];
                
            case 'object':
                return value && typeof value === 'object' ? value : {};
                
            default:
                return value;
        }
    }
    
    /**
     * 型チェック
     * @param {*} value - チェックする値
     * @param {string} type - 期待する型
     * @returns {boolean} 型が正しいかどうか
     */
    checkType(value, type) {
        switch (type) {
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'string':
                return typeof value === 'string';
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return value && typeof value === 'object' && !Array.isArray(value);
            default:
                return true;
        }
    }
    
    /**
     * 設定オブジェクト全体を検証
     * @param {Object} config - 設定オブジェクト
     * @param {boolean} strict - 厳密モード
     * @returns {Object} 検証済み設定オブジェクト
     */
    validateConfig(config, strict = false) {
        this.errors = [];
        this.warnings = [];
        
        const validatedConfig = {};
        
        for (const [key, value] of Object.entries(config)) {
            try {
                validatedConfig[key] = this.validate(key, value, strict);
            } catch (error) {
                if (strict) {
                    throw error;
                }
                // エラーが発生した場合はデフォルト値を使用
                const rule = this.rules[key];
                validatedConfig[key] = rule ? rule.default : value;
            }
        }
        
        return validatedConfig;
    }
    
    /**
     * アダプター設定を検証
     * @param {Object} config - アダプター設定オブジェクト
     * @param {string} adapterType - アダプタータイプ（misskey, mastodon, rss）
     * @returns {Object} 検証結果
     */
    validateAdapterConfig(config, adapterType) {
        this.errors = [];
        this.warnings = [];
        
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            validatedConfig: {}
        };
        
        // アダプタータイプ別の必須フィールドチェック
        const requiredFields = this.getRequiredFields(adapterType);
        for (const field of requiredFields) {
            if (!config[field]) {
                results.valid = false;
                results.errors.push(`Required field missing: ${field}`);
            }
        }
        
        // 各設定値を検証
        for (const [key, value] of Object.entries(config)) {
            try {
                const validatedValue = this.validate(key, value, false);
                results.validatedConfig[key] = validatedValue;
            } catch (error) {
                results.warnings.push(`${key}: ${error.message}`);
                results.validatedConfig[key] = value; // 元の値を使用
            }
        }
        
        results.errors = this.getErrors();
        results.warnings = this.getWarnings();
        
        return results;
    }
    
    /**
     * アダプタータイプ別の必須フィールドを取得
     * @param {string} adapterType - アダプタータイプ
     * @returns {Array} 必須フィールドの配列
     */
    getRequiredFields(adapterType) {
        switch (adapterType.toLowerCase()) {
            case 'misskey':
            case 'mastodon':
                return ['instanceUrl', 'username'];
            case 'rss':
                return ['feedUrl'];
            case 'lastfm_static':
                return ['jsonUrl']; // 静的JSONファイルのURL
            default:
                return [];
        }
    }
    
    /**
     * 設定の妥当性をチェック（検証のみ、値は変更しない）
     * @param {string} key - 設定キー
     * @param {*} value - 設定値
     * @returns {boolean} 妥当かどうか
     */
    isValid(key, value) {
        const rule = this.rules[key];
        if (!rule) return true;
        
        try {
            this.validateValue(key, value, rule, true);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * 設定の推奨値を取得
     * @param {string} key - 設定キー
     * @returns {*} 推奨値
     */
    getRecommendedValue(key) {
        const rule = this.rules[key];
        return rule ? rule.default : undefined;
    }
    
    /**
     * 設定の説明を取得
     * @param {string} key - 設定キー
     * @returns {string} 説明
     */
    getDescription(key) {
        const rule = this.rules[key];
        return rule ? rule.description : '';
    }
    
    /**
     * 設定の範囲を取得
     * @param {string} key - 設定キー
     * @returns {Object} 範囲情報
     */
    getRange(key) {
        const rule = this.rules[key];
        if (!rule) return null;
        
        const range = { type: rule.type };
        if (rule.min !== undefined) range.min = rule.min;
        if (rule.max !== undefined) range.max = rule.max;
        if (rule.maxLength !== undefined) range.maxLength = rule.maxLength;
        if (rule.pattern) range.pattern = rule.pattern.toString();
        
        return range;
    }
    
    /**
     * エラーを取得
     * @returns {Array} エラー配列
     */
    getErrors() {
        return [...this.errors];
    }
    
    /**
     * 警告を取得
     * @returns {Array} 警告配列
     */
    getWarnings() {
        return [...this.warnings];
    }
    
    /**
     * エラーと警告をクリア
     */
    clear() {
        this.errors = [];
        this.warnings = [];
    }
    
    /**
     * 設定のヘルプ情報を生成
     * @returns {Object} ヘルプ情報
     */
    generateHelp() {
        const help = {};
        
        for (const [key, rule] of Object.entries(this.rules)) {
            help[key] = {
                type: rule.type,
                description: rule.description,
                default: rule.default,
                range: this.getRange(key)
            };
        }
        
        return help;
    }
    
    /**
     * 設定の検証レポートを生成
     * @param {Object} config - 設定オブジェクト
     * @returns {Object} 検証レポート
     */
    generateReport(config) {
        this.clear();
        const validatedConfig = this.validateConfig(config, false);
        
        return {
            valid: this.errors.length === 0,
            errors: this.getErrors(),
            warnings: this.getWarnings(),
            validatedConfig,
            summary: {
                totalKeys: Object.keys(config).length,
                validKeys: Object.keys(validatedConfig).length,
                errorCount: this.errors.length,
                warningCount: this.warnings.length
            }
        };
    }
}

// グローバルインスタンス
const configValidator = new ConfigValidator();

// グローバル関数を提供
function validateConfigValue(key, value, strict = false) {
    return configValidator.validate(key, value, strict);
}

function validateConfigObject(config, strict = false) {
    return configValidator.validateConfig(config, strict);
}

function isConfigValid(key, value) {
    return configValidator.isValid(key, value);
}

function getConfigHelp() {
    return configValidator.generateHelp();
}

function getConfigReport(config) {
    return configValidator.generateReport(config);
}

// グローバル関数を公開
if (typeof window !== 'undefined') {
    window.configValidator = configValidator;
    window.validateConfigValue = validateConfigValue;
    window.validateConfigObject = validateConfigObject;
    window.isConfigValid = isConfigValid;
    window.getConfigHelp = getConfigHelp;
    window.getConfigReport = getConfigReport;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConfigValidator,
        ConfigValidationError,
        CONFIG_VALIDATION_RULES,
        configValidator,
        validateConfigValue,
        validateConfigObject,
        isConfigValid,
        getConfigHelp,
        getConfigReport
    };
}
