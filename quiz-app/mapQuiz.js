// ====================== 세계지도 퀴즈 ======================
// D3.js + TopoJSON 기반
// quiz.js에서 startGame(5) → showWorldMapQuiz(player) 호출

function showWorldMapQuiz(playerName) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="card">
      <h2>세계지도 나라 맞히기 퀴즈</h2>
      <div id="map"></div>

      <div class="panel">
        <input id="answer" type="text" placeholder="어느 나라일까요? (한국어/영어 모두 OK)" />
        <button id="checkBtn">정답 확인</button>
        <button id="revealBtn" class="secondary">정답 보기</button>
        <button id="nextBtn">다음 문제</button>
      </div>

      <div class="choices" id="choices"></div>
      <div class="status" id="status"></div>
      <div id="answerBox"></div>
      <div class="note">마우스 휠로 확대/축소, 드래그로 이동할 수 있어요.</div>
      <button class="nav-btn" onclick="showHome()">처음으로</button>
    </div>
  `;

  initWorldMapQuiz(playerName);
}

// ====================== 내부 상태 ======================
let features = [];
let current = null;
let koreanNames = {};
let countryInfo = {};
let nameIndex = {};
let mapScore = 0;
let mapQuestionIndex = 0;
let mapStartTime = null;

// ====================== 초기화 ======================
function initWorldMapQuiz(playerName) {
  mapScore = 0;
  mapQuestionIndex = 0;
  mapStartTime = Date.now();

  const GEOJSON_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
  const COUNTRY_JSON_URL = "countries.json";

  const width = Math.min(1000, window.innerWidth - 40);
  const height = 560;

  // SVG 생성
  const svg = d3.select("#map").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "100%");

  const projection = d3.geoEqualEarth()
    .translate([width/2, height/2])
    .scale(Math.min(width, height) * 0.32);

  const path = d3.geoPath(projection);

  // 바다 배경
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#a7d3f5");

  const gCountries = svg.append("g");

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      gCountries.attr("transform", event.transform);
    });
  svg.call(zoom);

  // 데이터 로드
  Promise.all([
    fetch(GEOJSON_URL).then(r => r.json()),
    fetch(COUNTRY_JSON_URL).then(r => r.json())
  ]).then(([geoData, countryData]) => {
    features = geoData.features.filter(f => f.properties && f.properties.name);

    countryData.forEach(c => {
      koreanNames[c.country_en] = c.country_ko;
      countryInfo[c.country_en] = c;
      nameIndex[c.country_en.toLowerCase()] = c.country_en;
      if (c.country_ko) nameIndex[c.country_ko.toLowerCase()] = c.country_en;
    });

    drawBaseMap(gCountries, path);
    nextWorldMapQuestion(playerName, gCountries, path);
  }).catch(err => {
    console.error(err);
    d3.select("#status").attr("class","status wrong").text("데이터를 불러오지 못했어요.");
  });

  // 버튼 이벤트
  document.getElementById("checkBtn").onclick = () => checkWorldMapAnswer(playerName);
  document.getElementById("revealBtn").onclick = () => revealWorldMapAnswer();
  document.getElementById("nextBtn").onclick = () => nextWorldMapQuestion(playerName, gCountries, path);
}

// ====================== 지도 기본 그리기 ======================
function drawBaseMap(gCountries, path) {
  gCountries.selectAll("path.country")
    .data(features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#d9b38c")
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5);
}

// ====================== 문제 뽑기 ======================
function pickRandomCountry() {
  return features[Math.floor(Math.random() * features.length)];
}

function highlightCountry(gCountries, path, f) {
  gCountries.selectAll("path.country")
    .attr("fill", d => (d === f ? "#5c7cfa" : "#d9b38c"))
    .attr("stroke", d => (d === f ? "#172b4d" : "#999"))
    .attr("stroke-width", d => (d === f ? 1.2 : 0.5));
}

function getDisplayName(name) {
  return koreanNames[name] || name;
}

// ====================== 선택지 만들기 ======================
function makeChoices(correctName) {
  const names = features.map(f => f.properties.name).filter(n => n !== correctName);
  const choices = new Set();
  while (choices.size < 3) {
    choices.add(names[Math.floor(Math.random() * names.length)]);
  }
  const four = d3.shuffle([correctName, ...choices]);
  const box = d3.select("#choices").html("");
  four.forEach(n => {
    box.append("div")
      .attr("class","choice")
      .text(getDisplayName(n))
      .on("click", () => checkWorldMapAnswer(null, n));
  });
}

// ====================== 정답 확인 ======================
function normalizeInput(s) {
  return s.trim().toLowerCase();
}

function showAnswerBox(countryEn) {
  const info = countryInfo[countryEn];
  if (!info) return;
  const box = document.getElementById("answerBox");
  box.innerHTML = `
    <div class="answer-box">
      <img src="${info.flag}" alt="국기">
      <div>
        <div><b>${info.country_ko || info.country_en}</b> (${info.country_en})</div>
        <div>수도: ${info.capital_ko || info.capital_en || "정보 없음"}</div>
      </div>
    </div>
  `;
}

function checkWorldMapAnswer(playerName, raw) {
  const status = d3.select("#status").attr("class","status");
  document.getElementById("answerBox").innerHTML = "";
  const guess = raw || document.getElementById("answer").value;
  const norm = normalizeInput(guess);
  const mapped = nameIndex[norm] || null;
  const correct = current.properties.name;

  const isCorrect =
    (mapped && mapped === correct) ||
    normalizeInput(correct) === norm ||
    normalizeInput(getDisplayName(correct)) === norm;

  d3.selectAll(".choice").each(function() {
    const el = d3.select(this);
    if (el.text() === getDisplayName(correct)) el.classed("correct", true);
    if (guess && el.text() === guess && getDisplayName(correct) !== guess) el.classed("wrong", true);
  });

  if (isCorrect) {
    mapScore++;
    document.getElementById("correctSound").play();
    status.attr("class","status correct").text(`정답! ✅`);
    showAnswerBox(correct);
  } else {
    document.getElementById("wrongSound").play();
    status.attr("class","status wrong").text(`아쉬워요 😅 정답은 아래와 같습니다.`);
    showAnswerBox(correct);
  }

  mapQuestionIndex++;
  if (mapQuestionIndex >= 5) {
    endWorldMapQuiz(playerName);
  }
}

function revealWorldMapAnswer() {
  const correct = current?.properties?.name;
  if (!correct) return;
  d3.select("#status").attr("class","status").text("정답:");
  showAnswerBox(correct);
  d3.selectAll(".choice").each(function() {
    const el = d3.select(this);
    if (el.text() === getDisplayName(correct)) el.classed("correct", true);
  });
}

function nextWorldMapQuestion(playerName, gCountries, path) {
  d3.select("#status").attr("class","status").text("");
  document.getElementById("answer").value = "";
  document.getElementById("answerBox").innerHTML = "";
  current = pickRandomCountry();
  highlightCountry(gCountries, path, current);
  makeChoices(current.properties.name);
}

// ====================== 게임 종료 ======================
function endWorldMapQuiz(playerName) {
  const elapsed = Math.floor((Date.now() - mapStartTime) / 1000);
  saveScoreToSheet(5, playerName, mapScore, elapsed);

  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>세계지도 퀴즈 종료</h2>
      <p>${playerName}님 점수: <b>${mapScore}/5</b></p>
      <p>소요시간: <b>${elapsed}초</b></p>
      <button class="nav-btn" onclick="showResultWorldMap(${elapsed})">결과 확인</button>
      <button class="nav-btn" onclick="showHome()">처음으로</button>
    </div>
  `;
}

function showResultWorldMap(elapsed) {
  showLeaderboard(5, currentPlayer, mapScore, elapsed);
}
