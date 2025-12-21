// タグページ共通のローダースクリプト
// 設定オブジェクト
const CONFIG = {
  security: {
    maxRequestsPerMinute: 60,
    requestTimeout: 10000,
    internalUrlPattern: /^\/txt\/zakki\/\d{4}\/\d{2}\/(days\/\d{4}-\d{2}-\d{2}\.html|zakki\d{2}\.js)$/,
    allowedHrefPatterns: [/^\//, /^https?:\/\//, /^mailto:/, /^#/],
    blockedProtocols: ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'],
    allowedTagPattern: /^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/,
    maxTagLength: 50,
    allowedHtmlTags: ['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'span', 'div', 'ul', 'ol', 'li', 'br', 'hr', 'strong', 'em', 'iframe', 'section', 'ruby', 'rt'],
    allowedAttributes: ['class', 'href', 'data-relevance', 'width', 'height', 'src', 'frameborder', 'allow', 'allowfullscreen', 'referrerpolicy', 'title', 'target', 'style']
  },
  processing: {
    batchSize: 4,
    startYear: 2024,
    endYear: new Date().getFullYear() + 1
  },
  ui: {
    allowedSortMethods: ['date-desc', 'date-asc', 'relevance-desc', 'relevance-asc'],
    relevanceSliderStep: 10
  },
  trustedEmbedPlatforms: {
    youtube: {
      patterns: [/^https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+/, /^https:\/\/youtube\.com\/embed\/[a-zA-Z0-9_-]+/, /^https:\/\/www\.youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]+/],
      name: 'YouTube'
    },
    niconico: {
      patterns: [/^https:\/\/embed\.nicovideo\.jp\/watch\/[a-z]{2}\d+/, /^https:\/\/www\.nicovideo\.jp\/embed\/[a-z]{2}\d+/],
      name: 'ニコニコ動画'
    },
    bandcamp: {
      patterns: [/^https:\/\/bandcamp\.com\/EmbeddedPlayer\//, /^https:\/\/[a-zA-Z0-9-]+\.bandcamp\.com\/EmbeddedPlayer\//],
      name: 'Bandcamp'
    },
    soundcloud: {
      patterns: [/^https:\/\/w\.soundcloud\.com\/player\//],
      name: 'SoundCloud'
    },
    spotify: {
      patterns: [/^https:\/\/open\.spotify\.com\/embed\//],
      name: 'Spotify'
    }
  }
};
const SECURITY_CONFIG = CONFIG.security; // 後方互換性
// リクエスト制限管理
const requestTracker = {
  requests: [],
  add() {
    const now = Date.now();
    this.requests.push(now);
    this.requests = this.requests.filter(time => now - time < 60000);
  },
  canMakeRequest() { return this.requests.length < CONFIG.security.maxRequestsPerMinute; }
};
// 状態管理
const state = {
  sortMethod: 'date-desc',
  minRelevance: 0,
  filteredArticles: [],
  uniqueArticles: []
};
// セキュリティヘルパー関数
const SecurityHelpers = {
  validateInternalUrl: url => CONFIG.security.internalUrlPattern.test(url),
  validateHrefUrl(url) {
    if (typeof url !== 'string') return false;
    const lowerUrl = url.toLowerCase();
    if (CONFIG.security.blockedProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      console.warn(`Blocked dangerous protocol in URL: ${url}`);
      return false;
    }
    return CONFIG.security.allowedHrefPatterns.some(pattern => pattern.test(url));
  },
  validateUrl(url) { return this.validateInternalUrl(url); },
  validateTag(tag) {
    return tag && typeof tag === 'string' && tag.length <= CONFIG.security.maxTagLength && CONFIG.security.allowedTagPattern.test(tag);
  },
  sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[<>"'&]/g, match => ({'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'})[match]);
  },
  createSecureElement(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);
    if (textContent) element.textContent = textContent;
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === 'string') element.setAttribute(key, this.sanitizeText(value));
    });
    return element;
  },
  async secureFetch(url, options = {}) {
    if (!this.validateUrl(url)) throw new Error(`Invalid URL: ${url}`);
    if (!requestTracker.canMakeRequest()) throw new Error('Request rate limit exceeded');
    requestTracker.add();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.security.requestTimeout);
    try {
      const response = await fetch(url, {...options, signal: controller.signal});
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
};
// DOM要素キャッシュシステム
class DOMCache {
  constructor() {
    this.cache = new Map();
    this.selectors = new Map();
  }
  register(key, selector, useQueryAll = false) {
    this.selectors.set(key, {selector, useQueryAll});
    return this;
  }
  get(key) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (!Array.isArray(cached)) {
        if (cached && document.contains(cached)) return cached;
      } else {
        const validElements = cached.filter(el => document.contains(el));
        if (validElements.length === cached.length) return validElements;
      }
      this.cache.delete(key);
    }
    const selectorInfo = this.selectors.get(key);
    if (!selectorInfo) return null;
    const {selector, useQueryAll} = selectorInfo;
    const element = useQueryAll ? Array.from(document.querySelectorAll(selector)) : document.querySelector(selector);
    if (element) this.cache.set(key, element);
    return element;
  }
  clear(key) { key ? this.cache.delete(key) : this.cache.clear(); }
  invalidate(selector) {
    for (const [key, info] of this.selectors.entries()) {
      if (info.selector === selector) this.cache.delete(key);
    }
  }
}
const domCache = new DOMCache()
  .register('loadingIndicator', '#loading-indicator')
  .register('progressBar', '.progress-bar')
  .register('loadingStatus', '#loading-status')
  .register('container', '.tag-articles')
  .register('tagStats', '.tag-stats')
  .register('tagSortBtns', '.tag-sort-btn', true)
  .register('tagSlider', '.tag-slider')
  .register('tagSliderValue', '.tag-slider-value');
