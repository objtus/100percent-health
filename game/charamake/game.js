// グローバル状態管理
const state = {
    partsData: null,  // エディタから読み込んだパーツデータ
    selectedParts: {},  // カテゴリID: パーツID または [パーツID配列]
    selectedColors: {},  // パーツID: 色プリセット名（'normal', 'black'など）または'custom'
    customColors: {},   // パーツID: カスタム色設定オブジェクト（プリセット変更後も保持）
    currentCategory: null,
    colorSettingsPart: null, // 現在色設定を表示しているパーツID（複数選択カテゴリでも対応）
    selectedSide: {},       // パーツID: 'both' | 'left' | 'right'
    multiSelectActive: {},  // カテゴリID: true/false（複数選択モードが有効か）
    previouslyUnlockedCategories: new Set(), // 以前解放されていたカテゴリを追跡
    previouslyHiddenCategories: new Set(), // 以前 hides で非表示だったカテゴリ
    previouslyHiddenPartIds: new Set(), // 以前 hides で非表示だったパーツ
    dependencyFeedReady: false, // 初回 processDependencies ではフィードを出さない
    unlockedCategories: new Set(), // 表示中の選択の unlocks（processDependencies で更新）
    hiddenByParts: new Set(), // hides により動的に非表示になっているカテゴリ
    hiddenPartIds: new Set(), // hides により動的に非表示になっているパーツ
    unlockedSecrets: new Set(), // パスワードで解放したシークレット束 ID
    previouslyUnlockedSecrets: new Set(), // 新規解放時の先頭自動選択用
    clockDisplayMode: 'jst', // 時刻枠 overlay: jst | local | unix | both
    colorGroupPresets: {}, // colorGroup ID → 'normal' | プリセット名 | 'custom'（グループ共有の色意図）
    colorGroupCustom: {}, // colorGroup ID → カスタム色オブジェクト
    lockedCategories: new Set(), // 全体ランダムの対象外にする左一覧カテゴリ
    undoStack: [],
    redoStack: []
};

const HISTORY_LIMIT = 20;
const LOCKS_STORAGE_KEY = 'charamake.lockedCategories';
const FALLBACK_DEFAULT_LOCKS = ['frame', 'background', 'basehair'];

let previewDrawPromise = Promise.resolve();
let clockTickInterval = null;

// DOM要素
const elements = {
    categoryList: document.getElementById('categoryList'),
    partsGrid: document.getElementById('partsGrid'),
    currentCategoryName: document.getElementById('currentCategoryName'),
    previewCanvas: document.getElementById('previewCanvas'),
    colorSettings: document.getElementById('colorSettings'),
    colorPresetSelector: document.getElementById('colorPresetSelector'),
    dataFileInput: document.getElementById('dataFileInput'),
    characterFileInput: document.getElementById('characterFileInput'),
    partSettingsExtensions: document.getElementById('partSettingsExtensions'),
    partSettingsDisplayHeading: document.getElementById('partSettingsDisplayHeading'),
    partSettingsColorHeading: document.getElementById('partSettingsColorHeading'),
    modifierCategoriesHost: document.getElementById('modifierCategoriesHost'),
    colorPresetBlock: document.getElementById('colorPresetBlock'),
    randomAllBtn: document.getElementById('randomAllBtn'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    lockSummary: document.getElementById('lockSummary'),
    clearLocksBtn: document.getElementById('clearLocksBtn'),
    categoryRandomBtn: document.getElementById('categoryRandomBtn')
};

/** @type {Map<string, string[]> | null} partId → hidden category ids */
let modifierCategoriesByPartIdCache = null;

// 初期化
function init() {
    setupEventListeners();
    
    // モバイル時はデフォルトでカテゴリタブを表示
    if (isMobile()) {
        switchTab('categories');
    }
    
    // parts-data.jsonを自動読込
    loadDefaultPartsData();
}

// デフォルトのパーツデータを読込
function loadDefaultPartsData() {
    fetch('parts-data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('parts-data.jsonが見つかりません');
            }
            return response.json();
        })
        .then(data => {
            state.partsData = data;
            modifierCategoriesByPartIdCache = null;
            applyPartOrdersMigration();
            
            // キャンバスサイズを設定
            if (state.partsData.meta) {
                elements.previewCanvas.width = state.partsData.meta.canvasWidth || 800;
                elements.previewCanvas.height = state.partsData.meta.canvasHeight || 900;
            }
            
            // 各カテゴリの最初のパーツをデフォルト選択（非 hidden）
            // 続けて依存関係を処理し、解放済みの条件付きカテゴリも先頭パーツを選ぶ
            resetDependencyFeedSnapshot();
            state.colorGroupPresets = {};
            state.colorGroupCustom = {};
            initializeLocks();
            clearHistory();
            initializeDefaultSelections();
            processDependencies();
            
            // カテゴリ一覧を表示
            renderCategories();
            updatePreview();
            syncClockTick();
        })
        .catch(error => {
            console.error('パーツデータの読み込みに失敗:', error);
            alert('parts-data.jsonの読み込みに失敗しました。\nエディタでJSONを作成し、このフォルダに配置してください。\n\nまたは「JSONを再読込」ボタンから手動で読み込むこともできます。');
        });
}

function applyPartOrdersMigration() {
    const PO = window.CharamakePartsOrder;
    if (PO && state.partsData && state.partsData.parts) {
        PO.ensurePartOrders(state.partsData.parts);
    }
}

function getSortedPartsInCategory(categoryId) {
    const PO = window.CharamakePartsOrder;
    if (!state.partsData || !PO) {
        return state.partsData
            ? state.partsData.parts.filter(p => p.category === categoryId)
            : [];
    }
    return PO.getPartsInCategory(state.partsData.parts, categoryId);
}

// 各カテゴリの最初のパーツをデフォルト選択（onlyMissing: 未設定カテゴリのみ）
function initializeDefaultSelections(onlyMissing = false) {
    if (!state.partsData) return;
    
    state.partsData.categories.forEach(category => {
        // hidden / secret カテゴリはスキップ
        if (category.hidden) return;
        if (category.secret && !isSecretUnlocked(category.secret)) return;
        if (onlyMissing && Object.prototype.hasOwnProperty.call(state.selectedParts, category.id)) return;

        const firstPart = getFirstVisiblePartInCategory(category.id);
        
        if (firstPart) {
            if (category.selectionMode === 'multiple') {
                state.selectedParts[category.id] = [firstPart.id];
            } else {
                state.selectedParts[category.id] = firstPart.id;
                // デフォルト色設定は「通常」（色なし）
                state.selectedColors[firstPart.id] = 'normal';
            }
        }
    });
}

// イベントリスナー設定
function setupEventListeners() {
    // ヘッダーボタン
    document.getElementById('loadDataBtn').addEventListener('click', loadPartsData);
    document.getElementById('loadCharacterBtn').addEventListener('click', loadCharacter);
    document.getElementById('saveCharacterBtn').addEventListener('click', saveCharacter);
    document.getElementById('exportPngBtn').addEventListener('click', exportPng);
    
    // ファイル入力
    elements.dataFileInput.addEventListener('change', handleDataFileSelect);
    elements.characterFileInput.addEventListener('change', handleCharacterFileSelect);
    
    // カスタムカラー設定
    document.getElementById('customBlendMode').addEventListener('change', applyCustomColor);
    document.getElementById('customColor').addEventListener('input', applyCustomColor);
    document.getElementById('customOpacity').addEventListener('input', (e) => {
        document.getElementById('opacityValue').textContent = parseFloat(e.target.value).toFixed(1);
        applyCustomColor();
    });
    document.getElementById('customHueShift').addEventListener('input', (e) => {
        document.getElementById('hueShiftValue').textContent = e.target.value + '°';
        applyCustomColor();
    });
    document.getElementById('customHueOpacity').addEventListener('input', (e) => {
        document.getElementById('hueOpacityValue').textContent = parseFloat(e.target.value).toFixed(1);
        applyCustomColor();
    });
    document.getElementById('applyCustomColorBtn').addEventListener('click', applyCustomColor);
    
    // モバイル用タブ
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    if (elements.randomAllBtn) elements.randomAllBtn.addEventListener('click', randomizeAll);
    if (elements.undoBtn) elements.undoBtn.addEventListener('click', undo);
    if (elements.redoBtn) elements.redoBtn.addEventListener('click', redo);
    if (elements.clearLocksBtn) elements.clearLocksBtn.addEventListener('click', clearAllLocks);
    if (elements.categoryRandomBtn) {
        elements.categoryRandomBtn.addEventListener('click', () => {
            if (state.currentCategory) randomizeCategory(state.currentCategory);
        });
    }
    if (elements.randomAllBtn) {
        document.addEventListener('keydown', handleShortcutKey);
    }

    const submitSecretBtn = document.getElementById('submitSecretBtn');
    const secretPasswordInput = document.getElementById('secretPasswordInput');
    if (submitSecretBtn) {
        submitSecretBtn.addEventListener('click', () => submitSecretPassword());
    }
    if (secretPasswordInput) {
        secretPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitSecretPassword();
        });
    }
}

// モバイル用タブ切り替え
function switchTab(tabName) {
    // タブボタンの状態更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // タブコンテンツの表示切り替え
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active-tab', content.dataset.tabContent === tabName);
    });
}

// モバイル判定
function isMobile() {
    return window.innerWidth <= 768;
}

// パーツデータ読込
function loadPartsData() {
    elements.dataFileInput.click();
}

function handleDataFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            state.partsData = JSON.parse(event.target.result);
            modifierCategoriesByPartIdCache = null;
            applyPartOrdersMigration();
            
            // キャンバスサイズを設定
            if (state.partsData.meta) {
                elements.previewCanvas.width = state.partsData.meta.canvasWidth || 800;
                elements.previewCanvas.height = state.partsData.meta.canvasHeight || 900;
            }
            
            state.selectedParts = {};
            state.selectedColors = {};
            state.customColors = {};
            state.selectedSide = {};
            state.colorGroupPresets = {};
            state.colorGroupCustom = {};
            state.unlockedCategories = new Set();
            state.hiddenByParts = new Set();
            state.hiddenPartIds = new Set();
            state.currentCategory = null;
            state.colorSettingsPart = null;
            resetDependencyFeedSnapshot();
            initializeLocks();
            clearHistory();
            initializeDefaultSelections();
            processDependencies();

            renderCategories();
            renderParts();
            updatePreview();
            
            alert('パーツデータを読み込みました');
        } catch (error) {
            alert('データの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function isSecretUnlocked(secretId) {
    const S = window.CharamakeSecrets;
    return S ? S.isSecretUnlocked(secretId, state.unlockedSecrets) : true;
}

function isPartVisible(part) {
    if (!part) return false;
    if (!isSecretUnlocked(part.secret)) return false;
    if (state.hiddenPartIds && state.hiddenPartIds.has(part.id)) return false;
    return true;
}

function getVisiblePartsInCategory(categoryId) {
    return getSortedPartsInCategory(categoryId).filter(isPartVisible);
}

function getFirstVisiblePartInCategory(categoryId) {
    const parts = getVisiblePartsInCategory(categoryId);
    return parts.length > 0 ? parts[0] : null;
}

// カテゴリが現在表示すべきかを判定
function isCategoryVisible(category) {
    // hides による動的非表示が最優先（ただし unlocks が勝つのは processDependencies で処理済み）
    if (state.hiddenByParts && state.hiddenByParts.has(category.id)) return false;
    // hidden: true のカテゴリはアンロックされていなければ非表示
    if (category.hidden && !isCategoryUnlocked(category.id)) return false;
    if (category.secret && !isSecretUnlocked(category.secret)) return false;
    return true;
}

function isCategoryListedInSidebar(category) {
    if (!category || category.hidden) return false;
    return isCategoryVisible(category);
}

function buildModifierCategoriesByPartId(partsData) {
    const categoryIds = new Set((partsData.categories || []).map(c => c.id));
    const hiddenIds = new Set(
        (partsData.categories || []).filter(c => c.hidden).map(c => c.id)
    );
    const map = new Map();
    for (const part of partsData.parts || []) {
        if (!part.unlocks) continue;
        const mods = part.unlocks.filter(id => categoryIds.has(id) && hiddenIds.has(id));
        if (mods.length > 0) {
            map.set(part.id, mods);
        }
    }
    return map;
}

function getModifierCategoriesByPartId() {
    if (!state.partsData) return new Map();
    if (!modifierCategoriesByPartIdCache) {
        modifierCategoriesByPartIdCache = buildModifierCategoriesByPartId(state.partsData);
    }
    return modifierCategoriesByPartIdCache;
}

function getSelectedPartIdsInCategory(categoryId) {
    const selection = state.selectedParts[categoryId];
    if (!selection) return [];
    const category = state.partsData?.categories.find(c => c.id === categoryId);
    if (category && category.selectionMode === 'multiple') {
        return Array.isArray(selection) ? selection.slice() : [selection];
    }
    const id = Array.isArray(selection) ? selection[0] : selection;
    return id ? [id] : [];
}

function getActiveModifierCategories(hostCategoryId) {
    if (!state.partsData || !hostCategoryId) return [];
    const modMap = getModifierCategoriesByPartId();
    const hostIds = getSelectedPartIdsInCategory(hostCategoryId);
    const modSet = new Set();
    hostIds.forEach(partId => {
        const list = modMap.get(partId);
        if (list) list.forEach(catId => modSet.add(catId));
    });
    const categories = [...modSet]
        .map(id => state.partsData.categories.find(c => c.id === id))
        .filter(cat => cat && isCategoryUnlocked(cat.id) && isCategoryVisible(cat))
        .sort((a, b) => a.order - b.order);
    return categories;
}

function findHostCategoryForModifier(modifierCategoryId) {
    if (!state.partsData) return null;
    for (const part of state.partsData.parts) {
        if (part.unlocks && part.unlocks.includes(modifierCategoryId)) {
            return part.category;
        }
    }
    return null;
}

function findFirstListedCategoryInGroup(groupId) {
    if (!state.partsData) return null;
    return state.partsData.categories
        .filter(c => c.group === groupId && isCategoryListedInSidebar(c))
        .sort((a, b) => a.order - b.order)[0] || null;
}

function findFirstListedCategoryAnywhere() {
    if (!state.partsData) return null;
    const ungrouped = state.partsData.categories
        .filter(c => !c.group && isCategoryListedInSidebar(c))
        .sort((a, b) => a.order - b.order);
    if (ungrouped.length > 0) return ungrouped[0];
    const groups = (state.partsData.categoryGroups || []).sort((a, b) => a.order - b.order);
    for (const group of groups) {
        const cat = findFirstListedCategoryInGroup(group.id);
        if (cat) return cat;
    }
    return null;
}

function ensureCurrentCategoryVisible() {
    if (!state.partsData || !state.currentCategory) return false;
    const current = state.partsData.categories.find(c => c.id === state.currentCategory);
    if (current && isCategoryListedInSidebar(current)) {
        return false;
    }
    let next = null;
    if (current && current.hidden) {
        next = state.partsData.categories.find(c => c.id === findHostCategoryForModifier(current.id));
        if (next && !isCategoryListedInSidebar(next)) next = null;
    }
    if (!next && current && current.group) {
        next = findFirstListedCategoryInGroup(current.group);
    }
    if (!next) {
        next = findFirstListedCategoryAnywhere();
    }
    if (next) {
        state.currentCategory = next.id;
        state.colorSettingsPart = null;
        state.multiSelectActive[next.id] = false;
        return true;
    }
    return false;
}

function getHostPartForSettings() {
    if (!state.currentCategory || !state.partsData) return null;
    const category = state.partsData.categories.find(c => c.id === state.currentCategory);
    if (!category || category.hidden) return null;

    if (category.selectionMode === 'multiple') {
        if (state.colorSettingsPart) {
            const part = state.partsData.parts.find(
                p => p.id === state.colorSettingsPart && p.category === state.currentCategory
            );
            if (part) return part;
        }
        return null;
    }

    const selectedPartId = state.selectedParts[state.currentCategory];
    if (!selectedPartId) return null;
    const id = Array.isArray(selectedPartId) ? selectedPartId[0] : selectedPartId;
    return state.partsData.parts.find(p => p.id === id) || null;
}

function syncColorStateAfterDependencyResolve() {
    if (!state.partsData) return;
    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        if (!category) continue;
        const ids = category.selectionMode === 'multiple'
            ? (Array.isArray(selection) ? selection : [])
            : (selection ? [Array.isArray(selection) ? selection[0] : selection] : []);
        ids.forEach(partId => {
            const part = state.partsData.parts.find(p => p.id === partId);
            if (part) initPartColorState(part);
        });
    }
}

// カテゴリ一覧の描画
function renderCategories() {
    if (!state.partsData) return;
    
    elements.categoryList.innerHTML = '';
    
    const groups = state.partsData.categoryGroups || [];
    
    if (groups.length > 0) {
        // グループなしカテゴリを先に表示
        const ungroupedCategories = state.partsData.categories
            .filter(c => !c.group)
            .sort((a, b) => a.order - b.order);
        
        ungroupedCategories.forEach(category => {
            if (!isCategoryListedInSidebar(category)) return;
            const div = createCategoryItem(category);
            elements.categoryList.appendChild(div);
        });
        
        // グループごとに表示（同時に開くのは1グループのみ）
        const sortedGroups = groups.sort((a, b) => a.order - b.order);
        let openGroupId = null;
        if (state.currentCategory) {
            const currentCat = state.partsData.categories.find(c => c.id === state.currentCategory);
            if (currentCat && currentCat.group) {
                openGroupId = currentCat.group;
            }
        }
        if (!openGroupId) {
            for (const group of sortedGroups) {
                const visible = state.partsData.categories
                    .filter(c => c.group === group.id)
                    .filter(isCategoryListedInSidebar);
                if (visible.length > 0) {
                    openGroupId = group.id;
                    break;
                }
            }
        }

        sortedGroups.forEach(group => {
            const groupCategories = state.partsData.categories
                .filter(c => c.group === group.id)
                .sort((a, b) => a.order - b.order);
            
            const visibleCategories = groupCategories.filter(isCategoryListedInSidebar);
            
            if (visibleCategories.length > 0) {
                const groupDiv = createCategoryGroup(group, visibleCategories, group.id === openGroupId);
                elements.categoryList.appendChild(groupDiv);
            }
        });
    } else {
        const categories = [...state.partsData.categories].sort((a, b) => a.order - b.order);
        
        categories.forEach(category => {
            if (!isCategoryListedInSidebar(category)) return;
            
            const div = document.createElement('div');
            div.className = 'category-item';
            
            if (category.hidden && isCategoryUnlocked(category.id)) {
                div.classList.add('unlocked-category');
            }
            if (category.secret && isSecretUnlocked(category.secret)) {
                div.classList.add('secret-category');
            }
            
            if (state.currentCategory === category.id) {
                div.classList.add('active');
            }
            
            fillCategoryItem(div, category);
            div.addEventListener('click', () => selectCategory(category.id));
            
            elements.categoryList.appendChild(div);
        });
    }
}

// カテゴリアイテムを作成
function createCategoryItem(category) {
    const div = document.createElement('div');
    div.className = 'category-item';
    
    if (state.currentCategory === category.id) {
        div.classList.add('active');
    }
    
    // 条件付き表示カテゴリ（hidden: true でアンロック済み）は専用スタイル
    if (category.hidden) {
        div.classList.add('unlocked-category');
    }
    if (category.secret && isSecretUnlocked(category.secret)) {
        div.classList.add('secret-category');
    }
    
    fillCategoryItem(div, category);
    div.addEventListener('click', () => selectCategory(category.id));
    return div;
}

function fillCategoryItem(div, category) {
    const multiTag = category.selectionMode === 'multiple'
        ? '<span class="multi-badge">複数可</span>'
        : '';
    const label = document.createElement('span');
    label.className = 'category-item-label';
    label.innerHTML = `${category.name}${multiTag}`;
    div.appendChild(label);

    const locked = state.lockedCategories.has(category.id);
    div.classList.toggle('is-locked', locked);
    div.appendChild(createLockToggle(locked ? 'on' : 'off', category.name, () => toggleCategoryLock(category.id)));
}

const LOCK_ICON_CLOSED = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">'
    + '<path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/>'
    + '<rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/></svg>';
const LOCK_ICON_OPEN = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">'
    + '<path d="M5 7V5a3 3 0 0 1 5.8-1.1" fill="none" stroke="currentColor" stroke-width="1.6"/>'
    + '<rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

/** @param {'on'|'off'|'mixed'} lockState */
function createLockToggle(lockState, label, onToggle) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lock-toggle lock-toggle--' + lockState;
    btn.setAttribute('aria-pressed', lockState === 'on' ? 'true' : (lockState === 'mixed' ? 'mixed' : 'false'));
    const title = lockState === 'on'
        ? `「${label}」の固定を外す`
        : `「${label}」を固定する（全体ランダムで変えない）`;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = lockState === 'off' ? LOCK_ICON_OPEN : LOCK_ICON_CLOSED;
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onToggle();
    });
    return btn;
}

// カテゴリグループを作成
function createCategoryGroup(group, categories, startOpen = false) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'category-group' + (startOpen ? ' category-group--open' : '');
    
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'category-group-header';
    header.setAttribute('aria-expanded', startOpen ? 'true' : 'false');
    header.setAttribute('aria-controls', `category-group-${group.id}`);
    header.innerHTML = `<span class="group-toggle" aria-hidden="true">›</span><span class="category-group-name">${group.name}</span>`;
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCategoryGroup(group.id);
    });

    const headerRow = document.createElement('div');
    headerRow.className = 'category-group-header-row';
    headerRow.appendChild(header);
    const lockState = getGroupLockState(group.id);
    headerRow.classList.toggle('is-locked', lockState === 'on');
    headerRow.appendChild(createLockToggle(lockState, group.name, () => toggleGroupLock(group.id)));
    groupDiv.appendChild(headerRow);
    
    const content = document.createElement('div');
    content.className = 'category-group-content' + (startOpen ? '' : ' category-group-content--collapsed');
    content.id = `category-group-${group.id}`;
    
    const inner = document.createElement('div');
    inner.className = 'category-group-content-inner';
    categories.forEach(category => {
        const div = createCategoryItem(category);
        div.classList.add('grouped-item');
        inner.appendChild(div);
    });
    content.appendChild(inner);
    
    groupDiv.appendChild(content);
    return groupDiv;
}

function setCategoryGroupOpen(groupId, open) {
    const content = document.getElementById(`category-group-${groupId}`);
    if (!content) return;
    const groupDiv = content.closest('.category-group');
    const header = groupDiv?.querySelector('.category-group-header');
    if (!groupDiv || !header) return;

    if (open) {
        content.classList.remove('category-group-content--collapsed');
        groupDiv.classList.add('category-group--open');
        header.setAttribute('aria-expanded', 'true');
    } else {
        content.classList.add('category-group-content--collapsed');
        groupDiv.classList.remove('category-group--open');
        header.setAttribute('aria-expanded', 'false');
    }
}

