/**
 * Misskey統合システム - misskey.js
 * 
 * 概要:
 * このファイルは、Misskey（分散型SNS）との統合機能を提供する
 * 包括的なJavaScriptモジュールです。RESTful APIとWebSocketを
 * 組み合わせて、リアルタイムなタイムライン表示と投稿機能を実現します。
 * 
 * 主要機能:
 * - タイムライン取得・表示（ローカル/グローバル/リスト/ホーム）
 * - リアルタイムストリーミング（WebSocket）
 * - 投稿機能（公開範囲指定対応）
 * - リアクション処理・表示
 * - カスタム絵文字対応
 * - ファイル添付表示
 * - インスタンス管理・切り替え
 * 
 * アーキテクチャ:
 * - MisskeyManagerクラス: API操作の中心
 * - 設定管理: ローカルストレージによる永続化
 * - エラーハンドリング: 包括的なエラー処理
 * - パフォーマンス最適化: 絵文字キャッシュ、接続管理
 * 
 * 依存関係:
 * - Fetch API (ES6+)
 * - WebSocket API
 * - LocalStorage API
 * 
 * 作成者: 100percent-health
 * 最終更新: 2025年8月21日
 */

// Misskey設定
const MISSKEY_CONFIG = {
  instance: localStorage.getItem('misskey_instance') || 'tanoshii.site',
  token: localStorage.getItem('misskey_token') || '',
  autoRefresh: localStorage.getItem('misskey_auto_refresh') === 'true',
  refreshInterval: parseInt(localStorage.getItem('misskey_refresh_interval')) || 30000 // 30秒
};

// Misskey API管理クラス
class MisskeyManager {
  constructor(instance, token) {
    this.instance = instance;
    this.token = token;
    this.apiBase = `https://${instance}/api`;
  }

