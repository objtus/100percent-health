/**
 * レイヤー画像パス解決（ポーズ + インナーグループ）— 共有ロジック
 * SPEC-pose-files.md / SPEC-inner-groups.md に準拠
 */
(function (global) {
    'use strict';

    const BODY_CATEGORY_ID = 'body';

    function trimPath(p) {
        return p && String(p).trim();
    }

    /**
     * 選択中パーツから active poseId を取得
     * @param {string[]} partIds
     * @param {object[]} parts
     * @param {string} [bodyCategoryId]
     * @returns {string|null}
     */
    function getActivePoseId(partIds, parts, bodyCategoryId) {
        const catId = bodyCategoryId || BODY_CATEGORY_ID;
        if (!partIds || !parts) return null;

        for (let i = 0; i < partIds.length; i++) {
            const part = parts.find(p => p.id === partIds[i]);
            if (!part || part.category !== catId) continue;
            const pid = trimPath(part.poseId);
            if (pid) return pid;
            return null;
        }
        return null;
    }

    /**
     * プロジェクト内の既知 poseId 一覧（エディタ UI 用）
     * @param {object[]} parts
     * @returns {string[]}
     */
    function collectKnownPoseIds(parts) {
        const set = new Set();
        if (!parts) return [];

        parts.forEach(part => {
            if (part.category === BODY_CATEGORY_ID) {
                const pid = trimPath(part.poseId);
                if (pid) set.add(pid);
            }
            (part.layers || []).forEach(layer => {
                if (layer.poseFiles && typeof layer.poseFiles === 'object') {
                    Object.keys(layer.poseFiles).forEach(k => {
                        if (k && trimPath(layer.poseFiles[k])) set.add(k);
                    });
                }
                if (layer.poseMaskedFiles && typeof layer.poseMaskedFiles === 'object') {
                    Object.keys(layer.poseMaskedFiles).forEach(k => {
                        if (k && trimPath(layer.poseMaskedFiles[k])) set.add(k);
                    });
                }
            });
        });

        return [...set].sort();
    }

    /**
     * 2段階解決: ポーズ → IG マスク
     * @param {object} layer
     * @param {{ poseId?: string|null, activeMaskGroups?: Set<string> }} ctx
     * @returns {string}
     */
    function resolveLayerFile(layer, ctx) {
        if (!layer || !layer.file) return layer?.file || '';

        const poseId = ctx && ctx.poseId ? trimPath(ctx.poseId) : null;
        const activeMaskGroups = (ctx && ctx.activeMaskGroups) || new Set();

        let path = layer.file;
        if (poseId && layer.poseFiles && typeof layer.poseFiles === 'object') {
            const pf = trimPath(layer.poseFiles[poseId]);
            if (pf) path = pf;
        }

        const ig = layer.innerGroup;
        if (!ig || !activeMaskGroups.has(ig)) return path;

        if (poseId && layer.poseMaskedFiles && typeof layer.poseMaskedFiles === 'object') {
            const pmf = trimPath(layer.poseMaskedFiles[poseId]);
            if (pmf) return pmf;
        }

        const masked = trimPath(layer.maskedFile);
        return masked || path;
    }

    function partLabel(part) {
        return part.name || part.id || '（無名パーツ）';
    }

    function collectBodyPoseIds(parts) {
        const set = new Set();
        (parts || []).forEach(part => {
            if (part.category === BODY_CATEGORY_ID) {
                const pid = trimPath(part.poseId);
                if (pid) set.add(pid);
            }
        });
        return set;
    }

    function validateLayerPoseFields(part, layer, index, bodyPoseIds, warnings) {
        const label = partLabel(part);
        const layerNo = index + 1;

        const hasPoseFiles = layer.poseFiles && typeof layer.poseFiles === 'object' &&
            Object.keys(layer.poseFiles).some(k => k && trimPath(layer.poseFiles[k]));
        const hasPoseMasked = layer.poseMaskedFiles && typeof layer.poseMaskedFiles === 'object' &&
            Object.keys(layer.poseMaskedFiles).some(k => k && trimPath(layer.poseMaskedFiles[k]));

        if (hasPoseMasked && !layer.innerGroup) {
            warnings.push(`${label}: レイヤー${layerNo} に poseMaskedFiles がありますが innerGroup がありません`);
        }

        const checkKeys = (obj, fieldName) => {
            if (!obj || typeof obj !== 'object') return;
            Object.keys(obj).forEach(key => {
                if (!key || !trimPath(obj[key])) return;
                if (bodyPoseIds.size > 0 && !bodyPoseIds.has(key)) {
                    warnings.push(`${label}: レイヤー${layerNo} の ${fieldName} キー「${key}」に対応する body.poseId がありません`);
                }
            });
        };

        checkKeys(layer.poseFiles, 'poseFiles');
        checkKeys(layer.poseMaskedFiles, 'poseMaskedFiles');

        if (hasPoseFiles || hasPoseMasked) {
            /* ok */
        }
    }

    /**
     * @param {object} data — { parts }
     * @returns {string[]}
     */
    function validatePoseData(data) {
        const warnings = [];
        if (!data || !data.parts) return warnings;

        const bodyPoseIds = collectBodyPoseIds(data.parts);

        data.parts.forEach(part => {
            if (part.category === BODY_CATEGORY_ID) {
                const pid = trimPath(part.poseId);
                if (pid && bodyPoseIds.has(pid)) {
                    const used = data.parts.some(p =>
                        (p.layers || []).some(l =>
                            (l.poseFiles && l.poseFiles[pid] && trimPath(l.poseFiles[pid])) ||
                            (l.poseMaskedFiles && l.poseMaskedFiles[pid] && trimPath(l.poseMaskedFiles[pid]))
                        )
                    );
                    if (!used) {
                        warnings.push(`${partLabel(part)}: poseId「${pid}」を参照する poseFiles / poseMaskedFiles がありません`);
                    }
                }
            }

            (part.layers || []).forEach((layer, index) => {
                validateLayerPoseFields(part, layer, index, bodyPoseIds, warnings);
            });
        });

        return warnings;
    }

    /**
     * @param {object} part
     * @param {object[]} allParts
     * @returns {string[]}
     */
    function validatePartPose(part, allParts) {
        const warnings = [];
        if (!part) return warnings;

        const bodyPoseIds = collectBodyPoseIds(allParts || []);
        (part.layers || []).forEach((layer, index) => {
            validateLayerPoseFields(part, layer, index, bodyPoseIds, warnings);
        });

        if (part.category === BODY_CATEGORY_ID) {
            const pid = trimPath(part.poseId);
            if (pid) {
                const used = (allParts || []).some(p =>
                    (p.layers || []).some(l =>
                        (l.poseFiles && l.poseFiles[pid] && trimPath(l.poseFiles[pid])) ||
                        (l.poseMaskedFiles && l.poseMaskedFiles[pid] && trimPath(l.poseMaskedFiles[pid]))
                    )
                );
                if (!used) {
                    warnings.push(`poseId「${pid}」を参照する poseFiles / poseMaskedFiles がありません`);
                }
            }
        }

        return warnings;
    }

    const api = {
        BODY_CATEGORY_ID,
        getActivePoseId,
        collectKnownPoseIds,
        resolveLayerFile,
        validatePoseData,
        validatePartPose
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.CharamakeLayerResolve = api;
    }
})(typeof window !== 'undefined' ? window : global);
