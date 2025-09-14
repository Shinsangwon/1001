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
    if (currentGame === 1) {
      html += `<p>오답! 정답은 <b>${q.answer.capital_ko}</b></p>`;
    } else if (currentGame === 2) {
      html += `<p>오답! 정답은 <b>${q.answer.country_ko}</b></p>`;
    } else if (currentGame === 3) {
      const wrongFlag = (countries.find(c => c.country_ko === choice) || {}).flag || "";
      html += `
        <img class="flag" src="${q.answer.flag}" alt="correct-flag"><br/>
        <p>오답! 정답은 <b>${q.answer.country_ko}</b>입니다.</p>
        <p>선택한 답(<b>${choice}</b>)의 국기는 아래와 같습니다.</p>
        ${wrongFlag ? `<img class="flag" src="${wrongFlag}" alt="wrong-flag">` : ``}
      `;
    } else if (currentGame === 4) {
      const wrong = countries.find(c => c.country_ko === choice);
      html += `
        <p>선택하신 국기는 <b>${choice}</b>의 국기입니다.</p>
        ${wrong ? `<div class="wrong-flag"><img class="flag" src="${wrong.flag}" alt="wrong-flag"></div>` : ``}
        <p>정답은 <b>${q.answer.country_ko}</b>의 국기입니다.</p>
        <img class="flag" src="${q.answer.flag}" alt="correct-flag">
      `;
    }
  }

  questionIndex++;
  if (questionIndex < 5) {
    html += `<button class="nav-btn" onclick="showQuestion()">다음 문제</button>`;
  } else {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    saveScoreToSheet(currentGame, currentPlayer, score, elapsed);
    html += `<button class="nav-btn" onclick="showResult()">결과 확인</button>`;
  }
  html += `<button class="nav-btn" onclick="showHome()">처음으로</button>`;
  html += `</div>`;
  app.innerHTML = html;
}

// ====================== 결과 화면 ======================
function showResult() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  showLeaderboard(currentGame, currentPlayer, score, elapsed);
}

// ====================== Google Sheets 연동 ======================
function saveScoreToSheet(game, player, score, time) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
  const body = {
    values: [[game, player, score, time, new Date().toISOString()]]
  };

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(res => res.json())
  .then(data => console.log("저장 결과:", data))
  .catch(err => console.error("저장 오류:", err));
}

function loadScoresFromSheet(callback) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.values) {
        callback([]);
        return;
      }
      const rows = data.values.slice(1).map(r => ({
        game: r[0],
        player: r[1],
        score: Number(r[2]),
        time: Number(r[3]),
        timestamp: r[4]
      }));
      callback(rows);
    })
    .catch(err => console.error("불러오기 오류:", err));
}

function showLeaderboard(gameType, player = "", sc = 0, tm = 0) {
  loadScoresFromSheet(rows => {
    const list = rows.filter(r => r.game == gameType);
    list.sort((a, b) => (b.score - a.score) || (a.time - b.time));

    // 현재 기록 위치 찾기
    let idx = -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i].player === player && list[i].score === sc && list[i].time === tm) {
        idx = i;
        break;
      }
    }
    const rankText = (idx > -1 && idx < 10) ?
      `축하합니다! ${idx + 1}위입니다!! 🎉` :
      `아쉽네요... 분발하세요!!`;

    let rowsHTML = list.slice(0, 10).map((e, i) =>
      `<tr><td>${i + 1}</td><td>${e.player}</td><td>${e.score}</td><td>${e.time}</td><td>${e.timestamp}</td></tr>`
    ).join("");

    const tableHTML = `
      <h3>순위표 (게임 ${gameType})</h3>
      <table>
        <tr><th>순위</th><th>이름</th><th>점수</th><th>시간(초)</th><th>기록시각</th></tr>
        ${rowsHTML}
      </table>
    `;

    document.getElementById("app").innerHTML = `
      <div class="card">
        <h2>게임 종료</h2>
        <p>${currentPlayer}님 점수: <b>${score}/5</b></p>
        <p>소요시간: <b>${tm}초</b></p>
        <p>${rankText}</p>
        ${tableHTML}
        <button class="nav-btn" onclick="showHome()">처음으로</button>
        <button class="nav-btn" onclick="showLeaderboardMenu()">순위 확인</button>
      </div>
    `;
  });
}

// ====================== 순위 확인 메뉴 ======================
function showLeaderboardMenu() {
  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>순위 확인</h2>
      <button class="option-btn" onclick="showLeaderboard(1)">1. 나라 → 수도</button>
      <button class="option-btn" onclick="showLeaderboard(2)">2. 수도 → 나라</button>
      <button class="option-btn" onclick="showLeaderboard(3)">3. 국기 → 나라</button>
      <button class="option-btn" onclick="showLeaderboard(4)">4. 나라 → 국기</button>
      <button class="option-btn" onclick="showLeaderboard(5)">5. 세계지도</button>
      <button class="nav-btn" onclick="showHome()">처음으로</button>
    </div>
  `;
}

// ====================== 공부 모드 ======================
function showStudy(filter = "전체") {
  let filtered = countries;
  if (filter !== "전체") {
    filtered = countries.filter(c => c.continent_ko === filter);
  }
  const rows = [...filtered]
    .sort((a, b) => a.continent_ko.localeCompare(b.continent_ko, "ko") ||
      a.country_ko.localeCompare(b.country_ko, "ko"))
    .map(c => `
      <tr>
        <td>${c.continent_ko}</td>
        <td><img src="${c.flag}" alt="flag" width="40"></td>
        <td>${c.country_ko}</td>
        <td>${c.capital_ko || ""}</td>
      </tr>`).join("");

  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>나라-수도-국기 공부</h2>
      <div>
        <button class="small-btn" onclick="showStudy('전체')">전체보기</button>
        <button class="small-btn" onclick="showStudy('아메리카')">아메리카</button>
        <button class="small-btn" onclick="showStudy('아시아')">아시아</button>
        <button class="small-btn" onclick="showStudy('아프리카')">아프리카</button>
        <button class="small-btn" onclick="showStudy('오세아니아')">오세아니아</button>
        <button class="small-btn" onclick="showStudy('유럽')">유럽</button>
      </div>
      <table>
        <tr><th>대륙</th><th>국기</th><th>국가</th><th>수도</th></tr>
        ${rows}
      </table>
      <button class="nav-btn" onclick="showHome()">처음으로</button>
    </div>
  `;
}

// ====================== 시작 ======================
loadData();
