// グローバル変数
let peopleData = [];
let filteredData = { main: [], reference: [] };
let selectedCountries = [];
let yearRange = { start: null, end: null };
let currentYearPreset = null;
let showReferenceYears = true; // 前後5年の参考表示
let statusFilter = 'all'; // 'all' = すべて, 'alive' = 存命のみ, 'deceased' = 死没のみ
let ageDisplayMode = 'actual'; // 'actual' = 実年齢, 'elapsed' = 経過年数
let currentSort = { column: 'birth', order: 'asc' };

// 年代プリセット定義
const yearPresets = {
  generations: [
    { name: 'Progressive Generation', start: 1843, end: 1859 },
    { name: '幕末生まれ', start: 1853, end: 1868 },
    { name: 'Missionary Generation', start: 1860, end: 1882 },
    { name: 'Lost Generation', start: 1883, end: 1900 },
    { name: '戦間期世代', start: 1901, end: 1913 },
    { name: 'Greatest Generation', start: 1901, end: 1927 },
    { name: 'Beat Generation', start: 1914, end: 1929 },
    { name: '昭和一桁世代', start: 1926, end: 1934 },
    { name: 'Silent Generation', start: 1928, end: 1945 },
    { name: '焼け跡世代', start: 1935, end: 1946 },
    { name: '全共闘世代', start: 1941, end: 1949 },
    { name: 'Baby Boomers', start: 1946, end: 1964 },
    { name: '団塊の世代', start: 1947, end: 1949 },
    { name: 'しらけ世代', start: 1950, end: 1964 },
    { name: '断層の世代', start: 1951, end: 1960 },
    { name: '新人類世代', start: 1961, end: 1970 },
    { name: 'バブル世代', start: 1965, end: 1969 },
    { name: '就職氷河期世代', start: 1970, end: 1982 },
    { name: '団塊ジュニア世代', start: 1971, end: 1974 },
    { name: 'MTV世代', start: 1974, end: 1981 },
    { name: 'ポスト団塊ジュニア世代', start: 1975, end: 1981 },
    { name: '88万ウォン世代', start: 1977, end: 1986 },
    { name: 'キレる17歳・プレゆとり・≒プレッシャー世代', start: 1982, end: 1986 },
    { name: 'ゆとり・さとり・≒新人類ジュニア世代', start: 1987, end: 2004 },
    { name: 'Z世代', start: 1997, end: 2012 },
    { name: 'コロナ世代', start: 2002, end: 2016 },
    { name: 'おたく第一世代', start: 1960, end: 1969 },
    { name: 'おたく第二世代', start: 1970, end: 1979 },
    { name: 'おたく第三世代', start: 1980, end: 1989 },
    { name: 'おたく第四世代', start: 1990, end: 1999 }
  ],
  decades: [
    { name: '15世紀生まれ', start: 1400, end: 1499 },
    { name: '16世紀生まれ', start: 1500, end: 1599 },
    { name: '17世紀生まれ', start: 1600, end: 1699 },
    { name: '18世紀生まれ', start: 1700, end: 1799 },
    { name: '19世紀生まれ', start: 1800, end: 1899 },
    { name: '1900年代生まれ', start: 1900, end: 1909 },
    { name: '1910年代生まれ', start: 1910, end: 1919 },
    { name: '1920年代生まれ', start: 1920, end: 1929 },
    { name: '1930年代生まれ', start: 1930, end: 1939 },
    { name: '1940年代生まれ', start: 1940, end: 1949 },
    { name: '1950年代生まれ', start: 1950, end: 1959 },
    { name: '1960年代生まれ', start: 1960, end: 1969 },
    { name: '1970年代生まれ', start: 1970, end: 1979 },
    { name: '1980年代生まれ', start: 1980, end: 1989 },
    { name: '1990年代生まれ', start: 1990, end: 1999 }
  ]
};

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadData();
    initializeFilters();
    initializeYearPresets();
    applyFilters();
    renderTable();
    setupEventListeners();
    setupFilterEventListeners();
    setupYearFilterEventListeners();
    
    // ローディング表示を隠し、フィルターとテーブルを表示
    document.getElementById('loading').style.display = 'none';
    document.getElementById('filter-section').style.display = 'block';
    document.getElementById('table-container').style.display = 'block';
  } catch (error) {
    console.error('エラーが発生しました:', error);
    document.getElementById('loading').innerHTML = '<p style="color: red;">データの読み込みに失敗しました。</p>';
  }
});

