/**
 * Planet Aggregator - RSS/JSON フィード集約システム
 * 複数のデータソースから投稿を収集し、時系列で表示
 */

// 設定定数 - Planet機能の動作パラメータ
const CONFIG = {
    // キャッシュ設定
    CACHE_TIMEOUT: 15 * 60 * 1000,           // 15分間 - RSSフィードのキャッシュ保持時間
    MAX_CACHE_SIZE: 100,                     // 最大100エントリ - メモリ使用量を制限
    
    // 投稿表示設定  
    MAX_POSTS_PER_SOURCE: 10,                // 各データソースから取得する最大投稿数
    MAX_CONTENT_LENGTH: 280,                 // 投稿内容の最大文字数（Twitter風）
    CONTENT_TRUNCATE_LENGTH: 277,            // 切り詰め時の文字数（「...」を含めて280文字）
    
    // レート制限設定（プロキシサービス保護）
    RATE_LIMIT_REQUESTS: 3,                  // 制限回数 - 短時間に3回まで
    RATE_LIMIT_WINDOW: 5 * 60 * 1000,        // 5分間 - 制限監視期間
    RATE_LIMIT_RESET: 60 * 60 * 1000,        // 1時間 - 制限リセット期間
    
    // 自動更新設定
    AUTO_REFRESH_INTERVAL: 60 * 60 * 1000,   // 60分間 - バックグラウンド自動更新間隔
    
    // URL表示設定
    URL_MAX_LENGTH: 50,                      // URL表示の最大文字数
    URL_TRUNCATE_LENGTH: 47                  // URL切り詰め時の文字数（「...」を含めて50文字）
};

// CORS プロキシサービス（環境に応じて最適化）
function getProxyServices() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
        // localhost環境では api.allorigins.win が不安定なため除外
        return [
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
    } else {
        // 本番環境では全てのプロキシを使用
        return [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
    }
}

class PlanetDataSource {
    constructor(config) {
        this.name = config.name;
        this.type = config.type; // 'rss', 'json', 'static'
        this.url = config.url;
        this.icon = config.icon || '📄';
        this.iconImage = config.iconImage || null; // アイコン画像のURL
        this.parser = config.parser || null;
        this.enabled = config.enabled !== false;
    }
}

class PlanetAggregator {
    constructor() {
        this.dataSources = [];
        this.posts = [];
        this.lastUpdate = null;
        this.isLoading = false;
        this.cache = new Map();
        this.rateLimitTracker = new Map();
        
        this.initializeDataSources();
    }
    
    initializeDataSources() {
        // 設定ファイルから読み込む場合は、ここでは初期化しない
        // loadConfig() で設定ファイルから読み込む
        this.dataSources = [];
    }
    
    addDataSource(config) {
        this.dataSources.push(new PlanetDataSource(config));
    }
    
    async loadAllData() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading();
            
            // 設定を読み込み直す
            await this.loadConfig();
            
            this.posts = [];
            const enabledSources = this.dataSources.filter(source => source.enabled);
            console.log(`データソース読み込み開始 (${enabledSources.length}件)`);
            
            // 並列でデータを取得
            const promises = enabledSources.map(source => this.loadFromSource(source));
            await Promise.allSettled(promises);
            
            this.sortPosts();
            this.renderPosts();
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            this.showError('データの読み込みに失敗しました。');
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadConfig() {
        try {
            // planetConfig が存在する場合は、それを使用
            if (typeof planetConfig !== 'undefined' && planetConfig && planetConfig.config) {
                const config = planetConfig.config;
                this.dataSources = [];
                
                // 設定ファイルからデータソースを構築
                config.dataSources.forEach(sourceConfig => {
                    const source = new PlanetDataSource({
                        ...sourceConfig,
                        parser: this.getParserForType(sourceConfig.type)
                    });
                    this.dataSources.push(source);
                });
                
                // 設定読み込み完了（詳細ログ不要）
            }
        } catch (error) {
            console.error('設定読み込みエラー:', error);
        }
    }
    