  // ローカルタイムラインを取得
  async getLocalTimeline(limit = 20) {
    try {
      const requestBody = {
        limit: limit,
        includeMyRenotes: false,
        includeRenotedMyNotes: false,
        includeLocalRenotes: true,
        withFiles: false,
        withReactions: true,
        withRenotes: true,
        withReplies: false,
        withEmojis: true
      };
      
      const response = await fetch(`${this.apiBase}/notes/local-timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const notes = await response.json();
      console.log('ローカルタイムライン取得完了:', notes.length, '件');
      
      return notes;
    } catch (error) {
      console.error('ローカルタイムライン取得エラー:', error);
      return [];
    }
  }

  // グローバルタイムラインを取得
  async getGlobalTimeline(limit = 20) {
    try {
      const requestBody = {
        limit: limit,
        includeMyRenotes: false,
        includeRenotedMyNotes: false,
        includeLocalRenotes: false,
        withFiles: false,
        withReactions: true,
        withRenotes: true,
        withReplies: false,
        withEmojis: true
      };
      
      const response = await fetch(`${this.apiBase}/notes/global-timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const notes = await response.json();
      console.log('グローバルタイムライン取得完了:', notes.length, '件');
      
      return notes;
    } catch (error) {
      console.error('グローバルタイムライン取得エラー:', error);
      return [];
    }
  }

  // ユーザーのリストを取得
  async getLists() {
    if (!this.token) {
      console.warn('トークンが設定されていません');
      return [];
    }

    try {
      const requestBody = {
        i: this.token
      };
      
      const response = await fetch(`${this.apiBase}/users/lists/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('エラーレスポンス:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const lists = await response.json();
      console.log('リスト取得完了:', lists.length, '件');
      return lists;
    } catch (error) {
      console.error('リスト取得エラー:', error);
      return [];
    }
  }

  // 特定のリストの投稿を取得
  async getListNotes(listId, limit = 20) {
    if (!this.token) {
      console.warn('トークンが設定されていません');
      return [];
    }

    try {
      // 複数のAPIエンドポイントを試行して正しいものを特定
      const endpoints = [
        `/notes/user-list-timeline`,  // ユーザーリスト専用エンドポイント
        `/notes/list-timeline`,       // リスト専用エンドポイント
        `/notes/timeline`             // 汎用エンドポイント
      ];
      
      let notes = [];
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          const requestBody = {
            i: this.token,
            limit: limit
          };
          
          // エンドポイントに応じてパラメータを調整
          if (endpoint === '/notes/user-list-timeline') {
            requestBody.listId = listId;
          } else if (endpoint === '/notes/list-timeline') {
            requestBody.listId = listId;
          } else if (endpoint === '/notes/timeline') {
            // 汎用エンドポイントでは複数のパラメータを試行
            requestBody.listId = listId;
            requestBody.list = listId;  // 代替パラメータ名
            Object.assign(requestBody, {
              includeMyRenotes: false,
              includeRenotedMyNotes: false,
              includeLocalRenotes: false,
              withFiles: false
            });
          }
          
          const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          if (response.ok) {
            notes = await response.json();
            console.log(`リスト投稿取得成功 (${endpoint}):`, notes.length, '件');
            break;
          } else {
            const errorText = await response.text();
            lastError = new Error(`HTTP error! status: ${response.status} for ${endpoint}`);
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      
      if (notes.length === 0) {
        console.warn('すべてのエンドポイントが失敗しました');
        if (lastError) {
          throw lastError;
        }
      }
      
      return notes;
    } catch (error) {
      console.error('リスト投稿取得エラー:', error);
      return [];
    }
  }

  // ホームタイムラインを取得（フォローしているユーザーの投稿）
  async getHomeTimeline(limit = 20) {
    if (!this.token) {
      console.warn('ホームタイムラインにはトークンが必要です');
      return [];
    }

    try {
      const requestBody = {
        i: this.token,
        limit: limit,
        includeMyRenotes: false,
        includeRenotedMyNotes: false,
        includeLocalRenotes: false,
        withFiles: false,
        withReactions: true,
        withRenotes: true,
        withReplies: false,
        withEmojis: true
      };
      
      const response = await fetch(`${this.apiBase}/notes/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const notes = await response.json();
      console.log('ホームタイムライン取得完了:', notes.length, '件');
      
      return notes;
    } catch (error) {
      console.error('ホームタイムライン取得エラー:', error);
      return [];
    }
  }

  // 投稿のリアクション詳細情報を取得
  async getNoteReactions(noteId, limit = 100) {
    if (!this.token) {
      console.warn('リアクション詳細の取得にはトークンが必要です');
      return [];
    }

    try {
      const requestBody = {
        i: this.token,
        noteId: noteId,
        limit: limit
      };
      
      const response = await fetch(`${this.apiBase}/notes/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reactions = await response.json();
      console.log(`投稿 ${noteId} のリアクション詳細取得完了:`, reactions.length, '件');
      
      return reactions;
    } catch (error) {
      console.error(`投稿 ${noteId} のリアクション詳細取得エラー:`, error);
      return [];
    }
  }

  // 投稿を作成
  async createNote(text, visibility = 'public') {
    if (!this.token) {
      throw new Error('トークンが設定されていません');
    }

    try {
      const requestBody = {
        i: this.token,
        text: text,
        visibility: visibility
      };

      const response = await fetch(`${this.apiBase}/notes/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('投稿作成完了:', result.id);
      return result;
    } catch (error) {
      console.error('投稿作成エラー:', error);
      throw error;
    }
  }
}

// Misskeyマネージャーの初期化
const misskeyManager = new MisskeyManager(
  MISSKEY_CONFIG.instance, 
  MISSKEY_CONFIG.token
);

// ストリーミング関連の変数
let websocket = null;
let streamChannels = new Map(); // チャンネルIDとチャンネル情報のマップ
let capturedNotes = new Set(); // キャプチャ中の投稿ID
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Misskeyタイムラインを読み込む
async function loadMisskeyTimeline() {
  const timeline = document.getElementById('misskey-timeline');
  const timelineType = document.getElementById('timeline-type').value;
  
  timeline.innerHTML = '<div class="misskey-loading">読み込み中...</div>';
  
  try {
    let notes = [];
    
    switch (timelineType) {
      case 'home':
        if (MISSKEY_CONFIG.token) {
          console.log('ホームタイムラインを取得中...');
          notes = await misskeyManager.getHomeTimeline(20);
        } else {
          timeline.innerHTML = '<div class="misskey-empty">ホームタイムラインにはトークンが必要です</div>';
          return;
        }
        break;
      case 'local':
        console.log('ローカルタイムラインを取得中...');
        notes = await misskeyManager.getLocalTimeline(20);
        break;
      case 'global':
        console.log('グローバルタイムラインを取得中...');
        notes = await misskeyManager.getGlobalTimeline(20);
        break;
      case 'list':
        if (MISSKEY_CONFIG.token) {
          console.log('リストを取得中...');
          const lists = await misskeyManager.getLists();
          
          const selectedListId = document.getElementById('list-selector').value;
          
          if (selectedListId) {
            console.log('選択されたリストの投稿を取得中...');
            
            // リストIDが正しく設定されているか確認
            if (selectedListId.trim() === '') {
              console.warn('リストIDが空です');
              timeline.innerHTML = '<div class="misskey-empty">リストを選択してください</div>';
              return;
            }
            
            notes = await misskeyManager.getListNotes(selectedListId, 20);
          } else {
            console.warn('リストが選択されていません');
            timeline.innerHTML = '<div class="misskey-empty">リストを選択してください</div>';
            return;
          }
        } else {
          timeline.innerHTML = '<div class="misskey-empty">リスト表示にはトークンが必要です</div>';
          return;
        }
        break;
      default:
        notes = await misskeyManager.getLocalTimeline(20);
    }
    
    if (notes.length === 0) {
      timeline.innerHTML = '<div class="misskey-empty">投稿が見つかりません</div>';
      return;
    }
    
    renderMisskeyTimeline(notes, false);
    
  } catch (error) {
    console.error('Misskeyタイムライン読み込みエラー:', error);
    timeline.innerHTML = '<div class="misskey-empty">読み込みに失敗しました</div>';
  }
}

// Misskeyタイムラインを表示
function renderMisskeyTimeline(notes, isUpdate = false) {
  const timeline = document.getElementById('misskey-timeline');
  
  // リアクション情報をグローバルに保存
  if (!window.currentReactions) {
    window.currentReactions = {};
  }
  
  // 投稿から絵文字情報を抽出
  notes.forEach(note => {
    extractEmojisFromNote(note);
    // リノートがある場合も絵文字情報を抽出
    if (note.renote) {
      extractEmojisFromNote(note.renote);
    }
    
    // リアクション情報を保存
    if (note.reactions) {
      window.currentReactions[note.id] = note.reactions;
    }
  });
  
  if (isUpdate && notes.length > 0) {
    // 更新時は新しい投稿のみを追加
    const existingNotes = timeline.querySelectorAll('.misskey-note');
    const newNotes = notes.filter(note => {
      return !Array.from(existingNotes).some(existing => 
        existing.dataset.noteId === note.id
      );
    });
    
    if (newNotes.length === 0) {
      return;
    }
    
    console.log(`${newNotes.length}件の新しい投稿を追加`);
    
    // 新しい投稿を先頭に追加
    const newHtml = newNotes.map(note => createNoteHtml(note)).join('');
    timeline.insertAdjacentHTML('afterbegin', newHtml);
    
    // 古い投稿を削除して最大50件に制限
    const allNotes = timeline.querySelectorAll('.misskey-note');
    if (allNotes.length > 50) {
      const notesToRemove = allNotes.length - 50;
      for (let i = 0; i < notesToRemove; i++) {
        allNotes[allNotes.length - 1 - i].remove();
      }
    }
    
    // リアクションのマウスオーバー処理を設定
    setupReactionHoverEvents();
  } else {
    // 初回表示時
    const html = notes.map(note => createNoteHtml(note)).join('');
    timeline.innerHTML = html;
    
    // リアクションのマウスオーバー処理を設定
    setupReactionHoverEvents();
  }
  
  // 表示された投稿のリアクションを確認・更新
  setTimeout(() => {
    notes.forEach(note => {
      if (note.reactions && Object.keys(note.reactions).length > 0) {
        updateReactions(note.id, note.reactions);
      }
    });
  }, 100);
  
  // 表示された投稿をキャプチャ（ストリーミングが有効な場合）
  if (MISSKEY_CONFIG.autoRefresh) {
    notes.forEach(note => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        captureNote(note.id);
      } else {
        // WebSocket接続後にキャプチャを実行
        setTimeout(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            captureNote(note.id);
          }
        }, 1000);
      }
    });
  }
}

