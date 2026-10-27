// P0: 現在の選択レイヤーを優先 preload / P2: アイドル時にカタログを段階的 preload

(function (global) {
    'use strict';

    const PRELOAD_CONCURRENCY = 5;
    const PRIORITY_CURRENT = 0;
    const PRIORITY_IDLE = 10;

    let catalogUrls = null;
    const preloadQueue = [];
    const preloadSeen = new Set();
    let preloadInFlight = 0;
    let preloadComposePaused = false;
    let preloadIdleScheduled = false;

    function trimPath(p) {
        return p && String(p).trim();
    }

    function addRasterUrl(set, path) {
        const s = trimPath(path);
        if (s) set.add(s);
    }

    function collectLayerRasterPaths(layer, set) {
        if (!layer) return;
        addRasterUrl(set, layer.file);
        addRasterUrl(set, layer.maskedFile);
        if (layer.poseFiles && typeof layer.poseFiles === 'object') {
            Object.values(layer.poseFiles).forEach(p => addRasterUrl(set, p));
        }
        if (layer.poseMaskedFiles && typeof layer.poseMaskedFiles === 'object') {
            Object.values(layer.poseMaskedFiles).forEach(p => addRasterUrl(set, p));
        }
    }

    function collectColorRasterPaths(colors, set) {
        if (!colors || typeof colors !== 'object') return;
        Object.values(colors).forEach(cs => {
            if (!cs || typeof cs !== 'object') return;
            addRasterUrl(set, cs.image);
            if (cs.images && typeof cs.images === 'object') {
                Object.values(cs.images).forEach(p => addRasterUrl(set, p));
            }
        });
    }

    function buildCatalogFromPartsData(partsData) {
        const set = new Set();
        if (!partsData || !partsData.parts) return [];
        partsData.parts.forEach(part => {
            (part.layers || []).forEach(layer => collectLayerRasterPaths(layer, set));
            collectColorRasterPaths(part.colors, set);
        });
        return [...set];
    }

    function isAlreadyWarm(src) {
        return typeof imageCache !== 'undefined' && imageCache[src];
    }

    function enqueueUrls(urls, priority) {
        let added = 0;
        urls.forEach(url => {
            const src = trimPath(url);
            if (!src || preloadSeen.has(src) || isAlreadyWarm(src)) return;
            preloadSeen.add(src);
            preloadQueue.push({ src, priority });
            added++;
        });
        if (added > 0) {
            preloadQueue.sort((a, b) => a.priority - b.priority);
        }
        return added;
    }

    function runPreloadSlot() {
        if (preloadComposePaused || preloadInFlight >= PRELOAD_CONCURRENCY) return false;
        while (preloadQueue.length > 0 && preloadInFlight < PRELOAD_CONCURRENCY) {
            const item = preloadQueue.shift();
            if (!item || isAlreadyWarm(item.src)) continue;
            preloadInFlight++;
            loadImage(item.src).finally(() => {
                preloadInFlight--;
                pumpImagePreload(false);
            });
        }
        return preloadInFlight > 0 || preloadQueue.length > 0;
    }

    function scheduleIdlePreloadPump() {
        if (preloadIdleScheduled || preloadComposePaused) return;
        preloadIdleScheduled = true;
        const start = () => {
            preloadIdleScheduled = false;
            pumpImagePreload(true);
        };
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(start, { timeout: 2500 });
        } else {
            setTimeout(start, 80);
        }
    }

    /** @param {boolean} preferIdle P2 はアイドル経由、P0 直後は即時スロットも試す */
    function pumpImagePreload(preferIdle) {
        const busy = runPreloadSlot();
        if (preloadQueue.length > 0 && !preloadComposePaused) {
            if (preferIdle && preloadInFlight >= PRELOAD_CONCURRENCY) {
                scheduleIdlePreloadPump();
            } else if (!preferIdle) {
                if (preloadInFlight >= PRELOAD_CONCURRENCY) scheduleIdlePreloadPump();
                else if (preloadQueue.length > 0) setTimeout(() => pumpImagePreload(false), 0);
            } else if (!busy) {
                scheduleIdlePreloadPump();
            }
        }
    }

    function warmCurrentSelection() {
        if (!state.partsData || typeof collectAllLayers !== 'function') return;
        const set = new Set();
        const layers = collectAllLayers();
        layers.forEach(layer => {
            addRasterUrl(set, layer.file);
            if (typeof colorPresetRasterPath === 'function') {
                addRasterUrl(set, colorPresetRasterPath(layer));
            }
        });
        if (enqueueUrls([...set], PRIORITY_CURRENT) > 0) {
            pumpImagePreload(false);
        }
    }

    function warmIdleCatalog() {
        if (!state.partsData) return;
        if (!catalogUrls) catalogUrls = buildCatalogFromPartsData(state.partsData);
        if (enqueueUrls(catalogUrls, PRIORITY_IDLE) > 0) {
            scheduleIdlePreloadPump();
        }
    }

    function resetCatalog() {
        catalogUrls = null;
        preloadQueue.length = 0;
        preloadSeen.clear();
    }

    function onPartsDataReady() {
        resetCatalog();
        warmCurrentSelection();
        warmIdleCatalog();
    }

    function setComposePaused(paused) {
        preloadComposePaused = !!paused;
        if (!preloadComposePaused && preloadQueue.length > 0) {
            scheduleIdlePreloadPump();
        }
    }

    global.CharamakeImagePreload = {
        onPartsDataReady,
        warmCurrentSelection,
        setComposePaused,
        resetCatalog
    };
})(window);
