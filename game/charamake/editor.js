// グローバル状態管理
const state = {
    data: {
        meta: {
            version: "2.0",
            canvasWidth: 800,
            canvasHeight: 900,
            projectRoot: "" // プロジェクトルートパス
        },
        categoryGroups: [], // カテゴリグループ
        parts: [],
        categories: []
    },
    selectedCategory: null,
    selectedPart: null,
    editingPart: null,
    selectedColorPreset: null // 選択中の色プリセット（プレビュー用）
};

// DOM要素
const elements = {
    categoryList: document.getElementById('categoryList'),
    partsList: document.getElementById('partsList'),
    currentCategoryName: document.getElementById('currentCategoryName'),
    editorPanel: document.getElementById('editorPanel'),
    previewCanvas: document.getElementById('previewCanvas'),
    fileInput: document.getElementById('fileInput')
};

// 初期化
function init() {
    setupEventListeners();
    loadFromLocalStorage();
    renderCategories();
}

// イベントリスナー設定
function setupEventListeners() {
    // ヘッダーボタン
    document.getElementById('editGroupsBtn').addEventListener('click', editGroups);
    document.getElementById('editMetaBtn').addEventListener('click', editMetadata);
    document.getElementById('loadJsonBtn').addEventListener('click', loadJson);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('saveBtn').addEventListener('click', saveToLocalStorage);
    
    // カテゴリ・パーツボタン
    document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
    document.getElementById('addPartBtn').addEventListener('click', addPart);
    
    // エディタボタン
    document.getElementById('savePartBtn').addEventListener('click', savePart);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    
    // レイヤー・色設定
    document.getElementById('addLayerBtn').addEventListener('click', addLayer);
    document.getElementById('colorizableCheckbox').addEventListener('change', toggleColorSettings);
    document.getElementById('addColorBtn').addEventListener('click', addColorPreset);
    document.getElementById('addUnlockBtn').addEventListener('click', addUnlock);
    
    // 必須パーツ選択
    document.getElementById('requiresPart').addEventListener('change', (e) => {
        if (state.editingPart) {
            state.editingPart.requires = e.target.value || undefined;
        }
    });
    
    // ファイル入力
    elements.fileInput.addEventListener('change', handleJsonFileSelect);
    
    // プレビュー
    document.getElementById('previewWithOthers').addEventListener('change', () => {
        updateOtherPartsSelector();
        updatePreview();
    });
}

// カテゴリ一覧の描画
function renderCategories() {
    elements.categoryList.innerHTML = '';
    
    // カテゴリグループが存在する場合はグループごとに表示
    const groups = state.data.categoryGroups || [];
    
    if (groups.length > 0) {
        // グループなしカテゴリを先に表示
        const ungroupedCategories = state.data.categories
            .filter(c => !c.group)
            .sort((a, b) => a.order - b.order);
        
        ungroupedCategories.forEach(category => {
            const div = createCategoryItem(category);
            elements.categoryList.appendChild(div);
        });
        
        // グループごとに表示
        groups.sort((a, b) => a.order - b.order).forEach(group => {
            const groupCategories = state.data.categories
                .filter(c => c.group === group.id)
                .sort((a, b) => a.order - b.order);
            
            if (groupCategories.length > 0) {
                const groupDiv = createCategoryGroup(group, groupCategories);
                elements.categoryList.appendChild(groupDiv);
            }
        });
    } else {
        // グループがない場合は従来通りフラット表示
        const sortedCategories = [...state.data.categories].sort((a, b) => a.order - b.order);
        sortedCategories.forEach(category => {
            const div = createCategoryItem(category);
            elements.categoryList.appendChild(div);
        });
    }
}

// カテゴリアイテムを作成
function createCategoryItem(category) {
    const div = document.createElement('div');
    div.className = 'category-item' + (category.hidden ? ' hidden' : '');
    if (state.selectedCategory === category.id) {
        div.classList.add('active');
    }
    div.textContent = category.name;
    div.addEventListener('click', () => selectCategory(category.id));
    return div;
}

// カテゴリグループを作成
function createCategoryGroup(group, categories) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'category-group';
    
    const header = document.createElement('div');
    header.className = 'category-group-header';
    header.innerHTML = `<span class="group-toggle">▼</span> ${group.name}`;
    header.addEventListener('click', () => toggleGroup(group.id));
    groupDiv.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'category-group-content';
    content.id = `group-${group.id}`;
    
    categories.forEach(category => {
        const div = createCategoryItem(category);
        div.style.paddingLeft = '1.5rem'; // インデント
        content.appendChild(div);
    });
    
    groupDiv.appendChild(content);
    return groupDiv;
}

