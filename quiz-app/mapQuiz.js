// ====================== 세계지도 퀴즈 ======================

let features = [];
let current = null;
let koreanNames = {};
let countryInfo = {};
let nameIndex = {};
let mapScore = 0;
let mapQuestionIndex = 0;

// 지도 크기
const width = 600;
const height = 400;

const projection = d3.geoEqualEarth()
  .translate([width / 2, height / 2])
  .scale(180);

const path = d3.geoPath(projection);

const svg = d3.select("body").append("svg")
  .attr("id", "mapQuizSvg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("display", "none")
  .style("width", "100%")
  .style("height", "300px");

const gCountries = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => gCountries.attr("transform", event.transform));
svg.call(zoom);

function showWorldMapQuiz(playerName) {
  mapScore = 0;
  mapQuestionIndex = 0;

  // 지도 준비
  Promise.all([
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json").then(r => r.json()),
    fetch("countries.json").then(r => r.json())
  ]).then(([geoData, countryData]) => {
    features = geoData.features.filter(f => f.properties && f.properties.name);

    koreanNames = {};
    countryInfo = {};
    nameIndex = {};

    countryData.forEach(c => {
      koreanNames[c.country_en] = c.country_ko;
      countryInfo[c.country_en] = c;
      nameIndex[c.country_en.toLowerCase()] = c.country_en;
      if (c.country_ko) nameIndex[c.country_ko.toLowerCase()] = c.country_en;
    });

    gCountries.selectAll("path.country")
      .data(features)
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("fill", "#d9b38c")
      .attr("stroke", "#999")
      .attr("stroke-width", 0.5);

    nextWorldMapQuestion(playerName);
  });
}

function pickRandomCountry() {
  return features[Math.floor(Math.random() * features.length)];
}

function highlightCountry(f) {
  gCountries.selectAll("path.country")
    .attr("fill", d => (d === f ? "#5c7cfa" : "#d9b38c"))
    .attr("stroke", d => (d === f ? "#172b4d" : "#999"))
    .attr("stroke-width", d => (d === f ? 1.2 : 0.5));

  // 선택한 국가 영역 중심으로 확대
  const [[x0, y0], [x1, y1]] = path.bounds(f);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const x = (x0 + x1) / 2;
  const y = (y0 + y1) / 2;
  const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
  const translate = [width / 2 - scale * x, height / 2 - scale * y];

  gCountries.transition().duration(750)
    .attr("transform", `translate(${translate})scale(${scale})`);
}

function getDisplayName(name) {
  return koreanNames[name] || name;
}

function nextWorldMapQuestion(playerName) {
  if (mapQuestionIndex >= 5) {
    endWorldMapQuiz(playerName);
    return;
  }

  current = pickRandomCountry();
  highlightCountry(current);

  const continent = countryInfo[current.properties.name]?.continent_ko || "기타";

  // 보기 생성 (같은 대륙에서만)
  let sameContinent = Object.values(countryInfo).filter(c => c.continent_ko === continent);
  if (sameContinent.length < 5) sameContinent = Object.values(countryInfo); // fallback

  const correctName = current.properties.name;
  const options = [correctName];
  while (options.length < 5) {
    const cand = sameContinent[Math.floor(Math.random() * sameContinent.length)].country_en;
    if (!options.includes(cand)) options.push(cand);
  }
  options.sort(() => Math.random() - 0.5);

  const app = document.getElementById("app");
  let html = `<div class="card"><h3>${mapQuestionIndex + 1} / 5</h3>`;
  html += `<h3>다음 나라의 이름은 무엇일까요? (${continent})</h3>`;
  options.forEach(n => {
    html += `<button class="option-btn" onclick="checkWorldMapAnswer('${playerName}','${escapeQuote(n)}')">${getDisplayName(n)}</button>`;
  });
  html += `</div>`;
  app.innerHTML = html;

  d3.select("#mapQuizSvg").style("display", "block");
}

function checkWorldMapAnswer(playerName, choice) {
  const correct = current.properties.name;
  const correctKo = getDisplayName(correct);

  const correctSfx = document.getElementById("correctSound");
  const wrongSfx = document.getElementById("wrongSound");

  let html = `<div class="card"><h3>${mapQuestionIndex + 1} / 5</h3>`;

  if (choice === correct) {
    mapScore++;
    if (correctSfx) { try { correctSfx.currentTime = 0; correctSfx.play(); } catch(e){} }
    html += `<p><b>정답!</b></p>`;
  } else {
    if (wrongSfx) { try { wrongSfx.currentTime = 0; wrongSfx.play(); } catch(e){} }
    html += `<p>오답! 정답은 <b>${correctKo}</b></p>`;
  }

  mapQuestionIndex++;
  if (mapQuestionIndex < 5) {
    html += `<button class="nav-btn" onclick="nextWorldMapQuestion('${playerName}')">다음 문제</button>`;
  } else {
    saveScoreToSheet(5, playerName, mapScore, Math.floor((Date.now() - startTime) / 1000));
    html += `<button class="nav-btn" onclick="showResult()">결과 확인</button>`;
  }
  html += `<button class="nav-btn" onclick="showHome()">처음으로</button>`;
  html += `</div>`;

  document.getElementById("app").innerHTML = html;
}

function endWorldMapQuiz(playerName) {
  showResult(); // quiz.js의 결과창 호출
}
