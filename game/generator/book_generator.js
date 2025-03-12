// グローバルスコープのデータを参照
const bookParts = window.bookParts;

// 履歴管理用の配列
let bookHistory = [];

// DOM要素の取得
const currentBookElement = document.getElementById('currentBook');
const bookHistoryElement = document.getElementById('bookHistory');
const bookHistoryList = document.getElementById('bookHistoryList');

// ユーティリティ関数
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getUniqueElements(array, count) {
    let result = [];
    let tempArray = [...array];
    for (let i = 0; i < count && tempArray.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * tempArray.length);
        result.push(tempArray[randomIndex]);
        tempArray.splice(randomIndex, 1);
    }
    return result;
}

// 「〇〇と〇〇」形式の生成
function generateTwoPartsTitle() {
    const elements = getUniqueElements(bookParts.nouns, 2);
    const connector = getRandomElement(bookParts.connectors);
    return `${elements[0]}${connector}${elements[1]}`;
}

// 「〇〇・〇〇・〇〇」形式の生成
function generateThreePartsTitle() {
    const elements = getUniqueElements(bookParts.nouns, 3);
    return elements.join('・');
}

// 「〇〇な〇〇」形式の生成
function generateModifiedTitle() {
    const noun = getRandomElement(bookParts.nouns);
    const adjective = getRandomElement(bookParts.adjectives);
    return `${adjective}${noun}`;
}

// 「〇〇化する〇〇」形式の生成
function generateVerbalizingTitle() {
    const verbalization = getRandomElement(bookParts.verbalize);
    const noun = getRandomElement(bookParts.nouns);
    return `${verbalization}する${noun}`;
}

function generateWhereaboutsTitle() {
    const noun = getRandomElement(bookParts.nouns);
    const whereabouts = getRandomElement(bookParts.patterns.whereabouts);
    return `${noun}${whereabouts}`;
}

function generateAllTooTitle() {
    const noun = getRandomElement(bookParts.nouns);
    const { prefix, suffix } = bookParts.patterns.allToo;
    return `${noun}${prefix}${noun}${suffix}`;
}

function generateTypeTitle() {
    const noun = getRandomElement(bookParts.nouns);
    const type = getRandomElement(bookParts.patterns.types);
    return `${noun}${type}`;
}

// 書名生成関数
function generateNewBook() {
    const patterns = [
        { func: generateTwoPartsTitle,    weight: 2 },
        { func: generateThreePartsTitle,  weight: 2 },
        { func: generateModifiedTitle,    weight: 2.25 },
        { func: generateVerbalizingTitle, weight: 2 },
        { func: generateWhereaboutsTitle, weight: 1 },
        { func: generateAllTooTitle,      weight: 0.5 },
        { func: generateTypeTitle,        weight: 2 }
    ];

    const totalWeight = patterns.reduce((sum, pattern) => sum + pattern.weight, 0);
    const randomWeight = Math.random() * totalWeight;

    let weightSum = 0;
    for (const pattern of patterns) {
        weightSum += pattern.weight;
        if (randomWeight <= weightSum) {
            let newTitle = pattern.func();

            // 履歴の更新
            if (currentBookElement.textContent !== '生成中...') {
                bookHistory.unshift(currentBookElement.textContent);
                bookHistory = bookHistory.slice(0, 3);
                updateBookHistory();
            }

            currentBookElement.textContent = `『${newTitle}』`;
            return;
        }
    }
}

// 履歴表示の更新関数
function updateBookHistory() {
    if (bookHistory.length > 0) {
        bookHistoryElement.style.display = 'block';
        bookHistoryList.innerHTML = bookHistory
            .map(book => `<li>${book}</li>`)
            .join('');
    }
}

// 初期生成
window.addEventListener('load', () => {
    if (currentBookElement.textContent === '生成中...') {
        generateNewBook();
    }
});