// リアクションのマウスオーバー処理を設定
function setupReactionHoverEvents() {
  const reactionItems = document.querySelectorAll('.reaction-item');
  
  reactionItems.forEach(reactionItem => {
    let hoverTimer = null;
    let currentTitle = reactionItem.getAttribute('title');
    
    // マウスオーバー時の処理
    reactionItem.addEventListener('mouseenter', async function() {
      const noteElement = this.closest('.misskey-note');
      if (!noteElement) return;
      
      const noteId = noteElement.dataset.noteId;
      const emoji = this.dataset.emoji;
      const count = parseInt(this.dataset.count);
      
      // 少し待ってから詳細情報を取得（即座に表示しない）
      hoverTimer = setTimeout(async () => {
        try {
          if (MISSKEY_CONFIG.token && count > 0) {
            const reactions = await misskeyManager.getNoteReactions(noteId, 50);
            
            // 特定の絵文字のリアクションをフィルタリング
            const filteredReactions = reactions.filter(r => r.reaction === emoji);
            
            if (filteredReactions.length > 0) {
              // ユーザー名のリストを作成
              const userNames = filteredReactions.map(r => r.user?.username || r.user?.name || '不明なユーザー');
              const uniqueUserNames = [...new Set(userNames)];
              
              // ツールチップを更新
              const tooltipText = `${emoji} - ${count}件のリアクション\n${uniqueUserNames.slice(0, 10).join(', ')}${uniqueUserNames.length > 10 ? '...' : ''}`;
              this.setAttribute('title', tooltipText);
            }
          }
        } catch (error) {
          console.error('リアクション詳細取得エラー:', error);
        }
      }, 500); // 500ms待機
    });
    
    // マウスアウト時の処理
    reactionItem.addEventListener('mouseleave', function() {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      
      // 元のタイトルに戻す
      this.setAttribute('title', currentTitle);
    });
  });
}

// 投稿HTMLを生成
function createNoteHtml(note) {
  const filesHtml = note.files && note.files.length > 0 ? createFilesHtml(note.files) : '';
  
  // リノートの処理
  let renoteHtml = '';
  if (note.renote) {
    // リノートの種類を判定
    const isQuoteRenote = note.text && note.text.trim() !== '';
    const renoteType = isQuoteRenote ? '引用リノート' : 'リノート';
    const renoteIcon = isQuoteRenote ? '💬' : '🔄';
    
    renoteHtml = `
      <div class="renote-indicator">
        <span class="renote-icon">${renoteIcon}</span>
        <span class="renote-text">${renoteType}</span>
      </div>
      <div class="renote-content">
        <div class="renote-header">
          <img src="${note.renote.user.avatarUrl}" class="avatar small" alt="${note.renote.user.name}" />
          <div class="user-info">
            <span class="display-name">${note.renote.user.name}</span>
            <span class="username">@${note.renote.user.username}@${note.renote.user.host || MISSKEY_CONFIG.instance}</span>
          </div>
          <span class="renote-timestamp">${formatDate(new Date(note.renote.createdAt))}</span>
        </div>
        <div class="renote-text-content">${renderCustomEmojis(note.renote.text || 'テキストなし')}</div>
        ${note.renote.files && note.renote.files.length > 0 ? createFilesHtml(note.renote.files) : ''}
      </div>
    `;
  }
  
  // リノートの場合のテキスト表示
  let noteText = '';
  if (note.renote) {
    // リノートの場合は、リノートした人のコメントを表示
    noteText = note.text || '';
  } else {
    // 通常の投稿の場合は、投稿内容を表示
    noteText = note.text || 'テキストなし';
  }
  
  // リアクションHTMLを生成（常に生成する）
  const reactionsHtml = createReactionsHtml(note.reactions);
  
  return `
    <div class="misskey-note" data-note-id="${note.id}">
      <div class="note-header">
        <img src="${note.user.avatarUrl}" class="avatar" alt="${note.user.name}" />
        <div class="user-info">
          <span class="display-name">${note.user.name}</span>
          <span class="username">@${note.user.username}@${note.user.host || MISSKEY_CONFIG.instance}</span>
        </div>
        <span class="timestamp">${formatDate(new Date(note.createdAt))}</span>
      </div>
      ${noteText ? `<div class="note-content" data-original-text="${noteText.replace(/"/g, '&quot;')}">${renderCustomEmojis(noteText)}</div>` : ''}
      ${renoteHtml}
      ${filesHtml}
      ${reactionsHtml}
    </div>
  `;
}

// ファイル・画像のHTMLを生成
function createFilesHtml(files) {
  if (!files || files.length === 0) return '';
  
  const filesHtml = files.map(file => {
    if (file.type.startsWith('image/')) {
      return `
        <div class="file-item">
          <img src="${file.url}" alt="${file.name}" class="file-image" onclick="showImageModal('${file.url}', '${file.name}')" />
          <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="file-item">
          <div class="file-icon">📎</div>
          <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
          </div>
        </div>
      `;
    }
  }).join('');
  
  return `<div class="files-container">${filesHtml}</div>`;
}

// ファイルサイズをフォーマット
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 画像モーダルを表示
function showImageModal(imageUrl, imageName) {
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('image-modal-content');
  
  modalImage.src = imageUrl;
  modalImage.alt = imageName;
  modal.style.display = 'block';
  
  // ESCキーでモーダルを閉じる（既存のリスナーを削除してから追加）
  const existingKeydownListener = document.onkeydown;
  document.onkeydown = function(e) {
    if (e.key === 'Escape') {
      closeImageModal();
      // 既存のリスナーがあれば実行
      if (existingKeydownListener) {
        existingKeydownListener.call(this, e);
      }
    }
  };
}

// 画像モーダルを閉じる
function closeImageModal() {
  const modal = document.getElementById('image-modal');
  modal.style.display = 'none';
}

// 画像をプリロード（読み込み速度向上）
function preloadImage(url) {
  const img = new Image();
  img.src = url;
}

// 画像の読み込みエラー処理
function handleImageError(img) {
  img.style.display = 'none';
  const errorDiv = document.createElement('div');
  errorDiv.className = 'file-info';
  errorDiv.innerHTML = '❌ 画像の読み込みに失敗しました';
  img.parentNode.appendChild(errorDiv);
}

// タイムラインタイプを変更
function changeMisskeyTimeline() {
  const timelineType = document.getElementById('timeline-type').value;
  const listSelector = document.getElementById('list-selector');
  
  // リスト選択時のみリストセレクターを表示
  if (timelineType === 'list') {
    listSelector.style.display = 'inline-block';
    // リストを読み込んでセレクターに設定
    loadListsToSelector();
  } else {
    listSelector.style.display = 'none';
    // リスト以外の場合は直接タイムラインを読み込み
    loadMisskeyTimeline();
  }
  
  // ストリーミングが有効な場合は新しいチャンネルに購読
  if (MISSKEY_CONFIG.autoRefresh && websocket && websocket.readyState === WebSocket.OPEN) {
    subscribeToCurrentChannel();
  }
}

// リストをセレクターに読み込む
async function loadListsToSelector() {
  if (!MISSKEY_CONFIG.token) {
    return;
  }
  
  try {
    const lists = await misskeyManager.getLists();
    const listSelector = document.getElementById('list-selector');
    
    // 既存のオプションをクリア（最初の「リストを選択...」は残す）
    listSelector.innerHTML = '<option value="">リストを選択...</option>';
    
    // リストを追加
    lists.forEach(list => {
      const option = document.createElement('option');
      option.value = list.id;
      option.textContent = list.name;
      listSelector.appendChild(option);
    });
    
    // 最初のリストを選択
    if (lists.length > 0) {
      listSelector.value = lists[0].id;
      
      // リスト選択後にタイムラインを読み込み
      setTimeout(() => {
        loadMisskeyTimeline();
      }, 100);
    }
  } catch (error) {
    console.error('リスト読み込みエラー:', error);
  }
}

// リスト変更時の処理
function changeList() {
  loadMisskeyTimeline();
}

// トークン設定を表示
function showTokenSettings() {
  const modal = document.getElementById('misskey-settings-modal');
  const instanceInput = document.getElementById('misskey-instance');
  const tokenInput = document.getElementById('misskey-token');
  
  // 現在の設定を表示
  instanceInput.value = MISSKEY_CONFIG.instance;
  tokenInput.value = MISSKEY_CONFIG.token;
  
  modal.style.display = 'block';
}

// トークン設定を閉じる
function closeTokenSettings() {
  const modal = document.getElementById('misskey-settings-modal');
  modal.style.display = 'none';
}

// Misskey設定を保存
function saveMisskeySettings() {
  const instanceInput = document.getElementById('misskey-instance');
  const tokenInput = document.getElementById('misskey-token');
  
  const newInstance = instanceInput.value.trim();
  const newToken = tokenInput.value.trim();
  
  if (!newInstance) {
    alert('インスタンスURLを入力してください');
    return;
  }
  
  // 設定を保存
  MISSKEY_CONFIG.instance = newInstance;
  MISSKEY_CONFIG.token = newToken;
  
  localStorage.setItem('misskey_instance', newInstance);
  localStorage.setItem('misskey_token', newToken);
  
  // マネージャーを再初期化
  misskeyManager.instance = newInstance;
  misskeyManager.token = newToken;
  misskeyManager.apiBase = `https://${newInstance}/api`;
  
  // 投稿フォームの表示状態を更新
  updatePostFormVisibility();
  
  // 設定を閉じる
  closeTokenSettings();
  
  // タイムラインを再読み込み
  loadMisskeyTimeline();
  
  console.log('Misskey設定を保存しました');
}