    getParserForType(type) {
        switch (type) {
            case 'static':
                return this.parseZakkiData.bind(this);
            case 'rss':
                return this.parseRSSFeed.bind(this);
            default:
                return null;
        }
    }
    
    async loadFromSource(source) {
        try {
            // ログは各パーサーで統合表示
            
            if (source.parser) {
                const posts = await source.parser(source);
                if (Array.isArray(posts)) {
                    this.posts.push(...posts);
                }
            }
            
        } catch (error) {
            console.warn(`Failed to load from ${source.name}:`, error);
        }
    }
    
    async parseZakkiData(source) {
        // 雑記帳の最新データを静的に生成（実際にはファイルを読み込むか、APIを叩く）
        const currentDate = new Date();
        const today = this.formatDateISO(currentDate);
        const yesterday = this.formatDateISO(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
        
        return [
            {
                date: today,
                time: '15:30',
                title: 'はてなブックマーク機能を実装',
                url: '/changelog_main.html',
                source: source.name,
                sourceIcon: source.icon,
                content: 'Ten.jsブロック問題を回避して、堅牢なはてなブックマーク表示機能を実装しました。'
            },
            {
                date: yesterday,
                time: '14:20',
                title: 'RSS生成機能を追加',
                url: '/rss.xml',
                source: source.name,
                sourceIcon: source.icon,
                content: 'changelog.htmlから自動でRSSフィードを生成する機能を追加。'
            }
        ];
    }
    
    async parseRSSFeed(source) {
        try {
            // URLの正規化
            let url = source.url;
            
            // 相対URLの場合（このサイト内のRSS）
            if (url.startsWith('/')) {
                url = window.location.origin + url;
            }
            // プロトコルなしの場合
            else if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            // RSS取得ログは結果ログで統合表示
            
            // 同一オリジンかチェック
            const isLocalRSS = url.startsWith(window.location.origin);
            
            if (isLocalRSS) {
                // ローカルRSSは直接取得
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const rssText = await response.text();
                return await this.parseRSSText(rssText, source);
                
            } else {
                // 外部RSSはCORSプロキシを使用またはJSONPで取得
                return await this.parseExternalRSS(url, source);
            }
            
        } catch (error) {
            console.warn(`RSS読み込みエラー (${source.name}):`, error);
            return [];
        }
    }
    
    async parseRSSText(rssText, source) {
        // RSS解析開始ログは冗長なため削除
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rssText, 'text/xml');
        
        // XML解析エラーチェック
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error(`${source.name}: XML解析エラー`, parserError.textContent);
            return [];
        }
        
        // RSS 2.0 または Atom フィードかを判別
        let items = xmlDoc.querySelectorAll('item');
        let feedType = 'RSS';
        if (items.length === 0) {
            // Atomフィードの場合
            items = xmlDoc.querySelectorAll('entry');
            feedType = 'Atom';
        }
        
        const posts = [];
        
        items.forEach((item, index) => {
            if (index >= CONFIG.MAX_POSTS_PER_SOURCE) return;
            
            const post = this.parseRSSItem(item, source);
            if (post) {
                posts.push(post);
                this.logPostInfo(source.name, post, index + 1);
            }
        });
        
