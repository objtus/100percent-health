async function loadDailyArticles08() {
	const month = "08";
	const year = "2025";
	const dates = ["26"];

	// 月別ページ用プレビュー設定（オプション）
	const customConfig = {
		// デフォルト設定をオーバーライドしたい場合のみ記述
		// maxChars: 350,
		// debug: true
	};

	let monthContainer = document.querySelector("#zakki08");
	if (!monthContainer) {
		const m08 = document.querySelector("#m08");
		if (!m08) {
			console.error("No container found for month 08");
			return;
		}

		// #zakki08を作成
		monthContainer = document.createElement("div");
		monthContainer.id = "zakki08";

		// h2を追加
		const h2 = document.createElement("h2");
		const a = document.createElement("a");
		a.href = `/txt/zakki/${year}/${month}/${year}-${month}.html`;
		a.textContent = `${year}-${month}`;
		h2.appendChild(a);
		monthContainer.appendChild(h2);

		m08.innerHTML = ""; // 既存のコンテンツをクリア
		m08.appendChild(monthContainer);
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