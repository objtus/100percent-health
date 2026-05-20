/**
 * パーツ一覧の表示順（order）— 共有ロジック
 */
(function (global) {
    'use strict';

    const ORDER_STEP = 10;

    function partOrderValue(part) {
        const n = part && part.order;
        return typeof n === 'number' && !Number.isNaN(n) ? n : null;
    }

    function comparePartOrder(a, b) {
        const oa = partOrderValue(a);
        const ob = partOrderValue(b);
        const va = oa !== null ? oa : 0;
        const vb = ob !== null ? ob : 0;
        if (va !== vb) return va - vb;
        const ida = (a && a.id) || '';
        const idb = (b && b.id) || '';
        return ida.localeCompare(idb);
    }

    function sortPartsList(parts) {
        if (!parts || !parts.length) return [];
        return [...parts].sort(comparePartOrder);
    }

    function getPartsInCategory(parts, categoryId) {
        if (!parts || !categoryId) return [];
        return sortPartsList(parts.filter(p => p.category === categoryId));
    }

    function getFirstPartInCategory(parts, categoryId) {
        const sorted = getPartsInCategory(parts, categoryId);
        return sorted.length > 0 ? sorted[0] : null;
    }

    /** order 未設定のパーツに、カテゴリ内の配列出現順から order を付与 */
    function ensurePartOrders(parts) {
        if (!parts || !parts.length) return;

        const byCategory = new Map();
        parts.forEach((part, index) => {
            if (!part || !part.category) return;
            if (!byCategory.has(part.category)) {
                byCategory.set(part.category, []);
            }
            byCategory.get(part.category).push({ part, index });
        });

        byCategory.forEach(items => {
            let seq = ORDER_STEP;
            items.forEach(({ part }) => {
                if (partOrderValue(part) === null) {
                    part.order = seq;
                    seq += ORDER_STEP;
                }
            });
        });
    }

    function nextPartOrder(parts, categoryId) {
        const inCat = parts ? parts.filter(p => p.category === categoryId) : [];
        let max = 0;
        inCat.forEach(p => {
            const o = partOrderValue(p);
            if (o !== null && o > max) max = o;
        });
        return max + ORDER_STEP;
    }

    /**
     * DnD 後: orderedIds の順で category 内の order を再採番
     */
    function renumberPartsOrder(parts, categoryId, orderedIds) {
        if (!parts || !categoryId || !orderedIds || !orderedIds.length) return;

        let seq = ORDER_STEP;
        orderedIds.forEach(id => {
            const part = parts.find(p => p.id === id && p.category === categoryId);
            if (part) {
                part.order = seq;
                seq += ORDER_STEP;
            }
        });
    }

    /**
     * draggedId を targetId の直前に移動した ID 列を返し、order を更新
     */
    function movePartBefore(parts, categoryId, draggedId, targetId) {
        const sorted = getPartsInCategory(parts, categoryId);
        const ids = sorted.map(p => p.id);
        const from = ids.indexOf(draggedId);
        const to = ids.indexOf(targetId);
        if (from < 0 || to < 0 || from === to) return;

        ids.splice(from, 1);
        const newTo = ids.indexOf(targetId);
        ids.splice(newTo, 0, draggedId);
        renumberPartsOrder(parts, categoryId, ids);
    }

    const api = {
        ORDER_STEP,
        comparePartOrder,
        sortPartsList,
        getPartsInCategory,
        getFirstPartInCategory,
        ensurePartOrders,
        nextPartOrder,
        renumberPartsOrder,
        movePartBefore
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.CharamakePartsOrder = api;
    }
})(typeof window !== 'undefined' ? window : global);