// カテゴリグループの折りたたみ（アコーディオン: 同時に1つだけ開く）
function toggleCategoryGroup(groupId) {
    const content = document.getElementById(`category-group-${groupId}`);
    if (!content) return;
    const willOpen = content.classList.contains('category-group-content--collapsed');

    if (willOpen) {
        elements.categoryList.querySelectorAll('.category-group-content').forEach(el => {
            const id = el.id.replace('category-group-', '');
            if (id !== groupId) {
                setCategoryGroupOpen(id, false);
            }
        });
        setCategoryGroupOpen(groupId, true);
    } else {
        setCategoryGroupOpen(groupId, false);
    }
}

// カテゴリが解放されているか（processDependencies が表示中の選択から算出した集合）
function isCategoryUnlocked(categoryId) {
    return state.unlockedCategories.has(categoryId);
}

// カテゴリ選択
function selectCategory(categoryId) {
    state.currentCategory = categoryId;
    state.colorSettingsPart = null; // カテゴリ切り替え時は色設定フォーカスをリセット
    // カテゴリ切り替え時は複数選択モードをリセット
    state.multiSelectActive[categoryId] = false;
    renderCategories();
    renderParts();
    
    updatePartSettingsPanel();
    
    // モバイル時はパーツタブに自動切り替え
    if (isMobile()) {
        switchTab('controls');
    }
}

function updateColorSettingsForCurrentCategory() {
    updatePartSettingsPanel();
}

// パーツ一覧の描画
function renderParts() {
    renderPartsContent();
    updateCategoryRandomButton();
}

function updateCategoryRandomButton() {
    const btn = elements.categoryRandomBtn;
    if (!btn) return;
    const category = state.partsData && state.currentCategory
        ? state.partsData.categories.find(c => c.id === state.currentCategory)
        : null;
    const usable = !!category && isCategoryListedInSidebar(category)
        && getVisiblePartsInCategory(category.id).length > 0
        && !!window.CharamakeRandomize;
    btn.hidden = !usable;
    if (!usable) return;
    btn.title = state.lockedCategories.has(category.id)
        ? `「${category.name}」は固定中ですが、このボタンでは引き直します`
        : `「${category.name}」だけをランダムにする`;
}

function renderPartsContent() {
    if (!state.partsData) {
        elements.partsGrid.innerHTML = '<p class="placeholder">カテゴリを選択してください</p>';
        elements.currentCategoryName.textContent = 'パーツを選択';
        elements.colorSettings.style.display = 'none';
        clearPartSettingsExtensions();
        if (elements.modifierCategoriesHost) elements.modifierCategoriesHost.innerHTML = '';
        syncClockTick();
        return;
    }

    if (ensureCurrentCategoryVisible()) {
        renderCategories();
    }

    if (!state.currentCategory) {
        elements.partsGrid.innerHTML = '<p class="placeholder">カテゴリを選択してください</p>';
        elements.currentCategoryName.textContent = 'パーツを選択';
        elements.colorSettings.style.display = 'none';
        clearPartSettingsExtensions();
        syncClockTick();
        return;
    }
    
    const category = state.partsData.categories.find(c => c.id === state.currentCategory);
    if (!category || !isCategoryListedInSidebar(category)) {
        elements.partsGrid.innerHTML = '<p class="placeholder">カテゴリを選択してください</p>';
        elements.currentCategoryName.textContent = 'パーツを選択';
        updatePartSettingsPanel();
        return;
    }
    elements.currentCategoryName.textContent = category.name;
    
    const parts = getVisiblePartsInCategory(state.currentCategory);
    
    if (parts.length === 0) {
        elements.partsGrid.innerHTML = '<p class="placeholder">パーツがありません</p>';
        updatePartSettingsPanel();
        return;
    }
    
    elements.partsGrid.innerHTML = '';
    
    const isMultipleCapable = category.selectionMode === 'multiple';
    const isMultiActive = isMultipleCapable && !!state.multiSelectActive[category.id];
    
    if (isMultipleCapable) {
        // ツールバー行（複数選択トグル + 選択解除）
        const toolbar = document.createElement('div');
        toolbar.className = 'multiple-toolbar';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-small multi-toggle-btn' + (isMultiActive ? ' active' : '');
        toggleBtn.textContent = '複数選択';
        toggleBtn.addEventListener('click', () => {
            state.multiSelectActive[category.id] = !state.multiSelectActive[category.id];
            renderParts();
        });
        
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-small multiple-reset-btn';
        resetBtn.textContent = '選択解除';
        resetBtn.addEventListener('click', () => {
            const before = captureSnapshot();
            state.selectedParts[state.currentCategory] = [];
            processDependencies();
            updatePreview();
            renderParts();
            renderCategories();
            commitHistory(before);
        });
        
        toolbar.appendChild(toggleBtn);
        toolbar.appendChild(resetBtn);
        elements.partsGrid.appendChild(toolbar);
    }
    
    parts.forEach(part => {
        const item = createPartItem(part, isMultipleCapable, isMultiActive);
        elements.partsGrid.appendChild(item);
    });

    updatePartSettingsPanel();
}

// パーツアイテムの作成
function createPartItem(part, isMultipleCapable, isMultiActive) {
    const div = document.createElement('div');
    div.className = 'part-item';
    
    // 選択状態をチェック
    const isSelected = isMultipleCapable
        ? (state.selectedParts[part.category] && state.selectedParts[part.category].includes(part.id))
        : (state.selectedParts[part.category] === part.id);
    
    if (isSelected) {
        div.classList.add('selected');
    }
    if (part.secret && isSecretUnlocked(part.secret)) {
        div.classList.add('secret-part');
    }
    
    // 色設定が表示されているパーツにインジケータ
    const isColorFocused = isMultipleCapable && state.colorSettingsPart === part.id;
    if (isColorFocused) {
        div.classList.add('color-focused');
    }
    
    div.innerHTML = `<div class="part-name">${part.name}</div>`
        + (isColorFocused ? `<div class="color-focus-indicator">🎨</div>` : '');
    
    if (isMultipleCapable && isMultiActive) {
        // 複数選択モード: トグル
        div.addEventListener('click', () => togglePartSelection(part.id));
    } else if (isMultipleCapable) {
        // 単一選択モード（複数可カテゴリ）: 配列で1件だけ保持
        div.addEventListener('click', () => selectPartInMultiCategory(part.id));
    } else {
        div.addEventListener('click', () => selectPart(part.id));
    }
    
    return div;
}

// パーツ選択（単一選択）
function selectPart(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    const before = captureSnapshot();
    
    // 選択状態を更新
    state.selectedParts[part.category] = partId;
    
    initPartColorState(part);
    state.colorSettingsPart = partId;
    
    // 依存関係処理
    processDependencies();
    
    updatePartSettingsPanel();
    updatePreview();
    renderParts();
    renderCategories();
    commitHistory(before);
}

function selectModifierPart(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    const category = state.partsData.categories.find(c => c.id === part.category);
    if (!category) return;

    if (category.selectionMode === 'multiple') {
        const isMultiActive = !!state.multiSelectActive[category.id];
        if (isMultiActive) {
            togglePartSelection(partId);
            return;
        }
        selectPartInMultiCategory(partId);
        return;
    }

    const before = captureSnapshot();
    state.selectedParts[part.category] = partId;
    initPartColorState(part);
    processDependencies();
    updatePartSettingsPanel();
    updatePreview();
    renderParts();
    renderCategories();
    commitHistory(before);
}

// 複数可カテゴリでの単一選択（配列に1件だけ保持）
function selectPartInMultiCategory(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    const before = captureSnapshot();
    
    const current = state.selectedParts[part.category] || [];
    if (current.length === 1 && current[0] === partId) {
        state.selectedParts[part.category] = [];
    } else {
        state.selectedParts[part.category] = [partId];
    }
    
    initPartColorState(part);
    if (part.category === state.currentCategory) {
        state.colorSettingsPart = partId;
    }
    
    processDependencies();
    updatePartSettingsPanel();
    updatePreview();
    renderParts();
    renderCategories();
    commitHistory(before);
}

// パーツ選択（複数選択トグル）
function togglePartSelection(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    const before = captureSnapshot();
    
    if (!state.selectedParts[part.category]) {
        state.selectedParts[part.category] = [];
    }
    
    const idx = state.selectedParts[part.category].indexOf(partId);
    if (idx === -1) {
        state.selectedParts[part.category].push(partId);
    } else {
        state.selectedParts[part.category].splice(idx, 1);
    }
    
    initPartColorState(part);
    if (part.category === state.currentCategory) {
        state.colorSettingsPart = partId;
    }
    
    processDependencies();
    updatePartSettingsPanel();
    updatePreview();
    renderParts();
    renderCategories();
    commitHistory(before);
}

function getPartCategory(part) {
    if (!part || !state.partsData) return null;
    return state.partsData.categories.find(c => c.id === part.category) || null;
}

function getColorGroupIdForPart(part) {
    const category = getPartCategory(part);
    return category && category.colorGroup ? category.colorGroup : null;
}

function getColorGroupRawPreset(colorGroupId) {
    if (!colorGroupId) return 'normal';
    const v = state.colorGroupPresets[colorGroupId];
    return v || 'normal';
}

// グループ意図を、このパーツが実際に適用できるプリセット名に解決
function getEffectiveColorPreset(part) {
    if (!part) return 'normal';
    const groupId = getColorGroupIdForPart(part);
    const raw = groupId ? getColorGroupRawPreset(groupId) : (state.selectedColors[part.id] || 'normal');

    if (!raw || raw === 'normal') return 'normal';
    if (raw === 'custom') {
        return isCustomColorAllowed(part) ? 'custom' : 'normal';
    }
    if (part.colors && part.colors[raw]) return raw;
    return 'normal';
}

function syncPartColorCacheFromGroup(part) {
    if (!part) return;
    const groupId = getColorGroupIdForPart(part);
    if (!groupId) return;

    const effective = getEffectiveColorPreset(part);
    state.selectedColors[part.id] = effective;
    if (effective === 'custom' && state.colorGroupCustom[groupId]) {
        state.customColors[part.id] = { ...state.colorGroupCustom[groupId] };
    } else {
        delete state.customColors[part.id];
    }
}

function syncSelectedColorsCacheForGroup(colorGroupId) {
    if (!state.partsData || !colorGroupId) return;

    state.partsData.categories
        .filter(c => c.colorGroup === colorGroupId)
        .forEach(category => {
            const selection = state.selectedParts[category.id];
            if (!selection) return;
            const ids = Array.isArray(selection) ? selection : [selection];
            ids.forEach(partId => {
                const part = state.partsData.parts.find(p => p.id === partId);
                if (part) syncPartColorCacheFromGroup(part);
            });
        });
}

function setColorGroupPreset(colorGroupId, colorName, customData) {
    if (!colorGroupId) return;
    state.colorGroupPresets[colorGroupId] = colorName;
    if (colorName === 'custom' && customData) {
        state.colorGroupCustom[colorGroupId] = { ...customData };
    } else if (colorName !== 'custom') {
        delete state.colorGroupCustom[colorGroupId];
    }
    syncSelectedColorsCacheForGroup(colorGroupId);
}

function rebuildColorGroupsFromPartColors() {
    state.colorGroupPresets = {};
    state.colorGroupCustom = {};
    if (!state.partsData) return;

    for (const category of state.partsData.categories) {
        if (!category.colorGroup) continue;
        const groupId = category.colorGroup;
        if (state.colorGroupPresets[groupId]) continue;

        const selection = state.selectedParts[category.id];
        if (!selection) continue;
        const ids = Array.isArray(selection) ? selection : [selection];

        for (const partId of ids) {
            const preset = state.selectedColors[partId];
            if (!preset || preset === 'normal') continue;
            state.colorGroupPresets[groupId] = preset;
            if (preset === 'custom' && state.customColors[partId]) {
                state.colorGroupCustom[groupId] = { ...state.customColors[partId] };
            }
            break;
        }
    }

    for (const groupId of Object.keys(state.colorGroupPresets)) {
        syncSelectedColorsCacheForGroup(groupId);
    }
}