// 自動更新の切り替え
function toggleAutoRefresh() {
  const button = document.getElementById('auto-refresh-btn');
  const indicator = document.getElementById('update-indicator');
  
  if (MISSKEY_CONFIG.autoRefresh) {
    // 自動更新を停止
    MISSKEY_CONFIG.autoRefresh = false;
    localStorage.setItem('misskey_auto_refresh', 'false');
    
    button.textContent = 'ストリーミング開始';
    button.classList.remove('active');
    
    if (indicator) {
      indicator.style.display = 'none';
    }
    
    stopStreaming();
  } else {
    // 自動更新を開始
    MISSKEY_CONFIG.autoRefresh = true;
    localStorage.setItem('misskey_auto_refresh', 'true');
    
    button.textContent = 'ストリーミング停止';
    button.classList.add('active');
    
    if (indicator) {
      indicator.style.display = 'block';
    }
    
    startStreaming();
  }
}

// ストリーミング開始
async function startStreaming() {
  if (!MISSKEY_CONFIG.token) {
    console.warn('ストリーミングにはトークンが必要です');
    return;
  }
  
  try {
    await connectWebSocket();
  } catch (error) {
    console.error('ストリーミング開始エラー:', error);
  }
}

// ストリーミング停止
function stopStreaming() {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  
  // キャプチャ中の投稿をクリア
  capturedNotes.clear();
  
  // 接続タイマーをクリア
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  reconnectAttempts = 0;
  
  console.log('ストリーミングを停止しました');
}

// WebSocket接続
function connectWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      const wsUrl = `wss://${MISSKEY_CONFIG.instance}/streaming?i=${MISSKEY_CONFIG.token}`;
      websocket = new WebSocket(wsUrl);
      
      websocket.onopen = function(event) {
        console.log('WebSocket接続が確立されました');
        reconnectAttempts = 0;
        
        // 現在のチャンネルに購読
        subscribeToCurrentChannel();
        
        resolve();
      };
      
      websocket.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'channel') {
            handleChannelMessage(data.body);
          }
        } catch (error) {
          console.error('WebSocketメッセージ処理エラー:', error);
        }
      };
      
      websocket.onclose = function(event) {
        console.log('WebSocket接続が閉じられました:', event.code, event.reason);
        handleWebSocketClose();
      };
      
      websocket.onerror = function(error) {
        console.error('WebSocketエラー:', error);
        reject(error);
      };
      
    } catch (error) {
      reject(error);
    }
  });
}

