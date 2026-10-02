/**
 * 依存関係（unlocks / hides）— 共有ロジック
 * SPEC-dependencies.md に準拠
 */
(function (global) {
    'use strict';

    const RESOLVE_MAX_ITERATIONS = 24;

    /**
     * hides / unlocks 配列の ID がカテゴリかパーツかを判定
     * @param {string} id
     * @param {{ categories?: object[], parts?: object[] }} partsData
     * @returns {'category'|'part'|'unknown'}
     */
    function classifyHideTargetId(id, partsData) {
        if (!id || !partsData) return 'unknown';
        const categories = partsData.categories || [];
        const parts = partsData.parts || [];
        if (categories.some(c => c.id === id)) return 'category';
        if (parts.some(p => p.id === id)) return 'part';
        return 'unknown';
    }

    /**
     * 選択中パーツから unlocks / hides の Set を集約
     * @param {string[]} selectedPartIds
     * @param {{ categories?: object[], parts?: object[] }} partsData
     * @returns {{
     *   unlockedCategories: Set<string>,
     *   hiddenCategoryIds: Set<string>,
     *   hiddenPartIds: Set<string>
     * }}
     */
    function collectDependencySets(selectedPartIds, partsData) {
        const unlockedCategories = new Set();
        const hiddenCategoryIds = new Set();
        const hiddenPartIds = new Set();

        if (!partsData || !partsData.parts) {
            return { unlockedCategories, hiddenCategoryIds, hiddenPartIds };
        }

        const partById = new Map(partsData.parts.map(p => [p.id, p]));

        selectedPartIds.forEach(partId => {
            const part = partById.get(partId);
            if (!part) return;
            if (part.unlocks) {
                part.unlocks.forEach(id => unlockedCategories.add(id));
            }
            if (part.hides) {
                part.hides.forEach(id => {
                    const kind = classifyHideTargetId(id, partsData);
                    if (kind === 'category') {
                        hiddenCategoryIds.add(id);
                    } else if (kind === 'part') {
                        hiddenPartIds.add(id);
                    }
                });
            }
        });

        unlockedCategories.forEach(id => {
            hiddenCategoryIds.delete(id);
            hiddenPartIds.delete(id);
        });

        return { unlockedCategories, hiddenCategoryIds, hiddenPartIds };
    }

    function cloneSelectedParts(selectedParts) {
        const out = {};
        if (!selectedParts) return out;
        for (const [key, val] of Object.entries(selectedParts)) {
            out[key] = Array.isArray(val) ? val.slice() : val;
        }
        return out;
    }

    function selectedPartsSignature(selected) {
        return JSON.stringify(selected);
    }

    /**
     * 依存関係を固定点まで解決（表示中の選択のみで unlocks/hides を計算）
     * @param {Record<string, string|string[]>} selectedParts
     * @param {{ categories?: object[], parts?: object[] }} partsData
     * @param {{
     *   unlockedSecrets?: Set<string>,
     *   previouslyUnlockedCategories?: Set<string>
     * }} ctx
     */
    function resolveSelection(selectedParts, partsData, ctx) {
        const unlockedSecrets = ctx?.unlockedSecrets || new Set();
        const previouslyUnlocked = ctx?.previouslyUnlockedCategories || new Set();

        const categories = partsData?.categories || [];
        const parts = partsData?.parts || [];
        const categoryById = new Map(categories.map(c => [c.id, c]));
        const partById = new Map(parts.map(p => [p.id, p]));

        const Secrets = global.CharamakeSecrets;
        const PartsOrder = global.CharamakePartsOrder;

        function isSecretUnlocked(secretId) {
            if (Secrets) return Secrets.isSecretUnlocked(secretId, unlockedSecrets);
            if (!secretId) return true;
            return unlockedSecrets.has(secretId);
        }

        function isPartVisible(part, hiddenPartIds) {
            if (!part) return false;
            if (part.secret && !isSecretUnlocked(part.secret)) return false;
            if (hiddenPartIds.has(part.id)) return false;
            return true;
        }

        function isCategoryVisible(category, hiddenByParts, hiddenPartIds, unlockedCategories) {
            if (!category) return false;
            if (hiddenByParts.has(category.id)) return false;
            if (category.hidden && !unlockedCategories.has(category.id)) return false;
            if (category.secret && !isSecretUnlocked(category.secret)) return false;
            return true;
        }

        function getSortedPartsInCategory(categoryId) {
            if (PartsOrder) return PartsOrder.getPartsInCategory(parts, categoryId);
            return parts
                .filter(p => p.category === categoryId)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        function getFirstVisiblePartInCategory(categoryId, hiddenPartIds) {
            const list = getSortedPartsInCategory(categoryId);
            for (const part of list) {
                if (isPartVisible(part, hiddenPartIds)) return part;
            }
            return null;
        }

        function enumerateVisibleSelectedPartIds(selected, hiddenByParts, hiddenPartIds, unlockedCategories) {
            const ids = [];
            for (const [categoryId, selection] of Object.entries(selected)) {
                const category = categoryById.get(categoryId);
                if (!isCategoryVisible(category, hiddenByParts, hiddenPartIds, unlockedCategories)) {
                    continue;
                }
                if (!selection) continue;
                if (category && category.selectionMode === 'multiple') {
                    const arr = Array.isArray(selection) ? selection : [selection];
                    arr.forEach(partId => {
                        const part = partById.get(partId);
                        if (isPartVisible(part, hiddenPartIds)) ids.push(partId);
                    });
                } else {
                    const partId = Array.isArray(selection) ? selection[0] : selection;
                    const part = partById.get(partId);
                    if (isPartVisible(part, hiddenPartIds)) ids.push(partId);
                }
            }
            return ids;
        }

        function sanitizeHiddenPartSelections(selected, hiddenByParts, hiddenPartIds, unlockedCategories) {
            let changed = false;
            categories.forEach(category => {
                if (!isCategoryVisible(category, hiddenByParts, hiddenPartIds, unlockedCategories)) {
                    return;
                }
                const selection = selected[category.id];
                if (!selection) return;

                if (category.selectionMode === 'multiple') {
                    const arr = Array.isArray(selection) ? selection : [selection];
                    if (arr.length === 0) return;
                    const filtered = arr.filter(partId => {
                        const part = partById.get(partId);
                        return isPartVisible(part, hiddenPartIds);
                    });
                    if (filtered.length !== arr.length) changed = true;
                    if (filtered.length > 0) {
                        selected[category.id] = filtered;
                    } else {
                        delete selected[category.id];
                        changed = true;
                    }
                    return;
                }

                const partId = Array.isArray(selection) ? selection[0] : selection;
                const part = partById.get(partId);
                if (!isPartVisible(part, hiddenPartIds)) {
                    const firstPart = getFirstVisiblePartInCategory(category.id, hiddenPartIds);
                    if (firstPart) {
                        selected[category.id] = firstPart.id;
                    } else {
                        delete selected[category.id];
                    }
                    changed = true;
                }
            });
            return changed;
        }

        function autoSelectNewlyUnlocked(selected, hiddenByParts, hiddenPartIds, unlockedCategories) {
            let changed = false;
            unlockedCategories.forEach(categoryId => {
                if (previouslyUnlocked.has(categoryId)) return;
                const category = categoryById.get(categoryId);
                if (!category) return;
                if (!isCategoryVisible(category, hiddenByParts, hiddenPartIds, unlockedCategories)) {
                    return;
                }
                const hasSelection = category.selectionMode === 'multiple'
                    ? (selected[categoryId] && selected[categoryId].length > 0)
                    : !!selected[categoryId];
                if (hasSelection) return;

                const firstPart = getFirstVisiblePartInCategory(categoryId, hiddenPartIds);
                if (!firstPart) return;

                if (category.selectionMode === 'multiple') {
                    selected[categoryId] = [firstPart.id];
                } else {
                    selected[categoryId] = firstPart.id;
                }
                changed = true;
            });
            return changed;
        }

        let selected = cloneSelectedParts(selectedParts);
        let hiddenByParts = new Set();
        let hiddenPartIds = new Set();
        let unlockedCategories = new Set();
        let prevSig = '';

        for (let i = 0; i < RESOLVE_MAX_ITERATIONS; i++) {
            const visibleIds = enumerateVisibleSelectedPartIds(
                selected, hiddenByParts, hiddenPartIds, unlockedCategories
            );
            const sets = collectDependencySets(visibleIds, partsData);
            unlockedCategories = sets.unlockedCategories;
            hiddenByParts = sets.hiddenCategoryIds;
            hiddenPartIds = sets.hiddenPartIds;

            let changed = false;
            changed = autoSelectNewlyUnlocked(selected, hiddenByParts, hiddenPartIds, unlockedCategories) || changed;
            changed = sanitizeHiddenPartSelections(selected, hiddenByParts, hiddenPartIds, unlockedCategories) || changed;

            const sig = selectedPartsSignature(selected)
                + '|' + [...unlockedCategories].sort().join(',')
                + '|' + [...hiddenByParts].sort().join(',')
                + '|' + [...hiddenPartIds].sort().join(',');

            if (!changed && sig === prevSig) break;
            prevSig = sig;
        }

        const finalVisibleIds = enumerateVisibleSelectedPartIds(
            selected, hiddenByParts, hiddenPartIds, unlockedCategories
        );
        const finalSets = collectDependencySets(finalVisibleIds, partsData);

        return {
            selectedParts: selected,
            unlockedCategories: finalSets.unlockedCategories,
            hiddenCategoryIds: finalSets.hiddenCategoryIds,
            hiddenPartIds: finalSets.hiddenPartIds
        };
    }

    const api = {
        classifyHideTargetId,
        collectDependencySets,
        resolveSelection
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.CharamakeDependencies = api;
    }
})(typeof window !== 'undefined' ? window : global);
