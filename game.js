// --- CONFIG ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart');
const goBackBtn = document.getElementById('go-back');
const scoreSpan = document.getElementById('score');
const highScoreSpan = document.getElementById('highscore');
const difficultyLabel = document.getElementById('difficulty-label');
const diffMenu = document.getElementById('difficulty-menu');
const diffButtons = document.querySelectorAll('.diff-btn');
const backToFinBtn = document.getElementById('back-to-fin');
const finSelectMenu = document.getElementById('fin-select-menu');
const finBtns = document.querySelectorAll('.fin-btn');
const poolFinBtn = document.querySelector('.fin-btn[data-fin="poolfin"]');
const poolFinLocked = document.getElementById('poolfin-locked');
const poolFinImg = document.getElementById('poolfin-img');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const GRAVITY = 0.38;
const JUMP = -6.0;
const PIPE_WIDTH = 64;
const PIPE_SPACING = 200;
const PIPE_SPEED = 2.4;
const PIPE_CORNER = 12;

const BIRD_RADIUS = 18; // visual
const BIRD_HIT_RADIUS = 14; // forgiving hitbox!
const BIRD_X = 90;

// --- DIFFICULTY SETTINGS (buffed) ---
const DIFFICULTIES = {
  easy:    { name: "Easy",    gap: 155 },      // buffed (was 170)
  medium:  { name: "Medium",  gap: 130 },      // buffed (was 142)
  hard:    { name: "Hard",    gap: 119 },
  killer:  { name: "Fin Killer", gap: 95 }
};
let currentDifficulty = null;

let PIPE_GAP = DIFFICULTIES.medium.gap;

// --- FIN SELECTION LOGIC ---
const FINS = {
  schoolfin: { name: "School Fin", img: "schoolfin.jpg" },
  poolfin:   { name: "Pool Fin", img: "fin.jpg" }
};
let currentFin = "schoolfin";

function saveFinChoice(finKey) {
  localStorage.setItem('flappy-fin-currentfin', finKey);
}
function loadFinChoice() {
  let saved = localStorage.getItem('flappy-fin-currentfin');
  if (saved && FINS[saved]) currentFin = saved;
}

function hasUnlockedPoolFin() {
  return highScores.killer >= 10;
}

// --- HIGH SCORE STORAGE ---
const HS_KEYS = {
  easy:   'flappy-fin-highscore-easy',
  medium: 'flappy-fin-highscore-medium',
  hard:   'flappy-fin-highscore-hard',
  killer: 'flappy-fin-highscore-killer'
};
let highScores = {
  easy:   0,
  medium: 0,
  hard:   0,
  killer: 0
};
function loadHighScores() {
  for (let diff in HS_KEYS) {
    let val = localStorage.getItem(HS_KEYS[diff]);
    highScores[diff] = val ? parseInt(val, 10) : 0;
  }
}
function saveHighScore(diff, score) {
  highScores[diff] = score;
  localStorage.setItem(HS_KEYS[diff], score);
}
function updateHighScoreDisplay() {
  if (currentDifficulty) {
    highScoreSpan.textContent = "Best: " + highScores[currentDifficulty.key];
  }
}
function hasUnlockedMedium() {
  return highScores.easy >= 10;
}
function hasUnlockedHard() {
  return highScores.medium >= 10;
}
function hasUnlockedKiller() {
  return highScores.hard >= 10;
}

loadHighScores();
loadFinChoice();

// --- GAME STATE ---
let pipes = [];
let bird = { y: HEIGHT / 2, vy: 0 };
let score = 0;
let gameOver = false;
let started = false;
let birdImg = new Image();
setBirdImage();

function setBirdImage() {
  birdImg.src = FINS[currentFin].img;
}

