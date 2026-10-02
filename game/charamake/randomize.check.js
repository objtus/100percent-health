/**
 * ランダム生成の不変条件チェック（Node で実行）
 *   node game/charamake/randomize.check.js [回数]
 */
'use strict';

const path = require('path');

global.CharamakeSecrets = require('./secrets.js');
global.CharamakePartsOrder = require('./parts-order.js');
global.CharamakeDependencies = require('./dependencies.js');
const Dep = global.CharamakeDependencies;
const R = require('./randomize.js');

const partsData = require(path.join(__dirname, 'parts-data.json'));
global.CharamakePartsOrder.ensurePartOrders(partsData.parts);

const RUNS = Number(process.argv[2]) || 2000;
const categoryById = new Map(partsData.categories.map(c => [c.id, c]));
const partById = new Map(partsData.parts.map(p => [p.id, p]));
const allSecrets = new Set((partsData.meta?.secrets || []).map(s => s.id));
const listedIds = partsData.categories.filter(c => !c.hidden).map(c => c.id);

let seed = Number(process.argv[3]) || 12345;
function rng() {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const failures = [];
function fail(msg, ctx) {
    if (failures.length < 20) failures.push(`${msg}\n    ${JSON.stringify(ctx)}`);
    else failures.length++;
}

function idsOf(selection, category) {
    if (!selection) return [];
    if (category.selectionMode === 'multiple') return Array.isArray(selection) ? selection : [selection];
    return [Array.isArray(selection) ? selection[0] : selection];
}

function isCategoryVisible(category, sets, secrets) {
    if (sets.hiddenCategoryIds.has(category.id)) return false;
    if (category.hidden && !sets.unlockedCategories.has(category.id)) return false;
    if (category.secret && !secrets.has(category.secret)) return false;
    return true;
}

function initialSelection(secrets) {
    const selected = {};
    partsData.categories.forEach(c => {
        if (c.hidden) return;
        if (c.secret && !secrets.has(c.secret)) return;
        const first = global.CharamakePartsOrder.getPartsInCategory(partsData.parts, c.id)
            .find(p => !p.secret || secrets.has(p.secret));
        if (!first) return;
        selected[c.id] = c.selectionMode === 'multiple' ? [first.id] : first.id;
    });
    const res = Dep.resolveSelection(selected, partsData, { unlockedSecrets: secrets });
    return res;
}

const emptyStats = {};
function recordEmpty(categoryId, isEmpty) {
    const s = emptyStats[categoryId] || (emptyStats[categoryId] = { empty: 0, total: 0 });
    s.total++;
    if (isEmpty) s.empty++;
}

let state = null;
let secrets = new Set();

for (let run = 0; run < RUNS; run++) {
    if (run % 200 === 0) {
        secrets = run % 400 === 0 ? new Set() : new Set(allSecrets);
        state = initialSelection(secrets);
        state.colorGroupPresets = {};
    }

    const locked = new Set(R.RANDOM_CONFIG.defaultLocked);
    listedIds.forEach(id => {
        if (rng() < 0.15) locked.add(id);
    });

    const categoryMode = rng() < 0.25;
    let targetIds;
    if (categoryMode) {
        const visibleListed = listedIds.filter(id => isCategoryVisible(categoryById.get(id), state, secrets));
        targetIds = [visibleListed[Math.floor(rng() * visibleListed.length)]];
        locked.delete(targetIds[0]);
    } else {
        targetIds = R.getFullRandomTargets(partsData, locked, secrets);
    }

    const before = state.selectedParts;
    const result = R.randomize({
        partsData,
        selectedParts: before,
        targetCategoryIds: targetIds,
        lockedCategoryIds: locked,
        unlockedSecrets: secrets,
        previouslyUnlockedCategories: state.unlockedCategories,
        rng
    });
    const ctx = { run, categoryMode, targetIds: categoryMode ? targetIds : '(full)' };
    const targets = new Set(result.targetCategoryIds);

    // 1. もう一度 resolveSelection にかけても変わらない
    const again = Dep.resolveSelection(result.selectedParts, partsData, {
        unlockedSecrets: secrets,
        previouslyUnlockedCategories: result.unlockedCategories
    });
    if (JSON.stringify(again.selectedParts) !== JSON.stringify(result.selectedParts)) {
        fail('resolveSelection が安定していない', ctx);
    }

    partsData.categories.forEach(category => {
        if (!isCategoryVisible(category, result, secrets)) return;
        const ids = idsOf(result.selectedParts[category.id], category);

        // 2. 表示中カテゴリに hides 対象・未解放シークレットが無い
        ids.forEach(id => {
            const part = partById.get(id);
            if (!part) fail('存在しないパーツ', { ...ctx, id });
            else if (part.secret && !secrets.has(part.secret)) fail('未解放シークレットが選ばれた', { ...ctx, id });
            else if (result.hiddenPartIds.has(id)) fail('hides 対象のパーツが選ばれている', { ...ctx, id });
        });

        // 3. 複数選択の件数と「なし」
        if (targets.has(category.id) && category.selectionMode === 'multiple') {
            const cfg = R.getCategoryRandomConfig(category);
            const real = ids.filter(id => !R.isNonePart(partById.get(id)));
            const hasNone = ids.some(id => R.isNonePart(partById.get(id)));
            if (hasNone && real.length > 0) fail('「なし」と他パーツが同時に選ばれた', { ...ctx, category: category.id, ids });
            const available = partsData.parts.filter(p => p.category === category.id
                && !R.isNonePart(p)
                && (!p.secret || secrets.has(p.secret))
                && !result.hiddenPartIds.has(p.id));
            if (real.length > cfg.max) fail('max を超えた', { ...ctx, category: category.id, ids });
            if (real.length < Math.min(cfg.min, available.length)) {
                fail('min を下回った', { ...ctx, category: category.id, ids });
            }
            if (!categoryMode && cfg.min === 0) recordEmpty(category.id, real.length === 0);
        }
    });

    // 4. 固定したカテゴリのパーツ選択が変わらない
    locked.forEach(id => {
        if (targets.has(id)) return;
        if (JSON.stringify(before[id]) !== JSON.stringify(result.selectedParts[id])) {
            fail('固定カテゴリの選択が変わった', { ...ctx, category: id, before: before[id], after: result.selectedParts[id] });
        }
    });

    // 5. colorGroup の色は、グループ内の左一覧カテゴリがすべて固定（かつ対象外）のときは変えない
    const groups = new Set(partsData.categories.map(c => c.colorGroup).filter(Boolean));
    groups.forEach(groupId => {
        const listedInGroup = partsData.categories.filter(c => c.colorGroup === groupId && !c.hidden);
        const allLocked = listedInGroup.every(c => locked.has(c.id) && !targets.has(c.id));
        const changed = Object.prototype.hasOwnProperty.call(result.colorGroupPresets, groupId);
        if (allLocked && changed) fail('全固定のグループ色が変わった', { ...ctx, groupId });
        if (!categoryMode && !allLocked && !changed) fail('未固定を含むグループ色が抽選されていない', { ...ctx, groupId });
    });

    // 6. グループ所属パーツは個別色を持たない（グループで同期）
    Object.keys(result.selectedColors).forEach(partId => {
        const cat = categoryById.get(partById.get(partId).category);
        if (cat.colorGroup) fail('グループ所属パーツに個別色が付いた', { ...ctx, partId });
        const color = result.selectedColors[partId];
        const part = partById.get(partId);
        if (color !== 'normal' && !(part.colors && part.colors[color])) {
            fail('パーツに無い色が選ばれた', { ...ctx, partId, color });
        }
    });

    // 7. 左右は sided パーツだけ
    Object.entries(result.selectedSide).forEach(([partId, side]) => {
        const part = partById.get(partId);
        if (!part.layers.some(l => l.side)) fail('左右の無いパーツに side が付いた', { ...ctx, partId });
        if (!['both', 'left', 'right'].includes(side)) fail('不正な side', { ...ctx, partId, side });
    });

    state = {
        selectedParts: result.selectedParts,
        unlockedCategories: result.unlockedCategories,
        hiddenCategoryIds: result.hiddenCategoryIds,
        hiddenPartIds: result.hiddenPartIds
    };
}

// 8. emptyRate の実測値（±5%）
Object.entries(emptyStats).forEach(([categoryId, s]) => {
    const category = categoryById.get(categoryId);
    const cfg = R.getCategoryRandomConfig(category);
    const rate = s.empty / s.total;
    const line = `  ${categoryId}: 実測 ${(rate * 100).toFixed(1)}% / 設定 ${(cfg.emptyRate * 100).toFixed(0)}% (n=${s.total})`;
    // hides が絡むカテゴリは、固定保護や抽選し直しで比率が変わるので除外
    const hasHideInteraction = partsData.parts.some(p =>
        (p.category === categoryId && (p.hides || []).length > 0)
        || (p.hides || []).some(h => h === categoryId || partById.get(h)?.category === categoryId));
    if (s.total >= 200 && !hasHideInteraction && Math.abs(rate - cfg.emptyRate) > 0.05) {
        fail('emptyRate の実測値が設定値から 5% 以上ずれた', { categoryId, rate, expected: cfg.emptyRate });
    }
    console.log(line);
});

if (failures.length > 0) {
    console.error(`NG: ${failures.length} 件`);
    failures.forEach(f => console.error(' - ' + f));
    process.exit(1);
}
console.log(`OK: ${RUNS} 回`);
