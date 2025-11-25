// グローバル変数
let peopleData = [];
let filteredData = [];
let editingIndex = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
});

// イベントリスナーの設定
function setupEventListeners() {
  // ファイル入力
  document.getElementById('file-input').addEventListener('change', handleFileSelect);

  // 新規追加ボタン
  document.getElementById('add-btn').addEventListener('click', openAddModal);

  // ダウンロードボタン
  document.getElementById('download-btn').addEventListener('click', downloadJSON);

  // 検索入力
  document.getElementById('search-input').addEventListener('input', handleSearch);

  // モーダルの閉じるボタン
  document.getElementById('modal-close').addEventListener('click', closeEditModal);
  document.getElementById('cancel-btn').addEventListener('click', closeEditModal);
  document.getElementById('delete-modal-close').addEventListener('click', closeDeleteModal);
  document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);

  // モーダル外クリックで閉じる
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
      closeEditModal();
    }
  });
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') {
      closeDeleteModal();
    }
  });

  // フォーム送信
  document.getElementById('edit-form').addEventListener('submit', handleFormSubmit);

  // 国の追加
  document.getElementById('add-country-btn').addEventListener('click', addCountryToForm);
  document.getElementById('new-country-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCountryToForm();
    }
  });

  // 死没日クリア
  document.getElementById('clear-death-btn').addEventListener('click', () => {
    document.getElementById('edit-death-date').value = '';
    document.getElementById('edit-death-uncertain').checked = false;
  });

  // 削除確認
  document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
}

// ファイル選択処理
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('file-name').textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      peopleData = data;
      filteredData = [...data];

      // UI更新
      document.getElementById('file-info').style.display = 'block';
      document.getElementById('data-count').textContent = peopleData.length;
      document.getElementById('actions-section').style.display = 'flex';
      document.getElementById('table-section').style.display = 'block';

      renderTable();
    } catch (error) {
      alert('JSONファイルの読み込みに失敗しました: ' + error.message);
    }
  };
  reader.readAsText(file);
}

// テーブルのレンダリング
function renderTable() {
  const tbody = document.getElementById('data-tbody');
  tbody.innerHTML = '';

  filteredData.forEach((person, index) => {
    const row = document.createElement('tr');

    // 名前
    const nameCell = document.createElement('td');
    nameCell.textContent = person.name;
    row.appendChild(nameCell);

    // 国
    const countriesCell = document.createElement('td');
    person.countries.forEach(country => {
      const tag = document.createElement('span');
      tag.className = 'country-tag';
      tag.textContent = country;
      countriesCell.appendChild(tag);
    });
    row.appendChild(countriesCell);

    // 生年月日
    const birthCell = document.createElement('td');
    if (person.birth) {
      birthCell.textContent = person.birth.date;
    } else {
      birthCell.textContent = '－';
    }
    row.appendChild(birthCell);

    // 死没年月日
    const deathCell = document.createElement('td');
    if (person.death) {
      deathCell.textContent = person.death.date;
    } else {
      deathCell.textContent = '－';
    }
    row.appendChild(deathCell);

    // 詳細不明
    const uncertainCell = document.createElement('td');
    const uncertainFlags = [];
    if (person.birth?.uncertain) uncertainFlags.push('生年');
    if (person.death?.uncertain) uncertainFlags.push('死没');
    if (uncertainFlags.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'uncertain-badge';
      badge.textContent = uncertainFlags.join(', ');
      uncertainCell.appendChild(badge);
    } else {
      uncertainCell.textContent = '－';
    }
    row.appendChild(uncertainCell);

    // 操作
    const actionCell = document.createElement('td');
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => openEditModal(index));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => openDeleteModal(index));

    actionButtons.appendChild(editBtn);
    actionButtons.appendChild(deleteBtn);
    actionCell.appendChild(actionButtons);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  });
}

// 検索処理
function handleSearch(event) {
  const query = event.target.value.toLowerCase();
  
  if (query === '') {
    filteredData = [...peopleData];
  } else {
    filteredData = peopleData.filter(person => 
      person.name.toLowerCase().includes(query)
    );
  }
  
  renderTable();
}

// 新規追加モーダルを開く
function openAddModal() {
  editingIndex = null;
  document.getElementById('modal-title').textContent = '新規人物を追加';
  clearForm();
  document.getElementById('edit-modal').style.display = 'flex';
}

