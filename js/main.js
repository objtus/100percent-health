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
  $("#zakkihtml").load("/txt/txt_main.html #zakki-list");

  $(document).on('click', '#back_to_top', function() {
    const wrapper = document.querySelector('#wrapper') || document.documentElement;
    wrapper.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  $(document).on('click', '#back_to_bottom', function() {
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
  });
});

// NSFWフィルター機能
document.addEventListener('DOMContentLoaded', function() {
  const revealedImages = new Set();
  const lightboxRevealedImages = new Set();
  let touchInfo = { moved: false, longPress: false, startTarget: null };
  
  // ボタンサイズキャッシュ
  let cachedButtonSize = null;

  // CSSボタンサイズ取得（キャッシュ付き）
  function getOverlayButtonSize() {
    if (cachedButtonSize) return cachedButtonSize;
    
    const tempElement = document.createElement('div');
    tempElement.style.cssText = `
      position: absolute; top: -9999px; left: -9999px; visibility: hidden;
      white-space: pre; font-size: 12px; line-height: 1.4; padding: 8px 4px;
      border-radius: 4px; font-family: inherit;
    `;
    tempElement.textContent = '閲覧注意\nクリックして表示';
    document.body.appendChild(tempElement);
    
    const rect = tempElement.getBoundingClientRect();
    document.body.removeChild(tempElement);
    
    cachedButtonSize = { width: rect.width, height: rect.height };
    return cachedButtonSize;
  }

  function syncInitialState() {
    document.querySelectorAll('.nsfw.revealed img').forEach(img => {
      revealedImages.add(img.src);
      const link = img.closest('.nsfw').querySelector('a');
      if (link) {
        link.style.pointerEvents = 'auto';
      }
    });
    
    document.querySelectorAll('.nsfw:not(.revealed) a').forEach(link => {
      link.style.pointerEvents = 'none';
    });
  }

  function initNewNSFWCards(addedNodes) {
    addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // 追加されたノード自体がNSFWカードの場合
        if (node.classList && node.classList.contains('nsfw')) {
          const link = node.querySelector('a');
          if (link && !node.classList.contains('revealed')) {
            link.style.pointerEvents = 'none';
          }
        }
        
        // 追加されたノード内にNSFWカードが含まれる場合
        const nsfwCards = node.querySelectorAll ? node.querySelectorAll('.nsfw:not(.revealed)') : [];
        nsfwCards.forEach(card => {
          const link = card.querySelector('a');
          if (link) {
            link.style.pointerEvents = 'none';
          }
        });
      }
    });
  }

  syncInitialState();

  // タッチイベント処理
  document.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touchInfo = { moved: false, longPress: false, startTarget: e.target };
      setTimeout(() => touchInfo.longPress = true, 300);
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    touchInfo.moved = true;
  }, { passive: true });

  // メインイベントハンドラー
  function handleEvent(e) {
    const isMobile = 'ontouchstart' in window;
    
    if (isMobile && e.type === 'touchend') {
      if (touchInfo.moved || touchInfo.longPress || 
          !e.target.closest('.nsfw, .lum-lightbox-image-wrapper') ||
          touchInfo.startTarget?.closest('.nsfw, .lum-lightbox-image-wrapper') !== 
          e.target.closest('.nsfw, .lum-lightbox-image-wrapper')) return;
    }
    
    const touch = e.changedTouches?.[0];
    const x = touch?.clientX || e.clientX;
    const y = touch?.clientY || e.clientY;
    
    // 通常状態のNSFWカード処理
    const nsfwCard = e.target.closest('.nsfw');
    if (nsfwCard && !e.target.closest('.title, .caption, .date')) {
      const imageLink = nsfwCard.querySelector('a');
      if (!imageLink) return;
      
      const cardRect = nsfwCard.getBoundingClientRect();
      const isHideButton = nsfwCard.classList.contains('revealed') && 
                          x > cardRect.right - 120 && y < cardRect.top + 35;
      
      // CSS ::beforeボタン位置計算（カード全体基準）
      const centerX = cardRect.left + cardRect.width / 2;
      const centerY = cardRect.top + cardRect.height * 0.44;
      const buttonSize = getOverlayButtonSize();
      const isOverlay = !nsfwCard.classList.contains('revealed') && 
                       Math.abs(x - centerX) <= buttonSize.width / 2 && 
                       Math.abs(y - centerY) <= buttonSize.height / 2;
      
      if (!nsfwCard.classList.contains('revealed')) {
        if (!isOverlay) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      
      if (isHideButton || isOverlay) {
        e.preventDefault();
        e.stopPropagation();
        nsfwCard.classList.toggle('revealed');
        
        const img = nsfwCard.querySelector('img');
        if (img) {
          if (nsfwCard.classList.contains('revealed')) {
            revealedImages.add(img.src);
            imageLink.style.pointerEvents = 'auto';
          } else {
            revealedImages.delete(img.src);
            imageLink.style.pointerEvents = 'none';
          }
        }
      }
      return;
    }
    
    // ライトボックス内処理
    const lightbox = document.querySelector('.lum-lightbox.lum-open');
    if (lightbox && !e.target.closest('.lum-close-button, .lum-gallery-button, .lum-previous-button, .lum-next-button')) {
      const revealedWrapper = lightbox.querySelector('.lum-lightbox-image-wrapper.nsfw-revealed');
      const filteredWrapper = lightbox.querySelector('.lum-lightbox-image-wrapper.nsfw-filtered');
      
      if (revealedWrapper) {
        const rect = revealedWrapper.getBoundingClientRect();
        const relX = x - rect.left;
        const relY = y - rect.top;
        
        const isHideButton = relX > rect.width - 100 && relY < 52;
        
        if (isHideButton) {
          e.preventDefault();
          e.stopPropagation();
          revealedWrapper.classList.remove('nsfw-revealed');
          revealedWrapper.classList.add('nsfw-filtered');
          
          const img = revealedWrapper.querySelector('.lum-img');
          if (img) {
            lightboxRevealedImages.delete(img.src);
            revealedImages.delete(img.src);
            updateNormalState(img.src, false);
          }
          return;
        }
      }
      
      if (!filteredWrapper) return;
      
      const rect = filteredWrapper.getBoundingClientRect();
      if (Math.abs(x - rect.left - rect.width/2) <= 100 && Math.abs(y - rect.top - rect.height/2) <= 50) {
        e.preventDefault();
        e.stopPropagation();
        filteredWrapper.classList.remove('nsfw-filtered');
        filteredWrapper.classList.add('nsfw-revealed');
        
        const img = filteredWrapper.querySelector('.lum-img');
        if (img) {
          lightboxRevealedImages.add(img.src);
          revealedImages.add(img.src);
          updateNormalState(img.src, true);
        }
        return;
      }
    }
  }

  document.addEventListener('click', e => {
    if (!('ontouchstart' in window)) handleEvent(e);
  }, { passive: false, capture: true });

  document.addEventListener('touchend', handleEvent, { passive: false, capture: true });

  // ヘルパー関数
  function isNSFWFiltered(src) {
    const img = [...document.querySelectorAll('.nsfw img')].find(i => i.src === src);
    return img ? !img.closest('.nsfw').classList.contains('revealed') : false;
  }

  function isLightboxNSFWFiltered(src) {
    if (lightboxRevealedImages.has(src)) return false;
    return isNSFWFiltered(src);
  }

  function isNSFWImage(src) {
    const img = [...document.querySelectorAll('.nsfw img')].find(i => i.src === src);
    return !!img;
  }

  function updateNormalState(src, revealed) {
    const normalImg = [...document.querySelectorAll('.nsfw img')].find(i => i.src === src);
    if (normalImg) {
      const normalCard = normalImg.closest('.nsfw');
      const normalLink = normalCard.querySelector('a');
      normalCard.classList.toggle('revealed', revealed);
      if (normalLink) {
        normalLink.style.pointerEvents = revealed ? 'auto' : 'none';
      }
    }
  }

  function updateLightboxFilter(wrapper, src) {
    const shouldFilter = isLightboxNSFWFiltered(src);
    wrapper.classList.toggle('nsfw-filtered', shouldFilter);
    wrapper.classList.toggle('nsfw-revealed', !shouldFilter && isNSFWImage(src));
  }

  function cleanupLightboxState() {
    lightboxRevealedImages.clear();
  }

  function initializeLightboxFilters() {
    const lightbox = document.querySelector('.lum-lightbox.lum-open');
    if (!lightbox) return;
    
    const wrapper = lightbox.querySelector('.lum-lightbox-image-wrapper');
    if (!wrapper) return;
    
    const img = wrapper.querySelector('.lum-img');
    if (!img || !img.src) return;
    
    updateLightboxFilter(wrapper, img.src);
  }

  // DOM変更監視
  new MutationObserver(mutations => {
    mutations.forEach(m => {
      // ライトボックスの開閉監視
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const lightbox = m.target.closest('.lum-lightbox');
        if (lightbox) {
          if (lightbox.classList.contains('lum-open')) {
            setTimeout(initializeLightboxFilters, 10);
          } else {
            cleanupLightboxState();
          }
        }
      }
      
      // ライトボックス内画像src変更監視
      if (m.type === 'attributes' && m.attributeName === 'src' && m.target.classList.contains('lum-img')) {
        const wrapper = m.target.closest('.lum-lightbox-image-wrapper');
        if (wrapper) {
          setTimeout(() => updateLightboxFilter(wrapper, m.target.src), 10);
        }
      }
      
      // 動的にNSFWカードが追加された時の初期化
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        initNewNSFWCards(m.addedNodes);
      }
    });
  }).observe(document.body, { 
    attributes: true, 
    attributeFilter: ['src', 'class'], 
    childList: true, 
    subtree: true 
  });
});

// Google Analytics初期化
(function() {
  if (window.gtag) return;
  
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-TSRT9G556F';
  
  script.onerror = function() {
    // Google Analytics読み込み失敗時の処理
  };
  
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
    } catch (error) {
      // 初期化失敗時の処理
    }
  };
  
  document.head.appendChild(script);
})();
