// タグページ共通のローダースクリプト

// 状態管理
const state = {
  sortMethod: 'date-desc', // デフォルトは日付降順（新しい順）
  minRelevance: 0, // 最小関連度（0～100）
  filteredArticles: [], // フィルタリングされた記事
  uniqueArticles: [] // 重複排除後の記事
};

// DOM要素取得ヘルパー
const elements = {
  getLoadingIndicator: () => document.getElementById('loading-indicator'),
  getProgressBar: () => document.querySelector('.progress-bar'),
  getLoadingStatus: () => document.getElementById('loading-status'),
  getContainer: () => document.querySelector('.tag-articles')
};

// ローディングインジケータ調整関数
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

// 記事の読み込み処理
async function loadTaggedArticles(tag) {
  const loadingIndicator = elements.getLoadingIndicator();
  const loadingStatus = elements.getLoadingStatus();
  const container = elements.getContainer();
  
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  if (loadingStatus) loadingStatus.textContent = 'ディレクトリを読み込み中...';
  updateLoadingIndicator(0);
  
  const years = ['2024', '2025']; // 対象の年
  
  // 総処理数と完了数をカウントするための変数
  const totalMonths = years.length * 12;
  let completedMonths = 0;

  // 月ごとの処理を設定
  const monthPromises = years.flatMap(year =>
    Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, '0');
      // 実際の処理関数を返す（まだ実行しない）
      return async () => {
        const result = await processMonth(year, month, tag);
        // 進捗状況を更新
        completedMonths++;
        const progress = Math.round((completedMonths / totalMonths) * 100);
        updateLoadingIndicator(progress, completedMonths, totalMonths);
        return result;
      };
    })
  );
  
  // バッチ処理で実行（一度に4つずつ）
  const results = await processBatches(monthPromises, 4);
  const flattenedArticles = results.flat();
  
  // 重複排除
  state.uniqueArticles = removeDuplicates(flattenedArticles);
  
  // 初回表示
  renderArticles(tag, container);
  
  // デバッグ情報
  const totalSections = state.filteredArticles.length;
  console.log(`Found ${state.filteredArticles.length} articles with tag: ${tag} (${totalSections} total sections)`);
}

// バッチ処理を行う関数
async function processBatches(tasks, batchSize) {
  const results = [];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    // このバッチ内の処理を実行して結果を待つ
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  
  return results;
}

// 重複を排除する関数
function removeDuplicates(articles) {
  const uniqueArticles = [];
  const allSignatures = new Set();
  
  for (const article of articles) {
    if (!allSignatures.has(article.signature)) {
      uniqueArticles.push(article);
      allSignatures.add(article.signature);
    } else {
      console.log(`Removed global duplicate from ${article.date}`);
    }
  }
  
  return uniqueArticles;
}

// 記事を表示する関数
function renderArticles(tag, container) {
  if (!container) container = elements.getContainer();
  const loadingIndicator = elements.getLoadingIndicator();
  
  // ソートとフィルターを適用
  state.filteredArticles = applySortAndFilter(state.uniqueArticles, state.sortMethod, state.minRelevance);
  
  // 日付ごとにグループ化
  const groupedByDate = groupArticlesByDate(state.filteredArticles);
  
  // グループ化したデータをHTML形式に変換
  const htmlContent = generateArticlesHTML(groupedByDate, tag, state.sortMethod);

  // 結果を表示
  if (container) {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    // コントロールパネルを生成
    const controlsPanel = createControlsPanel(tag, () => renderArticles(tag, container));
    
    // 記事を表示
    container.innerHTML = '';
    container.appendChild(controlsPanel);
    
    if (state.filteredArticles.length > 0) {
      const articlesContainer = document.createElement('div');
      articlesContainer.className = 'tag-articles-content';
      articlesContainer.innerHTML = htmlContent;
      container.appendChild(articlesContainer);
    } else {
      const noResults = document.createElement('div');
      noResults.style.textAlign = 'center';
      noResults.style.margin = '40px 0';
      noResults.innerHTML = '<p>♥ 該当する記事はありません ♥</p>';
      container.appendChild(noResults);
    }
    
    // 統計情報を更新
    updateStatistics(container);
  }
}

// 統計情報を更新する関数
function updateStatistics(container) {
  const statsElement = container.querySelector('.tag-stats');
  if (statsElement) {
    statsElement.textContent = `全${state.uniqueArticles.length}件中${state.filteredArticles.length}件表示中`;
  }
}

