$(function() {
  $("#gallerymaphtml").load("/include/gallerymap.html");
  $("#serieshtml").load("/include/series.html");
  $("#workshtml").load("/include/works.html");
  $("#footerhtml").load("/include/footer.html", function() {
    // フッター読み込み完了後に統計情報を更新
    updateFooterStats();
  });
  $("#headerhtml").load("/include/header.html");
  $("#accesscounterhtml").load("/include/accesscounter.html");
  $("#last_updatedhtml").load("/include/last_updated.html");
  $("#odaibakohtml").load("/include/odaibako.html");
  $("#changeloghtml").load("/include/changelog.html");
  $("#changelogmodalhtml").load("/include/changelog.html");
  $("#texthtml").load("/include/text.html");
  $("#zakkihtml").load("/txt/txt_main.html #zakki-list");

  // トップへ戻るボタン
  $(document).on('click', '#back_to_top, #logo_to_top', function() {
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

// フッター統計情報更新関数
function updateFooterStats() {
  const u = document.getElementById('last-update');
  if (u) {
    fetch('/rss.xml?t=' + Date.now()).then(r => r.ok ? r.text() : Promise.reject()).then(x => {
      const d = new DOMParser().parseFromString(x, 'text/xml').querySelector('lastBuildDate');
      if (d && d.textContent) {
        const j = new Date(new Date(d.textContent.trim()).getTime() + 32400000);
        const dateOnly = `${j.getUTCFullYear()}/${(j.getUTCMonth() + 1).toString().padStart(2, '0')}/${j.getUTCDate().toString().padStart(2, '0')}`;
        const fullDateTime = `${dateOnly} ${j.getUTCHours().toString().padStart(2, '0')}:${j.getUTCMinutes().toString().padStart(2, '0')}:${j.getUTCSeconds().toString().padStart(2, '0')}`;
        u.textContent = dateOnly;
        const iso8601 = `${j.getUTCFullYear()}-${(j.getUTCMonth() + 1).toString().padStart(2, '0')}-${j.getUTCDate().toString().padStart(2, '0')}T${j.getUTCHours().toString().padStart(2, '0')}:${j.getUTCMinutes().toString().padStart(2, '0')}:${j.getUTCSeconds().toString().padStart(2, '0')}.000+09:00`;
        u.setAttribute('title', fullDateTime + ' JST (日本標準時) | ' + iso8601);
      } else throw new Error();
    }).catch(e => {
      console.error('RSS更新日取得エラー:', e);
      u.textContent = '---';
    });
  }
  
  // ランダムメッセージ
  const msgElement = document.getElementById('random-msg');
  if (msgElement && !msgElement.dataset.initialized) {
    msgElement.dataset.initialized = 'true';
    const messages = new Date().getHours() >= 6 && new Date().getHours() < 18 
      ? ['♪', '♥', '♫', '☀', '☁'] : ['☽', '♢', '◍', '☾', '☆', '✧'];
    let clickCount = 0, maxClicks = Math.floor(Math.random() * 3) + 4, secretModal;
    
    // シークレットモーダル作成
    const createSecretModal = () => secretModal || ((d = document.createElement('dialog')) => (
      d.id = 'secret-modal',
      d.innerHTML = `
        <div class="modal-content">
          <h2>♥ secret found! ♥</h2>
          <p>you found the hidden contents ... but, not yet ...</p>
          <div class="secret-link-and-button">
            <a href="">go to the secret page →... under construction ///</a>
            <button id="close-secret-modal">close</button>
          </div>
        </div>
      `,
      document.body.appendChild(d),
      d.querySelector('#close-secret-modal').addEventListener('click', () => d.close()),
      secretModal = d
    ))();
    
    // シークレットモーダル表示
    const showSecretModal = () => createSecretModal().showModal();
    
    const changeMessage = () => {
      // 4%確率でシークレットモーダル
      if (Math.random() < 0.04) return showSecretModal();
      
      if (++clickCount >= maxClicks) {
        // 飛び跳ね演出で変化
        msgElement.style.transform = 'translateY(-4px)';
        setTimeout(() => msgElement.style.transform = 'translateY(0px)', 100);
        setTimeout(() => msgElement.style.opacity = '0', 150);
        setTimeout(() => {
          msgElement.textContent = messages[Math.floor(Math.random() * messages.length)];
          msgElement.style.transform = 'translateY(-4px)';
          msgElement.style.opacity = '1';
          setTimeout(() => msgElement.style.transform = 'translateY(0px)', 50);
        }, 250);
        clickCount = 0;
        maxClicks = Math.floor(Math.random() * 3) + 4;
      } else {
        // 通常の「-」反応
        const current = msgElement.textContent;
        msgElement.textContent = '-';
        setTimeout(() => msgElement.textContent = current, 150);
      }
    };
    
    msgElement.textContent = messages[Math.floor(Math.random() * messages.length)];
    msgElement.addEventListener('click', changeMessage);
  }
}

// NSFWフィルター機能
document.addEventListener('DOMContentLoaded', function() {
  const revealedImages = new Set(), lightboxRevealedImages = new Set();
  let touchInfo = {moved:0, longPress:0, startTarget:null}, cachedButtonSize, 
      nsfwSel = '.nsfw', revSel = '.revealed', imgSel = 'img', aSel = 'a';

  // CSSボタンサイズ取得（キャッシュ付き）
  const getOverlayButtonSize = () => cachedButtonSize || 
    ((e = document.createElement('div')) => (
      e.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;white-space:pre;font-size:12px;line-height:1.4;padding:8px 4px;border-radius:4px;font-family:inherit',
      e.textContent = '閲覧注意\nクリックして表示',
      document.body.appendChild(e),
      cachedButtonSize = {width: (r = e.getBoundingClientRect()).width, height: r.height},
      document.body.removeChild(e),
      cachedButtonSize
    ))();

  // 初期化と新規カード処理を統合
  const initNSFWCards = (nodes = [document]) => nodes.forEach(node => {
    if (node.nodeType === 1 || !node.nodeType) {
      // 既存の表示済みカード
      (node.querySelectorAll?.(nsfwSel + revSel + ' ' + imgSel) || []).forEach(img => (
        revealedImages.add(img.src),
        (l = img.closest(nsfwSel).querySelector(aSel)) && (l.style.pointerEvents = 'auto')
      ));
      // 未表示カード
      (node.querySelectorAll?.(nsfwSel + ':not(' + revSel + ') ' + aSel) || []).forEach(link => 
        link.style.pointerEvents = 'none'
      );
      // ノード自体がNSFWカードの場合
      node.classList?.contains?.('nsfw') && !node.classList.contains('revealed') && 
        (l = node.querySelector(aSel)) && (l.style.pointerEvents = 'none');
    }
  });

  initNSFWCards();

  // タッチイベント処理
  document.addEventListener('touchstart', e => 
    e.touches.length === 1 && (
      touchInfo = {moved:0, longPress:0, startTarget:e.target},
      setTimeout(() => touchInfo.longPress = 1, 300)
    ), {passive:1});

  document.addEventListener('touchmove', e => touchInfo.moved = 1, {passive:1});

  // メインイベントハンドラー
  const handleEvent = e => {
    const isMobile = 'ontouchstart' in window,
          touch = e.changedTouches?.[0],
          x = touch?.clientX || e.clientX,
          y = touch?.clientY || e.clientY;
    
    // モバイルタッチ検証
    if (isMobile && e.type === 'touchend' && (touchInfo.moved | touchInfo.longPress | 
        !e.target.closest('.nsfw, .lum-lightbox-image-wrapper') |
        (touchInfo.startTarget?.closest('.nsfw, .lum-lightbox-image-wrapper') !== 
         e.target.closest('.nsfw, .lum-lightbox-image-wrapper')))) return;
    
    // NSFWカード処理
    if ((nsfwCard = e.target.closest(nsfwSel)) && !e.target.closest('.title, .caption, .date, .tags-section') && 
        (imageLink = nsfwCard.querySelector(aSel))) {
      
      const cardRect = nsfwCard.getBoundingClientRect(),
            isRevealed = nsfwCard.classList.contains('revealed'),
            isHideButton = isRevealed && x > cardRect.right - 120 && y < cardRect.top + 35,
            buttonSize = getOverlayButtonSize(),
            centerX = cardRect.left + cardRect.width / 2,
            centerY = cardRect.top + cardRect.height * 0.44,
            isOverlay = !isRevealed && Math.abs(x - centerX) <= buttonSize.width / 2 && 
                       Math.abs(y - centerY) <= buttonSize.height / 2;
      
      // 未表示時はオーバーレイクリック以外を無効化
      !isRevealed && !isOverlay && (e.preventDefault(), e.stopPropagation());
      
      // ボタンクリック処理
      (isHideButton | isOverlay) && (
        e.preventDefault(),
        e.stopPropagation(),
        nsfwCard.classList.toggle('revealed'),
        (img = nsfwCard.querySelector(imgSel)) && (
          nsfwCard.classList.contains('revealed') ? 
            (revealedImages.add(img.src), imageLink.style.pointerEvents = 'auto') :
            (revealedImages.delete(img.src), imageLink.style.pointerEvents = 'none')
        )
      );
      return;
    }
    
    // ライトボックス処理
    (lightbox = document.querySelector('.lum-lightbox.lum-open')) && 
    !e.target.closest('.lum-close-button, .lum-gallery-button, .lum-previous-button, .lum-next-button') && (
      (revealedWrapper = lightbox.querySelector('.lum-lightbox-image-wrapper.nsfw-revealed')) ? (
        rect = revealedWrapper.getBoundingClientRect(),
        (x - rect.left > rect.width - 100 && y - rect.top < 52) && (
          e.preventDefault(),
          e.stopPropagation(),
          revealedWrapper.classList.remove('nsfw-revealed'),
          revealedWrapper.classList.add('nsfw-filtered'),
          (img = revealedWrapper.querySelector('.lum-img')) && (
            lightboxRevealedImages.delete(img.src),
            revealedImages.delete(img.src),
            updateNormalState(img.src, 0)
          )
        )
      ) : (filteredWrapper = lightbox.querySelector('.lum-lightbox-image-wrapper.nsfw-filtered')) && (
        rect = filteredWrapper.getBoundingClientRect(),
        Math.abs(x - rect.left - rect.width/2) <= 100 && Math.abs(y - rect.top - rect.height/2) <= 50 && (
          e.preventDefault(),
          e.stopPropagation(),
          filteredWrapper.classList.remove('nsfw-filtered'),
          filteredWrapper.classList.add('nsfw-revealed'),
          (img = filteredWrapper.querySelector('.lum-img')) && (
            lightboxRevealedImages.add(img.src),
            revealedImages.add(img.src),
            updateNormalState(img.src, 1)
          )
        )
      )
    );
  };

  document.addEventListener('click', e => {
    if (!('ontouchstart' in window)) handleEvent(e);
  }, { passive: false, capture: true });

  document.addEventListener('touchend', handleEvent, { passive: false, capture: true });

  // ヘルパー関数統合
  const findNSFWImg = src => [...document.querySelectorAll(nsfwSel + ' ' + imgSel)].find(i => i.src === src),
        isNSFWFiltered = src => (img = findNSFWImg(src)) && !img.closest(nsfwSel).classList.contains('revealed'),
        isLightboxFiltered = src => !lightboxRevealedImages.has(src) && isNSFWFiltered(src),
        updateNormalState = (src, revealed) => (img = findNSFWImg(src)) && (
          (card = img.closest(nsfwSel)).classList.toggle('revealed', revealed),
          (link = card.querySelector(aSel)) && (link.style.pointerEvents = revealed ? 'auto' : 'none')
        ),
        updateLightboxFilter = (wrapper, src) => (
          shouldFilter = isLightboxFiltered(src),
          wrapper.classList.toggle('nsfw-filtered', shouldFilter),
          wrapper.classList.toggle('nsfw-revealed', !shouldFilter && findNSFWImg(src))
        ),
        initLightboxFilters = () => (
          (lightbox = document.querySelector('.lum-lightbox.lum-open')) &&
          (wrapper = lightbox.querySelector('.lum-lightbox-image-wrapper')) &&
          (img = wrapper.querySelector('.lum-img')) && img.src &&
          updateLightboxFilter(wrapper, img.src)
        );

  // DOM監視
  new MutationObserver(mutations => mutations.forEach(m => (
    // ライトボックス開閉
    m.type === 'attributes' && m.attributeName === 'class' && (lightbox = m.target.closest('.lum-lightbox')) &&
      (lightbox.classList.contains('lum-open') ? setTimeout(initLightboxFilters, 10) : lightboxRevealedImages.clear()),
    // ライトボックス画像src変更
    m.type === 'attributes' && m.attributeName === 'src' && m.target.classList.contains('lum-img') &&
      (wrapper = m.target.closest('.lum-lightbox-image-wrapper')) && setTimeout(() => updateLightboxFilter(wrapper, m.target.src), 10),
    // 動的NSFWカード追加
    m.type === 'childList' && m.addedNodes.length && initNSFWCards(m.addedNodes)
  ))).observe(document.body, {attributes:1, attributeFilter:['src','class'], childList:1, subtree:1});
});

// Google Analytics初期化
!window.gtag && ((s = document.createElement('script')) => (
  s.async = 1,
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-TSRT9G556F',
  s.onerror = () => {}, // GA読み込み失敗時
  s.onload = () => {
    try {
      window.dataLayer = window.dataLayer || [],
      window.gtag = (...args) => window.dataLayer.push(args),
      gtag('js', new Date()),
      gtag('config', 'G-TSRT9G556F', {send_page_view:1, anonymize_ip:1})
    } catch(e) {} // 初期化失敗時
  },
  document.head.appendChild(s)
))();
