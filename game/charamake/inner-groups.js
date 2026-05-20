/**
 * インナーグループ（Inner Groups）— 共有ロジック
 * SPEC-inner-groups.md に準拠
 */
(function (global) {
    'use strict';

    function getInnerGroups(meta) {
        if (!meta || !Array.isArray(meta.innerGroups)) return [];
        return meta.innerGroups;
    }

    function getInnerGroupIdSet(meta) {
        return new Set(getInnerGroups(meta).map(g => g.id));
    }

    /**
     * 選択中パーツ ID から、マスク対象 IG の集合を算出（OR 集約）
     * @param {string[]} partIds
     * @param {object[]} parts
     * @returns {Set<string>}
     */
    function applyMaskGroupsFromPart(part, active) {
        if (!part || !part.masksInnerGroups || !Array.isArray(part.masksInnerGroups)) return;
        part.masksInnerGroups.forEach(igId => {
            if (igId) active.add(igId);
        });
    }

    function computeActiveMaskGroups(partIds, parts) {
        const active = new Set();
        if (!partIds || !parts) return active;

        partIds.forEach(partId => {
            const part = parts.find(p => p.id === partId);
            applyMaskGroupsFromPart(part, active);
        });

        return active;
    }

    /** パーツオブジェクトの配列から activeMaskGroups を算出（エディタの編集中データ向け） */
    function computeActiveMaskGroupsFromParts(partsList) {
        const active = new Set();
        if (!partsList) return active;
        partsList.forEach(part => applyMaskGroupsFromPart(part, active));
        return active;
    }

    /**
     * レイヤーの描画用ファイルパスを決定（§5.2、IG マスクのみ）
     * @deprecated ポーズ対応は layer-resolve.js の resolveLayerFile を使用
     * @param {object} layer
     * @param {Set<string>} activeMaskGroups
     * @returns {string}
     */
    function resolveLayerFile(layer, activeMaskGroups) {
        if (!layer || !layer.file) return layer?.file || '';

        const ig = layer.innerGroup;
        if (!ig) return layer.file;

        if (!activeMaskGroups || !activeMaskGroups.has(ig)) return layer.file;

        const masked = layer.maskedFile && String(layer.maskedFile).trim();
        return masked || layer.file;
    }

    /**
     * データ全体のインナーグループ関連バリデーション
     * @param {object} data — { meta, parts }
     * @returns {string[]}
     */
    function validateInnerGroupData(data) {
        const warnings = [];
        if (!data) return warnings;

        const validIds = getInnerGroupIdSet(data.meta || {});
        const referenced = new Set();

        (data.parts || []).forEach(part => {
            if (part.masksInnerGroups && Array.isArray(part.masksInnerGroups)) {
                if (part.masksInnerGroups.length === 0) {
                    warnings.push(`${partLabel(part)}: masksInnerGroups が空です`);
                }
                part.masksInnerGroups.forEach(igId => {
                    if (!igId) return;
                    referenced.add(igId);
                    if (validIds.size > 0 && !validIds.has(igId)) {
                        warnings.push(`${partLabel(part)}: 未知のインナーグループ「${igId}」（masksInnerGroups）`);
                    }
                });
            }

            (part.layers || []).forEach((layer, index) => {
                const masked = layer.maskedFile && String(layer.maskedFile).trim();
                const ig = layer.innerGroup;

                if (masked && !ig) {
                    warnings.push(`${partLabel(part)}: レイヤー${index + 1} に maskedFile がありますが innerGroup がありません`);
                }

                if (ig) {
                    referenced.add(ig);
                    if (validIds.size > 0 && !validIds.has(ig)) {
                        warnings.push(`${partLabel(part)}: レイヤー${index + 1} の未知のインナーグループ「${ig}」`);
                    }
                }
            });
        });

        getInnerGroups(data.meta).forEach(g => {
            if (!referenced.has(g.id)) {
                warnings.push(`未使用のインナーグループ「${g.id}」（${g.name || g.id}）`);
            }
        });

        return warnings;
    }

    /**
     * 単一パーツの IG 関連バリデーション
     * @param {object} part
     * @param {object} meta
     * @returns {string[]}
     */
    function validatePartInnerGroups(part, meta) {
        const warnings = [];
        if (!part) return warnings;

        const validIds = getInnerGroupIdSet(meta || {});

        if (part.masksInnerGroups && Array.isArray(part.masksInnerGroups)) {
            if (part.masksInnerGroups.length === 0) {
                warnings.push('masksInnerGroups が空です');
            }
            part.masksInnerGroups.forEach(igId => {
                if (igId && validIds.size > 0 && !validIds.has(igId)) {
                    warnings.push(`未知のインナーグループ「${igId}」（masksInnerGroups）`);
                }
            });
        }

        (part.layers || []).forEach((layer, index) => {
            const masked = layer.maskedFile && String(layer.maskedFile).trim();
            const ig = layer.innerGroup;

            if (masked && !ig) {
                warnings.push(`レイヤー${index + 1}: maskedFile がありますが innerGroup がありません`);
            }
            if (ig && validIds.size > 0 && !validIds.has(ig)) {
                warnings.push(`レイヤー${index + 1}: 未知のインナーグループ「${ig}」`);
            }
        });

        return warnings;
    }

    function partLabel(part) {
        return part.name || part.id || '（無名パーツ）';
    }

    const api = {
        getInnerGroups,
        getInnerGroupIdSet,
        computeActiveMaskGroups,
        computeActiveMaskGroupsFromParts,
        resolveLayerFile,
        validateInnerGroupData,
        validatePartInnerGroups
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.CharamakeInnerGroups = api;
    }
})(typeof window !== 'undefined' ? window : global);