// チャンネルメッセージを処理
function handleChannelMessage(body) {
  if (body.type === 'channel') {
    const channelId = body.id;
    const channelInfo = streamChannels.get(channelId);
    
    if (!channelInfo) {
      console.warn(`不明なチャンネルIDが受信: ${channelId}`);
      return;
    }

    if (body.body.type === 'note') {
      const note = body.body.note;
      if (note.id) {
        // キャプチャされていない投稿の場合のみ更新
        if (!capturedNotes.has(note.id)) {
          updateReactions(note.id, note.reactions);
          renderMisskeyTimeline([note], true); // リアルタイム更新として扱う
        }
      }
    } else if (body.body.type === 'reaction') {
      const noteId = body.body.noteId;
      const reaction = body.body.reaction;
      if (noteId) {
        updateReactions(noteId, reaction);
      }
    }
  }
}

// チャンネルに購読
function subscribeToChannel(channelName, params) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket接続が確立されていません');
    return;
  }
  
  const channelId = generateChannelId();
  const message = {
    type: 'connect',
    body: {
      channel: channelName,
      id: channelId,
      params: params
    }
  };
  
  try {
    websocket.send(JSON.stringify(message));
    
    // チャンネル情報を保存
    streamChannels.set(channelId, {
      name: channelName,
      params: params
    });
    
    console.log(`チャンネル ${channelName} に購読しました (ID: ${channelId})`);
  } catch (error) {
    console.error(`チャンネル ${channelName} の購読エラー:`, error);
  }
}

// チャンネルから切断
function disconnectChannel(channelId) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  const message = {
    type: 'disconnect',
    body: {
      id: channelId
    }
  };
  
  try {
    websocket.send(JSON.stringify(message));
    streamChannels.delete(channelId);
    console.log(`チャンネル ${channelId} から切断しました`);
  } catch (error) {
    console.error(`チャンネル ${channelId} の切断エラー:`, error);
  }
}

