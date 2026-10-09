// 戻す / やり直す・ランダム・固定（ロック）

const HISTORY_LIMIT = 20;
const LOCKS_STORAGE_KEY = 'charamake.lockedCategories';
const COLOR_LOCKS_STORAGE_KEY = 'charamake.lockedColorGroups';
const FALLBACK_DEFAULT_LOCKS = ['frame', 'background', 'basehair'];

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
    (result.targetCategoryIds || []).forEach(syncMultiSelectActive);

    state.colorSettingsPart = null;
    ensureCurrentCategoryVisible();
    renderCategories();
    renderParts();
    updatePreview();
    syncClockTick();
    commitHistory(before);
    return countChangedVisibleCategories(before, captureSnapshot());
}

function runRandomize(targetCategoryIds, includeModifiers, ignoreEmptyRate = false) {
    const R = window.CharamakeRandomize;
    if (!R || !state.partsData) return null;
    const before = captureSnapshot();
    const result = R.randomize({
        partsData: state.partsData,
        selectedParts: state.selectedParts,
        targetCategoryIds,
        includeModifiers,
        ignoreEmptyRate,
        lockedCategoryIds: state.lockedCategories,
        lockedColorGroups: state.lockedColorGroups,
        unlockedSecrets: state.unlockedSecrets,
        previouslyUnlockedCategories: state.previouslyUnlockedCategories,
        currentColors: {
            colorGroupPresets: state.colorGroupPresets,
            selectedColors: state.selectedColors
        }
    });
    return applyRandomResult(result, before);
}

function randomizeAll() {
    const R = window.CharamakeRandomize;
    if (!R || !state.partsData) return;
    const targets = R.getFullRandomTargets(state.partsData, state.lockedCategories, state.unlockedSecrets);
    const changed = runRandomize(targets, true);
    if (changed === null) return;
    const lockText = formatLockCounts();
    renderDependencyFeed([{
        kind: 'random',
        text: lockText
            ? `ランダム: ${changed} カテゴリを変更（${lockText}）`
            : `完全ランダム: ${changed} カテゴリを変更`
    }]);
}

/** 表示中カテゴリ（と修飾）だけを引き直す。固定中でも実行し、emptyRate は使わない（min/max は効く） */
function randomizeCategory(categoryId, options = {}) {
    const changed = runRandomize([categoryId], options.includeModifiers !== false, true);
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

function getColorGroupIds() {
    return new Set((state.partsData?.categories || []).map(c => c.colorGroup).filter(Boolean));
}

function getColorGroupDisplayName(groupId) {
    const names = window.CharamakeRandomize?.RANDOM_CONFIG.colorGroupNames || {};
    return names[groupId] || groupId;
}

function setLockedColorGroups(ids) {
    const valid = getColorGroupIds();
    state.lockedColorGroups = new Set((ids || []).filter(id => valid.has(id)));
}

function loadColorLocksFromStorage() {
    try {
        const arr = JSON.parse(window.localStorage.getItem(COLOR_LOCKS_STORAGE_KEY) || 'null');
        return Array.isArray(arr) ? arr : null;
    } catch (e) {
        return null;
    }
}

function saveColorLocksToStorage() {
    try {
        window.localStorage.setItem(COLOR_LOCKS_STORAGE_KEY, JSON.stringify([...state.lockedColorGroups]));
    } catch (e) {
        // localStorage が使えない環境では保持しない
    }
}

function initializeLocks() {
    const stored = loadLocksFromStorage();
    setLockedCategories(stored || getDefaultLocks());
    setLockedColorGroups(loadColorLocksFromStorage() || []);
    updateRandomBar();
}

function onLocksChanged() {
    saveLocksToStorage();
    saveColorLocksToStorage();
    renderCategories();
    updateCategoryRandomButton();
    updatePartSettingsPanel();
    updateRandomBar();
}

function toggleColorGroupLock(groupId) {
    if (state.lockedColorGroups.has(groupId)) {
        state.lockedColorGroups.delete(groupId);
    } else {
        state.lockedColorGroups.add(groupId);
    }
    onLocksChanged();
}

/** 「固定 3・色固定 1」のような要約。どちらも 0 件なら空文字 */
function formatLockCounts() {
    const parts = [];
    if (state.lockedCategories.size > 0) parts.push(`固定 ${state.lockedCategories.size}`);
    if (state.lockedColorGroups.size > 0) parts.push(`色固定 ${state.lockedColorGroups.size}`);
    return parts.join('・');
}

function createColorLockToggle(groupId) {
    const locked = state.lockedColorGroups.has(groupId);
    const name = getColorGroupDisplayName(groupId);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'colorLockToggle';
    btn.className = 'color-lock-toggle' + (locked ? ' is-locked' : '');
    btn.setAttribute('aria-pressed', locked ? 'true' : 'false');
    btn.title = locked
        ? `「${name}」の色の固定を外す`
        : `「${name}」の色を固定する（ランダムで色を変えない）`;
    btn.innerHTML = (locked ? LOCK_ICON_CLOSED : LOCK_ICON_OPEN)
        + `<span>${locked ? `${name}の色を固定中` : `${name}の色を固定`}</span>`;
    btn.addEventListener('click', () => toggleColorGroupLock(groupId));
    return btn;
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
    if (state.lockedCategories.size === 0 && state.lockedColorGroups.size === 0) return;
    state.lockedCategories.clear();
    state.lockedColorGroups.clear();
    onLocksChanged();
}

function updateRandomBar() {
    const count = state.lockedCategories.size;
    const colorCount = state.lockedColorGroups.size;
    if (elements.randomAllBtn) {
        elements.randomAllBtn.textContent = count === 0 && colorCount === 0 ? '完全ランダム' : '全体ランダム';
        const scope = count === 0
            ? 'すべてのカテゴリをランダムにする'
            : `固定中の ${count} カテゴリ以外をランダムにする`;
        const colorNote = colorCount > 0
            ? `。${[...state.lockedColorGroups].map(getColorGroupDisplayName).join('・')}の色は変えない`
            : '';
        elements.randomAllBtn.title = scope + colorNote + '（R）';
        elements.randomAllBtn.disabled = !window.CharamakeRandomize;
    }
    if (elements.lockSummary) {
        elements.lockSummary.textContent = colorCount > 0
            ? `固定 ${count} 件・色 ${colorCount}`
            : `固定 ${count} 件`;
    }
    if (elements.clearLocksBtn) elements.clearLocksBtn.disabled = count === 0 && colorCount === 0;
    if (elements.undoBtn) elements.undoBtn.disabled = state.undoStack.length === 0;
    if (elements.redoBtn) elements.redoBtn.disabled = state.redoStack.length === 0;
}