function applyLoadedColorGroups(colorGroups) {
    state.colorGroupPresets = {};
    state.colorGroupCustom = {};
    if (!colorGroups || typeof colorGroups !== 'object') return;

    for (const [groupId, info] of Object.entries(colorGroups)) {
        if (!info || typeof info !== 'object') continue;
        const preset = info.preset || info.color || 'normal';
        if (!preset || preset === 'normal') continue;
        state.colorGroupPresets[groupId] = preset;
        if (preset === 'custom') {
            state.colorGroupCustom[groupId] = {
                blend: info.blend,
                color: info.colorValue != null ? info.colorValue : info.color,
                opacity: info.opacity,
                hueShift: info.hueShift || 0,
                hueOpacity: info.hueOpacity || 0
            };
        }
    }

    for (const groupId of Object.keys(state.colorGroupPresets)) {
        syncSelectedColorsCacheForGroup(groupId);
    }
}

// パーツの色状態を初期化（カラーグループはグループ意図から解決）
function initPartColorState(part) {
    const groupId = getColorGroupIdForPart(part);
    if (groupId) {
        syncPartColorCacheFromGroup(part);
        return;
    }

    if (!state.selectedColors[part.id]) {
        state.selectedColors[part.id] = 'normal';
    }
    if (state.selectedColors[part.id] === 'custom' && !isCustomColorAllowed(part)) {
        state.selectedColors[part.id] = 'normal';
        delete state.customColors[part.id];
    }
    if (state.selectedColors[part.id] === 'custom') {
        const inherited = getGroupCustomColors(part.id);
        if (inherited) {
            state.customColors[part.id] = { ...inherited };
        }
    }
}

// 選択中の全パーツ ID を列挙
function getSelectedPartIds() {
    const ids = [];
    if (!state.partsData) return ids;
    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        if (category && category.selectionMode === 'multiple') {
            if (Array.isArray(selection)) ids.push(...selection);
        } else if (selection) {
            ids.push(selection);
        }
    }
    return ids;
}

// hides で非表示になったパーツの選択を修正
function sanitizeHiddenPartSelections() {
    if (!state.partsData) return;

    state.partsData.categories.forEach(category => {
        if (!isCategoryVisible(category)) return;

        const selection = state.selectedParts[category.id];
        if (!selection) return;

        if (category.selectionMode === 'multiple' && Array.isArray(selection)) {
            const filtered = selection.filter(partId => {
                const part = state.partsData.parts.find(p => p.id === partId);
                return isPartVisible(part);
            });
            if (filtered.length > 0) {
                state.selectedParts[category.id] = filtered;
            } else {
                delete state.selectedParts[category.id];
            }
            return;
        }

        const part = state.partsData.parts.find(p => p.id === selection);
        if (!isPartVisible(part)) {
            const firstPart = getFirstVisiblePartInCategory(category.id);
            if (firstPart) {
                state.selectedParts[category.id] = firstPart.id;
                if (!state.selectedColors[firstPart.id]) {
                    state.selectedColors[firstPart.id] = 'normal';
                }
            } else {
                delete state.selectedParts[category.id];
            }
        }
    });
}

function resetDependencyFeedSnapshot() {
    state.previouslyUnlockedCategories = new Set();
    state.previouslyHiddenCategories = new Set();
    state.previouslyHiddenPartIds = new Set();
    state.dependencyFeedReady = false;
    renderDependencyFeed([]);
}

function getCategoryDisplayName(categoryId) {
    if (!state.partsData) return categoryId;
    const cat = state.partsData.categories.find(c => c.id === categoryId);
    return (cat && cat.name) ? cat.name : categoryId;
}

function getPartDisplayName(partId) {
    if (!state.partsData) return partId;
    const part = state.partsData.parts.find(p => p.id === partId);
    return (part && part.name) ? part.name : partId;
}

function collectDependencyFeedMessages(prevUnlocked, prevHiddenCat, prevHiddenParts, unlocked, hiddenCat, hiddenParts) {
    const messages = [];

    unlocked.forEach(id => {
        if (!prevUnlocked.has(id)) {
            messages.push({
                kind: 'unlock',
                text: `「${getCategoryDisplayName(id)}」が表示されました`
            });
        }
    });

    hiddenCat.forEach(id => {
        if (!prevHiddenCat.has(id)) {
            messages.push({
                kind: 'hide',
                text: `「${getCategoryDisplayName(id)}」が非表示になりました`
            });
        }
    });

    prevHiddenCat.forEach(id => {
        if (!hiddenCat.has(id)) {
            messages.push({
                kind: 'show',
                text: `「${getCategoryDisplayName(id)}」が再表示されました`
            });
        }
    });

    hiddenParts.forEach(id => {
        if (!prevHiddenParts.has(id)) {
            messages.push({
                kind: 'hide',
                text: `「${getPartDisplayName(id)}」が選択肢から外れました`
            });
        }
    });

    prevHiddenParts.forEach(id => {
        if (!hiddenParts.has(id)) {
            messages.push({
                kind: 'show',
                text: `「${getPartDisplayName(id)}」が再表示されました`
            });
        }
    });

    return messages.slice(0, 3);
}

function renderDependencyFeed(messages) {
    const el = document.getElementById('dependencyFeed');
    if (!el) return;
    el.innerHTML = '';
    if (!messages || messages.length === 0) return;

    messages.forEach(msg => {
        const line = document.createElement('p');
        line.className = 'dependency-feed-line dependency-feed-line--' + msg.kind;
        line.textContent = msg.text;
        el.appendChild(line);
    });
}

// 依存関係の処理（resolveSelection で固定点まで解決）
function processDependencies() {
    if (!state.partsData) return;

    const Dep = window.CharamakeDependencies;
    let unlockedCategories = new Set();
    let hiddenByParts = new Set();
    let hiddenPartIds = new Set();

    if (Dep && Dep.resolveSelection) {
        const result = Dep.resolveSelection(state.selectedParts, state.partsData, {
            unlockedSecrets: state.unlockedSecrets,
            previouslyUnlockedCategories: state.previouslyUnlockedCategories
        });
        state.selectedParts = result.selectedParts;
        unlockedCategories = result.unlockedCategories;
        hiddenByParts = result.hiddenCategoryIds;
        hiddenPartIds = result.hiddenPartIds;
    } else {
        const selectedIds = getSelectedPartIds();
        const sets = Dep
            ? Dep.collectDependencySets(selectedIds, state.partsData)
            : {
                unlockedCategories: new Set(),
                hiddenCategoryIds: new Set(),
                hiddenPartIds: new Set()
            };
        unlockedCategories = sets.unlockedCategories;
        hiddenByParts = sets.hiddenCategoryIds;
        hiddenPartIds = sets.hiddenPartIds;
        state.unlockedCategories = unlockedCategories;
        state.hiddenByParts = hiddenByParts;
        state.hiddenPartIds = hiddenPartIds;
        sanitizeHiddenPartSelections();
    }

    if (state.dependencyFeedReady) {
        const feedMessages = collectDependencyFeedMessages(
            state.previouslyUnlockedCategories,
            state.previouslyHiddenCategories,
            state.previouslyHiddenPartIds,
            unlockedCategories,
            hiddenByParts,
            hiddenPartIds
        );
        renderDependencyFeed(feedMessages);
    }

    state.unlockedCategories = unlockedCategories;
    state.hiddenByParts = hiddenByParts;
    state.hiddenPartIds = hiddenPartIds;

    syncColorStateAfterDependencyResolve();

    state.previouslyUnlockedCategories = new Set(unlockedCategories);
    state.previouslyHiddenCategories = new Set(hiddenByParts);
    state.previouslyHiddenPartIds = new Set(hiddenPartIds);
    state.dependencyFeedReady = true;
}

// シークレット未解放の選択を除去
function sanitizeSecretSelections() {
    if (!state.partsData) return;

    const isPartAllowed = partId => {
        const part = state.partsData.parts.find(p => p.id === partId);
        return !!part && part.category && isSecretUnlocked(part.secret);
    };

    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        if (!category || (category.secret && !isSecretUnlocked(category.secret))) {
            delete state.selectedParts[categoryId];
            continue;
        }

        if (category.selectionMode === 'multiple') {
            const arr = Array.isArray(selection) ? selection : (selection ? [selection] : []);
            const filtered = arr.filter(id => isPartAllowed(id) && getPartCategoryId(id) === categoryId);
            if (filtered.length > 0) {
                state.selectedParts[categoryId] = filtered;
            } else {
                delete state.selectedParts[categoryId];
            }
        } else if (selection) {
            if (!isPartAllowed(selection) || getPartCategoryId(selection) !== categoryId) {
                delete state.selectedParts[categoryId];
            }
        }
    }
}

function getPartCategoryId(partId) {
    const part = state.partsData?.parts.find(p => p.id === partId);
    return part ? part.category : null;
}

function processSecretUnlocks() {
    if (!state.partsData) return;

    const PO = window.CharamakePartsOrder;

    state.unlockedSecrets.forEach(secretId => {
        if (state.previouslyUnlockedSecrets.has(secretId)) return;

        state.partsData.categories.forEach(category => {
            if (category.secret !== secretId) return;
            if (!isCategoryVisible(category)) return;

            const hasSelection = category.selectionMode === 'multiple'
                ? (state.selectedParts[category.id] && state.selectedParts[category.id].length > 0)
                : !!state.selectedParts[category.id];

            if (hasSelection) return;

            const firstPart = getFirstVisiblePartInCategory(category.id);
            if (!firstPart) return;

            if (category.selectionMode === 'multiple') {
                state.selectedParts[category.id] = [firstPart.id];
            } else {
                state.selectedParts[category.id] = firstPart.id;
                state.selectedColors[firstPart.id] = 'normal';
            }
        });
    });

    state.previouslyUnlockedSecrets = new Set(state.unlockedSecrets);
}

let secretMessageTimer = null;

function showSecretMessage(text, isOk) {
    const el = document.getElementById('secretMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'secret-message ' + (isOk ? 'ok' : 'err');
    if (secretMessageTimer) clearTimeout(secretMessageTimer);
    secretMessageTimer = setTimeout(() => {
        el.textContent = '';
        el.className = 'secret-message';
    }, 3500);
}

async function submitSecretPassword() {
    const input = document.getElementById('secretPasswordInput');
    const S = window.CharamakeSecrets;
    if (!input || !S || !state.partsData) return;

    const plain = input.value.trim();
    if (!plain) {
        showSecretMessage('パスワードを入力', false);
        return;
    }

    const secretId = await S.findSecretByPassword(state.partsData.meta, plain);
    if (!secretId) {
        showSecretMessage('パスワードが違います', false);
        return;
    }

    if (state.unlockedSecrets.has(secretId)) {
        showSecretMessage('すでに解放済み', true);
        input.value = '';
        return;
    }

    state.unlockedSecrets.add(secretId);
    processSecretUnlocks();
    processDependencies();
    renderCategories();
    if (state.currentCategory) renderParts();
    updatePreview();

    const secrets = S.getSecrets(state.partsData.meta);
    const entry = secrets.find(s => s.id === secretId);
    const label = entry && entry.name ? entry.name : secretId;
    showSecretMessage(`「${label}」を解放`, true);
    input.value = '';
}

// パーツの JSON で allowCustomColor: false のときのみゲーム内カスタム色を禁止（省略時は許可）
function isCustomColorAllowed(part) {
    if (!part) return true;
    return part.allowCustomColor !== false;
}

// カスタム非許可パーツで custom が選ばれている場合は通常に戻す
function coercePartColorFromDisallowedCustom(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    const groupId = getColorGroupIdForPart(part);
    if (groupId) {
        syncPartColorCacheFromGroup(part);
        return;
    }
    if (state.selectedColors[partId] !== 'custom') return;
    if (!isCustomColorAllowed(part)) {
        state.selectedColors[partId] = 'normal';
        delete state.customColors[partId];
    }
}

function coerceAllDisallowedCustomColors() {
    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        const ids = category && category.selectionMode === 'multiple'
            ? (Array.isArray(selection) ? selection : [])
            : (selection ? [selection] : []);
        for (const pid of ids) {
            coercePartColorFromDisallowedCustom(pid);
        }
    }
}

