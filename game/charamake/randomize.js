/**
 * ランダム生成 — 共有ロジック（ブラウザ / Node 両対応の純関数）
 * 依存解決は CharamakeDependencies.resolveSelection に委ねる
 */
(function (global) {
    'use strict';

    const RANDOM_CONFIG = {
        defaultLocked: ['frame', 'background', 'basehair'],
        emptyRateDefault: 0.3,
        normalColorWeight: 2,
        sideWeights: { both: 2, left: 1, right: 1 },
        maxIterations: 8,
        multipleDefault: { min: 0, max: 1 },
        categories: {
            nose: { min: 1, max: 1 },
            'eye-highlight': { min: 1, max: 1 },
            sidehair: { min: 1, max: 1 },
            glasses: { min: 0, max: 1, emptyRate: 0.5 },
            'head-accessories': { min: 0, max: 1, emptyRate: 0.5 },
            'face-accessories': { min: 0, max: 1, emptyRate: 0.5 },
            socks: { min: 0, max: 1, emptyRate: 0.5 },
            blush: { min: 0, max: 1, emptyRate: 0.5 },
            ahoge: { min: 0, max: 1, emptyRate: 0.5 },
            bottoms: { min: 0, max: 1, emptyRate: 0.3 },
            tops2: { min: 0, max: 1, emptyRate: 0.3 },
            iris: { min: 0, max: 2, emptyRate: 0.4 }
        }
    };

    function getDependencies() {
        if (global.CharamakeDependencies) return global.CharamakeDependencies;
        if (typeof require === 'function') return require('./dependencies.js');
        return null;
    }

    function getPartsOrder() {
        return global.CharamakePartsOrder || null;
    }

    function isNonePart(part) {
        if (!part) return false;
        if (typeof part.isNone === 'boolean') return part.isNone;
        if (/(^|[-_])none($|[-_])/i.test(part.id || '')) return true;
        return (part.name || '').trim() === 'なし';
    }

    /** JSON の categories[].random と RANDOM_CONFIG を合成 */
    function getCategoryRandomConfig(category, config) {
        const cfg = config || RANDOM_CONFIG;
        const base = category && category.selectionMode === 'multiple'
            ? { ...cfg.multipleDefault }
            : {};
        const fromTable = (category && cfg.categories && cfg.categories[category.id]) || {};
        const fromData = (category && category.random && typeof category.random === 'object')
            ? category.random
            : {};
        const merged = { ...base, ...fromTable, ...fromData };
        if (typeof merged.emptyRate !== 'number') merged.emptyRate = cfg.emptyRateDefault;
        return merged;
    }

    function isSecretUnlocked(secretId, unlockedSecrets) {
        const S = global.CharamakeSecrets;
        if (S) return S.isSecretUnlocked(secretId, unlockedSecrets);
        const id = secretId != null ? String(secretId).trim() : '';
        if (!id) return true;
        return !!unlockedSecrets && unlockedSecrets.has(id);
    }

    function hasSidedLayers(part) {
        return !!(part && part.layers && part.layers.some(l => l.side === 'left' || l.side === 'right'));
    }

    function toIdList(selection, category) {
        if (!selection) return [];
        if (category && category.selectionMode === 'multiple') {
            return Array.isArray(selection) ? selection.slice() : [selection];
        }
        const id = Array.isArray(selection) ? selection[0] : selection;
        return id ? [id] : [];
    }

    function sameSelection(a, b) {
        const na = Array.isArray(a) ? a : (a ? [a] : []);
        const nb = Array.isArray(b) ? b : (b ? [b] : []);
        return na.length === nb.length && na.every((v, i) => v === nb[i]);
    }

    function choose(list, rng) {
        if (!list || list.length === 0) return undefined;
        return list[Math.floor(rng() * list.length) % list.length];
    }

    function chooseWeighted(entries, rng) {
        const valid = entries.filter(([, w]) => w > 0);
        const total = valid.reduce((sum, [, w]) => sum + w, 0);
        if (total <= 0) return undefined;
        let r = rng() * total;
        for (const [key, w] of valid) {
            r -= w;
            if (r < 0) return key;
        }
        return valid[valid.length - 1][0];
    }

    function sample(list, count, rng) {
        const pool = list.slice();
        const out = [];
        while (out.length < count && pool.length > 0) {
            const idx = Math.floor(rng() * pool.length) % pool.length;
            out.push(pool.splice(idx, 1)[0]);
        }
        return out;
    }

    function createIndex(partsData) {
        const categories = partsData.categories || [];
        const parts = partsData.parts || [];
        const categoryById = new Map(categories.map(c => [c.id, c]));
        const partById = new Map(parts.map(p => [p.id, p]));
        const PO = getPartsOrder();
        const sortedByCategory = new Map();
        categories.forEach(c => {
            const list = PO
                ? PO.getPartsInCategory(parts, c.id)
                : parts.filter(p => p.category === c.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            sortedByCategory.set(c.id, list);
        });
        return { categories, parts, categoryById, partById, sortedByCategory };
    }

    /** 修飾カテゴリ（hidden）ID → それを unlocks するパーツのカテゴリ ID 集合 */
    function buildModifierHosts(partsData) {
        const idx = createIndex(partsData);
        const hosts = new Map();
        idx.parts.forEach(part => {
            if (!part.unlocks) return;
            part.unlocks.forEach(id => {
                const cat = idx.categoryById.get(id);
                if (!cat || !cat.hidden) return;
                if (!hosts.has(id)) hosts.set(id, new Set());
                hosts.get(id).add(part.category);
            });
        });
        return hosts;
    }

    function isCategoryVisibleIn(category, sets, unlockedSecrets) {
        if (!category) return false;
        if (sets.hiddenCategoryIds.has(category.id)) return false;
        if (category.hidden && !sets.unlockedCategories.has(category.id)) return false;
        if (category.secret && !isSecretUnlocked(category.secret, unlockedSecrets)) return false;
        return true;
    }

    function isPartVisibleIn(part, sets, unlockedSecrets) {
        if (!part) return false;
        if (part.secret && !isSecretUnlocked(part.secret, unlockedSecrets)) return false;
        if (sets.hiddenPartIds.has(part.id)) return false;
        return true;
    }

    function visibleSelectedIds(idx, selectedParts, sets, unlockedSecrets, categoryFilter) {
        const ids = [];
        for (const [categoryId, selection] of Object.entries(selectedParts)) {
            const category = idx.categoryById.get(categoryId);
            if (!isCategoryVisibleIn(category, sets, unlockedSecrets)) continue;
            if (categoryFilter && !categoryFilter(categoryId)) continue;
            toIdList(selection, category).forEach(partId => {
                if (isPartVisibleIn(idx.partById.get(partId), sets, unlockedSecrets)) ids.push(partId);
            });
        }
        return ids;
    }

    /**
     * 全体ランダムの対象カテゴリ（左一覧に出るカテゴリのうち固定以外）
     * @returns {string[]}
     */
    function getFullRandomTargets(partsData, lockedCategoryIds, unlockedSecrets) {
        const locked = lockedCategoryIds || new Set();
        return (partsData.categories || [])
            .filter(c => !c.hidden && !locked.has(c.id))
            .filter(c => !c.secret || isSecretUnlocked(c.secret, unlockedSecrets))
            .map(c => c.id);
    }

    /** 対象カテゴリに、その修飾カテゴリを加えた集合 */
    function expandTargets(partsData, targetCategoryIds, includeModifiers) {
        const targets = new Set(targetCategoryIds || []);
        if (includeModifiers === false) return targets;
        const hosts = buildModifierHosts(partsData);
        hosts.forEach((hostSet, modId) => {
            for (const h of hostSet) {
                if (targets.has(h)) {
                    targets.add(modId);
                    break;
                }
            }
        });
        return targets;
    }

    /**
     * パーツ選択をランダムに決める
     * @param {{
     *   partsData: object,
     *   selectedParts: Record<string, string|string[]>,
     *   targetCategoryIds: string[],
     *   includeModifiers?: boolean,
     *   lockedCategoryIds?: Set<string>,
     *   unlockedSecrets?: Set<string>,
     *   previouslyUnlockedCategories?: Set<string>,
     *   rng?: () => number,
     *   config?: object
     * }} opts
     */
    function randomizeSelection(opts) {
        const Dep = getDependencies();
        const partsData = opts.partsData;
        const rng = opts.rng || Math.random;
        const config = opts.config || RANDOM_CONFIG;
        const unlockedSecrets = opts.unlockedSecrets || new Set();
        const prevUnlocked = opts.previouslyUnlockedCategories || new Set();
        const idx = createIndex(partsData);

        const targets = expandTargets(partsData, opts.targetCategoryIds, opts.includeModifiers);
        const locked = new Set([...(opts.lockedCategoryIds || [])].filter(id => !targets.has(id)));

        const hosts = buildModifierHosts(partsData);
        const protectedCategories = new Set(locked);
        hosts.forEach((hostSet, modId) => {
            if (targets.has(modId)) return;
            if ([...hostSet].every(h => locked.has(h))) protectedCategories.add(modId);
        });

        const resolvePrev = new Set([...prevUnlocked, ...targets]);
        const resolve = selected => Dep.resolveSelection(selected, partsData, {
            unlockedSecrets,
            previouslyUnlockedCategories: resolvePrev
        });

        let res = resolve(opts.selectedParts || {});

        // 固定カテゴリが今は非表示でも、再表示されたときに選択が消えないよう全選択を守る
        const protectedPartIds = new Set();
        protectedCategories.forEach(id => {
            toIdList(res.selectedParts[id], idx.categoryById.get(id)).forEach(pid => protectedPartIds.add(pid));
        });
        const fixedHidden = Dep.collectDependencySets(
            visibleSelectedIds(idx, res.selectedParts, res, unlockedSecrets, id => !targets.has(id)),
            partsData
        ).hiddenPartIds;

        const breaksLock = part => (part.hides || []).some(
            id => protectedCategories.has(id) || protectedPartIds.has(id)
        );

        function pickForCategory(category, hiddenPartIds) {
            const candidates = (idx.sortedByCategory.get(category.id) || []).filter(p =>
                (!p.secret || isSecretUnlocked(p.secret, unlockedSecrets))
                && !hiddenPartIds.has(p.id)
                && !breaksLock(p)
            );
            const nones = candidates.filter(isNonePart);
            const others = candidates.filter(p => !isNonePart(p));
            const cfg = getCategoryRandomConfig(category, config);

            if (category.selectionMode === 'multiple') {
                if (candidates.length === 0) return [];
                const min = Math.max(0, cfg.min | 0);
                const max = Math.max(min, Math.max(1, cfg.max | 0));
                const goEmpty = others.length === 0 || (min === 0 && rng() < cfg.emptyRate);
                if (goEmpty) {
                    const none = choose(nones, rng);
                    return none ? [none.id] : [];
                }
                const lo = Math.max(1, min);
                const hi = Math.min(max, others.length);
                const count = lo >= hi ? hi : lo + Math.floor(rng() * (hi - lo + 1));
                return sample(others, count, rng).map(p => p.id);
            }

            if (candidates.length === 0) return undefined;
            if (nones.length > 0 && others.length > 0) {
                return (rng() < cfg.emptyRate ? choose(nones, rng) : choose(others, rng)).id;
            }
            return choose(candidates, rng).id;
        }

        const orderedTargets = idx.categories
            .filter(c => targets.has(c.id))
            .sort((a, b) => (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0) || (a.order || 0) - (b.order || 0));

        const picked = new Map();
        let iterations = 0;
        let pendingResolve = false;

        while (iterations < config.maxIterations) {
            iterations++;
            let changed = false;
            const selected = res.selectedParts;
            orderedTargets.forEach(category => {
                if (!isCategoryVisibleIn(category, res, unlockedSecrets)) return;
                if (picked.has(category.id) && sameSelection(picked.get(category.id), selected[category.id])) return;
                const hiddenSet = picked.has(category.id) ? res.hiddenPartIds : fixedHidden;
                const pick = pickForCategory(category, hiddenSet);
                if (pick === undefined) {
                    picked.set(category.id, selected[category.id]);
                    return;
                }
                selected[category.id] = pick;
                picked.set(category.id, Array.isArray(pick) ? pick.slice() : pick);
                changed = true;
            });
            if (!changed) {
                pendingResolve = false;
                break;
            }
            res = resolve(selected);
            pendingResolve = true;
        }
        if (pendingResolve) res = resolve(res.selectedParts);

        return {
            selectedParts: res.selectedParts,
            unlockedCategories: res.unlockedCategories,
            hiddenCategoryIds: res.hiddenCategoryIds,
            hiddenPartIds: res.hiddenPartIds,
            targetCategoryIds: [...targets]
        };
    }

    function colorEntries(keys, config) {
        const entries = [['normal', config.normalColorWeight]];
        keys.forEach(k => {
            if (k !== 'normal') entries.push([k, 1]);
        });
        return entries;
    }

    /**
     * 色を抽選する（カスタム色は対象外）
     * colorGroup は対象カテゴリを 1 つでも含むときだけ 1 回抽選してグループで共有する
     * @returns {{ colorGroupPresets: Record<string,string>, selectedColors: Record<string,string> }}
     */
    function randomizeColors(opts) {
        const partsData = opts.partsData;
        const rng = opts.rng || Math.random;
        const config = opts.config || RANDOM_CONFIG;
        const unlockedSecrets = opts.unlockedSecrets || new Set();
        const sets = opts.dependencySets;
        const targets = new Set(opts.targetCategoryIds || []);
        const idx = createIndex(partsData);

        const colorGroupPresets = {};
        const selectedColors = {};

        const groupIds = new Set();
        idx.categories.forEach(c => {
            if (c.colorGroup && targets.has(c.id)) groupIds.add(c.colorGroup);
        });

        groupIds.forEach(groupId => {
            const keys = new Set();
            idx.categories.filter(c => c.colorGroup === groupId).forEach(category => {
                if (!isCategoryVisibleIn(category, sets, unlockedSecrets)) return;
                toIdList(opts.selectedParts[category.id], category).forEach(partId => {
                    const part = idx.partById.get(partId);
                    if (!isPartVisibleIn(part, sets, unlockedSecrets)) return;
                    Object.keys(part.colors || {}).forEach(k => keys.add(k));
                });
            });
            colorGroupPresets[groupId] = chooseWeighted(colorEntries([...keys], config), rng) || 'normal';
        });

        idx.categories.forEach(category => {
            if (!targets.has(category.id) || category.colorGroup) return;
            if (!isCategoryVisibleIn(category, sets, unlockedSecrets)) return;
            toIdList(opts.selectedParts[category.id], category).forEach(partId => {
                const part = idx.partById.get(partId);
                if (!isPartVisibleIn(part, sets, unlockedSecrets)) return;
                const keys = Object.keys(part.colors || {});
                selectedColors[partId] = keys.length > 0
                    ? (chooseWeighted(colorEntries(keys, config), rng) || 'normal')
                    : 'normal';
            });
        });

        return { colorGroupPresets, selectedColors };
    }

    /** 左右レイヤーを持つパーツの左右を抽選する */
    function randomizeSides(opts) {
        const partsData = opts.partsData;
        const rng = opts.rng || Math.random;
        const config = opts.config || RANDOM_CONFIG;
        const unlockedSecrets = opts.unlockedSecrets || new Set();
        const sets = opts.dependencySets;
        const targets = new Set(opts.targetCategoryIds || []);
        const idx = createIndex(partsData);
        const entries = Object.entries(config.sideWeights);

        const selectedSide = {};
        idx.categories.forEach(category => {
            if (!targets.has(category.id)) return;
            if (!isCategoryVisibleIn(category, sets, unlockedSecrets)) return;
            toIdList(opts.selectedParts[category.id], category).forEach(partId => {
                const part = idx.partById.get(partId);
                if (!hasSidedLayers(part)) return;
                selectedSide[partId] = chooseWeighted(entries, rng) || 'both';
            });
        });
        return { selectedSide };
    }

    /** パーツ・色・左右をまとめて抽選する */
    function randomize(opts) {
        const selection = randomizeSelection(opts);
        const common = {
            partsData: opts.partsData,
            selectedParts: selection.selectedParts,
            dependencySets: selection,
            targetCategoryIds: selection.targetCategoryIds,
            unlockedSecrets: opts.unlockedSecrets,
            rng: opts.rng,
            config: opts.config
        };
        const colors = randomizeColors(common);
        const sides = randomizeSides(common);
        return {
            ...selection,
            colorGroupPresets: colors.colorGroupPresets,
            selectedColors: colors.selectedColors,
            selectedSide: sides.selectedSide
        };
    }

    const api = {
        RANDOM_CONFIG,
        isNonePart,
        getCategoryRandomConfig,
        buildModifierHosts,
        getFullRandomTargets,
        expandTargets,
        randomizeSelection,
        randomizeColors,
        randomizeSides,
        randomize
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.CharamakeRandomize = api;
    }
})(typeof window !== 'undefined' ? window : global);