// データを読み込む
async function loadData() {
  const response = await fetch('data.json');
  if (!response.ok) {
    throw new Error('データの読み込みに失敗しました');
  }
  peopleData = await response.json();
}

// 年齢を計算する（実年齢モード：死没時の年齢 / 現在の年齢）
function calculateAge(birthDate, deathDate) {
  const birth = new Date(birthDate);
  const reference = deathDate ? new Date(deathDate) : new Date();
  
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// 経過年数を計算する（生誕から現在まで）
function calculateElapsedYears(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  
  return years;
}

// WikipediaのURLを生成
function generateWikipediaUrl(name) {
  // 人物名をURLエンコード（日本語版Wikipedia用）
  const encodedName = encodeURIComponent(name);
  return `https://ja.wikipedia.org/wiki/${encodedName}`;
}

// 日付を表示用にフォーマット
function formatDate(dateObj) {
  if (!dateObj) return '－';
  
  const date = new Date(dateObj.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const formatted = `${year}年${month}月${day}日`;
  
  if (dateObj.uncertain) {
    return `${year}年（詳細不明）`;
  }
  
  return formatted;
}

// 死没年月日を表示用にフォーマット（享年付き）
function formatDeathDate(deathObj, birthObj) {
  if (!deathObj) return '－';
  
  const dateStr = formatDate(deathObj);
  
  // 享年を計算
  if (birthObj) {
    const lifespan = calculateAge(birthObj.date, deathObj.date);
    const uncertain = birthObj.uncertain || deathObj.uncertain;
    const uncertainMark = uncertain ? '※' : '';
    return `${dateStr}（${lifespan}歳${uncertainMark}）`;
  }
  
  return dateStr;
}

// テーブルをレンダリング
function renderTable() {
  const tbody = document.getElementById('people-tbody');
  tbody.innerHTML = '';
  
  // ソート済みのデータを取得（メイン + 参考）
  const sortedData = getSortedData();
  
  sortedData.forEach(({ person, isReference }) => {
    const row = document.createElement('tr');
    
    // 参考範囲の行にクラスを追加
    if (isReference) {
      row.classList.add('reference-row');
    }
    
    // 名前（Wikipediaリンク付き）
    const nameCell = document.createElement('td');
    const nameLink = document.createElement('a');
    nameLink.href = generateWikipediaUrl(person.name);
    nameLink.textContent = person.name;
    nameLink.target = '_blank';
    nameLink.rel = 'noopener noreferrer';
    nameCell.appendChild(nameLink);
    row.appendChild(nameCell);
    
    // 国
    const countriesCell = document.createElement('td');
    person.countries.forEach((country, index) => {
      const countryTag = document.createElement('span');
      countryTag.className = 'country-tag';
      countryTag.textContent = country;
      countryTag.addEventListener('click', () => {
        addCountryFilter(country);
      });
      countriesCell.appendChild(countryTag);
      
      // 複数国の場合、カンマは追加しない（タグ表示のため）
    });
    row.appendChild(countriesCell);
    
    // 生誕年月日
    const birthCell = document.createElement('td');
    birthCell.textContent = formatDate(person.birth);
    row.appendChild(birthCell);
    
    // 死没年月日（享年付き）
    const deathCell = document.createElement('td');
    deathCell.textContent = formatDeathDate(person.death, person.birth);
    row.appendChild(deathCell);
    
    // 年齢（モードに応じて切り替え）
    const ageCell = document.createElement('td');
    if (person.birth) {
      if (ageDisplayMode === 'actual') {
        // 実年齢モード：死没時の年齢 / 現在の年齢
        const age = calculateAge(person.birth.date, person.death?.date);
        ageCell.textContent = `${age}歳`;
      } else {
        // 経過年数モード：生誕から現在まで
        const elapsed = calculateElapsedYears(person.birth.date);
        ageCell.textContent = `${elapsed}歳`;
      }
    } else {
      ageCell.textContent = '－';
    }
    row.appendChild(ageCell);
    
    tbody.appendChild(row);
  });
  
  // ソート状態をヘッダーに反映
  updateSortIndicators();
  
  // 統計情報を更新
  updateFilterStats();
}

// ソート済みデータを取得
function getSortedData() {
  // メインと参考を結合し、フラグ付きで管理
  const combinedData = [
    ...filteredData.main.map(person => ({ person, isReference: false })),
    ...filteredData.reference.map(person => ({ person, isReference: true }))
  ];
  
  combinedData.sort((a, b) => {
    let aValue, bValue;
    
    switch (currentSort.column) {
      case 'name':
        aValue = a.person.name;
        bValue = b.person.name;
        break;
      
      case 'countries':
        aValue = a.person.countries.join(', ');
        bValue = b.person.countries.join(', ');
        break;
      
      case 'birth':
        aValue = a.person.birth?.date || '';
        bValue = b.person.birth?.date || '';
        break;
      
      case 'death':
        // 死没年がない場合（存命）は最後にソート
        aValue = a.person.death?.date || '9999-99-99';
        bValue = b.person.death?.date || '9999-99-99';
        break;
      
      case 'age':
        if (ageDisplayMode === 'actual') {
          // 実年齢モード
          aValue = a.person.birth ? calculateAge(a.person.birth.date, a.person.death?.date) : -1;
          bValue = b.person.birth ? calculateAge(b.person.birth.date, b.person.death?.date) : -1;
        } else {
          // 経過年数モード
          aValue = a.person.birth ? calculateElapsedYears(a.person.birth.date) : -1;
          bValue = b.person.birth ? calculateElapsedYears(b.person.birth.date) : -1;
        }
        break;
      
      default:
        return 0;
    }
    
    // 文字列または数値の比較
    if (typeof aValue === 'string') {
      const comparison = aValue.localeCompare(bValue, 'ja');
      return currentSort.order === 'asc' ? comparison : -comparison;
    } else {
      const comparison = aValue - bValue;
      return currentSort.order === 'asc' ? comparison : -comparison;
    }
  });
  
  return combinedData;
}

// イベントリスナーを設定
function setupEventListeners() {
  const headers = document.querySelectorAll('#people-table thead th[data-sort]');
  
  headers.forEach(header => {
    header.addEventListener('click', (e) => {
      // 切り替えボタンのクリックは除外
      if (e.target.closest('.age-mode-toggle')) {
        return;
      }
      
      const column = header.dataset.sort;
      
      // 同じ列をクリックした場合は順序を反転
      if (currentSort.column === column) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.order = 'asc';
      }
      
      renderTable();
    });
    
    // ホバー時のカーソル変更
    header.style.cursor = 'pointer';
  });
  
  // 年齢モード切り替えボタン
  const ageModeToggle = document.getElementById('age-mode-toggle');
  ageModeToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // ソートイベントを防ぐ
    
    // モードを切り替え
    ageDisplayMode = ageDisplayMode === 'actual' ? 'elapsed' : 'actual';
    
    // ボタンのラベルを更新
    const label = document.getElementById('age-mode-label');
    label.textContent = ageDisplayMode === 'actual' ? '実年齢' : '経過年数';
    
    // テーブルを再描画
    renderTable();
  });
}

