/**
 * Planet Aggregator v2 - 軽量版（統合版）
 * 1つのファイルに全ての機能を統合
 */

// ========================================
// 設定・定数
// ========================================

const CONFIG = {
    CACHE_DURATION: 30 * 60 * 1000,           // 30分キャッシュ
    USER_CACHE_DURATION: 24 * 60 * 60 * 1000, // ユーザー情報24時間
    MISSKEY_INTERVAL: 30 * 1000,              // 30秒間隔
    REQUEST_TIMEOUT: 10000,                   // 10秒タイムアウト
    RETRY_ATTEMPTS: 3,                        // リトライ回数
    MAX_POSTS: 20,                           // 最大投稿数
    MAX_IMAGES: 6,                           // 最大画像数
    AUTO_REFRESH_INTERVAL: 30 * 60 * 1000    // 30分自動更新
};

// ========================================
// グローバル設定管理
// ========================================

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
    
    // グローバル設定とローカル設定をマージ
    mergeSettings(localConfig) {
        const global = this.getGlobalSettings();
        return {
            ...localConfig,
            // グローバル設定で上書き可能な項目
            timeBasedFetch: localConfig.timeBasedFetch !== false && global.timeBasedFetch !== false,
            daysBack: global.daysBack || localConfig.daysBack || 5,
            useProxy: global.useProxy !== false && localConfig.useProxy !== false,
            autoRefreshInterval: global.autoRefreshInterval || localConfig.autoRefreshInterval || CONFIG.AUTO_REFRESH_INTERVAL
        };
    }
    
    // グローバル設定の更新
    updateGlobalSettings(newSettings) {
        this.globalSettings = { ...this.globalSettings, ...newSettings };
        console.log('グローバル設定を更新:', this.globalSettings);
    }
}

