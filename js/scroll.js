(function(window) {
    // 名前空間の作成
    window.ScrollAnimationModule = window.ScrollAnimationModule || {};

    class SequenceAnimation {
        constructor(options) {
            // パスの正規化
            const basePath = options.imagePath || 'gif/';
            this.imagePath = basePath.endsWith('/') ? basePath : basePath + '/';
            this.prefix = options.prefix || 'frame-';
            
            this.containerElement = document.getElementById('animation-frame');
            this.currentFrame = 0;
            this.images = [];
            this.isInitialized = false;
            this.scrollSensitivity = options.scrollSensitivity || 100;
            
            this.possibleExtensions = [
                '.png',
                '.jpg',
                '.jpeg',
                '.webp',
                '.gif'
            ];

            this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
            this.resizeObserver.observe(document.documentElement);
        }

        async initialize() {
            try {
                await this.detectAndLoadFrames();
                
                if (this.images.length > 0) {
                    this.images[0].classList.add('active');
                    this.setupScrollHandler();
                    this.setupTouchHandler();
                    this.isInitialized = true;
                }
            } catch (error) {
                console.error('初期化エラー:', error);
            }
        }

        async testImageExists(filename) {
            return new Promise((resolve) => {
                const img = new Image();
                const timer = setTimeout(() => {
                    img.src = '';
                    resolve([false, null]);
                }, 5000);

                img.onload = () => {
                    clearTimeout(timer);
                    resolve([true, img]);
                };
                img.onerror = () => {
                    clearTimeout(timer);
                    resolve([false, null]);
                };
                img.src = filename;
            });
        }

        async detectAndLoadFrames() {
            const patterns = [
                num => num.toString(),
                num => num.toString().padStart(2, '0'),
                num => num.toString().padStart(3, '0'),
                num => num.toString().padStart(4, '0')
            ];

            let correctPattern = null;
            let correctExtension = null;

            patternLoop:
            for (const pattern of patterns) {
                for (const ext of this.possibleExtensions) {
                    const filename = `${this.imagePath}${this.prefix}${pattern(1)}${ext}`;
                    console.log('試行中のファイル:', filename);
                    const [exists] = await this.testImageExists(filename);
                    if (exists) {
                        console.log('成功: パターンを検出:', filename);
                        correctPattern = pattern;
                        correctExtension = ext;
                        break patternLoop;
                    }
                }
            }

            if (!correctPattern || !correctExtension) {
                console.error('パターン検出失敗');
                throw new Error('有効なフレームが見つかりませんでした');
            }

            let frameIndex = 1;
            while (true) {
                const filename = `${this.imagePath}${this.prefix}${correctPattern(frameIndex)}${correctExtension}`;
                console.log('フレーム読み込み試行:', filename);
                const [exists, img] = await this.testImageExists(filename);
                
                if (!exists) {
                    console.log('読み込み完了。総フレーム数:', frameIndex - 1);
                    break;
                }

                img.alt = `Frame ${frameIndex}`;
                this.containerElement.appendChild(img);
                this.images.push(img);
                frameIndex++;
            }

            console.log('読み込んだ画像数:', this.images.length);
        }

        setupScrollHandler() {
            const sensitivity = this.scrollSensitivity || 100;
            const wrapper = document.getElementById('wrapper');
            
            if (!wrapper) {
                console.error('#wrapper要素が見つかりません');
                return;
            }
        
            wrapper.addEventListener('scroll', () => {
                requestAnimationFrame(() => {
                    const scrollPosition = wrapper.scrollTop;
                    const frameIndex = Math.floor((scrollPosition / sensitivity) % this.images.length);
                    this.showFrame(frameIndex);
                });
            }, { passive: true });
        }

        updateFrame() {
            if (!this.isInitialized) {
                console.log('初期化が完了していません');
                return;
            }

            const scrollPosition = window.scrollY;
            const frameIndex = Math.floor((scrollPosition / this.scrollSensitivity) % this.images.length);
            console.log('スクロール位置:', scrollPosition, 
                      '計算されたフレーム:', frameIndex, 
                      '総フレーム数:', this.images.length);  // 計算値のログ
            this.showFrame(frameIndex);
        }

        showFrame(frameIndex) {
            if (frameIndex === this.currentFrame) return;

            console.log('フレーム切り替え:', 
                      '現在:', this.currentFrame, 
                      '→ 新規:', frameIndex);  // フレーム切り替えのログ

            if (this.images[this.currentFrame]) {
                this.images[this.currentFrame].classList.remove('active');
            }
            
            if (this.images[frameIndex]) {
                this.images[frameIndex].classList.add('active');
            }
            
            this.currentFrame = frameIndex;
        }

        setupTouchHandler() {
            let touchStartY = 0;
            
            this.containerElement.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            this.containerElement.addEventListener('touchmove', (e) => {
                const touchDelta = touchStartY - e.touches[0].clientY;
                this.updateFrameByDelta(touchDelta);
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
        }

        updateFrameByDelta(delta) {
            if (!this.isInitialized) return;

            const frameChange = Math.floor(delta / this.scrollSensitivity * this.images.length);
            const newFrame = (this.currentFrame + frameChange + this.images.length) % this.images.length;
            this.showFrame(newFrame);
        }

        updateFrame() {
            if (!this.isInitialized) return;

            const scrollPosition = window.scrollY;
            const frameIndex = Math.floor((scrollPosition / this.scrollSensitivity) % this.images.length);
            this.showFrame(frameIndex);
        }

        showFrame(frameIndex) {
            if (frameIndex === this.currentFrame) return;

            if (this.images[this.currentFrame]) {
                this.images[this.currentFrame].classList.remove('active');
            }
            
            if (this.images[frameIndex]) {
                this.images[frameIndex].classList.add('active');
                console.log('フレーム切り替え:', frameIndex, this.images[frameIndex].src);
            }
            
            this.currentFrame = frameIndex;
        }

        handleResize() {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            
            this.resizeTimeout = setTimeout(() => {
                this.updateFrame();
            }, 100);
        }

        destroy() {
            this.resizeObserver.disconnect();
            this.images.forEach(img => img.remove());
            this.images = [];
            this.isInitialized = false;
        }
    }

    // 名前空間に追加
    ScrollAnimationModule.createAnimation = function(options) {
        return new SequenceAnimation(options);
    };

})(window);

// デバッグ用のログ
console.log('ScrollAnimationModule loaded:', !!window.ScrollAnimationModule);