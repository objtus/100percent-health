// 色: カラーグループ・プリセット・カスタム色・色設定 UI

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

    const existingColorLock = document.getElementById('colorLockToggle');
    if (existingColorLock) existingColorLock.remove();
    const colorGroupId = getColorGroupIdForPart(part);
    if (colorGroupId && part.colors && Object.keys(part.colors).length > 0) {
        elements.colorPresetSelector.after(createColorLockToggle(colorGroupId));
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
    
    const applyPart = getHostPartForSettings();
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
        state.customColors[applyPart.id] = customData;
        state.selectedColors[applyPart.id] = 'custom';
    }
    updatePreview();
}
