const STORAGE_KEY = "kjh000113-collection-game";
const ATTENDANCE_REWARD = 100;
const DRAW_ONCE_COST = 30;
const DRAW_TEN_COST = 270;

const collectionItems = [
  {
    id: "star-shard",
    name: "별 조각",
    rarity: "common",
    symbol: "S",
    weight: 28,
  },
  {
    id: "moon-ticket",
    name: "달빛 티켓",
    rarity: "common",
    symbol: "M",
    weight: 24,
  },
  {
    id: "green-pin",
    name: "초록 배지",
    rarity: "common",
    symbol: "G",
    weight: 20,
  },
  {
    id: "blue-gem",
    name: "푸른 보석",
    rarity: "rare",
    symbol: "B",
    weight: 14,
  },
  {
    id: "silver-key",
    name: "은빛 열쇠",
    rarity: "rare",
    symbol: "K",
    weight: 8,
  },
  {
    id: "crystal-crown",
    name: "수정 왕관",
    rarity: "epic",
    symbol: "C",
    weight: 4,
  },
  {
    id: "golden-sun",
    name: "황금 태양",
    rarity: "legendary",
    symbol: "L",
    weight: 2,
  },
];

const rarityLabels = {
  common: "일반",
  rare: "희귀",
  epic: "에픽",
  legendary: "전설",
};

const defaultState = {
  points: 0,
  lastAttendanceDate: "",
  streak: 0,
  owned: {},
  recentResults: [],
};

const yearElement = document.querySelector("#year");
const pointBalance = document.querySelector("#pointBalance");
const streakCount = document.querySelector("#streakCount");
const attendanceMessage = document.querySelector("#attendanceMessage");
const attendanceButton = document.querySelector("#attendanceButton");
const drawOnceButton = document.querySelector("#drawOnceButton");
const drawTenButton = document.querySelector("#drawTenButton");
const drawMessage = document.querySelector("#drawMessage");
const resultList = document.querySelector("#resultList");
const collectionGrid = document.querySelector("#collectionGrid");
const completionText = document.querySelector("#completionText");
const completionBar = document.querySelector("#completionBar");
const drawMachine = document.querySelector(".draw-machine");

let state = loadState();

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

attendanceButton?.addEventListener("click", checkAttendance);
drawOnceButton?.addEventListener("click", () => drawItems(1));
drawTenButton?.addEventListener("click", () => drawItems(10));

render();

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return { ...defaultState };
  }

  try {
    return { ...defaultState, ...JSON.parse(savedState) };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function checkAttendance() {
  const today = getTodayKey();

  if (state.lastAttendanceDate === today) {
    return;
  }

  state.points += ATTENDANCE_REWARD;
  state.streak = isYesterday(state.lastAttendanceDate) ? state.streak + 1 : 1;
  state.lastAttendanceDate = today;
  saveState();
  render();
}

function drawItems(count) {
  const cost = count === 10 ? DRAW_TEN_COST : DRAW_ONCE_COST;

  if (state.points < cost) {
    drawMessage.textContent = `포인트가 부족합니다. ${cost}P가 필요해요.`;
    return;
  }

  state.points -= cost;
  const results = Array.from({ length: count }, pickItem);

  results.forEach((item) => {
    state.owned[item.id] = (state.owned[item.id] || 0) + 1;
  });

  state.recentResults = results.map((item) => item.id);
  saveState();
  animateDraw();
  render();
}

function pickItem() {
  const totalWeight = collectionItems.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of collectionItems) {
    roll -= item.weight;

    if (roll <= 0) {
      return item;
    }
  }

  return collectionItems[0];
}

function render() {
  renderStatus();
  renderResults();
  renderCollection();
}

function renderStatus() {
  const didAttendToday = state.lastAttendanceDate === getTodayKey();

  if (pointBalance) {
    pointBalance.textContent = `${state.points.toLocaleString("ko-KR")}P`;
  }

  if (streakCount) {
    streakCount.textContent = String(state.streak);
  }

  if (attendanceMessage) {
    attendanceMessage.textContent = didAttendToday
      ? "오늘 출석 보상을 받았습니다."
      : "오늘 출석 체크로 100P를 받을 수 있어요.";
  }

  if (attendanceButton) {
    attendanceButton.disabled = didAttendToday;
    attendanceButton.textContent = didAttendToday ? "오늘 출석 완료" : "출석 체크";
  }

  if (drawOnceButton) {
    drawOnceButton.disabled = state.points < DRAW_ONCE_COST;
  }

  if (drawTenButton) {
    drawTenButton.disabled = state.points < DRAW_TEN_COST;
  }

  if (drawMessage && state.recentResults.length === 0) {
    drawMessage.textContent = "포인트를 모아 컬렉션 아이템을 획득하세요.";
  }
}

function renderResults() {
  if (!resultList) {
    return;
  }

  if (state.recentResults.length === 0) {
    resultList.innerHTML = "";
    return;
  }

  const results = state.recentResults
    .map((id) => collectionItems.find((item) => item.id === id))
    .filter(Boolean);

  resultList.innerHTML = results.map(createResultMarkup).join("");

  if (drawMessage) {
    drawMessage.textContent =
      results.length === 1
        ? `${results[0].name}을 획득했습니다.`
        : `${results.length}개의 아이템을 획득했습니다.`;
  }
}

function renderCollection() {
  if (!collectionGrid) {
    return;
  }

  const ownedCount = collectionItems.filter((item) => state.owned[item.id]).length;
  const percent = Math.round((ownedCount / collectionItems.length) * 100);

  if (completionText) {
    completionText.textContent = `${ownedCount} / ${collectionItems.length}`;
  }

  if (completionBar) {
    completionBar.style.width = `${percent}%`;
  }

  collectionGrid.innerHTML = collectionItems.map(createCollectionMarkup).join("");
}

function createResultMarkup(item) {
  return `
    <article class="result-card">
      <div class="item-meta">
        <span class="rarity rarity--${item.rarity}">${rarityLabels[item.rarity]}</span>
      </div>
      <strong>${item.name}</strong>
      <span>컬렉션에 추가됨</span>
    </article>
  `;
}

function createCollectionMarkup(item) {
  const count = state.owned[item.id] || 0;
  const isLocked = count === 0;
  const name = isLocked ? "미획득 아이템" : item.name;
  const countText = isLocked ? "보유 0개" : `보유 ${count}개`;

  return `
    <article class="collection-card ${isLocked ? "is-locked" : ""}">
      <span class="item-symbol">${isLocked ? "?" : item.symbol}</span>
      <div>
        <h3>${name}</h3>
        <div class="item-meta">
          <span class="rarity rarity--${item.rarity}">${rarityLabels[item.rarity]}</span>
          <span class="owned-count">${countText}</span>
        </div>
      </div>
    </article>
  `;
}

function animateDraw() {
  if (!drawMachine) {
    return;
  }

  drawMachine.classList.add("is-spinning");
  window.setTimeout(() => {
    drawMachine.classList.remove("is-spinning");
  }, 750);
}

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isYesterday(dateKey) {
  if (!dateKey) {
    return false;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(yesterday);

  return dateKey === yesterdayKey;
}
