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
        this.config = { ...this.getDefaultConfig(), ...config };
        this.lastFetchTime = 0;
        this.displayName = config.displayName || username;
    }
    
    getDefaultConfig() {
        return {
            rateLimit: 15000,
            maxPosts: 20,
            includeReplies: false,
            includeReblogs: false
        };
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
        const timeBasedFetch = this.config.timeBasedFetch || false;
        const daysBack = this.config.daysBack || 5;
        
        console.log(`${this.displayName}: 設定確認 - maxPosts: ${this.config.maxPosts}, timeBasedFetch: ${timeBasedFetch}, daysBack: ${daysBack}`);
        
        let notes;
        if (timeBasedFetch) {
            // 時間ベース取得: 過去N日間の投稿を取得
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBack);
            
            console.log(`${this.displayName}: 過去${daysBack}日間の投稿を取得中... (${cutoffDate.toISOString()}以降)`);
            
            // より多くの投稿を取得して時間フィルタリング
            // Misskey APIの制限を考慮して、適切な値を設定
            const apiLimit = Math.min(this.config.maxPosts * 3, 100); // 最大100件まで
            console.log(`${this.displayName}: API制限値: ${apiLimit}件で取得`);
            
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
            
            console.log(`${this.displayName}: APIから取得した投稿数: ${allNotes ? allNotes.length : 0}`);
            console.log(`${this.displayName}: ユーザーID: ${userInfo.id}`);
            
            // 時間フィルタリング
            notes = allNotes.filter(note => {
                const noteDate = new Date(note.createdAt);
                return noteDate >= cutoffDate;
            }).slice(0, this.config.maxPosts); // 最大投稿数で制限
            
            console.log(`${this.displayName}: 時間フィルタリング後 ${notes.length}件の投稿を取得`);
        } else {
            // 従来の方法: 最大投稿数で取得
            // Misskey APIの制限を考慮
            const apiLimit = Math.min(this.config.maxPosts, 100); // 最大100件まで
            console.log(`${this.displayName}: API制限値: ${apiLimit}件で取得`);
            
            notes = await this.fetchWithRetry(`${this.apiUrl}/users/notes`, {
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
        }
        
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
    
    async fetchWithRetry(url, options) {
        const useProxy = this.config.useProxy !== false; // デフォルトはtrue（後方互換性のため）
        const proxies = useProxy ? proxyManager.getAvailableProxies() : [];
        
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            if (useProxy) {
                // プロキシを使用してリクエストを試行
                for (const proxy of proxies) {
                try {
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
                    
                    console.log(`${this.displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 経由でAPI取得中...`);
                    
                    const response = await fetch(proxyUrl, {
                        ...requestOptions,
                        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
                    });
                    
                    if (response.ok) {
                        let result;
                        if (proxy.includes('allorigins.win')) {
                            const data = await response.json();
                            result = JSON.parse(data.contents);
                        } else {
                            result = await response.json();
                        }
                        return result;
                    }
                    
                    // エラーレスポンスの詳細をログに出力
                    const errorText = await response.text();
                    console.error(`${this.displayName}: HTTP ${response.status} エラー:`, errorText);
                    
                    if (response.status === 429) {
                        const retryAfter = response.headers.get('Retry-After') || 60;
                        console.warn(`${this.displayName}: レート制限 ${retryAfter}秒待機 (試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);
                        
                        if (attempt < CONFIG.RETRY_ATTEMPTS) {
                            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
                            break; // プロキシループを抜けて次の試行へ
                        }
                    }
                    
                } catch (error) {
                    proxyManager.recordFailure(proxy);
                    console.warn(`${this.displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 失敗:`, error.message);
                    continue; // 次のプロキシを試行
                }
            }
            } else {
                // 直接アクセス
                try {
                    console.log(`${this.displayName}: 直接API取得中...`);
                    const response = await fetch(url, {
                        ...options,
                        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
                    });
                    
                    if (response.ok) {
                        return await response.json();
                    }
                    
                    const errorText = await response.text();
                    console.error(`${this.displayName}: HTTP ${response.status} エラー:`, errorText);
                    
                    if (response.status === 429) {
                        const retryAfter = response.headers.get('Retry-After') || 60;
                        console.warn(`${this.displayName}: レート制限 ${retryAfter}秒待機 (試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);
                        
                        if (attempt < CONFIG.RETRY_ATTEMPTS) {
                            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
                        }
                    }
                } catch (error) {
                    console.warn(`${this.displayName}: 直接取得失敗:`, error.message);
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
    
    async fetchMorePosts(cutoffDate, existingIds) {
        console.log(`${this.displayName}: 追加投稿取得中... (${cutoffDate.toISOString()} 以降)`);
        
        try {
            const userInfo = await this.getCachedUserInfo();
            
            // より多くの投稿を取得して時間フィルタリング
            const apiLimit = Math.min(this.config.maxPosts * 2, 100);
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
            
            // 時間フィルタリング（cutoffDate以降の投稿のみ）
            const filteredNotes = allNotes.filter(note => {
                const noteDate = new Date(note.createdAt);
                return noteDate >= cutoffDate;
            });
            
            // 重複チェック
            const uniqueNotes = filteredNotes.filter(note => !existingIds.has(note.id));
            
            console.log(`${this.displayName}: 追加読み込み - 取得: ${allNotes.length}件, 時間フィルタ後: ${filteredNotes.length}件, 重複除外後: ${uniqueNotes.length}件`);
            
            return uniqueNotes.map(note => this.createPost({
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
            console.error(`${this.displayName}: 追加投稿取得エラー:`, error);
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
            const timeBasedFetch = this.config.timeBasedFetch || false;
            const daysBack = this.config.daysBack || 5;
            
            console.log(`${this.displayName}: 設定確認 - maxPosts: ${this.config.maxPosts}, timeBasedFetch: ${timeBasedFetch}, daysBack: ${daysBack}`);
            
            let statuses;
            if (timeBasedFetch) {
                // 時間ベース取得: 過去N日間の投稿を取得
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                
                console.log(`${this.displayName}: 過去${daysBack}日間の投稿を取得中... (${cutoffDate.toISOString()}以降)`);
                
                // より多くの投稿を取得して時間フィルタリング
                // Mastodon APIの制限を考慮して、適切な値を設定
                const apiLimit = Math.min(this.config.maxPosts * 3, 100); // 最大100件まで
                console.log(`${this.displayName}: API制限値: ${apiLimit}件で取得`);
                
                const allStatuses = await this.fetchWithRetry(`${this.apiUrl}/accounts/${accountId}/statuses?exclude_replies=true&exclude_reblogs=false&limit=${apiLimit}`, {
                    method: 'GET',
                    headers: { 
                        'Accept': 'application/json',
                        'User-Agent': 'PlanetAggregator/1.0'
                    }
                });
                
                // 時間フィルタリング
                statuses = allStatuses.filter(status => {
                    const statusDate = new Date(status.created_at);
                    return statusDate >= cutoffDate;
                }).slice(0, this.config.maxPosts); // 最大投稿数で制限
                
                console.log(`${this.displayName}: 時間フィルタリング後 ${statuses.length}件の投稿を取得`);
            } else {
                // 従来の方法: 最大投稿数で取得
                // Mastodon APIの制限を考慮
                const apiLimit = Math.min(this.config.maxPosts, 100); // 最大100件まで
                console.log(`${this.displayName}: API制限値: ${apiLimit}件で取得`);
                
                statuses = await this.fetchWithRetry(`${this.apiUrl}/accounts/${accountId}/statuses?exclude_replies=true&exclude_reblogs=false&limit=${apiLimit}`, {
                    method: 'GET',
                    headers: { 
                        'Accept': 'application/json',
                        'User-Agent': 'PlanetAggregator/1.0'
                    }
                });
            }
            
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
    
    async fetchWithRetry(url, options) {
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
                });
                
                if (response.ok) {
                    return await response.json();
                }
                
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 60;
                    console.warn(`${this.displayName}: レート制限 ${retryAfter}秒待機 (試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);
                    
                    if (attempt < CONFIG.RETRY_ATTEMPTS) {
                        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
                        continue;
                    }
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                
            } catch (error) {
                if (attempt === CONFIG.RETRY_ATTEMPTS) throw error;
                
                const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.warn(`${this.displayName}: 投稿取得試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS} 失敗:`, error.message);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
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
    
    async fetchWithRetry(url, options = {}) {
        const useProxy = this.config.useProxy !== false; // デフォルトはtrue（後方互換性のため）
        
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                if (useProxy) {
                    // プロキシを使用
                    const proxies = proxyManager.getAvailableProxies();
                    for (const proxy of proxies) {
                        try {
                            let proxyUrl;
                            let requestOptions = { ...options };
                            
                            if (proxy.includes('allorigins.win')) {
                                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                                requestOptions = {
                                    method: 'GET',
                                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                                };
                            } else {
                                proxyUrl = `${proxy}${url}`;
                            }
                            
                            console.log(`${this.displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 経由でAPI取得中...`);
                            
                            const response = await fetch(proxyUrl, {
                                ...requestOptions,
                                signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
                            });
                            
                            if (response.ok) {
                                let result;
                                if (proxy.includes('allorigins.win')) {
                                    const data = await response.json();
                                    result = JSON.parse(data.contents);
                                } else {
                                    result = await response.json();
                                }
                                return result;
                            }
                        } catch (error) {
                            proxyManager.recordFailure(proxy);
                            console.warn(`${this.displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 失敗:`, error.message);
                            continue;
                        }
                    }
                } else {
                    // 直接アクセス
                    console.log(`${this.displayName}: 直接API取得中...`);
                    const response = await fetch(url, {
                        ...options,
                        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
                    });
                    
                    if (response.ok) {
                        return await response.json();
                    }
                    
                    const errorText = await response.text();
                    console.error(`${this.displayName}: HTTP ${response.status} エラー:`, errorText);
                }
            } catch (error) {
                console.warn(`${this.displayName}: 取得試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS} 失敗:`, error.message);
                
                if (attempt < CONFIG.RETRY_ATTEMPTS) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
            }
        }
        
        throw new Error(`${useProxy ? '全てのプロキシ' : '直接アクセス'}でAPI取得に失敗しました`);
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
    
    async fetchMorePosts(cutoffDate, existingIds) {
        console.log(`${this.displayName}: 追加投稿取得中... (${cutoffDate.toISOString()} 以降)`);
        
        try {
            const userInfo = await this.getAccountByUsername();
            if (!userInfo) {
                throw new Error('ユーザー情報の取得に失敗しました');
            }
            
            // より多くの投稿を取得して時間フィルタリング
            const apiLimit = Math.min(this.config.maxPosts * 2, 100);
            console.log(`${this.displayName}: 追加読み込み用API制限値: ${apiLimit}件で取得`);
            
            const response = await fetch(`${this.apiUrl}/accounts/${userInfo.id}/statuses?exclude_replies=true&exclude_reblogs=false&limit=${apiLimit}`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'PlanetAggregator/1.0'
                },
                signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const allStatuses = await response.json();
            
            // 時間フィルタリング（cutoffDate以降の投稿のみ）
            const filteredStatuses = allStatuses.filter(status => {
                const statusDate = new Date(status.created_at);
                return statusDate >= cutoffDate;
            });
            
            // 重複チェック
            const uniqueStatuses = filteredStatuses.filter(status => !existingIds.has(status.id));
            
            console.log(`${this.displayName}: 追加読み込み - 取得: ${allStatuses.length}件, 時間フィルタ後: ${filteredStatuses.length}件, 重複除外後: ${uniqueStatuses.length}件`);
            
            return uniqueStatuses.map(status => this.createPost({
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
            console.error(`${this.displayName}: 追加投稿取得エラー:`, error);
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
        const timeBasedFetch = this.config.timeBasedFetch || false;
        const daysBack = this.config.daysBack || 3;
        
        console.log(`${this.displayName}: 設定確認 - maxPosts: ${this.config.maxPosts}, timeBasedFetch: ${timeBasedFetch}, daysBack: ${daysBack}`);
        
        // RSSフィードを取得
        const response = await this.fetchWithRetry(this.feedUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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
        const now = new Date();
        
        for (let i = 0; i < items.length && posts.length < this.config.maxPosts; i++) {
            const item = items[i];
            
            // 基本情報を取得
            const title = this.getTextContent(item, 'title') || '';
            const description = this.getTextContent(item, 'description') || '';
            const link = this.getTextContent(item, 'link') || '';
            const pubDate = this.getTextContent(item, 'pubDate') || '';
            const guid = this.getTextContent(item, 'guid') || link;
            
            // 日付を解析
            const itemDate = new Date(pubDate);
            
            // 時間フィルタリング
            if (timeBasedFetch) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                
                if (itemDate < cutoffDate) {
                    continue; // 指定期間外のアイテムをスキップ
                }
            }
            
            // 投稿を作成
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
        
        return images.slice(0, this.config.maxImages || 6);
    }
    
    async fetchWithRetry(url, options) {
        const useProxy = this.config.useProxy !== false; // デフォルトはtrue（後方互換性のため）
        
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                if (useProxy) {
                    // プロキシを使用
                    const proxies = proxyManager.getAvailableProxies();
                    for (const proxy of proxies) {
                        try {
                            let proxyUrl;
                            let requestOptions = { ...options };
                            
                            if (proxy.includes('allorigins.win')) {
                                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                                requestOptions = {
                                    method: 'GET',
                                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                                };
                            } else {
                                proxyUrl = `${proxy}${url}`;
                            }
                            
                            console.log(`${this.displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 経由でRSS取得中...`);
                            
                            const response = await fetch(proxyUrl, {
                                ...requestOptions,
                                signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
                            });
                            
                            if (response.ok) {
                                let result;
                                if (proxy.includes('allorigins.win')) {
                                    const data = await response.json();
                                    result = data.contents;
                                } else {
                                    result = await response.text();
                                }
                                return result;
                            }
                        } catch (error) {
                            proxyManager.recordFailure(proxy);
                            console.warn(`${this.displayName}: プロキシ ${proxyManager.getProxyName(proxy)} 失敗:`, error.message);
                            continue;
                        }
                    }
                } else {
                    // 直接アクセス
                    console.log(`${this.displayName}: 直接RSS取得中...`);
                    const response = await fetch(url, {
                        ...options,
                        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
                    });
                    
                    if (response.ok) {
                        return await response.text();
                    }
                    
                    const errorText = await response.text();
                    console.error(`${this.displayName}: HTTP ${response.status} エラー:`, errorText);
                }
                
            } catch (error) {
                console.warn(`${this.displayName}: 取得試行 ${attempt}/${CONFIG.RETRY_ATTEMPTS} 失敗:`, error.message);
                
                if (attempt < CONFIG.RETRY_ATTEMPTS) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
            }
        }
        
        throw new Error(`${useProxy ? '全てのプロキシ' : '直接アクセス'}でRSS取得に失敗しました`);
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
        this.isLoading = false;
        this.isLoadingMore = false;
        this.lastRenderHash = null;
        this.oldestPostDate = null;
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
        
        console.log(`Planet Aggregator: ${this.adapters.size}件のアダプターから取得開始`);
        
        const promises = Array.from(this.adapters.values()).map(adapter => 
            this.fetchFromAdapter(adapter)
        );
        
        await Promise.allSettled(promises);
        
        this.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.isLoading = false;
        
        // 最古の投稿日時を記録
        if (this.posts.length > 0) {
            this.oldestPostDate = new Date(this.posts[this.posts.length - 1].timestamp);
        }
        
        console.log(`Planet Aggregator: 合計 ${this.posts.length}件の投稿を取得完了`);
        this.renderPosts();
    }
    
    async loadMorePosts() {
        if (this.isLoadingMore || this.isLoading) {
            console.log('既に読み込み中です');
            return;
        }
        
        if (!this.oldestPostDate) {
            console.log('追加読み込み対象の投稿がありません');
            return;
        }
        
        console.log('追加読み込み開始 - isLoadingMore:', this.isLoadingMore);
        this.isLoadingMore = true;
        this.showLoadMoreStatus('追加の投稿を読み込み中...', 'loading');
        this.updateLoadMoreButton(); // ボタンの状態を即座に更新
        
        try {
            // 既存の投稿IDセットを作成（重複チェック用）
            const existingIds = new Set(this.posts.map(post => post.id));
            
            // 各アダプターから追加の投稿を取得
            const promises = Array.from(this.adapters.values()).map(adapter => 
                this.fetchMoreFromAdapter(adapter, existingIds)
            );
            
            const results = await Promise.allSettled(promises);
            const newPosts = [];
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    newPosts.push(...result.value);
                } else {
                    console.error(`アダプター ${index} の追加読み込みに失敗:`, result.reason);
                }
            });
            
            if (newPosts.length > 0) {
                // 重複を除外
                const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
                
                if (uniqueNewPosts.length > 0) {
                    this.posts.push(...uniqueNewPosts);
                    this.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    // 最古の投稿日時を更新
                    this.oldestPostDate = new Date(this.posts[this.posts.length - 1].timestamp);
                    
                    console.log(`Planet Aggregator: ${uniqueNewPosts.length}件の追加投稿を取得完了`);
                    this.showLoadMoreStatus(`${uniqueNewPosts.length}件の投稿を追加しました`, 'success');
                    this.renderPosts();
                } else {
                    this.showLoadMoreStatus('新しい投稿はありません', 'success');
                }
            } else {
                this.showLoadMoreStatus('新しい投稿はありません', 'success');
            }
            
        } catch (error) {
            console.error('追加読み込みエラー:', error);
            this.showLoadMoreStatus('追加読み込みに失敗しました', 'error');
        } finally {
            this.isLoadingMore = false;
            console.log('追加読み込み完了 - isLoadingMore:', this.isLoadingMore);
            // ボタンの状態を明示的に更新
            this.updateLoadMoreButton();
        }
    }
    
    async fetchMoreFromAdapter(adapter, existingIds) {
        try {
            // 最古の投稿から設定された日数分前の日時を計算
            const cutoffDate = new Date(this.oldestPostDate);
            const daysBack = adapter.config.daysBack || 3;
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
        
        // 定期的にスタイル属性をチェック（フォールバック）
        this.startStyleCheckInterval();
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
    }
    
    startStyleCheckInterval() {
        // 既存のインターバルをクリア
        if (this.styleCheckInterval) {
            clearInterval(this.styleCheckInterval);
        }
        
        // 5秒ごとにスタイル属性をチェック
        this.styleCheckInterval = setInterval(() => {
            const links = document.querySelectorAll('a[style]');
            if (links.length > 0) {
                console.log(`Found ${links.length} links with style attributes, removing them`);
                this.removeLinkStyles();
            }
        }, 5000);
        
        console.log('Style check interval started (5 seconds)');
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
    
    clearCache() {
        this.cache.clear();
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
    
    // 設定ファイルから自動更新間隔を取得、フォールバックは30分
    const interval = (typeof dataSourceManager !== 'undefined' && dataSourceManager.getGlobalSettings) 
        ? dataSourceManager.getGlobalSettings().autoRefreshInterval || CONFIG.AUTO_REFRESH_INTERVAL
        : CONFIG.AUTO_REFRESH_INTERVAL;
    
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
        initializePlanetV2,
        loadMorePosts
    };
}