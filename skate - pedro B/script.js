const canvas = document.getElementById("Canvas");
const ctx = canvas.getContext("2d");
canvas.width = 400;
canvas.height = 600;

/* ====== Sprite do player (skate) ====== */
const skateImg = new Image();
skateImg.src = "images/skate.gif";

/* ====== Estado ====== */
let jogoAtivo = false;
let pontuacao = 0;
let velocidade = 5;
let spawn = 90;
let obstaculos = [];
let tick = 0;
let teclado = {};

/* ====== Player com pulo ====== */
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 110,
  w: 40,
  h: 72,         // ajustado depois que a imagem carregar
  velX: 6,
  pulando: false,
  vy: 0,
  g: 0.6,
  yChao: canvas.height - 110,
  maxAlt: 120    // usado para escalar a sombra
};

skateImg.onload = () => {
  // Mantém proporção do GIF (evita esticar)
  const ratio = skateImg.naturalHeight / skateImg.naturalWidth;
  player.h = Math.round(player.w * ratio);
  player.y = player.yChao = canvas.height - (player.h + 20);
};

/* ====== Sons simples ====== */
let audioCtx;
function beep(freq = 440, dur = 0.1) {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g).connect(audioCtx.destination);
  o.frequency.value = freq;
  g.gain.value = 0.05;
  o.start();
  o.stop(audioCtx.currentTime + dur);
}
function pointSound() { beep(800, 0.05); }
function crashSound() { beep(200, 0.1); setTimeout(() => beep(100, 0.15), 100); }
function jumpSound()  { beep(600, 0.10); }

/* ====== Estrada ====== */
function desenharEstrada() {
  ctx.fillStyle = "#2d2f3a";
  ctx.fillRect(50, 0, 300, canvas.height);

  // faixa central tracejada
  ctx.fillStyle = "#fff";
  for (let y = (tick * velocidade) % 40 - 40; y < canvas.height; y += 40) {
    ctx.fillRect(canvas.width / 2 - 2, y, 4, 20);
  }
}

/* ====== Sombra (corrigida) ======
   - Sempre no chão (yChao + h - offset)
   - Largura/altura diminuem conforme a altura do pulo
   - Desenhada ANTES dos obstáculos e do player (fica no "chão")
*/
function desenharSombra() {
  const altura = Math.max(0, player.yChao - player.y);     // quanto acima do chão
  const t = Math.min(1, altura / player.maxAlt);            // 0..1
  const baseW = player.w * 0.7;
  const baseH = 10;

  const w = baseW * (1 - 0.6 * t);                          // até 40% menor no ápice
  const h = baseH * (1 - 0.6 * t);
  const cx = player.x + player.w / 2;
  const cy = player.yChao + player.h - 6;                   // ~ sob os “pés”

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ====== Obstáculos ====== */
function gerarObstaculo() {
  const w = Math.random() * 80 + 40;
  const x = Math.random() * (canvas.width - 100 - w) + 50;
  obstaculos.push({ x, y: -40, w, h: 30 });
}

function moverObstaculos() {
  for (let i = obstaculos.length - 1; i >= 0; i--) {
    const o = obstaculos[i];
    o.y += velocidade;
    if (o.y > canvas.height) {
      obstaculos.splice(i, 1);
      pontuacao += 10;
      document.getElementById("pts").textContent = pontuacao;
      pointSound();
    }
  }
}

function desenharObstaculos() {
  ctx.fillStyle = "#e74c3c";
  obstaculos.forEach((o) => ctx.fillRect(o.x, o.y, o.w, o.h));
}

/* ====== Player ====== */
function desenharPlayer() {
  ctx.drawImage(skateImg, player.x, player.y, player.w, player.h);
}

function moverPlayer() {
  if (teclado["ArrowLeft"] && player.x > 50) player.x -= player.velX;
  if (teclado["ArrowRight"] && player.x < canvas.width - 50 - player.w) player.x += player.velX;

  // pulo com gravidade
  if (player.pulando) {
    player.y += player.vy;
    player.vy += player.g;

    if (player.y >= player.yChao) {
      player.y = player.yChao;
      player.pulando = false;
      player.vy = 0;
    }
  }
}

function pular() {
  if (!player.pulando) {
    player.pulando = true;
    player.vy = -12;      // impulso inicial
    jumpSound();
  }
}

/* ====== Colisão ====== */
function colisao() {
  for (const o of obstaculos) {
    const colide =
      player.x < o.x + o.w &&
      player.x + player.w > o.x &&
      player.y < o.y + o.h &&
      player.y + player.h > o.y;
    if (colide) {
      crashSound();
      gameOver();
      return true;
    }
  }
  return false;
}

/* ====== Loop ======
   ORDEM CORRETA para z-index visual:
   1) estrada
   2) sombra (no chão)
   3) obstáculos
   4) player (fica por cima quando estiver no ar)
*/
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  desenharEstrada();
  desenharSombra();
  desenharObstaculos();
  desenharPlayer();

  moverPlayer();
  moverObstaculos();
  colisao();

  if (tick % spawn === 0) gerarObstaculo();
  tick++;

  if (jogoAtivo) requestAnimationFrame(loop);
}