const elements = {
  getLoadingIndicator: () => domCache.get('loadingIndicator'),
  getProgressBar: () => domCache.get('progressBar'),
  getLoadingStatus: () => domCache.get('loadingStatus'),
  getContainer: () => domCache.get('container')
};
function updateLoadingIndicator(percentage, completedMonths, totalMonths) {
  const progressBar = elements.getProgressBar();
  const loadingStatus = elements.getLoadingStatus();
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    if (completedMonths !== undefined && totalMonths !== undefined) {
      loadingStatus.textContent = `${completedMonths}/${totalMonths} 月を処理中...`;
    }
  }
}

async function loadTaggedArticles(tag) {
  if (!SecurityHelpers.validateTag(tag)) throw new Error(`Invalid tag name: ${tag}`);
  const loadingIndicator = elements.getLoadingIndicator();
  const loadingStatus = elements.getLoadingStatus();
  const container = elements.getContainer();
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  if (loadingStatus) loadingStatus.textContent = 'ディレクトリを読み込み中...';
  updateLoadingIndicator(0);
  const years = generateYearRange(CONFIG.processing.startYear, CONFIG.processing.endYear);
  const totalMonths = years.length * 12;
  let completedMonths = 0;
  const monthPromises = years.flatMap(year =>
    Array.from({length: 12}, (_, i) => {
      const month = String(i + 1).padStart(2, '0');
      return async () => {
        const result = await processMonth(year, month, tag);
        completedMonths++;
        updateLoadingIndicator(Math.round((completedMonths / totalMonths) * 100), completedMonths, totalMonths);
        return result;
      };
    })
  );
  const results = await processBatches(monthPromises, CONFIG.processing.batchSize);
  state.uniqueArticles = removeDuplicates(results.flat());
  renderArticles(tag, container);
  console.log(`Found ${state.filteredArticles.length} articles with tag: ${tag}`);
}

