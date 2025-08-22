// 時計機能
function updateClock() {
  const now = new Date();
  
  // 時刻の更新
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  document.getElementById('time').innerHTML = 
    `${hours}<span class="clock-separator">:</span>${minutes}<span class="clock-separator">:</span>${seconds}`;
  
  // 日付の更新
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  document.getElementById('date').textContent = `${year}年${month}月${date}日`;
  
  // 曜日の更新
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = days[now.getDay()];
  document.getElementById('day').textContent = `${dayOfWeek}曜日`;
}

// 初期表示
updateClock();

// 1秒ごとに更新
setInterval(updateClock, 1000);
