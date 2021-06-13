//共通パーツ読み込み
$(function() {
$("#galleryhtml").load("/gallery/gallery.html");
$("#workshtml").load("/works/works.html");
});

/*

window.addEventListener('message', function(e1) {
  var iframe_works = $("#iframe_works");
  var eventName_works = e1.data[0];
  var data_works = e1.data[1];
  switch (eventName_works) {
    case 'setHeight_works':
      iframe_works.height(data_works);
      break;
    }
  console.log(iframe_works);
  console.log(eventName_works);
  console.log(data_works);
}, false);

window.addEventListener('message', function(e2) {
  var iframe_gallery = $("#iframe_gallery");
  var eventName_gallery = e2.data[0];
  var data_gallery = e2.data[1];
  switch(eventName_gallery) {
    case 'setHeight_gallery':
      iframe_gallery.height(data_gallery);
      break;
    }
  console.log(iframe_gallery);
  console.log(eventName_gallery);
  console.log(data_gallery);
}, false);

*/
