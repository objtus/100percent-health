$(function(){
  'use strict';

  $.ajax({
    type:'GET',
    url:'/gallery/image-page/oc1.html',
    dataType:'html'
  })
  .then(

    //通信成功時
    function(data){
      var contents = $(data).find('div.card').next();
      $('.sortpiccards').append(contents);
    },

    //通信失敗時
    function(){
      alert("読み込み失敗");
  });
});
