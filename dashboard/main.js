// ページ読み込み時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
  console.log('ページ読み込み完了');
  console.log('初期Misskey設定:', MISSKEY_CONFIG);
  console.log('初期Misskeyマネージャー:', misskeyManager);
  
  // ヘッダーの状態を復元
  const headerCollapsed = localStorage.getItem('misskey_header_collapsed') === 'true';
  if (headerCollapsed) {
    const header = document.getElementById('misskey-header');
    const toggleBtn = document.getElementById('header-toggle-btn');
    header.classList.add('collapsed');
    toggleBtn.classList.remove('expanded');
    toggleBtn.classList.add('collapsed');
    toggleBtn.title = 'ヘッダーを展開';
  }
  
  // 投稿フォームを初期化
  initializePostForm();
  
  loadRSSFeeds();
  
  // 5分ごとにRSSフィードを自動更新
  setInterval(loadRSSFeeds, 60 * 60 * 1000);
  
  // Misskeyタイムラインを読み込む
  try {
    await loadMisskeyTimeline();
  } catch (error) {
    console.error('Misskeyタイムライン初期化エラー:', error);
  }
  
  // ストリーミングが有効な場合は開始
  if (MISSKEY_CONFIG.autoRefresh) {
    try {
      const button = document.getElementById('auto-refresh-btn');
      if (button) {
        button.textContent = 'ストリーミング停止';
        button.classList.add('active');
      }
      const indicator = document.getElementById('update-indicator');
      if (indicator) {
        indicator.style.display = 'block';
      }
      await startStreaming();
    } catch (error) {
      console.error('ストリーミング開始エラー:', error);
    }
  }
  
  // モーダル外クリックで閉じる
  window.onclick = function(event) {
    const modal = document.getElementById('misskey-settings-modal');
    if (event.target === modal) {
      closeTokenSettings();
    }
  };
});
