// 描画: プレビュー・レイヤー合成・色相変換・日時オーバーレイ

let previewDrawPromise = Promise.resolve();
let clockTickInterval = null;

function clearPartSettingsExtensions() {
    if (elements.partSettingsExtensions) {
        elements.partSettingsExtensions.innerHTML = '';
    }
}

const PART_SETTINGS_OVERLAY_UI = {
    datetime: renderDatetimeOverlayControls
};

function renderPartSettingsExtensions(part) {
    clearPartSettingsExtensions();
    if (!part?.dynamicOverlay?.type) return false;
    const render = PART_SETTINGS_OVERLAY_UI[part.dynamicOverlay.type];
    if (!render || !elements.partSettingsExtensions) return false;
    render(elements.partSettingsExtensions, part);
    return true;
}

const CLOCK_DISPLAY_MODES = [
    { id: 'jst', label: 'JST (+09:00)' },
    { id: 'local', label: 'ローカル時刻' },
    { id: 'unix', label: 'Unix 時刻（秒）' },
    { id: 'both', label: 'JST と Unix 時刻（横並び）' }
];

function renderDatetimeOverlayControls(container, part) {
    const row = document.createElement('div');
    row.className = 'clock-mode-buttons';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', '時刻表示モード');

    const mode = state.clockDisplayMode || 'jst';
    CLOCK_DISPLAY_MODES.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-preset-btn clock-mode-btn';
        if (mode === id) btn.classList.add('active');
        btn.setAttribute('aria-label', label);
        btn.title = label;
        btn.textContent = id;
        btn.addEventListener('click', () => {
            state.clockDisplayMode = id;
            container.querySelectorAll('.clock-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updatePreview();
        });
        row.appendChild(btn);
    });
    container.appendChild(row);
}

function getSelectedDatetimeOverlayPart() {
    if (!state.partsData) return null;
    const ids = getVisibleSelectedPartIds();
    for (const id of ids) {
        const p = state.partsData.parts.find(x => x.id === id);
        if (p?.dynamicOverlay?.type === 'datetime') return p;
    }
    return null;
}

function hasActiveDatetimeOverlay() {
    return !!getSelectedDatetimeOverlayPart();
}

function syncClockTick() {
    if (clockTickInterval) {
        clearInterval(clockTickInterval);
        clockTickInterval = null;
    }
    if (hasActiveDatetimeOverlay()) {
        clockTickInterval = setInterval(() => updatePreview(), 1000);
    }
}

function formatDateTimeParts(date, timeZone) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    if (timeZone) {
        options.timeZone = timeZone;
    }
    const fmt = new Intl.DateTimeFormat('en-CA', options);
    const parts = fmt.formatToParts(date);
    const pick = type => parts.find(p => p.type === type)?.value || '00';
    return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

function formatDateTimeInZone(date, timeZone) {
    return formatDateTimeParts(date, timeZone);
}