function isCustomColorPickerEnabled() {
    const app = document.getElementById('charamake-app');
    return !(app && app.dataset.hideCustomColor === 'true');
}

function partHasColorPresetUI(part) {
    if (!part) return false;
    if (part.colors && Object.keys(part.colors).length > 0) return true;
    if (isCustomColorAllowed(part) && isCustomColorPickerEnabled()) return true;
    return false;
}

function clearPartSettingsExtensions() {
    if (elements.partSettingsExtensions) {
        elements.partSettingsExtensions.innerHTML = '';
    }
}

const PART_SETTINGS_OVERLAY_UI = {
    datetime: renderDatetimeOverlayControls
};

function renderPartSettingsExtensions(part) {
    clearPartSettingsExtensions();
    if (!part?.dynamicOverlay?.type) return false;
    const render = PART_SETTINGS_OVERLAY_UI[part.dynamicOverlay.type];
    if (!render || !elements.partSettingsExtensions) return false;
    render(elements.partSettingsExtensions, part);
    return true;
}

const CLOCK_DISPLAY_MODES = [
    { id: 'jst', label: 'JST (+09:00)' },
    { id: 'local', label: 'ローカル時刻' },
    { id: 'unix', label: 'Unix 時刻（秒）' },
    { id: 'both', label: 'JST と Unix 時刻（横並び）' }
];

function renderDatetimeOverlayControls(container, part) {
    const row = document.createElement('div');
    row.className = 'clock-mode-buttons';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', '時刻表示モード');

    const mode = state.clockDisplayMode || 'jst';
    CLOCK_DISPLAY_MODES.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-preset-btn clock-mode-btn';
        if (mode === id) btn.classList.add('active');
        btn.setAttribute('aria-label', label);
        btn.title = label;
        btn.textContent = id;
        btn.addEventListener('click', () => {
            state.clockDisplayMode = id;
            container.querySelectorAll('.clock-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updatePreview();
        });
        row.appendChild(btn);
    });
    container.appendChild(row);
}

function getSelectedDatetimeOverlayPart() {
    if (!state.partsData) return null;
    const ids = getVisibleSelectedPartIds();
    for (const id of ids) {
        const p = state.partsData.parts.find(x => x.id === id);
        if (p?.dynamicOverlay?.type === 'datetime') return p;
    }
    return null;
}

function hasActiveDatetimeOverlay() {
    return !!getSelectedDatetimeOverlayPart();
}

function syncClockTick() {
    if (clockTickInterval) {
        clearInterval(clockTickInterval);
        clockTickInterval = null;
    }
    if (hasActiveDatetimeOverlay()) {
        clockTickInterval = setInterval(() => updatePreview(), 1000);
    }
}

function formatDateTimeParts(date, timeZone) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    if (timeZone) {
        options.timeZone = timeZone;
    }
    const fmt = new Intl.DateTimeFormat('en-CA', options);
    const parts = fmt.formatToParts(date);
    const pick = type => parts.find(p => p.type === type)?.value || '00';
    return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

function formatDateTimeInZone(date, timeZone) {
    return formatDateTimeParts(date, timeZone);
}

