async function loadDailyArticles09() {
	const month = "09";
	const year = "2025";
	const dates = ["02"];

	let monthContainer = document.querySelector("#zakki09");
	if (!monthContainer) {
		const m09 = document.querySelector("#m09");
		if (!m09) {
			console.error("No container found for month 09");
			return;
		}

		// #zakki02を作成
		monthContainer = document.createElement("div");
		monthContainer.id = "zakki09";

		// h2を追加
		const h2 = document.createElement("h2");
		const a = document.createElement("a");
		a.href = `/txt/zakki/${year}/${month}/${year}-${month}.html`;
		a.textContent = `${year}-${month}`;
		h2.appendChild(a);
		monthContainer.appendChild(h2);

		m09.innerHTML = ""; // 既存のコンテンツをクリア
		m09.appendChild(monthContainer);
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
