const STORAGE_KEY = "kjh000113-collection-game";
const ATTENDANCE_REWARD = 100;
const DRAW_ONCE_COST = 30;
const DRAW_TEN_COST = 270;
const AFFINITY_PER_DAY = 8;

const collectionItems = [
  {
    id: "star-shard",
    name: "별 조각",
    rarity: "common",
    symbol: "S",
    weight: 28,
    basePrice: 60,
  },
  {
    id: "moon-ticket",
    name: "달빛 티켓",
    rarity: "common",
    symbol: "M",
    weight: 24,
    basePrice: 70,
  },
  {
    id: "green-pin",
    name: "초록 배지",
    rarity: "common",
    symbol: "G",
    weight: 20,
    basePrice: 80,
  },
  {
    id: "blue-gem",
    name: "푸른 보석",
    rarity: "rare",
    symbol: "B",
    weight: 14,
    basePrice: 150,
  },
  {
    id: "silver-key",
    name: "은빛 열쇠",
    rarity: "rare",
    symbol: "K",
    weight: 8,
    basePrice: 210,
  },
  {
    id: "crystal-crown",
    name: "수정 왕관",
    rarity: "epic",
    symbol: "C",
    weight: 4,
    basePrice: 430,
  },
  {
    id: "golden-sun",
    name: "황금 태양",
    rarity: "legendary",
    symbol: "L",
    weight: 2,
    basePrice: 900,
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
  attendanceHistory: [],
  streak: 0,
  holdings: [],
  recentResults: [],
};

const pointBalance = document.querySelector("#pointBalance");
const holdingCount = document.querySelector("#holdingCount");
const averageAffinity = document.querySelector("#averageAffinity");
const collectionSlider = document.querySelector("#collectionSlider");
const streakCount = document.querySelector("#streakCount");
const attendanceMessage = document.querySelector("#attendanceMessage");
const attendanceButton = document.querySelector("#attendanceButton");
const attendanceBoard = document.querySelector("#attendanceBoard");
const drawOnceButton = document.querySelector("#drawOnceButton");
const drawTenButton = document.querySelector("#drawTenButton");
const drawMessage = document.querySelector("#drawMessage");
const resultList = document.querySelector("#resultList");
const manageList = document.querySelector("#manageList");
const drawMachine = document.querySelector(".draw-machine");
const tabButtons = document.querySelectorAll(".tab-button");
const tabViews = document.querySelectorAll(".tab-view");

let state = loadState();
normalizeState();
render();

attendanceButton?.addEventListener("click", checkAttendance);
drawOnceButton?.addEventListener("click", () => drawItems(1));
drawTenButton?.addEventListener("click", () => drawItems(10));
manageList?.addEventListener("click", handleManageClick);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.target || "home");
  });
});

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return structuredClone(defaultState);
  }

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(savedState) };
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState() {
  if (!Array.isArray(state.holdings)) {
    state.holdings = [];
  }

  if (!Array.isArray(state.attendanceHistory)) {
    state.attendanceHistory = state.lastAttendanceDate
      ? [state.lastAttendanceDate]
      : [];
  }

  if (!Array.isArray(state.recentResults)) {
    state.recentResults = [];
  }

  if (state.owned && Object.keys(state.owned).length > 0 && state.holdings.length === 0) {
    Object.entries(state.owned).forEach(([itemId, count]) => {
      for (let index = 0; index < Number(count); index += 1) {
        addHolding(itemId, state.lastAttendanceDate || getTodayKey());
      }
    });
    delete state.owned;
  }

  state.points = Number(state.points) || 0;
  state.streak = Number(state.streak) || 0;
  state.attendanceHistory = [...new Set(state.attendanceHistory)].sort();
  saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function switchTab(target) {
  tabViews.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === target);
  });

  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.target === target);
  });
}

