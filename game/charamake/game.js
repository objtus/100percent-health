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
    hiddenByParts: new Set() // hides により動的に非表示になっているカテゴリ
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
    characterFileInput: document.getElementById('characterFileInput')
};

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
            
            // キャンバスサイズを設定
            if (state.partsData.meta) {
                elements.previewCanvas.width = state.partsData.meta.canvasWidth || 800;
                elements.previewCanvas.height = state.partsData.meta.canvasHeight || 900;
            }
            
            // 各カテゴリの最初のパーツをデフォルト選択
            initializeDefaultSelections();
            
            // カテゴリ一覧を表示
            renderCategories();
            updatePreview();
        })
        .catch(error => {
            console.error('パーツデータの読み込みに失敗:', error);
            alert('parts-data.jsonの読み込みに失敗しました。\nエディタでJSONを作成し、このフォルダに配置してください。\n\nまたは「JSONを再読込」ボタンから手動で読み込むこともできます。');
        });
}

// 各カテゴリの最初のパーツをデフォルト選択
function initializeDefaultSelections() {
    if (!state.partsData) return;
    
    state.partsData.categories.forEach(category => {
        // hidden属性のないカテゴリのみ
        if (category.hidden) return;
        
        // そのカテゴリの最初のパーツを取得
        const firstPart = state.partsData.parts.find(p => p.category === category.id);
        
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
            
            // キャンバスサイズを設定
            if (state.partsData.meta) {
                elements.previewCanvas.width = state.partsData.meta.canvasWidth || 800;
                elements.previewCanvas.height = state.partsData.meta.canvasHeight || 900;
            }
            
            // カテゴリ一覧を表示
            renderCategories();
            
            // 初期選択状態をクリア
            state.selectedParts = {};
            state.selectedColors = {};
            
            updatePreview();
            
            alert('パーツデータを読み込みました');
        } catch (error) {
            alert('データの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// カテゴリが現在表示すべきかを判定
function isCategoryVisible(category) {
    // hides による動的非表示が最優先（ただし unlocks が勝つのは processDependencies で処理済み）
    if (state.hiddenByParts && state.hiddenByParts.has(category.id)) return false;
    // hidden: true のカテゴリはアンロックされていなければ非表示
    if (category.hidden && !isCategoryUnlocked(category.id)) return false;
    return true;
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
            if (!isCategoryVisible(category)) return;
            const div = createCategoryItem(category);
            elements.categoryList.appendChild(div);
        });
        
        // グループごとに表示
        groups.sort((a, b) => a.order - b.order).forEach(group => {
            const groupCategories = state.partsData.categories
                .filter(c => c.group === group.id)
                .sort((a, b) => a.order - b.order);
            
            const visibleCategories = groupCategories.filter(isCategoryVisible);
            
            if (visibleCategories.length > 0) {
                const groupDiv = createCategoryGroup(group, visibleCategories);
                elements.categoryList.appendChild(groupDiv);
            }
        });
    } else {
        const categories = [...state.partsData.categories].sort((a, b) => a.order - b.order);
        
        categories.forEach(category => {
            if (!isCategoryVisible(category)) return;
            
            const div = document.createElement('div');
            div.className = 'category-item';
            
            if (category.hidden && isCategoryUnlocked(category.id)) {
                div.classList.add('unlocked-category');
            }
            
            if (state.currentCategory === category.id) {
                div.classList.add('active');
            }
            
            const multiTag = category.selectionMode === 'multiple'
                ? '<span class="multi-badge">複数可</span>'
                : '';
            div.innerHTML = `${category.name}${multiTag}`;
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
    
    const multiTag = category.selectionMode === 'multiple'
        ? '<span class="multi-badge">複数可</span>'
        : '';
    div.innerHTML = `${category.name}${multiTag}`;
    div.addEventListener('click', () => selectCategory(category.id));
    return div;
}

// カテゴリグループを作成
function createCategoryGroup(group, categories) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'category-group';
    
    const header = document.createElement('div');
    header.className = 'category-group-header';
    header.innerHTML = `<span class="group-toggle">▼</span> ${group.name}`;
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCategoryGroup(group.id);
    });
    groupDiv.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'category-group-content';
    content.id = `category-group-${group.id}`;
    
    categories.forEach(category => {
        const div = createCategoryItem(category);
        div.classList.add('grouped-item'); // グループ内アイテム用のクラス
        content.appendChild(div);
    });
    
    groupDiv.appendChild(content);
    return groupDiv;
}

// カテゴリグループの折りたたみ切り替え
function toggleCategoryGroup(groupId) {
    const content = document.getElementById(`category-group-${groupId}`);
    const header = content.previousElementSibling;
    const toggle = header.querySelector('.group-toggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// カテゴリが解放されているかチェック
function isCategoryUnlocked(categoryId) {
    // 選択中のパーツのunlocksをチェック
    for (let partId of Object.values(state.selectedParts).flat()) {
        const part = state.partsData.parts.find(p => p.id === partId);
        if (part && part.unlocks && part.unlocks.includes(categoryId)) {
            return true;
        }
    }
    return false;
}

// カテゴリ選択
function selectCategory(categoryId) {
    state.currentCategory = categoryId;
    state.colorSettingsPart = null; // カテゴリ切り替え時は色設定フォーカスをリセット
    // カテゴリ切り替え時は複数選択モードをリセット
    state.multiSelectActive[categoryId] = false;
    renderCategories();
    renderParts();
    
    // 現在選択されているパーツの色設定UIを更新
    updateColorSettingsForCurrentCategory();
    
    // モバイル時はパーツタブに自動切り替え
    if (isMobile()) {
        switchTab('controls');
    }
}

// 現在のカテゴリで選択中のパーツの色設定を更新
function updateColorSettingsForCurrentCategory() {
    if (!state.currentCategory) {
        elements.colorSettings.style.display = 'none';
        return;
    }
    
    const category = state.partsData.categories.find(c => c.id === state.currentCategory);
    
    // 複数選択カテゴリは colorSettingsPart を参照
    if (category && category.selectionMode === 'multiple') {
        if (state.colorSettingsPart) {
            const part = state.partsData.parts.find(p => p.id === state.colorSettingsPart
                && p.category === state.currentCategory);
            if (part) {
                updateColorSettings(part);
                return;
            }
        }
        elements.colorSettings.style.display = 'none';
        return;
    }
    
    const selectedPartId = state.selectedParts[state.currentCategory];
    
    if (!selectedPartId) {
        elements.colorSettings.style.display = 'none';
        return;
    }
    
    const part = state.partsData.parts.find(p => p.id === selectedPartId);
    
    if (part) {
        updateColorSettings(part);
    } else {
        elements.colorSettings.style.display = 'none';
    }
}

// パーツ一覧の描画
function renderParts() {
    if (!state.currentCategory || !state.partsData) {
        elements.partsGrid.innerHTML = '<p class="placeholder">カテゴリを選択してください</p>';
        elements.currentCategoryName.textContent = 'パーツを選択';
        elements.colorSettings.style.display = 'none';
        return;
    }
    
    const category = state.partsData.categories.find(c => c.id === state.currentCategory);
    elements.currentCategoryName.textContent = category.name;
    
    const parts = state.partsData.parts.filter(p => p.category === state.currentCategory);
    
    if (parts.length === 0) {
        elements.partsGrid.innerHTML = '<p class="placeholder">パーツがありません</p>';
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
            state.selectedParts[state.currentCategory] = [];
            processDependencies();
            updatePreview();
            renderParts();
            renderCategories();
        });
        
        toolbar.appendChild(toggleBtn);
        toolbar.appendChild(resetBtn);
        elements.partsGrid.appendChild(toolbar);
    }
    
    parts.forEach(part => {
        const item = createPartItem(part, isMultipleCapable, isMultiActive);
        elements.partsGrid.appendChild(item);
    });
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
    
    // 選択状態を更新
    state.selectedParts[part.category] = partId;
    
    initPartColorState(part);
    state.colorSettingsPart = partId;
    
    // 依存関係処理
    processDependencies();
    
    // 色設定UIを更新
    updateColorSettings(part);
    
    // プレビュー更新
    updatePreview();
    
    // パーツ一覧を再描画
    renderParts();
    renderCategories();
}

// 複数可カテゴリでの単一選択（配列に1件だけ保持）
function selectPartInMultiCategory(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    
    const current = state.selectedParts[part.category] || [];
    if (current.length === 1 && current[0] === partId) {
        state.selectedParts[part.category] = [];
    } else {
        state.selectedParts[part.category] = [partId];
    }
    
    initPartColorState(part);
    state.colorSettingsPart = partId;
    
    processDependencies();
    updateColorSettings(part);
    updatePreview();
    renderParts();
    renderCategories();
}

// パーツ選択（複数選択トグル）
function togglePartSelection(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    
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
    state.colorSettingsPart = partId;
    
    processDependencies();
    updateColorSettings(part);
    updatePreview();
    renderParts();
    renderCategories();
}

// パーツの色状態を初期化（未設定の場合のみ）
function initPartColorState(part) {
    if (!state.selectedColors[part.id]) {
        state.selectedColors[part.id] = 'normal';
    }
    if (state.selectedColors[part.id] === 'custom') {
        const inherited = getGroupCustomColors(part.id);
        if (inherited) {
            state.customColors[part.id] = { ...inherited };
        }
    }
}

// 依存関係の処理
function processDependencies() {
    if (!state.partsData) return;
    
    // 選択中の全パーツIDを列挙するヘルパー
    function getSelectedPartIds() {
        const ids = [];
        for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
            const category = state.partsData.categories.find(c => c.id === categoryId);
            if (category && category.selectionMode === 'multiple') {
                ids.push(...selection);
            } else if (selection) {
                ids.push(selection);
            }
        }
        return ids;
    }
    
    // 1. 現在解放されているカテゴリ・非表示にすべきカテゴリを収集
    const unlockedCategories = new Set();
    const hiddenByParts = new Set(); // hides で動的に非表示になるカテゴリ
    
    getSelectedPartIds().forEach(partId => {
        const part = state.partsData.parts.find(p => p.id === partId);
        if (!part) return;
        if (part.unlocks) part.unlocks.forEach(id => unlockedCategories.add(id));
        if (part.hides)   part.hides.forEach(id => hiddenByParts.add(id));
    });
    
    // unlocks が hides より優先（両方に含まれる場合は表示する）
    hiddenByParts.forEach(id => {
        if (unlockedCategories.has(id)) hiddenByParts.delete(id);
    });
    
    // 2. 新しく解放されたカテゴリを検出して最初のパーツを自動選択
    //    ただし既に選択が保持されている場合はそのまま復元（何もしない）
    unlockedCategories.forEach(categoryId => {
        if (!state.previouslyUnlockedCategories.has(categoryId)) {
            const category = state.partsData.categories.find(c => c.id === categoryId);
            // 選択がすでにあれば（保持されていれば）自動選択しない
            const hasSelection = category && category.selectionMode === 'multiple'
                ? (state.selectedParts[categoryId] && state.selectedParts[categoryId].length > 0)
                : !!state.selectedParts[categoryId];
            if (category && !hasSelection) {
                const firstPart = state.partsData.parts.find(p => p.category === categoryId);
                if (firstPart) {
                    if (category.selectionMode === 'multiple') {
                        state.selectedParts[categoryId] = [firstPart.id];
                    } else {
                        state.selectedParts[categoryId] = firstPart.id;
                        state.selectedColors[firstPart.id] = 'normal';
                    }
                }
            }
        }
    });
    
    // 3. hidden: true のカテゴリで解放されていないものをデセレクト
    state.partsData.categories.forEach(category => {
        if (category.hidden && !unlockedCategories.has(category.id)) {
            deselectCategory(category);
        }
    });
    
    // 4. hides によって動的に非表示になるカテゴリをデセレクト
    hiddenByParts.forEach(categoryId => {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        if (category) deselectCategory(category);
    });
    
    // 5. 現在の状態を記録（次回の比較用）
    state.previouslyUnlockedCategories = unlockedCategories;
    state.hiddenByParts = hiddenByParts; // renderCategories で参照
}

