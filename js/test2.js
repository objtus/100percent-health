var $defer = new $.Deferred();

$.when(
  $defer
).done(function() {
  let mycard = document.querySelector('#sortpiccards');
  let cardlist = mycard.childNodes;
  let piccards = document.getElementsByClassName('piccard');
  console.log(piccards.length);
  var date = document.querySelectorAll('.date');
  console.log(mycard.childNodes);
  for (let i = 0; i < mycard.childNodes.length; i++) {

  }
});

var func = function() {
  $(function() {
    //array配列にload用の文字列を追加
    let array = ['/gallery/image-page/oc1.html .piccard'];
    array.push('/gallery/image-page/oc2.html .piccard');
    array.push('/gallery/image-page/groundpolis_paint.html .piccard');
    array.push('/gallery/image-page/groundpolis_paint2.html .piccard');
    array.push('/gallery/image-page/nofederation.html .piccard');
    array.push('/gallery/image-page/stilldreaminghour0.html .piccard');
    array.push('/gallery/image-page/ao-chan.html .piccard');
    array.push('/gallery/image-page/fanart.html .piccard');
    console.log(array);
    console.log(array.length);
    //#galleryspaceの後ろに空のcardクラスのdivタグを複数挿入
    for (let step = 0; step < array.length; step++) {
      $('#sortpiccards').append('<div id=card' + step + '></div>');
      $('#card' + step).load(array[step], function() {
        let a = document.getElementById("card" + step).childNodes;
        $(a).unwrap();
      })
    }
  });

  return $defer.resolve();
};