// ソート状態をヘッダーに反映
function updateSortIndicators() {
  const headers = document.querySelectorAll('#people-table thead th[data-sort]');
  
  headers.forEach(header => {
    // 既存のインジケーターを削除
    header.classList.remove('sort-asc', 'sort-desc');
    
    // 現在のソート列にインジケーターを追加
    if (header.dataset.sort === currentSort.column) {
      header.classList.add(`sort-${currentSort.order}`);
    }
  });
}

// フィルターを初期化
function initializeFilters() {
  // 国リストを抽出してカウント
  const countryCount = {};
  
  peopleData.forEach(person => {
    person.countries.forEach(country => {
      countryCount[country] = (countryCount[country] || 0) + 1;
    });
  });
  
  // カウント順にソート
  const sortedCountries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({ country, count }));
  
  // ドロップダウンメニューを生成
  const menu = document.getElementById('country-dropdown-menu');
  menu.innerHTML = '';
  
  sortedCountries.forEach(({ country, count }) => {
    const item = document.createElement('div');
    item.className = 'dropdown-menu-item';
    item.dataset.country = country;
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = country;
    
    const countSpan = document.createElement('span');
    countSpan.className = 'country-count';
    countSpan.textContent = `(${count})`;
    
    item.appendChild(nameSpan);
    item.appendChild(countSpan);
    
    menu.appendChild(item);
  });
}