// カテゴリを非表示にする（選択状態はそのまま保持）
// ※ selectedParts は削除しない。collectAllLayers でスキップすることで描画から除外する
function deselectCategory(category) {
    // 何もしない：選択状態を保持したまま renderCategories / collectAllLayers 側でスキップ
}

// 色設定UIの更新
function updateColorSettings(part) {
    elements.colorSettings.style.display = 'block';
    elements.colorPresetSelector.innerHTML = '';
    
    // side 指定レイヤーがあればサイドセレクターを表示
    if (hasSidedLayers(part)) {
        renderSideSelector(part);
    } else {
        const existing = document.getElementById('sideSelector');
        if (existing) existing.remove();
    }
    
    const currentColor = state.selectedColors[part.id] || 'normal';
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
    
    // 3. カスタム色ボタン（常に表示）
    const customBtn = document.createElement('button');
    customBtn.className = 'color-preset-btn';
    if (isCustom) {
        customBtn.classList.add('active');
    }
    customBtn.textContent = 'カスタム';
    customBtn.addEventListener('click', () => selectColorPreset(part.id, 'custom'));
    elements.colorPresetSelector.appendChild(customBtn);
    
    // カスタム色が選択されている場合のみ拡張設定を表示し、値を反映
    if (isCustom) {
        const customData = state.customColors[part.id] || { ...DEFAULT_CUSTOM_COLOR };
        loadCustomColorValues(customData);
        updateAdvancedColorSettings(true);
    } else {
        updateAdvancedColorSettings(false);
    }
}

