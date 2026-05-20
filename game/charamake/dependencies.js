/**
 * 依存関係（unlocks / hides）— 共有ロジック
 * SPEC-dependencies.md に準拠
 */
(function (global) {
    'use strict';

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

        // unlocks が hides より優先（同一 ID は非表示にしない）
        unlockedCategories.forEach(id => {
            hiddenCategoryIds.delete(id);
            hiddenPartIds.delete(id);
        });

        return { unlockedCategories, hiddenCategoryIds, hiddenPartIds };
    }

    const api = {
        classifyHideTargetId,
        collectDependencySets
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.CharamakeDependencies = api;
    }
})(typeof window !== 'undefined' ? window : global);
