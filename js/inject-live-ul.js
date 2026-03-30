/**
 * DOMParser などで得た <ul> を、本ページに載せつつ <link rel="stylesheet"> と
 * <script src> を実際に読み込ませる（innerHTML では script が動かない問題の回避）。
 */
window.appendLiveUlCopy = function (container, sourceUl) {
  const ul = document.createElement('ul');
  ul.className = sourceUl.className;
  const seenCss = new Set(
    [...document.head.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href)
  );

  sourceUl.querySelectorAll(':scope > li').forEach((srcLi) => {
    const li = document.importNode(srcLi, true);
    li.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
      const href = el.getAttribute('href');
      el.remove();
      if (!href) return;
      const abs = new URL(href, document.baseURI).href;
      if (seenCss.has(abs)) return;
      seenCss.add(abs);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
    li.querySelectorAll('script[src]').forEach((el) => {
      const s = document.createElement('script');
      s.src = el.getAttribute('src');
      s.async = false;
      el.replaceWith(s);
    });
    ul.appendChild(li);
  });

  container.appendChild(ul);
};
