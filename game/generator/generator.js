// グローバルスコープのデータを参照
const termParts = window.termParts;

// 履歴管理用の配列
let termHistory = [];

// DOM要素の取得
const currentTermElement = document.getElementById('currentTerm');
const termHistoryElement = document.getElementById('termHistory');
const termHistoryList = document.getElementById('termHistoryList');

// ユーティリティ関数
function getRandomElement(array, probability = 0.8) {
    if (!array || array.length === 0) return '';
    return Math.random() < probability ? array[Math.floor(Math.random() * array.length)] : '';
}

// 専門用語生成関数
function generateNewTerm() {
    // シンプルモードかごちゃっとしたモードかをランダムに決定
    const isSimpleMode = Math.random() < 0.7;  // 70%の確率でシンプルモード

    let newTerm = '';
    
    if (isSimpleMode) {
        // シンプルモード: 2-3要素の組み合わせ
        const numElements = Math.random() < 0.5 ? 2 : 3;
        
        if (numElements === 2) {
            // 2要素の場合（例：「プロセス神学」）
            const core = getRandomElement(termParts.core, 0.98);
            const suffix = getRandomElement(termParts.suffix, 0.98);
            if (core) newTerm += core;
            if (suffix) newTerm += suffix;
        } else {
            // 3要素の場合（例：「メタ記号論」）
            const prefix = getRandomElement(termParts.prefix, 0.98);
            const core = getRandomElement(termParts.core, 0.98);
            const suffix = getRandomElement(termParts.suffix, 0.98);
            if (prefix) newTerm += prefix;
            if (core) newTerm += core;
            if (suffix) newTerm += suffix;
        }
    } else {
        // ごちゃっとモード: 多要素の組み合わせ
        const prefix = getRandomElement(termParts.prefix, 0.85);
        const core = getRandomElement(termParts.core, 0.98);
        const subject = getRandomElement(termParts.subject, 0.9);
        const suffix = getRandomElement(termParts.suffix, 0.95);

        if (prefix) newTerm += prefix;
        if (core) {
            newTerm += core;
            if (subject && Math.random() < 0.85) newTerm += '型';
        }
        if (subject) newTerm += subject;
        if (suffix) newTerm += suffix;
    }

    if (!newTerm) {
        return generateNewTerm();
    }

    // 履歴の更新
    if (currentTermElement.textContent !== '生成中...') {
        termHistory.unshift(currentTermElement.textContent);
        termHistory = termHistory.slice(0, 3);
        updateTermHistory();
    }

    currentTermElement.textContent = newTerm;
}

// 履歴表示の更新関数
function updateTermHistory() {
    if (termHistory.length > 0) {
        termHistoryElement.style.display = 'block';
        termHistoryList.innerHTML = termHistory
            .map(term => `<li>${term}</li>`)
            .join('');
    }
}

// 初期生成
window.addEventListener('load', () => {
    generateNewTerm();
});