function getLocalTimezoneOffsetString(date) {
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatJstClockLine(date) {
    return `${formatDateTimeInZone(date, 'Asia/Tokyo')} +09:00`;
}

function formatLocalClockLine(date) {
    return `${formatDateTimeParts(date, null)} ${getLocalTimezoneOffsetString(date)}`;
}

function formatUnixClockLine(date) {
    return (date.getTime() / 1000).toFixed(3);
}

function formatClockText(mode, date) {
    const m = mode || 'jst';
    if (m === 'unix') return formatUnixClockLine(date);
    if (m === 'local') return formatLocalClockLine(date);
    if (m === 'both') {
        return `${formatJstClockLine(date)}  ${formatUnixClockLine(date)}`;
    }
    return formatJstClockLine(date);
}

function getDatetimeOverlaySignature(part) {
    const raw = part?.dynamicOverlay?.signature;
    if (raw === undefined || raw === null) return '';
    return String(raw).trim();
}

function drawDynamicOverlays(ctx) {
    const part = getSelectedDatetimeOverlayPart();
    if (!part) return Promise.resolve();

    const mode = state.clockDisplayMode || 'jst';
    const date = new Date();
    const fontSize = 25;
    const marginX = 16;
    const marginY = 14;
    const lineStep = fontSize * 1.08;
    const fontSpec = `${fontSize}px saitamaar, PikoA, sans-serif`;
    const signature = getDatetimeOverlaySignature(part);

    const draw = () => {
        ctx.save();
        ctx.font = fontSpec;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const rightX = ctx.canvas.width - marginX;
        const clockY = ctx.canvas.height - marginY;

        if (signature) {
            ctx.fillText(signature, rightX, clockY - lineStep);
        }

        if (mode === 'both') {
            const jstLine = formatJstClockLine(date);
            const unixLine = formatUnixClockLine(date);
            const gap = 14;
            const unixW = ctx.measureText(unixLine).width;
            ctx.fillText(unixLine, rightX, clockY);
            ctx.fillText(jstLine, rightX - unixW - gap, clockY);
        } else {
            ctx.fillText(formatClockText(mode, date), rightX, clockY);
        }
        ctx.restore();
    };

    if (document.fonts && document.fonts.load) {
        return document.fonts.load(fontSpec).then(draw).catch(draw);
    }
    draw();
    return Promise.resolve();
}

function renderModifierCategoryBlocks(modifierCategories) {
    const host = elements.modifierCategoriesHost;
    if (!host) return;
    host.innerHTML = '';
    if (!modifierCategories || modifierCategories.length === 0) return;

    modifierCategories.forEach(modCat => {
        const parts = getVisiblePartsInCategory(modCat.id);
        if (parts.length === 0) return;

        const block = document.createElement('div');
        block.className = 'modifier-category-block';

        const heading = document.createElement('h4');
        heading.className = 'modifier-category-heading part-settings-heading';
        heading.id = `modifier-heading-${modCat.id}`;
        const multiTag = modCat.selectionMode === 'multiple'
            ? '<span class="multi-badge">複数可</span>'
            : '';
        heading.innerHTML = `${modCat.name}${multiTag}`;
        block.setAttribute('aria-labelledby', heading.id);

        const headerRow = document.createElement('div');
        headerRow.className = 'modifier-category-header';
        headerRow.appendChild(heading);
        if (window.CharamakeRandomize) {
            const randomBtn = document.createElement('button');
            randomBtn.type = 'button';
            randomBtn.className = 'btn btn-small category-random-btn category-random-btn--mini';
            randomBtn.textContent = 'ランダム';
            randomBtn.title = `「${modCat.name}」だけをランダムにする`;
            randomBtn.addEventListener('click', () => randomizeCategory(modCat.id, { includeModifiers: false }));
            headerRow.appendChild(randomBtn);
        }
        block.appendChild(headerRow);

        const grid = document.createElement('div');
        grid.className = 'modifier-parts-grid parts-grid';

        const isMultipleCapable = modCat.selectionMode === 'multiple';
        const isMultiActive = isMultipleCapable && !!state.multiSelectActive[modCat.id];

        if (isMultipleCapable) {
            const toolbar = document.createElement('div');
            toolbar.className = 'multiple-toolbar';

            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'btn btn-small multi-toggle-btn' + (isMultiActive ? ' active' : '');
            toggleBtn.textContent = '複数選択';
            toggleBtn.addEventListener('click', () => {
                state.multiSelectActive[modCat.id] = !state.multiSelectActive[modCat.id];
                updatePartSettingsPanel();
            });

            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.className = 'btn btn-small multiple-reset-btn';
            resetBtn.textContent = '選択解除';
            resetBtn.addEventListener('click', () => {
                const before = captureSnapshot();
                state.selectedParts[modCat.id] = [];
                processDependencies();
                updatePreview();
                updatePartSettingsPanel();
                renderCategories();
                commitHistory(before);
            });

            toolbar.appendChild(toggleBtn);
            toolbar.appendChild(resetBtn);
            grid.appendChild(toolbar);
        }

        parts.forEach(part => {
            grid.appendChild(createModifierPartItem(part, isMultipleCapable));
        });

        block.appendChild(grid);
        host.appendChild(block);
    });
}

function createModifierPartItem(part, isMultipleCapable) {
    const div = document.createElement('div');
    div.className = 'part-item';

    const isSelected = isMultipleCapable
        ? (state.selectedParts[part.category] && state.selectedParts[part.category].includes(part.id))
        : (state.selectedParts[part.category] === part.id);

    if (isSelected) div.classList.add('selected');
    if (part.secret && isSecretUnlocked(part.secret)) {
        div.classList.add('secret-part');
    }

    div.innerHTML = `<div class="part-name">${part.name}</div>`;
    div.addEventListener('click', () => selectModifierPart(part.id));

    return div;
}

function updatePartSettingsPanel() {
    if (!state.currentCategory || !state.partsData) {
        elements.colorSettings.style.display = 'none';
        clearPartSettingsExtensions();
        if (elements.modifierCategoriesHost) elements.modifierCategoriesHost.innerHTML = '';
        syncClockTick();
        return;
    }

    const hostPart = getHostPartForSettings();
    const modifierCategories = getActiveModifierCategories(state.currentCategory);

    let hasExtension = false;
    let showColorBlock = false;

    if (hostPart) {
        hasExtension = renderPartSettingsExtensions(hostPart);
        showColorBlock = partHasColorPresetUI(hostPart) || hasSidedLayers(hostPart);
    } else {
        clearPartSettingsExtensions();
        const existingSide = document.getElementById('sideSelector');
        if (existingSide) existingSide.remove();
        updateAdvancedColorSettings(false);
    }

    const hasModifiers = !!elements.modifierCategoriesHost && modifierCategories.length > 0;

    if (!hasExtension && !showColorBlock && !hasModifiers) {
        elements.colorSettings.style.display = 'none';
        if (elements.modifierCategoriesHost) elements.modifierCategoriesHost.innerHTML = '';
        syncClockTick();
        return;
    }

    elements.colorSettings.style.display = 'block';

    if (elements.partSettingsDisplayHeading) {
        elements.partSettingsDisplayHeading.style.display = hasExtension ? '' : 'none';
    }
    if (elements.partSettingsColorHeading) {
        elements.partSettingsColorHeading.style.display = showColorBlock ? '' : 'none';
    }
    if (elements.colorPresetBlock) {
        elements.colorPresetBlock.style.display = showColorBlock ? '' : 'none';
    }

    if (hostPart && showColorBlock) {
        renderColorBlockForPart(hostPart);
    } else if (elements.colorPresetSelector) {
        elements.colorPresetSelector.innerHTML = '';
        const existingSide = document.getElementById('sideSelector');
        if (existingSide) existingSide.remove();
        updateAdvancedColorSettings(false);
    }

    renderModifierCategoryBlocks(modifierCategories);
    syncClockTick();
}

function renderColorBlockForPart(part) {
    elements.colorPresetSelector.innerHTML = '';
    
    coercePartColorFromDisallowedCustom(part.id);

    if (!isCustomColorPickerEnabled()) {
        const groupId = getColorGroupIdForPart(part);
        if (groupId && getColorGroupRawPreset(groupId) === 'custom') {
            setColorGroupPreset(groupId, 'normal');
            updatePreview();
        } else if (state.selectedColors[part.id] === 'custom') {
            state.selectedColors[part.id] = 'normal';
            delete state.customColors[part.id];
            updatePreview();
        }
    }
    
    // side 指定レイヤーがあればサイドセレクターを表示
    if (hasSidedLayers(part)) {
        renderSideSelector(part);
    } else {
        const existing = document.getElementById('sideSelector');
        if (existing) existing.remove();
    }
    
    const currentColor = getEffectiveColorPreset(part);
    const isCustom = currentColor === 'custom';
    
    // 1. 「通常」ボタン（色設定なし）
    const normalBtn = document.createElement('button');
    normalBtn.className = 'color-preset-btn';
    if (currentColor === 'normal') {
        normalBtn.classList.add('active');
    }
    normalBtn.textContent = '通常';
    normalBtn.addEventListener('click', () => selectColorPreset(part.id, 'normal'));
    elements.colorPresetSelector.appendChild(normalBtn);
    
    // 2. プリセット色ボタン（colorsがある場合のみ）
    if (part.colors && Object.keys(part.colors).length > 0) {
        Object.keys(part.colors).forEach(colorName => {
            const btn = document.createElement('button');
            btn.className = 'color-preset-btn';
            if (currentColor === colorName) {
                btn.classList.add('active');
            }
            btn.textContent = colorName;
            btn.addEventListener('click', () => selectColorPreset(part.id, colorName));
            elements.colorPresetSelector.appendChild(btn);
        });
    }
    
    // 3. カスタム色（パーツが allowCustomColor: false のとき、または公開 UI で無効のときは非表示）
    if (isCustomColorAllowed(part) && isCustomColorPickerEnabled()) {
        const customBtn = document.createElement('button');
        customBtn.className = 'color-preset-btn';
        if (isCustom) {
            customBtn.classList.add('active');
        }
        customBtn.textContent = 'カスタム';
        customBtn.addEventListener('click', () => selectColorPreset(part.id, 'custom'));
        elements.colorPresetSelector.appendChild(customBtn);
    }
    
    // カスタム色が選択されている場合のみ拡張設定を表示し、値を反映
    if (isCustom && isCustomColorPickerEnabled()) {
        const groupId = getColorGroupIdForPart(part);
        const customData = (groupId && state.colorGroupCustom[groupId])
            ? { ...state.colorGroupCustom[groupId] }
            : (state.customColors[part.id] || { ...DEFAULT_CUSTOM_COLOR });
        loadCustomColorValues(customData);
        updateAdvancedColorSettings(true);
    } else {
        updateAdvancedColorSettings(false);
    }

}

function updateColorSettings(part) {
    updatePartSettingsPanel();
}

// カスタムのデフォルト設定
const DEFAULT_CUSTOM_COLOR = { blend: 'multiply', color: '#000000', opacity: 1, hueShift: 0, hueOpacity: 0 };

// 色プリセット選択
function selectColorPreset(partId, colorName) {
    const actorPart = state.partsData.parts.find(p => p.id === partId);
    if (colorName === 'custom' && !isCustomColorPickerEnabled()) {
        return;
    }
    if (colorName === 'custom' && actorPart && !isCustomColorAllowed(actorPart)) {
        return;
    }

    const before = captureSnapshot();
    const groupId = actorPart ? getColorGroupIdForPart(actorPart) : null;
    let customData = null;

    if (colorName === 'custom') {
        const inherited = getGroupCustomColors(partId);
        customData = inherited
            ? { ...inherited }
            : (state.customColors[partId] ? { ...state.customColors[partId] } : { ...DEFAULT_CUSTOM_COLOR });
    }

    if (groupId) {
        if (colorName === 'custom') {
            setColorGroupPreset(groupId, 'custom', customData);
        } else {
            setColorGroupPreset(groupId, colorName);
        }
    } else {
        if (colorName === 'custom') {
            state.customColors[partId] = customData;
        }
        state.selectedColors[partId] = colorName;
    }

    const part = state.partsData.parts.find(p => p.id === partId);
    if (part) {
        updateColorSettings(part);
    }

    updatePreview();
    commitHistory(before);
}

// 同じカラーグループの custom データ（グループ正本 → レガシー part キャッシュ）
function getGroupCustomColors(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return null;

    const groupId = getColorGroupIdForPart(part);
    if (groupId && state.colorGroupCustom[groupId]) {
        return state.colorGroupCustom[groupId];
    }

    const category = getPartCategory(part);
    if (!category || !category.colorGroup) return null;

    const colorGroup = category.colorGroup;
    for (const groupedCategory of state.partsData.categories) {
        if (groupedCategory.colorGroup !== colorGroup || groupedCategory.id === category.id) continue;
        const selection = state.selectedParts[groupedCategory.id];
        if (!selection) continue;
        const ids = Array.isArray(selection) ? selection : [selection];
        for (const id of ids) {
            const op = state.partsData.parts.find(p => p.id === id);
            if (op && isCustomColorAllowed(op) && state.customColors[id]) return state.customColors[id];
        }
    }
    return null;
}

// 拡張設定の表示/非表示切り替え
function updateAdvancedColorSettings(show) {
    const advancedSettings = document.getElementById('advancedColorSettings');
    advancedSettings.style.display = show ? 'block' : 'none';
}

// サイドセレクター UI の描画
function renderSideSelector(part) {
    let selector = document.getElementById('sideSelector');
    if (!selector) {
        selector = document.createElement('div');
        selector.id = 'sideSelector';
        selector.className = 'side-selector';
        // colorSettings の先頭に挿入
        elements.colorSettings.insertBefore(selector, elements.colorSettings.firstChild);
    }
    
    const currentSide = state.selectedSide[part.id] || 'both';
    const sides = [
        { value: 'both',  label: '両方' },
        { value: 'left',  label: '左のみ' },
        { value: 'right', label: '右のみ' },
    ];
    
    selector.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'side-selector-label';
    label.textContent = '表示:';
    selector.appendChild(label);
    
    sides.forEach(({ value, label: text }) => {
        const btn = document.createElement('button');
        btn.className = 'side-btn' + (currentSide === value ? ' active' : '');
        btn.textContent = text;
        btn.addEventListener('click', () => {
            const before = captureSnapshot();
            state.selectedSide[part.id] = value;
            renderSideSelector(part);
            updatePreview();
            commitHistory(before);
        });
        selector.appendChild(btn);
    });
}

// カスタムカラー値をUIに読み込む
function loadCustomColorValues(customSettings) {
    document.getElementById('customBlendMode').value = customSettings.blend || 'multiply';
    document.getElementById('customColor').value = customSettings.color || '#000000';
    const opacity = customSettings.opacity !== undefined ? customSettings.opacity : 1;
    document.getElementById('customOpacity').value = opacity;
    document.getElementById('opacityValue').textContent = opacity.toFixed(1);
    document.getElementById('customHueShift').value = customSettings.hueShift || 0;
    document.getElementById('hueShiftValue').textContent = (customSettings.hueShift || 0) + '°';
    document.getElementById('customHueOpacity').value = customSettings.hueOpacity || 0;
    document.getElementById('hueOpacityValue').textContent = (customSettings.hueOpacity || 0).toFixed(1);
}

// カスタム色を適用
function applyCustomColor() {
    if (!state.currentCategory) return;
    
    // colorSettingsPart を優先（複数選択カテゴリではこちらに正しいパーツIDが入る）
    // 通常カテゴリでは selectedParts[category] が文字列で入っている
    const rawSelection = state.selectedParts[state.currentCategory];
    const partId = state.colorSettingsPart
        || (typeof rawSelection === 'string' ? rawSelection : null);
    if (!partId) return;
    
    const applyPart = state.partsData.parts.find(p => p.id === partId);
    if (!applyPart) return;

    const groupId = getColorGroupIdForPart(applyPart);
    const effective = getEffectiveColorPreset(applyPart);
    if (effective !== 'custom' && !(groupId && getColorGroupRawPreset(groupId) === 'custom')) return;
    if (!isCustomColorAllowed(applyPart)) return;

    const customData = {
        blend: document.getElementById('customBlendMode').value,
        color: document.getElementById('customColor').value,
        opacity: parseFloat(document.getElementById('customOpacity').value),
        hueShift: parseFloat(document.getElementById('customHueShift').value) || 0,
        hueOpacity: parseFloat(document.getElementById('customHueOpacity').value) || 0
    };

    if (groupId) {
        setColorGroupPreset(groupId, 'custom', customData);
    } else {
        state.customColors[partId] = customData;
        state.selectedColors[partId] = 'custom';
    }
    updatePreview();
}

// プレビュー更新
function updatePreview() {
    const canvas = elements.previewCanvas;
    const ctx = canvas.getContext('2d');
    
    // キャンバスクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!state.partsData) {
        previewDrawPromise = Promise.resolve();
        return;
    }
    
    // 全レイヤーを収集
    const layers = collectAllLayers();
    
    // zIndex順にソート
    layers.sort((a, b) => a.zIndex - b.zIndex);
    
    previewDrawPromise = drawLayers(ctx, layers).then(() => drawDynamicOverlays(ctx));
    if (!hasActiveDatetimeOverlay() && clockTickInterval) {
        clearInterval(clockTickInterval);
        clockTickInterval = null;
    }
}

// 描画・マスク算出対象の選択中パーツ ID（非表示カテゴリは除外）
function getVisibleSelectedPartIds() {
    const ids = [];
    if (!state.partsData) return ids;

    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        if (!isCategoryVisible(category)) continue;

        if (category && category.selectionMode === 'multiple') {
            if (Array.isArray(selection)) {
                selection.forEach(partId => {
                    const part = state.partsData.parts.find(p => p.id === partId);
                    if (isPartVisible(part)) ids.push(partId);
                });
            }
        } else if (selection) {
            const part = state.partsData.parts.find(p => p.id === selection);
            if (isPartVisible(part)) ids.push(selection);
        }
    }
    return ids;
}

// 全レイヤーを収集
function collectAllLayers() {
    const layers = [];
    if (!state.partsData) return layers;

    const IG = window.CharamakeInnerGroups;
    const LR = window.CharamakeLayerResolve;
    const visiblePartIds = getVisibleSelectedPartIds();
    const activeMaskGroups = IG
        ? IG.computeActiveMaskGroups(visiblePartIds, state.partsData.parts)
        : new Set();
    const activePoseId = LR
        ? LR.getActivePoseId(visiblePartIds, state.partsData.parts)
        : null;

    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);

        if (!isCategoryVisible(category)) continue;

        if (category && category.selectionMode === 'multiple') {
            selection.forEach(partId => {
                addPartLayers(partId, layers, activeMaskGroups, activePoseId);
            });
        } else {
            addPartLayers(selection, layers, activeMaskGroups, activePoseId);
        }
    }

    return layers;
}

// パーツが side 指定レイヤーを持つか確認
function hasSidedLayers(part) {
    return part.layers && part.layers.some(l => l.side === 'left' || l.side === 'right');
}

// パーツのレイヤーを追加（side フィルタリング込み）
function addPartLayers(partId, layers, activeMaskGroups, activePoseId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part || !part.layers || !isPartVisible(part)) return;

    const LR = window.CharamakeLayerResolve;
    const maskGroups = activeMaskGroups || new Set();
    const poseId = activePoseId != null ? activePoseId : null;
    const colorSettings = getColorSettings(part);
    const selectedSide = state.selectedSide[partId] || 'both';

    part.layers.forEach(layer => {
        if (layer.side && selectedSide !== 'both' && layer.side !== selectedSide) return;

        const resolvedFile = LR
            ? LR.resolveLayerFile(layer, { poseId, activeMaskGroups: maskGroups })
            : layer.file;

        layers.push({
            file: resolvedFile,
            zIndex: layer.zIndex || part.zIndex,
            animated: layer.animated,
            blendMode: layer.blendMode,
            colorSettings: colorSettings,
            partId: part.id
        });
    });
}