// グループの折りたたみ切り替え
function toggleGroup(groupId) {
    const content = document.getElementById(`group-${groupId}`);
    const header = content.previousElementSibling;
    const toggle = header.querySelector('.group-toggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// カテゴリ選択
function selectCategory(categoryId) {
    state.selectedCategory = categoryId;
    state.selectedPart = null;
    state.editingPart = null;
    renderCategories();
    renderParts();
    showCategoryEditor();
}

// カテゴリエディタ表示
function showCategoryEditor() {
    if (!state.selectedCategory) {
        hideEditor();
        return;
    }
    
    const category = state.data.categories.find(c => c.id === state.selectedCategory);
    if (!category) return;
    
    elements.editorPanel.style.display = 'block';
    
    // グループ選択肢を作成
    let groupOptions = '<option value="">なし（グループ化しない）</option>';
    if (state.data.categoryGroups) {
        state.data.categoryGroups.forEach(group => {
            const selected = category.group === group.id ? 'selected' : '';
            groupOptions += `<option value="${group.id}" ${selected}>${group.name}</option>`;
        });
    }
    
    // カテゴリ編集用のHTMLを表示
    elements.editorPanel.innerHTML = `
        <h3>カテゴリ編集: <span id="editingCategoryName">${category.name}</span></h3>
        
        <details open>
            <summary>基本情報</summary>
            <div class="form-group">
                <label>ID:</label>
                <input type="text" id="categoryId" value="${category.id}" readonly>
                <small style="color: #6c757d;">※IDは変更できません</small>
            </div>
            <div class="form-group">
                <label>名前:</label>
                <input type="text" id="categoryName" value="${category.name}">
            </div>
            <div class="form-group">
                <label>所属グループ:</label>
                <select id="categoryGroup">
                    ${groupOptions}
                </select>
                <small style="display: block; color: #6c757d; margin-top: 0.25rem;">
                    グループを選択すると、カテゴリリストでグループ化されて表示されます
                </small>
            </div>
            <div class="form-group">
                <label>カラーグループID:</label>
                <input type="text" id="categoryColorGroup" value="${category.colorGroup || ''}" placeholder="カラーグループID（任意、例: hair）">
                <small style="display: block; color: #6c757d; margin-top: 0.25rem;">
                    同じIDを持つカテゴリ間で色設定が連携します（例: hair, skin）
                </small>
            </div>
            <div class="form-group">
                <label>表示順序:</label>
                <input type="number" id="categoryOrder" value="${category.order}">
                <small style="display: block; color: #6c757d; margin-top: 0.25rem;">
                    グループ内での表示順序
                </small>
            </div>
            <div class="form-group">
                <label>選択モード:</label>
                <select id="categorySelectionMode">
                    <option value="single" ${category.selectionMode === 'single' ? 'selected' : ''}>単一選択</option>
                    <option value="multiple" ${category.selectionMode === 'multiple' ? 'selected' : ''}>複数選択（アクセサリー用）</option>
                </select>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="categoryHidden" ${category.hidden ? 'checked' : ''}>
                    条件付き表示カテゴリ
                </label>
                <small style="display: block; color: #6c757d; margin-top: 0.25rem;">
                    他のパーツのunlocksで指定されたときのみ表示
                </small>
            </div>
        </details>
        
        <div class="editor-actions">
            <button id="saveCategoryBtn" class="btn btn-primary">カテゴリを保存</button>
            <button id="deleteCategoryBtn" class="btn" style="background: #dc3545; color: white;">カテゴリを削除</button>
        </div>
    `;
    
    // イベントリスナー設定
    document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);
    document.getElementById('deleteCategoryBtn').addEventListener('click', () => deleteCategory(category.id));
}

// カテゴリ保存
function saveCategory() {
    const categoryId = document.getElementById('categoryId').value;
    const category = state.data.categories.find(c => c.id === categoryId);
    
    if (!category) return;
    
    category.name = document.getElementById('categoryName').value;
    category.group = document.getElementById('categoryGroup').value || null;
    category.colorGroup = document.getElementById('categoryColorGroup').value.trim() || undefined;
    category.order = parseInt(document.getElementById('categoryOrder').value);
    category.selectionMode = document.getElementById('categorySelectionMode').value;
    category.hidden = document.getElementById('categoryHidden').checked;
    
    renderCategories();
    renderParts();
    saveToLocalStorage();
    alert('カテゴリを保存しました');
}

// カテゴリ削除
function deleteCategory(categoryId) {
    // このカテゴリに属するパーツがあるかチェック
    const partsInCategory = state.data.parts.filter(p => p.category === categoryId);
    
    if (partsInCategory.length > 0) {
        if (!confirm(`このカテゴリには${partsInCategory.length}個のパーツがあります。本当に削除しますか？`)) {
            return;
        }
        // パーツも一緒に削除
        state.data.parts = state.data.parts.filter(p => p.category !== categoryId);
    } else {
        if (!confirm('このカテゴリを削除しますか？')) {
            return;
        }
    }
    
    state.data.categories = state.data.categories.filter(c => c.id !== categoryId);
    state.selectedCategory = null;
    renderCategories();
    renderParts();
    hideEditor();
    saveToLocalStorage();
}

// グループ管理画面
function editGroups() {
    state.selectedCategory = null;
    state.selectedPart = null;
    state.editingPart = null;
    
    renderCategories();
    renderParts();
    
    if (!state.data.categoryGroups) {
        state.data.categoryGroups = [];
    }
    
    elements.editorPanel.style.display = 'block';
    
    elements.editorPanel.innerHTML = `
        <h3>カテゴリグループ管理</h3>
        
        <details open>
            <summary>グループ一覧</summary>
            <div id="groupsList" style="margin-top: 1rem;">
                ${renderGroupsList()}
            </div>
            <button id="addGroupBtn" class="btn btn-small" style="margin-top: 1rem;">+ グループ追加</button>
        </details>
        
        <details>
            <summary>説明</summary>
            <div style="padding: 0.5rem; color: #6c757d;">
                <p>カテゴリグループを使用すると、カテゴリを整理して表示できます。</p>
                <p>例: 「顔パーツ」グループに目・眉毛・鼻・口をまとめる</p>
                <p>各カテゴリの編集画面で所属グループを設定できます。</p>
            </div>
        </details>
        
        <div class="editor-actions">
            <button id="closeGroupsBtn" class="btn">閉じる</button>
        </div>
    `;
    
    document.getElementById('addGroupBtn').addEventListener('click', addGroup);
    document.getElementById('closeGroupsBtn').addEventListener('click', hideEditor);
}

// グループ一覧HTML生成
function renderGroupsList() {
    if (!state.data.categoryGroups || state.data.categoryGroups.length === 0) {
        return '<p class="placeholder">グループがありません</p>';
    }
    
    const sortedGroups = [...state.data.categoryGroups].sort((a, b) => a.order - b.order);
    
    return sortedGroups.map(group => `
        <div class="form-group" style="border: 1px solid #dee2e6; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong>${group.name}</strong>
                <button class="btn btn-small" onclick="deleteGroup('${group.id}')" style="background: #dc3545; color: white;">削除</button>
            </div>
            <div class="form-group">
                <label>ID:</label>
                <input type="text" value="${group.id}" readonly style="background: #e9ecef;">
            </div>
            <div class="form-group">
                <label>名前:</label>
                <input type="text" id="groupName_${group.id}" value="${group.name}">
            </div>
            <div class="form-group">
                <label>表示順序:</label>
                <input type="number" id="groupOrder_${group.id}" value="${group.order}">
            </div>
            <button class="btn btn-small btn-primary" onclick="saveGroup('${group.id}')">保存</button>
        </div>
    `).join('');
}

// グループ追加
function addGroup() {
    const groupId = prompt('グループID（半角英数字とアンダースコア）:');
    if (!groupId) return;
    
    // IDの重複チェック
    if (state.data.categoryGroups.find(g => g.id === groupId)) {
        alert('このIDは既に使用されています');
        return;
    }
    
    const groupName = prompt('グループ名:');
    if (!groupName) return;
    
    const newGroup = {
        id: groupId,
        name: groupName,
        order: state.data.categoryGroups.length + 1,
        collapsed: false
    };
    
    state.data.categoryGroups.push(newGroup);
    saveToLocalStorage();
    editGroups(); // 再描画
}

// グループ保存
function saveGroup(groupId) {
    const group = state.data.categoryGroups.find(g => g.id === groupId);
    if (!group) return;
    
    group.name = document.getElementById(`groupName_${groupId}`).value;
    group.order = parseInt(document.getElementById(`groupOrder_${groupId}`).value);
    
    saveToLocalStorage();
    renderCategories();
    alert('グループを保存しました');
    editGroups(); // 再描画
}

// グループ削除
function deleteGroup(groupId) {
    // このグループに属するカテゴリがあるかチェック
    const categoriesInGroup = state.data.categories.filter(c => c.group === groupId);
    
    if (categoriesInGroup.length > 0) {
        if (!confirm(`このグループには${categoriesInGroup.length}個のカテゴリが属しています。\nグループを削除すると、これらのカテゴリはグループなしになります。\n本当に削除しますか？`)) {
            return;
        }
        // カテゴリのgroup属性をnullに
        categoriesInGroup.forEach(cat => {
            cat.group = null;
        });
    } else {
        if (!confirm('このグループを削除しますか？')) {
            return;
        }
    }
    
    state.data.categoryGroups = state.data.categoryGroups.filter(g => g.id !== groupId);
    saveToLocalStorage();
    renderCategories();
    editGroups(); // 再描画
}

// メタデータ編集
function editMetadata() {
    state.selectedCategory = null;
    state.selectedPart = null;
    state.editingPart = null;
    
    renderCategories();
    renderParts();
    
    elements.editorPanel.style.display = 'block';
    
    elements.editorPanel.innerHTML = `
        <h3>メタデータ編集</h3>
        
        <details open>
            <summary>プロジェクト設定</summary>
            <div class="form-group">
                <label>バージョン:</label>
                <input type="text" id="metaVersion" value="${state.data.meta.version}">
            </div>
            <div class="form-group">
                <label>キャンバス幅 (px):</label>
                <input type="number" id="metaCanvasWidth" value="${state.data.meta.canvasWidth}">
            </div>
            <div class="form-group">
                <label>キャンバス高さ (px):</label>
                <input type="number" id="metaCanvasHeight" value="${state.data.meta.canvasHeight}">
            </div>
            <div class="form-group">
                <label>プロジェクトルートパス:</label>
                <input type="text" id="metaProjectRoot" value="${state.data.meta.projectRoot || ''}" 
                       placeholder="例: D:/web/100percent-health/game/charamake2">
                <small style="display: block; color: #6c757d; margin-top: 0.25rem;">
                    画像選択時に相対パスを計算するための基準パス（任意）
                </small>
                <button class="btn btn-small" onclick="selectProjectRoot()" style="margin-top: 0.5rem;">
                    フォルダを選択
                </button>
            </div>
        </details>
        
        <details open>
            <summary>統計情報</summary>
            <div style="padding: 0.5rem;">
                <p>カテゴリ数: ${state.data.categories.length}</p>
                <p>パーツ数: ${state.data.parts.length}</p>
                <p>総レイヤー数: ${state.data.parts.reduce((sum, p) => sum + (p.layers ? p.layers.length : 0), 0)}</p>
            </div>
        </details>
        
        <div class="editor-actions">
            <button id="saveMetaBtn" class="btn btn-primary">メタデータを保存</button>
            <button id="cancelMetaBtn" class="btn">キャンセル</button>
        </div>
    `;
    
    document.getElementById('saveMetaBtn').addEventListener('click', saveMetadata);
    document.getElementById('cancelMetaBtn').addEventListener('click', hideEditor);
}

// プロジェクトルート選択（フォルダ選択は制限があるため、最初の画像から推測）
function selectProjectRoot() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // ファイルパスからディレクトリを推測
            alert('選択した画像のパスを確認してください。\nブラウザの制限により、パスは手動で入力する必要があります。\n\n例: D:/web/100percent-health/game/charamake2');
        }
    };
    input.click();
}

// メタデータ保存
function saveMetadata() {
    state.data.meta.version = document.getElementById('metaVersion').value;
    state.data.meta.canvasWidth = parseInt(document.getElementById('metaCanvasWidth').value);
    state.data.meta.canvasHeight = parseInt(document.getElementById('metaCanvasHeight').value);
    state.data.meta.projectRoot = document.getElementById('metaProjectRoot').value;
    
    // キャンバスサイズを適用
    applyCanvasSize();
    
    saveToLocalStorage();
    hideEditor();
    alert('メタデータを保存しました');
}

// パーツ一覧の描画
function renderParts() {
    if (!state.selectedCategory) {
        elements.partsList.innerHTML = '<p class="placeholder">カテゴリを選択してください</p>';
        elements.currentCategoryName.textContent = 'パーツ一覧';
        return;
    }
    
    const category = state.data.categories.find(c => c.id === state.selectedCategory);
    elements.currentCategoryName.textContent = category.name;
    
    const parts = state.data.parts.filter(p => p.category === state.selectedCategory);
    
    if (parts.length === 0) {
        elements.partsList.innerHTML = '<p class="placeholder">パーツがありません</p>';
        return;
    }
    
    elements.partsList.innerHTML = '';
    
    parts.forEach(part => {
        const card = createPartCard(part);
        elements.partsList.appendChild(card);
    });
}

