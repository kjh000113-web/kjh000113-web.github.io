const STORAGE_KEY = "kjh000113-collection-game";
const ATTENDANCE_REWARD = 100;
const DRAW_ONCE_COST = 30;
const DRAW_TEN_COST = 270;
const AFFINITY_PER_DAY = 8;

const drawGenres = [
  {
    id: "fantasy",
    label: "판타지",
    description: "마법, 왕국, 성물 이미지",
    folder: "images/fantasy",
  },
  {
    id: "modern",
    label: "현대",
    description: "도시, 일상, 현재풍 이미지",
    folder: "images/modern",
  },
  {
    id: "wuxia",
    label: "무협",
    description: "검, 강호, 동양풍 이미지",
    folder: "images/wuxia",
  },
  {
    id: "cyberpunk",
    label: "사이버펑크",
    description: "네온, 기계, 미래도시 이미지",
    folder: "images/cyberpunk",
  },
];

const rarityLabels = {
  common: "일반",
  rare: "희귀",
  epic: "에픽",
  legendary: "전설",
};

const rarityWeights = [
  { rarity: "common", weight: 70, basePrice: 70 },
  { rarity: "rare", weight: 20, basePrice: 170 },
  { rarity: "epic", weight: 8, basePrice: 420 },
  { rarity: "legendary", weight: 2, basePrice: 900 },
];

const nameParts = {
  fantasy: {
    prefixes: ["신비한", "빛나는", "고대의", "축복받은", "잊혀진"],
    nouns: ["성배", "마법서", "별의 검", "왕국의 문장", "달빛 로브"],
  },
  modern: {
    prefixes: ["차분한", "선명한", "낯선", "반짝이는", "느린"],
    nouns: ["거리의 기록", "오후의 창", "도시의 조각", "유리 엽서", "작은 신호"],
  },
  wuxia: {
    prefixes: ["고요한", "비장한", "청명한", "숨겨진", "흐르는"],
    nouns: ["검의 맹세", "강호의 비급", "매화 부채", "운명의 비녀", "청룡 패"],
  },
  cyberpunk: {
    prefixes: ["네온빛", "과열된", "푸른", "불안정한", "전류 흐르는"],
    nouns: ["회로 심장", "데이터 칩", "기계 눈", "밤의 터미널", "합성 기억"],
  },
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
const drawSectionList = document.querySelector("#drawSectionList");
const drawMessage = document.querySelector("#drawMessage");
const resultList = document.querySelector("#resultList");
const manageList = document.querySelector("#manageList");
const drawMachine = document.querySelector(".draw-machine");
const tabButtons = document.querySelectorAll(".tab-button");
const tabViews = document.querySelectorAll(".tab-view");

let imageCatalog = {};
let state = loadState();
normalizeState();
init();

attendanceButton?.addEventListener("click", checkAttendance);
drawSectionList?.addEventListener("click", handleDrawClick);
manageList?.addEventListener("click", handleManageClick);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.target || "home");
  });
});

async function init() {
  imageCatalog = await loadImageCatalog();
  render();
}

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
        addLegacyHolding(itemId, state.lastAttendanceDate || getTodayKey());
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

async function loadImageCatalog() {
  try {
    const response = await fetch("images.json", { cache: "no-store" });

    if (!response.ok) {
      return {};
    }

    const catalog = await response.json();
    return catalog && typeof catalog === "object" ? catalog : {};
  } catch {
    return {};
  }
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

function handleDrawClick(event) {
  const button = event.target.closest("[data-draw-genre]");

  if (!button) {
    return;
  }

  drawItems(button.dataset.drawGenre, Number(button.dataset.drawCount));
}

function drawItems(genreId, count) {
  const cost = count === 10 ? DRAW_TEN_COST : DRAW_ONCE_COST;
  const images = getImagesForGenre(genreId);

  if (state.points < cost) {
    drawMessage.textContent = `포인트가 부족합니다. ${cost}P가 필요해요.`;
    return;
  }

  if (images.length === 0) {
    drawMessage.textContent = "이 장르에는 아직 등록된 이미지가 없습니다.";
    return;
  }

  state.points -= cost;
  const today = getTodayKey();
  const results = Array.from({ length: count }, () =>
    createRandomCollection(genreId, images, today),
  );

  state.holdings.push(...results);
  state.recentResults = results.map((holding) => holding.uid);
  saveState();
  animateDraw();
  render();
}

function createRandomCollection(genreId, images, acquiredDate) {
  const genre = drawGenres.find((item) => item.id === genreId) || drawGenres[0];
  const image = images[Math.floor(Math.random() * images.length)];
  const rarityConfig = pickRarity();

  return {
    uid: crypto.randomUUID(),
    genreId: genre.id,
    genreLabel: genre.label,
    name: createRandomName(genre.id),
    rarity: rarityConfig.rarity,
    image,
    basePrice: rarityConfig.basePrice + Math.floor(Math.random() * 40),
    acquiredDate,
  };
}

function pickRarity() {
  const totalWeight = rarityWeights.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of rarityWeights) {
    roll -= item.weight;

    if (roll <= 0) {
      return item;
    }
  }

  return rarityWeights[0];
}

function createRandomName(genreId) {
  const parts = nameParts[genreId] || nameParts.fantasy;
  const prefix = parts.prefixes[Math.floor(Math.random() * parts.prefixes.length)];
  const noun = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
  return `${prefix} ${noun}`;
}

