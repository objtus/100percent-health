/**
 * Planet Aggregator v2 - 構造化版
 * SNS データ集約システム（拡張性重視）
 */

// ========================================
// 設定・定数
// ========================================

/**
 * システム全体の設定
 */
const SYSTEM_CONFIG = {
    // レート制限
    RATE_LIMITS: {
        MISSKEY_INTERVAL: 30 * 1000,           // 30秒間隔
        MASTODON_INTERVAL: 20 * 1000,          // 20秒間隔  
        DEFAULT_INTERVAL: 15 * 1000            // デフォルト15秒
    },
    
    // データ取得設定
    FETCH_SETTINGS: {
        MAX_POSTS_PER_SOURCE: 20,              // ソースあたり最大投稿数
        REQUEST_TIMEOUT: 10000,                // 10秒タイムアウト
        RETRY_ATTEMPTS: 3                      // リトライ回数
    },
    
    // キャッシュ設定
    CACHE_SETTINGS: {
        DURATION: 30 * 60 * 1000,              // 30分間キャッシュ（コスト削減）
        USER_CACHE_DURATION: 24 * 60 * 60 * 1000, // ユーザー情報24時間キャッシュ
        MAX_ENTRIES: 100,                      // 最大エントリ数増加
        AUTO_CLEANUP: true                     // 自動クリーンアップ
    },
    
    // コンテンツ処理
    CONTENT_SETTINGS: {
        MAX_LENGTH: 500,                       // 最大文字数
        TRUNCATE_LENGTH: 497,                  // 省略時の文字数
        MAX_IMAGES: 6,                         // 最大画像数
        MIN_IMAGE_SIZE: 100                    // 最小画像サイズ(px)
    },
    
    // UI設定
    UI_SETTINGS: {
        AUTO_REFRESH_INTERVAL: 30 * 60 * 1000, // 30分自動更新
        ANIMATION_DURATION: 200                // アニメーション時間
    }
};

/**
 * ユーザーエージェント設定
 */
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * プロキシサービス管理（回路ブレーカー付き）
 */
class ProxyManager {
    constructor() {
        this.failedProxies = new Map(); // プロキシ名 -> 失敗タイムスタンプ
        this.FAILURE_THRESHOLD = 3;     // 失敗回数閾値
        this.RECOVERY_TIME = 5 * 60 * 1000; // 5分後に回復
    }
    