async function processBatches(tasks, batchSize) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batchResults = await Promise.all(tasks.slice(i, i + batchSize).map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

function removeDuplicates(articles) {
  const uniqueArticles = [];
  const allSignatures = new Set();
  articles.forEach(article => {
    if (!allSignatures.has(article.signature)) {
      uniqueArticles.push(article);
      allSignatures.add(article.signature);
    } else {
      console.log(`Removed global duplicate from ${article.date}`);
    }
  });
  return uniqueArticles;
}

function renderArticles(tag, container) {
  if (!container) container = elements.getContainer();
  const loadingIndicator = elements.getLoadingIndicator();
  state.filteredArticles = applySortAndFilter(state.uniqueArticles, state.sortMethod, state.minRelevance);
  const groupedByDate = groupArticlesByDate(state.filteredArticles);
  const secureContent = createSecureArticlesHTML(groupedByDate, tag, state.sortMethod);
  if (container) {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    const controlsPanel = createControlsPanel(tag, () => renderArticles(tag, container));
    const fragment = document.createDocumentFragment();
    container.textContent = '';
    fragment.appendChild(controlsPanel);
    if (state.filteredArticles.length > 0) {
      const articlesContainer = document.createElement('div');
      articlesContainer.className = 'tag-articles-content';
      articlesContainer.appendChild(secureContent);
      fragment.appendChild(articlesContainer);
    } else {
      const noResults = SecurityHelpers.createSecureElement('div', '', {style: 'text-align: center; margin: 40px 0;'});
      noResults.appendChild(SecurityHelpers.createSecureElement('p', '♥ 該当する記事はありません ♥'));
      fragment.appendChild(noResults);
    }
    container.appendChild(fragment);
    updateStatistics();
  }
}

function updateStatistics() {
  const statsElement = domCache.get('tagStats');
  if (statsElement) statsElement.textContent = `全${state.uniqueArticles.length}件中${state.filteredArticles.length}件表示中`;
}

function groupArticlesByDate(articles) {
  const grouped = {};
  articles.forEach(article => (grouped[article.date] = grouped[article.date] || []).push(article));
  return grouped;
}

function createSecureArticlesHTML(groupedByDate, tagName, sortMethod) {
  const fragment = document.createDocumentFragment();
  Object.entries(groupedByDate).forEach(([date, sections]) => {
    const article = SecurityHelpers.createSecureElement('article', '', {'class': 'tag-article', 'data-date': date});
    const header = SecurityHelpers.createSecureElement('h2');
    const dateParts = date.split('-');
    if (dateParts.length === 3 && dateParts.every(part => /^\d+$/.test(part))) {
      const [year, month, day] = dateParts;
      const dateUrl = `/txt/zakki/${year}/${month}/days/${date}.html`;
      if (SecurityHelpers.validateInternalUrl(dateUrl)) {
        header.appendChild(SecurityHelpers.createSecureElement('a', date, {href: dateUrl}));
      } else {
        header.textContent = date;
      }
    } else {
      header.textContent = date;
    }
    article.appendChild(header);
    sections.forEach(articleData => {
      const secureSection = createSecureSection(articleData.section, articleData.relevance || 100, tagName, sortMethod);
      if (secureSection) article.appendChild(secureSection);
    });
    fragment.appendChild(article);
  });
  return fragment;
}

function createSecureSection(sectionHtml, relevance, tagName, sortMethod) {
  try {
    const doc = new DOMParser().parseFromString(sectionHtml, 'text/html');
    const originalSection = doc.querySelector('section');
    if (!originalSection) return null;
    const secureSection = SecurityHelpers.createSecureElement('section');
    copySecureContent(originalSection, secureSection, relevance, tagName, sortMethod);
    return secureSection;
  } catch (error) {
    console.error('Error creating secure section:', error);
    return null;
  }
}

function copySecureContent(source, target, relevance, tagName, sortMethod) {
  for (const child of source.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const secureElement = createSecureElementFromNode(child, relevance, tagName, sortMethod);
      if (secureElement) target.appendChild(secureElement);
    }
  }
}

