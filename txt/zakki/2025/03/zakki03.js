async function loadDailyArticles03() {
	const month = "03";
	const year = "2025";
	const dates = ["10"];

	// まず#zakki02を探す、なければ#m02内に作成
	let monthContainer = document.querySelector("#zakki03");
	if (!monthContainer) {
		const m03 = document.querySelector("#m03");
		if (!m03) {
			console.error("No container found for month 03");
			return;
		}

		// #zakki02を作成
		monthContainer = document.createElement("div");
		monthContainer.id = "zakki03";

		// h2を追加
		const h2 = document.createElement("h2");
		const a = document.createElement("a");
		a.href = `/txt/zakki/${year}/${month}/${year}-${month}.html`;
		a.textContent = `${year}-${month}`;
		h2.appendChild(a);
		monthContainer.appendChild(h2);

		m03.innerHTML = ""; // 既存のコンテンツをクリア
		m03.appendChild(monthContainer);
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
				articleContainer.appendChild(article);
			}
		} catch (error) {
			console.error(`Error loading article for ${date}:`, error);
		}
	}
}