// 記事を日付ごとにグループ化する関数
function groupArticlesByDate(articles) {
  const groupedByDate = {};
  
  articles.forEach(article => {
    if (!groupedByDate[article.date]) {
      groupedByDate[article.date] = [];
    }
    groupedByDate[article.date].push(article);
  });
  
  return groupedByDate;
}

// 記事のHTMLを生成する関数（リスト反転対応）
function generateArticlesHTML(groupedByDate, tagName, sortMethod) {
  return Object.entries(groupedByDate).map(([date, sections]) => {
    // 日付からリンクURLを生成
    const dateParts = date.split('-');
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      const dateUrl = `/txt/zakki/${year}/${month}/days/${date}.html`;
      
      // 関連度からタグ表示を修正（リスト反転機能付き）
      const sectionsWithRelevance = sections.map(article => {
        const relevance = article.relevance || 100;
        return formatArticleWithRelevance(article.section, relevance, tagName, sortMethod);
      });
      
      return `
        <article class="tag-article" data-date="${date}">
          <h2><a href="${dateUrl}">${date}</a></h2>
          ${sectionsWithRelevance.join('')}
        </article>
      `;
    } else {
      // 日付形式が想定外の場合はリンクなしで表示
      const sectionsWithRelevance = sections.map(article => {
        const relevance = article.relevance || 100;
        return formatArticleWithRelevance(article.section, relevance, tagName, sortMethod);
      });
      
      return `
        <article class="tag-article" data-date="${date}">
          <h2>${date}</h2>
          ${sectionsWithRelevance.join('')}
        </article>
      `;
    }
  }).join('');
}

// タグの関連度を反映したフォーマットに変換する関数（リスト反転機能付き）
function formatArticleWithRelevance(sectionHtml, relevance, tagName, sortMethod) {
  const tagRegex = /<a href="\/txt\/zakki\/tag\/(.*?)\.html">#(.*?)<\/a>/g;
  
  // 各タグを関連度付きの形式に修正
  let formattedHtml = sectionHtml.replace(tagRegex, (match, tagPath, tagNameInTag) => {
    // コロン形式のタグを生成
    const formattedTag = formatTagWithRelevance(tagNameInTag, relevance);
    return `<a href="/txt/zakki/tag/${tagPath}.html">${formattedTag}</a>`;
  });
  
  // timelineタグで「新しい順」の場合、リスト項目を反転
  if (needsListReversal(tagName, sortMethod)) {
    formattedHtml = reverseListItems(formattedHtml);
  }
  
  return formattedHtml;
}

// リスト反転が必要かどうかを判定する関数
function needsListReversal(tagName, sortMethod) {
  return tagName === 'timeline' && sortMethod === 'date-desc';
}

// リスト項目を反転する関数
function reverseListItems(html) {
  // ul.timeline_md のリストのみを対象とする
  return html.replace(/<ul class="timeline_md">([\s\S]*?)<\/ul>/g, (match, listContent) => {
    // li要素を抽出
    const liMatches = listContent.match(/<li>[\s\S]*?<\/li>/g);
    
    if (!liMatches) {
      return match; // li要素がない場合はそのまま返す
    }
    
    // li要素を逆順にして再構築
    const reversedLis = liMatches.reverse().join('');
    return `<ul class="timeline_md">${reversedLis}</ul>`;
  });
}

// 月ごとの処理
async function processMonth(year, month, tag) {
  console.log(`Processing ${year}-${month} for tag: ${tag}`);

  try {
    // 日付一覧を取得
    const dayLinks = await fetchDayLinks(year, month);
    
    // 日付ページの並列処理
    const dayPromises = dayLinks.map(date => processDay(year, month, date, tag));
    const dayArticles = await Promise.all(dayPromises);
    
    return dayArticles.flat();
  } catch (error) {
    console.error(`Error processing ${year}-${month}:`, error);
    return [];
  }
}

// 日付一覧を取得する関数（zakkiXX.jsファイルを利用）
async function fetchDayLinks(year, month) {
  try {
    // zakkiXX.jsファイルのURLを構築
    const zakkiFileName = `zakki${month}.js`;
    const zakkiUrl = `/txt/zakki/${year}/${month}/${zakkiFileName}`;
    
    console.log(`Loading zakki file: ${zakkiUrl}`);
    
    // zakkiXX.jsファイルを読み込み
    const response = await fetch(zakkiUrl);
    if (!response.ok) {
      console.warn(`No zakki file found: ${zakkiUrl} (${response.status})`);
      return [];
    }
    
    const jsContent = await response.text();
    
    // JavaScriptコードから日付配列を抽出
    const dates = extractDatesFromZakkiJS(jsContent, year, month);
    
    console.log(`Found ${dates.length} dates in ${zakkiFileName}:`, dates);
    return dates;
    
  } catch (error) {
    console.error(`Error loading zakki file for ${year}-${month}:`, error);
    return [];
  }
}