// ノードから安全な要素を作成
function createSecureElementFromNode(node, relevance, tagName, sortMethod) {
  if (!CONFIG.security.allowedHtmlTags.includes(node.tagName.toLowerCase())) {
    return document.createTextNode(node.textContent || '');
  }
  
  const element = document.createElement(node.tagName);
  
  // 安全な属性のみコピー
  for (const attr of node.attributes) {
    if (CONFIG.security.allowedAttributes.includes(attr.name)) {
      // URL検証（href以外のURL属性も含む）
      if (['href', 'src'].includes(attr.name)) {
        // href属性は緩和された検証を使用
        if (attr.name === 'href' && !SecurityHelpers.validateHrefUrl(attr.value)) {
          console.warn(`Blocked href URL: ${attr.value}`);
          continue; // 無効なURLはスキップ
        }
        // 信頼できる埋め込み用の特別処理
        if (attr.name === 'src' && isTrustedEmbedUrl(attr.value)) {
          element.setAttribute(attr.name, attr.value); // 信頼できるプラットフォームはそのまま許可
          continue;
        }
        // その他のsrcは内部URL検証を適用
        if (attr.name === 'src' && !SecurityHelpers.validateInternalUrl(attr.value)) {
          console.warn(`Blocked src URL: ${attr.value}`);
          continue;
        }
      }
      
      // 特定の属性は値をサニタイズしない（YouTube埋め込み等で必要）
      if (['allow', 'referrerpolicy', 'width', 'height', 'frameborder', 'allowfullscreen', 'title'].includes(attr.name)) {
        element.setAttribute(attr.name, attr.value);
      } else {
        element.setAttribute(attr.name, SecurityHelpers.sanitizeText(attr.value));
      }
    }
  }
  
  // タグリンクの特別処理
  if (node.tagName.toLowerCase() === 'a') {
    const href = node.getAttribute('href');
    if (href && href.includes('/tag/')) {
      const secureTagElement = createSecureTagLink(node, relevance);
      return secureTagElement;
    }
  }
  
  // 信頼できる埋め込み用特別処理
  if (node.tagName.toLowerCase() === 'iframe' && node.src && isTrustedEmbedUrl(node.src)) {
    // 信頼できるプラットフォームの場合は子要素の処理をスキップ（iframeは空要素）
    return element;
  }
  
  // リスト反転処理
  if (needsListReversal(tagName, sortMethod) && node.classList.contains('timeline_md') && node.tagName.toLowerCase() === 'ul') {
    const reversedList = createReversedList(node);
    return reversedList;
  }
  
  // 子要素を再帰的に処理
  copySecureContent(node, element, relevance, tagName, sortMethod);
  
  return element;
}

