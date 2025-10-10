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
  
  // サイドバー読み込み（1column.cssを使用するページのみ）
  if (document.querySelector('link[href*="1column.css"]')) {
    $("body").append('<div id="sidebarhtml"></div>');
    $("#sidebarhtml").load("/include/sidebar.html", function() {
      initSidebar();
    });
  }

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

// サイドバー初期化関数
function initSidebar() {
  // サイドバーのスクロールボタンイベント
  $(document).on('click', '#sidebar-scroll-to-top', function() {
    const wrapper = document.querySelector('#wrapper') || document.documentElement;
    wrapper.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  $(document).on('click', '#sidebar-scroll-to-bottom', function() {
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

  // 見出し関連機能の初期化
  initHeadingFeatures();
}

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
            <a href="/txt/secret_diary.html">go to the secret page... secret_diary ///</a>
            <a href="">go to the secret page 2 ... under construction ///</a>
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
      nsfwSel = '.nsfw', revSel = '.revealed', imgSel = 'img', aSel = 'a',
      mutationTimeout, isUpdating = false;

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
      // 未表示カード（画像リンクのみ）
      (node.querySelectorAll?.(nsfwSel + ':not(' + revSel + ') a[href$=".jpg"], ' + nsfwSel + ':not(' + revSel + ') a[href$=".png"], ' + nsfwSel + ':not(' + revSel + ') a[href$=".gif"], ' + nsfwSel + ':not(' + revSel + ') a[href$=".webp"]') || []).forEach(link => 
        link.style.pointerEvents = 'none'
      );
      // ノード自体がNSFWカードの場合（画像リンクのみ）
      node.classList?.contains?.('nsfw') && !node.classList.contains('revealed') && 
        (l = node.querySelector('a[href$=".jpg"], a[href$=".png"], a[href$=".gif"], a[href$=".webp"]')) && (l.style.pointerEvents = 'none');
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

  // デバウンス機能
  const debouncedUpdate = (fn, delay = 50) => {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(fn, delay);
  };

  // 状態チェック機能
  const hasStateChanged = (wrapper, shouldFilter) => {
    const isFiltered = wrapper.classList.contains('nsfw-filtered');
    const isRevealed = wrapper.classList.contains('nsfw-revealed');
    return (shouldFilter && !isFiltered) || (!shouldFilter && !isRevealed);
  };

  // ヘルパー関数統合
  const findNSFWImg = src => [...document.querySelectorAll(nsfwSel + ' ' + imgSel)].find(i => i.src === src),
        isNSFWFiltered = src => (img = findNSFWImg(src)) && !img.closest(nsfwSel).classList.contains('revealed'),
        isLightboxFiltered = src => !lightboxRevealedImages.has(src) && isNSFWFiltered(src),
        updateNormalState = (src, revealed) => (img = findNSFWImg(src)) && (
          (card = img.closest(nsfwSel)).classList.toggle('revealed', revealed),
          (link = card.querySelector(aSel)) && (link.style.pointerEvents = revealed ? 'auto' : 'none')
        ),
        updateLightboxFilter = (wrapper, src) => {
          if (isUpdating) return;
          const shouldFilter = isLightboxFiltered(src);
          if (hasStateChanged(wrapper, shouldFilter)) {
            isUpdating = true;
            if (shouldFilter) {
              wrapper.classList.add('nsfw-filtered');
              wrapper.classList.remove('nsfw-revealed');
            } else {
              wrapper.classList.remove('nsfw-filtered');
              // NSFWでない画像の場合は nsfw-revealed クラスを付けない
              if (findNSFWImg(src)) {
                wrapper.classList.add('nsfw-revealed');
              } else {
                wrapper.classList.remove('nsfw-revealed');
              }
            }
            setTimeout(() => isUpdating = false, 10);
          }
        },
        initLightboxFilters = () => (
          (lightbox = document.querySelector('.lum-lightbox.lum-open')) &&
          (wrapper = lightbox.querySelector('.lum-lightbox-image-wrapper')) &&
          (img = wrapper.querySelector('.lum-img')) && img.src &&
          updateLightboxFilter(wrapper, img.src)
        );

  // DOM監視
  new MutationObserver(mutations => mutations.forEach(m => {
    // 更新中は処理をスキップ
    if (isUpdating) return;
    
    // ライトボックス開閉
    if (m.type === 'attributes' && m.attributeName === 'class' && (lightbox = m.target.closest('.lum-lightbox'))) {
      if (lightbox.classList.contains('lum-open')) {
        debouncedUpdate(() => initLightboxFilters(), 50);
      } else {
        lightboxRevealedImages.clear();
      }
    }
    // ライトボックス画像src変更
    else if (m.type === 'attributes' && m.attributeName === 'src' && m.target.classList.contains('lum-img') &&
             (wrapper = m.target.closest('.lum-lightbox-image-wrapper'))) {
      debouncedUpdate(() => updateLightboxFilter(wrapper, m.target.src), 50);
    }
    // 動的NSFWカード追加
    else if (m.type === 'childList' && m.addedNodes.length) {
      initNSFWCards(m.addedNodes);
    }
  })).observe(document.body, {attributes:1, attributeFilter:['src','class'], childList:1, subtree:1});
});

// 見出し関連機能の統合初期化
function initHeadingFeatures() {
  window.headingFeaturesCleanup?.();
  
  const state = {
    tocVisible: false,
    currentHeadingVisible: false,
    headings: [],
    currentActiveIndex: -1,
    isTagPage: false,
    scrollHandler: null,
    wrapper: null,
    tocClickHandlers: []
  };

  // ページ情報を初期化
  const initializePageInfo = () => {
    const pageTitle = document.querySelector('head > title')?.textContent;
    const titleValue = document.getElementById('sidebar-page-title-value');
    if (pageTitle && titleValue) titleValue.textContent = pageTitle;

    const lastModified = document.lastModified;
    const lastModifiedValue = document.getElementById('sidebar-last-modified-value');
    if (lastModified && lastModifiedValue) {
      const date = new Date(lastModified);
      lastModifiedValue.textContent = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    }

    initializeScrollProgress();
    initializePageStats();
  };

  // ページ統計情報を計算して表示
  const initializePageStats = () => {
    const stats = calculatePageStats();
    const structureValue = document.getElementById('sidebar-page-structure-value');
    if (structureValue) structureValue.textContent = `${stats.headingCount}個 | ${stats.charCount.toLocaleString()}字`;
    
    const linksValue = document.getElementById('sidebar-page-links-value');
    if (linksValue) linksValue.textContent = `内部: ${stats.internalLinks} | 外部: ${stats.externalLinks}`;
  };

  // ページ統計情報を計算
  const calculatePageStats = () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingCount = headings.length;

    const contentElement = document.querySelector('#wrapper, article, main, body');
    let charCount = 0;
    if (contentElement) {
      const clone = contentElement.cloneNode(true);
      clone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
      const text = clone.textContent || clone.innerText || '';
      charCount = text.replace(/\s+/g, '').length;
    }

    const links = document.querySelectorAll('a[href]');
    let internalLinks = 0;
    let externalLinks = 0;
    const currentDomain = window.location.hostname;

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      if (href.startsWith('/') || href.startsWith('#') || href.startsWith('./') || 
          href.startsWith('../') || href.includes(currentDomain) || 
          (!href.startsWith('http://') && !href.startsWith('https://'))) {
        internalLinks++;
      } else {
        externalLinks++;
      }
    });

    return { headingCount, charCount, internalLinks, externalLinks };
  };

  const determinePageType = (headings) => {
    const h3Count = headings.filter(h => h.tagName === 'H3').length;
    return window.location.pathname.includes('/tag-page/') || h3Count > 5;
  };

  const getScrollThreshold = (wrapper, isTagPage) => {
    const viewportHeight = wrapper.clientHeight;
    return isTagPage ? viewportHeight * 0.90 : viewportHeight * 0.25;
  };

  // スクロール検出のセットアップ
  const setupHeadingDetection = () => {
    state.wrapper = document.querySelector('#wrapper') || document.documentElement;
    if (!state.wrapper) {
      console.error('Scroll wrapper not found');
      return;
    }

    let scrollTimeout;
    state.scrollHandler = () => {
      if (!state.currentHeadingVisible && !state.tocVisible) return;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateActiveIndexByScroll, 16);
    };
    
    state.wrapper.addEventListener('scroll', state.scrollHandler, { passive: true });
  };

  // アクティブな見出しの判定
  const updateActiveIndexByScroll = () => {
    if (!state.wrapper) return;
    
    const scrollTop = state.wrapper.scrollTop;
    const scrollHeight = state.wrapper.scrollHeight;
    const clientHeight = state.wrapper.clientHeight;
    
    // ページ最上部・最下部の処理
    if (scrollTop < 50) {
      if (state.currentActiveIndex !== 0 && state.headings.length > 0) {
        state.currentActiveIndex = 0;
        updateCurrentPosition();
      }
      return;
    }
    
    if (scrollTop + clientHeight >= scrollHeight - 10 && state.headings.length > 0) {
      const lastIndex = state.headings.length - 1;
      if (state.currentActiveIndex !== lastIndex) {
        state.currentActiveIndex = lastIndex;
        updateCurrentPosition();
      }
      return;
    }
    
    const threshold = getScrollThreshold(state.wrapper, state.isTagPage);
    
    // 閾値を超えた最も下の見出しを検索
    let newActiveIndex = -1;
    for (let i = state.headings.length - 1; i >= 0; i--) {
      if (state.headings[i].getBoundingClientRect().top <= threshold) {
        newActiveIndex = i;
        break;
      }
    }
    
    if (newActiveIndex === -1 && state.headings.length > 0) newActiveIndex = 0;
    
    if (newActiveIndex !== -1 && newActiveIndex !== state.currentActiveIndex) {
      state.currentActiveIndex = newActiveIndex;
      updateCurrentPosition();
    }
  };

  // 見出し要素の初期化
  const initializeHeadings = () => {
    if (state.headings.length > 0) return true;

    const headingElements = document.querySelectorAll('h2, h3, h4, h5, h6');
    state.headings = Array.from(headingElements);
    
    if (state.headings.length === 0) {
      $('#sidebar-toggle-toc, #sidebar-current-heading').hide();
      return false;
    }
    
    state.isTagPage = determinePageType(state.headings);
    state.headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `heading-${index}`;
    });
    
    $('#sidebar-toggle-toc, #sidebar-current-heading').show();
    state.currentHeadingVisible = true;
    setupHeadingDetection();
    return true;
  };

  // 目次の生成
  const generateTOC = () => {
    const tocContent = document.getElementById('sidebar-toc-content');
    if (!tocContent) return;

    state.tocClickHandlers.forEach(({ element, handler }) => {
      element.removeEventListener('click', handler);
    });
    state.tocClickHandlers = [];
    tocContent.innerHTML = '';

    state.headings.forEach((heading, index) => {
      const tocItem = document.createElement('button');
      tocItem.className = `sidebar-toc-item level-${heading.tagName.toLowerCase().charAt(1)}`;
      tocItem.textContent = heading.textContent.trim();
      tocItem.setAttribute('data-target', heading.id);
      tocItem.setAttribute('data-index', index);

      const clickHandler = function() {
        const targetElement = document.getElementById(this.getAttribute('data-target'));
        if (targetElement && state.wrapper) {
          state.wrapper.scrollTo({
            top: targetElement.offsetTop,
            behavior: 'smooth'
          });
        }
      };

      tocItem.addEventListener('click', clickHandler);
      state.tocClickHandlers.push({ element: tocItem, handler: clickHandler });
      tocContent.appendChild(tocItem);
    });
  };

  // 現在位置の表示更新
  const updateCurrentPosition = () => {
    const activeIndex = state.currentActiveIndex;
    if (activeIndex < 0) return;

    if (state.tocVisible) {
      document.querySelectorAll('.sidebar-toc-item.active').forEach(item => {
        item.classList.remove('active');
      });
      document.querySelector(`[data-index="${activeIndex}"]`)?.classList.add('active');
    }

    if (state.currentHeadingVisible) {
      const contentValue = document.getElementById('sidebar-current-heading-value');
      if (contentValue && state.headings[activeIndex]) {
        let displayText = getHeadingTextWithoutRuby(state.headings[activeIndex]);
        if (displayText.length > 20) displayText = displayText.substring(0, 17) + '...';
        
        contentValue.textContent = displayText;
        contentValue.setAttribute('title', displayText);
        contentValue.style.opacity = '0';
        setTimeout(() => contentValue.style.opacity = '1', 50);
      }
    }
  };

  // イベントハンドラ
  $(document).on('click', '#sidebar-toggle-toc', function() {
    const tocElement = document.getElementById('sidebar-toc');
    if (!tocElement) return;

    if (state.tocVisible) {
      tocElement.style.display = 'none';
      state.tocVisible = false;
    } else {
      if (!initializeHeadings()) return;
      generateTOC();
      tocElement.style.display = 'flex';
      state.tocVisible = true;
      updateCurrentPosition();
    }
  });

  $(document).on('click', '#sidebar-toc-close', () => {
    const tocElement = document.getElementById('sidebar-toc');
    if (tocElement) {
      tocElement.style.display = 'none';
      state.tocVisible = false;
    }
  });

  // 目次の外側クリックで閉じる機能
  $(document).on('click', (e) => {
    if (!state.tocVisible) return;
    
    const tocElement = document.getElementById('sidebar-toc');
    const toggleButton = document.getElementById('sidebar-toggle-toc');
    
    if (tocElement && 
        !tocElement.contains(e.target) && 
        !toggleButton.contains(e.target)) {
      tocElement.style.display = 'none';
      state.tocVisible = false;
    }
  });

  // 初期化実行
  const initialize = () => {
    initializePageInfo();
    if (initializeHeadings()) {
      updateActiveIndexByScroll();
      updateCurrentPosition();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }
  
  // クリーンアップ関数
  window.headingFeaturesCleanup = () => {
    if (state.scrollHandler && state.wrapper) {
      state.wrapper.removeEventListener('scroll', state.scrollHandler);
    }

    state.tocClickHandlers.forEach(({ element, handler }) => {
      element.removeEventListener('click', handler);
    });
        
    $('#sidebar-toc').hide();
    
    Object.assign(state, {
      tocVisible: false,
      currentHeadingVisible: false,
      headings: [],
      currentActiveIndex: -1,
      scrollHandler: null,
      wrapper: null,
      tocClickHandlers: []
    });
  };

  return { updateActiveIndexByScroll, getState: () => ({ ...state }) };
}