    getAvailableProxies() {
        const services = [
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        
        // localhost以外では api.allorigins.win も使用
        if (!isLocalhost()) {
            services.unshift('https://api.allorigins.win/get?url=');
        }
        
        // 失敗中のプロキシを除外
        return services.filter(proxy => !this.isProxyFailed(proxy));
    }
    
    isProxyFailed(proxy) {
        const proxyName = this.getProxyName(proxy);
        const failedData = this.failedProxies.get(proxyName);
        
        if (!failedData) return false;
        
        // 回復時間が経過していれば使用可能
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

// グローバルプロキシマネージャー
const proxyManager = new ProxyManager();

/**
 * CORSプロキシサービス（回路ブレーカー付き）
 */
function getProxyServices() {
    return proxyManager.getAvailableProxies();
}

/**
 * 環境判定ユーティリティ
 */
function isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

// ========================================
// 基底クラス・インターfaces
// ========================================

/**
 * SNSアダプターの基底クラス
 */
class BaseSNSAdapter {
    constructor(instanceUrl, username, config = {}) {
        this.instanceUrl = instanceUrl;
        this.username = username;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.lastFetchTime = 0;
        this.displayName = config.displayName || `${username}@${this.extractDomain(instanceUrl)}`;
    }
    
    /**
     * デフォルト設定を取得（継承先でオーバーライド）
     */
    getDefaultConfig() {
        return {
            rateLimit: SYSTEM_CONFIG.RATE_LIMITS.DEFAULT_INTERVAL,
            maxPosts: SYSTEM_CONFIG.FETCH_SETTINGS.MAX_POSTS_PER_SOURCE,
            includeReplies: false,
            includeReblogs: false
        };
    }
    
    /**
     * ドメインを抽出
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return url.replace(/^https?:\/\//, '').split('/')[0];
        }
    }
    
    /**
     * レート制限チェック
     */
    async checkRateLimit() {
        const now = Date.now();
        const timeSinceLastFetch = now - this.lastFetchTime;
        
        if (timeSinceLastFetch < this.config.rateLimit) {
            const waitTime = this.config.rateLimit - timeSinceLastFetch;
            console.log(`${this.displayName}: レート制限 ${Math.ceil(waitTime/1000)}秒待機`);
            await this.sleep(waitTime);
        }
        
        this.lastFetchTime = Date.now();
    }
    
    /**
     * スリープユーティリティ
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 投稿データを取得（継承先で実装必須）
     */
    async fetchPosts() {
        throw new Error('fetchPosts must be implemented by subclass');
    }
    
    /**
     * 標準投稿オブジェクトを生成
     */
    createPost(data) {
        return {
            id: data.id || this.generateId(data.content, data.timestamp),
            content: data.content || '',
            images: data.images || [],
            timestamp: data.timestamp || new Date(),
            timeText: data.timeText || this.formatRelativeTime(data.timestamp),
            reactions: data.reactions || { favorites: 0, reblogs: 0, replies: 0 },
            source: this.username,
            sourceIcon: data.sourceIcon || '[取得]',
            sourceInstance: this.instanceUrl,
            sourceDisplayName: data.sourceDisplayName || this.displayName,
            sourceIconImage: data.sourceIconImage || null,
            originalUrl: data.originalUrl || null
        };
    }
    
    /**
     * ID生成（日本語対応ハッシュ）
     */
    generateId(content, timestamp) {
        const baseString = (content || '').substring(0, 20) + (timestamp || Date.now());
        let hash = 0;
        
        for (let i = 0; i < baseString.length; i++) {
            const char = baseString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        
        return Math.abs(hash).toString(36).substring(0, 12).padEnd(12, '0');
    }
    
    /**
     * 相対時刻フォーマット
     */
    formatRelativeTime(date) {
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
    
    /**
     * HTMLエスケープ
     */
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// ========================================
// Misskeyアダプター
// ========================================

/**
 * Misskey専用アダプター
 */
class MisskeyAdapter extends BaseSNSAdapter {
    constructor(instanceUrl, username, config = {}) {
        super(instanceUrl, username, config);
        this.apiUrl = `${instanceUrl}/api`;
        this.profileUrl = `${instanceUrl}/@${username}`;
    }
    
    /**
     * Misskey固有のデフォルト設定
     */
    getDefaultConfig() {
        return {
            ...super.getDefaultConfig(),
            rateLimit: SYSTEM_CONFIG.RATE_LIMITS.MISSKEY_INTERVAL,
            sourceIcon: '[API]',
            sourceDisplayName: this.extractDomain(this.instanceUrl),
            sourceIconImage: null // 設定ファイルから動的に設定
        };
    }
    
    /**
     * 投稿データ取得
     */
    async fetchPosts() {
        await this.checkRateLimit();
        
        try {
            // API経由で取得を試行
            const apiPosts = await this.fetchPostsViaAPI();
            if (apiPosts && apiPosts.length > 0) {
                return apiPosts;
            }
            
            // API失敗時はスクレイピングにフォールバック
            console.log(`${this.displayName}: API失敗、スクレイピングを実行`);
            return await this.fetchPostsViaScrapying();
            
        } catch (error) {
            console.error(`${this.displayName}: 投稿取得エラー:`, error);
            return [this.createErrorPost(error.message)];
        }
    }
    
    /**
     * Misskey API経由で投稿取得
     */
    async fetchPostsViaAPI() {
        try {
            console.log(`${this.displayName}: Misskey API でユーザー情報取得中...`);
            
            // ユーザー情報取得
            const userInfo = await this.fetchUserInfo();
            if (!userInfo || !userInfo.id) {
                throw new Error('ユーザー情報の取得に失敗');
            }
            
            // 投稿取得
            console.log(`${this.displayName}: ユーザーID ${userInfo.id} の投稿取得中...`);
            const notes = await this.fetchUserNotes(userInfo.id);
            
            // 投稿データの変換
            const posts = this.parseAPIResponse(notes);
            console.log(`${this.displayName}: API経由で ${posts.length}件の投稿を取得`);
            
            return posts;
            
        } catch (error) {
            console.warn(`${this.displayName}: API取得失敗:`, error.message);
            throw error;
        }
    }
    
    /**
     * ユーザー情報を取得（キャッシュ付き）
     */
    async fetchUserInfo() {
        const cacheKey = `user:${this.instanceUrl}:${this.username}`;
        
        // ユーザー情報キャッシュチェック
        const cached = this.getUserFromCache(cacheKey);
        if (cached) {
            console.log(`${this.displayName}: ユーザー情報キャッシュから取得`);
            return cached;
        }
        
        console.log(`${this.displayName}: ユーザー情報API取得中...`);
        const response = await fetch(`${this.apiUrl}/users/show`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: this.username })
        });
        
        if (!response.ok) {
            throw new Error(`ユーザー情報取得失敗: ${response.status}`);
        }
        
        const userInfo = await response.json();
        this.saveUserToCache(cacheKey, userInfo);
        return userInfo;
    }
    
    /**
     * ユーザー情報キャッシュから取得
     */
    getUserFromCache(key) {
        if (typeof window === 'undefined') return null;
        
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            const isExpired = Date.now() > parsed.timestamp + SYSTEM_CONFIG.CACHE_SETTINGS.USER_CACHE_DURATION;
            
            if (isExpired) {
                localStorage.removeItem(key);
                return null;
            }
            
            return parsed.data;
        } catch {
            return null;
        }
    }
    
    /**
     * ユーザー情報キャッシュに保存
     */
    saveUserToCache(key, data) {
        if (typeof window === 'undefined') return;
        
        try {
            const item = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (error) {
            console.warn('ユーザー情報キャッシュ保存失敗:', error);
        }
    }
    
    /**
     * ユーザーの投稿を取得（レート制限対応）
     */
    async fetchUserNotes(userId) {
        const maxRetries = SYSTEM_CONFIG.FETCH_SETTINGS.RETRY_ATTEMPTS;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`${this.apiUrl}/users/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        limit: this.config.maxPosts,
                        includeReplies: this.config.includeReplies,
                        includeMyRenotes: this.config.includeReblogs
                    }),
                    signal: AbortSignal.timeout(SYSTEM_CONFIG.FETCH_SETTINGS.REQUEST_TIMEOUT)
                });
                
                if (response.ok) {
                    return await response.json();
                }
                
                // レート制限の場合は長時間待機
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 60;
                    console.warn(`${this.displayName}: レート制限 ${retryAfter}秒待機 (試行 ${attempt}/${maxRetries})`);
                    
                    if (attempt < maxRetries) {
                        await this.sleep(parseInt(retryAfter) * 1000);
                        continue;
                    }
                }
                
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                
            } catch (error) {
                lastError = error;
                console.warn(`${this.displayName}: 投稿取得試行 ${attempt}/${maxRetries} 失敗:`, error.message);
                
                if (attempt < maxRetries) {
                    // 指数バックオフ
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    await this.sleep(backoffMs);
                }
            }
        }
        
        throw lastError || new Error('投稿取得失敗');
    }
    
    /**
     * API レスポンスを標準フォーマットに変換
     */
    parseAPIResponse(notes) {
        return notes.map(note => {
            const images = this.extractImagesFromNote(note);
            
            return this.createPost({
                id: note.id,
                content: note.text || note.cw || '',
                images: images,
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
            });
        });
    }
    
    /**
     * 投稿から画像を抽出
     */
    extractImagesFromNote(note) {
        if (!note.files || !Array.isArray(note.files)) return [];
        
        return note.files
            .filter(file => file.type && file.type.startsWith('image/'))
            .slice(0, SYSTEM_CONFIG.CONTENT_SETTINGS.MAX_IMAGES)
            .map(file => ({
                url: file.url,
                alt: file.name || '',
                width: file.properties?.width,
                height: file.properties?.height
            }));
    }
    
    /**
     * スクレイピング経由で投稿取得（フォールバック）
     */
    async fetchPostsViaScrapying() {
        try {
            const html = await this.fetchUserPageHTML();
            return this.parseHTMLForPosts(html);
        } catch (error) {
            console.warn(`${this.displayName}: スクレイピング失敗:`, error.message);
            return [this.createSPADetectedPost()];
        }
    }
    
    /**
     * ユーザーページのHTML取得
     */
    async fetchUserPageHTML() {
        const proxies = getProxyServices();
        
        for (const proxy of proxies) {
            try {
                console.log(`${this.displayName}: ${this.getProxyName(proxy)} 経由でページ取得中...`);
                
                const proxyUrl = `${proxy}${encodeURIComponent(this.profileUrl)}`;
                const response = await fetch(proxyUrl, {
                    headers: { 'User-Agent': USER_AGENT },
                    timeout: SYSTEM_CONFIG.FETCH_SETTINGS.REQUEST_TIMEOUT
                });
                
                if (!response.ok) continue;
                
                let htmlContent;
                if (proxy.includes('allorigins.win')) {
                    const data = await response.json();
                    htmlContent = data.contents;
                } else {
                    htmlContent = await response.text();
                }
                
                if (htmlContent && htmlContent.length > 1000) {
                    console.log(`${this.displayName}: ページ取得成功 (${Math.round(htmlContent.length/1024)}KB)`);
                    return htmlContent;
                }
                
            } catch (error) {
                proxyManager.recordFailure(proxy);
                console.log(`プロキシ ${this.getProxyName(proxy)} 失敗、次を試行...`);
                continue;
            }
        }
        
        throw new Error('全プロキシでページ取得失敗');
    }
    
    /**
     * プロキシ名を取得
     */
    getProxyName(proxyUrl) {
        return proxyUrl.split('://')[1].split('/')[0];
    }
    
    /**
     * HTMLから投稿を解析
     */
    parseHTMLForPosts(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // SPA判定
        const bodyText = doc.body?.textContent || '';
        if (bodyText.length < 100 || bodyText.includes('JavaScript')) {
            console.log(`${this.displayName}: SPA検出 - 静的コンテンツが不十分`);
            return [this.createSPADetectedPost()];
        }
        
        // TODO: より詳細なHTML解析ロジックを実装
        console.log(`${this.displayName}: HTML解析は未実装、フォールバック投稿を作成`);
        return [this.createFallbackPost('HTML解析未実装')];
    }
    
    /**
     * SPA検出時の投稿を作成
     */
    createSPADetectedPost() {
        return this.createPost({
            content: `${this.username} はJavaScript必須のSPAです。\n\nMisskey APIを使用して投稿を取得してください。\n\n詳細: ${this.instanceUrl}`,
            sourceIcon: '[SPA]',
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
            timeText: 'SPA検出'
        });
    }
    
    /**
     * エラー時の投稿を作成
     */
    createErrorPost(message) {
        return this.createPost({
            content: `${this.displayName} の取得に失敗しました: ${message}`,
            sourceIcon: '[エラー]',
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
            timeText: '今'
        });
    }
    
    /**
     * フォールバック投稿を作成
     */
    createFallbackPost(reason) {
        return this.createPost({
            content: `${this.displayName} からの投稿抽出に失敗しました。\n理由: ${reason}\n\nデバッグモードを有効にして詳細を確認してください。`,
            sourceIcon: '[解析失敗]',
            sourceDisplayName: this.config.sourceDisplayName,
            sourceIconImage: this.config.sourceIconImage,
            timeText: '解析結果'
        });
    }
}

// ========================================
// メインアグリゲータークラス
// ========================================

/**
 * Planet Aggregator メインクラス
 */
class PlanetAggregator {
    constructor() {
        this.adapters = new Map();
        this.posts = [];
        this.cache = new Map();
        this.isLoading = false;
        this.lastUpdateTime = null;
        this.lastRenderHash = null; // レンダリング最適化用
    }
    
    /**
     * SNSアダプターを追加
     */
    addAdapter(type, instanceUrl, username, config = {}) {
        const adapterId = `${type}:${instanceUrl}:${username}`;
        
        let adapter;
        switch (type.toLowerCase()) {
            case 'misskey':
                adapter = new MisskeyAdapter(instanceUrl, username, config);
                break;
            default:
                throw new Error(`未対応のSNSタイプ: ${type}`);
        }
        
        this.adapters.set(adapterId, adapter);
        console.log(`アダプター追加: ${adapter.displayName} (${type})`);
        
        return adapterId;
    }
    
    /**
     * アダプターを削除
     */
    removeAdapter(adapterId) {
        const removed = this.adapters.delete(adapterId);
        if (removed) {
            console.log(`アダプター削除: ${adapterId}`);
        }
        return removed;
    }
    
    /**
     * 全アダプターから投稿を取得
     */
    async fetchAllPosts() {
        if (this.isLoading) {
            console.log('既に読み込み中です');
            return;
        }
        
        this.isLoading = true;
        this.posts = [];
        
        console.log(`Planet Aggregator: ${this.adapters.size}件のアダプターから取得開始`);
        
        const fetchPromises = Array.from(this.adapters.values()).map(adapter => 
            this.fetchFromAdapter(adapter)
        );
        
        await Promise.allSettled(fetchPromises);
        
        this.sortPosts();
        this.lastUpdateTime = new Date();
        this.isLoading = false;
        
        console.log(`Planet Aggregator: 合計 ${this.posts.length}件の投稿を取得完了`);
        this.renderPosts();
    }
    
    /**
     * 個別アダプターから投稿を取得
     */
    async fetchFromAdapter(adapter) {
        try {
            const cacheKey = `${adapter.instanceUrl}/${adapter.username}`;
            
            // キャッシュチェック
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log(`${adapter.displayName}: キャッシュから取得`);
                this.posts.push(...cached);
                return;
            }
            
            // 新規取得
            const posts = await adapter.fetchPosts();
            this.posts.push(...posts);
            this.saveToCache(cacheKey, posts);
            
        } catch (error) {
            console.error(`${adapter.displayName}: 取得エラー:`, error);
            // エラー時も最低限の投稿を追加
            this.posts.push(adapter.createErrorPost(error.message));
        }
    }
    
    /**
     * キャッシュから取得
     */
    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        const isExpired = Date.now() > item.timestamp + SYSTEM_CONFIG.CACHE_SETTINGS.DURATION;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    /**
     * キャッシュに保存
     */
    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // キャッシュサイズ制限
        if (this.cache.size > SYSTEM_CONFIG.CACHE_SETTINGS.MAX_ENTRIES) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
    
    /**
     * キャッシュクリア
     */
    clearCache() {
        this.cache.clear();
        console.log('キャッシュをクリアしました');
    }
    
    /**
     * 投稿をソート
     */
    sortPosts() {
        this.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    /**
     * 投稿表示（差分更新最適化）
     */
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
        
        // レンダリング最適化: 内容が変わっていない場合はスキップ
        const postsByDate = this.groupPostsByDate();
        const currentHash = this.calculateContentHash(postsByDate);
        
        if (this.lastRenderHash === currentHash) {
            console.log('投稿内容に変更がないため、レンダリングをスキップ');
            this.updateLastUpdateTime(); // 時刻のみ更新
            return;
        }
        
        const html = this.renderDateSections(postsByDate);
        container.innerHTML = html;
        this.lastRenderHash = currentHash;
        
        this.updateLastUpdateTime();
        this.setupImageErrorHandling(); // CSP準拠のエラーハンドリング
    }
    
    /**
     * コンテンツハッシュ計算（変更検出用）
     */
    calculateContentHash(postsByDate) {
        const content = JSON.stringify(postsByDate, (key, value) => {
            // timestampは除外（表示時刻は変わるが内容は同じ）
            if (key === 'timestamp' || key === 'timeText') return undefined;
            return value;
        });
        
        // 簡易ハッシュ関数
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        return hash.toString(36);
    }
    
    /**
     * 画像エラーハンドリング（CSP準拠）
     */
    setupImageErrorHandling() {
        // onerror属性の代わりにイベントリスナーを使用
        const images = document.querySelectorAll('#planet-v2-content img[data-fallback]');
        images.forEach(img => {
            img.addEventListener('error', function() {
                if (this.dataset.fallback === 'icon') {
                    this.style.display = 'none';
                } else if (this.dataset.fallback === 'image') {
                    this.style.display = 'none';
                }
            }, { once: true }); // 一度だけ実行
        });
    }
    
    /**
     * 投稿を日付別にグループ化
     */
    groupPostsByDate() {
        const groups = {};
        
        this.posts.forEach(post => {
            const dateKey = this.formatDate(post.timestamp);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(post);
        });
        
        return groups;
    }
    
    /**
     * 日付セクションを描画
     */
    renderDateSections(postsByDate) {
        const sortedDates = Object.keys(postsByDate).sort((a, b) => new Date(b) - new Date(a));
        
        return sortedDates.map(date => {
            const posts = postsByDate[date];
            const postsHtml = posts.map(post => this.renderPost(post)).join('');
            
            return `
                <div class="date-section">
                    <h2 class="date-header">${date}</h2>
                    <ul class="post-list">
                        ${postsHtml}
                    </ul>
                </div>
            `;
        }).join('');
    }
    
    /**
     * 個別投稿を描画
     */
    renderPost(post) {
        const timeStr = this.formatTime(post.timestamp);
        const linkUrl = post.originalUrl || `${post.sourceInstance}/notes/${post.id}`;
        
        // アイコン画像の処理（フォールバック対応）
        const iconHtml = this.renderSourceIcon(post);
        
        let html = `
            <li class="post-item">
                <div class="post-content">
                    <div class="post-text">${this.escapeHtml(post.content)}</div>
                    <span class="post-source">- ${iconHtml} ${post.sourceDisplayName}</span>
        `;
        
        // 画像表示
        if (post.images && post.images.length > 0) {
            html += this.renderImages(post.images);
        }
        
        // リアクション表示
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
    
    /**
     * ソースアイコンを描画（セキュリティ強化版）
     */
    renderSourceIcon(post) {
        if (post.sourceIconImage && this.isValidImageUrl(post.sourceIconImage)) {
            const safeUrl = this.sanitizeImageUrl(post.sourceIconImage);
            return `<img src="${this.escapeHtml(safeUrl)}" alt="${this.escapeHtml(post.sourceDisplayName)} icon" class="source-icon-image" data-fallback="icon">`;
        } else {
            // アイコン画像がない場合はテキスト表示
            return `<span class="source-icon-text">${this.escapeHtml(post.sourceIcon || '[取得]')}</span>`;
        }
    }
    
    /**
     * 画像URLの妥当性チェック
     */
    isValidImageUrl(url) {
        if (!url) return false;
        
        // 相対パス（ローカルアイコン）の場合
        if (url.startsWith('./') || url.startsWith('../') || !url.includes('://')) {
            return url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        }
        
        // 絶対URLの場合
        try {
            const urlObj = new URL(url);
            // HTTPS必須、許可ドメインチェック
            return urlObj.protocol === 'https:' && 
                   !urlObj.hostname.includes('localhost') &&
                   urlObj.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        } catch {
            return false;
        }
    }
    
    /**
     * 画像URLサニタイズ
     */
    sanitizeImageUrl(url) {
        if (!url) return '';
        
        // 相対パス（ローカルアイコン）の場合はそのまま返す
        if (url.startsWith('./') || url.startsWith('../') || !url.includes('://')) {
            // パス形式を正規化
            return url.replace(/[?#].*$/, ''); // クエリとフラグメントのみ除去
        }
        
        // 絶対URLの場合
        try {
            const urlObj = new URL(url);
            // クエリパラメータとフラグメントを除去
            return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
        } catch {
            return '';
        }
    }
    
    /**
     * 画像を描画（セキュリティ強化版）
     */
    renderImages(images) {
        if (!Array.isArray(images) || images.length === 0) return '';
        
        const validImages = images
            .filter(image => image && this.isValidImageUrl(image.url))
            .slice(0, SYSTEM_CONFIG.CONTENT_SETTINGS.MAX_IMAGES);
            
        if (validImages.length === 0) return '';
        
        const imageCount = Math.min(validImages.length, 4);
        let html = `<div class="post-images images-${imageCount}">`;
        
        validImages.slice(0, 4).forEach(image => {
            const safeUrl = this.sanitizeImageUrl(image.url);
            const safeAlt = this.escapeHtml(image.alt || '投稿画像');
            
            html += `
                <div class="post-image-container">
                    <img src="${this.escapeHtml(safeUrl)}" 
                         alt="${safeAlt}"
                         class="post-image"
                         loading="lazy"
                         data-fallback="image">
                </div>
            `;
        });
        
        html += `</div>`;
        return html;
    }
    
    /**
     * リアクションがあるかチェック
     */
    hasReactions(reactions) {
        return reactions && (
            reactions.favorites > 0 || 
            reactions.reblogs > 0 || 
            reactions.replies > 0
        );
    }
    
    /**
     * リアクションを描画
     */
    renderReactions(reactions) {
        let html = `<div class="post-reactions">`;
        
        if (reactions.favorites > 0) {
            html += `<span class="reaction">いいね ${reactions.favorites}</span>`;
        }
        if (reactions.reblogs > 0) {
            html += `<span class="reaction">リノート ${reactions.reblogs}</span>`;
        }
        if (reactions.replies > 0) {
            html += `<span class="reaction">返信 ${reactions.replies}</span>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    /**
     * 最終更新時刻を更新
     */
    updateLastUpdateTime() {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement && this.lastUpdateTime) {
            timeElement.textContent = this.lastUpdateTime.toLocaleString('ja-JP');
        }
    }
    
    /**
     * ユーティリティ: 日付フォーマット
     */
    formatDate(date) {
        return new Date(date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    /**
     * ユーティリティ: 時刻フォーマット
     */
    formatTime(date) {
        return new Date(date).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * ユーティリティ: HTMLエスケープ
     */
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// ========================================
// アプリケーション初期化
// ========================================

// グローバルインスタンス
let planetAggregator = null;
let autoRefreshTimer = null; // タイマー管理用

/**
 * アプリケーション初期化
 */
async function initializePlanetV2() {
    try {
        planetAggregator = new PlanetAggregator();
        
        // データソース設定を読み込み
        if (typeof initializeDataSourceManager !== 'undefined') {
            const manager = await initializeDataSourceManager();
            await setupDataSourcesFromConfig(manager);
        } else {
            // フォールバック: 直接設定
            console.warn('設定管理システムが見つかりません。フォールバック設定を使用');
            setupFallbackDataSources();
        }
        
        // 初回データ取得
        await planetAggregator.fetchAllPosts();
        
        // 動的な定期更新設定
        setupAutoRefresh();
        
    } catch (error) {
        console.error('Planet v2 初期化エラー:', error);
        // エラー時はフォールバック設定で続行
        setupFallbackDataSources();
        planetAggregator.fetchAllPosts();
    }
}

/**
 * 設定ファイルからデータソースをセットアップ
 */
async function setupDataSourcesFromConfig(manager) {
    const dataSources = manager.getEnabledDataSources();
    const globalSettings = manager.getGlobalSettings();
    
    console.log(`設定から ${dataSources.length}件のデータソースを読み込み`);
    
    for (const source of dataSources) {
        try {
            if (manager.validateDataSource(source)) {
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
        } catch (error) {
            console.error(`データソース ${source.id} の追加に失敗:`, error);
        }
    }
    
    // グローバル設定を適用
    if (globalSettings.autoRefreshInterval) {
        SYSTEM_CONFIG.UI_SETTINGS.AUTO_REFRESH_INTERVAL = globalSettings.autoRefreshInterval;
    }
}

/**
 * フォールバック用のデータソース設定
 */
function setupFallbackDataSources() {
    console.log('フォールバック設定でデータソースを追加');
    
    // 環境変数や設定からフォールバック値を取得（将来の拡張用）
    const fallbackSources = getFallbackSources();
    
    fallbackSources.forEach(source => {
        planetAggregator.addAdapter(
            source.type,
            source.instanceUrl,
            source.username,
            {
                displayName: source.displayName,
                sourceIconImage: source.sourceIconImage,
                description: 'フォールバック設定'
            }
        );
    });
}

/**
 * フォールバック用のデータソース定義
 */
function getFallbackSources() {
    return [
        {
            type: 'misskey',
            instanceUrl: 'https://tanoshii.site',
            username: 'health',
            displayName: 'tanoshii.site',
            sourceIconImage: './tanoshiisite.jpg'
        }
        // 将来的に他のフォールバックソースを追加可能
    ];
}

/**
 * 自動更新の設定（メモリリーク対策）
 */
function setupAutoRefresh() {
    // 既存タイマーをクリア
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
    
    const interval = SYSTEM_CONFIG.UI_SETTINGS.AUTO_REFRESH_INTERVAL;
    
    autoRefreshTimer = setInterval(() => {
        if (planetAggregator && !planetAggregator.isLoading) {
            console.log(`自動更新実行 (${interval/60000}分間隔)`);
            planetAggregator.fetchAllPosts();
        }
    }, interval);
    
    console.log(`自動更新を設定: ${interval/60000}分間隔`);
    
    // ページ離脱時にタイマークリア
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            if (autoRefreshTimer) {
                clearInterval(autoRefreshTimer);
                autoRefreshTimer = null;
            }
        });
    }
}

/**
 * 手動更新
 */
function refreshPlanetV2() {
    if (planetAggregator) {
        planetAggregator.fetchAllPosts();
    }
}

/**
 * キャッシュクリア
 */
function clearCache() {
    if (planetAggregator) {
        planetAggregator.clearCache();
    }
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlanetAggregator,
        MisskeyAdapter,
        BaseSNSAdapter,
        SYSTEM_CONFIG,
        initializePlanetV2
    };
}