// 安全なタグリンクを作成
function createSecureTagLink(node, relevance) {
  const href = node.getAttribute('href');
  const textContent = node.textContent || '';
  
  // タグリンクは緩和されたhref検証を使用
  if (!SecurityHelpers.validateHrefUrl(href)) {
    console.warn(`Blocked tag link URL: ${href}`);
    return document.createTextNode(textContent);
  }
  
  const link = SecurityHelpers.createSecureElement('a', '', { href });
  
  // タグ名を抽出して関連度付きで表示
  const tagMatch = textContent.match(/#([^:]+)/);
  if (tagMatch) {
    const baseTagName = tagMatch[1];
    const formattedTag = formatTagWithRelevance(baseTagName, relevance);
    link.textContent = formattedTag;
  } else {
    link.textContent = textContent;
  }
  
  return link;
}

function createReversedList(originalList) {
  const list = document.createElement('ul');
  list.className = 'timeline_md';
  const fragment = document.createDocumentFragment();
  const items = Array.from(originalList.children).filter(child => child.tagName === 'LI');
  for (let i = items.length - 1; i >= 0; i--) {
    const newItem = document.createElement('li');
    newItem.textContent = items[i].textContent;
    fragment.appendChild(newItem);
  }
  list.appendChild(fragment);
  return list;
}
function isTrustedEmbedUrl(url) {
  if (typeof url !== 'string') return false;
  for (const [platform, config] of Object.entries(CONFIG.trustedEmbedPlatforms)) {
    if (config.patterns.some(pattern => pattern.test(url))) {
      console.log(`Trusted embed detected: ${config.name} - ${url}`);
      return true;
    }
  }
  return false;
}
function isYouTubeEmbedUrl(url) {
  return CONFIG.trustedEmbedPlatforms.youtube.patterns.some(pattern => pattern.test(url));
}
const needsListReversal = (tagName, sortMethod) => tagName === 'timeline' && sortMethod === 'date-desc';
function reverseListItems(html) {
  return html.replace(/<ul class="timeline_md">([\s\S]*?)<\/ul>/g, (match, listContent) => {
    const liMatches = listContent.match(/<li>[\s\S]*?<\/li>/g);
    return liMatches ? `<ul class="timeline_md">${liMatches.reverse().join('')}</ul>` : match;
  });
}
async function processMonth(year, month, tag) {
  console.log(`Processing ${year}-${month} for tag: ${tag}`);
  try {
    const dayLinks = await fetchDayLinks(year, month);
    const dayArticles = await Promise.all(dayLinks.map(date => processDay(year, month, date, tag)));
    return dayArticles.flat();
  } catch (error) {
    console.error(`Error processing ${year}-${month}:`, error);
    return [];
  }
}
async function fetchDayLinks(year, month) {
  try {
    const zakkiUrl = `/txt/zakki/${year}/${month}/zakki${month}.js`;
    console.log(`Loading zakki file: ${zakkiUrl}`);
    const response = await SecurityHelpers.secureFetch(zakkiUrl);
    if (!response.ok) {
      console.warn(`No zakki file found: ${zakkiUrl} (${response.status})`);
      return [];
    }
    const dates = extractDatesFromZakkiJS(await response.text(), year, month);
    console.log(`Found ${dates.length} dates in zakki${month}.js:`, dates);
    return dates;
  } catch (error) {
    console.error(`Error loading zakki file for ${year}-${month}:`, error);
    return [];
  }
}

function extractDatesFromZakkiJS(jsContent, year, month) {
  try {
    console.log(`Parsing zakki file for ${year}-${month}`);
    const datesMatch = jsContent.match(/const\s+dates\s*=\s*\[(.*?)\]/s);
    if (!datesMatch) {
      console.error(`No dates array found in zakki file for ${year}-${month}`);
      return [];
    }
    const dayMatches = datesMatch[1].match(/['"]*(\d+)['"]*[,\s]*/g);
    if (!dayMatches) {
      console.warn(`No day matches found in dates string: ${datesMatch[1]}`);
      return [];
    }
    const formattedDates = dayMatches
      .map(match => {
        const dayMatch = match.match(/(\d+)/);
        return dayMatch ? `${year}-${month}-${dayMatch[1].padStart(2, '0')}` : null;
      })
      .filter(date => date !== null)
      .sort();
    console.log(`Final formatted dates for ${year}-${month}:`, formattedDates);
    return formattedDates;
  } catch (error) {
    console.error(`Error parsing zakki JS content for ${year}-${month}:`, error);
    return [];
  }
}

async function processDay(year, month, date, tag) {
  try {
    const dayResponse = await SecurityHelpers.secureFetch(`/txt/zakki/${year}/${month}/days/${date}.html`);
    const dayDoc = new DOMParser().parseFromString(await dayResponse.text(), 'text/html');
    const articleResults = [];
    for (const article of dayDoc.querySelectorAll('article')) {
      console.log(`Processing article: ${article.id || 'unknown'} in ${date}`);
      const {taggedSections, tagInfo} = findTaggedSections(article, tag);
      articleResults.push(...extractUniqueSections(taggedSections, tagInfo, date, article.id || 'unknown'));
    }
    return articleResults;
  } catch (error) {
    console.error(`Error processing ${date}:`, error);
    return [];
  }
}

// data-tags属性をパースして {tagName: relevance} オブジェクトを返す
function parseDataTags(dataTagsStr) {
  if (!dataTagsStr || typeof dataTagsStr !== 'string') return {};
  
  const trimmed = dataTagsStr.trim();
  if (!trimmed) return {};
  
  // JSON形式の検出と処理（将来の拡張用）
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const validated = {};
      for (const [key, value] of Object.entries(parsed)) {
        const rel = typeof value === 'number' ? value : parseInt(value, 10);
        validated[key] = (rel >= 0 && rel <= 100) ? rel : 100;
      }
      return validated;
    } catch (e) {
      console.warn('Invalid JSON in data-tags:', e);
      return {};
    }
  }
  
  // イコール区切り形式: "music=80,timeline,anime=60"
  const tags = {};
  trimmed.split(',').forEach(item => {
    const cleaned = item.trim();
    if (!cleaned) return;
    
    const equalIndex = cleaned.indexOf('=');
    if (equalIndex === -1) {
      // イコールなし → デフォルト100%
      tags[cleaned] = 100;
    } else {
      // イコールあり → 指定された関連度
      const tag = cleaned.substring(0, equalIndex).trim();
      const relevanceStr = cleaned.substring(equalIndex + 1).trim();
      if (tag) {
        const relevance = parseInt(relevanceStr, 10);
        tags[tag] = (relevance >= 0 && relevance <= 100) ? relevance : 100;
      }
    }
  });
  
  return tags;
}

function findTaggedSections(article, tag) {
  const taggedSections = [];
  const tagInfo = {};
  
  // data-tags属性を持つすべてのsectionを検索
  article.querySelectorAll('section[data-tags]').forEach(section => {
    const tags = parseDataTags(section.dataset.tags);
    
    if (tags.hasOwnProperty(tag)) {
      const relevance = tags[tag];
      const sectionId = section.id || section.innerHTML.length;
      
      taggedSections.push(section);
      tagInfo[sectionId] = { section, relevance };
      
      console.log(`Found section with tag "${tag}" (${relevance}%):`, Object.keys(tags).join(', '));
    }
  });
  
  if (taggedSections.length > 0) {
    console.log(`Found ${taggedSections.length} sections with tag "${tag}" in article ${article.id || 'unknown'}`);
  }
  
  return { taggedSections, tagInfo };
}

function extractUniqueSections(taggedSections, tagInfo, date, articleId) {
  const uniqueSections = [];
  const sectionSignatures = new Map();
  
  for (const section of taggedSections) {
    const signature = generateSectionSignature(section);
    const sectionId = section.id || section.innerHTML.length;
    const relevance = tagInfo[sectionId] ? tagInfo[sectionId].relevance : 100;
    
    if (!sectionSignatures.has(signature)) {
      uniqueSections.push({
        date,
        section: section.outerHTML,
        signature,
        relevance
      });
      sectionSignatures.set(signature, true);
      console.log(`Added unique section from ${date}, article ${articleId} with relevance ${relevance}%`);
    } else {
      console.log(`Skipped duplicate section in ${date}, article ${articleId}`);
    }
  }
  
  return uniqueSections;
}

function generateSectionSignature(section) {
  const headings = [];
  for (const child of section.children) {
    if (/^H[2-6]$/.test(child.tagName)) {
      headings.push(`${child.tagName}:${child.textContent.trim()}`);
      if (headings.length >= 3) break;
    }
  }
  const links = [];
  const allElements = section.getElementsByTagName('a');
  for (let i = 0; i < Math.min(3, allElements.length); i++) {
    links.push(allElements[i].href || allElements[i].textContent);
  }
  const textSample = section.textContent.replace(/\s+/g, ' ').trim().slice(0, 50);
  return [headings.join('|'), links.join('|'), textSample, section.outerHTML.length].join('::');
}

function applySortAndFilter(articles, sortMethod, minRelevance) {
  const filtered = articles.filter(article => (article.relevance || 100) >= minRelevance);
  const sorted = [...filtered];
  switch (sortMethod) {
    case 'date-desc': return sorted.sort((a, b) => b.date.localeCompare(a.date));
    case 'date-asc': return sorted.sort((a, b) => a.date.localeCompare(b.date));
    case 'relevance-desc': return sorted.sort((a, b) => (b.relevance || 100) - (a.relevance || 100));
    case 'relevance-asc': return sorted.sort((a, b) => (a.relevance || 100) - (b.relevance || 100));
  }
  return sorted;
}

function createControlsPanel(tag, callback) {
  const controls = document.createElement('div');
  controls.className = 'tag-controls';
  const heading = document.createElement('h3');
  heading.className = 'tag-controls-heading';
  heading.textContent = '表示とソートの設定';
  controls.appendChild(heading);
  controls.appendChild(createSortControlsRow(callback));
  controls.appendChild(createRelevanceFilterRow(callback));
  const stats = document.createElement('p');
  stats.className = 'tag-stats';
  stats.textContent = `全${state.uniqueArticles.length}件中${state.filteredArticles.length}件表示中`;
  controls.appendChild(stats);
  return controls;
}

function createSortControlsRow(callback) {
  const row = document.createElement('div');
  row.className = 'tag-controls-row';
  row.appendChild(createControlGroup('日付でソート:', [{text: '新しい順', value: 'date-desc'}, {text: '古い順', value: 'date-asc'}], callback));
  row.appendChild(createControlGroup('関連度でソート:', [{text: '関連度高い順', value: 'relevance-desc'}, {text: '関連度低い順', value: 'relevance-asc'}], callback));
  return row;
}
function createControlGroup(labelText, buttons, callback) {
  const group = document.createElement('div');
  group.className = 'tag-control-group';
  const label = document.createElement('label');
  label.textContent = labelText;
  group.appendChild(label);
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'tag-control-buttons';
  buttons.forEach(button => {
    const btn = document.createElement('button');
    btn.className = 'tag-sort-btn' + (state.sortMethod === button.value ? ' active' : '');
    btn.textContent = button.text;
    btn.setAttribute('data-sort-method', button.value);
    btn.addEventListener('click', () => {
      updateSortMethod(button.value);
      callback();
    });
    buttonsContainer.appendChild(btn);
  });
  group.appendChild(buttonsContainer);
  return group;
}

function createRelevanceFilterRow(callback) {
  const row = document.createElement('div');
  row.className = 'tag-controls-row';
  const filterGroup = document.createElement('div');
  filterGroup.className = 'tag-control-group';
  const filterLabel = document.createElement('label');
  filterLabel.textContent = '最小関連度でフィルター:';
  filterGroup.appendChild(filterLabel);
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'tag-slider-container';
  const slider = document.createElement('input');
  Object.assign(slider, {type: 'range', min: '0', max: '100', step: CONFIG.ui.relevanceSliderStep.toString(), value: state.minRelevance.toString(), className: 'tag-slider'});
  const sliderValue = document.createElement('span');
  sliderValue.className = 'tag-slider-value';
  sliderValue.textContent = `${state.minRelevance}%`;
  slider.addEventListener('input', e => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= 0 && newValue <= 100) sliderValue.textContent = `${newValue}%`;
  });
  slider.addEventListener('change', e => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= 0 && newValue <= 100) {
      updateMinRelevance(newValue);
      callback();
    }
  });
  sliderContainer.append(slider, sliderValue);
  filterGroup.appendChild(sliderContainer);
  row.appendChild(filterGroup);
  const resetGroup = document.createElement('div');
  resetGroup.className = 'tag-control-group';
  const resetLabel = document.createElement('label');
  resetLabel.textContent = '設定をリセット:';
  resetGroup.appendChild(resetLabel);
  const resetButton = document.createElement('button');
  resetButton.className = 'tag-reset-btn';
  resetButton.textContent = 'リセット';
  resetButton.addEventListener('click', () => {
    updateSortMethod('date-desc');
    updateMinRelevance(0);
    const slider = domCache.get('tagSlider');
    if (slider) slider.value = '0';
    const sliderValue = domCache.get('tagSliderValue');
    if (sliderValue) sliderValue.textContent = '0%';
    callback();
  });
  resetGroup.appendChild(resetButton);
  row.appendChild(resetGroup);
  return row;
}

