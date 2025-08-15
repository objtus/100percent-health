$(function() {
  $("#gallerymaphtml").load("/include/gallerymap.html");
  $("#serieshtml").load("/include/series.html");
  $("#workshtml").load("/include/works.html");
  $("#footerhtml").load("/include/footer.html");
  $("#headerhtml").load("/include/header.html");
  $("#accesscounterhtml").load("/include/accesscounter.html");
  $("#last_updatedhtml").load("/include/last_updated.html");
  $("#odaibakohtml").load("/include/odaibako.html");
  $("#changeloghtml").load("/include/changelog.html");
  $("#changelogmodalhtml").load("/include/changelog.html");
  $("#texthtml").load("/include/text.html");

  $(document).on('click', '#back_to_top', function() {
    // スクロール可能な要素を探す
    const wrapper = document.querySelector('#wrapper') || document.documentElement;
    
    wrapper.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    console.log('Scroll attempted on:', wrapper.id || 'documentElement');
  });

  $(document).on('click', '#back_to_bottom', function() {
    // スクロール可能な要素を探す
    const wrapper = document.querySelector('#wrapper') || document.body;
    
    wrapper.scrollTo({
      top: wrapper.scrollHeight,
      behavior: 'smooth'
    });
    
    setTimeout(function() {
      const bottomElement = wrapper.lastElementChild;
      if (bottomElement) {
        bottomElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    
    console.log('Scroll attempted on iOS');
  });
});

function header() {
  const getPageTitle = document.title;
  var head = "";
  head += '<header id="header">';
  head += '<div id="header-flex">';
  head += '<nav id="back">';
  head += '<a id="backicon" href="../../index.html">';
  head += '&lt;';
  head += '</a>';
  head += '</nav>';
  head += '<nav id="address" class="addressbar">';
  head += '<a class="addressbar" href="../../index.html">';
  head += '100%health ';
  head += '</a>/ ';
  head += '<a class="addressbar" href="../gallery_main.html">';
  head += 'gallery ';
  head += '</a>/ ';
  let str = document.getElementById("parentFile");
  if (str === null) {} else {
    const parentText = str.textContent.trim();
    const parentLink = parentText.replace(/ \/$/, ''); // 末尾の " /" のみを削除
    head += '<a class="addressbar" href="' + parentLink + '.html">' + parentText + '</a>';
  }
  head += '<a class="addressbar" href="' + getPageTitle.replace(' - 100%health', '') + '.html">';
  head += getPageTitle.replace(' - 100%health', '');
  head += '</a>';
  head += '</nav>';
  head += '</div>';
  head += '</header>';
  document.write(head);
}

// NSFWフィルター
document.addEventListener('DOMContentLoaded', function() {
  const revealedImages = new Set();
  let touchInfo = { moved: false, longPress: false, startTarget: null };

  // タッチ追跡
  document.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touchInfo = { moved: false, longPress: false, startTarget: e.target };
      setTimeout(() => touchInfo.longPress = true, 300);
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    touchInfo.moved = true;
  }, { passive: true });

  // 統合イベントハンドラー
  function handleEvent(e) {
    const isMobile = 'ontouchstart' in window;
    
    // モバイルでの無効判定
    if (isMobile && e.type === 'touchend') {
      if (touchInfo.moved || touchInfo.longPress || 
          !e.target.closest('.nsfw, .lum-lightbox-image-wrapper') ||
          touchInfo.startTarget?.closest('.nsfw, .lum-lightbox-image-wrapper') !== 
          e.target.closest('.nsfw, .lum-lightbox-image-wrapper')) return;
    }
    
    const touch = e.changedTouches?.[0];
    const x = touch?.clientX || e.clientX;
    const y = touch?.clientY || e.clientY;
    
    // ギャラリー処理
    const nsfwCard = e.target.closest('.nsfw');
    if (nsfwCard && !e.target.closest('.title, .caption, .date')) {
      const imageLink = nsfwCard.querySelector('a');
      if (!imageLink) return;
      
      const linkRect = imageLink.getBoundingClientRect();
      const cardRect = nsfwCard.getBoundingClientRect();
      const isInImage = x >= linkRect.left && x <= linkRect.right && y >= linkRect.top && y <= linkRect.bottom;
      const isHideButton = nsfwCard.classList.contains('revealed') && 
                          x > cardRect.right - 120 && y < cardRect.top + 35;
      const isOverlay = !nsfwCard.classList.contains('revealed') && isInImage;
      
      if (isHideButton || isOverlay) {
        e.preventDefault();
        e.stopPropagation();
        nsfwCard.classList.toggle('revealed');
        
        const img = nsfwCard.querySelector('img');
        if (img) {
          nsfwCard.classList.contains('revealed') ? 
            revealedImages.add(img.src) : revealedImages.delete(img.src);
        }
      }
      return;
    }
    
    // ライトボックス処理
    const lightbox = document.querySelector('.lum-lightbox.lum-open');
    if (lightbox && !e.target.closest('.lum-close-button, .lum-gallery-button, .lum-previous-button, .lum-next-button')) {
      const wrapper = lightbox.querySelector('.lum-lightbox-image-wrapper.nsfw-filtered');
      if (!wrapper) return;
      
      const rect = wrapper.getBoundingClientRect();
      const relX = x - rect.left;
      const relY = y - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // 中央の200x100エリア内か判定
      if (Math.abs(relX - centerX) <= 100 && Math.abs(relY - centerY) <= 50) {
        e.preventDefault();
        e.stopPropagation();
        wrapper.classList.remove('nsfw-filtered');
        
        const img = wrapper.querySelector('.lum-img');
        if (img) revealedImages.add(img.src);
      }
    }
  }

  // イベント登録
  document.addEventListener('click', e => {
    if (!('ontouchstart' in window)) handleEvent(e);
  }, { passive: false });

  document.addEventListener('touchend', handleEvent, { passive: false });

  // NSFW状態確認とMutationObserver
  function isNSFWFiltered(src) {
    if (revealedImages.has(src)) return false;
    const img = [...document.querySelectorAll('.nsfw img')].find(i => i.src === src);
    return img ? !img.closest('.nsfw').classList.contains('revealed') : false;
  }

  new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'src' && m.target.classList.contains('lum-img')) {
        const wrapper = m.target.closest('.lum-lightbox-image-wrapper');
        if (wrapper) {
          wrapper.classList.toggle('nsfw-filtered', isNSFWFiltered(m.target.src));
        }
      }
    });
  }).observe(document.body, { attributes: true, attributeFilter: ['src'], subtree: true });
});

// Google Analyticsのタグコードを読み込む
(function() {
  // 既に読み込まれている場合は重複を避ける
  if (window.gtag) return;
  
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-TSRT9G556F';
  
  // エラーハンドリングを追加
  script.onerror = function() {
    console.error('Google Analytics script failed to load');
  };
  
  // タグコードの読み込みが完了したら設定を行う
  script.onload = function() {
    try {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        window.dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', 'G-TSRT9G556F', {
        'send_page_view': true,
        'anonymize_ip': true
      });
      console.log('Google Analytics initialized successfully');
    } catch (error) {
      console.error('Google Analytics initialization failed:', error);
    }
  };
  
  document.head.appendChild(script);
})();