// フィルターを適用
function applyFilters() {
  const mainData = [];
  const referenceData = [];
  
  // 参考範囲を計算
  let referenceStart = null;
  let referenceEnd = null;
  
  if (showReferenceYears && (yearRange.start !== null || yearRange.end !== null)) {
    // 開始年の前5年（開始年がある場合のみ）
    if (yearRange.start !== null) {
      referenceStart = yearRange.start - 5;
    }
    
    // 終了年の後5年（終了年がある場合のみ）
    if (yearRange.end !== null) {
      referenceEnd = yearRange.end + 5;
    }
  }
  
  peopleData.forEach(person => {
    // 国フィルター
    if (selectedCountries.length > 0) {
      const matchesCountry = person.countries.some(country => selectedCountries.includes(country));
      if (!matchesCountry) return;
    }
    
    // 状態フィルター
    if (statusFilter === 'alive' && person.death !== null) {
      return; // 存命のみ表示で、死没している場合はスキップ
    }
    if (statusFilter === 'deceased' && person.death === null) {
      return; // 死没のみ表示で、存命の場合はスキップ
    }
    
    // 年代フィルター
    if (yearRange.start !== null || yearRange.end !== null) {
      if (!person.birth) return;
      
      const birthYear = new Date(person.birth.date).getFullYear();
      
      // メイン範囲チェック
      let inMainRange = true;
      
      if (yearRange.start !== null && birthYear < yearRange.start) {
        inMainRange = false;
      }
      
      if (yearRange.end !== null && birthYear > yearRange.end) {
        inMainRange = false;
      }
      
      if (inMainRange) {
        mainData.push(person);
      } else if (showReferenceYears) {
        // 参考範囲チェック
        let inReferenceRange = false;
        
        // 開始年の前5年
        if (referenceStart !== null && yearRange.start !== null) {
          if (birthYear >= referenceStart && birthYear < yearRange.start) {
            inReferenceRange = true;
          }
        }
        
        // 終了年の後5年
        if (referenceEnd !== null && yearRange.end !== null) {
          if (birthYear > yearRange.end && birthYear <= referenceEnd) {
            inReferenceRange = true;
          }
        }
        
        if (inReferenceRange) {
          referenceData.push(person);
        }
      }
    } else {
      // 年代フィルターなし
      mainData.push(person);
    }
  });
  
  filteredData.main = mainData;
  filteredData.reference = referenceData;
}

// 選択中の国タグを更新
function updateSelectedCountryTags() {
  const container = document.getElementById('selected-countries');
  const clearBtn = document.getElementById('clear-countries-btn');
  
  container.innerHTML = '';
  
  if (selectedCountries.length === 0) {
    clearBtn.style.display = 'none';
    return;
  }
  
  clearBtn.style.display = 'inline-block';
  
  selectedCountries.forEach(country => {
    const tag = document.createElement('div');
    tag.className = 'selected-tag';
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = country;
    
    const removeSpan = document.createElement('span');
    removeSpan.className = 'selected-tag-remove';
    removeSpan.textContent = '×';
    removeSpan.addEventListener('click', () => {
      removeCountryFilter(country);
    });
    
    tag.appendChild(nameSpan);
    tag.appendChild(removeSpan);
    container.appendChild(tag);
  });
  
  // ドロップダウンメニューの選択状態を更新
  updateDropdownSelection();
}