function getLocalTimezoneOffsetString(date) {
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatJstClockLine(date) {
    return `${formatDateTimeInZone(date, 'Asia/Tokyo')} +09:00`;
}

function formatLocalClockLine(date) {
    return `${formatDateTimeParts(date, null)} ${getLocalTimezoneOffsetString(date)}`;
}

function formatUnixClockLine(date) {
    return (date.getTime() / 1000).toFixed(3);
}

function formatClockText(mode, date) {
    const m = mode || 'jst';
    if (m === 'unix') return formatUnixClockLine(date);
    if (m === 'local') return formatLocalClockLine(date);
    if (m === 'both') {
        return `${formatJstClockLine(date)}  ${formatUnixClockLine(date)}`;
    }
    return formatJstClockLine(date);
}

function getDatetimeOverlaySignature(part) {
    const raw = part?.dynamicOverlay?.signature;
    if (raw === undefined || raw === null) return '';
    return String(raw).trim();
}

const CLOCK_FONT_SIZE = 25;
const CLOCK_FONT_SPEC = `${CLOCK_FONT_SIZE}px saitamaar, PikoA, sans-serif`;
let clockFontReady = null;

function ensureClockFont() {
    if (!clockFontReady) {
        clockFontReady = document.fonts && document.fonts.load
            ? document.fonts.load(CLOCK_FONT_SPEC).catch(() => {})
            : Promise.resolve();
    }
    return clockFontReady;
}

// 同期描画。フォントは呼び出し側で ensureClockFont() を待っておくこと
function drawDynamicOverlays(ctx) {
    const part = getSelectedDatetimeOverlayPart();
    if (!part) return;

    const mode = state.clockDisplayMode || 'jst';
    const date = new Date();
    const marginX = 16;
    const marginY = 14;
    const lineStep = CLOCK_FONT_SIZE * 1.08;
    const signature = getDatetimeOverlaySignature(part);

    ctx.save();
    ctx.font = CLOCK_FONT_SPEC;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const rightX = ctx.canvas.width - marginX;
    const clockY = ctx.canvas.height - marginY;

    if (signature) {
        ctx.fillText(signature, rightX, clockY - lineStep);
    }

    if (mode === 'both') {
        const jstLine = formatJstClockLine(date);
        const unixLine = formatUnixClockLine(date);
        const gap = 14;
        const unixW = ctx.measureText(unixLine).width;
        ctx.fillText(unixLine, rightX, clockY);
        ctx.fillText(jstLine, rightX - unixW - gap, clockY);
    } else {
        ctx.fillText(formatClockText(mode, date), rightX, clockY);
    }
    ctx.restore();
}

let previewScheduled = false;
let previewGeneration = 0;

// プレビュー更新。同じ操作内の複数回呼び出しは 1 回の描画にまとめる
function updatePreview() {
    if (previewScheduled) return;
    previewScheduled = true;
    previewDrawPromise = Promise.resolve().then(() => {
        previewScheduled = false;
        return renderPreview();
    });
}

// 合成とフォント待ちが終わってから「消去 → 転写 → 時刻」を同期で行い、途中状態を画面に出さない
function renderPreview() {
    const generation = ++previewGeneration;
    const canvas = elements.previewCanvas;
    const ctx = canvas.getContext('2d');

    if (!hasActiveDatetimeOverlay() && clockTickInterval) {
        clearInterval(clockTickInterval);
        clockTickInterval = null;
    }

    if (!state.partsData) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return Promise.resolve();
    }

    const layers = collectAllLayers();
    layers.sort((a, b) => a.zIndex - b.zIndex);
    const needsClockFont = hasActiveDatetimeOverlay();

    return Promise.all([
        composeLayers(layers, canvas.width, canvas.height),
        needsClockFont ? ensureClockFont() : null
    ]).then(([composed]) => {
        if (generation !== previewGeneration) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (composed) {
            ctx.drawImage(composed, 0, 0);
        } else {
            ctx.fillStyle = '#666';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('パーツを選択してください', canvas.width / 2, canvas.height / 2);
        }
        drawDynamicOverlays(ctx);
    });
}

// 描画・マスク算出対象の選択中パーツ ID（非表示カテゴリは除外）
function getVisibleSelectedPartIds() {
    const ids = [];
    if (!state.partsData) return ids;

    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);
        if (!isCategoryVisible(category)) continue;

        if (category && category.selectionMode === 'multiple') {
            if (Array.isArray(selection)) {
                selection.forEach(partId => {
                    const part = state.partsData.parts.find(p => p.id === partId);
                    if (isPartVisible(part)) ids.push(partId);
                });
            }
        } else if (selection) {
            const part = state.partsData.parts.find(p => p.id === selection);
            if (isPartVisible(part)) ids.push(selection);
        }
    }
    return ids;
}

// 全レイヤーを収集
function collectAllLayers() {
    const layers = [];
    if (!state.partsData) return layers;

    const IG = window.CharamakeInnerGroups;
    const LR = window.CharamakeLayerResolve;
    const visiblePartIds = getVisibleSelectedPartIds();
    const activeMaskGroups = IG
        ? IG.computeActiveMaskGroups(visiblePartIds, state.partsData.parts)
        : new Set();
    const activePoseId = LR
        ? LR.getActivePoseId(visiblePartIds, state.partsData.parts)
        : null;

    for (const [categoryId, selection] of Object.entries(state.selectedParts)) {
        const category = state.partsData.categories.find(c => c.id === categoryId);

        if (!isCategoryVisible(category)) continue;

        if (category && category.selectionMode === 'multiple') {
            selection.forEach(partId => {
                addPartLayers(partId, layers, activeMaskGroups, activePoseId);
            });
        } else {
            addPartLayers(selection, layers, activeMaskGroups, activePoseId);
        }
    }

    return layers;
}

