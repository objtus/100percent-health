async function loadDailyArticles12() {
	const month = "12";
	const year = "2025";
	const dates = ["06", "08", "12", "18", "20"];

	// 月別ページ用プレビュー設定（オプション）
	const customConfig = {
		// デフォルト設定をオーバーライドしたい場合のみ記述
		// maxChars: 350,
		// debug: true
	};

	let monthContainer = document.querySelector("#zakki12");
	if (!monthContainer) {
		const m12 = document.querySelector("#m12");
		if (!m12) {
			console.error("No container found for month 12");
			return;
		}

		// #zakki12を作成
		monthContainer = document.createElement("div");
		monthContainer.id = "zakki12";

		// h2を追加
		const h2 = document.createElement("h2");
		const a = document.createElement("a");
		a.href = `/txt/zakki/${year}/${month}/${year}-${month}.html`;
		a.textContent = `${year}-${month}`;
		h2.appendChild(a);
		monthContainer.appendChild(h2);

		m12.innerHTML = ""; // 既存のコンテンツをクリア
		m12.appendChild(monthContainer);
	}

	// month-articleコンテナを探すか作成
	let articleContainer = monthContainer.querySelector(".month-article");
	if (!articleContainer) {
		articleContainer = document.createElement("div");
		articleContainer.className = "month-article";
		monthContainer.appendChild(articleContainer);
	}

	// 既存の記事をクリア
	articleContainer.innerHTML = "";

	for (const date of dates) {
		try {
			const response = await fetch(`/txt/zakki/${year}/${month}/days/${year}-${month}-${date}.html`);
			if (!response.ok) {
				console.log(`No article found for ${date}`);
				continue;
			}

			const text = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, "text/html");
			const article = doc.querySelector("article");

			if (article) {
				// MonthlyArticleUtilsが利用可能かチェック
				if (typeof MonthlyArticleUtils !== 'undefined' && MonthlyArticleUtils.createTruncatedArticle) {
					// 省略表示記事を作成
					const truncatedArticle = MonthlyArticleUtils.createTruncatedArticle(article, year, customConfig);
					articleContainer.appendChild(truncatedArticle);
				} else {
					// フォールバック：そのまま表示
					articleContainer.appendChild(article);
				}
			}
		} catch (error) {
			console.error(`Error loading article for ${date}:`, error);
		}
	}
}