// パーツの色設定を取得（カラーグループ意図 → パーツ定義で解決）
function getColorSettings(part) {
    const selectedColor = getEffectiveColorPreset(part);

    if (!selectedColor || selectedColor === 'normal') {
        return null;
    }

    if (selectedColor === 'custom') {
        const groupId = getColorGroupIdForPart(part);
        if (groupId && state.colorGroupCustom[groupId]) {
            return state.colorGroupCustom[groupId];
        }
        return state.customColors[part.id] || null;
    }

    if (part.colors && part.colors[selectedColor]) {
        return part.colors[selectedColor];
    }

    return null;
}

// 画像キャッシュ（URL → HTMLImageElement）
const imageCache = {};

function loadImage(src) {
    if (imageCache[src]) {
        return Promise.resolve(imageCache[src]);
    }
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { imageCache[src] = img; resolve(img); };
        img.onerror = () => { resolve(null); };
        img.src = src;
    });
}

// 色プリセットが専用画像（image）のときはそれを、なければレイヤー本体の file を読み込む
function loadLayerRaster(layer) {
    const cs = layer.colorSettings;
    const alt = cs && cs.image && String(cs.image).trim();
    const primary = alt ? cs.image.trim() : layer.file;
    return loadImage(primary).then(img => {
        if (img || !alt) return { img, layer };
        if (!layer.file) return { img: null, layer };
        return loadImage(layer.file).then(fallbackImg => ({ img: fallbackImg, layer }));
    });
}

// レイヤーを描画（エディタと同じロジック）
function drawLayers(ctx, layers) {
    const validLayers = layers.filter(l => {
        if (l.file) return true;
        const cs = l.colorSettings;
        return !!(cs && cs.image && String(cs.image).trim());
    });
    
    if (validLayers.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('パーツを選択してください', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return Promise.resolve();
    }
    
    // オフスクリーンキャンバスに描画し、完成後にメインへ転送してちらつきを防ぐ
    const offscreen = document.createElement('canvas');
    offscreen.width = ctx.canvas.width;
    offscreen.height = ctx.canvas.height;
    const offCtx = offscreen.getContext('2d');
    
    const sortedLayers = [...validLayers].sort((a, b) => a.zIndex - b.zIndex);
    
    return Promise.all(sortedLayers.map(loadLayerRaster))
        .then(items => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
            
            items.forEach(({ img, layer }) => {
                if (!img) return;
                const cs = layer.colorSettings;
                const hasBlend = cs && cs.blend && cs.color;
                const hasHue = cs && cs.hueShift !== undefined && cs.hueShift !== 0 && cs.hueOpacity > 0;
                const layerBlendMode = layer.blendMode || 'source-over';
                let drawTarget;
                
                if (hasBlend || hasHue) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = offscreen.width;
                    tempCanvas.height = offscreen.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    if (hasBlend) {
                        // ① 白背景 + img で完全不透明版を作成し、その上で blend 計算する
                        //    半透明ピクセルに blend モードを直接かけると Canvas 2D の
                        //    合成式が不定動作になるため、不透明化してから blend する
                        const opaqueCanvas = document.createElement('canvas');
                        opaqueCanvas.width = tempCanvas.width;
                        opaqueCanvas.height = tempCanvas.height;
                        const opaqueCtx = opaqueCanvas.getContext('2d');
                        opaqueCtx.fillStyle = '#ffffff';
                        opaqueCtx.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
                        opaqueCtx.drawImage(img, 0, 0);
                        opaqueCtx.globalCompositeOperation = cs.blend;
                        opaqueCtx.fillStyle = cs.color;
                        opaqueCtx.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
                        opaqueCtx.globalCompositeOperation = 'source-over';
                        // opaqueCanvas: 正確にブレンドされた RGB、alpha=1
                        
                        // ② 元画像を下地に、opaqueCanvas を source-atop + opacity で重ねる
                        //    source-atop: αr = αd（元の alpha を完全保持）
                        //                 RGB = lerp(original, blended, opacity)
                        tempCtx.drawImage(img, 0, 0);
                        tempCtx.globalCompositeOperation = 'source-atop';
                        tempCtx.globalAlpha = cs.opacity !== undefined ? cs.opacity : 1;
                        tempCtx.drawImage(opaqueCanvas, 0, 0);
                        tempCtx.globalAlpha = 1;
                        tempCtx.globalCompositeOperation = 'source-over';
                    } else {
                        tempCtx.drawImage(img, 0, 0);
                    }
                    
                    if (hasHue) {
                        applyHueShift(tempCtx, tempCanvas.width, tempCanvas.height, cs.hueShift, cs.hueOpacity);
                    }
                    
                    drawTarget = tempCanvas;
                } else {
                    drawTarget = img;
                }
                
                // レイヤーの合成モードを適用してオフスクリーンへ転写
                offCtx.globalCompositeOperation = layerBlendMode;
                offCtx.drawImage(drawTarget, 0, 0);
                offCtx.globalCompositeOperation = 'source-over';
            });
            
            // 完成したオフスクリーンをメインキャンバスに一括転送
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(offscreen, 0, 0);
        });
}


// 色相回転処理
function applyHueShift(ctx, width, height, hueShift, hueOpacity) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const shift = hueShift / 360;
    
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) continue;
        
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const hsl = rgbToHsl(r, g, b);
        
        let newH = (hsl.h + shift) % 1.0;
        if (newH < 0) newH += 1.0;
        
        const newRgb = hslToRgb(newH, hsl.s, hsl.l);
        
        pixels[i]     = Math.round(lerp(r, newRgb.r, hueOpacity));
        pixels[i + 1] = Math.round(lerp(g, newRgb.g, hueOpacity));
        pixels[i + 2] = Math.round(lerp(b, newRgb.b, hueOpacity));
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h, s, l };
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ---- 戻す / やり直す ----

function captureSnapshot() {
    return {
        selectedParts: JSON.parse(JSON.stringify(state.selectedParts)),
        selectedColors: { ...state.selectedColors },
        customColors: JSON.parse(JSON.stringify(state.customColors)),
        colorGroupPresets: { ...state.colorGroupPresets },
        colorGroupCustom: JSON.parse(JSON.stringify(state.colorGroupCustom)),
        selectedSide: { ...state.selectedSide },
        unlockedCategories: [...state.unlockedCategories]
    };
}

function snapshotKey(snapshot) {
    const { unlockedCategories, ...rest } = snapshot;
    return JSON.stringify(rest);
}

/** 操作前のスナップショットと現在が違えば undo 側に積む */
function commitHistory(before) {
    if (!before) return;
    if (snapshotKey(before) === snapshotKey(captureSnapshot())) return;
    state.undoStack.push(before);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.redoStack = [];
    updateRandomBar();
}

function clearHistory() {
    state.undoStack = [];
    state.redoStack = [];
    updateRandomBar();
}

function restoreSnapshot(snapshot) {
    state.selectedParts = JSON.parse(JSON.stringify(snapshot.selectedParts));
    state.selectedColors = { ...snapshot.selectedColors };
    state.customColors = JSON.parse(JSON.stringify(snapshot.customColors));
    state.colorGroupPresets = { ...snapshot.colorGroupPresets };
    state.colorGroupCustom = JSON.parse(JSON.stringify(snapshot.colorGroupCustom));
    state.selectedSide = { ...snapshot.selectedSide };
    // スナップショット時点で表示中だった修飾カテゴリを自動選択で上書きしない
    state.previouslyUnlockedCategories = new Set(snapshot.unlockedCategories);
    processDependencies();
    state.colorSettingsPart = null;
    ensureCurrentCategoryVisible();
    renderCategories();
    renderParts();
    updatePreview();
    syncClockTick();
}

function undo() {
    if (state.undoStack.length === 0) return;
    state.redoStack.push(captureSnapshot());
    restoreSnapshot(state.undoStack.pop());
    renderDependencyFeed([{ kind: 'history', text: '1 つ前の状態に戻しました' }]);
    updateRandomBar();
}

function redo() {
    if (state.redoStack.length === 0) return;
    state.undoStack.push(captureSnapshot());
    restoreSnapshot(state.redoStack.pop());
    renderDependencyFeed([{ kind: 'history', text: '戻した操作をやり直しました' }]);
    updateRandomBar();
}

/** R: 全体ランダム / Ctrl+Z: 戻す / Ctrl+Y・Ctrl+Shift+Z: やり直す */
function handleShortcutKey(e) {
    const target = e.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;

    if (mod && !e.altKey && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
    } else if (mod && !e.altKey && !e.shiftKey && key === 'y') {
        e.preventDefault();
        redo();
    } else if (!mod && !e.altKey && !e.shiftKey && key === 'r' && !e.repeat) {
        e.preventDefault();
        randomizeAll();
    }
}

// ---- ランダム ----

function categorySignature(snapshot, category) {
    const ids = getSelectionIdList(snapshot.selectedParts[category.id], category);
    return JSON.stringify({
        ids,
        colors: ids.map(id => snapshot.selectedColors[id] || 'normal'),
        sides: ids.map(id => snapshot.selectedSide[id] || 'both'),
        group: category.colorGroup ? (snapshot.colorGroupPresets[category.colorGroup] || 'normal') : null
    });
}

function getSelectionIdList(selection, category) {
    if (!selection) return [];
    if (category && category.selectionMode === 'multiple') {
        return Array.isArray(selection) ? selection.slice() : [selection];
    }
    const id = Array.isArray(selection) ? selection[0] : selection;
    return id ? [id] : [];
}

function countChangedVisibleCategories(before, after) {
    return state.partsData.categories.filter(category => {
        if (!isCategoryVisible(category)) return false;
        return categorySignature(before, category) !== categorySignature(after, category);
    }).length;
}

function applyRandomResult(result, before) {
    state.selectedParts = result.selectedParts;
    state.previouslyUnlockedCategories = new Set(result.unlockedCategories);
    processDependencies();

    Object.entries(result.colorGroupPresets).forEach(([groupId, colorName]) => {
        setColorGroupPreset(groupId, colorName);
    });
    Object.entries(result.selectedColors).forEach(([partId, colorName]) => {
        state.selectedColors[partId] = colorName;
        delete state.customColors[partId];
    });
    Object.assign(state.selectedSide, result.selectedSide);
    syncColorStateAfterDependencyResolve();

    state.colorSettingsPart = null;
    ensureCurrentCategoryVisible();
    renderCategories();
    renderParts();
    updatePreview();
    syncClockTick();
    commitHistory(before);
    return countChangedVisibleCategories(before, captureSnapshot());
}

function runRandomize(targetCategoryIds, includeModifiers) {
    const R = window.CharamakeRandomize;
    if (!R || !state.partsData) return null;
    const before = captureSnapshot();
    const result = R.randomize({
        partsData: state.partsData,
        selectedParts: state.selectedParts,
        targetCategoryIds,
        includeModifiers,
        lockedCategoryIds: state.lockedCategories,
        unlockedSecrets: state.unlockedSecrets,
        previouslyUnlockedCategories: state.previouslyUnlockedCategories
    });
    return applyRandomResult(result, before);
}

function randomizeAll() {
    const R = window.CharamakeRandomize;
    if (!R || !state.partsData) return;
    const targets = R.getFullRandomTargets(state.partsData, state.lockedCategories, state.unlockedSecrets);
    const changed = runRandomize(targets, true);
    if (changed === null) return;
    const lockCount = state.lockedCategories.size;
    renderDependencyFeed([{
        kind: 'random',
        text: lockCount > 0
            ? `ランダム: ${changed} カテゴリを変更（固定 ${lockCount}）`
            : `完全ランダム: ${changed} カテゴリを変更`
    }]);
}