/* ====== Fluxo do jogo ====== */
function iniciar() {
  const dif = document.getElementById("difficulty").value;
  if (dif === "facil")  { velocidade = 4;  spawn = 100; player.velX = 6; }
  if (dif === "medio")  { velocidade = 5;  spawn = 90;  player.velX = 6; }
  if (dif === "dificil"){ velocidade = 6.5;spawn = 70;  player.velX = 6.5; }

  player.x = canvas.width / 2 - player.w / 2;
  player.y = player.yChao;
  obstaculos = [];
  pontuacao = 0;
  document.getElementById("pts").textContent = pontuacao;
  jogoAtivo = true;

  document.getElementById("menu").style.display = "none";
  document.getElementById("gameover").style.display = "none";

  loop();
}

function gameOver() {
  jogoAtivo = false;
  const nome = (document.getElementById("playerName").value || "Jogador").trim();
  let r = JSON.parse(localStorage.getItem("rank") || "[]");
  const i = r.findIndex((x) => x.nome.toLowerCase() === nome.toLowerCase());
  if (i >= 0) {
    if (pontuacao > r[i].score) r[i].score = pontuacao;
  } else {
    r.push({ nome, score: pontuacao });
  }
  r.sort((a, b) => b.score - a.score);
  r = r.slice(0, 10);
  localStorage.setItem("rank", JSON.stringify(r));
  mostrarRanking();

  document.getElementById("goScore").textContent = "Pontuação: " + pontuacao;
  document.getElementById("goBest").textContent =
    "Recorde: " + (r.find((x) => x.nome.toLowerCase() === nome.toLowerCase())?.score || pontuacao);

  document.getElementById("gameover").style.display = "flex";
}

/* ====== Ranking ====== */
function mostrarRanking() {
  const r = JSON.parse(localStorage.getItem("rank") || "[]");
  const box = r.length
    ? r.map((x, i) => `<div>#${i + 1} ${x.nome}: ${x.score}</div>`).join("")
    : "Sem ranking";
  document.getElementById("ranking").innerHTML =
    `<div style="text-align:left"><strong>🏆 Ranking (Top 10)</strong><br>${box}</div>`;
}

function limparRanking() {
  if (confirm("Tem certeza que deseja limpar todo o ranking?")) {
    localStorage.removeItem("rank");
    mostrarRanking();
  }
}

/* ====== Controles / UI ====== */
window.addEventListener("keydown", (e) => {
  teclado[e.key] = true;
  if ((e.key === " " || e.key === "ArrowUp") && jogoAtivo) pular();
  if (e.key === "Enter" && !jogoAtivo && document.getElementById("menu").style.display !== "none") iniciar();
});
window.addEventListener("keyup", (e) => { teclado[e.key] = false; });

document.getElementById("startBtn").onclick = iniciar;
document.getElementById("retryBtn").onclick = iniciar;
document.getElementById("menuBtn").onclick = () => {
  document.getElementById("menu").style.display = "flex";
  document.getElementById("gameover").style.display = "none";
};
document.getElementById("clearBtn").onclick = limparRanking;

mostrarRanking();