function updateSortMethod(method) {
  if (!CONFIG.ui.allowedSortMethods.includes(method)) {
    console.error('Invalid sort method:', method);
    return;
  }
  state.sortMethod = method;
  const buttons = domCache.get('tagSortBtns');
  if (buttons) {
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.sortMethod === method) btn.classList.add('active');
    });
  }
}
function updateMinRelevance(value) {
  if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
    console.error('Invalid relevance value:', value);
    return;
  }
  state.minRelevance = value;
}

function formatTagWithRelevance(tagName, relevance) {
  if (typeof tagName !== 'string') return '#invalid';
  tagName = SecurityHelpers.sanitizeText(tagName.replace(/^#/, ''));
  if (typeof relevance !== 'number' || isNaN(relevance) || relevance < 0 || relevance > 100) relevance = 100;
  return !relevance || relevance === 100 ? `#${tagName}` : `#${tagName}:${relevance}`;
}

function generateYearRange(startYear, endYear) {
  const years = [];
  for (let year = startYear; year <= endYear; year++) years.push(year.toString());
  return years;
}
function initializeTagPage(tagName) {
  if (!SecurityHelpers.validateTag(tagName)) {
    console.error('Invalid tag name provided:', tagName);
    return;
  }
  document.addEventListener('DOMContentLoaded', () => {
    try {
      loadTaggedArticles(tagName);
    } catch (error) {
      console.error('Error initializing tag page:', error);
      const container = elements.getContainer();
      if (container) {
        container.appendChild(SecurityHelpers.createSecureElement('div', 'エラー: ページの読み込みに失敗しました。', {
          style: 'text-align: center; margin: 40px 0; color: red;'
        }));
      }
    }
  });
}