// パーツカードの作成
function createPartCard(part) {
    const card = document.createElement('div');
    card.className = 'part-card';
    if (state.selectedPart === part.id) {
        card.classList.add('active');
    }
    
    const layerCount = part.layers ? part.layers.length : 0;
    const hasAnimation = part.layers && part.layers.some(l => l.animated);
    const hasColors = part.colors && Object.keys(part.colors).length > 0;
    const hasUnlocks = part.unlocks && part.unlocks.length > 0;
    const hasHides = part.hides && part.hides.length > 0;
    const hasRequires = part.requires;
    
    // アイコン行を作成
    let icons = '';
    if (hasColors) icons += '<span class="part-icon" title="色変更可能">🎨</span>';
    if (hasAnimation) icons += '<span class="part-icon" title="GIFアニメ">📽️</span>';
    if (hasUnlocks) icons += '<span class="part-icon" title="他カテゴリを解放">🔓</span>';
    if (hasHides) icons += '<span class="part-icon" title="カテゴリを非表示">🙈</span>';
    if (hasRequires) icons += '<span class="part-icon" title="依存関係あり">🔗</span>';
    
    card.innerHTML = `
        <div class="part-card-header">
            <div class="part-card-title">${part.name}</div>
            <div class="part-card-icons">${icons}</div>
        </div>
        <div class="part-card-info">
            ID: ${part.id} | z: ${part.zIndex} | ${layerCount}レイヤー
        </div>
        ${hasColors ? `<div class="part-card-colors">色: ${Object.keys(part.colors).join(', ')}</div>` : ''}
        ${hasUnlocks ? `<div class="part-card-unlocks">解放: ${part.unlocks.join(', ')}</div>` : ''}
        ${hasHides ? `<div class="part-card-unlocks" style="color:#e67e22;">非表示: ${part.hides.join(', ')}</div>` : ''}
        ${hasRequires ? `<div class="part-card-requires">必須: ${part.requires}</div>` : ''}
        <div class="part-card-actions">
            <button class="btn btn-small" onclick="duplicatePart('${part.id}')">複製</button>
            <button class="btn btn-small" onclick="deletePart('${part.id}')">削除</button>
        </div>
    `;
    
    // カード全体をクリックで編集画面を開く
    card.addEventListener('click', (e) => {
        // 複製・削除ボタンをクリックした場合は編集を開かない
        if (!e.target.classList.contains('btn') && !e.target.closest('.btn')) {
            editPart(part.id);
        }
    });
    
    return card;
}

// パーツ選択（編集画面を開く）
function selectPart(partId) {
    state.selectedPart = partId;
    renderParts();
    editPart(partId); // 自動的に編集画面を開く
}

// パーツ編集
function editPart(partId) {
    const part = state.data.parts.find(p => p.id === partId);
    if (!part) return;
    
    state.editingPart = JSON.parse(JSON.stringify(part)); // ディープコピー
    state.selectedPart = partId;
    
    // 色プリセットは常にデフォルトを選択
    state.selectedColorPreset = 'default';
    
    renderParts(); // 選択状態を更新
    showPartEditor();
    populateEditor();
    updatePreview(); // プレビュー更新
}

// パーツエディタ表示
function showPartEditor() {
    elements.editorPanel.style.display = 'block';
    
    // パーツ編集用のHTMLに戻す（元のHTML構造）
    elements.editorPanel.innerHTML = `
        <h3>パーツ編集: <span id="editingPartName"></span></h3>
        
        <!-- 基本情報 -->
        <details open>
            <summary>基本情報</summary>
            <div class="form-group">
                <label>ID:</label>
                <input type="text" id="partId" placeholder="part_id">
            </div>
            <div class="form-group">
                <label>名前:</label>
                <input type="text" id="partName" placeholder="パーツ名">
            </div>
            <div class="form-group">
                <label>カテゴリ:</label>
                <select id="partCategory"></select>
            </div>
            <div class="form-group">
                <label>zIndex:</label>
                <input type="number" id="partZIndex" value="100">
            </div>
        </details>

        <!-- レイヤー設定 -->
        <details open>
            <summary>レイヤー設定</summary>
            <div id="layersList" class="layers-list"></div>
            <button id="addLayerBtn" class="btn btn-small">+ レイヤー追加</button>
        </details>

        <!-- 色設定 -->
        <details>
            <summary>色設定</summary>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="colorizableCheckbox">
                    色変更可能
                </label>
            </div>
            <div id="colorPresetsArea" style="display:none;">
                <!-- プレビューエリアを色設定内に移動 -->
                <div class="color-preview-section">
                    <h4>プレビュー</h4>
                    <div class="color-preview-canvas-wrapper">
                        <canvas id="colorPreviewCanvas"></canvas>
                    </div>
                </div>
                
                <h4>色プリセット</h4>
                <div id="colorPresetsList"></div>
                <button id="addColorBtn" class="btn btn-small">+ 色追加</button>
            </div>
        </details>

        <!-- 依存関係 -->
        <details>
            <summary>依存関係</summary>
            <div class="form-group">
                <label>必須パーツ:</label>
                <select id="requiresPart">
                    <option value="">なし</option>
                </select>
            </div>
            <div class="form-group">
                <label>表示するカテゴリ/パーツ:</label>
                <div id="unlocksList"></div>
                <button id="addUnlockBtn" class="btn btn-small">+ 追加</button>
            </div>
            <div class="form-group">
                <label>非表示にするカテゴリ:</label>
                <small style="display:block; color:#6c757d; margin-bottom:0.25rem;">
                    このパーツ選択中、指定カテゴリを一覧から隠します（unlocks側が優先）
                </small>
                <div id="hidesList"></div>
                <button id="addHidesBtn" class="btn btn-small">+ 追加</button>
            </div>
        </details>

        <!-- 警告表示 -->
        <details>
            <summary>⚠ 警告 (<span id="warningCount">0</span>)</summary>
            <div id="warningsList" class="warnings-list"></div>
        </details>

        <div class="editor-actions">
            <button id="savePartBtn" class="btn btn-primary">パーツを保存</button>
            <button id="cancelEditBtn" class="btn">キャンセル</button>
        </div>
    `;
    
    // イベントリスナーを再設定
    document.getElementById('savePartBtn').addEventListener('click', savePart);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    document.getElementById('addLayerBtn').addEventListener('click', addLayer);
    document.getElementById('colorizableCheckbox').addEventListener('change', toggleColorSettings);
    document.getElementById('addColorBtn').addEventListener('click', addColorPreset);
    document.getElementById('addUnlockBtn').addEventListener('click', addUnlock);
    document.getElementById('addHidesBtn').addEventListener('click', addHides);
    document.getElementById('requiresPart').addEventListener('change', (e) => {
        if (state.editingPart) {
            state.editingPart.requires = e.target.value || undefined;
        }
    });
    
    updateWarningsDisplay();
}

// エディタ表示
function showEditor() {
    elements.editorPanel.style.display = 'block';
    updateWarningsDisplay();
}

// エディタ非表示
function hideEditor() {
    elements.editorPanel.style.display = 'none';
    state.editingPart = null;
}

// エディタに値を設定
function populateEditor() {
    if (!state.editingPart) return;
    
    document.getElementById('editingPartName').textContent = state.editingPart.name || '新規パーツ';
    document.getElementById('partId').value = state.editingPart.id || '';
    document.getElementById('partName').value = state.editingPart.name || '';
    document.getElementById('partZIndex').value = state.editingPart.zIndex || 100;
    
    // カテゴリ選択肢を設定
    const categorySelect = document.getElementById('partCategory');
    categorySelect.innerHTML = '';
    state.data.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        if (cat.id === state.editingPart.category) {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });
    
    // 色プレビュー用キャンバスのサイズを設定
    setupColorPreviewCanvas();
    
    // レイヤー描画
    renderLayers();
    
    // 色設定
    const colorizable = state.editingPart.colors && Object.keys(state.editingPart.colors).length > 0;
    document.getElementById('colorizableCheckbox').checked = colorizable;
    toggleColorSettings();
    if (colorizable) {
        renderColorPresets();
    }
    
    // 依存関係
    populateDependencies();
}

// 色プレビュー用キャンバスのサイズを設定
function setupColorPreviewCanvas() {
    const colorCanvas = document.getElementById('colorPreviewCanvas');
    if (colorCanvas && state.data.meta) {
        const width = state.data.meta.canvasWidth || 800;
        const height = state.data.meta.canvasHeight || 900;
        
        // キャンバスの実際の解像度を設定
        colorCanvas.width = width;
        colorCanvas.height = height;
        
        // CSS で表示サイズはmax-widthとheight:autoで自動調整されるため、
        // インラインスタイルは削除
        colorCanvas.style.width = '';
        colorCanvas.style.height = '';
    }
}

