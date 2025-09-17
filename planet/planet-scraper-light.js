/**
 * Planet Aggregator v2 - 軽量版（統合版）
 * 1つのファイルに全ての機能を統合
 */

// CONFIG定数はconfig-manager.jsに移動しました

// GlobalSettingsManagerクラスはconfig-manager.jsに移動しました

// ========================================
// 動的設定読み込みシステム
// ========================================

/**
 * 設定値を取得する関数（動的読み込み）
 */
function getConfigValueLocal(key, defaultValue = null) {
    // グローバル設定ローダー関数が利用可能かチェック
    if (typeof window !== 'undefined' && window.getConfigValue) {
        return window.getConfigValue(key, defaultValue);
    }
    
    // フォールバック: デフォルト値を返す
    console.warn(`設定値 ${key} を取得できません。デフォルト値 ${defaultValue} を使用します。`);
    return defaultValue;
}

/**
 * 設定値を取得（数値型）
 * 設定プロバイダーパターンを使用して統一された設定管理を実現
 */
function getConfigNumberLocal(key, defaultValue = 0) {
    // 新しい設定プロバイダーシステムが利用可能な場合はそれを使用
    if (typeof window !== 'undefined' && window.configManager) {
        return window.configManager.getNumber(key, defaultValue);
    }
    
    // 後方互換性のため、従来の設定管理システムもサポート
    if (typeof window !== 'undefined' && typeof window.getConfigNumber === 'function') {
        return window.getConfigNumber(key, defaultValue);
    }
    
    // フォールバック: 直接デフォルト値を返す
    console.warn(`設定値 ${key} を取得できません。デフォルト値 ${defaultValue} を使用します。`);
    return defaultValue;
}

/**
 * 設定値を取得（文字列型）
 * 設定プロバイダーパターンを使用して統一された設定管理を実現
 */
function getConfigStringLocal(key, defaultValue = '') {
    // 新しい設定プロバイダーシステムが利用可能な場合はそれを使用
    if (typeof window !== 'undefined' && window.configManager) {
        return window.configManager.getString(key, defaultValue);
    }
    
    // 後方互換性のため、従来の設定管理システムもサポート
    if (typeof window !== 'undefined' && typeof window.getConfigString === 'function') {
        return window.getConfigString(key, defaultValue);
    }
    
    // フォールバック: 直接デフォルト値を返す
    console.warn(`設定値 ${key} を取得できません。デフォルト値 ${defaultValue} を使用します。`);
    return String(defaultValue);
}

/**
 * 設定値を取得（ブール型）
 * 設定プロバイダーパターンを使用して統一された設定管理を実現
 */
function getConfigBooleanLocal(key, defaultValue = false) {
    // 新しい設定プロバイダーシステムが利用可能な場合はそれを使用
    if (typeof window !== 'undefined' && window.configManager) {
        return window.configManager.getBoolean(key, defaultValue);
    }
    
    // 後方互換性のため、従来の設定管理システムもサポート
    if (typeof window !== 'undefined' && typeof window.getConfigBoolean === 'function') {
        return window.getConfigBoolean(key, defaultValue);
    }
    
    // フォールバック: 直接デフォルト値を返す
    console.warn(`設定値 ${key} を取得できません。デフォルト値 ${defaultValue} を使用します。`);
    return Boolean(defaultValue);
}

/**
 * 設定値を取得（オブジェクト型）
 * 設定プロバイダーパターンを使用して統一された設定管理を実現
 */
function getConfigObjectLocal(key, defaultValue = {}) {
    // 新しい設定プロバイダーシステムが利用可能な場合はそれを使用
    if (typeof window !== 'undefined' && window.configManager) {
        return window.configManager.getObject(key, defaultValue);
    }
    
    // 後方互換性のため、従来の設定管理システムもサポート
    if (typeof window !== 'undefined' && typeof window.getConfigObject === 'function') {
        return window.getConfigObject(key, defaultValue);
    }
    
    // フォールバック: 直接デフォルト値を返す
    console.warn(`設定値 ${key} を取得できません。デフォルト値 ${defaultValue} を使用します。`);
    return defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue) ? defaultValue : {};
}

/**
 * 設定値の存在チェック
 * 設定プロバイダーパターンを使用して統一された設定管理を実現
 */
function hasConfigValueLocal(key) {
    // 新しい設定プロバイダーシステムが利用可能な場合はそれを使用
    if (typeof window !== 'undefined' && window.configManager) {
        return window.configManager.has(key);
    }
    
    // 後方互換性のため、従来の設定管理システムもサポート
    if (typeof window !== 'undefined' && typeof window.hasConfigValue === 'function') {
        return window.hasConfigValue(key);
    }
    
    return false;
}

/**
 * 設定の初期化（config-manager.jsから設定を読み込み）
 */
function initializeConfig() {
    // config-manager.jsが読み込まれているかチェック
    if (typeof window !== 'undefined' && window.getConfigValue) {
        console.log('動的設定読み込み: 有効');
        
        // 設定の検証を実行
        validateConfigLocal();
        
        return true;
    } else {
        console.warn('動的設定読み込み: 無効（config-manager.jsが読み込まれていません）');
        console.log('デフォルト値を使用して動作を継続します');
        return false;
    }
}

/**
 * 設定値の更新
 */
function updateConfigValueLocalLocal(key, newValue) {
    if (typeof window !== 'undefined' && window.updateConfigValueLocal) {
        return window.updateConfigValueLocal(key, newValue);
    }
    console.warn(`設定値 ${key} を更新できません。`);
    return false;
}

/**
 * 設定の検証
 */
function validateConfigLocal() {
    if (typeof window !== 'undefined' && window.validateConfig) {
        return window.validateConfig();
    }
    console.warn('設定の検証ができません。');
    return false;
}

// 正規表現パターン（コンパイル済み）
const REGEX_PATTERNS = {
    STYLE_ATTRIBUTE: /style\s*=\s*["'][^"']*["']/gi,
    MULTIPLE_SPACES: /\s+/g,
    SPACES_BEFORE_TAG: /\s+>/g,
    SPACES_AFTER_TAG: /\s+</g,
    SPACES_BETWEEN_TAGS: />\s+</g
};

// コンテンツ処理キャッシュ（メモリ効率のため制限付き）
const contentCache = new Map();

// ========================================
// ユーティリティ関数
// ========================================

function isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

// プロキシ処理のユーティリティ関数
async function makeProxyRequest(proxy, url, options, displayName) {
    let proxyUrl;
    let requestOptions = { ...options };
    
    if (proxy.includes('allorigins.win')) {
        // allorigins.win の場合
        proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        requestOptions = {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        };
    } else {
        // その他のプロキシの場合
        proxyUrl = `${proxy}${url}`;
    }
    
    console.log(`${displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 経由でAPI取得中...`);
    
    const response = await fetch(proxyUrl, {
        ...requestOptions,
        signal: AbortSignal.timeout(getConfigNumberLocal('REQUEST_TIMEOUT', 10000))
    });
    
    if (response.ok) {
        let result;
        if (proxy.includes('allorigins.win')) {
            const data = await response.json();
            result = options.returnText ? data.contents : JSON.parse(data.contents);
        } else {
            result = options.returnText ? await response.text() : await response.json();
        }
        return result;
    }
    
    // エラーレスポンスの詳細をログに出力
    const errorText = await response.text();
    console.error(`${displayName}: HTTP ${response.status} エラー:`, errorText);
    
    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        console.warn(`${displayName}: レート制限 ${retryAfter}秒待機`);
        throw new Error(`RATE_LIMIT:${retryAfter}`);
    }
    
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

// 直接アクセスのユーティリティ関数
async function makeDirectRequest(url, options, displayName) {
    console.log(`${displayName}: 直接API取得中...`);
    const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(getConfigNumberLocal('REQUEST_TIMEOUT', 10000))
    });
    
    if (response.ok) {
        return options.returnText ? await response.text() : await response.json();
    }
    
    const errorText = await response.text();
    console.error(`${displayName}: HTTP ${response.status} エラー:`, errorText);
    
    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        console.warn(`${displayName}: レート制限 ${retryAfter}秒待機`);
        throw new Error(`RATE_LIMIT:${retryAfter}`);
    }
    
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function processPostContent(content) {
    if (!content || typeof content !== 'string') return '';
    
    // HTMLタグが含まれていない場合はそのまま返す
    if (!content.includes('<')) return content;
    
    // キャッシュをチェック
    if (contentCache.has(content)) {
        return contentCache.get(content);
    }
    
    let result;
    try {
        // 一時的なDOM要素を作成して処理
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // すべてのリンクからstyle属性を削除
        const links = tempDiv.querySelectorAll('a[style]');
        links.forEach(link => link.removeAttribute('style'));
        
        // HTMLをクリーンアップ
        result = tempDiv.innerHTML
            .replace(REGEX_PATTERNS.SPACES_BEFORE_TAG, '>')      // タグ前の空白を削除
            .replace(REGEX_PATTERNS.SPACES_AFTER_TAG, '<')       // タグ後の空白を削除
            .replace(REGEX_PATTERNS.SPACES_BETWEEN_TAGS, '><');  // タグ間の空白を削除
        
    } catch (error) {
        console.warn('DOM processing failed, using regex fallback:', error);
        // フォールバック: 正規表現でstyle属性を削除
        result = content.replace(REGEX_PATTERNS.STYLE_ATTRIBUTE, '');
    }
    
    // キャッシュに保存（サイズ制限付き）
    if (contentCache.size >= getConfigNumberLocal('MAX_CACHE_SIZE', 100)) {
        const firstKey = contentCache.keys().next().value;
        contentCache.delete(firstKey);
    }
    contentCache.set(content, result);
    
    return result;
}

function formatRelativeTime(date) {
    if (!date) return '不明';
    
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    
    return new Date(date).toLocaleDateString('ja-JP');
}

function generateId(content, timestamp) {
    const baseString = (content || '').substring(0, 20) + (timestamp || Date.now());
    let hash = 0;
    
    for (let i = 0; i < baseString.length; i++) {
        const char = baseString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36).substring(0, 12).padEnd(12, '0');
}

function isValidImageUrl(url) {
    if (!url) return false;
    
    // 相対パス（ローカルアイコン）の場合
    if (url.startsWith('./') || url.startsWith('../') || !url.includes('://')) {
        return url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
    }
    
    // 絶対URLの場合
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'https:' && 
               !urlObj.hostname.includes('localhost') &&
               urlObj.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    } catch {
        return false;
    }
}