// グローバル設定マネージャーのインスタンス
const globalSettingsManager = new GlobalSettingsManager();

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
const MAX_CACHE_SIZE = 100;

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
        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
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
        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
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
    if (contentCache.size >= MAX_CACHE_SIZE) {
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
        return url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
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
// プロキシ管理クラス
// ========================================

class ProxyManager {
    constructor() {
        this.failedProxies = new Map();
        this.FAILURE_THRESHOLD = 3;
        this.RECOVERY_TIME = 5 * 60 * 1000;
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
// 基底アダプタークラス
// ========================================

class BaseSNSAdapter {
    constructor(instanceUrl, username, config = {}) {
        this.instanceUrl = instanceUrl;
        this.username = username;
        // グローバル設定とローカル設定をマージ
        this.config = globalSettingsManager.mergeSettings({ ...this.getDefaultConfig(), ...config });
        this.lastFetchTime = 0;
        this.displayName = config.displayName || username;
    }
    
    getDefaultConfig() {
        return {
            rateLimit: 15000,
            maxPosts: 20,
            includeReplies: false,
            includeReblogs: false,
            timeBasedFetch: false,
            daysBack: 5,
            useProxy: true,
            maxImages: CONFIG.MAX_IMAGES
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
        return this.config.maxPosts || 20;
    }
    
    getMaxImages() {
        return this.config.maxImages || CONFIG.MAX_IMAGES;
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
    
    async fetchWithRetry(url, options = {}) {
        const useProxy = this.getUseProxy();
        const proxies = useProxy ? proxyManager.getAvailableProxies() : [];
        
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                if (useProxy) {
                    // プロキシを使用してリクエストを試行
                    for (const proxy of proxies) {
                        try {
                            return await makeProxyRequest(proxy, url, options, this.displayName);
                        } catch (error) {
                            if (error.message.startsWith('RATE_LIMIT:')) {
                                const retryAfter = parseInt(error.message.split(':')[1]);
                                console.warn(`${this.displayName}: レート制限 ${retryAfter}秒待機 (試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);
                                
                                if (attempt < CONFIG.RETRY_ATTEMPTS) {
                                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                                    break; // プロキシループを抜けて次の試行へ
                                }
                            } else {
                                proxyManager.recordFailure(proxy);
                                console.warn(`${this.displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 失敗:`, error.message);
                                continue; // 次のプロキシを試行
                            }
                        }
                    }
                } else {
                    // 直接アクセス
                    return await makeDirectRequest(url, options, this.displayName);
                }
            } catch (error) {
                if (error.message.startsWith('RATE_LIMIT:')) {
                    const retryAfter = parseInt(error.message.split(':')[1]);
                    console.warn(`${this.displayName}: レート制限 ${retryAfter}秒待機 (試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);
                    
                    if (attempt < CONFIG.RETRY_ATTEMPTS) {
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    }
                } else {
                    console.warn(`${this.displayName}: 取得失敗:`, error.message);
                }
            }
            
            // 失敗した場合、バックオフしてリトライ
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
                const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.warn(`${this.displayName}: 投稿取得試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS} 失敗、${backoffMs}ms後にリトライ`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
        
        throw new Error(`${useProxy ? '全てのプロキシ' : '直接アクセス'}でAPI取得に失敗しました`);
    }
    
    createPost(data) {
        return {
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
            originalUrl: data.originalUrl || null
        };
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
            rateLimit: 30000, // 30秒間隔（デフォルト）
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
            console.error(`${this.displayName}: 取得エラー:`, error);
            return [this.createErrorPost(error.message)];
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
        const apiLimit = Math.min(maxPosts * 2, 100); // 最大100件まで
        console.log(`${this.displayName}: API制限値: ${apiLimit}件で取得`);
        
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
        
        const posts = notes.map(note => this.createPost({
            id: note.id,
            content: note.text || note.cw || '',
            images: this.extractImages(note),
            timestamp: new Date(note.createdAt),
            reactions: {
                favorites: note.reactionCount || 0,
                reblogs: note.renoteCount || 0,
                replies: note.repliesCount || 0
            },
            sourceIcon: this.config.sourceIcon,
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
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
                if (Date.now() - parsed.timestamp < CONFIG.USER_CACHE_DURATION) {
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
    
    
    extractImages(note) {
        if (!note.files || !Array.isArray(note.files)) return [];
        
        return note.files
            .filter(file => file.type && file.type.startsWith('image/'))
            .slice(0, this.config.maxImages || CONFIG.MAX_IMAGES)
            .map(file => ({
                url: file.url,
                alt: file.name || '',
                width: file.properties?.width,
                height: file.properties?.height
            }));
    }
    
    async fetchMorePostsFromAPI(cutoffDate, existingIds) {
        const userInfo = await this.getCachedUserInfo();
        const maxPosts = this.getMaxPosts();
        
        // より多くの投稿を取得して時間フィルタリング
        const apiLimit = Math.min(maxPosts * 2, 100);
        console.log(`${this.displayName}: 追加読み込み用API制限値: ${apiLimit}件で取得`);
        
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
        
        return uniqueNotes.map(note => ({
            id: note.id,
            content: note.text || note.cw || '',
            images: this.extractImages(note),
            timestamp: new Date(note.createdAt),
            reactions: {
                favorites: note.reactionCount || 0,
                reblogs: note.renoteCount || 0,
                replies: note.repliesCount || 0
            },
            sourceIcon: this.config.sourceIcon,
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
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
            const apiLimit = 100; // 固定値
            console.log(`${this.displayName}: 生データAPI制限値: ${apiLimit}件で取得`);
            
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
            return uniqueNotes.map(note => ({
                id: note.id,
                content: note.text || note.cw || '',
                images: this.extractImages(note),
                timestamp: new Date(note.createdAt),
                reactions: {
                    favorites: note.reactionCount || 0,
                    reblogs: note.renoteCount || 0,
                    replies: note.repliesCount || 0
                },
                sourceIcon: this.config.sourceIcon,
                sourceDisplayName: this.config.sourceDisplayName,
                sourceIconImage: this.config.sourceIconImage,
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
            rateLimit: 20000, // 20秒間隔（デフォルト）
            sourceIcon: '[API]'
        };
    }
    
    async fetchPosts() {
        await this.checkRateLimit();
        
        try {
            const apiPosts = await this.fetchViaAPI();
            return apiPosts.length > 0 ? apiPosts : await this.fetchViaFallback();
        } catch (error) {
            console.error(`${this.displayName}: 取得エラー:`, error);
            return [this.createErrorPost(error.message)];
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
                if (Date.now() - parsed.timestamp < CONFIG.USER_CACHE_DURATION) {
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
            const apiLimit = Math.min(maxPosts * 2, 100); // 最大100件まで
            console.log(`${this.displayName}: API制限値: ${apiLimit}件で取得`);
            
            const statuses = await this.fetchWithRetry(`${this.apiUrl}/accounts/${accountId}/statuses?exclude_replies=true&exclude_reblogs=false&limit=${apiLimit}`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'PlanetAggregator/1.0'
                }
            });
            
            return statuses.map(status => this.createPost({
                id: status.id,
                content: this.stripHtmlContent(status.content),
                images: this.extractImages(status),
                timestamp: new Date(status.created_at),
                reactions: {
                    favorites: status.favourites_count || 0,
                    reblogs: status.reblogs_count || 0,
                    replies: status.replies_count || 0
                },
                sourceIcon: this.config.sourceIcon,
                sourceDisplayName: this.config.sourceDisplayName,
                sourceIconImage: this.config.sourceIconImage,
                originalUrl: status.url || status.uri
            }));
            
        } catch (error) {
            console.error(`${this.displayName}: 投稿取得エラー:`, error.message);
            throw error;
        }
    }
    
    
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
    
    
    extractImages(status) {
        if (!status.media_attachments || !Array.isArray(status.media_attachments)) return [];
        
        return status.media_attachments
            .filter(media => media.type === 'image')
            .slice(0, this.config.maxImages || CONFIG.MAX_IMAGES)
            .map(media => ({
                url: media.url,
                alt: media.description || '',
                width: media.meta?.original?.width,
                height: media.meta?.original?.height
            }));
    }
    
    async fetchMorePostsFromAPI(cutoffDate, existingIds) {
        const userInfo = await this.getAccountByUsername();
        if (!userInfo) {
            throw new Error('ユーザー情報の取得に失敗しました');
        }
        
        const maxPosts = this.getMaxPosts();
        
        // より多くの投稿を取得して時間フィルタリング
        const apiLimit = Math.min(maxPosts * 2, 100);
        console.log(`${this.displayName}: 追加読み込み用API制限値: ${apiLimit}件で取得`);
        
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
        
        return uniqueStatuses.map(status => ({
            id: status.id,
            content: this.stripHtmlContent(status.content),
            images: this.extractImages(status),
            timestamp: new Date(status.created_at),
            reactions: {
                favorites: status.favourites_count || 0,
                reblogs: status.reblogs_count || 0,
                replies: status.replies_count || 0
            },
            sourceIcon: this.config.sourceIcon,
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
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
            const apiLimit = 40; // 通常の2倍程度に抑制
            console.log(`${this.displayName}: 生データAPI制限値: ${apiLimit}件で取得`);
            
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
            return uniqueStatuses.map(status => ({
                id: status.id,
                content: this.stripHtmlContent(status.content),
                images: this.extractImages(status),
                timestamp: new Date(status.created_at),
                reactions: {
                    favorites: status.favourites_count || 0,
                    reblogs: status.reblogs_count || 0,
                    replies: status.replies_count || 0
                },
                sourceIcon: this.config.sourceIcon,
                sourceDisplayName: this.config.sourceDisplayName,
                sourceIconImage: this.config.sourceIconImage,
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
            rateLimit: 60000, // 60秒間隔（RSSは更新頻度が低いため）
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
            console.error(`${this.displayName}: 取得エラー:`, error);
            return [this.createErrorPost(error.message)];
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
        const processLimit = Math.min(items.length, maxPosts * 2); // より多くのアイテムを処理
        
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
            const post = this.createPost({
                id: guid,
                content: title + (description ? '\n\n' + description : ''),
                images: this.extractImagesFromRSS(item),
                timestamp: itemDate,
                reactions: {
                    favorites: 0,
                    reblogs: 0,
                    replies: 0
                },
                sourceIcon: this.config.sourceIcon || '[RSS]',
                sourceDisplayName: this.config.sourceDisplayName || this.displayName,
                sourceIconImage: this.config.sourceIconImage,
                originalUrl: link
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
            const postData = {
                id: guid,
                content: title + (description ? '\n\n' + description : ''),
                images: this.extractImagesFromRSS(item),
                timestamp: itemDate,
                reactions: {
                    favorites: 0,
                    reblogs: 0,
                    replies: 0
                },
                sourceIcon: this.config.sourceIcon || '[RSS]',
                sourceDisplayName: this.config.sourceDisplayName || this.displayName,
                sourceIconImage: this.config.sourceIconImage,
                originalUrl: link
            };
            
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
                const postData = {
                    id: guid,
                    content: title + (description ? '\n\n' + description : ''),
                    images: this.extractImagesFromRSS(item),
                    timestamp: itemDate,
                    reactions: {
                        favorites: 0,
                        reblogs: 0,
                        replies: 0
                    },
                    sourceIcon: this.config.sourceIcon || '[RSS]',
                    sourceDisplayName: this.config.sourceDisplayName || this.displayName,
                    sourceIconImage: this.config.sourceIconImage,
                    originalUrl: link
                };
                
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
// メインアグリゲータークラス
// ========================================

class PlanetAggregator {
    constructor() {
        this.adapters = new Map();
        this.posts = [];
        this.cache = new Map();
        this.cachedPosts = []; // 取得した投稿をキャッシュ
        this.isLoading = false;
        this.isLoadingMore = false;
        this.lastRenderHash = null;
        this.oldestPostDate = null;
        this.cacheTimestamp = 0;
        this.CACHE_DURATION = CONFIG.CACHE_DURATION;
        
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
        const globalSettings = globalSettingsManager.getGlobalSettings();
        this.timeFilterSettings = {
            enabled: globalSettings.timeBasedFetch !== false,
            daysBack: globalSettings.daysBack || 7,
            baseTime: this.sessionStartTime  // セッション開始時刻で固定
        };
        
        // カットオフ日時を事前計算
        if (this.timeFilterSettings.enabled) {
            this.cutoffDate = new Date(this.timeFilterSettings.baseTime);
            this.cutoffDate.setDate(this.cutoffDate.getDate() - this.timeFilterSettings.daysBack);
            // 1時間のマージンを追加
            this.cutoffDate.setHours(this.cutoffDate.getHours() - 1);
        }
        
        console.log('時間フィルタリング設定更新:', {
            enabled: this.timeFilterSettings.enabled,
            daysBack: this.timeFilterSettings.daysBack,
            baseTime: this.timeFilterSettings.baseTime.toISOString(),
            cutoffDate: this.cutoffDate?.toISOString()
        });
    }
    
    /**
     * 修正版: より柔軟な時間フィルタリング処理
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
        
        let cutoffDate = this.cutoffDate;
        
        // フレキシブルモード（追加読み込み時）はより緩い設定を使用
        if (useFlexibleMode) {
            cutoffDate = new Date(this.timeFilterSettings.baseTime);
            cutoffDate.setDate(cutoffDate.getDate() - (this.timeFilterSettings.daysBack * 2)); // 2倍の期間
            cutoffDate.setHours(cutoffDate.getHours() - 12); // 12時間のマージン
            console.log(`フレキシブル時間フィルタリング実行: カットオフ=${cutoffDate.toISOString()}`);
        } else {
            console.log(`統合時間フィルタリング実行: カットオフ=${cutoffDate.toISOString()}`);
        }
        
        // フィルタリング処理
        const filteredPosts = posts.filter(post => {
            if (!post.timestamp) {
                console.warn('投稿にタイムスタンプがありません:', post.id);
                return true; // タイムスタンプがない場合は含める
            }
            
            const postDate = new Date(post.timestamp);
            const isWithinRange = postDate >= cutoffDate;
            
            // デバッグ用: 最初の3件の除外ログのみ表示
            if (!isWithinRange && posts.indexOf(post) < 3) {
                console.log(`投稿除外: ${post.id} (投稿: ${postDate.toISOString()}, カットオフ: ${cutoffDate.toISOString()})`);
            }
            
            return isWithinRange;
        });
        
        const excludedCount = posts.length - filteredPosts.length;
        console.log(`時間フィルタリング結果: ${posts.length}件 → ${filteredPosts.length}件 (除外: ${excludedCount}件)`);
        
        return filteredPosts;
    }
    
    addAdapter(type, instanceUrl, username, config = {}) {
        let adapterId;
        let adapter;
        
        switch (type.toLowerCase()) {
            case 'misskey':
                adapterId = `${type}:${instanceUrl}:${username}`;
                adapter = new MisskeyAdapter(instanceUrl, username, config);
                break;
            case 'mastodon':
                adapterId = `${type}:${instanceUrl}:${username}`;
                adapter = new MastodonAdapter(instanceUrl, username, config);
                break;
            case 'rss':
                adapterId = `${type}:${instanceUrl}`;
                adapter = new RSSAdapter(instanceUrl, config);
                break;
            default:
                throw new Error(`未対応のSNSタイプ: ${type}`);
        }
        
        this.adapters.set(adapterId, adapter);
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
        
        console.log(`Planet Aggregator: ${this.adapters.size}件のアダプターから取得開始`);
        
        const promises = Array.from(this.adapters.values()).map(adapter => 
            this.fetchFromAdapter(adapter)
        );
        
        await Promise.allSettled(promises);
        
        // 統合された時間フィルタリングを適用
        this.posts = this.applyTimeFiltering(this.posts);
        
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
            const promises = Array.from(this.adapters.values()).map(adapter => 
                this.fetchMoreFromAdapterRaw(adapter, existingIds)
            );
            
            console.log(`${promises.length}個のアダプターから並行取得開始`);
            const results = await Promise.allSettled(promises);
            
            const newPosts = [];
            results.forEach((result, index) => {
                const adapterName = Array.from(this.adapters.values())[index].displayName;
                if (result.status === 'fulfilled' && result.value) {
                    console.log(`${adapterName}: ${result.value.length}件取得`);
                    newPosts.push(...result.value);
                } else {
                    console.error(`${adapterName}: 取得失敗:`, result.reason);
                }
            });
            
            console.log(`全アダプターから合計 ${newPosts.length}件取得`);
            
            if (newPosts.length > 0) {
                // 重複除外
                const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
                console.log(`重複除外後: ${uniqueNewPosts.length}件`);
                
                if (uniqueNewPosts.length > 0) {
                    // 時間フィルタリング前の件数
                    console.log(`時間フィルタリング前: ${uniqueNewPosts.length}件`);
                    
                    // フレキシブルモードで時間フィルタリングを適用（より緩い設定）
                    const filteredNewPosts = this.applyTimeFiltering(uniqueNewPosts, true);
                    
                    console.log(`時間フィルタリング後: ${filteredNewPosts.length}件`);
                    
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
                            .slice(0, 10);
                        
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
            const globalSettings = globalSettingsManager.getGlobalSettings();
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
        if (!item || Date.now() > item.timestamp + CONFIG.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }
    
    saveToCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
        
        if (this.cache.size > 100) {
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
        
        let html = `
            <li class="post-item">
                <div class="post-content">
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
        const validImages = images.filter(img => isValidImageUrl(img.url)).slice(0, 4);
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
        const maxCachedPosts = 1000;
        if (this.cachedPosts.length > maxCachedPosts) {
            this.cachedPosts = this.cachedPosts.slice(0, maxCachedPosts);
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
    getCachedPostsForDisplay(maxPosts = 20) {
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
// アプリケーション初期化
// ========================================

let planetAggregator = null;
let autoRefreshTimer = null;

async function initializePlanetV2() {
    try {
        planetAggregator = new PlanetAggregator();
        
        // 設定管理システムとの連携
        if (typeof initializeDataSourceManager !== 'undefined') {
            const manager = await initializeDataSourceManager();
            const dataSources = manager.getEnabledDataSources();
            
            // グローバル設定を再読み込み（dataSourceManagerが初期化された後）
            globalSettingsManager.loadGlobalSettings();
            
            console.log(`設定から ${dataSources.length}件のデータソースを読み込み`);
            
            dataSources.forEach(source => {
                try {
                    if (manager.validateDataSource(source)) {
                        // RSSの場合は特別な処理
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
    
    // グローバル設定から自動更新間隔を取得
    const globalSettings = globalSettingsManager.getGlobalSettings();
    const interval = globalSettings.autoRefreshInterval || CONFIG.AUTO_REFRESH_INTERVAL;
    
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

// グローバル設定を更新する関数
function updateGlobalSettings(newSettings) {
    try {
        globalSettingsManager.updateGlobalSettings(newSettings);
        
        // 既存のアダプターの設定を更新
        if (planetAggregator && planetAggregator.adapters) {
            planetAggregator.adapters.forEach(adapter => {
                // アダプターの設定を再マージ
                adapter.config = globalSettingsManager.mergeSettings(adapter.config);
            });
            console.log('全アダプターの設定を更新しました');
        }
    } catch (error) {
        console.error('グローバル設定の更新に失敗:', error);
    }
}

// グローバル設定を取得する関数
function getGlobalSettings() {
    return globalSettingsManager.getGlobalSettings();
}

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

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlanetAggregator,
        MisskeyAdapter,
        BaseSNSAdapter,
        GlobalSettingsManager,
        globalSettingsManager,
        initializePlanetV2,
        loadMorePosts,
        updateGlobalSettings,
        getGlobalSettings,
        getCacheStatus,
        forceClearCache
    };
}