// 編集モーダルを開く
function openEditModal(index) {
  editingIndex = index;
  document.getElementById('modal-title').textContent = '人物を編集';
  
  const person = filteredData[index];
  
  // フォームに値をセット
  document.getElementById('edit-name').value = person.name;
  
  // 国をセット
  const countriesContainer = document.getElementById('countries-container');
  countriesContainer.innerHTML = '';
  person.countries.forEach(country => {
    addCountryTag(country);
  });
  
  // 生年月日
  if (person.birth) {
    document.getElementById('edit-birth-date').value = person.birth.date;
    document.getElementById('edit-birth-uncertain').checked = person.birth.uncertain;
  } else {
    document.getElementById('edit-birth-date').value = '';
    document.getElementById('edit-birth-uncertain').checked = false;
  }
  
  // 死没年月日
  if (person.death) {
    document.getElementById('edit-death-date').value = person.death.date;
    document.getElementById('edit-death-uncertain').checked = person.death.uncertain;
  } else {
    document.getElementById('edit-death-date').value = '';
    document.getElementById('edit-death-uncertain').checked = false;
  }
  
  document.getElementById('edit-modal').style.display = 'flex';
}

// 編集モーダルを閉じる
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  clearForm();
}

// フォームをクリア
function clearForm() {
  document.getElementById('edit-name').value = '';
  document.getElementById('countries-container').innerHTML = '';
  document.getElementById('new-country-input').value = '';
  document.getElementById('edit-birth-date').value = '';
  document.getElementById('edit-birth-uncertain').checked = false;
  document.getElementById('edit-death-date').value = '';
  document.getElementById('edit-death-uncertain').checked = false;
}

// 国タグを追加
function addCountryTag(country) {
  const container = document.getElementById('countries-container');
  
  const item = document.createElement('div');
  item.className = 'country-item';
  
  const span = document.createElement('span');
  span.textContent = country;
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'country-remove';
  removeBtn.textContent = '×';
  removeBtn.type = 'button';
  removeBtn.addEventListener('click', () => {
    item.remove();
  });
  
  item.appendChild(span);
  item.appendChild(removeBtn);
  container.appendChild(item);
}

// 国を追加
function addCountryToForm() {
  const input = document.getElementById('new-country-input');
  const country = input.value.trim();
  
  if (country === '') return;
  
  // 重複チェック
  const existing = Array.from(document.querySelectorAll('.country-item span'))
    .map(span => span.textContent);
  
  if (existing.includes(country)) {
    alert('この国は既に追加されています');
    return;
  }
  
  addCountryTag(country);
  input.value = '';
  input.focus();
}

// フォーム送信処理
function handleFormSubmit(event) {
  event.preventDefault();
  
  // フォームから値を取得
  const name = document.getElementById('edit-name').value.trim();
  
  const countries = Array.from(document.querySelectorAll('.country-item span'))
    .map(span => span.textContent);
  
  const birthDate = document.getElementById('edit-birth-date').value;
  const birthUncertain = document.getElementById('edit-birth-uncertain').checked;
  
  const deathDate = document.getElementById('edit-death-date').value;
  const deathUncertain = document.getElementById('edit-death-uncertain').checked;
  
  // バリデーション
  if (name === '') {
    alert('名前を入力してください');
    return;
  }
  
  if (countries.length === 0) {
    alert('少なくとも1つの国を追加してください');
    return;
  }
  
  // 人物オブジェクトを作成
  const person = {
    name: name,
    countries: countries,
    birth: birthDate ? {
      date: birthDate,
      uncertain: birthUncertain
    } : null,
    death: deathDate ? {
      date: deathDate,
      uncertain: deathUncertain
    } : null
  };
  
  if (editingIndex === null) {
    // 新規追加
    peopleData.push(person);
  } else {
    // 編集
    const originalIndex = peopleData.findIndex(p => p === filteredData[editingIndex]);
    peopleData[originalIndex] = person;
  }
  
  // 検索状態を保持
  const searchQuery = document.getElementById('search-input').value;
  if (searchQuery) {
    filteredData = peopleData.filter(person => 
      person.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  } else {
    filteredData = [...peopleData];
  }
  
  // UI更新
  document.getElementById('data-count').textContent = peopleData.length;
  renderTable();
  closeEditModal();
}

// 削除モーダルを開く
function openDeleteModal(index) {
  editingIndex = index;
  const person = filteredData[index];
  document.getElementById('delete-person-name').textContent = person.name;
  document.getElementById('delete-modal').style.display = 'flex';
}

// 削除モーダルを閉じる
function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  editingIndex = null;
}

// 削除を確定
function confirmDelete() {
  const originalIndex = peopleData.findIndex(p => p === filteredData[editingIndex]);
  peopleData.splice(originalIndex, 1);
  
  // 検索状態を保持
  const searchQuery = document.getElementById('search-input').value;
  if (searchQuery) {
    filteredData = peopleData.filter(person => 
      person.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  } else {
    filteredData = [...peopleData];
  }
  
  // UI更新
  document.getElementById('data-count').textContent = peopleData.length;
  renderTable();
  closeDeleteModal();
}

// JSONをダウンロード
function downloadJSON() {
  const json = JSON.stringify(peopleData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  a.download = `data_${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}