function sanitizeImageUrl(url) {
    if (!url) return '';
    
    // 相対パス（ローカルアイコン）の場合はそのまま返す
    if (url.startsWith('./') || url.startsWith('../') || !url.includes('://')) {
        return url.replace(/[?#].*$/, '');
    }
    
    // 絶対URLの場合
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
        return '';
    }
}

// ========================================
// メインアグリゲータークラス
// ========================================

class PlanetAggregator {
    constructor() {
        this.adapterFactory = new AdapterFactory();
        this.posts = [];
        this.cache = new Map();
        this.cachedPosts = []; // 取得した投稿をキャッシュ
        this.isLoading = false;
        this.isLoadingMore = false;
        this.lastRenderHash = null;
        this.oldestPostDate = null;
        this.cacheTimestamp = 0;
        this.CACHE_DURATION = getConfigNumberLocal('CACHE_DURATION', 30 * 60 * 1000);
        
        // セッション開始時刻を固定（時間フィルタリングの一貫性を保つ）
        this.sessionStartTime = new Date();
        
        // 統一された時間フィルタリング設定
        this.timeFilterSettings = null;
        this.updateTimeFilterSettings();
    }
    
    /**
     * 時間フィルタリング設定を更新
     */
    updateTimeFilterSettings() {
        // グローバル設定マネージャーが利用可能かチェック
        const globalSettings = (typeof window !== 'undefined' && window.globalSettingsManager) 
            ? window.globalSettingsManager.getGlobalSettings() 
            : {};
        
        this.timeFilterSettings = {
            enabled: globalSettings.timeBasedFetch !== false,
            daysBack: globalSettings.daysBack || 7,
            baseTime: this.sessionStartTime  // セッション開始時刻で固定
        };
        
        // カットオフ日時を事前計算（日付のみで比較するため、時刻を00:00:00に設定）
        if (this.timeFilterSettings.enabled) {
            this.cutoffDate = new Date(this.timeFilterSettings.baseTime);
            
            // 日付のみで計算（時刻は考慮しない）
            this.cutoffDate.setDate(this.cutoffDate.getDate() - this.timeFilterSettings.daysBack);
            this.cutoffDate.setHours(0, 0, 0, 0); // 00:00:00.000 に設定
            
            // デバッグ用：詳細な日付計算ログ
            console.log('=== 修正版時間フィルタリング設定 ===');
            console.log('基準時刻:', this.timeFilterSettings.baseTime.toISOString());
            console.log('遡る日数:', this.timeFilterSettings.daysBack);
            console.log('計算されたカットオフ:', this.cutoffDate.toISOString());
            console.log('基準日:', this.timeFilterSettings.baseTime.toDateString());
            console.log('カットオフ日:', this.cutoffDate.toDateString());
            console.log('====================================');
        }
        
        console.log('時間フィルタリング設定更新:', {
            enabled: this.timeFilterSettings.enabled,
            daysBack: this.timeFilterSettings.daysBack,
            baseTime: this.timeFilterSettings.baseTime.toISOString(),
            cutoffDate: this.cutoffDate?.toISOString()
        });
    }
    
    /**
     * 修正版: 日付ベースの時間フィルタリング処理
     */
    applyTimeFiltering(posts, useFlexibleMode = false) {
        if (!Array.isArray(posts) || posts.length === 0) {
            return posts;
        }
        
        // 時間フィルタリングが無効の場合はそのまま返す
        if (!this.timeFilterSettings.enabled) {
            console.log('時間ベース取得が無効のため、フィルタリングをスキップ');
            return posts;
        }
        
        let cutoffDate = new Date(this.cutoffDate);
        
        // フレキシブルモード（追加読み込み時）はより緩い設定を使用
        if (useFlexibleMode) {
            cutoffDate = new Date(this.timeFilterSettings.baseTime);
            cutoffDate.setDate(cutoffDate.getDate() - (this.timeFilterSettings.daysBack * 2)); // 2倍の期間
            cutoffDate.setHours(0, 0, 0, 0); // 00:00:00.000 に設定
            console.log(`=== フレキシブル時間フィルタリング ===`);
            console.log(`元のカットオフ: ${this.cutoffDate.toISOString()}`);
            console.log(`フレキシブルカットオフ: ${cutoffDate.toISOString()}`);
            console.log(`期間: ${this.timeFilterSettings.daysBack * 2}日前まで`);
        } else {
            console.log(`=== 修正版通常時間フィルタリング ===`);
            console.log(`カットオフ: ${cutoffDate.toISOString()}`);
            console.log(`期間: ${this.timeFilterSettings.daysBack}日前まで`);
        }
        
        // フィルタリング処理（日付ベースの比較）
        const filteredPosts = posts.filter((post, index) => {
            if (!post.timestamp) {
                console.warn('投稿にタイムスタンプがありません:', post.id);
                return true; // タイムスタンプがない場合は含める
            }
            
            const postDate = new Date(post.timestamp);
            
            // 日付ベースの比較（時刻は無視）
            const postDateOnly = new Date(postDate);
            postDateOnly.setHours(0, 0, 0, 0);
            
            const isWithinRange = postDateOnly >= cutoffDate;
            
            // より正確な日数差計算
            const daysDiff = Math.floor((cutoffDate - postDateOnly) / (1000 * 60 * 60 * 24));
            
                    // 詳細なデバッグログ（最初の10件）
        if (index < getConfigNumberLocal('UI_LIMITS.MAX_DEBUG_POSTS', 5)) {
                console.log(`投稿${index + 1}: ${post.id}`);
                console.log(`  投稿日時: ${postDate.toISOString()}`);
                console.log(`  投稿日付: ${postDateOnly.toISOString()}`);
                console.log(`  カットオフ: ${cutoffDate.toISOString()}`);
                console.log(`  日数差: ${daysDiff}日`);
                console.log(`  判定: ${isWithinRange ? '含める' : '除外'}`);
            }
            
            // 除外ログ（最初の5件のみ）
            if (!isWithinRange && index < getConfigNumberLocal('UI_LIMITS.MAX_DEBUG_POSTS', 5)) {
                console.warn(`投稿除外: ${post.id} (${daysDiff}日前の投稿)`);
            }
            
            return isWithinRange;
        });
        
        const excludedCount = posts.length - filteredPosts.length;
        console.log(`時間フィルタリング結果: ${posts.length}件 → ${filteredPosts.length}件 (除外: ${excludedCount}件)`);
        console.log('=================================');
        
        return filteredPosts;
    }
    
    /**
     * デバッグ用: 投稿の日付分布を表示
     */
    logPostDateDistribution(posts, label = '') {
        if (!posts || posts.length === 0) return;
        
        console.log(`=== 投稿日付分布 ${label} ===`);
        
        // 日付別に投稿をグループ化
        const dateGroups = {};
        posts.forEach(post => {
            if (post.timestamp) {
                const dateStr = new Date(post.timestamp).toDateString();
                if (!dateGroups[dateStr]) {
                    dateGroups[dateStr] = [];
                }
                dateGroups[dateStr].push(post);
            }
        });
        
        // ソートして表示
        const sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(b) - new Date(a));
        sortedDates.slice(0, getConfigNumberLocal('UI_LIMITS.MAX_DATE_GROUPS', 10)).forEach(date => {
            console.log(`${date}: ${dateGroups[date].length}件`);
        });
        
        console.log(`合計: ${posts.length}件`);
        console.log('========================');
    }
    
    /**
     * 追加: 投稿の詳細情報を表示するヘルパー関数
     */
    logPostDetails(posts, label = '', maxCount = 5) {
        if (!posts || posts.length === 0) return;
        
        console.log(`=== ${label} 投稿詳細 ===`);
        posts.slice(0, maxCount).forEach((post, index) => {
            if (post.timestamp) {
                const postDate = new Date(post.timestamp);
                console.log(`${index + 1}. ${post.id}`);
                console.log(`   日時: ${postDate.toISOString()}`);
                console.log(`   日付: ${postDate.toDateString()}`);
                console.log(`   内容: ${(post.content || '').substring(0, 50)}...`);
            }
        });
        console.log('========================');
    }
    
    addAdapter(type, instanceUrl, username, config = {}) {
        // 設定オブジェクトを構築
        const adapterConfig = {
            instanceUrl,
            username,
            ...config
        };
        
        // RSSの場合は特別な処理
        if (type.toLowerCase() === 'rss') {
            adapterConfig.feedUrl = instanceUrl;
        }
        
        // ファクトリーを使用してアダプターを作成
        const adapter = this.adapterFactory.create(type, adapterConfig);
        const adapterId = this.adapterFactory.generateAdapterId(type, adapterConfig);
        
        console.log(`アダプター追加: ${adapter.displayName} (${type})`);
        return adapterId;
    }
    
    async fetchAllPosts() {
        if (this.isLoading) {
            console.log('既に読み込み中です');
            return;
        }
        
        this.isLoading = true;
        this.posts = [];
        
        // 時間フィルタリング設定を更新
        this.updateTimeFilterSettings();
        
        // キャッシュをチェック
        const cachedPosts = this.getCachedPostsWithTimeFiltering();
        if (cachedPosts.length > 0) {
            console.log(`Planet Aggregator: キャッシュから ${cachedPosts.length}件の投稿を取得`);
            this.posts = cachedPosts;
            this.isLoading = false;
            this.renderPosts();
            return;
        }
        
        console.log(`Planet Aggregator: ${this.adapterFactory.size()}件のアダプターから取得開始`);
        
        const promises = Array.from(this.adapterFactory.getAll().values()).map(adapter => 
            this.fetchFromAdapter(adapter)
        );
        
        await Promise.allSettled(promises);
        
        // フィルタリング前の投稿詳細をログ出力
        this.logPostDetails(this.posts, 'フィルタリング前');
        
        // 統合された時間フィルタリングを適用
        this.posts = this.applyTimeFiltering(this.posts);
        
        // フィルタリング後の投稿詳細をログ出力
        this.logPostDetails(this.posts, 'フィルタリング後');
        
        this.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.isLoading = false;
        
        // 最古の投稿日時を記録
        if (this.posts.length > 0) {
            this.oldestPostDate = new Date(this.posts[this.posts.length - 1].timestamp);
        }
        
        // 投稿をキャッシュに追加
        this.addToCache(this.posts);
        
        console.log(`Planet Aggregator: 合計 ${this.posts.length}件の投稿を取得完了`);
        this.renderPosts();
    }
    
    async loadMorePosts() {
        if (this.isLoadingMore || this.isLoading) {
            console.log('既に読み込み中です');
            return;
        }
        
        console.log('=== 追加読み込み開始 ===');
        this.isLoadingMore = true;
        this.showLoadMoreStatus('追加の投稿を読み込み中...', 'loading');
        this.updateLoadMoreButton();
        
        try {
            // まずキャッシュから追加投稿を取得
            const cachedPosts = this.getCachedPostsWithTimeFiltering();
            const currentPostIds = new Set(this.posts.map(post => post.id));
            
            // キャッシュから未表示の投稿を取得
            const newPostsFromCache = cachedPosts.filter(post => !currentPostIds.has(post.id));
            
            if (newPostsFromCache.length > 0) {
                console.log(`キャッシュから ${newPostsFromCache.length}件の投稿を追加`);
                this.posts.push(...newPostsFromCache);
                this.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                if (this.posts.length > 0) {
                    this.oldestPostDate = new Date(this.posts[this.posts.length - 1].timestamp);
                }
                
                this.showLoadMoreStatus(`${newPostsFromCache.length}件の投稿を追加しました`, 'success');
                this.renderPosts();
                return;
            }
            
            console.log('キャッシュに新しい投稿がないため、APIから取得開始');
            
            // 既存の投稿IDセット
            const existingIds = new Set(this.posts.map(post => post.id));
            console.log(`既存投稿数: ${existingIds.size}件`);
            
            // 各アダプターから追加の投稿を取得（生データ）
            const promises = Array.from(this.adapterFactory.getAll().values()).map(adapter => 
                this.fetchMoreFromAdapterRaw(adapter, existingIds)
            );
            
            console.log(`${promises.length}個のアダプターから並行取得開始`);
            const results = await Promise.allSettled(promises);
            
            const newPosts = [];
            results.forEach((result, index) => {
                const adapterName = Array.from(this.adapterFactory.getAll().values())[index].displayName;
                if (result.status === 'fulfilled' && result.value) {
                    console.log(`${adapterName}: ${result.value.length}件取得`);
                    newPosts.push(...result.value);
                } else {
                    console.error(`${adapterName}: 取得失敗:`, result.reason);
                }
            });
            
            console.log(`全アダプターから合計 ${newPosts.length}件取得`);
            
            // 取得した投稿の日付分布をログ出力
            this.logPostDateDistribution(newPosts, '(取得直後)');
            
            if (newPosts.length > 0) {
                // 重複除外
                const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
                console.log(`重複除外後: ${uniqueNewPosts.length}件`);
                
                this.logPostDateDistribution(uniqueNewPosts, '(重複除外後)');
                
                if (uniqueNewPosts.length > 0) {
                    // 時間フィルタリング前の件数
                    console.log(`時間フィルタリング前: ${uniqueNewPosts.length}件`);
                    
                    // フレキシブルモードで時間フィルタリングを適用（より緩い設定）
                    const filteredNewPosts = this.applyTimeFiltering(uniqueNewPosts, true);
                    
                    console.log(`時間フィルタリング後: ${filteredNewPosts.length}件`);
                    
                    this.logPostDateDistribution(filteredNewPosts, '(時間フィルタリング後)');
                    
                    if (filteredNewPosts.length > 0) {
                        // 投稿データを正しい形式に変換
                        const processedPosts = filteredNewPosts.map(post => this.createPostFromRawData(post));
                        
                        this.posts.push(...processedPosts);
                        this.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        
                        this.oldestPostDate = new Date(this.posts[this.posts.length - 1].timestamp);
                        
                        // 新しい投稿をキャッシュに追加
                        this.addToCache(processedPosts);
                        
                        console.log(`=== 追加読み込み成功: ${processedPosts.length}件 ===`);
                        this.showLoadMoreStatus(`${processedPosts.length}件の投稿を追加しました`, 'success');
                        this.renderPosts();
                    } else {
                        console.log('フレキシブルモードでも全て除外');
                        // 時間フィルタリングを無効にして再試行
                        console.log('時間フィルタリングなしで再試行...');
                        const processedPosts = uniqueNewPosts.map(post => this.createPostFromRawData(post));
                        
                        // 最新の10件のみ追加（古すぎる投稿を避けるため）
                        const recentPosts = processedPosts
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .slice(0, getConfigNumberLocal('UI_LIMITS.MAX_RECENT_POSTS', 10));
                        
                        if (recentPosts.length > 0) {
                            this.posts.push(...recentPosts);
                            this.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            
                            this.oldestPostDate = new Date(this.posts[this.posts.length - 1].timestamp);
                            this.addToCache(recentPosts);
                            
                            console.log(`=== 時間制限なしで追加: ${recentPosts.length}件 ===`);
                            this.showLoadMoreStatus(`${recentPosts.length}件の投稿を追加しました（時間制限なし）`, 'success');
                            this.renderPosts();
                        } else {
                            this.showLoadMoreStatus('新しい投稿はありません', 'info');
                        }
                    }
                } else {
                    console.log('重複除外後に投稿がゼロ');
                    this.showLoadMoreStatus('新しい投稿はありません（重複除外）', 'success');
                }
            } else {
                console.log('APIから投稿を取得できず');
                this.showLoadMoreStatus('新しい投稿はありません', 'success');
            }
            
        } catch (error) {
            console.error('=== 追加読み込みエラー ===', error);
            this.showLoadMoreStatus('追加読み込みに失敗しました', 'error');
        } finally {
            this.isLoadingMore = false;
            console.log('=== 追加読み込み完了 ===');
            this.updateLoadMoreButton();
        }
    }
    
    async fetchMoreFromAdapter(adapter, existingIds) {
        try {
            // 追加読み込み時は、現在時刻からdaysBack日数前の日時をカットオフ日時として使用
            // 時間フィルタリングは統合版で実行されるため、ここでは重複チェックのみ
            const globalSettings = (typeof window !== 'undefined' && window.globalSettingsManager) 
                ? window.globalSettingsManager.getGlobalSettings() 
                : {};
            const daysBack = globalSettings.daysBack || 3;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBack);
            
            console.log(`${adapter.displayName}: 追加読み込み (${cutoffDate.toISOString()} 以降)`);
            
            // アダプターの追加読み込みメソッドを呼び出し
            if (typeof adapter.fetchMorePosts === 'function') {
                return await adapter.fetchMorePosts(cutoffDate, existingIds);
            } else {
                // フォールバック: 通常の取得を実行
                return await adapter.fetchPosts();
            }
            
        } catch (error) {
            console.error(`${adapter.displayName}: 追加読み込みエラー:`, error);
            return [];
        }
    }
    
    /**
     * 修正版: アダプターから生の投稿データを取得（時間フィルタリングなし）
     * 時間フィルタリングは後で統合的に実行する
     */
    async fetchMoreFromAdapterRaw(adapter, existingIds) {
        console.log(`--- ${adapter.displayName}: 生データ取得開始 ---`);
        
        try {
            // fetchMorePostsRaw メソッドが実装されているかチェック
            if (typeof adapter.fetchMorePostsRaw === 'function') {
                console.log(`${adapter.displayName}: fetchMorePostsRaw メソッドを使用`);
                const rawPosts = await adapter.fetchMorePostsRaw(existingIds);
                console.log(`${adapter.displayName}: ${rawPosts.length}件の生データを取得`);
                return rawPosts;
            } else {
                console.warn(`${adapter.displayName}: fetchMorePostsRaw メソッドが未実装のため通常取得を使用`);
                // フォールバック: 通常の取得を実行
                const posts = await adapter.fetchPosts();
                // 重複除外
                const uniquePosts = posts.filter(post => !existingIds.has(post.id));
                console.log(`${adapter.displayName}: フォールバック取得完了 - ${uniquePosts.length}件`);
                return uniquePosts.map(post => this.convertToRawData(post));
            }
            
        } catch (error) {
            console.error(`${adapter.displayName}: 生データ取得エラー:`, error);
            return [];
        }
    }
    
    /**
     * 投稿データを生データ形式に変換
     */
    convertToRawData(post) {
        return {
            id: post.id,
            content: post.content,
            images: post.images,
            timestamp: post.timestamp,
            reactions: post.reactions,
            sourceIcon: post.sourceIcon,
            sourceDisplayName: post.sourceDisplayName,
            sourceIconImage: post.sourceIconImage,
            originalUrl: post.originalUrl
        };
    }
    
    /**
     * 生データから投稿オブジェクトを作成
     */
    createPostFromRawData(rawData) {
        return {
            id: rawData.id,
            content: processPostContent(rawData.content || ''),
            images: rawData.images || [],
            timestamp: rawData.timestamp || new Date(),
            timeText: formatRelativeTime(rawData.timestamp),
            reactions: rawData.reactions || { favorites: 0, reblogs: 0, replies: 0 },
            source: rawData.source || 'unknown',
            sourceIcon: rawData.sourceIcon || '[取得]',
            sourceInstance: rawData.sourceInstance || '',
            sourceDisplayName: rawData.sourceDisplayName || 'Unknown',
            sourceIconImage: rawData.sourceIconImage || null,
            originalUrl: rawData.originalUrl || null
        };
    }
    
    showLoadMoreStatus(message, type) {
        const statusElement = document.getElementById('load-more-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
            statusElement.style.display = 'block';
            
            // 3秒後に非表示
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }
    
    async fetchFromAdapter(adapter) {
        try {
            const cacheKey = `${adapter.instanceUrl}/${adapter.username}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                console.log(`${adapter.displayName}: キャッシュから取得`);
                this.posts.push(...cached);
                return;
            }
            
            const posts = await adapter.fetchPosts();
            this.posts.push(...posts);
            this.saveToCache(cacheKey, posts);
            
        } catch (error) {
            console.error(`${adapter.displayName}: 取得エラー:`, error);
            this.posts.push(adapter.createErrorPost(error.message));
        }
    }
    
    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item || Date.now() > item.timestamp + getConfigNumberLocal('CACHE_DURATION', 30 * 60 * 1000)) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }
    
    saveToCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
        
        if (this.cache.size > CONFIG.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
    
    renderPosts() {
        const container = document.getElementById('planet-v2-content');
        if (!container) {
            console.error('表示コンテナが見つかりません: #planet-v2-content');
            return;
        }
        
        if (this.posts.length === 0) {
            container.innerHTML = '<div class="loading">投稿が見つかりませんでした</div>';
            return;
        }
        
        // 差分更新チェック
        const currentHash = this.calculateHash();
        if (this.lastRenderHash === currentHash) {
            console.log('投稿内容に変更がないため、レンダリングをスキップ');
            this.updateTime();
            return;
        }
        
        const html = this.renderHTML();
        container.innerHTML = html;
        this.lastRenderHash = currentHash;
        this.updateTime();
        this.setupImageErrorHandling();
        
        // 「もっと読み込む」ボタンの表示制御
        this.updateLoadMoreButton();
        
        // Luminousライトボックスを再初期化
        this.initializeLuminous();
        
        // 投稿内のリンクからstyle属性を削除
        this.removeLinkStyles();
        
        // DOMの変更を監視してstyle属性を削除
        this.setupStyleAttributeObserver();
    }
    
    removeLinkStyles() {
        // 投稿内のすべてのリンクからstyle属性を削除
        const links = document.querySelectorAll('.post-text a[style]');
        
        links.forEach(link => {
            link.removeAttribute('style');
        });
        
        if (links.length > 0) {
            console.log(`Removed style attributes from ${links.length} links`);
        }
    }
    
    setupStyleAttributeObserver() {
        // 既存のオブザーバーを停止
        if (this.styleObserver) {
            this.styleObserver.disconnect();
        }
        
        // 既存のインターバルをクリア
        if (this.styleCheckInterval) {
            clearInterval(this.styleCheckInterval);
        }
        
        // MutationObserverを作成してDOMの変更を監視
        this.styleObserver = new MutationObserver((mutations) => {
            let shouldRemoveStyles = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    shouldRemoveStyles = true;
                } else if (mutation.type === 'childList') {
                    // 新しい要素が追加された場合もチェック
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const links = node.querySelectorAll ? node.querySelectorAll('a[style]') : [];
                            if (links.length > 0) {
                                shouldRemoveStyles = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRemoveStyles) {
                console.log('Style attributes detected, removing them');
                this.removeLinkStyles();
            }
        });
        
        // 投稿コンテナを監視対象に設定
        const container = document.getElementById('planet-v2-content');
        if (container) {
            this.styleObserver.observe(container, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['style']
            });
            console.log('Style attribute observer started');
        }
        
        // フォールバック用の定期的チェック（MutationObserverが効かない場合の保険）
        // 間隔を長くして（30秒）、パフォーマンスへの影響を最小化
        this.styleCheckInterval = setInterval(() => {
            const links = document.querySelectorAll('#planet-v2-content a[style]');
            if (links.length > 0) {
                console.log(`Fallback check: Found ${links.length} links with style attributes, removing them`);
                this.removeLinkStyles();
            }
        }, 30000); // 30秒間隔に変更
        
        console.log('Style check fallback interval started (30 seconds)');
    }
    
    updateLoadMoreButton() {
        const loadMoreContainer = document.getElementById('load-more-container');
        const loadMoreBtn = document.getElementById('load-more-btn');
        
        if (!loadMoreContainer || !loadMoreBtn) {
            console.log('ボタン要素が見つかりません');
            return;
        }
        
        console.log(`ボタン状態更新 - posts: ${this.posts.length}, isLoading: ${this.isLoading}, isLoadingMore: ${this.isLoadingMore}`);
        
        // 投稿がある場合のみボタンを表示
        if (this.posts.length > 0 && !this.isLoading && !this.isLoadingMore) {
            loadMoreContainer.style.display = 'block';
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'もっと読み込む';
            console.log('ボタン状態: 通常表示');
        } else if (this.isLoadingMore) {
            loadMoreContainer.style.display = 'block';
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = '読み込み中...';
            console.log('ボタン状態: 読み込み中');
        } else {
            loadMoreContainer.style.display = 'none';
            console.log('ボタン状態: 非表示');
        }
    }
    
    initializeLuminous() {
        // グローバルのinitializeLuminous関数を呼び出し
        if (typeof window.initializeLuminous === 'function') {
            // 少し遅延してから実行（DOM更新完了を待つ）
            setTimeout(() => {
                window.initializeLuminous();
            }, 50);
        } else {
            console.log('Luminous初期化関数が見つかりません');
        }
    }
    
    calculateHash() {
        const content = this.posts.map(p => `${p.id}:${p.content}`).join('|');
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    
    renderHTML() {
        const postsByDate = this.groupByDate();
        
        return Object.keys(postsByDate)
            .sort((a, b) => new Date(b) - new Date(a))
            .map(date => {
                const posts = postsByDate[date].map(post => this.renderPost(post)).join('');
                return `
                    <div class="date-section">
                        <h2 class="date-header">${date}</h2>
                        <ul class="post-list">${posts}</ul>
                    </div>
                `;
            }).join('');
    }
    
    groupByDate() {
        const groups = {};
        this.posts.forEach(post => {
            const key = new Date(post.timestamp).toLocaleDateString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            });
            if (!groups[key]) groups[key] = [];
            groups[key].push(post);
        });
        return groups;
    }
    
    renderPost(post) {
        const timeStr = new Date(post.timestamp).toLocaleTimeString('ja-JP', {
            hour: '2-digit', minute: '2-digit'
        });
        const linkUrl = post.originalUrl || `${post.sourceInstance}/notes/${post.id}`;
        const iconHtml = this.renderIcon(post);
        
        // Last.fm投稿の特別処理
        const isLastfm = post.extraData?.type === 'lastfm_scrobble';
        const albumArtHtml = isLastfm && post.extraData?.albumArtUrl ? 
            `<img src="${escapeHtml(post.extraData.albumArtUrl)}" alt="アルバムアート" class="lastfm-album-art">` : '';
        
        let html = `
            <li class="post-item" data-source-type="${post.extraData?.type || 'default'}">
                <div class="post-content">
                    ${albumArtHtml}
                    <div class="post-text">${post.content}</div>
                    <span class="post-source">- ${iconHtml} ${post.sourceDisplayName}</span>
        `;
        
        if (post.images && post.images.length > 0) {
            html += this.renderImages(post.images);
        }
        
        if (this.hasReactions(post.reactions)) {
            html += this.renderReactions(post.reactions);
        }
        
        html += `
                </div>
                <a href="${linkUrl}" class="post-time-link" target="_blank">(${timeStr})</a>
            </li>
        `;
        
        return html;
    }
    
    renderIcon(post) {
        if (post.sourceIconImage && isValidImageUrl(post.sourceIconImage)) {
            const safeUrl = sanitizeImageUrl(post.sourceIconImage);
            return `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(post.sourceDisplayName)} icon" class="source-icon-image" data-fallback="icon">`;
        }
        return `<span class="source-icon-text">${escapeHtml(post.sourceIcon || '[取得]')}</span>`;
    }
    
    renderImages(images) {
        const validImages = images.filter(img => isValidImageUrl(img.url)).slice(0, CONFIG.UI_LIMITS.MAX_IMAGES_DISPLAY);
        if (validImages.length === 0) return '';
        
        const html = validImages.map(image => {
            const safeUrl = sanitizeImageUrl(image.url);
            const safeAlt = escapeHtml(image.alt || '投稿画像');
            return `
                <div class="post-image-container">
                    <a href="${escapeHtml(safeUrl)}">
                        <img src="${escapeHtml(safeUrl)}" alt="${safeAlt}" class="post-image" loading="lazy" data-fallback="image" style="image-rendering: auto !important">
                    </a>
                </div>
            `;
        }).join('');
        
        return `<div class="post-images images-${validImages.length}">${html}</div>`;
    }
    
    hasReactions(reactions) {
        return reactions && (reactions.favorites > 0 || reactions.reblogs > 0 || reactions.replies > 0);
    }
    
    renderReactions(reactions) {
        let html = '<div class="post-reactions">';
        if (reactions.favorites > 0) html += `<span class="reaction">いいね ${reactions.favorites}</span>`;
        if (reactions.reblogs > 0) html += `<span class="reaction">リノート ${reactions.reblogs}</span>`;
        if (reactions.replies > 0) html += `<span class="reaction">返信 ${reactions.replies}</span>`;
        html += '</div>';
        return html;
    }
    
    updateTime() {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleString('ja-JP');
        }
    }
    
    setupImageErrorHandling() {
        document.querySelectorAll('#planet-v2-content img[data-fallback]').forEach(img => {
            img.addEventListener('error', function() {
                this.style.display = 'none';
            }, { once: true });
        });
    }
    
    // 投稿をキャッシュに追加
    addToCache(posts) {
        if (!Array.isArray(posts)) return;
        
        // 既存のキャッシュとマージ（重複を避ける）
        const existingIds = new Set(this.cachedPosts.map(post => post.id));
        const newPosts = posts.filter(post => !existingIds.has(post.id));
        
        this.cachedPosts = [...this.cachedPosts, ...newPosts]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        this.cacheTimestamp = Date.now();
        
        // キャッシュサイズを制限（メモリ効率のため）
        if (this.cachedPosts.length > CONFIG.MAX_CACHED_POSTS) {
            this.cachedPosts = this.cachedPosts.slice(0, CONFIG.MAX_CACHED_POSTS);
        }
        
        console.log(`キャッシュに ${newPosts.length}件の投稿を追加 (合計: ${this.cachedPosts.length}件)`);
    }
    
    // キャッシュから投稿を取得
    getCachedPosts() {
        const now = Date.now();
        
        // キャッシュが期限切れの場合は空配列を返す
        if (now - this.cacheTimestamp > this.CACHE_DURATION) {
            console.log('キャッシュが期限切れのため、空の配列を返します');
            return [];
        }
        
        return [...this.cachedPosts]; // コピーを返す
    }
    
    // キャッシュから時間フィルタリング済みの投稿を取得
    getCachedPostsWithTimeFiltering() {
        const cachedPosts = this.getCachedPosts();
        if (cachedPosts.length === 0) {
            return [];
        }
        
        // 統合された時間フィルタリングを適用
        return this.applyTimeFiltering(cachedPosts);
    }
    
    // 表示用投稿を取得（最大投稿数制限付き）
    getCachedPostsForDisplay(maxPosts = getConfigNumberLocal('UI_LIMITS.MAX_POSTS', 20)) {
        const cachedPosts = this.getCachedPosts();
        return cachedPosts.slice(0, maxPosts);
    }
    
    // キャッシュの状態を取得
    getCacheStatus() {
        const now = Date.now();
        const isExpired = now - this.cacheTimestamp > this.CACHE_DURATION;
        const remainingTime = Math.max(0, this.CACHE_DURATION - (now - this.cacheTimestamp));
        
        return {
            postCount: this.cachedPosts.length,
            isExpired: isExpired,
            remainingTime: remainingTime,
            lastUpdate: new Date(this.cacheTimestamp)
        };
    }
    
    clearCache() {
        this.cache.clear();
        this.cachedPosts = [];
        this.cacheTimestamp = 0;
        console.log('キャッシュをクリアしました');
    }
}

