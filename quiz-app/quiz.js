// ====================== 전역 상태 ======================
let countries = [];
let currentGame = null;
let currentPlayer = "";
let score = 0;
let questionIndex = 0;
let questions = [];
let startTime = null;

// Google Form 설정
const FORM_URL = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSfDoinKgFI1xxaGpIRjHopkb5MhqsNuqTqE5hk3Nd2oi7nziQ/formResponse";
const ENTRY_GAME   = "entry.96716809";
const ENTRY_PLAYER = "entry.1585525493";
const ENTRY_SCORE  = "entry.1461471053";
const ENTRY_TIME   = "entry.1265121960";

// Google Sheet CSV 공개 링크 (반드시 output=csv)
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPmVODPefnMPa5S2iauwxw9aM39Ugd1r1-RnPm5JVIswvmuCB6UmdMgY2PAMvotjPrkEj6No8XU3lF/pub?output=csv";

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
      <h1>나라 수도 국기 게임</h1>
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

function setPlayer(name) { currentPlayer = name; updateCurrentPlayerLabel(); }
function customPlayerSelect() {
  const name = document.getElementById("playerName").value.trim();
  if (name) { currentPlayer = name; updateCurrentPlayerLabel(); }
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
    // 지도 퀴즈는 mapQuiz.js로 분기
    showWorldMapQuiz(currentPlayer);
    return;
  }

  generateQuestions();
  showQuestion();
}

// 문제 생성
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

// 문제 화면
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

// 정답 확인
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
    html += `<p><b>정답!</b></p>`;
  } else {
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
    saveScoreToSheet(currentGame, currentPlayer, score, Math.floor((Date.now() - startTime) / 1000));
    html += `<button class="nav-btn" onclick="showResult()">결과 확인</button>`;
  }
  html += `<button class="nav-btn" onclick="showHome()">처음으로</button>`;
  html += `</div>`;
  app.innerHTML = html;
}

// ====================== 결과/순위 ======================
function showResult() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  loadScoresFromSheet(data => {
    const filtered = data.filter(d => Number(d.game) === currentGame);
    filtered.sort((a, b) => (b.score - a.score) || (a.time - b.time));
    const idx = filtered.findIndex(e => e.player === currentPlayer && e.score === score && e.time === elapsed);

    const rankText = (idx > -1 && idx < 10) ? `축하합니다! ${idx + 1}위입니다!! 🎉` : `아쉽네요... 분발하세요!!`;

    const rows = filtered.slice(0, 10).map((e, i) =>
      `<tr><td>${i + 1}</td><td>${e.player}</td><td>${e.score}</td><td>${e.time}초</td></tr>`
    ).join("");

    document.getElementById("app").innerHTML = `
      <div class="card">
        <h2>게임 종료</h2>
        <p>${currentPlayer}님 점수: <b>${score}/5</b></p>
        <p>소요시간: <b>${elapsed}초</b></p>
        <p>${rankText}</p>
        <h3>순위표 (게임 ${currentGame})</h3>
        <table>
          <tr><th>순위</th><th>이름</th><th>점수</th><th>시간(초)</th></tr>
          ${rows}
        </table>
        <button class="nav-btn" onclick="showHome()">처음으로</button>
        <button class="nav-btn" onclick="showLeaderboardMenu()">순위 확인</button>
      </div>
    `;
  });
}

function showLeaderboardMenu() {
  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>순위 확인</h2>
      <button class="option-btn" onclick="showLeaderboard(1)">1. 나라 → 수도</button>
      <button class="option-btn" onclick="showLeaderboard(2)">2. 수도 → 나라</button>
      <button class="option-btn" onclick="showLeaderboard(3)">3. 국기 → 나라</button>
      <button class="option-btn" onclick="showLeaderboard(4)">4. 나라 → 국기</button>
      <button class="option-btn" onclick="showLeaderboard(5)">5. 세계지도 퀴즈</button>
      <button class="nav-btn" onclick="showHome()">처음으로</button>
    </div>
  `;
}

function showLeaderboard(gameType) {
  loadScoresFromSheet(data => {
    const filtered = data.filter(d => Number(d.game) === gameType);
    filtered.sort((a, b) => (b.score - a.score) || (a.time - b.time));
    const rows = filtered.slice(0, 10).map((e, i) =>
      `<tr><td>${i + 1}</td><td>${e.player}</td><td>${e.score}</td><td>${e.time}초</td></tr>`
    ).join("");
    document.getElementById("app").innerHTML = `
      <div class="card">
        <h2>게임 ${gameType} 순위</h2>
        <table>
          <tr><th>순위</th><th>이름</th><th>점수</th><th>시간(초)</th></tr>
          ${rows}
        </table>
        <button class="nav-btn" onclick="showLeaderboardMenu()">뒤로</button>
      </div>
    `;
  });
}

// ====================== Google Form 저장 (URL-Encoded) ======================
function saveScoreToSheet(game, player, score, time) {
  const formBody = new URLSearchParams();
  formBody.append(ENTRY_GAME, game.toString());
  formBody.append(ENTRY_PLAYER, player);
  formBody.append(ENTRY_SCORE, score.toString());
  formBody.append(ENTRY_TIME, time.toString());

  fetch(FORM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
    mode: "no-cors"
  })
  .then(() => {
    console.log("폼 제출 시도 완료");
  })
  .catch(err => console.error("폼 제출 오류:", err));
}

// ====================== Google Sheet CSV 불러오기 ======================
function loadScoresFromSheet(callback) {
  fetch(CSV_URL)
    .then(res => res.text())
    .then(text => {
      const rows = text.trim().split("\n").map(line => line.split(","));
      // 시트 구조: Timestamp | Game | Player | Score | Time
      const data = rows.slice(1).map(r => ({
        timestamp: r[0],
        game: r[1],
        player: r[2],
        score: Number(r[3]),
        time: Number(r[4])
      }));
      callback(data);
    })
    .catch(err => console.error("불러오기 오류:", err));
}

// ====================== 공부 모드 ======================
function showStudy(filter = "전체") {
  let filtered = countries;
  if (filter !== "전체") {
    filtered = countries.filter(c => c.continent_ko === filter);
  }
  const rows = [...filtered]
    .sort((a, b) => a.continent_ko.localeCompare(b.continent_ko, "ko") || a.country_ko.localeCompare(b.country_ko, "ko"))
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
