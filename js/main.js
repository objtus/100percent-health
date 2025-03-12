$(function() {
  $("#galleryhtml").load("/include/gallery.html");
  $("#workshtml").load("/include/works.html");
  $("#footerhtml").load("/include/footer.html");
  $("#headerhtml").load("/include/header.html");
  $("#accesscounterhtml").load("/include/accesscounter.html");
  $("#last_updatedhtml").load("/include/last_updated.html");
  $("#odaibakohtml").load("/include/odaibako.html");
  $("#changeloghtml").load("/include/changelog.html");
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

// Google Analyticsのタグコードを読み込む
(function() {
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-TSRT9G556F'; // トラッキングIDを設定
  document.head.appendChild(script);

  // タグコードの読み込みが完了したら設定を行う
  script.onload = function() {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'G-TSRT9G556F'); // トラッキングIDを設定
  }
})();