// --- PIPE GENERATION ---
function makePipe(x) {
  const minY = 80;
  const maxY = HEIGHT - PIPE_GAP - 120;
  const topH = minY + Math.random() * (maxY - minY);
  return {
    x: x,
    top: topH,
    bottom: topH + PIPE_GAP,
    passed: false,
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
  goBackBtn.style.display = "none";
}

// --- DRAW PIPE (Gradient, improved corners!) ---
function drawPipe(x, top, bottom) {
  // Top pipe (rounded ONLY at bottom)
  let grad = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
  grad.addColorStop(0, '#186a21');
  grad.addColorStop(0.5, '#57e14f');
  grad.addColorStop(1, '#186a21');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x + PIPE_WIDTH, 0);
  ctx.lineTo(x + PIPE_WIDTH, top - PIPE_CORNER);
  ctx.arcTo(x + PIPE_WIDTH, top, x + PIPE_WIDTH - PIPE_CORNER, top, PIPE_CORNER);
  ctx.lineTo(x + PIPE_CORNER, top);
  ctx.arcTo(x, top, x, top - PIPE_CORNER, PIPE_CORNER);
  ctx.lineTo(x, 0);
  ctx.closePath();
  ctx.fill();

  // Bottom pipe (rounded ONLY at top)
  ctx.beginPath();
  ctx.moveTo(x, bottom + PIPE_CORNER);
  ctx.lineTo(x, HEIGHT);
  ctx.lineTo(x + PIPE_WIDTH, HEIGHT);
  ctx.lineTo(x + PIPE_WIDTH, bottom + PIPE_CORNER);
  ctx.arcTo(x + PIPE_WIDTH, bottom, x + PIPE_WIDTH - PIPE_CORNER, bottom, PIPE_CORNER);
  ctx.lineTo(x + PIPE_CORNER, bottom);
  ctx.arcTo(x, bottom, x, bottom + PIPE_CORNER, PIPE_CORNER);
  ctx.closePath();
  ctx.fill();
}

// --- DRAW BIRD ---
function drawBird(y) {
  if (birdImg.complete && birdImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(BIRD_X, y, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(birdImg, BIRD_X - BIRD_RADIUS, y - BIRD_RADIUS, BIRD_RADIUS * 2, BIRD_RADIUS * 2);
    ctx.restore();
    // Optionally visualize hitbox (for dev)
    // ctx.strokeStyle = 'rgba(255,0,0,0.6)';
    // ctx.beginPath();
    // ctx.arc(BIRD_X, y, BIRD_HIT_RADIUS, 0, Math.PI * 2);
    // ctx.stroke();
  } else {
    ctx.fillStyle = "#ffcf2f";
    ctx.beginPath();
    ctx.arc(BIRD_X, y, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- COLLISION DETECTION ---
function collides(pipe) {
  // Use the more forgiving hitbox!
  let birdTop = bird.y - BIRD_HIT_RADIUS;
  let birdBot = bird.y + BIRD_HIT_RADIUS;
  let birdLeft = BIRD_X - BIRD_HIT_RADIUS;
  let birdRight = BIRD_X + BIRD_HIT_RADIUS;
  let pipeLeft = pipe.x;
  let pipeRight = pipe.x + PIPE_WIDTH;
  // Only check if bird is actually between pipes horizontally
  if (birdRight > pipeLeft && birdLeft < pipeRight) {
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
  bird.vy += GRAVITY;
  bird.y += bird.vy;

  for (let pipe of pipes) {
    pipe.x -= PIPE_SPEED;
  }
  if (pipes[0].x + PIPE_WIDTH < 0) pipes.shift();
  if (pipes.length < 2) {
    let lastX = pipes[pipes.length - 1].x;
    pipes.push(makePipe(lastX + PIPE_SPACING));
  }
  for (let pipe of pipes) {
    if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
      score++;
      pipe.passed = true;
      scoreSpan.textContent = score;
      // Check and save high score per difficulty
      if (score > highScores[currentDifficulty.key]) {
        saveHighScore(currentDifficulty.key, score);
        updateHighScoreDisplay();
        // If unlocked a mode or Pool Fin, update menus
        if (
          (currentDifficulty.key === "easy" && score === 10) ||
          (currentDifficulty.key === "medium" && score === 10) ||
          (currentDifficulty.key === "hard" && score === 10) ||
          (currentDifficulty.key === "killer" && score === 10)
        ) {
          updateDifficultyMenu();
          updateFinMenu();
        }
      }
    }
  }
  for (let pipe of pipes) {
    if (collides(pipe)) gameOver = true;
  }
  if (bird.y - BIRD_HIT_RADIUS < 0 || bird.y + BIRD_HIT_RADIUS > HEIGHT) gameOver = true;

  draw();
  if (!gameOver) requestAnimationFrame(update);
  else {
    restartBtn.style.display = "inline-block";
    goBackBtn.style.display = "inline-block";
  }
}

// --- DRAW EVERYTHING ---
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  for (let pipe of pipes) {
    drawPipe(pipe.x, pipe.top, pipe.bottom);
  }
  drawBird(bird.y);

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
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  jump();
}, {passive: false});
window.addEventListener('keydown', e => {
  if (e.code === 'Space') jump();
});
restartBtn.addEventListener('click', () => {
  resetGame();
  draw();
});
goBackBtn.addEventListener('click', () => {
  showDifficultyMenu();
});

// --- DIFFICULTY MENU LOGIC ---
function setDifficulty(diffKey) {
  currentDifficulty = { ...DIFFICULTIES[diffKey], key: diffKey };
  PIPE_GAP = DIFFICULTIES[diffKey].gap;
  difficultyLabel.textContent = currentDifficulty.name;
  scoreSpan.textContent = "0";
  updateHighScoreDisplay();
  diffMenu.style.display = 'none';
  resetGame();
  draw();
}

function showDifficultyMenu() {
  updateDifficultyMenu();
  diffMenu.style.display = 'block';
  restartBtn.style.display = "none";
  goBackBtn.style.display = "none";
}

function updateDifficultyMenu() {
  diffButtons.forEach(btn => {
    const key = btn.getAttribute('data-diff');
    if (key === "easy") {
      btn.disabled = false;
      btn.classList.remove('locked');
      btn.textContent = "Easy";
      btn.title = "";
    }
    if (key === "medium") {
      if (hasUnlockedMedium()) {
        btn.disabled = false;
        btn.classList.remove('locked');
        btn.textContent = "Medium";
        btn.title = "";
      } else {
        btn.disabled = true;
        btn.classList.add('locked');
        btn.textContent = "Medium 🔒";
        btn.title = "Get 10+ on Easy to unlock!";
      }
    }
    if (key === "hard") {
      if (hasUnlockedHard()) {
        btn.disabled = false;
        btn.classList.remove('locked');
        btn.textContent = "Hard";
        btn.title = "";
      } else {
        btn.disabled = true;
        btn.classList.add('locked');
        btn.textContent = "Hard 🔒";
        btn.title = "Get 10+ on Medium to unlock!";
      }
    }
    if (key === "killer") {
      if (hasUnlockedKiller()) {
        btn.disabled = false;
        btn.classList.remove('locked');
        btn.textContent = "Fin Killer";
        btn.title = "Good luck!";
      } else {
        btn.disabled = true;
        btn.classList.add('locked');
        btn.textContent = "Fin Killer 🔒";
        btn.title = "Get 10+ on Hard to unlock!";
      }
    }
  });
}
backToFinBtn.addEventListener('click', () => {
  showFinMenu();
  diffMenu.style.display = 'none';
});
diffButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    const key = btn.getAttribute('data-diff');
    if (DIFFICULTIES[key]) {
      if (
        (key === "easy") ||
        (key === "medium" && hasUnlockedMedium()) ||
        (key === "hard" && hasUnlockedHard()) ||
        (key === "killer" && hasUnlockedKiller())
      ) {
        setDifficulty(key);
      }
    }
  });
});

