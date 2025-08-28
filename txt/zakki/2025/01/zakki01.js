async function loadDailyArticles01() {
	const month = "01";
	const year = "2025";
	const dates = ["01"];

	// まず#zakki01を探す、なければ#m01内に作成
	let monthContainer = document.querySelector("#zakki01");
	if (!monthContainer) {
		const m01 = document.querySelector("#m01");
		if (!m01) {
			console.error("No container found for month 01");
			return;
		}

		// #zakki01を作成
		monthContainer = document.createElement("div");
		monthContainer.id = "zakki01";

		// h2を追加
		const h2 = document.createElement("h2");
		const a = document.createElement("a");
		a.href = `/txt/zakki/${year}/${month}/${year}-${month}.html`;
		a.textContent = `${year}-${month}`;
		h2.appendChild(a);
		monthContainer.appendChild(h2);

		m01.innerHTML = ""; // 既存のコンテンツをクリア
		m01.appendChild(monthContainer);
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
				// 短縮版記事を作成
				const truncatedArticle = createTruncatedArticle(article);
				articleContainer.appendChild(truncatedArticle);
			}
		} catch (error) {
			console.error(`Error loading article for ${date}:`, error);
		}
	}
}

// 短縮版記事を作成する関数（月別ファイル用）
function createTruncatedArticle(articleElement) {
	const truncatedArticle = document.createElement('article');
	truncatedArticle.id = articleElement.id;
	truncatedArticle.className = articleElement.className;
	
	// 見出しを保持
	const h3 = articleElement.querySelector('h3');
	if (h3) {
		const accessibleH3 = h3.cloneNode(true);
		accessibleH3.setAttribute('aria-expanded', 'false');
		truncatedArticle.appendChild(accessibleH3);
	}
	
	// 短縮版テキスト（最初の7行程度）
	const textContent = articleElement.textContent;
	const lines = textContent.split('\n').filter(line => line.trim());
	const truncatedText = lines.slice(0, 7).join('\n');
	
	const preview = document.createElement('div');
	preview.className = 'article-preview';
	preview.innerHTML = `<p>${truncatedText}...</p>`;
	truncatedArticle.appendChild(preview);
	
	// 続きを読むボタン
	const readMoreBtn = document.createElement('button');
	readMoreBtn.textContent = '続きを読む';
	readMoreBtn.className = 'read-more-btn';
	readMoreBtn.setAttribute('aria-expanded', 'false');
	readMoreBtn.setAttribute('data-article-id', articleElement.id);
	readMoreBtn.addEventListener('click', async function() {
		await loadFullArticle(articleElement.id, this);
	});
	truncatedArticle.appendChild(readMoreBtn);
	
	return truncatedArticle;
}

// 全文記事を読み込む関数（月別ファイル用）
async function loadFullArticle(articleId, button) {
	try {
		const year = "2025";
		const month = "01";
		const response = await fetch(`/txt/zakki/${year}/${month}/days/${year}-${month}-${articleId.slice(-2)}.html`);
		if (!response.ok) return;
		
		const text = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'text/html');
		const fullArticle = doc.querySelector('article');
		
		if (fullArticle) {
			const articleContainer = button.closest('article');
			articleContainer.innerHTML = fullArticle.innerHTML;
			articleContainer.setAttribute('aria-expanded', 'true');
		}
	} catch (error) {
		console.error(`Error loading full article:`, error);
	}
}