// カスタムのデフォルト設定
const DEFAULT_CUSTOM_COLOR = { blend: 'multiply', color: '#000000', opacity: 1, hueShift: 0, hueOpacity: 0 };

// 色プリセット選択
function selectColorPreset(partId, colorName) {
    // customに切り替えるとき、UIとプレビューが常に同じ値を参照するよう customColors を確定させる
    if (colorName === 'custom') {
        const inherited = getGroupCustomColors(partId);
        // グループ引き継ぎ → 既存設定 → デフォルト の優先順で確定
        state.customColors[partId] = inherited
            ? { ...inherited }
            : (state.customColors[partId] ? { ...state.customColors[partId] } : { ...DEFAULT_CUSTOM_COLOR });
    }
    
    state.selectedColors[partId] = colorName;
    applyColorToGroup(partId, colorName);
    
    // 現在のパーツの色設定UIを更新
    const part = state.partsData.parts.find(p => p.id === partId);
    if (part) {
        updateColorSettings(part);
    }
    
    updatePreview();
}

// 同じカラーグループ内の他パーツのcustomColorsを取得（なければnull）
function getGroupCustomColors(partId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return null;
    
    const category = state.partsData.categories.find(c => c.id === part.category);
    if (!category || !category.colorGroup) return null;
    
    const colorGroup = category.colorGroup;
    
    // 同グループの他カテゴリの選択中パーツからcustomColorsを探す
    // multiple カテゴリは配列なので両方に対応
    for (const groupedCategory of state.partsData.categories) {
        if (groupedCategory.colorGroup !== colorGroup || groupedCategory.id === category.id) continue;
        const selection = state.selectedParts[groupedCategory.id];
        if (!selection) continue;
        const ids = Array.isArray(selection) ? selection : [selection];
        for (const id of ids) {
            if (state.customColors[id]) return state.customColors[id];
        }
    }
    return null;
}

