  var mylink = new Array(
    "/gallery/image-page/ao-chan.html",
    "/gallery/image-page/fanart.html",
    "/gallery/image-page/gp1.html",
    "/gallery/image-page/gphelve.html",
    "/gallery/image-page/gpmerimi.html",
    "/gallery/image-page/gpp_airpocket2001.html",
    "/gallery/image-page/gpp_allthistime13.html",
    "/gallery/image-page/gpsyuua.html",
    "/gallery/image-page/gptaniguchi.html",
    "/gallery/image-page/groundpolis_paint.html",
    "/gallery/image-page/groundpolis_paint2.html",
    "/gallery/image-page/nofederation.html",
    "/gallery/image-page/oc1.html",
    "/gallery/image-page/oc2.html",
    "/gallery/image-page/oc3.html",
    "/gallery/image-page/remilia2.html",
    "/gallery/image-page/remilia2piyo.html",
    "/gallery/image-page/sameji-chan.html",
    "/gallery/image-page/stilldreaminghour0.html",
    "/gallery/image-page/syudojo-chan.html",
    "all.html",
  );

  function random_jump() {
    var i = Math.floor(Math.random() * mylink.length);
    location.href = mylink[i];
  }