// ========================================
// プロキシ管理クラス
// ========================================

class ProxyManager {
    constructor() {
        this.failedProxies = new Map();
        this.FAILURE_THRESHOLD = getConfigNumberLocal('PROXY.FAILURE_THRESHOLD', 3);
        this.RECOVERY_TIME = getConfigNumberLocal('PROXY.RECOVERY_TIME', 5 * 60 * 1000);
    }
    
    getAvailableProxies() {
        const services = [
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        
        if (!isLocalhost()) {
            services.unshift('https://api.allorigins.win/get?url=');
        }
        
        return services.filter(proxy => !this.isProxyFailed(proxy));
    }
    
    isProxyFailed(proxy) {
        const proxyName = this.getProxyName(proxy);
        const failedData = this.failedProxies.get(proxyName);
        
        if (!failedData) return false;
        
        if (Date.now() - failedData.timestamp > this.RECOVERY_TIME) {
            this.failedProxies.delete(proxyName);
            return false;
        }
        
        return failedData.count >= this.FAILURE_THRESHOLD;
    }
    
    recordFailure(proxy) {
        const proxyName = this.getProxyName(proxy);
        const current = this.failedProxies.get(proxyName) || { count: 0, timestamp: Date.now() };
        current.count++;
        current.timestamp = Date.now();
        this.failedProxies.set(proxyName, current);
        
        console.warn(`プロキシ ${proxyName} 失敗記録: ${current.count}/${this.FAILURE_THRESHOLD}`);
    }
    
    getProxyName(proxyUrl) {
        return proxyUrl.split('://')[1].split('/')[0];
    }
}

const proxyManager = new ProxyManager();

// ========================================
// 共通APIクライアント
// ========================================

/**
 * 統一されたAPIリクエスト処理クラス
 */
class APIClient {
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout || getConfigNumberLocal('REQUEST_TIMEOUT', 10000),
            retryAttempts: config.retryAttempts || getConfigNumberLocal('RETRY_ATTEMPTS', 3),
            retryDelay: config.retryDelay || getConfigNumberLocal('BACKOFF.BASE_DELAY', 1000),
            maxRetryDelay: config.maxRetryDelay || getConfigNumberLocal('BACKOFF.MAX_DELAY', 10000),
            retryMultiplier: config.retryMultiplier || getConfigNumberLocal('BACKOFF.MULTIPLIER', 2),
            useProxy: config.useProxy !== false, // デフォルトはtrue
            ...config
        };
    }
    
    /**
     * リトライ設定付きでAPIリクエストを実行
     * @param {string} url - リクエストURL
     * @param {Object} options - fetchオプション
     * @param {string} displayName - 表示名（ログ用）
     * @returns {Promise<any>} レスポンスデータ
     */
    async request(url, options = {}, displayName = 'API') {
        const { useProxy } = this.config;
        const proxies = useProxy ? proxyManager.getAvailableProxies() : [];
        
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                if (useProxy) {
                    // プロキシを使用してリクエストを試行
                    for (const proxy of proxies) {
                        try {
                            return await this.makeProxyRequest(proxy, url, options, displayName);
                        } catch (error) {
                            const errorResult = errorHandler.handleError(error, `${displayName} (プロキシ: ${proxyManager.getProxyName(proxy)})`, {
                                attempt,
                                maxAttempts: this.config.retryAttempts,
                                metadata: { proxy, url }
                            });
                            
                            if (errorResult.retryInfo.canRetry && attempt < this.config.retryAttempts) {
                                await this.delay(errorResult.retryInfo.delay);
                                break; // プロキシループを抜けて次の試行へ
                            } else {
                                proxyManager.recordFailure(proxy);
                                continue; // 次のプロキシを試行
                            }
                        }
                    }
                } else {
                    // 直接アクセス
                    return await this.makeDirectRequest(url, options, displayName);
                }
            } catch (error) {
                const errorResult = errorHandler.handleError(error, displayName, {
                    attempt,
                    maxAttempts: this.config.retryAttempts,
                    retryConfig: {
                        strategy: 'exponential_backoff',
                        baseDelay: this.config.retryDelay,
                        maxDelay: this.config.maxRetryDelay,
                        multiplier: this.config.retryMultiplier
                    },
                    metadata: { url }
                });
                
                if (errorResult.retryInfo.canRetry && attempt < this.config.retryAttempts) {
                    await this.delay(errorResult.retryInfo.delay);
                }
            }
        }
        
        // 全ての試行が失敗した場合
        const finalError = new Error(`${useProxy ? '全てのプロキシ' : '直接アクセス'}でAPI取得に失敗しました`);
        errorHandler.handleError(finalError, displayName, {
            attempt: this.config.retryAttempts,
            maxAttempts: this.config.retryAttempts,
            metadata: { url, useProxy }
        });
        
        throw finalError;
    }
    
    /**
     * プロキシ経由でリクエストを実行
     * @param {string} proxy - プロキシURL
     * @param {string} url - リクエストURL
     * @param {Object} options - fetchオプション
     * @param {string} displayName - 表示名
     * @returns {Promise<any>} レスポンスデータ
     */
    async makeProxyRequest(proxy, url, options, displayName) {
        let proxyUrl;
        let requestOptions = { ...options };
        
        if (proxy.includes('allorigins.win')) {
            // allorigins.win の場合
            proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            requestOptions = {
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            };
        } else {
            // その他のプロキシの場合
            proxyUrl = `${proxy}${url}`;
        }
        
        console.log(`${displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 経由でAPI取得中...`);
        
        const response = await fetch(proxyUrl, {
            ...requestOptions,
            signal: AbortSignal.timeout(this.config.timeout)
        });
        
        if (response.ok) {
            let result;
            if (proxy.includes('allorigins.win')) {
                const data = await response.json();
                result = options.returnText ? data.contents : JSON.parse(data.contents);
            } else {
                result = options.returnText ? await response.text() : await response.json();
            }
            return result;
        }
        
        // エラーレスポンスの詳細をログに出力
        const errorText = await response.text();
        console.error(`${displayName}: HTTP ${response.status} エラー:`, errorText);
        
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || 60;
            console.warn(`${displayName}: レート制限 ${retryAfter}秒待機`);
            throw new Error(`RATE_LIMIT:${retryAfter}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    /**
     * 直接アクセスでリクエストを実行
     * @param {string} url - リクエストURL
     * @param {Object} options - fetchオプション
     * @param {string} displayName - 表示名
     * @returns {Promise<any>} レスポンスデータ
     */
    async makeDirectRequest(url, options, displayName) {
        console.log(`${displayName}: 直接API取得中...`);
        const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(this.config.timeout)
        });
        
        if (response.ok) {
            return options.returnText ? await response.text() : await response.json();
        }
        
        const errorText = await response.text();
        console.error(`${displayName}: HTTP ${response.status} エラー:`, errorText);
        
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || 60;
            console.warn(`${displayName}: レート制限 ${retryAfter}秒待機`);
            throw new Error(`RATE_LIMIT:${retryAfter}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    /**
     * 指定時間待機
     * @param {number} ms - 待機時間（ミリ秒）
     * @returns {Promise<void>}
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 設定を更新
     * @param {Object} newConfig - 新しい設定
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// ========================================
// 設定管理改善
// ========================================

// ConfigValidatorクラスはconfig-validator.jsに移動しました

// ========================================
// エラーハンドリング統一
// ========================================

/**
 * 統一されたエラーハンドリングクラス
 */
class ErrorHandler {
    constructor() {
        this.errorTypes = {
            NETWORK_ERROR: 'NETWORK_ERROR',
            RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
            AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
            VALIDATION_ERROR: 'VALIDATION_ERROR',
            API_ERROR: 'API_ERROR',
            TIMEOUT_ERROR: 'TIMEOUT_ERROR',
            UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        };
        
        this.retryStrategies = {
            IMMEDIATE: 'immediate',
            EXPONENTIAL_BACKOFF: 'exponential_backoff',
            LINEAR_BACKOFF: 'linear_backoff',
            FIXED_DELAY: 'fixed_delay'
        };
    }
    
    /**
     * エラーの種類を判定
     * @param {Error} error - エラーオブジェクト
     * @returns {string} エラーの種類
     */
    classifyError(error) {
        if (!error) return this.errorTypes.UNKNOWN_ERROR;
        
        const message = error.message || '';
        const name = error.name || '';
        
        // レート制限エラー
        if (message.includes('RATE_LIMIT') || message.includes('429')) {
            return this.errorTypes.RATE_LIMIT_ERROR;
        }
        
        // ネットワークエラー
        if (name === 'TypeError' && message.includes('fetch')) {
            return this.errorTypes.NETWORK_ERROR;
        }
        
        // タイムアウトエラー
        if (message.includes('timeout') || name === 'TimeoutError') {
            return this.errorTypes.TIMEOUT_ERROR;
        }
        
        // 認証エラー
        if (message.includes('401') || message.includes('Unauthorized')) {
            return this.errorTypes.AUTHENTICATION_ERROR;
        }
        
        // バリデーションエラー
        if (message.includes('400') || message.includes('Bad Request')) {
            return this.errorTypes.VALIDATION_ERROR;
        }
        
        // APIエラー
        if (message.includes('HTTP') && /[4-5]\d\d/.test(message)) {
            return this.errorTypes.API_ERROR;
        }
        
        return this.errorTypes.UNKNOWN_ERROR;
    }
    
    /**
     * エラーがリトライ可能かどうかを判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean} リトライ可能フラグ
     */
    isRetryable(error) {
        const errorType = this.classifyError(error);
        
        const retryableTypes = [
            this.errorTypes.NETWORK_ERROR,
            this.errorTypes.RATE_LIMIT_ERROR,
            this.errorTypes.TIMEOUT_ERROR,
            this.errorTypes.API_ERROR
        ];
        
        return retryableTypes.includes(errorType);
    }
    
    /**
     * リトライ戦略に基づいて待機時間を計算
     * @param {Error} error - エラーオブジェクト
     * @param {number} attempt - 現在の試行回数
     * @param {Object} config - 設定オブジェクト
     * @returns {number} 待機時間（ミリ秒）
     */
    calculateRetryDelay(error, attempt, config = {}) {
        const errorType = this.classifyError(error);
        const strategy = config.strategy || this.retryStrategies.EXPONENTIAL_BACKOFF;
        const baseDelay = config.baseDelay || 1000;
        const maxDelay = config.maxDelay || 10000;
        const multiplier = config.multiplier || 2;
        
        let delay;
        
        switch (strategy) {
            case this.retryStrategies.IMMEDIATE:
                delay = 0;
                break;
                
            case this.retryStrategies.EXPONENTIAL_BACKOFF:
                delay = Math.min(baseDelay * Math.pow(multiplier, attempt - 1), maxDelay);
                break;
                
            case this.retryStrategies.LINEAR_BACKOFF:
                delay = Math.min(baseDelay * attempt, maxDelay);
                break;
                
            case this.retryStrategies.FIXED_DELAY:
                delay = baseDelay;
                break;
                
            default:
                delay = baseDelay;
        }
        
        // レート制限エラーの場合は特別な処理
        if (errorType === this.errorTypes.RATE_LIMIT_ERROR) {
            const retryAfter = this.extractRetryAfter(error);
            if (retryAfter > 0) {
                delay = Math.max(delay, retryAfter * 1000);
            }
        }
        
        return Math.max(0, delay);
    }
    
    /**
     * エラーメッセージからRetry-After値を抽出
     * @param {Error} error - エラーオブジェクト
     * @returns {number} Retry-After値（秒）
     */
    extractRetryAfter(error) {
        const message = error.message || '';
        const match = message.match(/RATE_LIMIT:(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }
    
    /**
     * エラーログを出力
     * @param {Error} error - エラーオブジェクト
     * @param {string} context - エラーのコンテキスト
     * @param {Object} metadata - 追加のメタデータ
     */
    logError(error, context = '', metadata = {}) {
        const errorType = this.classifyError(error);
        const isRetryable = this.isRetryable(error);
        
        const logData = {
            type: errorType,
            message: error.message,
            context,
            isRetryable,
            timestamp: new Date().toISOString(),
            ...metadata
        };
        
        if (isRetryable) {
            console.warn(`[${errorType}] ${context}:`, logData);
        } else {
            console.error(`[${errorType}] ${context}:`, logData);
        }
    }
    
    /**
     * エラーをユーザーフレンドリーなメッセージに変換
     * @param {Error} error - エラーオブジェクト
     * @param {string} context - エラーのコンテキスト
     * @returns {string} ユーザーフレンドリーなメッセージ
     */
    getUserFriendlyMessage(error, context = '') {
        const errorType = this.classifyError(error);
        
        const messages = {
            [this.errorTypes.NETWORK_ERROR]: 'ネットワーク接続に問題があります。インターネット接続を確認してください。',
            [this.errorTypes.RATE_LIMIT_ERROR]: 'APIの利用制限に達しました。しばらく待ってから再試行してください。',
            [this.errorTypes.AUTHENTICATION_ERROR]: '認証に失敗しました。設定を確認してください。',
            [this.errorTypes.VALIDATION_ERROR]: 'リクエストの形式が正しくありません。',
            [this.errorTypes.API_ERROR]: 'APIサーバーでエラーが発生しました。',
            [this.errorTypes.TIMEOUT_ERROR]: 'リクエストがタイムアウトしました。',
            [this.errorTypes.UNKNOWN_ERROR]: '予期しないエラーが発生しました。'
        };
        
        const baseMessage = messages[errorType] || messages[this.errorTypes.UNKNOWN_ERROR];
        return context ? `${context}: ${baseMessage}` : baseMessage;
    }
    
    /**
     * エラーを処理して適切なアクションを実行
     * @param {Error} error - エラーオブジェクト
     * @param {string} context - エラーのコンテキスト
     * @param {Object} options - 処理オプション
     * @returns {Object} 処理結果
     */
    handleError(error, context = '', options = {}) {
        const errorType = this.classifyError(error);
        const isRetryable = this.isRetryable(error);
        
        // エラーログを出力
        this.logError(error, context, options.metadata);
        
        // ユーザーフレンドリーなメッセージを生成
        const userMessage = this.getUserFriendlyMessage(error, context);
        
        // リトライ情報を計算
        const retryInfo = isRetryable ? {
            canRetry: true,
            delay: this.calculateRetryDelay(error, options.attempt || 1, options.retryConfig || {}),
            strategy: options.retryConfig?.strategy || this.retryStrategies.EXPONENTIAL_BACKOFF
        } : {
            canRetry: false,
            delay: 0,
            strategy: null
        };
        
        return {
            errorType,
            isRetryable,
            userMessage,
            retryInfo,
            originalError: error,
            timestamp: new Date().toISOString()
        };
    }
}

// グローバルエラーハンドラーインスタンス
const errorHandler = new ErrorHandler();

// ========================================
// ファクトリーパターン
// ========================================

/**
 * アダプターファクトリークラス
 * 統一された方法でアダプターを生成・管理
 */
class AdapterFactory {
    constructor() {
        this.adapters = new Map();
        this.apiClient = new APIClient();
    }
    
    /**
     * アダプターを作成
     * @param {string} type - アダプタータイプ
     * @param {Object} config - 設定オブジェクト
     * @returns {APIAdapter} 作成されたアダプター
     */
    create(type, config) {
        let validation = null;
        let validatedConfig = config;
        
        // 設定を検証（configValidatorが利用可能な場合のみ）
        if (typeof window !== 'undefined' && window.configValidator) {
            validation = window.configValidator.validateAdapterConfig(config, type);
            
            if (!validation.valid) {
                console.error(`設定検証エラー (${type}):`, validation.errors);
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }
            
            if (validation.warnings.length > 0) {
                console.warn(`設定警告 (${type}):`, validation.warnings);
            }
            
            validatedConfig = validation.validatedConfig;
        } else {
            // 設定検証システムが利用できない場合は基本的な検証のみ実行
            console.warn('設定検証システムが利用できません。基本的な検証のみ実行します。');
            
            // 必須フィールドの基本的なチェック
            if (type === 'misskey' || type === 'mastodon') {
                if (!config.instanceUrl || !config.username) {
                    throw new Error(`Invalid configuration: Missing required fields for ${type}`);
                }
            } else if (type === 'rss') {
                if (!config.feedUrl) {
                    throw new Error(`Invalid configuration: Missing required field feedUrl for ${type}`);
                }
            }
        }
        const adapterId = this.generateAdapterId(type, validatedConfig);
        
        // 既存のアダプターをチェック
        if (this.adapters.has(adapterId)) {
            console.log(`既存のアダプターを再利用: ${adapterId}`);
            return this.adapters.get(adapterId);
        }
        
        let adapter;
        
        switch (type.toLowerCase()) {
            case 'misskey':
                adapter = new MisskeyAdapter(validatedConfig.instanceUrl, validatedConfig.username, validatedConfig);
                break;
            case 'mastodon':
                adapter = new MastodonAdapter(validatedConfig.instanceUrl, validatedConfig.username, validatedConfig);
                break;
            case 'rss':
                adapter = new RSSAdapter(validatedConfig.feedUrl, validatedConfig);
                break;
            case 'lastfm_static':
                adapter = new LastfmStaticAdapter(null, null, validatedConfig);
                break;
            default:
                throw new Error(`未対応のアダプタータイプ: ${type}`);
        }
        
        // アダプターを登録
        this.adapters.set(adapterId, adapter);
        console.log(`アダプターを作成: ${adapterId} (${type})`);
        
        return adapter;
    }
    
    /**
     * アダプターIDを生成
     * @param {string} type - アダプタータイプ
     * @param {Object} config - 設定オブジェクト
     * @returns {string} アダプターID
     */
    generateAdapterId(type, config) {
        switch (type.toLowerCase()) {
            case 'misskey':
            case 'mastodon':
                return `${type}:${config.instanceUrl}:${config.username}`;
            case 'rss':
                return `${type}:${config.feedUrl}`;
            case 'lastfm_static':
                return `${type}:${config.jsonUrl || 'default'}`;
            default:
                return `${type}:${JSON.stringify(config)}`;
        }
    }
    
    /**
     * アダプターを取得
     * @param {string} adapterId - アダプターID
     * @returns {APIAdapter|null} アダプターまたはnull
     */
    get(adapterId) {
        return this.adapters.get(adapterId) || null;
    }
    
    /**
     * アダプターを削除
     * @param {string} adapterId - アダプターID
     * @returns {boolean} 削除成功フラグ
     */
    remove(adapterId) {
        return this.adapters.delete(adapterId);
    }
    
    /**
     * 全てのアダプターを取得
     * @returns {Map<string, APIAdapter>} アダプターマップ
     */
    getAll() {
        return new Map(this.adapters);
    }
    
    /**
     * アダプター数を取得
     * @returns {number} アダプター数
     */
    size() {
        return this.adapters.size;
    }
    
    /**
     * 全てのアダプターをクリア
     */
    clear() {
        this.adapters.clear();
        console.log('全てのアダプターをクリアしました');
    }
    
    /**
     * アダプターの設定を更新
     * @param {string} adapterId - アダプターID
     * @param {Object} newConfig - 新しい設定
     * @returns {boolean} 更新成功フラグ
     */
    updateConfig(adapterId, newConfig) {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) {
            console.warn(`アダプターが見つかりません: ${adapterId}`);
            return false;
        }
        
        // アダプターの設定を更新
        if (adapter.config) {
            adapter.config = { ...adapter.config, ...newConfig };
        }
        
        // APIクライアントの設定も更新
        if (adapter.apiClient) {
            adapter.apiClient.updateConfig(newConfig);
        }
        
        console.log(`アダプター設定を更新: ${adapterId}`);
        return true;
    }
    
    /**
     * アダプターの状態を取得
     * @param {string} adapterId - アダプターID
     * @returns {Object|null} アダプター状態またはnull
     */
    getStatus(adapterId) {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) {
            return null;
        }
        
        return {
            id: adapterId,
            type: adapter.constructor.name,
            displayName: adapter.displayName,
            instanceUrl: adapter.instanceUrl,
            username: adapter.username,
            lastFetchTime: adapter.lastFetchTime,
            config: adapter.config
        };
    }
    
    /**
     * 全てのアダプターの状態を取得
     * @returns {Array<Object>} アダプター状態の配列
     */
    getAllStatus() {
        const statuses = [];
        for (const [id, adapter] of this.adapters) {
            statuses.push(this.getStatus(id));
        }
        return statuses;
    }
}

// ========================================
// インターフェース定義
// ========================================

/**
 * 統一されたAPIアダプターインターフェース
 */
class APIAdapter {
    /**
     * 投稿を取得する
     * @returns {Promise<Post[]>} 投稿の配列
     */
    async fetchPosts() {
        throw new Error('fetchPosts must be implemented by subclass');
    }
    
    /**
     * 追加の投稿を取得する
     * @param {number} limit - 取得する投稿数
     * @returns {Promise<Post[]>} 投稿の配列
     */
    async fetchMorePosts(limit) {
        throw new Error('fetchMorePosts must be implemented by subclass');
    }
    
    /**
     * ユーザー情報を取得する
     * @returns {Promise<UserInfo>} ユーザー情報
     */
    async getUserInfo() {
        throw new Error('getUserInfo must be implemented by subclass');
    }
    
    /**
     * 生の投稿データを取得する（時間フィルタリングなし）
     * @param {Set<string>} existingIds - 既存の投稿IDセット
     * @returns {Promise<Post[]>} 生の投稿データ
     */
    async fetchMorePostsRaw(existingIds) {
        throw new Error('fetchMorePostsRaw must be implemented by subclass');
    }
}

/**
 * 投稿データの型定義
 */
class Post {
    constructor(data = {}) {
        this.id = data.id || '';
        this.content = data.content || '';
        this.images = data.images || [];
        this.timestamp = data.timestamp || new Date();
        this.timeText = data.timeText || '';
        this.reactions = data.reactions || { favorites: 0, reblogs: 0, replies: 0 };
        this.source = data.source || '';
        this.sourceIcon = data.sourceIcon || '';
        this.sourceInstance = data.sourceInstance || '';
        this.sourceDisplayName = data.sourceDisplayName || '';
        this.sourceIconImage = data.sourceIconImage || null;
        this.originalUrl = data.originalUrl || null;
        this.extraData = data.extraData || {};
    }
}

/**
 * ユーザー情報の型定義
 */
class UserInfo {
    constructor(data = {}) {
        this.id = data.id || '';
        this.username = data.username || '';
        this.displayName = data.displayName || '';
        this.avatar = data.avatar || null;
        this.description = data.description || '';
    }
}

// ========================================
// 基底アダプタークラス
// ========================================

class BaseSNSAdapter extends APIAdapter {
    constructor(instanceUrl, username, config = {}) {
        super();
        this.instanceUrl = instanceUrl;
        this.username = username;
        // グローバル設定とローカル設定をマージ
        const globalSettings = (typeof window !== 'undefined' && window.globalSettingsManager) 
            ? window.globalSettingsManager 
            : null;
        this.config = globalSettings ? globalSettings.mergeSettings({ ...this.getDefaultConfig(), ...config }) : { ...this.getDefaultConfig(), ...config };
        this.lastFetchTime = 0;
        this.displayName = config.displayName || username;
        
        // 共通APIクライアントを初期化
        this.apiClient = new APIClient({
            useProxy: this.getUseProxy(),
            timeout: getConfigNumberLocal('REQUEST_TIMEOUT', 10000),
            retryAttempts: getConfigNumberLocal('RETRY_ATTEMPTS', 3)
        });
    }
    
    getDefaultConfig() {
        return {
            rateLimit: 15000, // デフォルト値（各アダプターでオーバーライド）
            maxPosts: getConfigNumberLocal('UI_LIMITS.MAX_POSTS', 20),
            includeReplies: false,
            includeReblogs: false,
            timeBasedFetch: false,
            daysBack: 5,
            useProxy: true,
            maxImages: getConfigNumberLocal('UI_LIMITS.MAX_IMAGES_PER_POST', 6)
        };
    }
    
    // 共通の設定アクセスメソッド
    getTimeBasedFetch() {
        return this.config.timeBasedFetch || false;
    }
    
    getDaysBack() {
        return this.config.daysBack || 5;
    }
    
    getMaxPosts() {
        return this.config.maxPosts || getConfigNumberLocal('UI_LIMITS.MAX_POSTS', 20);
    }
    
    getMaxImages() {
        return this.config.maxImages || getConfigNumberLocal('UI_LIMITS.MAX_IMAGES_PER_POST', 6);
    }
    
    getUseProxy() {
        return this.config.useProxy !== false; // デフォルトはtrue
    }
    
    // 時間ベース取得の共通ロジック
    getCutoffDate() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.getDaysBack());
        return cutoffDate;
    }
    
    // 時間フィルタリングの共通ロジック
    filterByTime(posts, cutoffDate) {
        return posts.filter(post => {
            const postDate = new Date(post.timestamp || post.createdAt || post.created_at);
            return postDate >= cutoffDate;
        });
    }
    
    // 重複チェックの共通ロジック
    filterUniquePosts(posts, existingIds) {
        return posts.filter(post => !existingIds.has(post.id));
    }
    
    async checkRateLimit() {
        const now = Date.now();
        const timeSinceLastFetch = now - this.lastFetchTime;
        
        if (timeSinceLastFetch < this.config.rateLimit) {
            const waitTime = this.config.rateLimit - timeSinceLastFetch;
            console.log(`${this.displayName}: レート制限 ${Math.ceil(waitTime/1000)}秒待機`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastFetchTime = Date.now();
    }
    
    async fetchPosts() {
        throw new Error('fetchPosts must be implemented by subclass');
    }
    
    async fetchMorePosts(cutoffDate, existingIds) {
        console.log(`${this.displayName}: 追加投稿取得中... (${cutoffDate.toISOString()} 以降)`);
        
        try {
            // 各アダプターで実装する必要があるメソッド
            const rawPosts = await this.fetchMorePostsFromAPI(cutoffDate, existingIds);
            
            // 共通の後処理
            const posts = rawPosts.map(post => this.createPost(post));
            
            console.log(`${this.displayName}: 追加読み込み - ${posts.length}件の投稿を取得`);
            return posts;
            
        } catch (error) {
            console.error(`${this.displayName}: 追加投稿取得エラー:`, error);
            return [];
        }
    }
    
    async fetchMorePostsFromAPI(cutoffDate, existingIds) {
        throw new Error('fetchMorePostsFromAPI must be implemented by subclass');
    }
    
    /**
     * 新しいメソッド: 時間フィルタリングなしで生の投稿データを取得
     */
    async fetchMorePostsRaw(existingIds) {
        console.log(`${this.displayName}: 生データ取得中...`);
        
        try {
            // 各アダプターで実装する必要があるメソッド
            const rawPosts = await this.fetchMorePostsFromAPIRaw(existingIds);
            
            // 時間フィルタリングは行わず、重複チェックのみ
            const uniquePosts = this.filterUniquePosts(rawPosts, existingIds);
            
            // 投稿オブジェクトを作成
            const posts = uniquePosts.map(post => this.createPost(post));
            
            console.log(`${this.displayName}: 生データ取得完了 - ${posts.length}件`);
            return posts;
            
        } catch (error) {
            console.error(`${this.displayName}: 生データ取得エラー:`, error);
            return [];
        }
    }
    
    /**
     * 新しいメソッド: APIから生の投稿データを取得（時間制限なし）
     */
    async fetchMorePostsFromAPIRaw(existingIds) {
        // デフォルト実装: より多くの投稿を取得
        const maxPosts = Math.max(this.getMaxPosts() * 3, 100); // 通常の3倍または最低100件
        console.log(`${this.displayName}: 生データAPI制限値: ${maxPosts}件で取得`);
        
        // 既存のAPI取得ロジックを使用（時間制限は各アダプターで実装）
        return await this.fetchMorePostsFromAPI(new Date(0), existingIds); // 1970年以降 = 実質制限なし
    }
    
    // 共通のAPI取得ロジック（APIClientを使用）
    async fetchWithRetry(url, options = {}) {
        return await this.apiClient.request(url, options, this.displayName);
    }
    
    // 共通のAPI制限値計算ロジック
    calculateApiLimit(maxPosts, multiplier = getConfigNumberLocal('API_LIMITS.MULTIPLIER', 2), maxLimit = getConfigNumberLocal('API_LIMITS.MISSKEY_MAX', 100)) {
        const apiLimit = Math.min(maxPosts * multiplier, maxLimit);
        console.log(`${this.displayName}: API制限値: ${apiLimit}件で取得`);
        return apiLimit;
    }
    
    // 共通のエラーハンドリング
    handleFetchError(error, context = '取得') {
        console.error(`${this.displayName}: ${context}エラー:`, error);
        return [this.createErrorPost(error.message)];
    }
    
    // 共通の投稿データ変換ロジック
    createPostFromApiData(data, additionalFields = {}) {
        return {
            id: data.id || generateId(data.content, data.timestamp),
            content: this.processContent(data.content || ''),
            images: this.extractImages(data),
            timestamp: new Date(data.timestamp || data.createdAt || data.created_at),
            reactions: this.extractReactions(data),
            sourceIcon: this.config.sourceIcon || '[API]',
            sourceDisplayName: this.config.sourceDisplayName || this.displayName,
            sourceIconImage: this.config.sourceIconImage,
            originalUrl: this.generateOriginalUrl(data),
            ...additionalFields
        };
    }
    
    // 共通のコンテンツ処理
    processContent(content) {
        if (!content) return '';
        return processPostContent(content);
    }
    
    // 共通の画像抽出（各アダプターでオーバーライド）
    extractImages(data) {
        return [];
    }
    
    // 共通のリアクション抽出（各アダプターでオーバーライド）
    extractReactions(data) {
        return { favorites: 0, reblogs: 0, replies: 0 };
    }
    
    // 共通のオリジナルURL生成（各アダプターでオーバーライド）
    generateOriginalUrl(data) {
        return null;
    }
    
    createPost(data) {
        return new Post({
            id: data.id || generateId(data.content, data.timestamp),
            content: processPostContent(data.content || ''),
            images: data.images || [],
            timestamp: data.timestamp || new Date(),
            timeText: data.timeText || formatRelativeTime(data.timestamp),
            reactions: data.reactions || { favorites: 0, reblogs: 0, replies: 0 },
            source: this.username,
            sourceIcon: data.sourceIcon || '[取得]',
            sourceInstance: this.instanceUrl,
            sourceDisplayName: data.sourceDisplayName || this.displayName,
            sourceIconImage: data.sourceIconImage || null,
            originalUrl: data.originalUrl || null,
            extraData: data.extraData || {}
        });
    }
    
    createErrorPost(message) {
        return this.createPost({
            content: `${this.displayName} の取得に失敗しました: ${message}`,
            sourceIcon: '[エラー]',
            sourceDisplayName: this.config.sourceDisplayName || this.displayName,
            sourceIconImage: this.config.sourceIconImage,
            timeText: '今'
        });
    }
}

// ========================================
// Misskeyアダプター
// ========================================

class MisskeyAdapter extends BaseSNSAdapter {
    constructor(instanceUrl, username, config = {}) {
        super(instanceUrl, username, config);
        this.apiUrl = `${instanceUrl}/api`;
        this.profileUrl = `${instanceUrl}/@${username}`;
    }
    
    getDefaultConfig() {
        return {
            ...super.getDefaultConfig(),
            rateLimit: getConfigNumberLocal('RATE_LIMITS.MISSKEY', 30000),
            sourceIcon: '[API]'
        };
    }
    
    async fetchPosts() {
        await this.checkRateLimit();
        
        try {
            const result = await this.fetchViaAPI();
            console.log(`${this.displayName}: API取得結果 - ${result.posts.length}件の投稿`);
            
            // APIが正常に動作している場合は、投稿が0件でもフォールバックしない
            if (result.success) {
                return result.posts;
            } else {
                console.log(`${this.displayName}: API失敗のためフォールバック実行`);
                return await this.fetchViaFallback();
            }
        } catch (error) {
            return this.handleFetchError(error);
        }
    }
    
    async fetchViaAPI() {
        console.log(`${this.displayName}: Misskey API 取得中...`);
        
        const userInfo = await this.getCachedUserInfo();
        
        // 時間ベース取得の設定を確認
        const timeBasedFetch = this.getTimeBasedFetch();
        const daysBack = this.getDaysBack();
        const maxPosts = this.getMaxPosts();
        
        console.log(`${this.displayName}: 設定確認 - maxPosts: ${maxPosts}, timeBasedFetch: ${timeBasedFetch}, daysBack: ${daysBack}`);
        
        // 統合された時間フィルタリングを使用するため、より多くの投稿を取得
        // 時間フィルタリングはPlanetAggregatorで実行される
        const apiLimit = this.calculateApiLimit(maxPosts, getConfigNumberLocal('API_LIMITS.MULTIPLIER', 2), getConfigNumberLocal('API_LIMITS.MISSKEY_MAX', 100));
        
        const notes = await this.fetchWithRetry(`${this.apiUrl}/users/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userInfo.id,
                limit: apiLimit,
                includeReplies: this.config.includeReplies,
                includeMyRenotes: this.config.includeReblogs
            })
        });
        
        console.log(`${this.displayName}: APIから取得した投稿数: ${notes ? notes.length : 0}`);
        console.log(`${this.displayName}: ユーザーID: ${userInfo.id}`);
        
        const posts = notes.map(note => this.createPostFromApiData(note, {
            content: note.text || note.cw || '',
            timestamp: new Date(note.createdAt),
            originalUrl: `${this.instanceUrl}/notes/${note.id}`
        }));
        
        // APIが正常に動作した場合は成功フラグを返す
        return {
            success: true,
            posts: posts
        };
    }
    
    async getCachedUserInfo() {
        const cacheKey = `user:${this.instanceUrl}:${this.username}`;
        
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < getConfigNumberLocal('USER_CACHE_DURATION', 24 * 60 * 60 * 1000)) {
                    console.log(`${this.displayName}: ユーザー情報キャッシュから取得`);
                    return parsed.data;
                }
                localStorage.removeItem(cacheKey);
            }
        } catch {}
        
        console.log(`${this.displayName}: ユーザー情報API取得中...`);
        const userInfo = await this.fetchWithRetry(`${this.apiUrl}/users/show`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: this.username })
        });
        
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: userInfo,
                timestamp: Date.now()
            }));
        } catch {}
        
        return userInfo;
    }
    
    // Misskey固有の画像抽出
    extractImages(note) {
        if (!note.files || !Array.isArray(note.files)) return [];
        
        return note.files
            .filter(file => file.type && file.type.startsWith('image/'))
            .slice(0, this.getMaxImages())
            .map(file => ({
                url: file.url,
                alt: file.name || '',
                width: file.properties?.width,
                height: file.properties?.height
            }));
    }
    
    // Misskey固有のリアクション抽出
    extractReactions(note) {
        return {
            favorites: note.reactionCount || 0,
            reblogs: note.renoteCount || 0,
            replies: note.repliesCount || 0
        };
    }
    
    // Misskey固有のオリジナルURL生成
    generateOriginalUrl(note) {
        return `${this.instanceUrl}/notes/${note.id}`;
    }
    
    async fetchMorePostsFromAPI(cutoffDate, existingIds) {
        const userInfo = await this.getCachedUserInfo();
        const maxPosts = this.getMaxPosts();
        
        // より多くの投稿を取得して時間フィルタリング
        const apiLimit = this.calculateApiLimit(maxPosts, getConfigNumberLocal('API_LIMITS.MULTIPLIER', 2), getConfigNumberLocal('API_LIMITS.MISSKEY_MAX', 100));
        
        const allNotes = await this.fetchWithRetry(`${this.apiUrl}/users/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userInfo.id,
                limit: apiLimit,
                includeReplies: this.config.includeReplies,
                includeMyRenotes: this.config.includeReblogs
            })
        });
        
        // 重複チェック（時間フィルタリングはPlanetAggregatorで実行）
        const uniqueNotes = this.filterUniquePosts(allNotes, existingIds);
        
        console.log(`${this.displayName}: 追加読み込み - 取得: ${allNotes.length}件, 重複除外後: ${uniqueNotes.length}件`);
        
        return uniqueNotes.map(note => this.createPostFromApiData(note, {
            content: note.text || note.cw || '',
            timestamp: new Date(note.createdAt),
            originalUrl: `${this.instanceUrl}/notes/${note.id}`
        }));
    }
    
    /**
     * 時間制限なしで生の投稿データを取得
     */
    async fetchMorePostsRaw(existingIds) {
        console.log(`${this.displayName}: 生データ取得開始（時間制限なし）`);
        
        try {
            const userInfo = await this.getCachedUserInfo();
            
            // Misskeyの最大制限値は100なので、それを超えないように修正
            const apiLimit = this.calculateApiLimit(50, getConfigNumberLocal('API_LIMITS.MULTIPLIER', 2), getConfigNumberLocal('API_LIMITS.MISSKEY_MAX', 100));
            
            const allNotes = await this.fetchWithRetry(`${this.apiUrl}/users/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userInfo.id,
                    limit: apiLimit,
                    includeReplies: this.config.includeReplies,
                    includeMyRenotes: this.config.includeReblogs
                })
            });
            
            // 重複チェックのみ（時間フィルタリングは後で実行）
            const uniqueNotes = allNotes.filter(note => !existingIds.has(note.id));
            
            console.log(`${this.displayName}: 生データ取得完了 - 取得: ${allNotes.length}件, 重複除外後: ${uniqueNotes.length}件`);
            
            // 投稿データを作成（時間フィルタリングなし）
            return uniqueNotes.map(note => this.createPostFromApiData(note, {
                content: note.text || note.cw || '',
                timestamp: new Date(note.createdAt),
                originalUrl: `${this.instanceUrl}/notes/${note.id}`
            }));
            
        } catch (error) {
            console.error(`${this.displayName}: 生データ取得エラー:`, error);
            return [];
        }
    }
    
    async fetchViaFallback() {
        console.log(`${this.displayName}: フォールバック実行`);
        return [this.createPost({
            content: `${this.username} はJavaScript必須のSPAです。\n\nMisskey APIを使用して投稿を取得してください。`,
            sourceIcon: '[SPA]',
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
            timeText: 'SPA検出'
        })];
    }
}

// ========================================
// Mastodonアダプター
// ========================================

class MastodonAdapter extends BaseSNSAdapter {
    constructor(instanceUrl, username, config = {}) {
        super(instanceUrl, username, config);
        this.apiUrl = `${instanceUrl}/api/v1`;
        this.profileUrl = `${instanceUrl}/@${username}`;
    }
    
    getDefaultConfig() {
        return {
            ...super.getDefaultConfig(),
            rateLimit: getConfigNumberLocal('RATE_LIMITS.MASTODON', 20000),
            sourceIcon: '[API]'
        };
    }
    
    async fetchPosts() {
        await this.checkRateLimit();
        
        try {
            const apiPosts = await this.fetchViaAPI();
            return apiPosts.length > 0 ? apiPosts : await this.fetchViaFallback();
        } catch (error) {
            return this.handleFetchError(error);
        }
    }
    
    async fetchViaAPI() {
        console.log(`${this.displayName}: Mastodon API 取得中...`);
        
        try {
            // ユーザー名からアカウント情報を取得
            const userInfo = await this.getAccountByUsername();
            if (!userInfo) {
                throw new Error('ユーザー情報の取得に失敗しました');
            }
            
            // アカウントの公開投稿を取得
            const statuses = await this.fetchAccountStatuses(userInfo.id);
            return statuses;
            
        } catch (error) {
            console.error(`${this.displayName}: API取得失敗:`, error.message);
            throw error;
        }
    }
    
    async getAccountByUsername() {
        const cacheKey = `mastodon-user:${this.instanceUrl}:${this.username}`;
        
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < getConfigNumberLocal('USER_CACHE_DURATION', 24 * 60 * 60 * 1000)) {
                    console.log(`${this.displayName}: ユーザー情報キャッシュから取得`);
                    return parsed.data;
                }
                localStorage.removeItem(cacheKey);
            }
        } catch {}
        
        console.log(`${this.displayName}: ユーザー情報API取得中...`);
        
        try {
            // ユーザー名からアカウント情報を取得（認証なし）
            const account = await this.fetchWithRetry(`${this.apiUrl}/accounts/lookup?acct=${this.username}`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'PlanetAggregator/1.0'
                }
            });
            
            // キャッシュに保存
            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: account,
                    timestamp: Date.now()
                }));
            } catch {}
            
            return account;
            
        } catch (error) {
            console.error(`${this.displayName}: ユーザー情報取得エラー:`, error.message);
            throw error;
        }
    }
    
    async fetchAccountStatuses(accountId) {
        try {
            // 時間ベース取得の設定を確認
            const timeBasedFetch = this.getTimeBasedFetch();
            const daysBack = this.getDaysBack();
            const maxPosts = this.getMaxPosts();
            
            console.log(`${this.displayName}: 設定確認 - maxPosts: ${maxPosts}, timeBasedFetch: ${timeBasedFetch}, daysBack: ${daysBack}`);
            
            // 統合された時間フィルタリングを使用するため、より多くの投稿を取得
            // 時間フィルタリングはPlanetAggregatorで実行される
            const apiLimit = this.calculateApiLimit(maxPosts, getConfigNumberLocal('API_LIMITS.MULTIPLIER', 2), getConfigNumberLocal('API_LIMITS.MASTODON_MAX', 40));
            
            const statuses = await this.fetchWithRetry(`${this.apiUrl}/accounts/${accountId}/statuses?exclude_replies=true&exclude_reblogs=false&limit=${apiLimit}`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'PlanetAggregator/1.0'
                }
            });
            
            return statuses.map(status => this.createPostFromApiData(status, {
                content: this.stripHtmlContent(status.content),
                timestamp: new Date(status.created_at),
                originalUrl: status.url || status.uri
            }));
            
        } catch (error) {
            console.error(`${this.displayName}: 投稿取得エラー:`, error.message);
            throw error;
        }
    }
    
    // Mastodon固有のHTML処理
    stripHtmlContent(htmlContent) {
        if (!htmlContent) return '';
        
        // 簡易HTML除去（Mastodon投稿用）
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // <br>タグを改行に変換
        tempDiv.querySelectorAll('br').forEach(br => {
            br.replaceWith('\n');
        });
        
        // <p>タグの間に改行を追加
        tempDiv.querySelectorAll('p').forEach(p => {
            p.insertAdjacentText('afterend', '\n');
        });
        
        return tempDiv.textContent || tempDiv.innerText || '';
    }
    
    // Mastodon固有のコンテンツ処理
    processContent(content) {
        return this.stripHtmlContent(content);
    }
    
    // Mastodon固有の画像抽出
    extractImages(status) {
        if (!status.media_attachments || !Array.isArray(status.media_attachments)) return [];
        
        return status.media_attachments
            .filter(media => media.type === 'image')
            .slice(0, this.getMaxImages())
            .map(media => ({
                url: media.url,
                alt: media.description || '',
                width: media.meta?.original?.width,
                height: media.meta?.original?.height
            }));
    }
    
    // Mastodon固有のリアクション抽出
    extractReactions(status) {
        return {
            favorites: status.favourites_count || 0,
            reblogs: status.reblogs_count || 0,
            replies: status.replies_count || 0
        };
    }
    
    // Mastodon固有のオリジナルURL生成
    generateOriginalUrl(status) {
        return status.url || status.uri;
    }
    
    async fetchMorePostsFromAPI(cutoffDate, existingIds) {
        const userInfo = await this.getAccountByUsername();
        if (!userInfo) {
            throw new Error('ユーザー情報の取得に失敗しました');
        }
        
        const maxPosts = this.getMaxPosts();
        
        // より多くの投稿を取得して時間フィルタリング
        const apiLimit = this.calculateApiLimit(maxPosts, 2, 40); // 取得倍率2、Mastodon最大40件
        
        const allStatuses = await this.fetchWithRetry(`${this.apiUrl}/accounts/${userInfo.id}/statuses?exclude_replies=true&exclude_reblogs=false&limit=${apiLimit}`, {
            method: 'GET',
            headers: { 
                'Accept': 'application/json',
                'User-Agent': 'PlanetAggregator/1.0'
            }
        });
        
        // 重複チェック（時間フィルタリングはPlanetAggregatorで実行）
        const uniqueStatuses = this.filterUniquePosts(allStatuses, existingIds);
        
        console.log(`${this.displayName}: 追加読み込み - 取得: ${allStatuses.length}件, 重複除外後: ${uniqueStatuses.length}件`);
        
        return uniqueStatuses.map(status => this.createPostFromApiData(status, {
            content: this.stripHtmlContent(status.content),
            timestamp: new Date(status.created_at),
            originalUrl: status.url || status.uri
        }));
    }
    
    /**
     * 時間制限なしで生の投稿データを取得
     */
    async fetchMorePostsRaw(existingIds) {
        console.log(`${this.displayName}: 生データ取得開始（時間制限なし）`);
        
        try {
            const userInfo = await this.getAccountByUsername();
            if (!userInfo) {
                throw new Error('ユーザー情報の取得に失敗しました');
            }
            
            // Mastodonの制限も考慮して安全な値に設定
            const apiLimit = this.calculateApiLimit(20, getConfigNumberLocal('API_LIMITS.MULTIPLIER', 2), getConfigNumberLocal('API_LIMITS.MASTODON_MAX', 40));
            
            const allStatuses = await this.fetchWithRetry(`${this.apiUrl}/accounts/${userInfo.id}/statuses?exclude_replies=true&exclude_reblogs=false&limit=${apiLimit}`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'PlanetAggregator/1.0'
                }
            });
            
            // 重複チェックのみ（時間フィルタリングは後で実行）
            const uniqueStatuses = allStatuses.filter(status => !existingIds.has(status.id));
            
            console.log(`${this.displayName}: 生データ取得完了 - 取得: ${allStatuses.length}件, 重複除外後: ${uniqueStatuses.length}件`);
            
            // 投稿データを作成（時間フィルタリングなし）
            return uniqueStatuses.map(status => this.createPostFromApiData(status, {
                content: this.stripHtmlContent(status.content),
                timestamp: new Date(status.created_at),
                originalUrl: status.url || status.uri
            }));
            
        } catch (error) {
            console.error(`${this.displayName}: 生データ取得エラー:`, error);
            return [];
        }
    }
    
    async fetchViaFallback() {
        console.log(`${this.displayName}: フォールバック実行`);
        return [this.createPost({
            content: `${this.username} の投稿取得に失敗しました。\n\nMastodon APIを使用しましたが、データを取得できませんでした。`,
            sourceIcon: '[API失敗]',
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
            timeText: 'API失敗'
        })];
    }
}

// ========================================
// RSSアダプター
// ========================================

class RSSAdapter extends BaseSNSAdapter {
    constructor(feedUrl, config = {}) {
        super(feedUrl, 'rss', config);
        this.feedUrl = feedUrl;
        this.displayName = config.displayName || 'RSS Feed';
    }
    
    getDefaultConfig() {
        return {
            ...super.getDefaultConfig(),
            rateLimit: getConfigNumberLocal('RATE_LIMITS.RSS', 60000),
            sourceIcon: '[RSS]'
        };
    }
    
    async fetchPosts() {
        await this.checkRateLimit();
        
        try {
            const result = await this.fetchViaAPI();
            console.log(`${this.displayName}: RSS取得結果 - ${result.posts.length}件の投稿`);
            
            // RSSが正常に動作している場合は、投稿が0件でもフォールバックしない
            if (result.success) {
                return result.posts;
            } else {
                console.log(`${this.displayName}: RSS失敗のためフォールバック実行`);
                return await this.fetchViaFallback();
            }
        } catch (error) {
            return this.handleFetchError(error);
        }
    }
    
    async fetchViaAPI() {
        console.log(`${this.displayName}: RSS 取得中...`);
        
        // 時間ベース取得の設定を確認
        const timeBasedFetch = this.getTimeBasedFetch();
        const daysBack = this.getDaysBack();
        const maxPosts = this.getMaxPosts();
        
        console.log(`${this.displayName}: 設定確認 - maxPosts: ${maxPosts}, timeBasedFetch: ${timeBasedFetch}, daysBack: ${daysBack}`);
        
        // RSSフィードを取得
        const response = await this.fetchWithRetry(this.feedUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            returnText: true
        });
        
        // XMLをパース
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // パースエラーをチェック
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('RSS XMLのパースに失敗しました');
        }
        
        // アイテムを取得
        const items = xmlDoc.querySelectorAll('item');
        console.log(`${this.displayName}: RSSから取得したアイテム数: ${items.length}`);
        
        let posts = [];
        
        // 統合された時間フィルタリングを使用するため、より多くのアイテムを処理
        // 時間フィルタリングはPlanetAggregatorで実行される
        const processLimit = Math.min(items.length, maxPosts * getConfigNumberLocal('API_LIMITS.MULTIPLIER', 2));
        
        for (let i = 0; i < processLimit; i++) {
            const item = items[i];
            
            // 基本情報を取得
            const title = this.getTextContent(item, 'title') || '';
            const description = this.getTextContent(item, 'description') || '';
            const link = this.getTextContent(item, 'link') || '';
            const pubDate = this.getTextContent(item, 'pubDate') || '';
            const guid = this.getTextContent(item, 'guid') || link;
            
            // 日付を解析
            const itemDate = new Date(pubDate);
            
            // 投稿を作成（時間フィルタリングは後で実行）
            const post = this.createPostFromApiData({
                id: guid,
                content: title + (description ? '\n\n' + description : ''),
                timestamp: itemDate,
                originalUrl: link,
                images: this.extractImagesFromRSS(item)
            }, {
                reactions: {
                    favorites: 0,
                    reblogs: 0,
                    replies: 0
                },
                sourceIcon: this.config.sourceIcon || '[RSS]',
                sourceDisplayName: this.config.sourceDisplayName || this.displayName,
                sourceIconImage: this.config.sourceIconImage
            });
            
            posts.push(post);
        }
        
        console.log(`${this.displayName}: フィルタリング後 ${posts.length}件の投稿を取得`);
        
        return {
            success: true,
            posts: posts
        };
    }
    
    getTextContent(element, tagName) {
        const tag = element.querySelector(tagName);
        return tag ? tag.textContent.trim() : '';
    }
    
    // RSS固有の画像抽出
    extractImagesFromRSS(item) {
        const images = [];
        
        // description内の画像を抽出
        const description = this.getTextContent(item, 'description');
        if (description) {
            const imgRegex = /<img[^>]+src="([^"]+)"/gi;
            let match;
            while ((match = imgRegex.exec(description)) !== null) {
                const imageUrl = match[1];
                if (isValidImageUrl(imageUrl)) {
                    images.push(sanitizeImageUrl(imageUrl));
                }
            }
        }
        
        // メディア要素をチェック（RSS 2.0の拡張）
        const mediaContent = item.querySelector('media\\:content, content\\:encoded');
        if (mediaContent) {
            const mediaUrl = mediaContent.getAttribute('url');
            if (mediaUrl && isValidImageUrl(mediaUrl)) {
                images.push(sanitizeImageUrl(mediaUrl));
            }
        }
        
        return images.slice(0, this.getMaxImages());
    }
    
    // RSS固有の画像抽出（共通メソッドのオーバーライド）
    extractImages(data) {
        // dataがDOM要素の場合はextractImagesFromRSSを使用
        if (data && typeof data.querySelector === 'function') {
            return this.extractImagesFromRSS(data);
        }
        
        // dataがJavaScriptオブジェクトの場合は、既に処理済みの画像データを返す
        if (data && Array.isArray(data.images)) {
            return data.images;
        }
        
        // その他の場合は空配列を返す
        return [];
    }
    
    // RSS固有のリアクション抽出（共通メソッドのオーバーライド）
    extractReactions(data) {
        return { favorites: 0, reblogs: 0, replies: 0 };
    }
    
    // RSS固有のオリジナルURL生成（共通メソッドのオーバーライド）
    generateOriginalUrl(data) {
        return data.originalUrl || data.link;
    }
    
    
    async fetchMorePostsFromAPI(cutoffDate, existingIds) {
        // RSSの場合は追加読み込みは通常の取得と同じ処理
        // RSSフィードは通常、最新のエントリーのみを提供するため
        const response = await this.fetchWithRetry(this.feedUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            returnText: true
        });
        
        // XMLをパース
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // パースエラーをチェック
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('RSS XMLのパースに失敗しました');
        }
        
        // アイテムを取得
        const items = xmlDoc.querySelectorAll('item');
        console.log(`${this.displayName}: 追加読み込み用RSSから取得したアイテム数: ${items.length}`);
        
        let posts = [];
        const maxPosts = this.getMaxPosts();
        
        for (let i = 0; i < items.length && posts.length < maxPosts; i++) {
            const item = items[i];
            
            // 基本情報を取得
            const title = this.getTextContent(item, 'title') || '';
            const description = this.getTextContent(item, 'description') || '';
            const link = this.getTextContent(item, 'link') || '';
            const pubDate = this.getTextContent(item, 'pubDate') || '';
            const guid = this.getTextContent(item, 'guid') || link;
            
            // 日付を解析
            const itemDate = new Date(pubDate);
            
            // 重複チェック（時間フィルタリングはPlanetAggregatorで実行）
            if (existingIds.has(guid)) {
                continue; // 既存の投稿はスキップ
            }
            
            // 投稿データを作成
            const postData = this.createPostFromApiData({
                id: guid,
                content: title + (description ? '\n\n' + description : ''),
                timestamp: itemDate,
                originalUrl: link,
                images: this.extractImagesFromRSS(item)
            }, {
                reactions: {
                    favorites: 0,
                    reblogs: 0,
                    replies: 0
                },
                sourceIcon: this.config.sourceIcon || '[RSS]',
                sourceDisplayName: this.config.sourceDisplayName || this.displayName,
                sourceIconImage: this.config.sourceIconImage
            });
            
            posts.push(postData);
        }
        
        console.log(`${this.displayName}: 追加読み込み - ${posts.length}件の投稿を取得`);
        return posts;
    }
    
    /**
     * 時間制限なしで生の投稿データを取得
     */
    async fetchMorePostsRaw(existingIds) {
        console.log(`${this.displayName}: 生データ取得開始（時間制限なし）`);
        
        try {
            // RSSフィードを再取得
            const response = await this.fetchWithRetry(this.feedUrl, {
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                returnText: true
            });
            
            // XMLをパース
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response, 'text/xml');
            
            // パースエラーをチェック
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('RSS XMLのパースに失敗しました');
            }
            
            // アイテムを取得
            const items = xmlDoc.querySelectorAll('item');
            console.log(`${this.displayName}: 生データRSSから取得したアイテム数: ${items.length}`);
            
            let posts = [];
            
            // 全てのアイテムを処理（時間制限なし）
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                
                // 基本情報を取得
                const title = this.getTextContent(item, 'title') || '';
                const description = this.getTextContent(item, 'description') || '';
                const link = this.getTextContent(item, 'link') || '';
                const pubDate = this.getTextContent(item, 'pubDate') || '';
                const guid = this.getTextContent(item, 'guid') || link;
                
                // 重複チェック（時間フィルタリングは後で実行）
                if (existingIds.has(guid)) {
                    continue; // 既存の投稿はスキップ
                }
                
                // 日付を解析
                const itemDate = new Date(pubDate);
                
                // 投稿データを作成（時間フィルタリングなし）
                const postData = this.createPostFromApiData({
                    id: guid,
                    content: title + (description ? '\n\n' + description : ''),
                    timestamp: itemDate,
                    originalUrl: link,
                    images: this.extractImagesFromRSS(item)
                }, {
                    reactions: {
                        favorites: 0,
                        reblogs: 0,
                        replies: 0
                    },
                    sourceIcon: this.config.sourceIcon || '[RSS]',
                    sourceDisplayName: this.config.sourceDisplayName || this.displayName,
                    sourceIconImage: this.config.sourceIconImage
                });
                
                posts.push(postData);
            }
            
            console.log(`${this.displayName}: 生データ取得完了 - ${posts.length}件`);
            return posts;
            
        } catch (error) {
            console.error(`${this.displayName}: 生データ取得エラー:`, error);
            return [];
        }
    }
    
    async fetchViaFallback() {
        console.log(`${this.displayName}: フォールバック実行`);
        return [this.createPost({
            content: `RSSフィードの取得に失敗しました。\n\nフィードURL: ${this.feedUrl}`,
            sourceIcon: '[RSS失敗]',
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
            timeText: 'RSS失敗'
        })];
    }
}

// ========================================
// Last.fm静的アダプター（GitHub Actions版）
// ========================================

/**
 * Last.fm静的JSONファイルアダプター
 * GitHub Actionsで生成された静的JSONファイルを読み込む
 */
class LastfmStaticAdapter extends BaseSNSAdapter {
    constructor(instanceUrl, username, options = {}) {
        super('', 'lastfm-user', {
            ...options,
            displayName: options.displayName || 'Last.fm',
            sourceIcon: options.sourceIcon || '[♪]',
            sourceIconImage: options.sourceIconImage,
            rateLimit: options.rateLimit || 5000 // 静的ファイルなので短い間隔
        });
        
        this.jsonUrl = options.jsonUrl || './lastfm-data.json';
        
        // sourceIconImageを明示的に設定（設定ファイルの値を使用）
        this.sourceIconImage = options.sourceIconImage;
        
        console.log(`Last.fm静的アダプター: JSONファイルを使用 (${this.jsonUrl})`);
    }
    
    /**
     * fetchPostsメソッドを実装（BaseSNSAdapterで要求される）
     */
    async fetchPosts() {
        return await this.fetchRawPosts();
    }
    
    /**
     * 静的JSONファイルからscrobblesを取得
     */
    async fetchRawPosts() {
        try {
            console.log(`${this.displayName}: 静的JSONファイルから音楽データを取得中...`);
            
            const response = await fetch(this.jsonUrl);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`${this.displayName}: JSONファイルが見つかりません`);
                    return this.createSetupMessage();
                }
                throw new Error(`JSONファイル取得エラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Last.fm APIの標準的なレスポンス形式を想定
            const tracks = data.recenttracks?.track || [];
            console.log(`${this.displayName}: ${tracks.length}件の音楽データを取得`);
            
            return this.parseLastfmTracks(tracks);
            
        } catch (error) {
            console.error(`${this.displayName}: 取得エラー:`, error);
            return this.createErrorMessage(error);
        }
    }
    
    /**
     * Last.fmトラックデータをpostオブジェクトに変換
     */
    parseLastfmTracks(tracks) {
        const posts = [];
        
        tracks.forEach(track => {
            try {
                // "Now playing"は除外（GitHub Actionsでは通常含まれない）
                if (track['@attr'] && track['@attr'].nowplaying) {
                    return;
                }
                
                const post = this.createPostFromTrack(track);
                if (post) {
                    posts.push(post);
                }
            } catch (error) {
                console.warn(`${this.displayName}: トラック解析エラー:`, error);
            }
        });
        
        return posts.slice(0, this.maxPosts);
    }
    
    /**
     * トラックデータからpostオブジェクトを作成
     */
    createPostFromTrack(track) {
        const artist = track.artist?.['#text'] || track.artist?.name || 'Unknown Artist';
        const trackName = track.name || 'Unknown Track';
        const album = track.album?.['#text'] || '';
        const timestamp = track.date?.uts ? parseInt(track.date.uts) * 1000 : Date.now();
        
        // コンパクトな楽曲情報を構成
        let content = `🎵 ${trackName}`;
        if (artist) {
            content += ` / ${artist}`;
        }
        if (album) {
            content += ` (${album})`;
        }
        
        // Last.fmリンクをHTMLリンクとして追加
        const trackUrl = track.url;
        if (trackUrl) {
            content += `\n🔗 <a href="${trackUrl}" target="_blank">Last.fmで見る</a>`;
        }
        
        // アルバムアートを取得（別途表示用）
        const albumArtUrl = this.extractAlbumArtForIcon(track);
        
        return this.createPost({
            content,
            timestamp,
            images: [],
            sourceIcon: this.sourceIcon,
            sourceDisplayName: this.displayName,
            sourceIconImage: this.sourceIconImage, // 元のLast.fmロゴを使用
            link: trackUrl,
            timeText: formatRelativeTime(new Date(timestamp)),
            extraData: {
                type: 'lastfm_scrobble',
                artist,
                track: trackName,
                album,
                lastfmUrl: trackUrl,
                albumArtUrl: albumArtUrl // アルバムアートURLを追加
            }
        });
    }
    
    /**
     * アイコン用のアルバムアート取得
     */
    extractAlbumArtForIcon(track) {
        if (track.image && Array.isArray(track.image)) {
            // アイコンサイズに適したサイズを選択
            const imageUrl = track.image.find(img => img.size === 'small')?.['#text'] ||
                           track.image.find(img => img.size === 'medium')?.['#text'] ||
                           track.image[track.image.length - 1]?.['#text'];
            
            if (imageUrl && imageUrl.trim() && !imageUrl.includes('default')) {
                return imageUrl;
            }
        }
        return null;
    }

    /**
     * アルバムアートワークの抽出
     */
    extractAlbumArt(track, trackName, artist) {
        const images = [];
        
        if (track.image && Array.isArray(track.image)) {
            // コンパクト表示のため小さめの画像を優先
            const imageUrl = track.image.find(img => img.size === 'medium')?.['#text'] ||
                           track.image.find(img => img.size === 'small')?.['#text'] ||
                           track.image.find(img => img.size === 'large')?.['#text'] ||
                           track.image[track.image.length - 1]?.['#text'];
            
            if (imageUrl && imageUrl.trim() && !imageUrl.includes('default')) {
                images.push({
                    url: imageUrl,
                    alt: `${trackName} - ${artist}のアルバムアート`
                });
            }
        }
        
        return images.slice(0, 1); // 1枚のアートワークのみ
    }
    
    /**
     * セットアップメッセージを作成
     */
    createSetupMessage() {
        return [this.createPost({
            content: `🎵 **Last.fm統合準備中**\n\nGitHub Actionsによる自動同期システムをセットアップしてください。\n\n📋 セットアップ手順:\n1. GitHubリポジトリを作成\n2. Last.fm APIキーを取得\n3. GitHub ActionsワークフローをBuddiesに設定\n4. 30分後に音楽データが表示されます`,
            sourceIcon: '[🎵 セットアップ]',
            sourceDisplayName: this.displayName,
            sourceIconImage: this.sourceIconImage,
            timeText: 'セットアップ待ち',
            extraData: { type: 'setup_message' }
        })];
    }
    
    /**
     * エラーメッセージを作成
     */
    createErrorMessage(error) {
        const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');
        const content = isNetworkError
            ? `🎵 **一時的に音楽データを取得できません**\n\nネットワークの問題、またはGitHub Actionsの同期に遅延が発生している可能性があります。\n\nしばらく後に再度お試しください。`
            : `🎵 **音楽データの取得に失敗**\n\nGitHub Actionsの設定に問題があるか、Last.fm APIの制限に達している可能性があります。\n\n設定を確認してください。`;
        
        return [this.createPost({
            content,
            sourceIcon: '[🎵 エラー]',
            sourceDisplayName: this.displayName,
            sourceIconImage: this.sourceIconImage,
            timeText: 'エラー',
            extraData: { type: 'error_message', error: error.message }
        })];
    }
}