// ドロップダウンメニューの選択状態を更新
function updateDropdownSelection() {
  const items = document.querySelectorAll('.dropdown-menu-item');
  
  items.forEach(item => {
    const country = item.dataset.country;
    if (selectedCountries.includes(country)) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

// 国フィルターを追加
function addCountryFilter(country) {
  if (!selectedCountries.includes(country)) {
    selectedCountries.push(country);
    updateSelectedCountryTags();
    applyFilters();
    renderTable();
  }
}

// 国フィルターを削除
function removeCountryFilter(country) {
  selectedCountries = selectedCountries.filter(c => c !== country);
  updateSelectedCountryTags();
  applyFilters();
  renderTable();
}

// すべての国フィルターをクリア
function clearAllCountryFilters() {
  selectedCountries = [];
  updateSelectedCountryTags();
  applyFilters();
  renderTable();
}

// フィルター統計を更新
function updateFilterStats() {
  document.getElementById('filtered-count').textContent = filteredData.main.length;
  document.getElementById('total-count').textContent = peopleData.length;
  
  const referenceCountDisplay = document.getElementById('reference-count-display');
  const referenceCount = document.getElementById('reference-count');
  
  if (filteredData.reference.length > 0) {
    referenceCount.textContent = filteredData.reference.length;
    referenceCountDisplay.style.display = 'inline';
  } else {
    referenceCountDisplay.style.display = 'none';
  }
}

// フィルターのイベントリスナーを設定
function setupFilterEventListeners() {
  const dropdownBtn = document.getElementById('country-dropdown-btn');
  const dropdownMenu = document.getElementById('country-dropdown-menu');
  const clearBtn = document.getElementById('clear-countries-btn');
  
  // ドロップダウンボタンのクリック
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownMenu.style.display === 'block';
    
    if (isOpen) {
      dropdownMenu.style.display = 'none';
      dropdownBtn.classList.remove('active');
    } else {
      dropdownMenu.style.display = 'block';
      dropdownBtn.classList.add('active');
    }
  });
  
  // ドロップダウンメニューアイテムのクリック
  dropdownMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-menu-item');
    if (item) {
      const country = item.dataset.country;
      
      if (selectedCountries.includes(country)) {
        removeCountryFilter(country);
      } else {
        addCountryFilter(country);
      }
    }
  });
  
  // クリアボタンのクリック
  clearBtn.addEventListener('click', () => {
    clearAllCountryFilters();
  });
  
  // メニュー外をクリックで閉じる
  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.style.display = 'none';
      dropdownBtn.classList.remove('active');
    }
  });
}

// 年代プリセットを初期化
function initializeYearPresets() {
  const menu = document.getElementById('year-preset-dropdown-menu');
  menu.innerHTML = '';
  
  // 世代セクション
  const generationsSection = document.createElement('div');
  generationsSection.className = 'dropdown-section';
  
  const generationsTitle = document.createElement('div');
  generationsTitle.className = 'dropdown-section-title';
  generationsTitle.textContent = '世代';
  generationsSection.appendChild(generationsTitle);
  
  yearPresets.generations.forEach(preset => {
    const item = createYearPresetItem(preset);
    generationsSection.appendChild(item);
  });
  
  menu.appendChild(generationsSection);
  
  // 年代セクション
  const decadesSection = document.createElement('div');
  decadesSection.className = 'dropdown-section';
  
  const decadesTitle = document.createElement('div');
  decadesTitle.className = 'dropdown-section-title';
  decadesTitle.textContent = '年代';
  decadesSection.appendChild(decadesTitle);
  
  yearPresets.decades.forEach(preset => {
    const item = createYearPresetItem(preset);
    decadesSection.appendChild(item);
  });
  
  menu.appendChild(decadesSection);
}

// 年代プリセットアイテムを作成
function createYearPresetItem(preset) {
  const item = document.createElement('div');
  item.className = 'dropdown-menu-item';
  
  const startStr = preset.start !== null ? preset.start : '〜';
  const endStr = preset.end !== null ? preset.end : '〜';
  
  const nameSpan = document.createElement('span');
  nameSpan.textContent = preset.name;
  
  const rangeSpan = document.createElement('span');
  rangeSpan.className = 'country-count';
  rangeSpan.textContent = `(${startStr}〜${endStr})`;
  
  item.appendChild(nameSpan);
  item.appendChild(rangeSpan);
  
  item.addEventListener('click', () => {
    applyYearPreset(preset);
  });
  
  return item;
}

// 年代プリセットを適用
function applyYearPreset(preset) {
  yearRange.start = preset.start;
  yearRange.end = preset.end;
  currentYearPreset = preset.name;
  
  // 入力フィールドを更新
  document.getElementById('year-start').value = preset.start !== null ? preset.start : '';
  document.getElementById('year-end').value = preset.end !== null ? preset.end : '';
  
  // ドロップダウンのラベルを更新
  updateYearPresetLabel();
  
  // クリアボタンを表示
  document.getElementById('clear-year-btn').style.display = 'inline-block';
  
  // ドロップダウンを閉じる
  const menu = document.getElementById('year-preset-dropdown-menu');
  const btn = document.getElementById('year-preset-dropdown-btn');
  menu.style.display = 'none';
  btn.classList.remove('active');
  
  // フィルターを適用
  applyFilters();
  renderTable();
}

