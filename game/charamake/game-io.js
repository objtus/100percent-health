// 保存・読込・PNG 出力

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
        colorLocks: [...state.lockedColorGroups],
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
            setLockedColorGroups(Array.isArray(data.colorLocks) ? data.colorLocks : []);
            saveLocksToStorage();
            saveColorLocksToStorage();
            updateRandomBar();
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
