$(function() {
  $("#galleryhtml").load("/include/gallery.html");
  $("#workshtml").load("/include/works.html");
  $("#footerhtml").load("/include/footer.html");
  $("#headerhtml").load("/include/header.html");
  $("#accesscounterhtml").load("/include/accesscounter.html");
  $("#last_updatedhtml").load("/include/last_updated.html");
});

function header() {
  const getPageTitle = document.title;
  var head = "";
  head += '<div id="header">';
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
    head += '<a class="addressbar" href="' + str.textContent.replace(' / ', '') + '.html">' + str.textContent;
  }
  head += '<a class="addressbar" href="' + getPageTitle.replace(' - 100%health', '') + '.html">';
  head += getPageTitle.replace(' - 100%health', '');
  head += '</a>';
  head += '</nav>';
  head += '</div>';
  head += '</div>';
  document.write(head);
}