// 年代フィルターを手動で設定
function setYearRange(start, end) {
  yearRange.start = start;
  yearRange.end = end;
  
  // プリセットと一致するかチェック
  checkYearPresetMatch();
  
  // クリアボタンの表示/非表示
  const hasFilter = start !== null || end !== null;
  document.getElementById('clear-year-btn').style.display = hasFilter ? 'inline-block' : 'none';
  
  // フィルターを適用
  applyFilters();
  renderTable();
}

// 年代プリセットとの一致をチェック
function checkYearPresetMatch() {
  const allPresets = [...yearPresets.generations, ...yearPresets.decades];
  
  const match = allPresets.find(preset => 
    preset.start === yearRange.start && preset.end === yearRange.end
  );
  
  if (match) {
    currentYearPreset = match.name;
  } else if (yearRange.start !== null || yearRange.end !== null) {
    // カスタム範囲
    const startStr = yearRange.start !== null ? yearRange.start : '〜';
    const endStr = yearRange.end !== null ? yearRange.end : '〜';
    currentYearPreset = `カスタム (${startStr}〜${endStr})`;
  } else {
    currentYearPreset = null;
  }
  
  updateYearPresetLabel();
}

// 年代プリセットラベルを更新
function updateYearPresetLabel() {
  const label = document.getElementById('year-preset-label');
  label.textContent = currentYearPreset || 'プリセットを選択';
}

// 年代フィルターをクリア
function clearYearFilter() {
  yearRange.start = null;
  yearRange.end = null;
  currentYearPreset = null;
  
  document.getElementById('year-start').value = '';
  document.getElementById('year-end').value = '';
  document.getElementById('clear-year-btn').style.display = 'none';
  
  updateYearPresetLabel();
  
  applyFilters();
  renderTable();
}

// 年代フィルターのイベントリスナーを設定
function setupYearFilterEventListeners() {
  const presetBtn = document.getElementById('year-preset-dropdown-btn');
  const presetMenu = document.getElementById('year-preset-dropdown-menu');
  const yearStart = document.getElementById('year-start');
  const yearEnd = document.getElementById('year-end');
  const clearBtn = document.getElementById('clear-year-btn');
  const showReferenceCheckbox = document.getElementById('show-reference-years');
  
  // プリセットドロップダウンボタンのクリック
  presetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = presetMenu.style.display === 'block';
    
    if (isOpen) {
      presetMenu.style.display = 'none';
      presetBtn.classList.remove('active');
    } else {
      presetMenu.style.display = 'block';
      presetBtn.classList.add('active');
    }
  });
  
  // メニュー外をクリックで閉じる
  document.addEventListener('click', (e) => {
    if (!presetBtn.contains(e.target) && !presetMenu.contains(e.target)) {
      presetMenu.style.display = 'none';
      presetBtn.classList.remove('active');
    }
  });
  
  // 開始年の入力
  let startPending = false;
  yearStart.addEventListener('input', () => {
    startPending = true;
    yearStart.classList.add('pending');
  });
  
  yearStart.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      applyYearInput();
    }
  });
  
  yearStart.addEventListener('blur', () => {
    if (startPending) {
      applyYearInput();
    }
  });
  
  // 終了年の入力
  let endPending = false;
  yearEnd.addEventListener('input', () => {
    endPending = true;
    yearEnd.classList.add('pending');
  });
  
  yearEnd.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      applyYearInput();
    }
  });
  
  yearEnd.addEventListener('blur', () => {
    if (endPending) {
      applyYearInput();
    }
  });
  
  // 入力を適用
  function applyYearInput() {
    const start = yearStart.value ? parseInt(yearStart.value) : null;
    const end = yearEnd.value ? parseInt(yearEnd.value) : null;
    
    setYearRange(start, end);
    
    startPending = false;
    endPending = false;
    yearStart.classList.remove('pending');
    yearEnd.classList.remove('pending');
  }
  
  // クリアボタン
  clearBtn.addEventListener('click', () => {
    clearYearFilter();
  });
  
  // 参考範囲表示のチェックボックス
  showReferenceCheckbox.addEventListener('change', (e) => {
    showReferenceYears = e.target.checked;
    applyFilters();
    renderTable();
  });
  
  // 状態フィルターのラジオボタン
  const statusRadios = document.querySelectorAll('input[name="status-filter"]');
  statusRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      applyFilters();
      renderTable();
    });
  });
}