// スクロール進捗バーの初期化と更新
function initializeScrollProgress() {
  const progressValue = document.getElementById('sidebar-scroll-progress-value');
  if (!progressValue) return;

  updateScrollProgress();

  const wrapper = document.querySelector('#wrapper') || document.documentElement;
  if (wrapper) {
    let scrollTimeout;
    const scrollHandler = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateScrollProgress, 16);
    };
    wrapper.addEventListener('scroll', scrollHandler, { passive: true });
    
    const originalCleanup = window.headingFeaturesCleanup;
    window.headingFeaturesCleanup = () => {
      if (originalCleanup) originalCleanup();
      wrapper.removeEventListener('scroll', scrollHandler);
    };
  }
}

function updateScrollProgress() {
  const progressValue = document.getElementById('sidebar-scroll-progress-value');
  if (!progressValue) return;

  const wrapper = document.querySelector('#wrapper') || document.documentElement;
  if (!wrapper) return;

  const scrollTop = wrapper.scrollTop;
  const scrollHeight = wrapper.scrollHeight;
  const clientHeight = wrapper.clientHeight;
  const maxScroll = scrollHeight - clientHeight;
  const progress = maxScroll <= 0 ? 100 : Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
  
  const barLength = 6;
  const filledLength = Math.floor((progress / 100) * barLength);
  const progressBar = '#'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
  const percentStr = Math.floor(progress).toString();
  const paddedPercent = percentStr.padStart(3, '0') + '%';
  
  progressValue.textContent = `${paddedPercent}: [${progressBar}]`;
}

window.initHeadingFeatures = initHeadingFeatures;

function getHeadingTextWithoutRuby(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('rt').forEach(rt => rt.remove());
  return clone.textContent.trim();
}

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