function checkAttendance() {
  const today = getTodayKey();

  if (state.lastAttendanceDate === today) {
    return;
  }

  state.points += ATTENDANCE_REWARD;
  state.streak = isYesterday(state.lastAttendanceDate) ? state.streak + 1 : 1;
  state.lastAttendanceDate = today;
  state.attendanceHistory = [...new Set([...state.attendanceHistory, today])].sort();
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
  const today = getTodayKey();
  const resultHoldings = results.map((item) => addHolding(item.id, today));

  state.recentResults = resultHoldings.map((holding) => holding.uid);
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

function addHolding(itemId, acquiredDate) {
  const holding = {
    uid: crypto.randomUUID(),
    itemId,
    acquiredDate,
  };
  state.holdings.push(holding);
  return holding;
}

function sellHolding(uid) {
  const holding = state.holdings.find((item) => item.uid === uid);

  if (!holding) {
    return;
  }

  const item = findItem(holding.itemId);

  if (!item) {
    return;
  }

  state.points += getMarketPrice(item);
  state.holdings = state.holdings.filter((item) => item.uid !== uid);
  state.recentResults = state.recentResults.filter((id) => id !== uid);
  saveState();
  render();
}

function handleManageClick(event) {
  const button = event.target.closest("[data-sell-id]");

  if (!button) {
    return;
  }

  sellHolding(button.dataset.sellId);
}

function render() {
  renderStatus();
  renderAttendanceBoard();
  renderResults();
  renderHome();
  renderManageList();
}

function renderStatus() {
  const didAttendToday = state.lastAttendanceDate === getTodayKey();
  const holdings = getHoldingsWithItems();

  if (pointBalance) {
    pointBalance.textContent = `${state.points.toLocaleString("ko-KR")}P`;
  }

  if (holdingCount) {
    holdingCount.textContent = `${holdings.length}개`;
  }

  if (averageAffinity) {
    const average = holdings.length
      ? Math.round(
          holdings.reduce((sum, holding) => sum + getAffinity(holding), 0) /
            holdings.length,
        )
      : 0;
    averageAffinity.textContent = String(average);
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

function renderAttendanceBoard() {
  if (!attendanceBoard) {
    return;
  }

  const days = getRecentDays(7);
  const history = new Set(state.attendanceHistory);

  attendanceBoard.innerHTML = days
    .map((dateKey) => {
      const date = new Date(`${dateKey}T00:00:00+09:00`);
      const label = new Intl.DateTimeFormat("ko-KR", {
        weekday: "short",
        timeZone: "Asia/Seoul",
      }).format(date);
      const day = dateKey.slice(-2);
      const checked = history.has(dateKey);

      return `
        <div class="day-cell ${checked ? "is-checked" : ""}">
          <span>${label}</span>
          <strong>${day}</strong>
          <span>${checked ? "완료" : "대기"}</span>
        </div>
      `;
    })
    .join("");
}

function renderHome() {
  if (!collectionSlider) {
    return;
  }

  const holdings = getHoldingsWithItems();

  if (holdings.length === 0) {
    collectionSlider.innerHTML =
      '<div class="empty-state">아직 보유한 컬렉션이 없습니다. 출석해서 포인트를 모은 뒤 뽑기를 해보세요.</div>';
    return;
  }

  collectionSlider.innerHTML = holdings
    .slice()
    .sort((a, b) => b.acquiredDate.localeCompare(a.acquiredDate))
    .map(createSlideMarkup)
    .join("");
}

function renderResults() {
  if (!resultList) {
    return;
  }

  const results = state.recentResults
    .map((uid) => state.holdings.find((holding) => holding.uid === uid))
    .filter(Boolean)
    .map((holding) => ({ ...holding, item: findItem(holding.itemId) }))
    .filter((holding) => holding.item);

  if (results.length === 0) {
    resultList.innerHTML = "";
    return;
  }

  resultList.innerHTML = results.map(createResultMarkup).join("");

  if (drawMessage) {
    drawMessage.textContent =
      results.length === 1
        ? `${results[0].item.name}을 획득했습니다.`
        : `${results.length}개의 컬렉션을 획득했습니다.`;
  }
}

function renderManageList() {
  if (!manageList) {
    return;
  }

  const holdings = getHoldingsWithItems();

  if (holdings.length === 0) {
    manageList.innerHTML =
      '<div class="empty-state">판매할 컬렉션이 없습니다. 뽑기에서 먼저 획득해보세요.</div>';
    return;
  }

  manageList.innerHTML = holdings
    .slice()
    .sort((a, b) => getMarketPrice(b.item) - getMarketPrice(a.item))
    .map(createManageMarkup)
    .join("");
}

function createSlideMarkup(holding) {
  const price = getMarketPrice(holding.item);
  const affinity = getAffinity(holding);
  const days = getHeldDays(holding.acquiredDate);

  return `
    <article class="slide-card">
      <span class="item-symbol">${holding.item.symbol}</span>
      <div>
        <h3>${holding.item.name}</h3>
        <div class="item-meta">
          ${createRarityMarkup(holding.item.rarity)}
          <span class="price-chip">${price.toLocaleString("ko-KR")}P</span>
          <span class="affinity-chip">호감도 ${affinity}</span>
        </div>
      </div>
      <div class="stat-row">
        <div class="stat-line"><span>보유 기간</span><strong>${days}일</strong></div>
        <div class="stat-line"><span>획득일</span><strong>${formatDate(holding.acquiredDate)}</strong></div>
        <div class="stat-line"><span>오늘 판매가</span><strong>${price.toLocaleString("ko-KR")}P</strong></div>
      </div>
    </article>
  `;
}

function createResultMarkup(holding) {
  return `
    <article class="result-card">
      <div class="item-meta">
        ${createRarityMarkup(holding.item.rarity)}
      </div>
      <h3>${holding.item.name}</h3>
      <p class="helper-text">컬렉션에 추가되었습니다.</p>
    </article>
  `;
}

function createManageMarkup(holding) {
  const price = getMarketPrice(holding.item);
  const affinity = getAffinity(holding);
  const days = getHeldDays(holding.acquiredDate);

  return `
    <article class="manage-card">
      <div class="manage-card__top">
        <span class="item-symbol">${holding.item.symbol}</span>
        <div class="manage-card__body">
          <h3>${holding.item.name}</h3>
          <div class="item-meta">
            ${createRarityMarkup(holding.item.rarity)}
            <span class="affinity-chip">호감도 ${affinity}</span>
          </div>
        </div>
      </div>
      <div class="stat-row">
        <div class="stat-line"><span>보유 기간</span><strong>${days}일</strong></div>
        <div class="stat-line"><span>오늘 주가</span><strong>${price.toLocaleString("ko-KR")}P</strong></div>
      </div>
      <button class="button button--danger" type="button" data-sell-id="${holding.uid}">
        ${price.toLocaleString("ko-KR")}P에 판매
      </button>
    </article>
  `;
}

function createRarityMarkup(rarity) {
  return `<span class="rarity rarity--${rarity}">${rarityLabels[rarity]}</span>`;
}

function getHoldingsWithItems() {
  return state.holdings
    .map((holding) => ({ ...holding, item: findItem(holding.itemId) }))
    .filter((holding) => holding.item);
}

function findItem(itemId) {
  return collectionItems.find((item) => item.id === itemId);
}

function getMarketPrice(item) {
  const seed = hashString(`${getTodayKey()}-${item.id}`);
  const swing = 0.72 + (seed % 66) / 100;
  return Math.max(10, Math.round(item.basePrice * swing));
}

function getAffinity(holding) {
  return Math.min(100, getHeldDays(holding.acquiredDate) * AFFINITY_PER_DAY);
}

function getHeldDays(acquiredDate) {
  const acquired = parseKstDate(acquiredDate);
  const today = parseKstDate(getTodayKey());
  const diffMs = today.getTime() - acquired.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
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

function getRecentDays(count) {
  const days = [];
  const today = parseKstDate(getTodayKey());

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    days.push(formatDateKey(date));
  }

  return days;
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

  const yesterday = parseKstDate(getTodayKey());
  yesterday.setDate(yesterday.getDate() - 1);
  return dateKey === formatDateKey(yesterday);
}

function parseKstDate(dateKey) {
  return new Date(`${dateKey}T00:00:00+09:00`);
}

function formatDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDate(dateKey) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(parseKstDate(dateKey));
}

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
