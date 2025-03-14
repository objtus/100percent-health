// グローバルスコープで定義されたオブジェクトに代入
window.bookParts = {
    // 名詞的要素（「〇〇と〇〇」「〇〇・〇〇・〇〇」の要素として使用）
    nouns: [
        // 抽象的な概念
        '差異', '同一性', '反復', '生成', '権力', '自由', '理性', '狂気',
        '真理', '方法', '正義', '時間', '歴史', '記憶', '意識', '無意識',
        '言語', '記号', '意味', '構造', 'システム', '主体', '他者', '身体', '精神',
        '連帯', '論理', '超越', '絶対', '無限', '有', '時', '空', '心', '魂',
        
        // 具体的なもの
        '言葉', '物', '書物', '鏡', '迷宮', '地図', '都市', '機械',
        '貨幣', '商品', '市場', '国家', '制度', '法', '戦争', '革命',
        '銃', '病原菌', '鉄',
        
        // 現代的な要素
        'ネットワーク', 'アルゴリズム', 'データ', 'コード', 'メディア',
        'プラットフォーム', 'インターフェース', 'シミュレーション',
        
        // 加速主義的/特異点的
        '特異点', '暴力', '欲望', '資本', 'テクノロジー', 'カオス', 'アナーキー',
        '破局', '終末', '限界', '臨界', '変異', '加速', '暴走', '消失', '消滅',
        'ユートピア', 'ディストピア', 'メルトダウン',

        // 社会/文化的な要素
        '社会', '文化', '世界', '人間', '大衆', '民主主義', 
        'ポストモダン', 'モダニティ', '日常', '現実', '共同体', 'グローバル',
        'ナショナリズム', 'マルチチュード', 'ネーション', 'ステート', '交換様式',
        '伝統', 'セクシュアリティ', 'ジェンダー', '周辺', '隠喩', 'パロディ',
        
        // 現代的な問題
        '環境', '情報', '消費', '労働', '生活', '教育',
        'コミュニケーション', 'セキュリティ', 'アイデンティティ',

        // 哲学的・思想的な概念
        '存在', '実存', '本質', '現象', '実体', '偶有性', '超越', 
        'イデア', 'エロス', 'タナトス', '永遠', '虚無', '生命',
        '自然', '経験', '叡智', '直観', '悟性', '感性', '快楽', '偶然性',
        '無', '感情', '欲望', '意志', '力', '技術',
        'コミュニズム',

        // 社会批評的な概念
        'イデオロギー', 'ヘゲモニー', 'スペクタクル', '階級',
        'プロパガンダ', '世論', '画一性', '同調性',
        '監視', '管理', '規律', '規範', '逸脱', '秩序', '抵抗',
        '搾取', '疎外', '分業', '余暇', '消費社会', 'アイロニー', 'アレゴリー',

        // 現代的な不安/問題
        'リスク', '危機', 'ウイルス', '感染', '免疫', '不確実性',
        'ビッグデータ', '監視資本主義', '排除',
        '分断', '孤立', '不安', '虚構', '仮想', '夢',

        // 身体・生命関連
        '器官', '感覚', '知覚', '死', '病',
        '遺伝子', 'ゲノム', '細胞', '進化', '退化', '突然変異',

        // テクノロジー関連
        'AI', 'ロボット', 'サイボーグ', 'アンドロイド',
        'インターネット', 'デジタル', 'バーチャル', 'サイバー空間',
        'プログラム', 'プロトコル', '量子',
        'シンギュラリティ', 'トランスヒューマニズム'
    ],

    // 形容詞的要素（タイトルの修飾に使用）
    adjectives: [
        // 基本的な形容
        '新しい', '古い', '永遠の', '現代の', '批判的', '実践的',
        '純粋な', '根源的な', '偶然の', '必然的な', '可能な', '不可能な',
        '透明な', '不透明な', '流動的', '固定的', '自律的', '従属的',

        '偏在的な', '遍在的な', '断片的な', '多層的な',
        'アナログ的な', 'デジタル的な', 'ハイブリッドな',
        '仮想的な', '現実的な', '虚構的な', '実験的な',
        '革命的な', '進歩的な', '退行的な', '退廃的な',
        '未来的な', '終末論的な', '黙示録的な', '神話的な',
        '暴力的な', '破壊的な', '創造的な', '生産的な', '利己的な', '利他的な',

        '哲学的', '形而上学的', '存在論的', '認識論的', 'グローバル的',
        '文学的', '詩的', '劇的な', '歴史学的', '政治的',
        '宗教的', '神学的', 'イデオロギー的', 'ユートピア的', 'ディストピア的',
        '工学的', '実験的', '数学的', '映画的', '絵画的',
        '身体的', '感覚的', '空間的', '時間的', '精神的',
        '知覚的', '運動的', '量子的',
    ],

    // 接続詞（「〇〇と〇〇」形式用）
    connectors: [
        'と', 'または', 'そして'
    ],

    // 動詞化要素（「〇〇化する〇〇」形式用）
    verbalize: [
        // 状態変化
        '液状化', '固体化', '気体化', '結晶化', '断片化', '空洞化',
        '透明化', '不透明化', '無力化', '空虚化', '均質化',
        
        // 性質変化
        '動物化', '機械化', 'デジタル化', '人工化', '自動化',
        '規格化', '標準化', '画一化', '硬直化', '脆弱化',
        
        // 社会的変化
        '大衆化', '個人化', '分断化', '階層化', '差異化',
        '民主化', '官僚化', '商品化', '情報化', '記号化', '分散化', '中央集権化',
        
        // 抽象的変化
        '無効化', '活性化', '純粋化', '極小化', '極大化',
        '最適化', '理想化', '正当化', '特異化', '一般化',
        
        // 否定的変化
        '暴力化', '退廃化', '異常化', '狂気化', '病理化',
        '腐敗化', '荒廃化', '劣化', '衰退化', '形骸化',

        // 現代的な変化
        'ネットワーク化', 'プラットフォーム化', 'アルゴリズム化',
        'バーチャル化', 'シミュレーション化', 'デジタル化',
        'ハイブリッド化', 'サイバー化', 'ロボット化',

        // 社会システム的な変化
        'システム化', 'グローバル化', 'ローカル化', '分権化', '中央化',

        // 生命・身体的な変化
        '身体化', '器官化', '生命化', '無機化', '有機化',
        '進化', '退化', '突然変異化', '遺伝子化',

    ],

    // タイトルパターンとサフィックスを追加
    patterns: {
        whereabouts: ['のゆくえ', 'の源流', 'の終焉', 'の歴史', 'の思想史', 'はどこへ行くのか', '学の最前線', 'の最前線', 'の精神史', 'を超えて', 'の彼方へ', 'の現在'],
        allToo: {
            prefix: '的な、あまりに',
            suffix: '的な'
        },
        types: ['入門', '試論', '講義', '原理', '概論', '序説', '基礎', '原論', '論考', '探求', '学', '思想', '論', '批判', '主義宣言']
    }

};