/**
 * シークレット解放 — 共有ロジック
 * SPEC-secrets.md に準拠
 */
(function (global) {
    'use strict';

    function trimStr(s) {
        return s != null ? String(s).trim() : '';
    }

    function getSecrets(meta) {
        if (!meta || !Array.isArray(meta.secrets)) return [];
        return meta.secrets;
    }

    function getSecretIdSet(meta) {
        return new Set(getSecrets(meta).map(s => s.id).filter(Boolean));
    }

    /**
     * @param {string} plain
     * @returns {Promise<string>} lowercase hex SHA-256
     */
    async function hashPassword(plain) {
        const text = trimStr(plain);
        if (!text) return '';
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * @param {string} plain
     * @param {string} passwordHash
     * @returns {Promise<boolean>}
     */
    async function verifyPassword(plain, passwordHash) {
        const expected = trimStr(passwordHash).toLowerCase();
        if (!expected) return false;
        const actual = await hashPassword(plain);
        return actual === expected;
    }

    /**
     * @param {object} meta
     * @param {string} plain
     * @returns {Promise<string|null>} matching secret id
     */
    async function findSecretByPassword(meta, plain) {
        const secrets = getSecrets(meta);
        for (let i = 0; i < secrets.length; i++) {
            const s = secrets[i];
            if (!s || !s.id || !s.passwordHash) continue;
            if (await verifyPassword(plain, s.passwordHash)) {
                return s.id;
            }
        }
        return null;
    }

    /**
     * @param {string|null|undefined} secretId
     * @param {Set<string>} unlockedSet
     */
    function isSecretUnlocked(secretId, unlockedSet) {
        const id = trimStr(secretId);
        if (!id) return true;
        return unlockedSet && unlockedSet.has(id);
    }

    function validateSecretData(data) {
        const warnings = [];
        if (!data) return warnings;

        const validIds = getSecretIdSet(data.meta || {});
        const referenced = new Set();

        (data.categories || []).forEach(cat => {
            const sid = trimStr(cat.secret);
            if (!sid) return;
            referenced.add(sid);
            if (validIds.size > 0 && !validIds.has(sid)) {
                warnings.push(`カテゴリ「${cat.name || cat.id}」: 未知の secret「${sid}」`);
            }
        });

        (data.parts || []).forEach(part => {
            const sid = trimStr(part.secret);
            if (!sid) return;
            referenced.add(sid);
            if (validIds.size > 0 && !validIds.has(sid)) {
                warnings.push(`パーツ「${part.name || part.id}」: 未知の secret「${sid}」`);
            }
        });

        getSecrets(data.meta).forEach(s => {
            if (!trimStr(s.passwordHash)) {
                warnings.push(`シークレット「${s.id}」: passwordHash が未設定です`);
            }
            if (!referenced.has(s.id)) {
                warnings.push(`未使用のシークレット「${s.id}」（${s.name || s.id}）`);
            }
        });

        return warnings;
    }

    const api = {
        hashPassword,
        verifyPassword,
        findSecretByPassword,
        getSecrets,
        getSecretIdSet,
        isSecretUnlocked,
        validateSecretData
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.CharamakeSecrets = api;
    }
})(typeof window !== 'undefined' ? window : global);