/** 表示中カテゴリ（と修飾）だけを引き直す。固定中でも実行する */
function randomizeCategory(categoryId, options = {}) {
    const changed = runRandomize([categoryId], options.includeModifiers !== false);
    if (changed === null) return;
    renderDependencyFeed([{
        kind: 'random',
        text: `「${getCategoryDisplayName(categoryId)}」をランダム: ${changed} カテゴリを変更`
    }]);
}

// ---- 固定（ロック） ----

function getDefaultLocks() {
    const R = window.CharamakeRandomize;
    return R ? R.RANDOM_CONFIG.defaultLocked : FALLBACK_DEFAULT_LOCKS;
}

function setLockedCategories(ids) {
    const valid = new Set(
        (state.partsData?.categories || []).filter(c => !c.hidden).map(c => c.id)
    );
    state.lockedCategories = new Set((ids || []).filter(id => valid.has(id)));
}

function loadLocksFromStorage() {
    try {
        const raw = window.localStorage.getItem(LOCKS_STORAGE_KEY);
        if (!raw) return null;
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : null;
    } catch (e) {
        return null;
    }
}

function saveLocksToStorage() {
    try {
        window.localStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify([...state.lockedCategories]));
    } catch (e) {
        // localStorage が使えない環境では保持しない
    }
}

function initializeLocks() {
    const stored = loadLocksFromStorage();
    setLockedCategories(stored || getDefaultLocks());
    updateRandomBar();
}

function onLocksChanged() {
    saveLocksToStorage();
    renderCategories();
    updateCategoryRandomButton();
    updateRandomBar();
}

function toggleCategoryLock(categoryId) {
    if (state.lockedCategories.has(categoryId)) {
        state.lockedCategories.delete(categoryId);
    } else {
        state.lockedCategories.add(categoryId);
    }
    onLocksChanged();
}

function getGroupLockableCategories(groupId) {
    if (!state.partsData) return [];
    return state.partsData.categories.filter(c => c.group === groupId && !c.hidden);
}

/** @returns {'on'|'off'|'mixed'} */
function getGroupLockState(groupId) {
    const cats = getGroupLockableCategories(groupId);
    const lockedCount = cats.filter(c => state.lockedCategories.has(c.id)).length;
    if (lockedCount === 0) return 'off';
    return lockedCount === cats.length ? 'on' : 'mixed';
}

function toggleGroupLock(groupId) {
    const cats = getGroupLockableCategories(groupId);
    const lockAll = getGroupLockState(groupId) !== 'on';
    cats.forEach(c => {
        if (lockAll) state.lockedCategories.add(c.id);
        else state.lockedCategories.delete(c.id);
    });
    onLocksChanged();
}

function clearAllLocks() {
    if (state.lockedCategories.size === 0) return;
    state.lockedCategories.clear();
    onLocksChanged();
}

function updateRandomBar() {
    const count = state.lockedCategories.size;
    if (elements.randomAllBtn) {
        elements.randomAllBtn.textContent = count === 0 ? '完全ランダム' : '全体ランダム';
        elements.randomAllBtn.title = (count === 0
            ? 'すべてのカテゴリをランダムにする'
            : `固定中の ${count} カテゴリ以外をランダムにする`) + '（R）';
        elements.randomAllBtn.disabled = !window.CharamakeRandomize;
    }
    if (elements.lockSummary) elements.lockSummary.textContent = `固定 ${count} 件`;
    if (elements.clearLocksBtn) elements.clearLocksBtn.disabled = count === 0;
    if (elements.undoBtn) elements.undoBtn.disabled = state.undoStack.length === 0;
    if (elements.redoBtn) elements.redoBtn.disabled = state.redoStack.length === 0;
}

/**
 * 複数選択カテゴリの 1 要素。左右・個別色が無ければ ID 文字列のまま。
 * colorGroup に属するカテゴリの色は colorGroups 側に保存されるので要素には付けない。
 */
function serializeMultiplePartEntry(partId, category) {
    const part = state.partsData.parts.find(p => p.id === partId);
    const entry = { id: partId };

    const side = state.selectedSide[partId];
    if (side && side !== 'both') entry.side = side;

    if (part && !category.colorGroup) {
        let colorSetting = getEffectiveColorPreset(part);
        if (colorSetting === 'custom' && !isCustomColorAllowed(part)) colorSetting = 'normal';
        if (colorSetting === 'custom') {
            const customData = state.customColors[partId] || {};
            Object.assign(entry, {
                color: 'custom',
                blend: customData.blend,
                colorValue: customData.color,
                opacity: customData.opacity,
                hueShift: customData.hueShift || 0,
                hueOpacity: customData.hueOpacity || 0
            });
        } else if (colorSetting && colorSetting !== 'normal') {
            entry.color = colorSetting;
        }
    }

    return Object.keys(entry).length === 1 ? partId : entry;
}

/** 読込した { id, side?, color?, ... } から左右と色を復元 */
function restorePartEntryExtras(partInfo) {
    if (partInfo.side) {
        state.selectedSide[partInfo.id] = partInfo.side;
    }

    if (partInfo.color === 'custom') {
        const loadedPart = state.partsData.parts.find(p => p.id === partInfo.id);
        if (loadedPart && isCustomColorAllowed(loadedPart)) {
            state.selectedColors[partInfo.id] = 'custom';
            state.customColors[partInfo.id] = {
                blend: partInfo.blend,
                color: partInfo.colorValue,
                opacity: partInfo.opacity,
                hueShift: partInfo.hueShift || 0,
                hueOpacity: partInfo.hueOpacity || 0
            };
        } else {
            state.selectedColors[partInfo.id] = 'normal';
        }
    } else if (partInfo.color) {
        state.selectedColors[partInfo.id] = partInfo.color;
    } else {
        state.selectedColors[partInfo.id] = 'normal';
    }
}

// キャラクター保存
function saveCharacter() {
    const characterData = {
        unlockedSecrets: [...state.unlockedSecrets],
        clockDisplayMode: state.clockDisplayMode || 'jst',
        locks: [...state.lockedCategories],
        character: {}
    };

    const colorGroupsOut = {};
    for (const [groupId, preset] of Object.entries(state.colorGroupPresets)) {
        if (!preset || preset === 'normal') continue;
        if (preset === 'custom') {
            const customData = state.colorGroupCustom[groupId] || {};
            colorGroupsOut[groupId] = {
                preset: 'custom',
                blend: customData.blend,
                colorValue: customData.color,
                opacity: customData.opacity,
                hueShift: customData.hueShift || 0,
                hueOpacity: customData.hueOpacity || 0
            };
        } else {
            colorGroupsOut[groupId] = { preset };
        }
    }
    if (Object.keys(colorGroupsOut).length > 0) {
        characterData.colorGroups = colorGroupsOut;
    }
    
    for (let [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        
        if (category && category.selectionMode === 'multiple') {
            const ids = Array.isArray(selection) ? selection : (selection ? [selection] : []);
            characterData.character[categoryId] = ids.map(partId => serializeMultiplePartEntry(partId, category));
        } else {
            const part = state.partsData.parts.find(p => p.id === selection);
            let colorSetting = part ? getEffectiveColorPreset(part) : (state.selectedColors[selection] || 'normal');
            if (colorSetting === 'custom' && part && !isCustomColorAllowed(part)) {
                colorSetting = 'normal';
            }
            
            const sideValue = state.selectedSide[selection];
            const hasSide = sideValue && sideValue !== 'both';
            
            if (colorSetting && colorSetting !== 'normal') {
                if (colorSetting === 'custom') {
                    const groupId = part ? getColorGroupIdForPart(part) : null;
                    const customData = (groupId && state.colorGroupCustom[groupId])
                        ? state.colorGroupCustom[groupId]
                        : (state.customColors[selection] || {});
                    characterData.character[categoryId] = {
                        id: selection,
                        color: 'custom',
                        blend: customData.blend,
                        colorValue: customData.color,
                        opacity: customData.opacity,
                        hueShift: customData.hueShift || 0,
                        hueOpacity: customData.hueOpacity || 0,
                        ...(hasSide && { side: sideValue })
                    };
                } else {
                    characterData.character[categoryId] = {
                        id: selection,
                        color: colorSetting,
                        ...(hasSide && { side: sideValue })
                    };
                }
            } else if (hasSide) {
                characterData.character[categoryId] = {
                    id: selection,
                    side: sideValue
                };
            } else {
                characterData.character[categoryId] = selection;
            }
        }
    }
    
    const json = JSON.stringify(characterData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character.json';
    a.click();
    URL.revokeObjectURL(url);
}

// キャラクター読込
function loadCharacter() {
    elements.characterFileInput.click();
}

function handleCharacterFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            state.unlockedSecrets = new Set(
                Array.isArray(data.unlockedSecrets) ? data.unlockedSecrets.filter(id => id) : []
            );
            state.previouslyUnlockedSecrets = new Set();

            const mode = data.clockDisplayMode;
            if (mode && CLOCK_DISPLAY_MODES.some(m => m.id === mode)) {
                state.clockDisplayMode = mode;
            } else {
                state.clockDisplayMode = 'jst';
            }

            // パーツ選択を復元
            state.selectedParts = {};
            state.selectedColors = {};
            state.customColors = {};
            state.colorGroupPresets = {};
            state.colorGroupCustom = {};
            state.selectedSide = {};
            
            const charData = data.character || {};
            for (let [categoryId, partInfo] of Object.entries(charData)) {
                const category = state.partsData.categories.find(c => c.id === categoryId);
                
                if (category && category.selectionMode === 'multiple') {
                    // 旧形式は ID 文字列の配列、新形式は要素に { id, side?, color? } も混在
                    const entries = Array.isArray(partInfo) ? partInfo : (partInfo ? [partInfo] : []);
                    state.selectedParts[categoryId] = entries
                        .map(entry => (typeof entry === 'string' ? entry : entry && entry.id))
                        .filter(Boolean);
                    entries.forEach(entry => {
                        if (entry && typeof entry === 'object' && entry.id) restorePartEntryExtras(entry);
                    });
                } else {
                    if (typeof partInfo === 'string') {
                        state.selectedParts[categoryId] = partInfo;
                        state.selectedColors[partInfo] = 'normal';
                    } else if (partInfo && partInfo.id) {
                        state.selectedParts[categoryId] = partInfo.id;
                        restorePartEntryExtras(partInfo);
                    }
                }
            }

            if (data.colorGroups) {
                applyLoadedColorGroups(data.colorGroups);
            } else {
                rebuildColorGroupsFromPartColors();
            }
            
            coerceAllDisallowedCustomColors();
            state.unlockedCategories = new Set();
            state.hiddenByParts = new Set();
            state.hiddenPartIds = new Set();
            resetDependencyFeedSnapshot();

            setLockedCategories(Array.isArray(data.locks) ? data.locks : getDefaultLocks());
            saveLocksToStorage();
            clearHistory();
            
            sanitizeSecretSelections();
            initializeDefaultSelections(true);
            processDependencies();
            processSecretUnlocks();
            processDependencies();
            ensureCurrentCategoryVisible();
            renderCategories();
            renderParts();
            updatePartSettingsPanel();
            updatePreview();
            syncClockTick();
            
            alert('キャラクターを読み込みました');
        } catch (error) {
            alert('キャラクターの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// PNG出力
function exportPng() {
    updatePreview();
    previewDrawPromise.then(() => {
        const canvas = elements.previewCanvas;
        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'character.png';
            a.click();
            URL.revokeObjectURL(url);
        });
    });
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', init);