// ゲームオブジェクト
var game = {
  canvas: null,
  context: null,
  width: 640,
  height: 480,
  ball: null,
  paddle: null,
  blocks: [],
  destroyed: 0,

  init: function() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    document.body.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");
    this.ball = {
      x: 50,
      y: 50,
      radius: 10,
      dx: 5,
      dy: 5
    };
    this.paddle = {
      x: 200,
      y: 300,
      width: 80,
      height: 10,
      speed: 10,
      moveLeft: function() {
        this.x -= this.speed;
      },
      moveRight: function() {
        this.x += this.speed;
      }
    };
    this.createBlocks();
    this.draw();
    localStorage.setItem("previousImage", this.canvas.toDataURL());
  },

  draw: function() {
    // 背景を描画
    this.context.fillStyle = "black";
    this.context.fillRect(0, 0, this.width, this.height);

    // ボールを描画
    this.context.fillStyle = "white";
    this.context.beginPath();
    this.context.arc(
      this.ball.x,
      this.ball.y,
      this.ball.radius,
      0,
      Math.PI * 2
    );
    this.context.fill();

    // パドルを描画
    this.context.fillStyle = "white";
    this.context.fillRect(
      this.paddle.x,
      this.paddle.y,
      this.paddle.width,
      this.paddle.height
    );

    // ブロックを描画
    for (var i = 0; i < this.blocks.length; i++) {
      var block = this.blocks[i];
      if (!block.destroyed) {
        this.context.fillStyle = "white";
        this.context.fillRect(block.x, block.y, block.width, block.height);
      }
    }
  },

  update: function() {
    // ボールの移動
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // ボールが壁に当たった場合の処理
    if (
      this.ball.x - this.ball.radius <= 0 ||
      this.ball.x + this.ball.radius >= this.width
    ) {
      this.ball.dx = -this.ball.dx;
    }
    if (
      this.ball.y - this.ball.radius <= 0 ||
      this.ball.y + this.ball.radius >= this.height
    ) {
      this.ball.dy = -this.ball.dy;
    }

    // パドルとボールの当たり判定
    if (
      this.ball.y + this.ball.radius >= this.paddle.y &&
      this.ball.x >= this.paddle.x &&
      this.ball.x <= this.paddle.x + this.paddle.width
    ) {
      this.ball.dy = -this.ball.dy;
    }

    // ブロックとボールの当たり判定
    for (var i = 0; i < this.blocks.length; i++) {
      var block = this.blocks[i];
      if (!block.destroyed) {
        if (

          this.ball.y - this.ball.radius <= block.y + block.height &&
          this.ball.x >= block.x &&
          this.ball.x <= block.x + block.width
        ) {
          this.ball.dy = -this.ball.dy;
          block.destroyed = true;
          this.destroyed++;
        }
      }
    }

    // ゲームオーバーの判定
    if (this.ball.y + this.ball.radius >= this.height) {
      this.gameOver();
      return;
    }

    // ゲームクリアの判定
    if (this.destroyed == this.blocks.length) {
      this.gameClear();
      return;
    }

    this.draw();
  },

  createBlocks: function() {
    var rows = 3;
    var cols = 10;
    var padding = 20;
    var blockWidth =
      (this.width - padding * 2 - cols * padding) / cols;
    var blockHeight = 20;
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        this.blocks.push({
          x: padding + j * (blockWidth + padding),
          y: padding + i * (blockHeight + padding),
          width: blockWidth,
          height: blockHeight,
          destroyed: false
        });
      }
    }
  },

  gameOver: function() {
    var previousImage = localStorage.getItem("previousImage");
    var img = new Image();
    img.src = previousImage;
    var self = this;
    img.onload = function() {
      self.context.drawImage(img, 0, 0);
      self.context.fillStyle = "white";
      self.context.font = "bold 36px Arial";
      self.context.fillText("Game Over", 200, 200);
      localStorage.setItem("previousImage", self.canvas.toDataURL());
      setTimeout(function() {
        self.init();
      }, 3000);
    };
  },

  gameClear: function() {
    var previousImage = localStorage.getItem("previousImage");
    var img = new Image();
    img.src = previousImage;
    var self = this;
    img.onload = function() {
      self.context.drawImage(img, 0, 0);
      self.context.fillStyle = "white";
      self.context.font = "bold 36px Arial";
      self.context.fillText("Game Clear", 200, 200);
      localStorage.setItem("previousImage", self.canvas.toDataURL());
      setTimeout(function() {
        self.init();
      }, 3000);
    };
  }
};

// キーボードの状態を取得するためのオブジェクト
var keyState = {};
window.addEventListener(
  "keydown",
  function(e) {
    keyState[e.key] = true;
  },
  true
);
window.addEventListener(
  "keyup",
  function(e) {
    keyState[e.key] = false;
  },
  true
);

game.init();

// ゲームループ
function handleKeys() {
  if (keyState["ArrowRight"]) {
    game.paddle.moveRight();
  }
  if (keyState["ArrowLeft"]) {
    game.paddle.moveLeft();
  }
}

function gameLoop() {
  handleKeys();
  game.update();
  requestAnimationFrame(gameLoop);
}

gameLoop();