// チャンネルIDを生成
function generateChannelId() {
  return 'channel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// WebSocket接続が閉じられた時の処理
function handleWebSocketClose() {
  if (MISSKEY_CONFIG.autoRefresh && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    console.log(`WebSocket再接続を試行中... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
      if (MISSKEY_CONFIG.autoRefresh) {
        connectWebSocket().catch(handleConnectionError);
      }
    }, 5000 * reconnectAttempts); // 指数バックオフ
  } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('WebSocket再接続の最大試行回数に達しました');
    const button = document.getElementById('auto-refresh-btn');
    if (button) {
      button.textContent = '再接続失敗';
      button.classList.add('error');
    }
  }
}

// 接続エラー処理
function handleConnectionError() {
  console.error('WebSocket接続エラー');
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    handleWebSocketClose();
  }
}

// ヘッダーの折りたたみ/展開を切り替え
function toggleHeader() {
  const header = document.getElementById('misskey-header');
  const toggleBtn = document.getElementById('header-toggle-btn');
  
  if (header.classList.contains('collapsed')) {
    // 展開
    header.classList.remove('collapsed');
    toggleBtn.classList.remove('collapsed');
    toggleBtn.classList.add('expanded');
    toggleBtn.title = 'ヘッダーを縮小';
    localStorage.setItem('misskey_header_collapsed', 'false');
  } else {
    // 折りたたみ
    header.classList.add('collapsed');
    toggleBtn.classList.remove('expanded');
    toggleBtn.classList.add('collapsed');
    toggleBtn.title = 'ヘッダーを展開';
    localStorage.setItem('misskey_header_collapsed', 'true');
  }
}

// カスタム絵文字をレンダリング
function renderCustomEmojis(text) {
  if (!text) return '';
  
  // カスタム絵文字のパターンを検出（:emoji_name:形式）
  const emojiPattern = /:([a-zA-Z0-9_]+):/g;
  
  return text.replace(emojiPattern, (match, emojiName) => {
    const emoji = findCustomEmoji(emojiName);
    if (emoji) {
      return `<img src="${emoji.url}" alt="${emojiName}" class="custom-emoji" title="${emojiName}" />`;
    }
    return match; // 見つからない場合は元のテキストを返す
  });
}

// カスタム絵文字を検索
function findCustomEmoji(emojiName) {
  if (!window.globalEmojiDict) {
    window.globalEmojiDict = {};
  }
  
  return window.globalEmojiDict[emojiName];
}

// 投稿から絵文字情報を抽出
function extractEmojisFromNote(note) {
  if (!note || !note.text) return;
  
  // カスタム絵文字のパターンを検出
  const emojiPattern = /:([a-zA-Z0-9_]+):/g;
  const matches = note.text.match(emojiPattern);
  
  if (matches) {
    matches.forEach(match => {
      const emojiName = match.slice(1, -1); // :emoji_name: から emoji_name を抽出
      
      // 既に取得済みでない場合のみ取得
      if (!window.globalEmojiDict[emojiName]) {
        fetchEmojiFromServer(emojiName);
      }
    });
  }
}

// サーバーから絵文字を取得
async function fetchEmojiFromServer(emojiName) {
  try {
    // 既に取得済みの場合はスキップ
    if (window.globalEmojiDict[emojiName]) {
      return;
    }
    
    // この絵文字の取得を開始したことを記録
    if (!window.emojiFetchCache) {
      window.emojiFetchCache = new Set();
    }
    
    if (window.emojiFetchCache.has(emojiName)) {
      return;
    }
    
    window.emojiFetchCache.add(emojiName);
    
    // 現在のインスタンスから絵文字一覧を取得
    const currentInstance = MISSKEY_CONFIG.instance;
    await fetchEmojisFromInstance(currentInstance);
    
    // 再度チェック
    if (window.globalEmojiDict[emojiName]) {
      return;
    }
    
    // リモートインスタンスからも取得を試行
    if (emojiName.includes('@')) {
      const remoteInstance = emojiName.split('@')[1];
      if (remoteInstance && remoteInstance !== currentInstance) {
        await fetchEmojisFromInstance(remoteInstance);
      }
    }
    
  } catch (error) {
    console.error(`絵文字 ${emojiName} の取得エラー:`, error);
  }
}

// インスタンスから絵文字一覧を取得
async function fetchEmojisFromInstance(instance) {
  try {
    const response = await fetch(`https://${instance}/api/emojis`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const emojis = await response.json();
    
    // グローバル辞書に追加
    if (!window.globalEmojiDict) {
      window.globalEmojiDict = {};
    }
    
    emojis.forEach(emoji => {
      window.globalEmojiDict[emoji.name] = emoji;
    });
    
    // ローカルストレージに保存
    saveEmojiDict();
    
    console.log(`インスタンス ${instance} から ${emojis.length} 件の絵文字を取得しました`);
    
  } catch (error) {
    console.error(`インスタンス ${instance} からの絵文字取得エラー:`, error);
  }
}

// 絵文字辞書をローカルストレージに保存
function saveEmojiDict() {
  try {
    if (window.globalEmojiDict) {
      localStorage.setItem('misskey_emoji_dict', JSON.stringify(window.globalEmojiDict));
    }
  } catch (error) {
    console.error('絵文字辞書の保存エラー:', error);
  }
}

// 絵文字辞書をリセット
function resetEmojiDict() {
  window.globalEmojiDict = {};
  localStorage.removeItem('misskey_emoji_dict');
  console.log('絵文字辞書をリセットしました');
}

// インスタンスタイプを検出
function detectInstanceType(instance) {
  // インスタンスの種類を判定（Misskey、Mastodon、Pleroma等）
  // 現在はMisskeyを想定
  return 'misskey';
}

// リアクション用のHTMLを生成
function createReactionsHtml(reactions) {
  // リアクションが存在しない場合でも空のコンテナを生成
  if (!reactions || Object.keys(reactions).length === 0) {
    return '<div class="note-reactions"></div>';
  }

  const reactionsArray = Object.entries(reactions).map(([emoji, count]) => ({
    emoji: emoji,
    count: count
  }));

  // カウントの多い順にソート
  reactionsArray.sort((a, b) => b.count - a.count);

  const reactionsHtml = reactionsArray.map(reaction => {
    // カスタム絵文字かどうかを判定
    const isCustomEmoji = reaction.emoji.startsWith(':') && reaction.emoji.endsWith(':');
    
    if (isCustomEmoji) {
      const emojiName = reaction.emoji.slice(1, -1);
      
      // ローカルカスタム絵文字の場合（@.で終わる）を正しい名前に変換
      let correctedEmojiName = emojiName;
      if (emojiName.endsWith('@.')) {
        correctedEmojiName = emojiName.slice(0, -2); // @.を除去
      }
      
      // まず、元の名前（@domain.comを含む）で検索
      let emoji = findCustomEmoji(emojiName);
      if (!emoji && correctedEmojiName !== emojiName) {
        // 見つからない場合は、修正された名前で検索
        emoji = findCustomEmoji(correctedEmojiName);
      }
      
      // リモート絵文字の場合、ドメイン部分を除去して検索を試行
      if (!emoji && emojiName.includes('@') && !emojiName.endsWith('@.')) {
        const baseEmojiName = emojiName.split('@')[0];
        emoji = findCustomEmoji(baseEmojiName);
      }
      
      if (emoji) {
        const emojiDisplayName = emoji.name || reaction.emoji;
        return `<span class="reaction-item" data-emoji="${reaction.emoji}" data-count="${reaction.count}" title="${emojiDisplayName} - ${reaction.count}件のリアクション${emoji.name ? ` (${emoji.name})` : ''}">
          <img src="${emoji.url}" alt="${emojiDisplayName}" class="reaction-emoji" />
          <span class="reaction-count">${reaction.count}</span>
        </span>`;
      } else {
        // 絵文字が見つからない場合は、サーバーから取得を試行
        if (emojiName.includes('@') && !emojiName.endsWith('@.')) {
          // リアクション専用のリモート絵文字取得を呼び出し
          fetchRemoteEmojiForReaction(emojiName);
        } else if (correctedEmojiName !== emojiName) {
          fetchEmojiFromServer(correctedEmojiName);
        }
      }
    }
    
    // 通常の絵文字またはカスタム絵文字が見つからない場合
    const emojiDisplayName = reaction.emoji.startsWith(':') && reaction.emoji.endsWith(':') 
      ? reaction.emoji.slice(1, -1) 
      : reaction.emoji;
    return `<span class="reaction-item" data-emoji="${reaction.emoji}" data-count="${reaction.count}" title="${emojiDisplayName} - ${reaction.count}件のリアクション">
      <span class="reaction-emoji-text">${reaction.emoji}</span>
      <span class="reaction-count">${reaction.count}</span>
    </span>`;
  }).join('');

  return `<div class="note-reactions">${reactionsHtml}</div>`;
}

// リアクションを更新
function updateReactions(noteId, reactions) {
  // リアクション情報をグローバルに保存
  if (!window.currentReactions) {
    window.currentReactions = {};
  }
  window.currentReactions[noteId] = reactions;
  
  // リアクションから絵文字情報を抽出（本文に含まれていないリモート絵文字も取得）
  if (reactions && Object.keys(reactions).length > 0) {
    extractEmojisFromReactions(reactions, noteId);
  }
  
  const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
  if (!noteElement) {
    console.warn(`リアクション更新対象の投稿が見つかりません: ${noteId}`);
    return;
  }

  let reactionsContainer = noteElement.querySelector('.note-reactions');
  
  // リアクションコンテナが存在しない場合は作成
  if (!reactionsContainer) {
    reactionsContainer = document.createElement('div');
    reactionsContainer.className = 'note-reactions';
    noteElement.appendChild(reactionsContainer);
  }
  
  // リアクションHTMLを生成
  const newReactionsHtml = createReactionsHtml(reactions);
  
  // 既存のリアクションを置き換え
  const cleanHtml = newReactionsHtml.replace('<div class="note-reactions">', '').replace('</div>', '');
  reactionsContainer.innerHTML = cleanHtml;
  
  // リアクションのマウスオーバー処理を再設定
  setupReactionHoverEvents();
}

// 日付をフォーマット
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}分前`;
  } else if (hours < 24) {
    return `${hours}時間前`;
  } else if (days < 7) {
    return `${days}日前`;
  } else {
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  }
}

// 投稿フォームを初期化
function initializePostForm() {
  const postText = document.getElementById('post-text');
  const postCharCount = document.getElementById('post-char-count');
  const postSubmitBtn = document.getElementById('post-submit-btn');
  const postVisibility = document.getElementById('post-visibility');
  
  // 文字数カウント
  postText.addEventListener('input', function() {
    const length = this.value.length;
    postCharCount.textContent = length;
    postSubmitBtn.disabled = length === 0;
  });
  
  // Enterキーで投稿
  postText.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      submitPost();
    }
  });
  
  // 公開範囲変更時の処理
  postVisibility.addEventListener('change', function() {
    // 必要に応じて追加の処理を実装
  });
  
  // キーボードショートカットを設定
  setupKeyboardShortcuts();
}

// キーボードショートカットを設定
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // nキーで投稿フォームを開く
    if (e.key === 'n' && !isTextInputFocused()) {
      e.preventDefault();
      openPostForm();
    }
  });
}

// テキスト入力フィールドにフォーカスが当たっているかチェック
function isTextInputFocused() {
  const activeElement = document.activeElement;
  return activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.contentEditable === 'true'
  );
}

// 投稿フォームを開く
function openPostForm() {
  const postForm = document.getElementById('post-form');
  const postText = document.getElementById('post-text');
  
  // フォームが折りたたまれている場合は展開
  if (postForm.classList.contains('collapsed')) {
    togglePostForm();
  }
  
  // フォームが非表示の場合は表示
  if (postForm.style.display === 'none') {
    postForm.style.display = 'block';
  }
  
  // テキストエリアにフォーカス
  setTimeout(() => {
    postText.focus();
    postText.setSelectionRange(postText.value.length, postText.value.length);
  }, 100);
}

// 投稿フォームの折りたたみ/展開を切り替え
function togglePostForm() {
  const postForm = document.getElementById('post-form');
  const toggleBtn = document.getElementById('post-form-toggle-btn');
  const toggleIcon = toggleBtn.querySelector('.toggle-icon');
  const postText = document.getElementById('post-text');
  
  if (postForm.classList.contains('collapsed')) {
    // 展開
    postForm.classList.remove('collapsed');
    toggleIcon.textContent = '▼';
    toggleBtn.title = '投稿フォームを折りたたむ';
    localStorage.setItem('misskey_post_form_collapsed', 'false');
    
    // 展開後にテキストエリアにフォーカス
    setTimeout(() => {
      postText.focus();
      postText.setSelectionRange(postText.value.length, postText.value.length);
    }, 100);
  } else {
    // 折りたたみ
    postForm.classList.add('collapsed');
    toggleIcon.textContent = '▶';
    toggleBtn.title = '投稿フォームを展開';
    localStorage.setItem('misskey_post_form_collapsed', 'true');
  }
}

// 投稿フォームの表示/非表示を更新
function updatePostFormVisibility() {
  const postForm = document.getElementById('post-form');
  const postText = document.getElementById('post-text');
  const postSubmitBtn = document.getElementById('post-submit-btn');
  
  if (MISSKEY_CONFIG.token) {
    postForm.style.display = 'block';
    postText.placeholder = 'いまどうしてる？';
    postSubmitBtn.disabled = true;
    
    // 折りたたみ状態を復元（トークン設定後）
    const savedCollapsed = localStorage.getItem('misskey_post_form_collapsed') === 'true';
    if (savedCollapsed && !postForm.classList.contains('collapsed')) {
      togglePostForm();
    }
  } else {
    postForm.style.display = 'none';
  }
}

// 投稿を送信
async function submitPost() {
  const postText = document.getElementById('post-text');
  const postSubmitBtn = document.getElementById('post-submit-btn');
  const postFormStatus = document.getElementById('post-form-status');
  const postVisibility = document.getElementById('post-visibility');
  
  const text = postText.value.trim();
  const visibility = postVisibility.value;
  
  if (!text) {
    return;
  }

  if (!MISSKEY_CONFIG.token) {
    postFormStatus.textContent = 'トークンが設定されていません';
    postFormStatus.className = 'post-form-status error';
    return;
  }

  try {
    // 投稿ボタンを無効化してローディング状態に
    postSubmitBtn.disabled = true;
    postSubmitBtn.textContent = '投稿中...';
    postSubmitBtn.className = 'post-submit-btn loading';
    postFormStatus.textContent = '投稿中...';
    postFormStatus.className = 'post-form-status loading';

    // 投稿を作成（公開範囲を指定）
    const result = await misskeyManager.createNote(text, visibility);
    
    // 成功時の処理
    postFormStatus.textContent = '投稿完了！';
    postFormStatus.className = 'post-form-status success';
    postSubmitBtn.className = 'post-submit-btn success';
    postSubmitBtn.textContent = '投稿完了';
    
    // 投稿フォームをクリア
    postText.value = '';
    postText.dispatchEvent(new Event('input')); // 文字数カウントを更新
    
    // タイムラインを更新
    setTimeout(() => {
      loadMisskeyTimeline();
    }, 1000);
    
    // 3秒後にボタンを元に戻す
    setTimeout(() => {
      postSubmitBtn.disabled = false;
      postSubmitBtn.textContent = '投稿';
      postSubmitBtn.className = 'post-submit-btn';
      postFormStatus.textContent = '';
      postFormStatus.className = 'post-form-status';
    }, 3000);
    
  } catch (error) {
    // エラー時の処理
    console.error('投稿エラー:', error);
    postFormStatus.textContent = `投稿に失敗しました: ${error.message}`;
    postFormStatus.className = 'post-form-status error';
    postSubmitBtn.className = 'post-submit-btn error';
    postSubmitBtn.textContent = '投稿失敗';
    
    // 3秒後にボタンを元に戻す
    setTimeout(() => {
      postSubmitBtn.disabled = false;
      postSubmitBtn.textContent = '投稿';
      postSubmitBtn.className = 'post-submit-btn';
      postFormStatus.textContent = '';
      postFormStatus.className = 'post-form-status';
    }, 3000);
  }
}

// リアクションから絵文字情報を抽出して、辞書にない場合はサーバーから取得を試行
function extractEmojisFromReactions(reactions, noteId) {
  if (!reactions || Object.keys(reactions).length === 0) {
    return;
  }
  
  const reactionEmojis = Object.keys(reactions);
  reactionEmojis.forEach(emoji => {
    // カスタム絵文字の場合（:emoji_name:形式）
    if (emoji.startsWith(':') && emoji.endsWith(':')) {
      const emojiName = emoji.slice(1, -1);
      
      // ローカルカスタム絵文字の場合（@.で終わる）を正しい名前に変換
      let correctedEmojiName = emojiName;
      if (emojiName.endsWith('@.')) {
        correctedEmojiName = emojiName.slice(0, -2); // @.を除去
      }
      
      // 辞書にない場合はサーバーから取得を試行
      if (!window.globalEmojiDict[emojiName] && !window.globalEmojiDict[correctedEmojiName]) {
        // リモート絵文字の場合は、元の名前（@domain.comを含む）で検索
        if (emojiName.includes('@') && !emojiName.endsWith('@.')) {
          // ベース名でも検索を試行
          const baseEmojiName = emojiName.split('@')[0];
          if (window.globalEmojiDict[baseEmojiName]) {
            window.globalEmojiDict[emojiName] = window.globalEmojiDict[baseEmojiName];
          } else {
            // リモート絵文字専用の取得処理
            fetchRemoteEmojiForReaction(emojiName);
          }
        } else {
          // ローカル絵文字の場合は、修正された名前で検索
          fetchEmojiFromServer(correctedEmojiName);
        }
      }
    }
  });
}

// リアクション専用のリモート絵文字取得
async function fetchRemoteEmojiForReaction(emojiName) {
  try {
    // 既に取得済みの場合はスキップ
    if (window.globalEmojiDict[emojiName]) {
      return;
    }
    
    // この絵文字の取得を開始したことを記録
    if (!window.emojiFetchCache) {
      window.emojiFetchCache = new Set();
    }
    
    if (window.emojiFetchCache.has(emojiName)) {
      return;
    }
    
    window.emojiFetchCache.add(emojiName);
    
    // 現在のインスタンスから絵文字一覧を取得して、リモート絵文字を探す
    const currentInstance = MISSKEY_CONFIG.instance;
    await fetchEmojisFromInstance(currentInstance);
    
    // 再度チェック
    if (window.globalEmojiDict[emojiName]) {
      return;
    }
    
    // ベース名での検索も試行
    const baseEmojiName = emojiName.split('@')[0];
    if (window.globalEmojiDict[baseEmojiName]) {
      // ベース名の絵文字をリモート絵文字名でも利用可能にする
      window.globalEmojiDict[emojiName] = window.globalEmojiDict[baseEmojiName];
      saveEmojiDict();
      return;
    }
    
  } catch (error) {
    console.error(`リアクション専用: リモート絵文字 ${emojiName} の取得エラー:`, error);
  }
}

// 初期化時に投稿フォームの表示状態を更新
updatePostFormVisibility();

// 投稿をキャプチャ（ストリーミング用）
function captureNote(noteId) {
  if (!noteId) return;
  
  // 既にキャプチャ済みの場合はスキップ
  if (capturedNotes.has(noteId)) {
    return;
  }
  
  // キャプチャリストに追加
  capturedNotes.add(noteId);
  console.log(`投稿 ${noteId} をキャプチャしました`);
}

// 現在のチャンネルに購読
function subscribeToCurrentChannel() {
  const timelineType = document.getElementById('timeline-type').value;
  
  // 既存のチャンネルから切断
  streamChannels.forEach((channelInfo, channelId) => {
    disconnectChannel(channelId);
  });
  
  switch (timelineType) {
    case 'home':
      subscribeToChannel('homeTimeline', {});
      break;
    case 'local':
      subscribeToChannel('localTimeline', {});
      break;
    case 'global':
      subscribeToChannel('globalTimeline', {});
      break;
    case 'list':
      const selectedListId = document.getElementById('list-selector').value;
      if (selectedListId) {
        subscribeToChannel('userList', { listId: selectedListId });
      }
      break;
  }
}

// 初期化時に投稿フォームを初期化
document.addEventListener('DOMContentLoaded', function() {
  // 投稿フォームの初期化
  initializePostForm();
  
  // ヘッダーの折りたたみ状態を復元
  const savedHeaderCollapsed = localStorage.getItem('misskey_header_collapsed') === 'true';
  if (savedHeaderCollapsed) {
    const header = document.getElementById('misskey-header');
    const toggleBtn = document.getElementById('header-toggle-btn');
    if (header && toggleBtn) {
      header.classList.add('collapsed');
      toggleBtn.classList.add('collapsed');
      toggleBtn.title = 'ヘッダーを展開';
    }
  }
  
  // 投稿フォームの折りたたみ状態を復元
  const savedPostFormCollapsed = localStorage.getItem('misskey_post_form_collapsed') === 'true';
  if (savedPostFormCollapsed) {
    const postForm = document.getElementById('post-form');
    const toggleBtn = document.getElementById('post-form-toggle-btn');
    const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
    if (postForm && toggleBtn && toggleIcon) {
      postForm.classList.add('collapsed');
      toggleIcon.textContent = '▶';
      toggleBtn.title = '投稿フォームを展開';
    }
  }
  
  // 自動更新の状態を復元
  const savedAutoRefresh = localStorage.getItem('misskey_auto_refresh') === 'true';
  if (savedAutoRefresh) {
    MISSKEY_CONFIG.autoRefresh = true;
    const button = document.getElementById('auto-refresh-btn');
    const indicator = document.getElementById('update-indicator');
    if (button) {
      button.textContent = 'ストリーミング停止';
      button.classList.add('active');
    }
    if (indicator) {
      indicator.style.display = 'block';
    }
  }
  
  // 絵文字辞書をローカルストレージから復元
  try {
    const savedEmojiDict = localStorage.getItem('misskey_emoji_dict');
    if (savedEmojiDict) {
      window.globalEmojiDict = JSON.parse(savedEmojiDict);
      console.log('絵文字辞書を復元しました');
    }
  } catch (error) {
    console.error('絵文字辞書の復元エラー:', error);
    window.globalEmojiDict = {};
  }
  
  // 初期タイムラインを読み込み
  if (typeof loadMisskeyTimeline === 'function') {
    loadMisskeyTimeline();
  }
});