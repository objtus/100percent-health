async function loadDailyArticles02() {
	const month = "02";
	const year = "2025";
	const dates = ["06"];

	// まず#zakki02を探す、なければ#m02内に作成
	let monthContainer = document.querySelector("#zakki02");
	if (!monthContainer) {
		const m02 = document.querySelector("#m02");
		if (!m02) {
			console.error("No container found for month 02");
			return;
		}

		// #zakki02を作成
		monthContainer = document.createElement("div");
		monthContainer.id = "zakki02";

		// h2を追加
		const h2 = document.createElement("h2");
		const a = document.createElement("a");
		a.href = `/txt/zakki/${year}/${month}/${year}-${month}.html`;
		a.textContent = `${year}-${month}`;
		h2.appendChild(a);
		monthContainer.appendChild(h2);

		m02.innerHTML = ""; // 既存のコンテンツをクリア
		m02.appendChild(monthContainer);
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