// 依存関係UI設定
function populateDependencies() {
    // 必須パーツ選択肢
    const requiresSelect = document.getElementById('requiresPart');
    requiresSelect.innerHTML = '<option value="">なし</option>';
    
    state.data.parts.forEach(part => {
        const option = document.createElement('option');
        option.value = part.id;
        option.textContent = `${part.name} (${part.id})`;
        if (state.editingPart.requires === part.id) {
            option.selected = true;
        }
        requiresSelect.appendChild(option);
    });
    
    // unlocks一覧
    renderUnlocksList();
    // hides一覧
    renderHidesList();
}

// unlocks一覧の描画
function renderUnlocksList() {
    const list = document.getElementById('unlocksList');
    list.innerHTML = '';
    
    if (!state.editingPart.unlocks) {
        state.editingPart.unlocks = [];
    }
    
    state.editingPart.unlocks.forEach((unlockId, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '0.5rem';
        div.style.display = 'flex';
        div.style.gap = '0.5rem';
        
        // ドロップダウン作成
        const select = document.createElement('select');
        select.style.flex = '1';
        select.onchange = (e) => updateUnlock(index, e.target.value);
        
        // カテゴリとパーツの選択肢
        const catGroup = document.createElement('optgroup');
        catGroup.label = 'カテゴリ';
        state.data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (cat.id === unlockId) option.selected = true;
            catGroup.appendChild(option);
        });
        select.appendChild(catGroup);
        
        const partGroup = document.createElement('optgroup');
        partGroup.label = 'パーツ';
        state.data.parts.forEach(part => {
            const option = document.createElement('option');
            option.value = part.id;
            option.textContent = `${part.name} (${part.id})`;
            if (part.id === unlockId) option.selected = true;
            partGroup.appendChild(option);
        });
        select.appendChild(partGroup);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-small';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = () => deleteUnlock(index);
        
        div.appendChild(select);
        div.appendChild(deleteBtn);
        list.appendChild(div);
    });
}

// hides一覧の描画（カテゴリのみ対象）
function renderHidesList() {
    const list = document.getElementById('hidesList');
    list.innerHTML = '';
    
    if (!state.editingPart.hides) {
        state.editingPart.hides = [];
    }
    
    state.editingPart.hides.forEach((hideId, index) => {
        const div = document.createElement('div');
        div.style.cssText = 'margin-bottom:0.5rem; display:flex; gap:0.5rem;';
        
        const select = document.createElement('select');
        select.style.flex = '1';
        select.onchange = (e) => updateHides(index, e.target.value);
        
        state.data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (cat.id === hideId) option.selected = true;
            select.appendChild(option);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-small';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = () => deleteHides(index);
        
        div.appendChild(select);
        div.appendChild(deleteBtn);
        list.appendChild(div);
    });
}

function addHides() {
    if (!state.editingPart.hides) state.editingPart.hides = [];
    const defaultValue = state.data.categories.length > 0 ? state.data.categories[0].id : '';
    state.editingPart.hides.push(defaultValue);
    renderHidesList();
}

function deleteHides(index) {
    if (!state.editingPart.hides) return;
    state.editingPart.hides.splice(index, 1);
    renderHidesList();
}

function updateHides(index, value) {
    if (!state.editingPart.hides) return;
    state.editingPart.hides[index] = value;
}

// unlock追加
function addUnlock() {
    if (!state.editingPart.unlocks) {
        state.editingPart.unlocks = [];
    }
    
    // デフォルトで最初のカテゴリを選択
    const defaultValue = state.data.categories.length > 0 ? state.data.categories[0].id : '';
    
    state.editingPart.unlocks.push(defaultValue);
    renderUnlocksList();
}

// unlock削除
function deleteUnlock(index) {
    if (!state.editingPart.unlocks) return;
    state.editingPart.unlocks.splice(index, 1);
    renderUnlocksList();
}

// unlock更新
function updateUnlock(index, value) {
    if (!state.editingPart.unlocks) return;
    state.editingPart.unlocks[index] = value;
}

// レイヤー一覧の描画
function renderLayers() {
    const layersList = document.getElementById('layersList');
    layersList.innerHTML = '';
    
    if (!state.editingPart.layers) {
        state.editingPart.layers = [];
    }
    
    state.editingPart.layers.forEach((layer, index) => {
        const card = createLayerCard(layer, index);
        layersList.appendChild(card);
    });
}

// レイヤーカードの作成
function createLayerCard(layer, index) {
    const card = document.createElement('div');
    card.className = 'layer-card';
    
    card.innerHTML = `
        <div class="layer-header">
            <strong>Layer ${index + 1}</strong>
            <div class="layer-controls">
                <button class="btn btn-small" onclick="moveLayer(${index}, -1)">↑</button>
                <button class="btn btn-small" onclick="moveLayer(${index}, 1)">↓</button>
                <button class="btn btn-small" onclick="deleteLayer(${index})">×</button>
            </div>
        </div>
        <div class="form-group">
            <label>ファイル:</label>
            <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="layerFile_${index}" value="${layer.file || ''}" 
                       onchange="updateLayer(${index}, 'file', this.value)" style="flex: 1;">
                <button class="btn btn-small" onclick="selectLayerFile(${index})">参照</button>
            </div>
        </div>
        <div class="form-group">
            <label>zIndex (省略可):</label>
            <input type="number" value="${layer.zIndex || ''}" 
                   onchange="updateLayer(${index}, 'zIndex', this.value)">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" ${layer.animated ? 'checked' : ''} 
                       onchange="updateLayer(${index}, 'animated', this.checked)">
                アニメーション (GIF)
            </label>
        </div>
        <div class="form-group">
            <label>左右 (省略可):</label>
            <select onchange="updateLayer(${index}, 'side', this.value)">
                <option value="" ${!layer.side ? 'selected' : ''}>両方（指定なし）</option>
                <option value="left"  ${layer.side === 'left'  ? 'selected' : ''}>左のみ (left)</option>
                <option value="right" ${layer.side === 'right' ? 'selected' : ''}>右のみ (right)</option>
            </select>
        </div>
        <div class="form-group">
            <label>合成モード (省略可):</label>
            <select onchange="updateLayer(${index}, 'blendMode', this.value)">
                <option value="" ${!layer.blendMode ? 'selected' : ''}>通常 (source-over)</option>
                <option value="multiply"   ${layer.blendMode === 'multiply'   ? 'selected' : ''}>multiply</option>
                <option value="screen"     ${layer.blendMode === 'screen'     ? 'selected' : ''}>screen</option>
                <option value="overlay"    ${layer.blendMode === 'overlay'    ? 'selected' : ''}>overlay</option>
                <option value="darken"     ${layer.blendMode === 'darken'     ? 'selected' : ''}>darken</option>
                <option value="lighten"    ${layer.blendMode === 'lighten'    ? 'selected' : ''}>lighten</option>
                <option value="color-dodge"  ${layer.blendMode === 'color-dodge'  ? 'selected' : ''}>color-dodge</option>
                <option value="color-burn"   ${layer.blendMode === 'color-burn'   ? 'selected' : ''}>color-burn</option>
                <option value="hard-light"   ${layer.blendMode === 'hard-light'   ? 'selected' : ''}>hard-light</option>
                <option value="soft-light"   ${layer.blendMode === 'soft-light'   ? 'selected' : ''}>soft-light</option>
                <option value="difference"   ${layer.blendMode === 'difference'   ? 'selected' : ''}>difference</option>
                <option value="exclusion"    ${layer.blendMode === 'exclusion'    ? 'selected' : ''}>exclusion</option>
                <option value="hue"          ${layer.blendMode === 'hue'          ? 'selected' : ''}>hue</option>
                <option value="saturation"   ${layer.blendMode === 'saturation'   ? 'selected' : ''}>saturation</option>
                <option value="color"        ${layer.blendMode === 'color'        ? 'selected' : ''}>color</option>
                <option value="luminosity"   ${layer.blendMode === 'luminosity'   ? 'selected' : ''}>luminosity</option>
            </select>
        </div>
    `;
    
    return card;
}

// レイヤーファイル選択
let currentLayerIndex = null;

function selectLayerFile(index) {
    currentLayerIndex = index;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    // webkitdirectory属性でパス情報を取得しようとする
    input.webkitdirectory = false;
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const inputField = document.getElementById(`layerFile_${index}`);
            
            // File APIのwebkitRelativePathを使用（限定的）
            let relativePath = file.webkitRelativePath || file.name;
            
            // プロジェクトルートが設定されている場合
            if (state.data.meta.projectRoot) {
                // ユーザーに完全なパスを入力してもらう
                let fullPath = prompt(
                    '選択した画像の完全なパスを入力してください:\n' +
                    '（エクスプローラーのアドレスバーからコピー&ペーストできます）\n\n' +
                    'ファイル名: ' + file.name,
                    state.data.meta.projectRoot + '/parts/'
                );
                
                if (fullPath) {
                    // ダブルクォーテーション、シングルクォーテーションを除去
                    fullPath = fullPath.replace(/^["']|["']$/g, '').trim();
                    
                    // プロジェクトルートからの相対パスを計算
                    const rootPath = state.data.meta.projectRoot.replace(/\\/g, '/');
                    const normalizedPath = fullPath.replace(/\\/g, '/');
                    
                    if (normalizedPath.startsWith(rootPath)) {
                        relativePath = normalizedPath.substring(rootPath.length + 1);
                    } else {
                        relativePath = normalizedPath;
                    }
                }
            } else {
                // プロジェクトルート未設定の場合はファイル名のみ使用
                relativePath = file.name;
                alert(
                    'プロジェクトルートパスが設定されていません。\n\n' +
                    '「メタデータ編集」からプロジェクトルートを設定すると、\n' +
                    '正しい相対パスを自動計算できます。\n\n' +
                    '現在はファイル名のみが設定されます。手動でパスを編集してください。\n' +
                    '例: parts/basics/body/body1.png'
                );
            }
            
            if (inputField) {
                inputField.value = relativePath;
                updateLayer(index, 'file', relativePath);
                updatePreview();
            }
        }
    };
    input.click();
}

