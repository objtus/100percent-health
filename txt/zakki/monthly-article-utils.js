// 月別記事処理の共通ユーティリティ
window.MonthlyArticleUtils = window.MonthlyArticleUtils || {};

// デフォルト設定
MonthlyArticleUtils.defaultConfig = {
  maxChars: 300,
  minElements: 2, 
  maxElements: 6,
  textTruncateLength: 120,
  maxListItems: 3,
  listItemEstimate: 25,
  debug: false
};

// 省略表示処理クラス
MonthlyArticleUtils.BalancedArticleProcessor = class {
  constructor(config) {
    this.config = { ...MonthlyArticleUtils.defaultConfig, ...config };
  }

  log(message, ...args) {
    if (this.config.debug) {
      console.log(`[ArticleProcessor] ${message}`, ...args);
    }
  }

  // 個別要素の処理
  processElement(element) {
    const cloned = element.cloneNode(true);
    let estimatedChars = 0;

    switch (element.tagName) {
      case 'P':
        const text = element.textContent || '';
        if (text.length > this.config.textTruncateLength) {
          cloned.innerHTML = text.substring(0, this.config.textTruncateLength) + '<span class="ellipsis">...</span>';
          estimatedChars = this.config.textTruncateLength;
          this.log(`Truncated paragraph: ${text.length} → ${this.config.textTruncateLength} chars`);
        } else {
          estimatedChars = text.length;
          this.log(`Kept full paragraph: ${text.length} chars`);
        }
        break;

      case 'UL':
      case 'OL':
        estimatedChars = this.processListElement(cloned, element);
        break;

      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        estimatedChars = (element.textContent || '').length;
        this.log(`Processed heading: ${element.tagName} - "${element.textContent}"`);
        break;

      case 'BLOCKQUOTE':
        const quoteText = element.textContent || '';
        if (quoteText.length > this.config.textTruncateLength) {
          cloned.innerHTML = `<p>${quoteText.substring(0, this.config.textTruncateLength)}<span class="ellipsis">...</span></p>`;
          estimatedChars = this.config.textTruncateLength;
        } else {
          estimatedChars = quoteText.length;
        }
        this.log(`Processed blockquote: ${quoteText.length} chars`);
        break;

      default:
        estimatedChars = (element.textContent || '').length;
        this.log(`Processed other element: ${element.tagName}`);
    }

    return { element: cloned, chars: estimatedChars };
  }

  // リスト要素の処理
  processListElement(cloned, original) {
    const items = Array.from(original.children);
    const maxItems = this.config.maxListItems;

    if (items.length > maxItems) {
      // 余分な項目を削除
      Array.from(cloned.children)
        .slice(maxItems)
        .forEach(item => item.remove());

      // 省略表示を追加
      const ellipsis = document.createElement('li');
      const remainingCount = items.length - maxItems;
      ellipsis.innerHTML = `<em>... (他${remainingCount}項目)</em>`;
      ellipsis.style.fontStyle = 'italic';
      ellipsis.style.color = '#666';
      ellipsis.className = 'list-ellipsis';
      cloned.appendChild(ellipsis);

      this.log(`Truncated list: ${items.length} → ${maxItems} items (${remainingCount} hidden)`);

      return Math.min(items.length, maxItems) * this.config.listItemEstimate;
    } else {
      this.log(`Kept full list: ${items.length} items`);
      return items.length * this.config.listItemEstimate;
    }
  }

  // 全ての関連要素を再帰的に取得
  getAllRelevantElements(container) {
    const elements = [];

    function traverse(node) {
      for (const child of node.children) {
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'BLOCKQUOTE'].includes(child.tagName)) {
          elements.push(child);
        } else if (['SECTION', 'DIV', 'ARTICLE'].includes(child.tagName)) {
          // コンテナ要素の場合は中身を再帰的に処理
          traverse(child);
        } else {
          // その他の要素もとりあえず追加
          elements.push(child);
        }
      }
    }

    traverse(container);
    return elements;
  }

  // メイン処理: バランス型プレビュー作成
  createBalancedPreview(articleBody) {
    const preview = document.createElement('div');
    preview.className = 'article-preview';

    let totalChars = 0;
    let elementCount = 0;

    // 全要素をフラットに取得
    const allElements = this.getAllRelevantElements(articleBody);
    this.log(`Found ${allElements.length} elements to process`);

    for (const element of allElements) {
      // 最小要素数未満なら必ず追加
      if (elementCount < this.config.minElements) {
        const processed = this.processElement(element);
        preview.appendChild(processed.element);
        totalChars += processed.chars;
        elementCount++;
        this.log(`Added element ${elementCount} (minimum guarantee): ${processed.chars} chars, total: ${totalChars}`);
        continue;
      }

      // 最大要素数に達したら停止
      if (elementCount >= this.config.maxElements) {
        this.log(`Reached maximum elements (${this.config.maxElements}), stopping`);
        break;
      }

      // 文字数制限チェック
      const processed = this.processElement(element);
      if (totalChars + processed.chars > this.config.maxChars && elementCount > 0) {
        this.log(`Would exceed character limit (${totalChars + processed.chars} > ${this.config.maxChars}), stopping`);
        break;
      }

      preview.appendChild(processed.element);
      totalChars += processed.chars;
      elementCount++;
      this.log(`Added element ${elementCount}: ${processed.chars} chars, total: ${totalChars}`);
    }

    this.log(`Preview completed: ${elementCount} elements, ${totalChars} chars`);
    return preview;
  }
};

