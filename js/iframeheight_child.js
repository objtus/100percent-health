    window.onload = function() {
      var height_gallery = document.getElementsByTagName("html")[0].scrollHeight;
      window.parent.postMessage(["setHeight_gallery", height_gallery], "*");
    }

    window.onload = function() {
      var height_works = document.getElementsByTagName("html")[0].scrollHeight;
      window.parent.postMessage(["setHeight_works", height_works], "*");
    }