// パーツが side 指定レイヤーを持つか確認
function hasSidedLayers(part) {
    return part.layers && part.layers.some(l => l.side === 'left' || l.side === 'right');
}

// パーツのレイヤーを追加（side フィルタリング込み）
function addPartLayers(partId, layers, activeMaskGroups, activePoseId) {
    const part = state.partsData.parts.find(p => p.id === partId);
    if (!part || !part.layers || !isPartVisible(part)) return;

    const LR = window.CharamakeLayerResolve;
    const maskGroups = activeMaskGroups || new Set();
    const poseId = activePoseId != null ? activePoseId : null;
    const colorSettings = getColorSettings(part);
    const selectedSide = state.selectedSide[partId] || 'both';

    part.layers.forEach(layer => {
        if (layer.side && selectedSide !== 'both' && layer.side !== selectedSide) return;

        const resolvedFile = LR
            ? LR.resolveLayerFile(layer, { poseId, activeMaskGroups: maskGroups })
            : layer.file;

        layers.push({
            file: resolvedFile,
            zIndex: layer.zIndex || part.zIndex,
            animated: layer.animated,
            blendMode: layer.blendMode,
            colorSettings: colorSettings,
            partId: part.id
        });
    });
}

// パーツの色設定を取得（カラーグループ意図 → パーツ定義で解決）
function getColorSettings(part) {
    const selectedColor = getEffectiveColorPreset(part);

    if (!selectedColor || selectedColor === 'normal') {
        return null;
    }

    if (selectedColor === 'custom') {
        const groupId = getColorGroupIdForPart(part);
        if (groupId && state.colorGroupCustom[groupId]) {
            return state.colorGroupCustom[groupId];
        }
        return state.customColors[part.id] || null;
    }

    if (part.colors && part.colors[selectedColor]) {
        return part.colors[selectedColor];
    }

    return null;
}

// 画像キャッシュ（URL → Promise<HTMLImageElement | null>）。読込中・失敗も保持して再リクエストしない
const imageCache = {};

function loadImage(src) {
    if (!imageCache[src]) {
        imageCache[src] = new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const decoded = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
                decoded.then(() => resolve(img));
            };
            img.onerror = () => { resolve(null); };
            img.src = src;
        });
    }
    return imageCache[src];
}

function colorPresetRasterPath(layer) {
    const cs = layer.colorSettings;
    if (!cs || !layer.file) return layer.file;
    const fileKey = String(layer.file).replace(/\\/g, '/');
    if (cs.images && typeof cs.images === 'object') {
        const fromMap = cs.images[fileKey] || cs.images[layer.file];
        if (fromMap && String(fromMap).trim()) return String(fromMap).trim();
    }
    if (cs.image && typeof cs.image === 'string' && cs.image.trim()) return cs.image.trim();
    return layer.file;
}

// 色プリセットが専用画像（image）のときはそれを、なければレイヤー本体の file を読み込む
function loadLayerRaster(layer) {
    const cs = layer.colorSettings;
    const primary = colorPresetRasterPath(layer);
    const alt = cs && primary !== layer.file ? primary : null;
    return loadImage(primary).then(img => {
        if (img || !alt) return { img, layer };
        if (!layer.file) return { img: null, layer };
        return loadImage(layer.file).then(fallbackImg => ({ img: fallbackImg, layer }));
    });
}

function isDrawableLayer(l) {
    if (l.file) return true;
    const cs = l.colorSettings;
    if (!cs) return false;
    if (cs.image && String(cs.image).trim()) return true;
    if (cs.images && typeof cs.images === 'object') {
        const fileKey = String(l.file || '').replace(/\\/g, '/');
        return !!(cs.images[fileKey] || cs.images[l.file]);
    }
    return false;
}

// 直前の合成結果。レイヤー構成が同じ（時刻更新など）なら再合成しない
let composedCache = { key: null, canvas: null };