// ========================================
// メインアグリゲータークラス
// ========================================

// ========================================
// アプリケーション初期化
// ========================================

let planetAggregator = null;
let autoRefreshTimer = null;

async function initializePlanetV2() {
    try {
        // 設定の初期化
        const configAvailable = initializeConfig();
        
        if (!configAvailable) {
            console.warn('設定管理システムが利用できません。デフォルト値で動作します。');
        }
        
        planetAggregator = new PlanetAggregator();
        
        // 設定管理システムとの連携
        if (typeof window !== 'undefined' && window.initializeDataSourceManager) {
            const manager = await window.initializeDataSourceManager();
            const dataSources = manager.getEnabledDataSources();
            
            console.log(`設定から ${dataSources.length}件のデータソースを読み込み`);
            
            dataSources.forEach(source => {
                try {
                    if (manager.validateDataSource(source)) {
                        // 各タイプ別の処理
                        if (source.type === 'rss') {
                            planetAggregator.addAdapter(
                                source.type,
                                source.config.feedUrl,
                                null, // RSSの場合はusername不要
                                {
                                    displayName: source.config.displayName,
                                    sourceIconImage: source.config.sourceIconImage,
                                    description: source.config.description,
                                    ...source.fetchSettings
                                }
                            );
                        } else if (source.type === 'lastfm_static') {
                            planetAggregator.addAdapter(
                                source.type,
                                null, // lastfm_staticの場合はinstanceUrl不要
                                null, // username不要
                                {
                                    displayName: source.config.displayName,
                                    sourceIconImage: source.config.sourceIconImage,
                                    description: source.config.description,
                                    jsonUrl: source.config.jsonUrl,
                                    ...source.fetchSettings
                                }
                            );
                        } else {
                            planetAggregator.addAdapter(
                                source.type,
                                source.config.instanceUrl,
                                source.config.username,
                                {
                                    displayName: source.config.displayName,
                                    sourceIconImage: source.config.sourceIconImage,
                                    description: source.config.description,
                                    ...source.fetchSettings
                                }
                            );
                        }
                    }
                } catch (error) {
                    console.error(`データソース ${source.id} の追加に失敗:`, error);
                }
            });
        } else {
            // フォールバック設定
            console.warn('設定管理システムが見つかりません。フォールバック設定を使用');
            planetAggregator.addAdapter('misskey', 'https://tanoshii.site', 'health', {
                displayName: 'tanoshii.site',
                sourceIconImage: './tanoshiisite.jpg',
                description: 'フォールバック設定'
            });
        }
        
        await planetAggregator.fetchAllPosts();
        setupAutoRefresh();
        
    } catch (error) {
        console.error('Planet v2 初期化エラー:', error);
        // エラー時はフォールバック設定で続行
        if (!planetAggregator) {
            planetAggregator = new PlanetAggregator();
        }
        if (planetAggregator) {
            planetAggregator.fetchAllPosts();
        }
    }
}

function setupAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
    
    // 動的設定から自動更新間隔を取得
    const interval = getConfigNumberLocal('AUTO_REFRESH_INTERVAL', 30 * 60 * 1000);
    
    autoRefreshTimer = setInterval(() => {
        if (planetAggregator && !planetAggregator.isLoading) {
            console.log(`自動更新実行 (${interval/60000}分間隔)`);
            planetAggregator.fetchAllPosts();
        }
    }, interval);
    
    console.log(`自動更新を設定: ${interval/60000}分間隔`);
    
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            if (autoRefreshTimer) {
                clearInterval(autoRefreshTimer);
                autoRefreshTimer = null;
            }
        });
    }
}

// グローバル関数
function refreshPlanetV2() {
    if (planetAggregator) {
        planetAggregator.fetchAllPosts();
    }
}

function clearCache() {
    if (planetAggregator) {
        planetAggregator.clearCache();
    }
}

// グローバル関数はconfig-manager.jsに移動しました

// キャッシュ状態を取得する関数
function getCacheStatus() {
    if (planetAggregator) {
        return planetAggregator.getCacheStatus();
    }
    return null;
}

// キャッシュを強制的にクリアする関数
function forceClearCache() {
    if (planetAggregator) {
        planetAggregator.clearCache();
        console.log('キャッシュを強制的にクリアしました');
    }
}