// レイヤー更新
function updateLayer(index, field, value) {
    if (!state.editingPart.layers[index]) return;
    
    if (field === 'zIndex') {
        state.editingPart.layers[index][field] = value ? parseInt(value) : undefined;
    } else if (field === 'blendMode' || field === 'side') {
        if (value) {
            state.editingPart.layers[index][field] = value;
        } else {
            delete state.editingPart.layers[index][field];
        }
    } else {
        state.editingPart.layers[index][field] = value;
    }
    
    updatePreview(); // プレビュー更新
}

// レイヤー追加
function addLayer() {
    if (!state.editingPart.layers) {
        state.editingPart.layers = [];
    }
    
    state.editingPart.layers.push({
        file: '',
        zIndex: undefined,
        animated: false
    });
    
    renderLayers();
    updatePreview();
}

// レイヤー移動
function moveLayer(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.editingPart.layers.length) return;
    
    const temp = state.editingPart.layers[index];
    state.editingPart.layers[index] = state.editingPart.layers[newIndex];
    state.editingPart.layers[newIndex] = temp;
    
    renderLayers();
    updatePreview();
}

// レイヤー削除
function deleteLayer(index) {
    if (confirm('このレイヤーを削除しますか?')) {
        state.editingPart.layers.splice(index, 1);
        renderLayers();
        updatePreview();
    }
}

// 色設定の表示切り替え
function toggleColorSettings() {
    const checkbox = document.getElementById('colorizableCheckbox');
    const area = document.getElementById('colorPresetsArea');
    
    area.style.display = checkbox.checked ? 'block' : 'none';
    
    // 色設定を開いた時にキャンバスサイズを設定
    if (checkbox.checked) {
        setupColorPreviewCanvas();
        updatePreview();
    }
}

// 色プリセット一覧の描画
function renderColorPresets() {
    const list = document.getElementById('colorPresetsList');
    list.innerHTML = '';
    
    if (!state.editingPart.colors) {
        state.editingPart.colors = {};
    }
    
    // 選択中の色プリセットを保持
    // パーツを開いた時はデフォルトを選択
    if (!state.selectedColorPreset) {
        state.selectedColorPreset = 'default';
    }
    
    // 1. デフォルト表示カードを追加
    const defaultCard = createDefaultColorCard();
    list.appendChild(defaultCard);
    
    // 2. 各色プリセットカードを追加
    Object.entries(state.editingPart.colors).forEach(([colorName, colorData]) => {
        const card = createColorPresetCard(colorName, colorData);
        list.appendChild(card);
    });
}