// カラーグループへの色設定の連携適用
// colorName: 'normal' / プリセット名 / 'custom'
function applyColorToGroup(partId, colorName) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part) return;
    
    const category = state.partsData.categories.find(c => c.id === part.category);
    if (!category || !category.colorGroup) return;
    
    const colorGroup = category.colorGroup;
    
    // customの場合は自分のcustomColorsをコピーして連携
    const customData = colorName === 'custom' ? (state.customColors[partId] || null) : null;
    
    state.partsData.categories
        .filter(c => c.colorGroup === colorGroup && c.id !== category.id)
        .forEach(groupedCategory => {
            const selection = state.selectedParts[groupedCategory.id];
            if (!selection) return;
            
            // multiple カテゴリは配列、single は文字列 → 両方に対応
            const ids = Array.isArray(selection) ? selection : [selection];
            ids.forEach(selectedPartId => {
                const groupedPart = state.partsData.parts.find(p => p.id === selectedPartId);
                if (!groupedPart) return;
                
                if (colorName === 'custom') {
                    state.selectedColors[selectedPartId] = 'custom';
                    if (customData) {
                        state.customColors[selectedPartId] = { ...customData };
                    }
                } else if (colorName !== 'normal') {
                    // 同名プリセットがあれば適用、なければnormal
                    state.selectedColors[selectedPartId] = (groupedPart.colors && groupedPart.colors[colorName])
                        ? colorName : 'normal';
                } else {
                    state.selectedColors[selectedPartId] = 'normal';
                }
            });
        });
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
            state.selectedSide[part.id] = value;
            renderSideSelector(part);
            updatePreview();
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
    
    if (state.selectedColors[partId] !== 'custom') return;
    
    // customColorsにUI値を保存
    state.customColors[partId] = {
        blend: document.getElementById('customBlendMode').value,
        color: document.getElementById('customColor').value,
        opacity: parseFloat(document.getElementById('customOpacity').value),
        hueShift: parseFloat(document.getElementById('customHueShift').value) || 0,
        hueOpacity: parseFloat(document.getElementById('customHueOpacity').value) || 0
    };
    
    // グループ連携（customColorsのコピーを渡す）
    applyColorToGroup(partId, 'custom');
    updatePreview();
}

// プレビュー更新
function updatePreview() {
    const canvas = elements.previewCanvas;
    const ctx = canvas.getContext('2d');
    
    // キャンバスクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!state.partsData) return;
    
    // 全レイヤーを収集
    const layers = collectAllLayers();
    
    // zIndex順にソート
    layers.sort((a, b) => a.zIndex - b.zIndex);
    
    // 描画
    drawLayers(ctx, layers);
}