// --- FIN MENU LOGIC ---
function showFinMenu() {
  updateFinMenu();
  finSelectMenu.style.display = 'block';
  diffMenu.style.display = 'none';
  restartBtn.style.display = "none";
  goBackBtn.style.display = "none";
}
function updateFinMenu() {
  finBtns.forEach(btn => {
    const key = btn.getAttribute('data-fin');
    btn.classList.remove('selected', 'locked');
    if (currentFin === key) btn.classList.add('selected');
    if (key === "poolfin") {
      if (hasUnlockedPoolFin()) {
        btn.classList.remove('locked');
        poolFinLocked.style.display = "none";
      } else {
        btn.classList.add('locked');
        poolFinLocked.style.display = "block";
      }
    }
  });
}
finBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    const key = btn.getAttribute('data-fin');
    if (key === "poolfin" && !hasUnlockedPoolFin()) return;
    currentFin = key;
    saveFinChoice(currentFin);
    setBirdImage();
    updateFinMenu();
  });
});

// --- FLOW CONTROL ---
// On page load, show Fin menu!
birdImg.onload = function() {
  showFinMenu();
};
birdImg.onerror = function() {
  showFinMenu();
};

function startGameFromMenus() {
  finSelectMenu.style.display = 'none';
  diffMenu.style.display = 'block';
  updateDifficultyMenu();
  updateFinMenu();
}

finSelectMenu.addEventListener('keydown', function(e) {
  if (e.key === "Enter") startGameFromMenus();
});
finSelectMenu.addEventListener('dblclick', startGameFromMenus);

resetGame();
draw();
showFinMenu();
