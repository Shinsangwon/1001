// ====================== 전역 상태 ======================
let countries = [];
let currentGame = null;
let currentPlayer = "";
let score = 0;
let questionIndex = 0;
let questions = [];
let startTime = null;

// Google Sheets API 정보
const SHEET_ID = "1nMRgvM_la03dQJfxl_q-ibXfzFWvjfovBrc08Czbj4U";
const SHEET_NAME = "Sheet1";
const API_KEY = "AIzaSyDuvgVZnymXjOjNuKiphgqtm3NKeLxBIPk";

// ====================== 데이터 로드 ======================
async function loadData() {
  try {
    const res = await fetch("countries.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("countries.json 로드 실패");
    countries = await res.json();
    showHome();
  } catch (e) {
    document.getElementById("app").innerHTML =
      `<div class="card"><h2>데이터 로드 오류</h2><p>${e.message}</p></div>`;
  }
}

// ====================== 홈 화면 ======================
function showHome() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="card">
      <h1>나라 수도 국기 & 지도 퀴즈</h1>
      <p>이름을 선택/입력하고 게임을 시작하세요 (각각 5문제)</p>

      <h3>참가자 선택</h3>
      <button class="half-btn" onclick="setPlayer('신준열')">신준열</button>
      <button class="half-btn" onclick="setPlayer('신규열')">신규열</button>
      <button class="half-btn" onclick="setPlayer('파닥이')">파닥이</button>
      <button class="half-btn" onclick="setPlayer('수박이')">수박이</button>
      <input id="playerName" type="text" placeholder="직접 입력"/>
      <button class="nav-btn" onclick="customPlayerSelect()">참가자 등록</button>
      <p id="currentPlayer" style="margin:6px 0; color:#333;"></p>

      <h3>게임 선택</h3>
      <button class="option-btn" onclick="startGame(1)">1. 나라 → 수도 맞추기</button>
      <button class="option-btn" onclick="startGame(2)">2. 수도 → 나라 맞추기</button>
      <button class="option-btn" onclick="startGame(3)">3. 국기 → 나라 맞추기</button>
      <button class="option-btn" onclick="startGame(4)">4. 나라 → 국기 맞추기</button>
      <button class="option-btn" onclick="startGame(5)">5. 세계지도 나라 맞추기</button>
      <button class="option-btn" onclick="showStudy()">6. 나라-수도-국기 공부</button>

      <button class="small-btn" onclick="showLeaderboardMenu()">순위 확인</button>
    </div>
  `;
  updateCurrentPlayerLabel();
}

function updateCurrentPlayerLabel() {
  const el = document.getElementById("currentPlayer");
  if (!el) return;
  el.textContent = currentPlayer ? `현재 참가자: ${currentPlayer}` : `현재 참가자: (미선택)`;
}

function setPlayer(name) {
  currentPlayer = name;
  updateCurrentPlayerLabel();
}

function customPlayerSelect() {
  const name = document.getElementById("playerName").value.trim();
  if (name) {
    currentPlayer = name;
    updateCurrentPlayerLabel();
  }
}

// ====================== 게임 시작 ======================
function startGame(gameType) {
  if (!currentPlayer) {
    alert("참가자를 먼저 선택하거나 입력하세요!");
    return;
  }
  currentGame = gameType;
  score = 0;
  questionIndex = 0;
  startTime = Date.now();

  if (gameType === 5) {
    // 세계지도 퀴즈는 mapQuiz.js로 분기
    showWorldMapQuiz(currentPlayer);
  } else {
    generateQuestions();
    showQuestion();
  }
}

// ====================== 문제 생성 ======================
function generateQuestions() {
  questions = [];
  const pool = [...countries];
  for (let i = 0; i < 5; i++) {
    const ans = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const opts = [ans];
    while (opts.length < 5) {
      const cand = countries[Math.floor(Math.random() * countries.length)];
      if (!opts.includes(cand)) opts.push(cand);
    }
    opts.sort(() => Math.random() - 0.5);
    questions.push({ answer: ans, options: opts });
  }
}

// ====================== 문제 화면 ======================
function showQuestion() {
  const app = document.getElementById("app");
  const q = questions[questionIndex];

  let html = `<div class="card"><h3>${questionIndex + 1} / 5</h3>`;
  if (currentGame === 1) {
    html += `<h3>${q.answer.continent_ko}에 있는 ${q.answer.country_ko}의 수도는?</h3>`;
    html += `<img class="flag" src="${q.answer.flag}" alt="flag">`;
    q.options.forEach(o => {
      html += `<button class="option-btn" onclick="checkAnswer('${escapeQuote(o.capital_ko)}')">${o.capital_ko}</button>`;
    });
  } else if (currentGame === 2) {
    html += `<h3>${q.answer.capital_ko}의 수도를 가진 나라는 어디일까요? (${q.answer.continent_ko})</h3>`;
    q.options.forEach(o => {
      html += `<button class="option-btn" onclick="checkAnswer('${escapeQuote(o.country_ko)}')">${o.country_ko}</button>`;
    });
  } else if (currentGame === 3) {
    html += `<h3>다음 국기는 어느 나라 국기일까요? (${q.answer.continent_ko})</h3>`;
    html += `<img class="flag" src="${q.answer.flag}" alt="flag">`;
    q.options.forEach(o => {
      html += `<button class="option-btn" onclick="checkAnswer('${escapeQuote(o.country_ko)}')">${o.country_ko}</button>`;
    });
  } else if (currentGame === 4) {
    html += `<h3>${q.answer.continent_ko}에 있는 ${q.answer.country_ko}의 국기는?</h3>`;
    q.options.forEach(o => {
      html += `<button class="option-btn" onclick="checkAnswer('${escapeQuote(o.country_ko)}')"><img class="flag" src="${o.flag}" alt="flag"></button>`;
    });
  }
  html += `</div>`;
  app.innerHTML = html;
}

function escapeQuote(str) {
  return String(str).replaceAll("'", "\\'");
}

// ====================== 정답 확인 ======================
function checkAnswer(choice) {
  const q = questions[questionIndex];
  const app = document.getElementById("app");
  let html = `<div class="card"><h3>${questionIndex + 1} / 5</h3>`;

  const isCorrect =
    (currentGame === 1 && choice === q.answer.capital_ko) ||
    (currentGame === 2 && choice === q.answer.country_ko) ||
    (currentGame === 3 && choice === q.answer.country_ko) ||
    (currentGame === 4 && choice === q.answer.country_ko);

  if (isCorrect) {
    score++;
    document.getElementById("correctSound").play();
    html += `<p><b>정답!</b></p>`;
  } else {
    document.getElementById("wrongSound").play();
    if (cu
