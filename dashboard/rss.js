// RSSフィードの設定
const RSS_FEEDS = [
  {
    name: "はてなブックマーク（総合）",
    url: "https://b.hatena.ne.jp/hotentry/all.rss"
  },
  {
    name: "はてなブックマーク（世の中）",
    url: "https://b.hatena.ne.jp/hotentry/social.rss"
  },
  {
    name: "GIGAZINE",
    url: "https://gigazine.net/news/rss_2.0/"
  },
  {
    name: "Togetter",
    url: "https://togetter.com/rss/hot"
  }
];

// 遅延関数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// RSSフィードを読み込む
async function loadRSSFeeds() {
  const rssContent = document.getElementById('rss-content');
  const lastUpdate = document.getElementById('last-update');
  
  if (!rssContent || !lastUpdate) {
    console.warn('RSS要素が見つかりません');
    return;
  }
  
  rssContent.innerHTML = '<div class="rss-loading">読み込み中...</div>';
  
  // 更新時刻を表示
  const now = new Date();
  lastUpdate.textContent = `最終更新: ${now.toLocaleTimeString('ja-JP')}`;

  try {
    const allItems = [];
    
    // 各RSSフィードを順次取得（レート制限を考慮）
    for (let i = 0; i < RSS_FEEDS.length; i++) {
      const feed = RSS_FEEDS[i];
      
      try {
        console.log(`${feed.name} の取得を開始...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト
        
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
        const response = await fetch(proxyUrl, { 
          signal: controller.signal,
          method: 'GET'
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 429) {
          console.warn(`${feed.name} でレート制限が発生しました。30秒待機します...`);
          await delay(30000); // 30秒待機
          
          // 再試行
          const retryResponse = await fetch(proxyUrl, { 
            signal: controller.signal,
            method: 'GET'
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryData = await retryResponse.json();
          if (retryData.status === 'ok' && retryData.items) {
            const items = retryData.items.map(item => ({
              ...item,
              source: feed.name,
              pubDate: new Date(item.pubDate)
            }));
            allItems.push(...items);
          }
        } else if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } else {
          const data = await response.json();
          
          if (data.status === 'ok' && data.items) {
            const items = data.items.map(item => ({
              ...item,
              source: feed.name,
              pubDate: new Date(item.pubDate)
            }));
            allItems.push(...items);
          }
        }
        
        console.log(`${feed.name} の取得完了`);
        
        // 次のフィード取得前に3秒待機（レート制限対策）
        if (i < RSS_FEEDS.length - 1) {
          console.log('次のフィード取得まで3秒待機...');
          await delay(3000);
        }
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(`RSSフィード ${feed.name} がタイムアウトしました`);
        } else {
          console.error(`RSSフィード ${feed.name} の読み込みエラー:`, error);
        }
      }
    }

    // 日付順にソート（新しい順）
    allItems.sort((a, b) => b.pubDate - a.pubDate);

    // 最新の100件を表示
    const recentItems = allItems.slice(0, 100);
    
    if (recentItems.length === 0) {
      rssContent.innerHTML = '<div class="rss-error">RSSフィードを読み込めませんでした</div>';
      return;
    }

    // HTMLを生成（自動スクロール用にコンテンツを複製）
    const itemsHtml = recentItems.map(item => {
      const sourceClass = getSourceClass(item.source);
      return `
        <div class="rss-item">
          <div class="rss-item-title">
            <a href="${item.link}" target="_blank" rel="noopener noreferrer">
              ${item.title}
            </a>
          </div>
          <div class="rss-item-meta">
            <span class="rss-item-source ${sourceClass}">${item.source}</span>
            <span>${formatDate(item.pubDate)}</span>
          </div>
        </div>
      `;
    }).join('');

    // 自動スクロール用にコンテンツを複製してシームレスなループを作成
    const html = `
      <div class="rss-content">
        ${itemsHtml}
        ${itemsHtml}
      </div>
    `;

    rssContent.innerHTML = html;

  } catch (error) {
    console.error('RSSフィード読み込みエラー:', error);
    if (rssContent) {
      rssContent.innerHTML = '<div class="rss-error">RSSフィードの読み込みに失敗しました</div>';
    }
  }
}

// ソース名をクラス名に変換
function getSourceClass(sourceName) {
  if (sourceName.includes("はてなブックマーク（総合）")) {
    return "hatena-all";
  } else if (sourceName.includes("はてなブックマーク（世の中）")) {
    return "hatena-social";
  } else if (sourceName.includes("GIGAZINE")) {
    return "gigazine";
  } else if (sourceName.includes("Togetter")) {
    return "togetter";
  }
  return "other";
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