// 全レイヤーを収集
function collectAllLayers() {
    const layers = [];
    
    for (let [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        
        // 非表示カテゴリのパーツは描画しない（選択状態は保持）
        if (!isCategoryVisible(category)) continue;
        
        if (category && category.selectionMode === 'multiple') {
            selection.forEach(partId => {
                addPartLayers(partId, layers);
            });
        } else {
            addPartLayers(selection, layers);
        }
    }
    
    return layers;
}

// パーツが side 指定レイヤーを持つか確認
function hasSidedLayers(part) {
    return part.layers && part.layers.some(l => l.side === 'left' || l.side === 'right');
}

// パーツのレイヤーを追加（side フィルタリング込み）
function addPartLayers(partId, layers) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part || !part.layers) return;
    
    const colorSettings = getColorSettings(part);
    const selectedSide = state.selectedSide[partId] || 'both';
    
    part.layers.forEach(layer => {
        // side 指定がないレイヤーは常に描画
        // side 指定があるレイヤーは selectedSide が 'both' または一致する場合のみ描画
        if (layer.side && selectedSide !== 'both' && layer.side !== selectedSide) return;
        
        layers.push({
            file: layer.file,
            zIndex: layer.zIndex || part.zIndex,
            animated: layer.animated,
            blendMode: layer.blendMode,
            colorSettings: colorSettings,
            partId: part.id
        });
    });
}

// パーツの色設定を取得
function getColorSettings(part) {
    const selectedColor = state.selectedColors[part.id];
    
    // 1. 通常（色設定なし）
    if (!selectedColor || selectedColor === 'normal') {
        return null;
    }
    
    // 2. カスタム色
    if (selectedColor === 'custom') {
        return state.customColors[part.id] || null;
    }
    
    // 3. プリセット色
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

// レイヤーを描画（エディタと同じロジック）
function drawLayers(ctx, layers) {
    const validLayers = layers.filter(l => l.file);
    
    if (validLayers.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('パーツを選択してください', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // オフスクリーンキャンバスに描画し、完成後にメインへ転送してちらつきを防ぐ
    const offscreen = document.createElement('canvas');
    offscreen.width = ctx.canvas.width;
    offscreen.height = ctx.canvas.height;
    const offCtx = offscreen.getContext('2d');
    
    const sortedLayers = [...validLayers].sort((a, b) => a.zIndex - b.zIndex);
    
    Promise.all(sortedLayers.map(layer => loadImage(layer.file).then(img => ({ img, layer }))))
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

// キャラクター保存
function saveCharacter() {
    const characterData = {
        character: {}
    };
    
    for (let [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        
        if (category && category.selectionMode === 'multiple') {
            characterData.character[categoryId] = selection;
        } else {
            const colorSetting = state.selectedColors[selection];
            
            const sideValue = state.selectedSide[selection];
            const hasSide = sideValue && sideValue !== 'both';
            
            if (colorSetting && colorSetting !== 'normal') {
                if (colorSetting === 'custom') {
                    const customData = state.customColors[selection] || {};
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
            
            // パーツ選択を復元
            state.selectedParts = {};
            state.selectedColors = {};
            state.customColors = {};
            state.selectedSide = {};
            
            for (let [categoryId, partInfo] of Object.entries(data.character)) {
                const category = state.partsData.categories.find(c => c.id === categoryId);
                
                if (category && category.selectionMode === 'multiple') {
                    state.selectedParts[categoryId] = partInfo;
                } else {
                    if (typeof partInfo === 'string') {
                        state.selectedParts[categoryId] = partInfo;
                        state.selectedColors[partInfo] = 'normal';
                    } else {
                        state.selectedParts[categoryId] = partInfo.id;
                        
                        if (partInfo.side) {
                            state.selectedSide[partInfo.id] = partInfo.side;
                        }
                        
                        if (partInfo.color === 'custom') {
                            state.selectedColors[partInfo.id] = 'custom';
                            state.customColors[partInfo.id] = {
                                blend: partInfo.blend,
                                color: partInfo.colorValue,
                                opacity: partInfo.opacity,
                                hueShift: partInfo.hueShift || 0,
                                hueOpacity: partInfo.hueOpacity || 0
                            };
                        } else if (partInfo.color) {
                            state.selectedColors[partInfo.id] = partInfo.color;
                        } else {
                            state.selectedColors[partInfo.id] = 'normal';
                        }
                    }
                }
            }
            
            processDependencies();
            renderCategories();
            renderParts();
            updatePreview();
            
            alert('キャラクターを読み込みました');
        } catch (error) {
            alert('キャラクターの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// PNG出力
function exportPng() {
    const canvas = elements.previewCanvas;
    
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'character.png';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', init);