(function () {
	var colour = ["#000", "#000"];
	var sparkles = 40;

	var cNum = 0;
	var x = (ox = 300);
	var y = (oy = 100);
	var swide = window.innerWidth,
		shigh = window.innerHeight;
	var sleft = (sdown = 0);
	var tiny = [],
		star = [],
		starv = [],
		starx = [],
		stary = [],
		tinyx = [],
		tinyy = [],
		tinyv = [];
	
	// スライダー操作中かどうかのフラグ
	var isInteractingWithControls = false;
	// アニメーション一時停止フラグ
	var isPaused = false;
	// アニメーションタイマーID
	var animationTimer = null;
	// キラキラ要素用のコンテナ
	var sparkleContainer = null;
	
	window.onload = function () {
		// キラキラ要素用のコンテナを作成
		sparkleContainer = document.createElement("div");
		sparkleContainer.id = "sparkle-container";
		sparkleContainer.style.position = "fixed";
		sparkleContainer.style.top = "0";
		sparkleContainer.style.left = "0";
		sparkleContainer.style.width = "100%";
		sparkleContainer.style.height = "100%";
		sparkleContainer.style.pointerEvents = "none";
		sparkleContainer.style.zIndex = "10000";
		document.body.appendChild(sparkleContainer);
		
		var i, rats, rlef, rdow;
		for (var i = 0; i < sparkles; i++) {
			var rats = createDiv(3, 3);
			rats.style.visibility = "hidden";
			sparkleContainer.appendChild((tiny[i] = rats));
			starv[i] = 0;
			tinyv[i] = 0;
			var rats = createDiv(5, 5);
			rats.style.backgroundColor = "transparent";
			rats.style.visibility = "hidden";
			var rlef = createDiv(1, 5);
			var rdow = createDiv(5, 1);
			rats.appendChild(rlef);
			rats.appendChild(rdow);
			rlef.style.top = "2px";
			rlef.style.left = 0;
			rdow.style.top = 0;
			rdow.style.left = "2px";
			sparkleContainer.appendChild((star[i] = rats));
		}
		
			// アニメーション開始
	startAnimation();
	
	// コントロール要素との干渉を検出するイベントリスナーを追加
	setupControlInteractionDetection();
	
	// タブ非アクティブ時の停止機能を設定
	setupVisibilityChangeHandler();
	};
	
	// アニメーション開始関数
	function startAnimation() {
		if (!animationTimer) {
			animationTimer = setInterval(sparkle, 50);
		}
	}
	
	// アニメーション停止関数
	function stopAnimation() {
		if (animationTimer) {
			clearInterval(animationTimer);
			animationTimer = null;
		}
	}
	
	// コントロール要素との干渉を検出する関数
	function setupControlInteractionDetection() {
		// マウスダウン時にコントロール要素かどうかをチェック
		document.addEventListener('mousedown', function(e) {
			if (isControlElement(e.target)) {
				isInteractingWithControls = true;
				// スライダー操作開始時にアニメーションを停止
				isPaused = true;
				stopAnimation();
				
				// すべてのエフェクトを非表示にする
				hideAllEffects();
			}
		});
		
		// マウスアップ時にフラグをリセット
		document.addEventListener('mouseup', function() {
			if (isInteractingWithControls) {
				isInteractingWithControls = false;
				// 操作終了時にアニメーションを再開
				isPaused = false;
				startAnimation();
			}
		});
		
		// マウス移動時にコントロール要素上かどうかをチェック
		document.addEventListener('mousemove', handleMouseMove);
		
		// スライダーの変更イベントを監視
		document.addEventListener('input', function(e) {
			if (e.target.classList.contains('tag-slider')) {
				// スライダー操作中はアニメーションを停止
				isPaused = true;
				stopAnimation();
			}
		});
		
		// スライダーの変更完了イベントを監視
		document.addEventListener('change', function(e) {
			if (e.target.classList.contains('tag-slider')) {
				// スライダー操作完了時にアニメーションを再開
				setTimeout(function() {
					isPaused = false;
					startAnimation();
				}, 200); // 少し遅延を入れて再開
			}
		});
	}
	
	// すべてのエフェクトを非表示にする関数
	function hideAllEffects() {
		for (var i = 0; i < sparkles; i++) {
			if (star[i]) star[i].style.visibility = "hidden";
			if (tiny[i]) tiny[i].style.visibility = "hidden";
		}
	}
	
	// コントロール要素かどうかをチェックする関数
	function isControlElement(element) {
		// スライダーやボタンなどのコントロール要素をチェック
		return element.tagName === 'INPUT' || 
			   element.tagName === 'BUTTON' ||
			   element.tagName === 'SELECT' ||
			   element.classList.contains('tag-slider') ||
			   element.classList.contains('relevance-btn') ||
			   element.classList.contains('tag-sort-btn') ||
			   element.closest('.tag-controls') !== null;
	}
	
	// タブ非アクティブ時の停止機能を設定する関数
	function setupVisibilityChangeHandler() {
		// ページ可視性APIがサポートされているかチェック
		if (typeof document.hidden !== "undefined" || typeof document.msHidden !== "undefined" || typeof document.webkitHidden !== "undefined") {
			// 可視性変更イベントを監視
			document.addEventListener('visibilitychange', handleVisibilityChange);
		}
	}
	
	// 可視性変更を処理する関数
	function handleVisibilityChange() {
		if (document.hidden || document.msHidden || document.webkitHidden) {
			// タブが非アクティブになった場合
			console.log('タブが非アクティブになりました。アニメーションを停止します。');
			stopAnimation();
			hideAllEffects();
		} else {
			// タブがアクティブになった場合
			console.log('タブがアクティブになりました。アニメーションを再開します。');
			if (!isPaused && !isInteractingWithControls) {
				startAnimation();
			}
		}
	}
	
	function sparkle() {
		var c;
		// アニメーション一時停止中は何もしない
		if (isPaused) return;
		
		// コントロール操作中はエフェクトを更新しない
		if (!isInteractingWithControls && (x != ox || y != oy)) {
			ox = x;
			oy = y;
			for (c = 0; c < sparkles; c++)
				if (!starv[c]) {
					star[c].style.left = (starx[c] = x) + "px";
					star[c].style.top = (stary[c] = y) + "px";
					star[c].style.clip = "rect(0px, 5px, 5px, 0px)";
					star[c].childNodes[0].style.backgroundColor = star[c].childNodes[1].style.backgroundColor = colour[cNum % colour.length];
					cNum++;
					star[c].style.visibility = "visible";
					star[c].style.pointerEvents = "none";
					starv[c] = 50;
					break;
				}
		}
		for (c = 0; c < sparkles; c++) {
			if (starv[c]) update_star(c);
			if (tinyv[c]) update_tiny(c);
		}
	}
	
	function update_star(i) {
		if (--starv[i] == 25) star[i].style.clip = "rect(1px, 4px, 4px, 1px)";
		if (starv[i]) {
			stary[i] += 1 + Math.random() * 3;
			if (stary[i] < shigh + sdown) {
				star[i].style.top = stary[i] + "px";
				starx[i] += ((i % 5) - 2) / 5;
				star[i].style.left = starx[i] + "px";
			} else {
				star[i].style.visibility = "hidden";
				starv[i] = 0;
				return;
			}
		} else {
			tinyv[i] = 50;
			tiny[i].style.top = (tinyy[i] = stary[i]) + "px";
			tiny[i].style.left = (tinyx[i] = starx[i]) + "px";
			tiny[i].style.width = "2px";
			tiny[i].style.height = "2px";
			tiny[i].style.backgroundColor = star[i].childNodes[0].style.backgroundColor;
			star[i].style.visibility = "hidden";
			tiny[i].style.visibility = "visible";
			tiny[i].style.pointerEvents = "none";
		}
	}
	
	function update_tiny(i) {
		if (--tinyv[i] == 25) {
			tiny[i].style.width = "1px";
			tiny[i].style.height = "1px";
		}
		if (tinyv[i]) {
			tinyy[i] += 1 + Math.random() * 3;
			if (tinyy[i] < shigh + sdown) {
				tiny[i].style.top = tinyy[i] + "px";
				tinyx[i] += ((i % 5) - 2) / 5;
				tiny[i].style.left = tinyx[i] + "px";
			} else {
				tiny[i].style.visibility = "hidden";
				tinyv[i] = 0;
				return;
			}
		} else tiny[i].style.visibility = "hidden";
		tiny[i].style.pointerEvents = "none";
	}
	
	// マウス移動イベントハンドラを分離して改善
	function handleMouseMove(e) {
		// アニメーション一時停止中は何もしない
		if (isPaused) return;
		
		// コントロール要素上ではカーソル位置を更新しない
		if (isControlElement(e.target)) {
			isInteractingWithControls = true;
			return;
		}
		
		isInteractingWithControls = false;
		y = e.pageY;
		x = e.pageX;
		sdown = window.pageYOffset;
		sleft = window.pageXOffset;
	}
	
	function createDiv(height, width) {
		var div = document.createElement("div");
		div.style.position = "absolute";
		div.style.height = height + "px";
		div.style.width = width + "px";
		div.style.overflow = "hidden";
		div.style.pointerEvents = "none";
		div.style.zIndex = "10000";
		return div;
	}
})();
