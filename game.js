// --- CONFIG ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart');
const scoreSpan = document.getElementById('score');
const highScoreSpan = document.getElementById('highscore');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const GRAVITY = 0.38; // Flappy Bird feel
const JUMP = -7.5;
const PIPE_WIDTH = 64;
const PIPE_GAP = 145; // vertical gap between pipes
const PIPE_SPACING = 200; // horizontal spacing between pipes
const PIPE_SPEED = 2.4;
const PIPE_CORNER = 22;
const PIPE_COLOR_GRADIENT = ['#186a21', '#57e14f', '#186a21'];

const BIRD_RADIUS = 26;
const BIRD_X = 90;
const BIRD_IMG_SRC = "fin.png"; // <-- Replace with your friend's picture!

// --- GAME STATE ---
let pipes = [];
let bird = { y: HEIGHT / 2, vy: 0 };
let score = 0;
let highScore = 0;
let gameOver = false;
let started = false;
let birdImg = new Image();
birdImg.src = BIRD_IMG_SRC;

// --- LOAD HIGH SCORE ---
if (localStorage.getItem('flappy-fin-highscore')) {
  highScore = parseInt(localStorage.getItem('flappy-fin-highscore'), 10);
  highScoreSpan.textContent = "Best: " + highScore;
}

// --- PIPE GENERATION ---
function makePipe(x) {
  // Randomize gap position
  const minY = 80;
  const maxY = HEIGHT - PIPE_GAP - 120;
  const topH = minY + Math.random() * (maxY - minY);
  return {
    x: x,
    top: topH,
    bottom: topH + PIPE_GAP
  };
}

// --- RESET GAME ---
function resetGame() {
  pipes = [
    makePipe(WIDTH + 80),
    makePipe(WIDTH + 80 + PIPE_SPACING)
  ];
  bird = { y: HEIGHT / 2, vy: 0 };
  score = 0;
  gameOver = false;
  started = false;
  scoreSpan.textContent = "0";
  restartBtn.style.display = "none";
}

// --- DRAW PIPE (Gradient) ---
function drawPipe(x, top, bottom) {
  // Top pipe
  let grad = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
  grad.addColorStop(0, PIPE_COLOR_GRADIENT[0]);
  grad.addColorStop(0.5, PIPE_COLOR_GRADIENT[1]);
  grad.addColorStop(1, PIPE_COLOR_GRADIENT[2]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x + PIPE_WIDTH, 0);
  ctx.arcTo(x + PIPE_WIDTH, top, x, top, PIPE_CORNER);
  ctx.arcTo(x, top, x, 0, PIPE_CORNER);
  ctx.closePath();
  ctx.fill();

  // Bottom pipe
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  ctx.lineTo(x + PIPE_WIDTH, bottom);
  ctx.arcTo(x + PIPE_WIDTH, HEIGHT, x, HEIGHT, PIPE_CORNER);
  ctx.arcTo(x, HEIGHT, x, bottom, PIPE_CORNER);
  ctx.closePath();
  ctx.fill();
}

// --- DRAW BIRD ---
function drawBird(y) {
  if (birdImg.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(BIRD_X, y, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(birdImg, BIRD_X - BIRD_RADIUS, y - BIRD_RADIUS, BIRD_RADIUS * 2, BIRD_RADIUS * 2);
    ctx.restore();
  } else {
    // fallback: circle
    ctx.fillStyle = "#ffcf2f";
    ctx.beginPath();
    ctx.arc(BIRD_X, y, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- COLLISION DETECTION ---
function collides(pipe) {
  // Bird bounding box
  let birdTop = bird.y - BIRD_RADIUS;
  let birdBot = bird.y + BIRD_RADIUS;
  let birdLeft = BIRD_X - BIRD_RADIUS;
  let birdRight = BIRD_X + BIRD_RADIUS;
  // Pipe bounds
  let pipeLeft = pipe.x;
  let pipeRight = pipe.x + PIPE_WIDTH;
  // Check horizontal overlap
  if (birdRight > pipeLeft && birdLeft < pipeRight) {
    // Check vertical
    if (birdTop < pipe.top || birdBot > pipe.bottom) {
      return true;
    }
  }
  return false;
}

// --- MAIN GAME LOOP ---
function update() {
  if (!started) {
    draw();
    requestAnimationFrame(update);
    return;
  }
  if (gameOver) {
    draw();
    return;
  }
  // Bird physics
  bird.vy += GRAVITY;
  bird.y += bird.vy;

  // Pipes
  for (let pipe of pipes) {
    pipe.x -= PIPE_SPEED;
  }
  // Remove off-screen pipes, add new
  if (pipes[0].x + PIPE_WIDTH < 0) pipes.shift();
  if (pipes.length < 2) {
    let lastX = pipes[pipes.length - 1].x;
    pipes.push(makePipe(lastX + PIPE_SPACING));
  }
  // Scoring
  for (let pipe of pipes) {
    if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
      score++;
      pipe.passed = true;
      scoreSpan.textContent = score;
      if (score > highScore) {
        highScore = score;
        highScoreSpan.textContent = "Best: " + highScore;
        localStorage.setItem('flappy-fin-highscore', highScore);
      }
    }
  }
  // Collision
  for (let pipe of pipes) {
    if (collides(pipe)) gameOver = true;
  }
  // Top/bottom
  if (bird.y - BIRD_RADIUS < 0 || bird.y + BIRD_RADIUS > HEIGHT) gameOver = true;

  draw();
  if (!gameOver) requestAnimationFrame(update);
  else restartBtn.style.display = "inline-block";
}

// --- DRAW EVERYTHING ---
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  // Pipes
  for (let pipe of pipes) {
    drawPipe(pipe.x, pipe.top, pipe.bottom);
  }
  // Bird
  drawBird(bird.y);
  // Overlay if game over
  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.font = 'bold 48px Segoe UI, Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 24);
    ctx.font = 'bold 24px Segoe UI, Arial';
    ctx.fillText('Click or press space', WIDTH / 2, HEIGHT / 2 + 22);
  } else if (!started) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.font = 'bold 36px Segoe UI, Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Flappy Fin', WIDTH / 2, HEIGHT / 2 - 44);
    ctx.font = '22px Segoe UI, Arial';
    ctx.fillText('Click or press space to start', WIDTH / 2, HEIGHT / 2 + 14);
  }
}

// --- INPUT HANDLING ---
function jump() {
  if (!started) {
    started = true;
    update();
  }
  if (!gameOver) {
    bird.vy = JUMP;
  }
}

canvas.addEventListener('mousedown', jump);
window.addEventListener('keydown', e => {
  if (e.code === 'Space') jump();
});
restartBtn.addEventListener('click', () => {
  resetGame();
  draw();
});

// --- STARTUP ---
birdImg.onload = function() {
  resetGame();
  draw();
};
birdImg.onerror = function() {
  // fallback: yellow circle
  resetGame();
  draw();
};

resetGame();
draw();