// 「続きを読む」リンク生成
MonthlyArticleUtils.createReadMoreLink = function(articleId, year) {
  const readMoreLink = document.createElement('p');
  readMoreLink.className = 'article-ellipsis';

  // 記事IDから日付を抽出（例：250918 → 2025-09-18）
  const dateStr = articleId.toString();
  const yearPart = dateStr.substring(0, 2);
  const monthPart = dateStr.substring(2, 4);
  const dayPart = dateStr.substring(4, 6);
  const fullDate = `20${yearPart}-${monthPart}-${dayPart}`;

  const link = document.createElement('a');
  link.href = `/txt/zakki/${year}/${monthPart}/days/${fullDate}.html`;
  link.innerHTML = '続きを読む / <span lang="en">read more</span>';
  link.className = 'read-more-link';

  readMoreLink.appendChild(link);
  return readMoreLink;
};

// フォールバック処理
MonthlyArticleUtils.createFallbackPreview = function(articleElement) {
  const textContent = articleElement.textContent;
  const lines = textContent.split('\n').filter(line => line.trim());
  const truncatedText = lines.slice(0, 5).join('\n');

  const preview = document.createElement('div');
  preview.className = 'article-preview';
  preview.innerHTML = `<p>${truncatedText}...</p>`;

  return preview;
};

// メイン関数：記事を省略して作成
MonthlyArticleUtils.createTruncatedArticle = function(articleElement, year, config = {}) {
  const truncatedArticle = document.createElement('article');
  truncatedArticle.id = articleElement.id;
  
  // 元の記事のクラスを保持、なければデフォルトクラスを設定
  if (articleElement.className && articleElement.className.trim() !== '') {
    truncatedArticle.className = articleElement.className;
  } else {
    truncatedArticle.className = 'daily-article';
  }

  // 見出しを保持
  const h3 = articleElement.querySelector('h3');
  if (h3) {
    truncatedArticle.appendChild(h3.cloneNode(true));
  }

  // 記事本文の処理
  const articleBody = articleElement.querySelector('.article-body');
  let preview;

  if (articleBody) {
    // バランス型プロセッサーを使用
    const processor = new MonthlyArticleUtils.BalancedArticleProcessor(config);
    preview = processor.createBalancedPreview(articleBody);

    // 続きを読むリンクを追加
    const readMoreLink = MonthlyArticleUtils.createReadMoreLink(articleElement.id, year);
    preview.appendChild(readMoreLink);

    if (config.debug) {
      console.log(`Article ${articleElement.id}: created balanced preview`);
    }
  } else {
    // フォールバック処理
    preview = MonthlyArticleUtils.createFallbackPreview(articleElement);
  }

  truncatedArticle.appendChild(preview);
  return truncatedArticle;
};