// グローバル関数
function loadMorePosts() {
    if (typeof planetAggregator !== 'undefined' && planetAggregator) {
        planetAggregator.loadMorePosts();
    } else {
        console.error('Planet Aggregator が初期化されていません');
    }
}

// グローバル関数を公開（ブラウザ環境用）
if (typeof window !== 'undefined') {
    window.initializePlanetV2 = initializePlanetV2;
    window.loadMorePosts = loadMorePosts;
    window.getCacheStatus = getCacheStatus;
    window.forceClearCache = forceClearCache;
    window.PlanetAggregator = PlanetAggregator;
    window.AdapterFactory = AdapterFactory;
    window.APIClient = APIClient;
    window.ErrorHandler = ErrorHandler;
    window.MisskeyAdapter = MisskeyAdapter;
    window.MastodonAdapter = MastodonAdapter;
    window.RSSAdapter = RSSAdapter;
    window.BaseSNSAdapter = BaseSNSAdapter;
    window.APIAdapter = APIAdapter;
    window.Post = Post;
    window.UserInfo = UserInfo;
    window.ProxyManager = ProxyManager;
    window.errorHandler = errorHandler;
    // configValidatorはconfig-validator.jsで定義される
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // メインクラス
        PlanetAggregator,
        AdapterFactory,
        APIClient,
        ErrorHandler,
        
        // アダプタークラス
        MisskeyAdapter,
        MastodonAdapter,
        RSSAdapter,
        BaseSNSAdapter,
        APIAdapter,
        
        // データクラス
        Post,
        UserInfo,
        
        // ユーティリティクラス
        ProxyManager,
        
        // 関数
        initializePlanetV2,
        loadMorePosts,
        getCacheStatus,
        forceClearCache,
        
        // インスタンス
        errorHandler
    };
}