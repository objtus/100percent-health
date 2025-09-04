/**
 * Planet Configuration Manager
 * 設定の読み込み・保存・管理
 */

class PlanetConfig {
    constructor() {
        this.config = null;
        this.defaultConfigPath = './planet-config.json';
        this.userConfigKey = 'planet-user-config';
    }
    
    async loadConfig() {
        try {
            // キャッシュを回避するためのタイムスタンプを追加
            const cacheBuster = new Date().getTime();
            const configUrl = `${this.defaultConfigPath}?t=${cacheBuster}`;
            
            // デフォルト設定を読み込み
            const response = await fetch(configUrl);
            if (!response.ok) {
                throw new Error(`設定ファイルの読み込みに失敗: ${response.status}`);
            }
            
            this.config = await response.json();
            console.log('設定ファイルを読み込みました:', this.config);
            
            // ユーザー設定があれば上書き
            const userConfig = this.loadUserConfig();
            if (userConfig) {
                this.mergeUserConfig(userConfig);
            }
            
            return this.config;
            
        } catch (error) {
            console.error('設定読み込みエラー:', error);
            // フォールバック設定
            this.config = this.getDefaultConfig();
            return this.config;
        }
    }
    
    loadUserConfig() {
        try {
            const stored = localStorage.getItem(this.userConfigKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('ユーザー設定の読み込みに失敗:', error);
            return null;
        }
    }
    
    saveUserConfig() {
        try {
            // データソースのURL設定のみ保存（セキュリティ考慮）
            const userConfig = {
                dataSources: this.config.dataSources.map(source => ({
                    name: source.name,
                    url: source.url,
                    enabled: source.enabled
                })),
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem(this.userConfigKey, JSON.stringify(userConfig));
            return true;
            
        } catch (error) {
            console.error('ユーザー設定の保存に失敗:', error);
            return false;
        }
    }
    
    mergeUserConfig(userConfig) {
        if (!userConfig.dataSources) return;
        
        // データソースの設定をマージ（空文字列でない場合のみ）
        userConfig.dataSources.forEach(userSource => {
            const configSource = this.config.dataSources.find(s => s.name === userSource.name);
            if (configSource) {
                // URLが空文字列でない場合のみ上書き（設定ファイルの値を保持）
                if (userSource.url !== undefined && userSource.url !== '') {
                    configSource.url = userSource.url;
                }
                // enabledは常に反映（ユーザーが明示的に変更した場合）
                if (userSource.enabled !== undefined) {
                    configSource.enabled = userSource.enabled;
                }
            }
        });
    }
    
    getDefaultConfig() {
        return {
            site: {
                title: "planet 100%health",
                description: "個人の最新情報を1つのページにまとめたもの",
                author: "100%health",
                maxPostsPerSource: 10,
                maxPostsTotal: 50,
                autoRefreshInterval: 1800000
            },
            dataSources: [
                {
                    name: "雑記帳",
                    type: "static",
                    url: "/txt/zakki/",
                    icon: "📝",
                    enabled: true,
                    description: "このサイトの雑記帳"
                },
                {
                    name: "更新履歴",
                    type: "rss",
                    url: "/rss.xml",
                    icon: "📋",
                    enabled: true,
                    description: "サイトの更新履歴RSS"
                }
            ],
            display: {
                dateFormat: "YYYY-MM-DD",
                timeFormat: "HH:mm",
                postsPerPage: 25,
                showSummary: true,
                summaryLength: 100,
                groupByDate: true
            },
            features: {
                autoRefresh: true,
                manualRefresh: true,
                rssOutput: false,
                jsonOutput: false
            }
        };
    }
    
    // データソース管理
    getDataSource(name) {
        return this.config?.dataSources.find(s => s.name === name);
    }
    
    updateDataSource(name, updates) {
        const source = this.getDataSource(name);
        if (source) {
            Object.assign(source, updates);
            this.saveUserConfig();
            return true;
        }
        return false;
    }
    
    enableDataSource(name) {
        return this.updateDataSource(name, { enabled: true });
    }
    
    disableDataSource(name) {
        return this.updateDataSource(name, { enabled: false });
    }
    
    setDataSourceUrl(name, url) {
        return this.updateDataSource(name, { url: url, enabled: !!url });
    }
    
    getEnabledDataSources() {
        return this.config?.dataSources.filter(s => s.enabled) || [];
    }
    
    // 設定値取得
    getSiteConfig() {
        return this.config?.site || this.getDefaultConfig().site;
    }
    
    getDisplayConfig() {
        return this.config?.display || this.getDefaultConfig().display;
    }
    
    getFeaturesConfig() {
        return this.config?.features || this.getDefaultConfig().features;
    }
    
    // 設定UI生成（管理画面用）
    generateConfigUI() {
        if (!this.config) return '';
        
        let html = '<div class="config-panel">';
        html += '<h3>📝 データソース設定</h3>';
        
        this.config.dataSources.forEach(source => {
            html += `<div class="config-item">`;
            html += `<label class="config-label">`;
            html += `<input type="checkbox" ${source.enabled ? 'checked' : ''} 
                     onchange="toggleDataSource('${source.name}', this.checked)">`;
            html += `${source.icon} ${source.name}`;
            html += `</label>`;
            
            if (source.type === 'rss' && !source.url) {
                html += `<input type="url" class="config-url" 
                         placeholder="${source.placeholder || 'RSS URL を入力'}" 
                         onchange="updateDataSourceUrl('${source.name}', this.value)">`;
            } else if (source.url) {
                html += `<span class="config-current-url">${source.url}</span>`;
            }
            
            html += `<div class="config-description">${source.description}</div>`;
            html += `</div>`;
        });
        
        html += '</div>';
        return html;
    }
}

// グローバル設定インスタンス
let planetConfig = null;

// 設定初期化
async function initializePlanetConfig() {
    planetConfig = new PlanetConfig();
    await planetConfig.loadConfig();
    return planetConfig;
}

// 設定管理用ヘルパー関数
function toggleDataSource(name, enabled) {
    if (planetConfig) {
        if (enabled) {
            planetConfig.enableDataSource(name);
        } else {
            planetConfig.disableDataSource(name);
        }
        
        // Planet を再読み込み
        if (typeof refreshPlanet === 'function') {
            refreshPlanet();
        }
    }
}

function updateDataSourceUrl(name, url) {
    if (planetConfig && url.trim()) {
        planetConfig.setDataSourceUrl(name, url.trim());
        
        // Planet を再読み込み
        if (typeof refreshPlanet === 'function') {
            refreshPlanet();
        }
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlanetConfig, initializePlanetConfig };
}