        console.log(`${source.name}: ${feedType}フィード解析完了 (${posts.length}件取得)`);
        return posts;
    }
    
    parseRSSItem(item, source) {
        const title = (item.querySelector('title')?.textContent || 'タイトルなし').trim();
        const link = this.extractLinkFromItem(item, source.url);
        let description = this.extractContentFromItem(item);
        const images = this.extractImagesFromItem(item);
        
        // HTMLタグを除去して読みやすくフォーマット
        const originalDescription = description;
        description = this.stripHtmlTags(description);
        description = this.formatMentions(description);
        
        // 改行処理は正常動作中のためデバッグログ削除
        
        const { date, time } = this.extractDateFromItem(item);
        
        return {
            date,
            time,
            title,
            url: link,
            source: source.name,
            sourceIcon: source.icon,
            sourceIconImage: source.iconImage,
            content: description,
            images: images
        };
    }
    
    extractLinkFromItem(item, fallbackUrl) {
        let link = item.querySelector('link')?.textContent || 
                  item.querySelector('link')?.getAttribute('href') || 
                  fallbackUrl;
        
        // Atomフィードのlinkはhref属性にある場合が多い
        if (!link || link.trim() === '') {
            const linkElement = item.querySelector('link[rel="alternate"], link:not([rel])');
            link = linkElement?.getAttribute('href') || fallbackUrl;
        }
        
        return link;
    }
    
    extractContentFromItem(item) {
        return (item.querySelector('description')?.textContent || 
               item.querySelector('summary')?.textContent || 
               item.querySelector('content')?.textContent || '').trim();
    }
    
    extractImagesFromItem(item) {
        const images = [];
        
        // RSS enclosure要素から画像を抽出
        const enclosures = item.querySelectorAll('enclosure');
        enclosures.forEach(enclosure => {
            const url = enclosure.getAttribute('url');
            const type = enclosure.getAttribute('type');
            if (url && type && type.startsWith('image/')) {
                images.push({
                    url: url,
                    type: type,
                    source: 'enclosure'
                });
            }
        });
        
        // Atom content内のimg タグから画像を抽出
        const contentElements = item.querySelectorAll('content, description, summary');
        contentElements.forEach((content, index) => {
            // HTMLタグが含まれている場合はinnerHTMLを優先
            const rawContent = content.innerHTML || content.textContent || '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawContent;
            
            const imgTags = tempDiv.querySelectorAll('img');
            imgTags.forEach(img => {
                const src = img.getAttribute('src');
                if (src) {
                    images.push({
                        url: src,
                        alt: img.getAttribute('alt') || '',
                        type: 'image',
                        source: 'content-img'
                    });
                }
            });
        });
        
        // その他の画像要素を探す
        const otherImageElements = item.querySelectorAll('image, media\\:content, media\\:thumbnail');
        otherImageElements.forEach((element, index) => {
            const url = element.getAttribute('url') || element.getAttribute('href') || element.getAttribute('src');
            const type = element.getAttribute('type');
            
            if (url && (!type || type.startsWith('image/') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                images.push({
                    url: url,
                    type: type || 'image',
                    source: `other-${element.tagName}`
                });
            }
        });
        
        // item全体をスキャンしてURLパターンも探す
        const itemText = item.textContent || '';
        const urlMatches = itemText.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi);
        if (urlMatches) {
            urlMatches.forEach(url => {
                images.push({
                    url: url,
                    type: 'image',
                    source: 'text-pattern'
                });
            });
        }
        
        // 画像が見つかった場合のみログ出力
        if (images.length > 0) {
            console.log(`${item.nodeName}: 画像 ${images.length}件を検出`, images);
        }
        
        return images.slice(0, 4); // 最大4枚まで
    }
    
    extractDateFromItem(item) {
        const pubDate = item.querySelector('pubDate')?.textContent || 
                       item.querySelector('published')?.textContent ||
                       item.querySelector('updated')?.textContent;
        
        if (pubDate) {
            const pubDateTime = new Date(pubDate);
            return {
                date: this.formatDateISO(pubDateTime),
                time: this.formatTime(pubDateTime)
            };
        } else {
            const now = new Date();
            return {
                date: this.formatDateISO(now),
                time: this.formatTime(now)
            };
        }
    }
    
    logPostInfo(sourceName, post, index) {
        // 詳細ログは必要時のみ表示（デバッグ時にコメントアウト）
        // console.log(`${sourceName}: 投稿 ${index}:`, {
        //     title: post.title.substring(0, 50) + (post.title.length > 50 ? '...' : ''),
        //     date: post.date,
        //     time: post.time,
        //     hasContent: !!post.content
        // });
    }
    
    async parseExternalRSS(url, source) {
        try {
            // キャッシュチェック
            const cacheKey = `external_${url}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log(`${source.name}: キャッシュから取得`);
                return cached;
            }
            
            // レート制限チェック
            if (this.isRateLimited(url)) {
                console.warn(`${source.name}: レート制限中、キャッシュまたはフォールバックを使用`);
                return this.createFallbackPost(source, 'レート制限のため一時的に取得できません');
            }
            
            // 複数のCORSプロキシを試行（環境に最適化）
            const proxyServices = getProxyServices().map(proxy => 
                proxy === 'https://api.allorigins.win/get?url=' 
                    ? `${proxy}${encodeURIComponent(url)}`
                    : proxy === 'https://corsproxy.io/?'
                    ? `${proxy}${encodeURIComponent(url)}`
                    : `${proxy}${url}`
            );
            
            for (const proxyUrl of proxyServices) {
                try {
                    const proxyName = proxyUrl.split('://')[1].split('/')[0];
                    console.log(`${source.name}: ${proxyName} 経由で取得試行中...`);
                    
                    const response = await fetch(proxyUrl);
                    if (!response.ok) continue;
                    
                    let rssText;
                    if (proxyUrl.includes('allorigins.win')) {
                        const data = await response.json();
                        rssText = data.contents;
                    } else {
                        rssText = await response.text();
                    }
                    
                    if (rssText) {
                        console.log(`${source.name}: プロキシ経由で取得成功`);
                        const posts = await this.parseRSSText(rssText, source);
                        
                        // 成功した結果をキャッシュに保存
                        this.saveToCache(cacheKey, posts);
                        
                        // レート制限トラッカーを更新
                        this.updateRateLimit(url);
                        
                        return posts;
                    }
                    
                } catch (proxyError) {
                    console.log(`プロキシ ${proxyUrl.split('://')[1].split('/')[0]} 失敗、次のプロキシを試行中...`);
                    continue;
                }
            }
            
            // 全てのプロキシが失敗した場合のフォールバック
            console.warn(`外部RSS (${source.name}) の取得に失敗しました: ${url}`);
            
            // 古いキャッシュがあれば使用
            const oldCache = this.getFromCache(cacheKey, true); // 期限切れでも取得
            if (oldCache && oldCache.length > 0) {
                console.log(`${source.name}: 期限切れキャッシュを使用`);
                return oldCache;
            }
            
            return this.createFallbackPost(source, 'RSSフィードの取得に失敗しました');
            
        } catch (error) {
            console.warn(`外部RSS取得エラー (${source.name}):`, error);
            return [];
        }
    }
    
    // キャッシュ管理
    getFromCache(key, includeExpired = false) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        const now = Date.now();
        const isExpired = now > item.timestamp + CONFIG.CACHE_TIMEOUT;
        
        if (isExpired && !includeExpired) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // キャッシュサイズ制限
        if (this.cache.size > CONFIG.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
    
    // レート制限管理
    isRateLimited(url) {
        const tracker = this.rateLimitTracker.get(url);
        if (!tracker) return false;
        
        const now = Date.now();
        const timeSinceLastRequest = now - tracker.lastRequest;
        
        // 設定された制限回数・時間をチェック
        if (tracker.count >= CONFIG.RATE_LIMIT_REQUESTS && 
            timeSinceLastRequest < CONFIG.RATE_LIMIT_WINDOW) {
            return true;
        }
        
        // 設定された時間経過したらリセット
        if (timeSinceLastRequest > CONFIG.RATE_LIMIT_RESET) {
            this.rateLimitTracker.delete(url);
            return false;
        }
        
        return false;
    }
    
    updateRateLimit(url) {
        const now = Date.now();
        const tracker = this.rateLimitTracker.get(url) || { count: 0, lastRequest: 0 };
        
        // 制限ウィンドウ内の場合はカウント増加
        if (now - tracker.lastRequest < CONFIG.RATE_LIMIT_WINDOW) {
            tracker.count++;
        } else {
            tracker.count = 1;
        }
        
        tracker.lastRequest = now;
        this.rateLimitTracker.set(url, tracker);
    }
    
    createFallbackPost(source, message) {
        return [{
            date: this.formatDateISO(new Date()),
            time: this.formatTime(new Date()),
            title: `${source.name} - 取得エラー`,
            url: source.url,
            source: source.name,
            sourceIcon: source.icon,
            sourceIconImage: source.iconImage,
            content: message,
            images: []
        }];
    }
    
    // HTMLタグを除去してプレーンテキストに変換
    stripHtmlTags(html) {
        if (!html) return '';
        
        // 一時的なDOM要素を作成してHTMLをパース
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // ブロック要素を改行に変換（<p>, <div>, <br>など）
        const blockElements = tempDiv.querySelectorAll('p, div, br, h1, h2, h3, h4, h5, h6');
        blockElements.forEach(element => {
            if (element.tagName === 'BR') {
                element.replaceWith('\n');
            } else {
                // ブロック要素の前後に改行を追加
                element.insertAdjacentText('beforebegin', '\n');
                element.insertAdjacentText('afterend', '\n');
            }
        });
        
        // リンクを適切に処理
        const links = tempDiv.querySelectorAll('a');
        links.forEach(link => {
            const text = link.textContent.trim();
            const href = link.getAttribute('href');
            if (href) {
                // URLが表示テキストと同じ場合は短縮URL表示
                if (href === text || text.startsWith('http')) {
                    if (href.length > CONFIG.URL_MAX_LENGTH) {
                        link.textContent = href.substring(0, CONFIG.URL_TRUNCATE_LENGTH) + '...';
                    }
                } else if (text && href !== text) {
                    // テキストとURLが異なる場合はテキストのみ表示
                    link.textContent = text;
                }
            }
        });
        
        // コードブロックを「`code`」形式に変換
        const codes = tempDiv.querySelectorAll('code');
        codes.forEach(code => {
            const text = code.textContent.trim();
            if (text) {
                code.textContent = `\`${text}\``;
            }
        });
        
        // プレーンテキストを取得
        let plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        // 改行と空白の正規化
        plainText = plainText
            .replace(/[ \t]+/g, ' ')  // 複数のスペース・タブを1つに（改行は保持）
            .replace(/\n\s*\n\s*/g, '\n\n')  // 複数の改行を2つまでに制限
            .replace(/\n{3,}/g, '\n\n')  // 3つ以上の改行は2つに
            .replace(/^\n+|\n+$/g, '')  // 先頭・末尾の改行を除去
            .trim();
        
        // 長すぎる場合は切り詰め（改行を考慮）
        if (plainText.length > CONFIG.MAX_CONTENT_LENGTH) {
            // 改行位置を考慮して切り詰め
            let truncated = plainText.substring(0, CONFIG.CONTENT_TRUNCATE_LENGTH);
            const lastLineBreak = truncated.lastIndexOf('\n');
            if (lastLineBreak > 200) {
                // 200文字以降に改行があれば、そこで切る
                truncated = truncated.substring(0, lastLineBreak);
            }
            plainText = truncated + '...';
        }
        
        return plainText;
    }
    
    // メンション (@user@domain) を読みやすい形式に変換
    formatMentions(text) {
        if (!text) return '';
        
        // @user@domain 形式のメンションを @user に短縮
        return text.replace(/@([^@\s]+)@[^@\s]+/g, '@$1');
    }
    
    sortPosts() {
        this.posts.sort((a, b) => {
            const dateTimeA = new Date(`${a.date} ${a.time}`);
            const dateTimeB = new Date(`${b.date} ${b.time}`);
            return dateTimeB - dateTimeA; // 新しい順
        });
    }
    
    renderPosts() {
        const container = document.getElementById('planet-content');
        const postsByDate = this.groupPostsByDate();
        
        if (Object.keys(postsByDate).length === 0) {
            container.innerHTML = '<div class="error">表示する投稿がありません。</div>';
            return;
        }
        
        let html = '';
        for (const [date, posts] of Object.entries(postsByDate)) {
            html += this.renderDateSection(date, posts);
        }
        
        container.innerHTML = html;
    }
    
    groupPostsByDate() {
        const grouped = {};
        this.posts.forEach(post => {
            if (!grouped[post.date]) {
                grouped[post.date] = [];
            }
            grouped[post.date].push(post);
        });
        return grouped;
    }
    
    renderDateSection(date, posts) {
        const formattedDate = this.formatDateDisplay(date);
        let html = `<div class="date-section">`;
        html += `<h2 class="date-header">${formattedDate}</h2>`;
        html += `<ul class="post-list">`;
        
        posts.forEach(post => {
            html += `<li class="post-item">`;
            
            // アイコン画像またはテキストアイコンを表示
            let sourceIcon = '';
            if (post.sourceIconImage) {
                sourceIcon = `<img src="${post.sourceIconImage}" alt="${post.source} icon" class="source-icon-image">`;
            } else {
                sourceIcon = post.sourceIcon;
            }
            
            if (post.content && post.content.length > 0) {
                const shortContent = post.content.length > 280 ? 
                    post.content.substring(0, 277) + '...' : post.content;
                html += `<div class="post-content">`;
                html += `<span class="post-text">${this.escapeHtml(shortContent)}</span>`;
                html += `<span class="post-source">- ${sourceIcon} ${post.source}</span>`;
                
                // 画像がある場合は表示
                if (post.images && post.images.length > 0) {
                    html += this.renderPostImages(post.images);
                }
                
                html += `</div>`;
            } else {
                // 内容がない場合はタイトルを表示
                html += `<div class="post-content">`;
                html += `<span class="post-text">${this.escapeHtml(post.title)}</span>`;
                html += `<span class="post-source">- ${sourceIcon} ${post.source}</span>`;
                
                // 画像がある場合は表示
                if (post.images && post.images.length > 0) {
                    html += this.renderPostImages(post.images);
                }
                
                html += `</div>`;
            }
            
            html += `<a href="${post.url}" class="post-time-link">(${post.time})</a>`;
            html += `</li>`;
        });
        
        html += `</ul></div>`;
        return html;
    }
    
    renderPostImages(images) {
        if (!images || images.length === 0) return '';
        
        const imageCount = Math.min(images.length, 4);
        let html = `<div class="post-images images-${imageCount}">`;
        
        images.forEach((image, index) => {
            if (index < 4) { // 最大4枚まで表示
                html += `<div class="post-image-container">`;
                html += `<img src="${this.escapeHtml(image.url)}" 
                         alt="${this.escapeHtml(image.alt || '添付画像')}" 
                         class="post-image"
                         loading="lazy"
                         onerror="this.style.display='none'">`;
                html += `</div>`;
            }
        });
        
        html += `</div>`;
        return html;
    }
    
    formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    formatDateDisplay(dateStr) {
        const date = new Date(dateStr);
        return dateStr; // 2025-09-04 形式のまま表示
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showLoading() {
        const container = document.getElementById('planet-content');
        container.innerHTML = '<div class="loading">📡 データを読み込み中...</div>';
    }
    
    showError(message) {
        const container = document.getElementById('planet-content');
        container.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
    }
    
    updateLastUpdateTime() {
        this.lastUpdate = new Date();
        const timeStr = this.lastUpdate.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const element = document.getElementById('last-update-time');
        if (element) {
            element.textContent = timeStr;
        }
    }
    
    // 設定管理
    enableDataSource(name) {
        const source = this.dataSources.find(s => s.name === name);
        if (source) {
            source.enabled = true;
        }
    }
    
    disableDataSource(name) {
        const source = this.dataSources.find(s => s.name === name);
        if (source) {
            source.enabled = false;
        }
    }
    
    updateDataSourceUrl(name, url) {
        const source = this.dataSources.find(s => s.name === name);
        if (source) {
            source.url = url;
            source.enabled = true;
        }
    }
}

// グローバルインスタンス
let planetAggregator = null;

// 初期化関数
function initializePlanet() {
    planetAggregator = new PlanetAggregator();
    planetAggregator.loadAllData();
    
    // 自動更新（レート制限対策）
    setInterval(() => {
        if (planetAggregator && !planetAggregator.isLoading) {
            console.log('自動更新実行中...');
            planetAggregator.loadAllData();
        }
    }, CONFIG.AUTO_REFRESH_INTERVAL);
}

// 手動更新ボタン用
function refreshPlanet() {
    if (planetAggregator) {
        planetAggregator.loadAllData();
    }
}

// エクスポート（CommonJS/ESModules対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlanetAggregator, initializePlanet, refreshPlanet };
}