// zakkiXX.jsファイルから日付情報を抽出する関数（複数形式対応版）
function extractDatesFromZakkiJS(jsContent, year, month) {
  try {
    console.log(`Parsing zakki file for ${year}-${month}`);
    
    // dates配列を正規表現で抽出
    const datesMatch = jsContent.match(/const\s+dates\s*=\s*\[(.*?)\]/s);
    if (!datesMatch) {
      console.error(`No dates array found in zakki file for ${year}-${month}`);
      return [];
    }
    
    console.log('Found dates match:', datesMatch[0]);
    
    // 文字列から日付を抽出
    const datesString = datesMatch[1];
    console.log('Dates string:', datesString);
    
    // 複数の形式に対応：'13', "13", 13
    const dayMatches = datesString.match(/['"]*(\d+)['"]*[,\s]*/g);
    
    if (!dayMatches) {
      console.warn(`No day matches found in dates string: ${datesString}`);
      return [];
    }
    
    console.log('Day matches:', dayMatches);
    
    // 数字部分のみを抽出してフォーマット
    const formattedDates = dayMatches
      .map(match => {
        // 数字部分のみを抽出
        const dayMatch = match.match(/(\d+)/);
        if (!dayMatch) return null;
        
        const day = dayMatch[1].padStart(2, '0');
        const fullDate = `${year}-${month}-${day}`;
        console.log(`Converting ${match.trim()} to ${fullDate}`);
        return fullDate;
      })
      .filter(date => date !== null) // null値を除外
      .sort(); // 日付順にソート
    
    console.log(`Final formatted dates for ${year}-${month}:`, formattedDates);
    return formattedDates;
    
  } catch (error) {
    console.error(`Error parsing zakki JS content for ${year}-${month}:`, error);
    return [];
  }
}

// 日付ページを処理する関数
async function processDay(year, month, date, tag) {
  try {
    const dayResponse = await fetch(`/txt/zakki/${year}/${month}/days/${date}.html`);
    const dayText = await dayResponse.text();
    const dayDoc = new DOMParser().parseFromString(dayText, 'text/html');

    const articles = dayDoc.querySelectorAll('article');
    const articleResults = [];
    
    // 各記事ごとに処理
    for (const article of Array.from(articles)) {
      const articleId = article.id || 'unknown';
      console.log(`Processing article: ${articleId} in ${date}`);
      
      // タグ付きセクションを検索
      const { taggedSections, tagInfo } = findTaggedSections(article, tag);
      
      // 重複を排除して一意のセクションのみを保持
      const uniqueSections = extractUniqueSections(taggedSections, tagInfo, date, articleId);
      
      // 結果を追加
      articleResults.push(...uniqueSections);
    }
    
    return articleResults;
  } catch (error) {
    console.error(`Error processing ${date}:`, error);
    return [];
  }
}

// タグ付きセクションを検索する関数
function findTaggedSections(article, tag) {
  // 標準形式のタグのみを検索
  const hashtagElements = article.querySelectorAll(`span.hashtag a[href*="/tag/${tag}.html"]`);
  const taggedSections = [];
  const tagInfo = {}; // 各セクションの関連度情報を保存

  if (hashtagElements.length > 0) {
    console.log(`Found ${hashtagElements.length} hashtags in article ${article.id || 'unknown'}`);
    
    // 標準形式のリンクが見つかった場合
    for (const hashtagElement of Array.from(hashtagElements)) {
      let tagSpan = hashtagElement.closest('span.hashtag');
      if (tagSpan) {
        // 関連度を取得
        const relevance = tagSpan.dataset.relevance ? parseInt(tagSpan.dataset.relevance, 10) : 100;
        
        // 親sectionを探す
        let parentSection = tagSpan.closest('section');
        if (parentSection) {
          const bestSection = findBestParentSection(parentSection, article);
          if (bestSection) {
            // セクションが既に登録されている場合は、最高の関連度を採用
            const sectionId = bestSection.id || bestSection.innerHTML.length;
            if (!tagInfo[sectionId] || tagInfo[sectionId].relevance < relevance) {
              tagInfo[sectionId] = { section: bestSection, relevance };
            }
            if (!taggedSections.includes(bestSection)) {
              taggedSections.push(bestSection);
            }
          }
        }
      }
    }
  }
  
  return { taggedSections, tagInfo };
}

// 一意のセクションを抽出する関数
function extractUniqueSections(taggedSections, tagInfo, date, articleId) {
  const uniqueSections = [];
  const sectionSignatures = new Map();
  
  for (const section of taggedSections) {
    const signature = generateSectionSignature(section);
    const sectionId = section.id || section.innerHTML.length;
    const relevance = tagInfo[sectionId] ? tagInfo[sectionId].relevance : 100;
    
    if (!sectionSignatures.has(signature)) {
      uniqueSections.push({
        date: date,
        section: section.outerHTML,
        signature: signature,
        relevance: relevance // 関連度情報を追加
      });
      sectionSignatures.set(signature, true);
      console.log(`Added unique section from ${date}, article ${articleId} with relevance ${relevance}%`);
    } else {
      console.log(`Skipped duplicate section in ${date}, article ${articleId}`);
    }
  }
  
  return uniqueSections;
}

// セクションのユニーク署名を生成
function generateSectionSignature(section) {
  // 見出しのテキスト
  const headings = Array.from(section.querySelectorAll('h2, h3, h4, h5, h6'))
    .map(h => `${h.tagName}:${h.textContent.trim()}`);
  
  // 最初の3つのリンクを含む
  const links = Array.from(section.querySelectorAll('a'))
    .slice(0, 3)
    .map(a => a.href || a.textContent)
    .join('|');
  
  // テキストのハッシュ
  const textSample = section.textContent
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
  
  // HTMLの長さ
  const htmlLength = section.outerHTML.length;
  
  // これらを組み合わせた署名
  return [
    headings.join('|'),
    links,
    textSample,
    htmlLength
  ].join('::');
}

// 最適な親セクションを探す
function findBestParentSection(targetSection, article) {
  // まずタグのあるセクション自体を候補にする
  let bestSection = targetSection;
  let bestHeadingLevel = getHeadingLevel(targetSection);
  
  // 親をたどる
  let currentElement = targetSection.parentElement;
  
  while (currentElement && currentElement !== article) {
    if (currentElement.tagName === 'SECTION') {
      const level = getHeadingLevel(currentElement);
      
      // より高い見出しレベルを持つセクションが見つかれば更新
      if (level > bestHeadingLevel) {
        bestHeadingLevel = level;
        bestSection = currentElement;
      }
    }
    
    currentElement = currentElement.parentElement;
  }
  
  return bestSection;
}

// セクション内の見出しレベルを取得
function getHeadingLevel(section) {
  const headings = section.querySelectorAll('h2, h3, h4, h5, h6');
  if (headings.length === 0) return 0;
  
  const heading = headings[0];
  return parseInt(heading.tagName.substring(1), 10);
}

// ソートとフィルターを適用する関数
function applySortAndFilter(articles, sortMethod, minRelevance) {
  // 関連度フィルターを適用
  const filtered = articles.filter(article => {
    const relevance = article.relevance || 100;
    return relevance >= minRelevance;
  });
  
  // ソートを適用
  const sorted = [...filtered];
  
  switch (sortMethod) {
    case 'date-desc': // 日付降順（新しい順）
      sorted.sort((a, b) => b.date.localeCompare(a.date));
      break;
    case 'date-asc': // 日付昇順（古い順）
      sorted.sort((a, b) => a.date.localeCompare(b.date));
      break;
    case 'relevance-desc': // 関連度降順（高い順）
      sorted.sort((a, b) => (b.relevance || 100) - (a.relevance || 100));
      break;
    case 'relevance-asc': // 関連度昇順（低い順）
      sorted.sort((a, b) => (a.relevance || 100) - (b.relevance || 100));
      break;
  }
  
  return sorted;
}

// コントロールパネルを生成する関数
function createControlsPanel(tag, callback) {
  const controls = document.createElement('div');
  controls.className = 'tag-controls';
  
  // 見出し
  const heading = document.createElement('h3');
  heading.className = 'tag-controls-heading';
  heading.textContent = `表示とソートの設定`;
  controls.appendChild(heading);
  
  // 1行目：日付ソートと関連度ソート
  const row1 = createSortControlsRow(callback);
  controls.appendChild(row1);
  
  // 2行目：関連度フィルターとリセットボタン
  const row2 = createRelevanceFilterRow(callback);
  controls.appendChild(row2);
  
  // 統計情報
  const stats = document.createElement('p');
  stats.className = 'tag-stats';
  const totalArticles = state.uniqueArticles.length;
  const filteredCount = state.filteredArticles.length;
  stats.textContent = `全${totalArticles}件中${filteredCount}件表示中`;
  controls.appendChild(stats);
  
  return controls;
}

// ソートコントロール行を作成する関数
function createSortControlsRow(callback) {
  const row = document.createElement('div');
  row.className = 'tag-controls-row';
  
  // 日付ソート
  const dateGroup = createControlGroup('日付でソート:', [
    { text: '新しい順', value: 'date-desc' },
    { text: '古い順', value: 'date-asc' }
  ], callback);
  row.appendChild(dateGroup);
  
  // 関連度ソート
  const relevanceGroup = createControlGroup('関連度でソート:', [
    { text: '関連度高い順', value: 'relevance-desc' },
    { text: '関連度低い順', value: 'relevance-asc' }
  ], callback);
  row.appendChild(relevanceGroup);
  
  return row;
}

// コントロールグループを作成する関数
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
    btn.onclick = () => {
      updateSortMethod(button.value);
      callback();
    };
    buttonsContainer.appendChild(btn);
  });
  
  group.appendChild(buttonsContainer);
  return group;
}