// レイヤーを合成したキャンバスを返す（エディタと同じロジック）。描画対象が無ければ null
function composeLayers(layers, width, height) {
    const validLayers = layers.filter(isDrawableLayer);
    if (validLayers.length === 0) return Promise.resolve(null);

    const key = JSON.stringify([width, height, validLayers.map(l => [l.file, l.blendMode || '', l.colorSettings || null])]);
    if (composedCache.key === key) return Promise.resolve(composedCache.canvas);

    return Promise.all(validLayers.map(loadLayerRaster)).then(items => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        items.forEach(({ img, layer }) => {
            if (!img) return;
            ctx.globalCompositeOperation = layer.blendMode || 'source-over';
            ctx.drawImage(getLayerSource(img, layer.colorSettings, width, height), 0, 0);
        });
        ctx.globalCompositeOperation = 'source-over';

        composedCache = { key, canvas };
        return canvas;
    });
}

// 色付きレイヤーの加工結果（LRU）。1 枚 = キャンバス全面分のメモリを使うので上限を設ける
const TINT_CACHE_LIMIT = 24;
const tintCache = new Map();

function getLayerSource(img, cs, width, height) {
    const hasBlend = cs && cs.blend && cs.color;
    const hasHue = cs && cs.hueShift !== undefined && cs.hueShift !== 0 && cs.hueOpacity > 0;
    if (!hasBlend && !hasHue) return img;

    const key = [img.src, width, height, hasBlend ? cs.blend : '', hasBlend ? cs.color : '', cs.opacity, cs.hueShift, cs.hueOpacity].join('|');
    const hit = tintCache.get(key);
    if (hit) {
        tintCache.delete(key);
        tintCache.set(key, hit);
        return hit;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: !!hasHue });

    if (hasBlend) {
        // ① 白背景 + img で完全不透明版を作成し、その上で blend 計算する
        //    半透明ピクセルに blend モードを直接かけると Canvas 2D の
        //    合成式が不定動作になるため、不透明化してから blend する
        const opaqueCanvas = document.createElement('canvas');
        opaqueCanvas.width = width;
        opaqueCanvas.height = height;
        const opaqueCtx = opaqueCanvas.getContext('2d');
        opaqueCtx.fillStyle = '#ffffff';
        opaqueCtx.fillRect(0, 0, width, height);
        opaqueCtx.drawImage(img, 0, 0);
        opaqueCtx.globalCompositeOperation = cs.blend;
        opaqueCtx.fillStyle = cs.color;
        opaqueCtx.fillRect(0, 0, width, height);
        opaqueCtx.globalCompositeOperation = 'source-over';
        // opaqueCanvas: 正確にブレンドされた RGB、alpha=1

        // ② 元画像を下地に、opaqueCanvas を source-atop + opacity で重ねる
        //    source-atop: αr = αd（元の alpha を完全保持）
        //                 RGB = lerp(original, blended, opacity)
        tempCtx.drawImage(img, 0, 0);
        tempCtx.globalCompositeOperation = 'source-atop';
        tempCtx.globalAlpha = cs.opacity !== undefined ? cs.opacity : 1;
        tempCtx.drawImage(opaqueCanvas, 0, 0);
        tempCtx.globalAlpha = 1;
        tempCtx.globalCompositeOperation = 'source-over';
    } else {
        tempCtx.drawImage(img, 0, 0);
    }

    if (hasHue) {
        applyHueShift(tempCtx, width, height, cs.hueShift, cs.hueOpacity);
    }

    tintCache.set(key, tempCanvas);
    if (tintCache.size > TINT_CACHE_LIMIT) {
        tintCache.delete(tintCache.keys().next().value);
    }
    return tempCanvas;
}


// 色相回転処理
function applyHueShift(ctx, width, height, hueShift, hueOpacity) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const shift = hueShift / 360;
    
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) continue;
        
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const hsl = rgbToHsl(r, g, b);
        
        let newH = (hsl.h + shift) % 1.0;
        if (newH < 0) newH += 1.0;
        
        const newRgb = hslToRgb(newH, hsl.s, hsl.l);
        
        pixels[i]     = Math.round(lerp(r, newRgb.r, hueOpacity));
        pixels[i + 1] = Math.round(lerp(g, newRgb.g, hueOpacity));
        pixels[i + 2] = Math.round(lerp(b, newRgb.b, hueOpacity));
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h, s, l };
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
}

function lerp(a, b, t) { return a + (b - a) * t; }
