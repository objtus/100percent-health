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
    lockedColorGroups: new Set(), // ランダムで色を変えない colorGroup（カテゴリランダムでも守る）
    undoStack: [],
    redoStack: []
};

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
        syncMultiSelectActive(next.id);
        return true;
    }
    return false;
}

function getHostPartForSettings() {
    if (!state.currentCategory || !state.partsData) return null;
    const category = state.partsData.categories.find(c => c.id === state.currentCategory);
    if (!category || category.hidden) return null;

    if (category.selectionMode === 'multiple') {
        const raw = state.selectedParts[state.currentCategory];
        const selectedIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        // クリックしたパーツが選択中ならそれを、なければ選択中の先頭パーツ（ランダム直後・カテゴリ切替直後）
        const id = selectedIds.includes(state.colorSettingsPart)
            ? state.colorSettingsPart
            : selectedIds[0];
        if (!id) return null;
        return state.partsData.parts.find(p => p.id === id && p.category === state.currentCategory) || null;
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

// 複数選択カテゴリで 2 つ以上選ばれていれば「複数選択」モードを有効にする
function syncMultiSelectActive(categoryId) {
    const category = state.partsData && state.partsData.categories.find(c => c.id === categoryId);
    if (!category || category.selectionMode !== 'multiple') return;
    const selection = state.selectedParts[categoryId];
    state.multiSelectActive[categoryId] = Array.isArray(selection) && selection.length > 1;
}

// カテゴリ選択
function selectCategory(categoryId) {
    state.currentCategory = categoryId;
    state.colorSettingsPart = null; // カテゴリ切り替え時は色設定フォーカスをリセット
    // カテゴリ切り替え時は複数選択モードを選択数に合わせる
    syncMultiSelectActive(categoryId);
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
    const hostPart = isMultipleCapable ? getHostPartForSettings() : null;
    const isColorFocused = !!hostPart && hostPart.id === part.id;
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
        const existingColorLock = document.getElementById('colorLockToggle');
        if (existingColorLock) existingColorLock.remove();
        updateAdvancedColorSettings(false);
    }

    renderModifierCategoryBlocks(modifierCategories);
    syncClockTick();
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', init);