// 関連度フィルター行を作成する関数
function createRelevanceFilterRow(callback) {
  const row = document.createElement('div');
  row.className = 'tag-controls-row';
  
  // フィルターグループ
  const filterGroup = document.createElement('div');
  filterGroup.className = 'tag-control-group';
  
  const filterLabel = document.createElement('label');
  filterLabel.textContent = '最小関連度でフィルター:';
  filterGroup.appendChild(filterLabel);
  
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'tag-slider-container';
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '10';
  slider.value = state.minRelevance.toString();
  slider.className = 'tag-slider';
  
  // input イベントでは表示のみ更新（フィルタリングは実行しない）
  slider.addEventListener('input', function(e) {
    const newValue = parseInt(e.target.value, 10);
    sliderValue.textContent = `${newValue}%`;
  });
  
  // change イベント（スライダーを離した時）でのみフィルタリングを実行
  slider.addEventListener('change', function(e) {
    const newValue = parseInt(e.target.value, 10);
    updateMinRelevance(newValue);
    callback(); // フィルタリングと再レンダリングはここでのみ実行
  });
  
  sliderContainer.appendChild(slider);
  
  const sliderValue = document.createElement('span');
  sliderValue.className = 'tag-slider-value';
  sliderValue.textContent = `${state.minRelevance}%`;
  sliderContainer.appendChild(sliderValue);
  
  filterGroup.appendChild(sliderContainer);
  row.appendChild(filterGroup);
  
  // リセットボタングループ
  const resetGroup = document.createElement('div');
  resetGroup.className = 'tag-control-group';
  
  const resetLabel = document.createElement('label');
  resetLabel.textContent = '設定をリセット:';
  resetGroup.appendChild(resetLabel);
  
  const resetButton = document.createElement('button');
  resetButton.className = 'tag-reset-btn';
  resetButton.textContent = 'リセット';
  resetButton.onclick = () => {
    // ソート方法を「新しい順」に戻す
    updateSortMethod('date-desc');
    
    // 関連度フィルターを0%にリセット
    updateMinRelevance(0);
    
    // スライダーの値を更新
    const slider = document.querySelector('.tag-slider');
    if (slider) slider.value = '0';
    
    // スライダーの表示値を更新
    const sliderValue = document.querySelector('.tag-slider-value');
    if (sliderValue) sliderValue.textContent = '0%';
    
    // 再レンダリング
    callback();
  };
  resetGroup.appendChild(resetButton);
  
  row.appendChild(resetGroup);
  
  return row;
}

// ソート方法を更新する関数
function updateSortMethod(method) {
  state.sortMethod = method;
  
  // ボタンのアクティブ状態を更新
  document.querySelectorAll('.tag-sort-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 選択されたソート方法に対応するボタンをアクティブに
  const activeButton = document.querySelector(`.tag-sort-btn[onclick*="${method}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

// 最小関連度を更新する関数
function updateMinRelevance(value) {
  // 内部的には1%刻みの精度を維持
  state.minRelevance = value;
}

// タグと関連度を結合した形式で表示する関数
function formatTagWithRelevance(tagName, relevance) {
  // タグ名から#を取り除く（すでに含まれている場合）
  tagName = tagName.replace(/^#/, '');
  
  // 関連度が100%または未定義の場合は通常表示
  if (!relevance || relevance === 100) {
    return `#${tagName}`;
  }
  // それ以外は関連度を付加
  return `#${tagName}:${relevance}`;
}

// グローバルな初期化関数
function initializeTagPage(tagName) {
  document.addEventListener('DOMContentLoaded', () => {
    loadTaggedArticles(tagName);
  });
}
