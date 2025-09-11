#!/usr/bin/env node

/**
 * RSS Feed Generator for 100%health
 * changelog.htmlからRSSフィードを自動生成
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class ChangelogRSSGenerator {
  constructor(config = {}) {
    this.config = {
      changelogPath: config.changelogPath || './include/changelog.html',
      outputPath: config.outputPath || './rss.xml',
      siteUrl: config.siteUrl || 'https://yuinoid.neocities.org',
      siteTitle: config.siteTitle || '100%health - 更新情報',
      siteDescription: config.siteDescription || '100%healthサイトの更新履歴',
      maxItems: config.maxItems || 20,
      maxAge: config.maxAge || null, // 最大保持期間（日数）null=無制限
      incrementalItems: config.incrementalItems || 5, // 増分更新で処理する最新エントリ数
      useGenerationTime: config.useGenerationTime || true, // 生成時刻を使用
      guidType: config.guidType || 'semantic', // 'semantic', 'random', 'uuid'
      ...config
    };
  }

  /**
   * 既存のRSSフィードを読み込み
   */
  loadExistingRSS() {
    try {
      if (!fs.existsSync(this.config.outputPath)) {
        return [];
      }
      
      const xml = fs.readFileSync(this.config.outputPath, 'utf8');
      const dom = new JSDOM(xml, { contentType: 'text/xml' });
      const items = dom.window.document.querySelectorAll('item');
      
      const existingItems = [];
      for (const item of items) {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const category = item.querySelector('category')?.textContent || '';
        const guid = item.querySelector('guid')?.textContent || '';
        
        existingItems.push({ title, link, description, pubDate, category, guid });
      }
      
      return existingItems;
    } catch (error) {
      console.log('既存RSSの読み込みに失敗（初回生成の可能性）:', error.message);
      return [];
    }
  }

  /**
   * changelog.htmlから最新エントリのみを抽出（増分更新）
   */
  parseChangelogIncremental() {
    try {
      const html = fs.readFileSync(this.config.changelogPath, 'utf8');
      const dom = new JSDOM(html);
      const items = dom.window.document.querySelectorAll('ol > li');
      console.log(`総エントリ数: ${items.length}`);
      
      const newRssItems = [];
      const processingLimit = this.config.incrementalItems;
      let processedCount = 0;
      
      // 最新のエントリから処理（changelog.htmlは古い順なので逆順）
      const itemsArray = Array.from(items).reverse();
      
      for (const item of itemsArray) {
        if (processedCount >= processingLimit) break;
        
        const rssItem = this.extractRSSData(item, true); // 増分更新フラグを渡す
        if (rssItem) {
          newRssItems.push(rssItem);
          console.log(`✅ 新規エントリ: ${rssItem.title}`);
          processedCount++;
        }
      }
      
      console.log(`増分処理: ${processedCount}件の新規エントリを処理`);
      return newRssItems;
    } catch (error) {
      console.error('changelog.htmlの解析エラー:', error);
      return [];
    }
  }

  /**
   * 新規エントリと既存エントリをマージ
   */
  mergeRSSFeeds(existingItems, newItems) {
    // 既存のGUIDセットを作成（重複回避）
    const existingGuids = new Set(existingItems.map(item => item.guid));
    
    console.log('🔍 デバッグ情報:');
    console.log(`既存GUID: ${Array.from(existingGuids).join(', ')}`);
    console.log(`新規GUID: ${newItems.map(item => item.guid).join(', ')}`);
    
    // 新規エントリから重複を除外
    const uniqueNewItems = newItems.filter(item => {
      const isUnique = !existingGuids.has(item.guid);
      console.log(`${item.guid}: ${isUnique ? '✅ 新規' : '❌ 重複'}`);
      return isUnique;
    });
    
    console.log(`マージ: 既存${existingItems.length}件 + 新規${uniqueNewItems.length}件`);
    
    // 結合して日付順ソート
    const allItems = [...uniqueNewItems, ...existingItems];
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 重複除去（タイトル+日付ベース）
    const deduplicatedItems = this.removeDuplicates(allItems);
    
    // 最大件数でカット
    return deduplicatedItems.slice(0, this.config.maxItems);
  }

  /**
   * 重複エントリを除去（タイトルベース、最新日付を保持）
   */
  removeDuplicates(items) {
    const titleMap = new Map();
    
    for (const item of items) {
      const title = item.title;
      if (!titleMap.has(title)) {
        titleMap.set(title, item);
      } else {
        // 既存のエントリと比較して、より新しい日付のものを保持
        const existing = titleMap.get(title);
        const existingDate = new Date(existing.pubDate);
        const currentDate = new Date(item.pubDate);
        
        if (currentDate > existingDate) {
          console.log(`🔄 重複更新: ${title} (${existing.pubDate} → ${item.pubDate})`);
          titleMap.set(title, item);
        } else {
          console.log(`🔄 重複除去: ${title} (${item.pubDate})`);
        }
      }
    }
    
    const uniqueItems = Array.from(titleMap.values());
    console.log(`重複除去: ${items.length}件 → ${uniqueItems.length}件`);
    return uniqueItems;
  }

  /**
   * li要素からRSSデータを抽出
   */
  extractRSSData(liElement, isIncremental = false) {
    try {
      // 日付の抽出
      const dateMatch = liElement.textContent.match(/>\s*(\d{4}\/\d{2}\/\d{2})/);
      if (!dateMatch) return null;
      
      const dateStr = dateMatch[1];
      
      // 2025年09月03日以降のエントリのみ含める
      const cutoffDate = new Date('2025-09-03T00:00:00Z');
      const [year, month, day] = dateStr.split('/');
      const entryDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      
      // 2025/09/03以降を含める（>=）
      if (entryDate >= cutoffDate) {
        // 含める
      } else {
        return null;
      }
      
      // 生成時刻を使用するかchangelog日付を使用するか選択
      // 増分更新時は新規エントリのみ生成時刻を使用
      const pubDate = (this.config.useGenerationTime && isIncremental)
        ? new Date().toUTCString() 
        : this.formatRSSDate(dateStr);
      
      // リンクとタイトルの抽出
      const linkElement = liElement.querySelector('a');
      let title, link, description;
      
      if (linkElement) {
        title = linkElement.textContent.trim();
        link = this.config.siteUrl + linkElement.getAttribute('href');
        
        // description要素の確認
        const descriptionElement = liElement.querySelector('.description');
        if (descriptionElement) {
          description = descriptionElement.textContent.trim();
        } else {
          // 従来の方法：全テキストから日付を除去
          description = liElement.textContent.replace(dateMatch[0], '').trim();
        }
      } else {
        // リンクがない場合
        const fullText = liElement.textContent.replace(dateMatch[0], '').trim().replace(/"/g, '');
        title = fullText;
        link = this.config.siteUrl;
        
        // description要素の確認
        const descriptionElement = liElement.querySelector('.description');
        if (descriptionElement) {
          description = descriptionElement.textContent.trim();
        } else {
          description = title;
        }
      }
      
      // カテゴリの推定（data属性があれば使用、なければリンクから推定）
      let category = liElement.getAttribute('data-rss-category');
      if (!category) {
        category = this.estimateCategory(linkElement?.getAttribute('href') || '');
      }
      
      // GUIDの生成（data属性があれば使用、なければ自動生成）
      let guid = liElement.getAttribute('data-rss-guid');
      if (!guid) {
        // デフォルト：意味のある文字列（タイトル+日付のハッシュ）
        const titleHash = this.simpleHash(title);
        guid = `${titleHash}-${dateStr.replace(/\//g, '')}`;
      }
      
      return {
        title,
        link,
        description,
        pubDate,
        category,
        guid: this.config.siteUrl + '/rss#' + guid
      };
    } catch (error) {
      console.error('RSSデータ抽出エラー:', error);
      return null;
    }
  }

  /**
   * リンクURLからカテゴリを推定
   */
  estimateCategory(href) {
    if (!href) return 'misc';
    
    if (href.includes('/gallery/')) return 'gallery';
    if (href.includes('/txt/zakki/')) return 'zakki';
    if (href.includes('/txt/')) return 'txt';
    if (href.includes('/links/')) return 'links';
    if (href.includes('/works/')) return 'works';
    
    return 'misc';
  }

  /**
   * 日付をRSS形式（RFC 822）に変換
   */
  formatRSSDate(dateStr) {
    const [year, month, day] = dateStr.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toUTCString();
  }

  /**
   * ランダムなGUIDを生成（簡易版）
   */
  generateRandomGUID() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * 文字列の簡易ハッシュを生成（GUID用）
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * RSSのXMLを生成
   */
  generateRSSXML(items) {
    const now = new Date().toUTCString();
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${this.escapeXML(this.config.siteTitle)}</title>
    <link>${this.config.siteUrl}</link>
    <description>${this.escapeXML(this.config.siteDescription)}</description>
    <language>ja</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>100%health RSS Generator</generator>
    
${items.map(item => this.generateRSSItem(item)).join('\n')}
  </channel>
</rss>`;

    return xml;
  }

  /**
   * 個別のRSSアイテムを生成
   */
  generateRSSItem(item) {
    return `    <item>
      <title>${this.escapeXML(item.title)}</title>
      <link>${this.escapeXML(item.link)}</link>
      <description>${this.escapeXML(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <category>${this.escapeXML(item.category)}</category>
      <guid isPermaLink="false">${this.escapeXML(item.guid)}</guid>
    </item>`;
  }

  /**
   * XML用エスケープ
   */
  escapeXML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * RSS生成の実行（増分更新）
   */
  generate() {
    console.log('RSS生成開始（増分更新モード）...');
    
    // 既存RSSを読み込み
    const existingItems = this.loadExistingRSS();
    
    // 最新エントリのみを処理
    const newItems = this.parseChangelogIncremental();
    
    // マージ
    const allItems = this.mergeRSSFeeds(existingItems, newItems);
    
    console.log(`最終RSS: ${allItems.length}個のエントリ`);
    
    const rssXML = this.generateRSSXML(allItems);
    
    fs.writeFileSync(this.config.outputPath, rssXML, 'utf8');
    console.log(`RSSフィードを生成: ${this.config.outputPath}`);
    
    return this.config.outputPath;
  }

  /**
   * フル再生成（従来の方式）
   */
  generateFull() {
    console.log('RSS生成開始（フル再生成）...');
    
    const items = this.parseChangelogFull();
    console.log(`${items.length}個のエントリを処理`);
    
    const rssXML = this.generateRSSXML(items);
    
    fs.writeFileSync(this.config.outputPath, rssXML, 'utf8');
    console.log(`RSSフィードを生成: ${this.config.outputPath}`);
    
    return this.config.outputPath;
  }

  /**
   * changelog.html全体をパースしてRSSアイテムを抽出（フル再生成用）
   */
  parseChangelogFull() {
    try {
      const html = fs.readFileSync(this.config.changelogPath, 'utf8');
      const dom = new JSDOM(html);
      const items = dom.window.document.querySelectorAll('ol > li');
      console.log(`総エントリ数: ${items.length}`);
      
      const rssItems = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rssItem = this.extractRSSData(item);
        if (rssItem) {
          rssItems.push(rssItem);
          console.log(`✅ RSSに追加: ${rssItem.title} (${rssItem.pubDate})`);
        }
      }
      
      // 日付順（新しい順）でソート
      rssItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      
      return rssItems.slice(0, this.config.maxItems);
    } catch (error) {
      console.error('changelog.htmlの解析エラー:', error);
      return [];
    }
  }
}

// スクリプト実行時
if (require.main === module) {
  const generator = new ChangelogRSSGenerator();
  generator.generate();
}

module.exports = ChangelogRSSGenerator;