function addLegacyHolding(itemId, acquiredDate) {
  const genre = drawGenres[0];
  state.holdings.push({
    uid: crypto.randomUUID(),
    genreId: genre.id,
    genreLabel: genre.label,
    name: itemId,
    rarity: "common",
    image: "",
    basePrice: 70,
    acquiredDate,
  });
}

function sellHolding(uid) {
  const holding = state.holdings.find((item) => item.uid === uid);

  if (!holding) {
    return;
  }

  state.points += getMarketPrice(holding);
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
  renderDrawSections();
  renderResults();
  renderHome();
  renderManageList();
}

function renderStatus() {
  const didAttendToday = state.lastAttendanceDate === getTodayKey();
  const holdings = getHoldings();

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

  if (drawMessage && state.recentResults.length === 0) {
    drawMessage.textContent = "포인트를 모아 원하는 장르의 컬렉션을 획득하세요.";
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

function renderDrawSections() {
  if (!drawSectionList) {
    return;
  }

  drawSectionList.innerHTML = drawGenres
    .map((genre) => {
      const imageCount = getImagesForGenre(genre.id).length;
      const disabled = imageCount === 0;

      return `
        <article class="genre-card">
          <div class="genre-card__top">
            <div>
              <h3>${genre.label}</h3>
              <p>${genre.description} · 이미지 ${imageCount}개</p>
            </div>
          </div>
          <div class="draw-actions">
            <button class="button button--primary" type="button" data-draw-genre="${genre.id}" data-draw-count="1" ${disabled || state.points < DRAW_ONCE_COST ? "disabled" : ""}>
              1회 30P
            </button>
            <button class="button button--secondary" type="button" data-draw-genre="${genre.id}" data-draw-count="10" ${disabled || state.points < DRAW_TEN_COST ? "disabled" : ""}>
              10회 270P
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderHome() {
  if (!collectionSlider) {
    return;
  }

  const holdings = getHoldings();

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
    .filter(Boolean);

  if (results.length === 0) {
    resultList.innerHTML = "";
    return;
  }

  resultList.innerHTML = results.map(createResultMarkup).join("");

  if (drawMessage) {
    drawMessage.textContent =
      results.length === 1
        ? `${results[0].name}을 획득했습니다.`
        : `${results.length}개의 컬렉션을 획득했습니다.`;
  }
}

function renderManageList() {
  if (!manageList) {
    return;
  }

  const holdings = getHoldings();

  if (holdings.length === 0) {
    manageList.innerHTML =
      '<div class="empty-state">판매할 컬렉션이 없습니다. 뽑기에서 먼저 획득해보세요.</div>';
    return;
  }

  manageList.innerHTML = holdings
    .slice()
    .sort((a, b) => getMarketPrice(b) - getMarketPrice(a))
    .map(createManageMarkup)
    .join("");
}

function createSlideMarkup(holding) {
  const price = getMarketPrice(holding);
  const affinity = getAffinity(holding);
  const days = getHeldDays(holding.acquiredDate);

  return `
    <article class="slide-card">
      ${createImageMarkup(holding, "item-image")}
      <div class="slide-card__content">
        <h3>${holding.name}</h3>
        <div class="item-meta">
          ${createRarityMarkup(holding.rarity)}
          <span class="price-chip">${price.toLocaleString("ko-KR")}P</span>
          <span class="affinity-chip">호감도 ${affinity}</span>
        </div>
        <div class="stat-row">
          <div class="stat-line"><span>장르</span><strong>${holding.genreLabel}</strong></div>
          <div class="stat-line"><span>보유 기간</span><strong>${days}일</strong></div>
          <div class="stat-line"><span>오늘 판매가</span><strong>${price.toLocaleString("ko-KR")}P</strong></div>
        </div>
      </div>
    </article>
  `;
}

function createResultMarkup(holding) {
  return `
    <article class="result-card">
      <div class="item-meta">
        ${createRarityMarkup(holding.rarity)}
      </div>
      <h3>${holding.name}</h3>
      <p class="helper-text">${holding.genreLabel} 컬렉션에 추가되었습니다.</p>
    </article>
  `;
}

function createManageMarkup(holding) {
  const price = getMarketPrice(holding);
  const affinity = getAffinity(holding);
  const days = getHeldDays(holding.acquiredDate);

  return `
    <article class="manage-card">
      <div class="manage-card__top">
        <div class="manage-thumb">${createImageMarkup(holding, "item-image")}</div>
        <div class="manage-card__body">
          <h3>${holding.name}</h3>
          <div class="item-meta">
            ${createRarityMarkup(holding.rarity)}
            <span class="affinity-chip">호감도 ${affinity}</span>
          </div>
        </div>
      </div>
      <div class="stat-row">
        <div class="stat-line"><span>장르</span><strong>${holding.genreLabel}</strong></div>
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

function createImageMarkup(holding, className) {
  if (!holding.image) {
    return `<span class="${className} item-image--placeholder">${holding.name.slice(0, 1)}</span>`;
  }

  return `<img class="${className}" src="${holding.image}" alt="${holding.name}" loading="lazy" />`;
}

function getHoldings() {
  return state.holdings.filter((holding) => holding.name);
}

function getImagesForGenre(genreId) {
  const images = imageCatalog[genreId];

  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((entry) => (typeof entry === "string" ? entry : entry.src))
    .filter(Boolean);
}

function getMarketPrice(holding) {
  const seed = hashString(`${getTodayKey()}-${holding.uid}-${holding.name}`);
  const swing = 0.72 + (seed % 66) / 100;
  return Math.max(10, Math.round((holding.basePrice || 70) * swing));
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

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
