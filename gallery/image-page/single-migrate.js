/**
 * 単一ページ移行ツール v1.1
 * 1ページずつ対話的に変換（修正版）
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { JSDOM } = require('jsdom');

class SinglePageMigrator {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.stats = {
            processed: 0,
            success: 0,
            failed: 0
        };
        
        this.currentFile = null;
    }

    /**
     * メイン実行
     */
    async run() {
        console.log('🎯 Single Page Migration Tool v1.1');
        console.log('=====================================');
        console.log('1ページずつ対話的に変換します\n');

        try {
            await this.selectAndMigrate();
        } catch (error) {
            console.error('❌ Error:', error.message);
        } finally {
            this.rl.close();
        }
    }

    /**
     * ファイル選択と移行
     */
    async selectAndMigrate() {
        while (true) {
            const action = await this.showMainMenu();
            
            switch (action) {
                case '1':
                    await this.browseAndSelect();
                    break;
                case '2':
                    await this.directPathInput();
                    break;
                case '3':
                    await this.showRecentFiles();
                    break;
                case '4':
                    this.showStats();
                    break;
                case 'q':
                    console.log('👋 終了します');
                    return;
                default:
                    console.log('❌ 無効な選択です');
            }
        }
    }

    /**
     * メインメニュー表示
     */
    async showMainMenu() {
        console.log('\n📋 メインメニュー');
        console.log('─'.repeat(30));
        console.log('1. ディレクトリから選択');
        console.log('2. ファイルパス直接入力');
        console.log('3. 最近のファイル表示');
        console.log('4. 統計情報表示');
        console.log('q. 終了');
        console.log('─'.repeat(30));
        
        return await this.question('選択してください [1-4, q]: ');
    }

    /**
     * ディレクトリブラウザ
     */
    async browseAndSelect() {
        let currentDir = './';
        
        while (true) {
            console.log(`\n📁 現在のディレクトリ: ${path.resolve(currentDir)}`);
            console.log('─'.repeat(50));
            
            const items = this.getDirectoryContents(currentDir);
            
            if (items.length === 0) {
                console.log('📂 このディレクトリは空です');
                currentDir = path.dirname(currentDir);
                continue;
            }
            
            // ディレクトリとファイルを表示
            items.forEach((item, index) => {
                const icon = item.isDirectory ? '📁' : '📄';
                const name = item.isDirectory ? `${item.name}/` : item.name;
                console.log(`${index + 1}. ${icon} ${name}`);
            });
            
            console.log('0. 🔙 上のディレクトリ');
            console.log('q. 🏠 メインメニューに戻る');
            
            const choice = await this.question('\n選択してください: ');
            
            if (choice === 'q') {
                return;
            }
            
            if (choice === '0') {
                currentDir = path.dirname(currentDir);
                continue;
            }
            
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < items.length) {
                const selected = items[index];
                const fullPath = path.join(currentDir, selected.name);
                
                if (selected.isDirectory) {
                    currentDir = fullPath;
                } else if (selected.name.endsWith('.html')) {
                    await this.processFile(fullPath);
                    return;
                } else {
                    console.log('❌ HTMLファイルを選択してください');
                }
            } else {
                console.log('❌ 無効な選択です');
            }
        }
    }

    /**
     * ディレクトリ内容取得
     */
    getDirectoryContents(dirPath) {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            return entries
                .filter(entry => !entry.name.startsWith('.'))
                .sort((a, b) => {
                    // ディレクトリを先に、その後ファイル名順
                    if (a.isDirectory() && !b.isDirectory()) return -1;
                    if (!a.isDirectory() && b.isDirectory()) return 1;
                    return a.name.localeCompare(b.name);
                })
                .map(entry => ({
                    name: entry.name,
                    isDirectory: entry.isDirectory()
                }));
        } catch (error) {
            console.log(`❌ ディレクトリ読み込みエラー: ${error.message}`);
            return [];
        }
    }

    /**
     * 直接パス入力
     */
    async directPathInput() {
        const filePath = await this.question('\nHTMLファイルのパスを入力してください: ');
        
        if (!filePath.trim()) {
            console.log('❌ パスが入力されていません');
            return;
        }
        
        if (!fs.existsSync(filePath)) {
            console.log('❌ ファイルが存在しません');
            return;
        }
        
        if (!filePath.endsWith('.html')) {
            console.log('❌ HTMLファイルを指定してください');
            return;
        }
        
        await this.processFile(filePath);
    }

    /**
     * 最近のファイル表示（簡易版）
     */
    async showRecentFiles() {
        console.log('\n📋 最近のHTMLファイル (現在のディレクトリ以下)');
        console.log('─'.repeat(50));
        
        const recentFiles = this.findRecentHtmlFiles('./');
        
        if (recentFiles.length === 0) {
            console.log('📂 HTMLファイルが見つかりません');
            return;
        }
        
        recentFiles.slice(0, 10).forEach((file, index) => {
            console.log(`${index + 1}. 📄 ${file.path}`);
            console.log(`   📅 ${file.mtime.toLocaleString()}`);
        });
        
        const choice = await this.question('\n選択してください (1-10, Enter=戻る): ');
        
        if (!choice.trim()) return;
        
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < Math.min(recentFiles.length, 10)) {
            await this.processFile(recentFiles[index].path);
        } else {
            console.log('❌ 無効な選択です');
        }
    }

    /**
     * 最近のHTMLファイル検索
     */
    findRecentHtmlFiles(dir, maxDepth = 3) {
        const files = [];
        
        function scan(currentDir, depth) {
            if (depth > maxDepth) return;
            
            try {
                const entries = fs.readdirSync(currentDir, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue;
                    
                    const fullPath = path.join(currentDir, entry.name);
                    
                    if (entry.isDirectory()) {
                        scan(fullPath, depth + 1);
                    } else if (entry.name.endsWith('.html')) {
                        const stats = fs.statSync(fullPath);
                        files.push({
                            path: fullPath,
                            mtime: stats.mtime
                        });
                    }
                }
            } catch (error) {
                // ディレクトリアクセスエラーは無視
            }
        }
        
        scan(dir, 0);
        return files.sort((a, b) => b.mtime - a.mtime);
    }

    /**
     * ファイル処理
     */
    async processFile(filePath) {
        this.currentFile = filePath;
        this.stats.processed++;
        
        console.log(`\n🔍 ファイル分析: ${filePath}`);
        console.log('─'.repeat(50));
        
        try {
            // ファイル読み込み
            const htmlContent = fs.readFileSync(filePath, 'utf8');
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;
            
            // ページ情報抽出
            const pageInfo = this.extractPageInfo(document, filePath);
            this.displayPageInfo(pageInfo);
            
            // 既に変換済みかチェック
            const isAlreadyMigrated = this.checkIfMigrated(document);
            if (isAlreadyMigrated) {
                console.log('✅ このファイルは既に新システムに対応済みです');
                const overwrite = await this.question('再変換しますか？ [y/N]: ');
                if (overwrite.toLowerCase() !== 'y') {
                    return;
                }
            }
            
            // 変換確認
            const proceed = await this.question('\nこのファイルを変換しますか？ [Y/n]: ');
            if (proceed.toLowerCase() === 'n') {
                console.log('⏸️ 変換をスキップしました');
                return;
            }
            
            // 出力先選択
            const outputPath = await this.selectOutputPath(filePath);
            if (!outputPath) return;
            
            // 変換実行
            await this.migrateFile(dom, pageInfo, outputPath);
            
        } catch (error) {
            console.error(`❌ 処理エラー: ${error.message}`);
            this.stats.failed++;
        }
    }

    /**
     * ページ情報抽出（複数手段対応）
     */
    extractPageInfo(document, filePath) {
        const fileName = path.basename(filePath, '.html');
        
        // シリーズ特定（複数手段）
        let series = 'unknown';
        let id = fileName;
        
        // 1. ファイル名パターンマッチング
        const seriesPatterns = [
            // メインシリーズ
            { pattern: /^(fanart)_(.+)$/, series: 'fanart' },
            { pattern: /^(original)_(.+)$/, series: 'original' },
            { pattern: /^(works)_(.+)$/, series: 'works' },
            { pattern: /^(commission)_(.+)$/, series: 'commission' },
            { pattern: /^(groundpolis_paint)_(.+)$/, series: 'groundpolis_paint' },
            
            // originalサブシリーズ
            { pattern: /^(ao-chan)_(.+)$/, series: 'original' },
            { pattern: /^(oc\d+)_(.+)$/, series: 'original' },
            { pattern: /^(oc_misc)_(.+)$/, series: 'original' },
            { pattern: /^(idoko)_(.+)$/, series: 'original' },
            
            // worksシリーズ（特殊なファイル名）
            { pattern: /^(nofederation)$/, series: 'works' },
            { pattern: /^(stilldreaminghour0)$/, series: 'works' },
            { pattern: /^(littlegirlisdead)$/, series: 'works' },
            { pattern: /^(remain_in)$/, series: 'works' },
            { pattern: /^(elastic_cubes)$/, series: 'works' },
            { pattern: /^(a_perfect_day_to_eat_pancakes)$/, series: 'works' },
            { pattern: /^(23\.11\.18)$/, series: 'works' },
            { pattern: /^(tiny-lo)$/, series: 'works' },
            { pattern: /^(this-years-loid)$/, series: 'works' },
            { pattern: /^(re-summer\(never\)ends)$/, series: 'works' },
            
            // commissionシリーズ（日付ベース）
            { pattern: /^(commission)_(\d{4}-\d{2}-\d{2})$/, series: 'commission' },
            
            // groundpolis_paintシリーズ
            { pattern: /^(gpp)_(.+)$/, series: 'groundpolis_paint' },
            { pattern: /^(gp)(.+)$/, series: 'groundpolis_paint' }
        ];
        
        for (const { pattern, series: seriesName } of seriesPatterns) {
            const match = fileName.match(pattern);
            if (match) {
                series = seriesName;
                break;
            }
        }
        
        // 2. #parentFile要素から確認（旧システム用）
        if (series === 'unknown') {
            const parentFileElement = document.querySelector('#parentFile');
            if (parentFileElement) {
                const parentText = parentFileElement.textContent.trim();
                const seriesMatch = parentText.match(/^(\w+)\s*\/\s*$/);
                if (seriesMatch) {
                    series = seriesMatch[1];
                }
            }
        }
        
        // 3. window.GalleryPageConfigから確認（新システム用）
        if (series === 'unknown') {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                if (script.textContent && script.textContent.includes('GalleryPageConfig')) {
                    const configMatch = script.textContent.match(/currentSeries:\s*['"](\w+)['"]/);
                    if (configMatch) {
                        series = configMatch[1];
                        break;
                    }
                }
            }
        }
        
        // title要素
        const titleElement = document.querySelector('title');
        const title = titleElement ? titleElement.textContent : '';
        
        // 日付要素
        const dateElement = document.querySelector('.date');
        const date = dateElement ? dateElement.textContent.replace(/^>/, '').trim() : '';
        
        return {
            fileName,
            filePath,
            series,
            id,
            title,
            date
        };
    }

    /**
     * ページ情報表示
     */
    displayPageInfo(pageInfo) {
        console.log(`📄 ファイル名: ${pageInfo.fileName}`);
        console.log(`📂 推定シリーズ: ${pageInfo.series}`);
        console.log(`🆔 ID: ${pageInfo.id}`);
        console.log(`📝 タイトル: ${pageInfo.title}`);
        console.log(`📅 日付: ${pageInfo.date || '不明'}`);
    }

    /**
     * 移行済みチェック（新システム特有要素を確認）
     */
    checkIfMigrated(document) {
        // 新システム特有の要素の存在をチェック
        const hasViewToggle = document.querySelector('.view-toggle') !== null;
        const hasTemplates = document.querySelector('#related-item-template') !== null;
        
        return hasViewToggle && hasTemplates;
    }

    /**
     * 出力パス選択
     */
    async selectOutputPath(inputPath) {
        console.log('\n📁 出力先選択');
        console.log('─'.repeat(30));
        console.log('1. 元ファイルを上書き');
        console.log('2. 新しいファイルとして保存');
        console.log('3. 指定パスに保存');
        console.log('0. キャンセル');
        
        const choice = await this.question('選択してください [1-3, 0]: ');
        
        switch (choice) {
            case '1':
                return inputPath;
                
            case '2':
                const dir = path.dirname(inputPath);
                const name = path.basename(inputPath, '.html');
                return path.join(dir, `${name}_migrated.html`);
                
            case '3':
                const customPath = await this.question('保存先パスを入力してください: ');
                if (!customPath.trim()) {
                    console.log('❌ パスが入力されていません');
                    return null;
                }
                return customPath;
                
            case '0':
                console.log('⏸️ キャンセルしました');
                return null;
                
            default:
                console.log('❌ 無効な選択です');
                return null;
        }
    }

    /**
     * ファイル移行
     */
    async migrateFile(dom, pageInfo, outputPath) {
        console.log('\n🔄 変換中...');
        
        const document = dom.window.document;
        
        // HTML変換実行
        this.transformHtml(document, pageInfo);
        
        // ファイル出力
        try {
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, dom.serialize());
            
            console.log('✅ 変換完了！');
            console.log(`📁 出力先: ${outputPath}`);
            
            this.stats.success++;
            
            // 次の行動確認
            await this.showPostMigrationMenu(outputPath);
            
        } catch (error) {
            console.error(`❌ 出力エラー: ${error.message}`);
            this.stats.failed++;
        }
    }

    /**
     * HTML変換
     */
    transformHtml(document, pageInfo) {
        // 1. 旧システム要素の削除・コメント削除
        this.removeOldElements(document);
        
        // 2. ヘッダー変換
        this.transformHeader(document, pageInfo);
        
        // 3. CSSリンク追加
        this.addCssLink(document);
        
        // 4. タグセクション追加
        this.addTagsSection(document);
        
        // 5. テンプレート追加
        this.addTemplates(document);
        
        // 6. 関連作品セクション追加
        this.addRelatedWorksSection(document);
        
        // 7. JavaScriptファイル追加
        this.addScripts(document, pageInfo);
        
        // 8. 古いナビゲーション無効化
        this.disableOldNavigation(document);
    }

    /**
     * 旧システム要素の削除・コメント削除
     */
    removeOldElements(document) {
        // #parentFile要素を削除
        const parentFile = document.querySelector('#parentFile');
        if (parentFile) {
            parentFile.remove();
        }
        
        // 古いナビゲーション矢印を削除
        const arrowNav = document.querySelector('.arrow');
        if (arrowNav) {
            arrowNav.remove();
        }
        
        // コメントノードを削除
        this.removeComments(document);
    }

    /**
     * コメントノード削除
     */
    removeComments(document) {
        const walker = document.createTreeWalker(
            document.body,
            document.defaultView.NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        
        const commentsToRemove = [];
        let node;
        
        while (node = walker.nextNode()) {
            const commentText = node.textContent;
            if (commentText.includes('main.jsから#galleryhtmlへgallery.htmlの挿入') ||
                commentText.includes('main.jsから#footerへfooter.htmlの挿入')) {
                commentsToRemove.push(node);
            }
        }
        
        commentsToRemove.forEach(comment => {
            if (comment.parentNode) {
                comment.parentNode.removeChild(comment);
            }
        });
    }

    /**
     * ヘッダー変換
     */
    transformHeader(document, pageInfo) {
        // 既に新しいヘッダーが存在する場合はスキップ
        if (document.querySelector('#header')) {
            return;
        }
        
        // 旧ヘッダースクリプトを削除
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent && script.textContent.includes('header()')) {
                script.remove();
            }
        });
        
        // 新しいヘッダーを作成
        const header = document.createElement('header');
        header.id = 'header';
        header.innerHTML = `
            <div id="header-flex">
                <nav id="back">
                    <a id="backicon" href="/index.html">&lt;</a>
                </nav>
                <nav id="address" class="addressbar">
                    <a class="addressbar" href="/index.html">100%health</a>/
                    <a class="addressbar" href="../gallery_main.html">gallery</a>/
                    <a class="addressbar" href="${pageInfo.fileName}.html">${pageInfo.fileName}</a>
                </nav>
            </div>
        `;
        
        // #wrapperの最初の子要素として挿入
        const wrapper = document.querySelector('#wrapper');
        if (wrapper) {
            const firstChild = wrapper.firstElementChild;
            if (firstChild) {
                wrapper.insertBefore(header, firstChild);
            } else {
                wrapper.appendChild(header);
            }
        }
    }

    /**
     * CSSリンク追加
     */
    addCssLink(document) {
        const head = document.querySelector('head');
        if (!head) return;
        
        const existingLink = document.querySelector('link[href*="related-content.css"]');
        if (existingLink) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '../related-content.css';
        
        // titleの次に挿入（1column.cssより前）
        const titleElement = head.querySelector('title');
        if (titleElement) {
            titleElement.insertAdjacentElement('afterend', link);
        } else {
            head.appendChild(link);
        }
    }

    /**
     * タグセクション追加
     */
    addTagsSection(document) {
        const piccard = document.querySelector('.piccard');
        if (!piccard) return;
        
        // 既に存在する場合はスキップ
        if (piccard.querySelector('.tags-section')) return;
        
        const dateElement = piccard.querySelector('.date');
        if (!dateElement) return;
        
        const tagsSection = document.createElement('nav');
        tagsSection.className = 'tags-section';
        tagsSection.setAttribute('aria-label', '作品タグ');
        
        tagsSection.innerHTML = `
            <div class="tags-title"><a href="/gallery/tag-page/tags.html">tags:</a></div>
            <div class="tags-list" data-tags-container="">
                <span class="loading-placeholder">タグ読み込み中...</span>
            </div>
        `;
        
        dateElement.insertAdjacentElement('afterend', tagsSection);
    }

    /**
     * テンプレート追加
     */
    addTemplates(document) {
        // 既に存在する場合はスキップ
        if (document.querySelector('#related-item-template')) return;
        
        const main = document.querySelector('main');
        if (!main) return;
        
        const templates = `
        <!-- テンプレート定義 -->
        <template id="related-item-template">
            <div class="related-item" data-id="">
                <a href="" class="image-link">
                    <img src="" alt="" loading="lazy">
                </a>
                <a href="" class="title-link">
                    <span></span>
                </a>
            </div>
        </template>

        <template id="text-link-template">
            <a href="" class="text-item-link"></a>
        </template>

        <template id="tag-link-template">
            <a href="" class="tag-link"></a>
        </template>
        `;
        
        main.insertAdjacentHTML('afterend', templates);
    }

    /**
     * 関連作品セクション追加
     */
    addRelatedWorksSection(document) {
        const footer = document.querySelector('#main-footer');
        if (!footer) return;
        
        // 既存の#galleryhtmlを削除または置換
        const existingGalleryhtml = footer.querySelector('#galleryhtml');
        if (existingGalleryhtml) {
            existingGalleryhtml.remove();
        }
        
        const relatedSection = this.createRelatedWorksSection(document);
        
        const footerhtml = footer.querySelector('#footerhtml');
        if (footerhtml) {
            footerhtml.insertAdjacentElement('beforebegin', relatedSection);
        } else {
            footer.insertAdjacentElement('afterbegin', relatedSection);
        }
    }

    /**
     * 関連作品セクション作成
     */
    createRelatedWorksSection(document) {
        const section = document.createElement('section');
        section.id = 'galleryhtml';
        section.className = 'view-mode-text';
        section.setAttribute('aria-label', '関連作品');
        
        section.innerHTML = `
        <!-- 表示切り替えボタン -->
        <div class="view-toggle" role="tablist" aria-label="表示切り替え">
          <button role="tab" aria-selected="true" aria-controls="related-content" id="text-view-btn">
            テキスト表示
          </button>
          <button role="tab" aria-selected="false" aria-controls="related-content" id="image-view-btn">
            画像表示
          </button>
        </div>

        <div id="related-content" role="tabpanel">
          <div class="related-container">
            <!-- 同シリーズ -->
            <section class="related-section" aria-labelledby="same-series-heading" data-category="same-series">
              <h3 id="same-series-heading" class="related-title gallery_summary">
                &gt; 同シリーズ (<a href="#" data-series-link="">#fanart</a>)
              </h3>
              <div class="related-grid" data-state="loading" data-grid-container="same-series">
                <div class="loading-placeholder">読み込み中...</div>
                <div class="error-placeholder" style="display: none;">読み込みに失敗しました</div>
                <div class="empty-placeholder" style="display: none;">関連する作品がありません</div>
              </div>
              <span class="tags-info" data-count-info="same-series"><!-- 動的生成 --></span>
              <div class="text-links summary_boxes" data-state="loading" data-text-container="same-series">
                <span class="loading-placeholder">読み込み中...</span>
                <span class="error-placeholder" style="display: none;">読み込みに失敗しました</span>
                <span class="empty-placeholder" style="display: none;">関連する作品がありません</span>
              </div>
            </section>

            <!-- 同時期 -->
            <section class="related-section" aria-labelledby="same-period-heading" data-category="same-period">
              <h3 id="same-period-heading" class="related-title gallery_summary">
                &gt; 同時期 (<span data-period-info=""><!-- 動的生成 --></span>)
              </h3>
              <div class="related-grid" data-state="loading" data-grid-container="same-period">
                <div class="loading-placeholder">読み込み中...</div>
                <div class="error-placeholder" style="display: none;">読み込みに失敗しました</div>
                <div class="empty-placeholder" style="display: none;">関連する作品がありません</div>
              </div>
              <span class="tags-info" data-count-info="same-period"><!-- 動的生成 --></span>
              <div class="text-links summary_boxes" data-state="loading" data-text-container="same-period">
                <span class="loading-placeholder">読み込み中...</span>
                <span class="error-placeholder" style="display: none;">読み込みに失敗しました</span>
                <span class="empty-placeholder" style="display: none;">関連する作品がありません</span>
              </div>
            </section>

            <!-- 共通タグ1 -->
            <section class="related-section" aria-labelledby="common-tags-1-heading" data-category="common-tags-1">
              <h3 id="common-tags-1-heading" class="related-title gallery_summary">
                &gt; <a href="#" data-tag-link-1=""><!-- 動的生成 --></a>
              </h3>
              <div class="related-grid" data-state="loading" data-grid-container="common-tags-1">
                <div class="loading-placeholder">読み込み中...</div>
                <div class="error-placeholder" style="display: none;">読み込みに失敗しました</div>
                <div class="empty-placeholder" style="display: none;">関連する作品がありません</div>
              </div>
              <span class="tags-info" data-count-info="common-tags-1"><!-- 動的生成 --></span>
              <div class="text-links summary_boxes" data-state="loading" data-text-container="common-tags-1">
                <span class="loading-placeholder">読み込み中...</span>
                <span class="error-placeholder" style="display: none;">読み込みに失敗しました</span>
                <span class="empty-placeholder" style="display: none;">関連する作品がありません</span>
              </div>
            </section>

            <!-- 共通タグ2 -->
            <section class="related-section" aria-labelledby="common-tags-2-heading" data-category="common-tags-2">
              <h3 id="common-tags-2-heading" class="related-title gallery_summary">
                &gt; <a href="#" data-tag-link-2=""><!-- 動的生成 --></a>
              </h3>
              <div class="related-grid" data-state="loading" data-grid-container="common-tags-2">
                <div class="loading-placeholder">読み込み中...</div>
                <div class="error-placeholder" style="display: none;">読み込みに失敗しました</div>
                <div class="empty-placeholder" style="display: none;">関連する作品がありません</div>
              </div>
              <span class="tags-info" data-count-info="common-tags-2"><!-- 動的生成 --></span>
              <div class="text-links summary_boxes" data-state="loading" data-text-container="common-tags-2">
                <span class="loading-placeholder">読み込み中...</span>
                <span class="error-placeholder" style="display: none;">読み込みに失敗しました</span>
                <span class="empty-placeholder" style="display: none;">関連する作品がありません</span>
              </div>
            </section>
          </div>
        </div>
        `;
        
        return section;
    }

    /**
     * JavaScriptファイル追加
     */
    addScripts(document, pageInfo) {
        const body = document.querySelector('body');
        if (!body) return;
        
        // 既存のgallery-system.jsをチェック
        const existingSystemScript = document.querySelector('script[src*="gallery-system.js"]');
        if (!existingSystemScript) {
            const systemScript = document.createElement('script');
            systemScript.src = '../gallery-system.js';
            body.appendChild(systemScript);
        }
        
        // 既存のGalleryPageConfigをチェック
        const existingConfigScript = Array.from(document.querySelectorAll('script')).find(
            script => script.textContent && script.textContent.includes('GalleryPageConfig')
        );
        
        if (!existingConfigScript) {
            const configScript = document.createElement('script');
            configScript.textContent = `
    // このページ固有の設定
    window.GalleryPageConfig = {
      currentSeries: '${pageInfo.series}',
      currentId: '${pageInfo.id}',
      debug: false  // 本番環境ではfalse
    };
            `;
            body.appendChild(configScript);
        }
    }

    /**
     * 古いナビゲーション無効化
     */
    disableOldNavigation(document) {
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent && script.textContent.includes('galleryhtml')) {
                script.textContent = script.textContent.replace(
                    /galleryhtml/g, 
                    'galleryhtml_disabled'
                );
            }
        });
    }

    /**
     * 変換後メニュー
     */
    async showPostMigrationMenu(outputPath) {
        console.log('\n🎯 次の行動');
        console.log('─'.repeat(30));
        console.log('1. ファイルを開く');
        console.log('2. 次のファイルを変換');
        console.log('3. メインメニューに戻る');
        console.log('4. 終了');
        
        const choice = await this.question('選択してください [1-4]: ');
        
        switch (choice) {
            case '1':
                console.log(`📁 出力ファイル: ${path.resolve(outputPath)}`);
                break;
                
            case '2':
                await this.browseAndSelect();
                break;
                
            case '3':
                return;
                
            case '4':
                this.rl.close();
                process.exit(0);
                
            default:
                console.log('❌ 無効な選択です');
        }
    }

    /**
     * 統計情報表示
     */
    showStats() {
        console.log('\n📊 統計情報');
        console.log('─'.repeat(30));
        console.log(`📁 処理済みファイル: ${this.stats.processed}`);
        console.log(`✅ 成功: ${this.stats.success}`);
        console.log(`❌ 失敗: ${this.stats.failed}`);
        
        if (this.stats.processed > 0) {
            const successRate = ((this.stats.success / this.stats.processed) * 100).toFixed(1);
            console.log(`📈 成功率: ${successRate}%`);
        }
    }

    /**
     * ユーザー入力待機
     */
    question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }
}

// 実行
if (require.main === module) {
    const migrator = new SinglePageMigrator();
    migrator.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = SinglePageMigrator;