// デフォルト表示カードの作成
function createDefaultColorCard() {
    const card = document.createElement('div');
    card.className = 'color-preset-card color-preset-default';
    const isSelected = state.selectedColorPreset === 'default';
    
    if (isSelected) {
        card.classList.add('selected');
    }
    
    card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; padding: 1rem 0;">
            <strong>デフォルト表示（色設定なし）</strong>
        </div>
    `;
    
    card.addEventListener('click', () => {
        selectColorPresetForPreview('default');
    });
    
    return card;
}

// カラープリセットカードの作成
function createColorPresetCard(colorName, colorData) {
    const card = document.createElement('div');
    card.className = 'color-preset-card';
    const isSelected = state.selectedColorPreset === colorName;
    
    if (isSelected) {
        card.classList.add('selected');
    }
    
    const isBlend = colorData.blend !== undefined;
    
    card.innerHTML = `
        <div class="color-preset-compact">
            <div class="color-preset-header-compact">
                <input type="text" value="${colorName}" 
                       onchange="renameColorPreset('${colorName}', this.value)"
                       onclick="event.stopPropagation()"
                       class="color-name-input">
                <button class="btn btn-small" onclick="event.stopPropagation(); deleteColorPreset('${colorName}')">×</button>
            </div>
            
            <div class="color-preset-type">
                <label style="font-size: 0.85rem;">
                    <input type="radio" name="colorType_${colorName}" value="blend" 
                           ${isBlend ? 'checked' : ''} 
                           onclick="event.stopPropagation()"
                           onchange="switchColorType('${colorName}', 'blend')">
                    ブレンド
                </label>
                <label style="margin-left: 0.5rem; font-size: 0.85rem;">
                    <input type="radio" name="colorType_${colorName}" value="image" 
                           ${!isBlend ? 'checked' : ''} 
                           onclick="event.stopPropagation()"
                           onchange="switchColorType('${colorName}', 'image')">
                    画像
                </label>
            </div>
            
            <div id="blendSettings_${colorName}" class="color-settings-compact" style="display: ${isBlend ? 'block' : 'none'};">
                <div class="form-group-inline">
                    <label>Mode:</label>
                    <select onclick="event.stopPropagation()" onchange="updateColorPreset('${colorName}', 'blend', this.value)" style="font-size: 0.85rem;">
                        <option value="multiply"   ${colorData.blend === 'multiply'   ? 'selected' : ''}>multiply</option>
                        <option value="screen"     ${colorData.blend === 'screen'     ? 'selected' : ''}>screen</option>
                        <option value="overlay"    ${colorData.blend === 'overlay'    ? 'selected' : ''}>overlay</option>
                        <option value="darken"     ${colorData.blend === 'darken'     ? 'selected' : ''}>darken</option>
                        <option value="lighten"    ${colorData.blend === 'lighten'    ? 'selected' : ''}>lighten</option>
                        <option value="color-dodge"  ${colorData.blend === 'color-dodge'  ? 'selected' : ''}>color-dodge</option>
                        <option value="color-burn"   ${colorData.blend === 'color-burn'   ? 'selected' : ''}>color-burn</option>
                        <option value="hard-light"   ${colorData.blend === 'hard-light'   ? 'selected' : ''}>hard-light</option>
                        <option value="soft-light"   ${colorData.blend === 'soft-light'   ? 'selected' : ''}>soft-light</option>
                        <option value="difference"   ${colorData.blend === 'difference'   ? 'selected' : ''}>difference</option>
                        <option value="exclusion"    ${colorData.blend === 'exclusion'    ? 'selected' : ''}>exclusion</option>
                        <option value="hue"          ${colorData.blend === 'hue'          ? 'selected' : ''}>hue</option>
                        <option value="saturation"   ${colorData.blend === 'saturation'   ? 'selected' : ''}>saturation</option>
                        <option value="color"        ${colorData.blend === 'color'        ? 'selected' : ''}>color</option>
                        <option value="luminosity"   ${colorData.blend === 'luminosity'   ? 'selected' : ''}>luminosity</option>
                    </select>
                </div>
                <div class="form-group-inline">
                    <label>Color:</label>
                    <input type="color" value="${colorData.color || '#000000'}" 
                           onclick="event.stopPropagation()"
                           onchange="updateColorPreset('${colorName}', 'color', this.value)"
                           style="width: 40px; height: 28px;">
                    <input type="text" value="${colorData.color || '#000000'}" 
                           onclick="event.stopPropagation()"
                           onchange="updateColorPreset('${colorName}', 'color', this.value)"
                           style="width: 70px; font-size: 0.85rem;">
                </div>
                <div class="form-group-inline">
                    <label>Opacity:</label>
                    <input type="range" min="0" max="1" step="0.1" value="${colorData.opacity !== undefined ? colorData.opacity : 1}" 
                           onclick="event.stopPropagation()"
                           onchange="updateColorPreset('${colorName}', 'opacity', this.value)"
                           style="flex: 1;">
                    <span style="min-width: 30px; font-size: 0.85rem;">${colorData.opacity !== undefined ? colorData.opacity : 1}</span>
                </div>
                <div class="form-group-inline">
                    <label>Hue:</label>
                    <input type="range" min="-180" max="180" step="1" value="${colorData.hueShift || 0}" 
                           onclick="event.stopPropagation()"
                           oninput="this.nextElementSibling.textContent = this.value + '°'; updateColorPreset('${colorName}', 'hueShift', parseFloat(this.value))"
                           style="flex: 1;">
                    <span style="min-width: 36px; font-size: 0.85rem;">${colorData.hueShift || 0}°</span>
                </div>
                <div class="form-group-inline">
                    <label>H.Opa:</label>
                    <input type="range" min="0" max="1" step="0.1" value="${colorData.hueOpacity !== undefined ? colorData.hueOpacity : 0}" 
                           onclick="event.stopPropagation()"
                           oninput="this.nextElementSibling.textContent = parseFloat(this.value).toFixed(1); updateColorPreset('${colorName}', 'hueOpacity', parseFloat(this.value))"
                           style="flex: 1;">
                    <span style="min-width: 30px; font-size: 0.85rem;">${colorData.hueOpacity !== undefined ? colorData.hueOpacity.toFixed(1) : '0.0'}</span>
                </div>
            </div>
            
            <div id="imageSettings_${colorName}" class="color-settings-compact" style="display: ${!isBlend ? 'block' : 'none'};">
                <div class="form-group-inline">
                    <label>画像:</label>
                    <input type="text" id="colorImage_${colorName}" value="${colorData.image || ''}" 
                           onclick="event.stopPropagation()"
                           onchange="updateColorPreset('${colorName}', 'image', this.value)" 
                           style="flex: 1; font-size: 0.85rem;">
                    <button class="btn btn-small" onclick="event.stopPropagation(); selectColorImage('${colorName}')">参照</button>
                </div>
            </div>
        </div>
    `;
    
    // カード全体をクリックで選択
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn') && 
            !e.target.closest('input') && 
            !e.target.closest('select')) {
            selectColorPresetForPreview(colorName);
        }
    });
    
    return card;
}

// 色名変更
function renameColorPreset(oldName, newName) {
    if (oldName === newName) return;
    if (!newName) {
        alert('色名を入力してください');
        renderColorPresets();
        return;
    }
    if (state.editingPart.colors[newName]) {
        alert('その名前の色は既に存在します');
        renderColorPresets();
        return;
    }
    
    state.editingPart.colors[newName] = state.editingPart.colors[oldName];
    delete state.editingPart.colors[oldName];
    renderColorPresets();
}

// 色画像ファイル選択
function selectColorImage(colorName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const inputField = document.getElementById(`colorImage_${colorName}`);
            let relativePath = file.name;
            
            if (state.data.meta.projectRoot) {
                let fullPath = prompt(
                    '選択した画像の完全なパスを入力してください:\n' +
                    'ファイル名: ' + file.name,
                    state.data.meta.projectRoot + '/parts/'
                );
                
                if (fullPath) {
                    // ダブルクォーテーション、シングルクォーテーションを除去
                    fullPath = fullPath.replace(/^["']|["']$/g, '').trim();
                    
                    const rootPath = state.data.meta.projectRoot.replace(/\\/g, '/');
                    const normalizedPath = fullPath.replace(/\\/g, '/');
                    
                    if (normalizedPath.startsWith(rootPath)) {
                        relativePath = normalizedPath.substring(rootPath.length + 1);
                    } else {
                        relativePath = normalizedPath;
                    }
                }
            } else {
                alert('プロジェクトルートパスを設定すると、正しいパスを計算できます。');
            }
            
            if (inputField) {
                inputField.value = relativePath;
                updateColorPreset(colorName, 'image', relativePath);
            }
        }
    };
    input.click();
}

// 色タイプ切り替え
function switchColorType(colorName, type) {
    const blendSettings = document.getElementById(`blendSettings_${colorName}`);
    const imageSettings = document.getElementById(`imageSettings_${colorName}`);
    
    if (type === 'blend') {
        blendSettings.style.display = 'block';
        imageSettings.style.display = 'none';
        
        // ブレンドモード用の初期値
        state.editingPart.colors[colorName] = {
            blend: 'multiply',
            color: '#000000',
            opacity: 1
        };
    } else {
        blendSettings.style.display = 'none';
        imageSettings.style.display = 'block';
        
        // 画像用の初期値
        state.editingPart.colors[colorName] = {
            image: ''
        };
    }
    
    renderColorPresets();
    updatePreview(); // プレビュー更新
}

// カラープリセット更新
function updateColorPreset(colorName, field, value) {
    if (!state.editingPart.colors[colorName]) return;
    
    if (['opacity', 'hueShift', 'hueOpacity'].includes(field)) {
        state.editingPart.colors[colorName][field] = parseFloat(value);
    } else {
        state.editingPart.colors[colorName][field] = value;
    }
    
    // プレビューを更新
    updatePreview();
}

// カラープリセット追加
function addColorPreset() {
    if (!state.editingPart.colors) {
        state.editingPart.colors = {};
    }
    
    // 新しい色名を自動生成
    let index = 1;
    let colorName = 'color' + index;
    while (state.editingPart.colors[colorName]) {
        index++;
        colorName = 'color' + index;
    }
    
    // デフォルトでブレンドモード
    state.editingPart.colors[colorName] = {
        blend: 'multiply',
        color: '#000000',
        opacity: 1
    };
    
    // 新しく追加したプリセットを選択
    state.selectedColorPreset = colorName;
    
    renderColorPresets();
    updatePreview();
}

// 色プリセット選択（プレビュー用）
function selectColorPresetForPreview(colorName) {
    state.selectedColorPreset = colorName;
    renderColorPresets();
    updatePreview();
}

// カラープリセット削除
function deleteColorPreset(colorName) {
    if (!confirm(`色設定「${colorName}」を削除しますか？`)) return;
    
    delete state.editingPart.colors[colorName];
    
    // 削除した色が選択中だった場合、別のプリセットを選択
    if (state.selectedColorPreset === colorName) {
        const remaining = Object.keys(state.editingPart.colors);
        state.selectedColorPreset = remaining.length > 0 ? remaining[0] : null;
    }
    
    renderColorPresets();
    updatePreview();
}

// パーツ保存
function savePart() {
    if (!state.editingPart) return;
    
    // フォームから値を取得
    state.editingPart.id = document.getElementById('partId').value;
    state.editingPart.name = document.getElementById('partName').value;
    state.editingPart.category = document.getElementById('partCategory').value;
    state.editingPart.zIndex = parseInt(document.getElementById('partZIndex').value);
    
    // バリデーション
    const warnings = validatePart(state.editingPart);
    if (warnings.length > 0) {
        const proceed = confirm(`警告があります:\n${warnings.join('\n')}\n\n保存しますか？`);
        if (!proceed) return;
    }
    
    // 空配列プロパティをクリーンアップ
    if (state.editingPart.hides && state.editingPart.hides.length === 0) {
        delete state.editingPart.hides;
    }
    if (state.editingPart.unlocks && state.editingPart.unlocks.length === 0) {
        delete state.editingPart.unlocks;
    }
    
    // 既存パーツを更新 or 新規追加
    const existingIndex = state.data.parts.findIndex(p => p.id === state.editingPart.id);
    if (existingIndex >= 0) {
        state.data.parts[existingIndex] = state.editingPart;
    } else {
        state.data.parts.push(state.editingPart);
    }
    
    state.editingPart = null;
    renderParts();
    saveToLocalStorage();
    
    // カテゴリが選択されている場合はカテゴリ編集画面に戻る
    if (state.selectedCategory) {
        showCategoryEditor();
    } else {
        hideEditor();
    }
}

// パーツのバリデーション
function validatePart(part) {
    const warnings = [];
    
    // 必須フィールドチェック
    if (!part.id) {
        warnings.push('パーツIDが未設定です');
    }
    if (!part.name) {
        warnings.push('パーツ名が未設定です');
    }
    if (!part.category) {
        warnings.push('カテゴリが未設定です');
    }
    
    // ID重複チェック
    const duplicates = state.data.parts.filter(p => p.id === part.id && p !== part);
    if (duplicates.length > 0) {
        warnings.push(`パーツID「${part.id}」は既に存在します`);
    }
    
    // レイヤーチェック
    if (!part.layers || part.layers.length === 0) {
        warnings.push('レイヤーが1つも設定されていません');
    } else {
        part.layers.forEach((layer, index) => {
            if (!layer.file) {
                warnings.push(`レイヤー${index + 1}のファイルが未設定です`);
            }
        });
    }
    
    // カテゴリ存在チェック
    const categoryExists = state.data.categories.some(c => c.id === part.category);
    if (!categoryExists) {
        warnings.push(`カテゴリ「${part.category}」が存在しません`);
    }
    
    // requires存在チェック
    if (part.requires) {
        const requiredPartExists = state.data.parts.some(p => p.id === part.requires);
        if (!requiredPartExists) {
            warnings.push(`必須パーツ「${part.requires}」が存在しません`);
        }
    }
    
    // unlocks存在チェック
    if (part.unlocks && part.unlocks.length > 0) {
        part.unlocks.forEach(unlockId => {
            const categoryExists = state.data.categories.some(c => c.id === unlockId);
            const partExists = state.data.parts.some(p => p.id === unlockId);
            if (!categoryExists && !partExists) {
                warnings.push(`unlock「${unlockId}」が存在しません`);
            }
        });
    }
    
    return warnings;
}

// 全データのバリデーション
function validateAllData() {
    const warnings = [];
    
    // すべてのパーツをチェック
    state.data.parts.forEach(part => {
        const partWarnings = validatePart(part);
        if (partWarnings.length > 0) {
            warnings.push(`${part.name || part.id}:`);
            warnings.push(...partWarnings.map(w => '  - ' + w));
        }
    });
    
    // カテゴリ重複チェック
    const categoryIds = state.data.categories.map(c => c.id);
    const duplicateCategoryIds = categoryIds.filter((id, index) => categoryIds.indexOf(id) !== index);
    if (duplicateCategoryIds.length > 0) {
        warnings.push(`重複したカテゴリID: ${duplicateCategoryIds.join(', ')}`);
    }
    
    // 循環依存チェック
    const cycles = detectCircularDependencies();
    if (cycles.length > 0) {
        warnings.push('循環依存が検出されました:');
        warnings.push(...cycles.map(c => '  - ' + c));
    }
    
    return warnings;
}

// 循環依存の検出
function detectCircularDependencies() {
    const cycles = [];
    
    function checkCycle(partId, visited = new Set()) {
        if (visited.has(partId)) {
            return Array.from(visited).join(' -> ') + ' -> ' + partId;
        }
        
        const part = state.data.parts.find(p => p.id === partId);
        if (!part || !part.requires) return null;
        
        visited.add(partId);
        return checkCycle(part.requires, visited);
    }
    
    state.data.parts.forEach(part => {
        if (part.requires) {
            const cycle = checkCycle(part.id);
            if (cycle && !cycles.includes(cycle)) {
                cycles.push(cycle);
            }
        }
    });
    
    return cycles;
}

// 警告表示更新
function updateWarningsDisplay() {
    const warnings = validateAllData();
    document.getElementById('warningCount').textContent = warnings.length;
    
    const warningsList = document.getElementById('warningsList');
    if (warnings.length === 0) {
        warningsList.innerHTML = '<p style="color: #28a745;">問題は見つかりませんでした</p>';
    } else {
        warningsList.innerHTML = warnings.map(w => `<div class="warning-item">${w}</div>`).join('');
    }
}

// 編集キャンセル
function cancelEdit() {
    state.editingPart = null;
    
    // カテゴリが選択されている場合はカテゴリ編集画面に戻る
    if (state.selectedCategory) {
        showCategoryEditor();
    } else {
        hideEditor();
    }
}

// カテゴリ追加
function addCategory() {
    const name = prompt('カテゴリ名:');
    if (!name) return;
    
    const id = prompt('カテゴリID:', name.toLowerCase().replace(/\s+/g, '_'));
    if (!id) return;
    
    // 重複チェック
    if (state.data.categories.some(c => c.id === id)) {
        alert('そのIDは既に存在します');
        return;
    }
    
    const order = state.data.categories.length * 10;
    
    // 選択モード
    const selectionMode = confirm('複数選択可能なカテゴリにしますか？\n（アクセサリーなど）') ? 'multiple' : 'single';
    
    // 条件付き表示
    const hidden = confirm('条件付き表示カテゴリにしますか？\n（他のパーツ選択時に表示される）');
    
    const category = {
        id: id,
        name: name,
        order: order,
        selectionMode: selectionMode
    };
    
    if (hidden) {
        category.hidden = true;
    }
    
    state.data.categories.push(category);
    
    renderCategories();
    saveToLocalStorage();
}

// パーツ追加
function addPart() {
    if (!state.selectedCategory) {
        alert('カテゴリを選択してください');
        return;
    }
    
    state.editingPart = {
        id: '',
        name: '',
        category: state.selectedCategory,
        zIndex: 100,
        layers: []
    };
    
    showPartEditor();
    populateEditor();
}

// パーツ複製
function duplicatePart(partId) {
    const part = state.data.parts.find(p => p.id === partId);
    if (!part) return;
    
    const newPart = JSON.parse(JSON.stringify(part));
    newPart.id = part.id + '_copy';
    newPart.name = part.name + ' (コピー)';
    
    state.data.parts.push(newPart);
    renderParts();
    saveToLocalStorage();
}

// パーツ削除
function deletePart(partId) {
    if (!confirm('このパーツを削除しますか?')) return;
    
    state.data.parts = state.data.parts.filter(p => p.id !== partId);
    renderParts();
    saveToLocalStorage();
}

// プレビュー更新
function updatePreview() {
    // 色設定用のキャンバスとメインキャンバスの両方を更新
    const colorCanvas = document.getElementById('colorPreviewCanvas');
    const mainCanvas = elements.previewCanvas;
    
    // 両方のキャンバスを更新
    const canvases = [];
    
    // メインキャンバスは常に更新
    if (mainCanvas) {
        canvases.push(mainCanvas);
    }
    
    // 色プレビューキャンバスが表示されている場合は更新
    if (colorCanvas && colorCanvas.offsetParent !== null) {
        canvases.push(colorCanvas);
    }
    
    if (!state.selectedPart && !state.editingPart) {
        // 何も選択されていない - 両方をクリア
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        return;
    }
    
    const previewWithOthers = document.getElementById('previewWithOthers') && document.getElementById('previewWithOthers').checked;
    const layers = [];
    
    if (previewWithOthers) {
        // 他のパーツも含めて表示
        collectAllLayers(layers);
    } else {
        // 選択中/編集中のパーツのみ
        const part = state.editingPart || state.data.parts.find(p => p.id === state.selectedPart);
        if (part && part.layers) {
            // 選択中の色プリセットを取得
            let colorSettings = null;
            if (state.selectedColorPreset && state.selectedColorPreset !== 'default' && 
                part.colors && part.colors[state.selectedColorPreset]) {
                colorSettings = part.colors[state.selectedColorPreset];
            }
            
            part.layers.forEach(layer => {
                layers.push({
                    file: layer.file,
                    zIndex: layer.zIndex || part.zIndex,
                    animated: layer.animated,
                    blendMode: layer.blendMode,
                    side: layer.side,
                    colorSettings: colorSettings,
                    partId: part.id
                });
            });
        }
    }
    
    // zIndex順にソート
    layers.sort((a, b) => a.zIndex - b.zIndex);
    
    // 各キャンバスを描画
    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawLayers(ctx, layers);
    });
}

// 全レイヤーを収集（他パーツと重ねて表示用）
function collectAllLayers(layers) {
    const otherPartsSelector = document.getElementById('otherPartsSelector');
    
    // 各カテゴリで選択されているパーツを取得
    const selects = otherPartsSelector.querySelectorAll('select');
    const selectedParts = {};
    
    selects.forEach(select => {
        const categoryId = select.dataset.category;
        const partId = select.value;
        if (partId) {
            selectedParts[categoryId] = partId;
        }
    });
    
    // 編集中/選択中のパーツも追加（編集中のカテゴリを優先）
    if (state.editingPart) {
        // 編集中のパーツは常に最新の状態を使用
        selectedParts[state.editingPart.category] = '__EDITING__'; // 特殊マーカー
    } else if (state.selectedPart) {
        const part = state.data.parts.find(p => p.id === state.selectedPart);
        if (part) {
            selectedParts[part.category] = part.id;
        }
    }
    
    // レイヤーを収集
    for (let [categoryId, partId] of Object.entries(selectedParts)) {
        let part;
        
        // 編集中のパーツかチェック
        if (partId === '__EDITING__' && state.editingPart && state.editingPart.category === categoryId) {
            // 編集中のパーツ（未保存の変更を含む）
            part = state.editingPart;
        } else {
            // 保存済みのパーツ
            part = state.data.parts.find(p => p.id === partId);
        }
        
        if (part && part.layers) {
            part.layers.forEach(layer => {
                layers.push({
                    file: layer.file,
                    zIndex: layer.zIndex || part.zIndex,
                    animated: layer.animated,
                    blendMode: layer.blendMode,
                    side: layer.side,
                    partColors: part.colors,
                    partId: part.id
                });
            });
        }
    }
}

// レイヤーを描画
function drawLayers(ctx, layers) {
    if (layers.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('レイヤーを追加してください', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const validLayers = layers.filter(l => l.file);
    
    if (validLayers.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('画像ファイルを設定してください', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // すべての画像を読み込む
    let loadedCount = 0;
    let errorCount = 0;
    const loadedImages = [];
    
    validLayers.forEach((layer, index) => {
        const img = new Image();
        
        img.onload = function() {
            loadedImages[index] = { img, layer, loaded: true };
            loadedCount++;
            checkAndDraw();
        };
        
        img.onerror = function() {
            console.warn('画像の読み込みに失敗:', layer.file);
            loadedImages[index] = { img: null, layer, loaded: false };
            errorCount++;
            loadedCount++;
            checkAndDraw();
        };
        
        img.src = layer.file;
        loadedImages[index] = { img, layer, loaded: false };
    });
    
    // すべての画像が読み込まれたら描画
    function checkAndDraw() {
        if (loadedCount === validLayers.length) {
            // キャンバスをクリア
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // zIndex順にソート（小さい順 = 下から上）
            const sortedImages = loadedImages
                .filter(item => item.loaded)
                .sort((a, b) => a.layer.zIndex - b.layer.zIndex);
            
            // zIndex順に描画
            sortedImages.forEach(item => {
                const layerBlendMode = item.layer.blendMode || 'source-over';
                let drawTarget = null; // キャンバスに転写する画像 or tempCanvas

                if (item.layer.colorSettings) {
                    const colorSettings = item.layer.colorSettings;
                    
                    if (colorSettings.blend && colorSettings.color) {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = ctx.canvas.width;
                        tempCanvas.height = ctx.canvas.height;
                        const tempCtx = tempCanvas.getContext('2d');
                        
                        // ステップ1: 白背景 + img で完全不透明版を作成し、その上で blend 計算する
                        const opaqueCanvas = document.createElement('canvas');
                        opaqueCanvas.width = ctx.canvas.width;
                        opaqueCanvas.height = ctx.canvas.height;
                        const opaqueCtx = opaqueCanvas.getContext('2d');
                        opaqueCtx.fillStyle = '#ffffff';
                        opaqueCtx.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
                        opaqueCtx.drawImage(item.img, 0, 0);
                        opaqueCtx.globalCompositeOperation = colorSettings.blend;
                        opaqueCtx.fillStyle = colorSettings.color;
                        opaqueCtx.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
                        opaqueCtx.globalCompositeOperation = 'source-over';
                        // opaqueCanvas: 正確にブレンドされた RGB、alpha=1
                        
                        // ステップ2: 元画像を下地に、opaqueCanvas を source-atop + opacity で重ねる
                        //    source-atop: αr = αd（元の alpha を完全保持）
                        //                 RGB = lerp(original, blended, opacity)
                        tempCtx.drawImage(item.img, 0, 0);
                        tempCtx.globalCompositeOperation = 'source-atop';
                        tempCtx.globalAlpha = colorSettings.opacity !== undefined ? colorSettings.opacity : 1;
                        tempCtx.drawImage(opaqueCanvas, 0, 0);
                        tempCtx.globalAlpha = 1;
                        tempCtx.globalCompositeOperation = 'source-over';
                        
                        // ステップ3: 色相回転
                        if (colorSettings.hueShift && colorSettings.hueOpacity > 0) {
                            applyHueShiftEditor(tempCtx, tempCanvas.width, tempCanvas.height, colorSettings.hueShift, colorSettings.hueOpacity);
                        }
                        
                        drawTarget = tempCanvas;
                    } else {
                        drawTarget = item.img;
                    }
                } else {
                    drawTarget = item.img;
                }

                // レイヤーの合成モードを適用してキャンバスへ転写
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = layerBlendMode;
                ctx.drawImage(drawTarget, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
            });
            
            console.log(`プレビュー描画完了: ${sortedImages.length}/${validLayers.length}枚の画像を表示`);
            
            // エラーがあれば表示
            if (errorCount > 0) {
                ctx.fillStyle = '#dc3545';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'left';
                ctx.globalAlpha = 1;
                ctx.fillText(`${errorCount}個の画像が読み込めませんでした`, 10, 30);
                ctx.fillText('パスを確認してください', 10, 50);
                ctx.fillText('例: parts/basics/body/body1.png', 10, 70);
            }
        }
    }
}

// エディタ用色相回転処理（game.jsと同じアルゴリズム）
function applyHueShiftEditor(ctx, width, height, hueShift, hueOpacity) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const shift = hueShift / 360;
    
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) continue;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const hsl = _rgbToHsl(r, g, b);
        let newH = (hsl.h + shift) % 1.0;
        if (newH < 0) newH += 1.0;
        const newRgb = _hslToRgb(newH, hsl.s, hsl.l);
        pixels[i]     = Math.round(r + (newRgb.r - r) * hueOpacity);
        pixels[i + 1] = Math.round(g + (newRgb.g - g) * hueOpacity);
        pixels[i + 2] = Math.round(b + (newRgb.b - b) * hueOpacity);
    }
    ctx.putImageData(imageData, 0, 0);
}

function _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
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

function _hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
}

// 他パーツ選択UI更新
function updateOtherPartsSelector() {
    const checkbox = document.getElementById('previewWithOthers');
    const selector = document.getElementById('otherPartsSelector');
    
    if (!checkbox.checked) {
        selector.style.display = 'none';
        return;
    }
    
    selector.style.display = 'block';
    selector.innerHTML = '';
    
    // 現在編集中/選択中のカテゴリ以外を表示
    const currentCategory = state.editingPart ? state.editingPart.category : 
                           (state.selectedPart ? state.data.parts.find(p => p.id === state.selectedPart)?.category : null);
    
    const groups = state.data.categoryGroups || [];
    
    if (groups.length > 0) {
        // グループ表示
        
        // グループなしカテゴリを先に表示
        const ungroupedCategories = state.data.categories
            .filter(c => !c.group && c.id !== currentCategory)
            .sort((a, b) => a.order - b.order);
        
        ungroupedCategories.forEach(category => {
            createOtherPartSelector(category, selector);
        });
        
        // グループごとに表示
        groups.sort((a, b) => a.order - b.order).forEach(group => {
            const groupCategories = state.data.categories
                .filter(c => c.group === group.id && c.id !== currentCategory)
                .sort((a, b) => a.order - b.order);
            
            if (groupCategories.length > 0) {
                // グループヘッダー
                const groupHeader = document.createElement('div');
                groupHeader.className = 'other-parts-group-header';
                groupHeader.innerHTML = `<span class="group-toggle-small">▶</span> ${group.name}`;
                groupHeader.style.cursor = 'pointer';
                groupHeader.style.fontWeight = '600';
                groupHeader.style.fontSize = '0.9rem';
                groupHeader.style.padding = '0.5rem';
                groupHeader.style.marginTop = '0.5rem';
                groupHeader.style.background = '#ecf0f1';
                groupHeader.style.borderRadius = '4px';
                
                const groupId = `other-group-${group.id}`;
                
                groupHeader.addEventListener('click', () => {
                    const content = document.getElementById(groupId);
                    const toggle = groupHeader.querySelector('.group-toggle-small');
                    if (content.style.display === 'none') {
                        content.style.display = 'block';
                        toggle.textContent = '▼';
                    } else {
                        content.style.display = 'none';
                        toggle.textContent = '▶';
                    }
                });
                
                selector.appendChild(groupHeader);
                
                // グループコンテンツ（デフォルトで折りたたみ）
                const groupContent = document.createElement('div');
                groupContent.id = groupId;
                groupContent.style.marginLeft = '1rem';
                groupContent.style.display = 'none';
                
                groupCategories.forEach(category => {
                    createOtherPartSelector(category, groupContent);
                });
                
                selector.appendChild(groupContent);
            }
        });
    } else {
        // グループなしの場合は従来通り
        state.data.categories.forEach(category => {
            // 現在のカテゴリはスキップ
            if (category.id === currentCategory) return;
            
            createOtherPartSelector(category, selector);
        });
    }
}

// 他パーツ選択用のセレクトボックスを作成
function createOtherPartSelector(category, container) {
    const parts = state.data.parts.filter(p => p.category === category.id);
    if (parts.length === 0) return;
    
    const div = document.createElement('div');
    div.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = category.name + ':';
    label.style.fontSize = '0.85rem';
    div.appendChild(label);
    
    const select = document.createElement('select');
    select.dataset.category = category.id;
    select.addEventListener('change', updatePreview);
    select.style.fontSize = '0.85rem';
    
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'なし';
    select.appendChild(noneOption);
    
    parts.forEach(part => {
        const option = document.createElement('option');
        option.value = part.id;
        option.textContent = part.name;
        select.appendChild(option);
    });
    
    div.appendChild(select);
    container.appendChild(div);
}

// JSON読込
function loadJson() {
    elements.fileInput.click();
}

function handleJsonFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            state.data = JSON.parse(event.target.result);
            
            // キャンバスサイズを適用
            applyCanvasSize();
            
            renderCategories();
            renderParts();
            alert('JSONを読み込みました');
        } catch (error) {
            alert('JSONの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// JSON出力
function exportJson() {
    const json = JSON.stringify(state.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parts-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

// LocalStorage保存
function saveToLocalStorage() {
    localStorage.setItem('characterCreatorData', JSON.stringify(state.data));
    alert('保存しました');
}

// LocalStorage読込
function loadFromLocalStorage() {
    const saved = localStorage.getItem('characterCreatorData');
    if (saved) {
        try {
            state.data = JSON.parse(saved);
            
            // キャンバスサイズを適用
            applyCanvasSize();
        } catch (error) {
            console.error('LocalStorageの読み込みに失敗:', error);
        }
    }
}

// キャンバスサイズを適用
function applyCanvasSize() {
    if (state.data.meta) {
        elements.previewCanvas.width = state.data.meta.canvasWidth || 800;
        elements.previewCanvas.height = state.data.meta.canvasHeight || 900;
    }
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', init);