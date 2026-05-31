const STORAGE_KEY = "kjh000113-board-posts";

const categoryLabels = {
  notice: "공지",
  daily: "일상",
  study: "공부",
  project: "프로젝트",
};

const starterPosts = [
  {
    id: "welcome",
    title: "게시판에 오신 것을 환영합니다",
    category: "notice",
    body: "이곳은 공지, 일상, 공부 기록, 프로젝트 메모를 남기는 개인 게시판입니다.",
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "study-log",
    title: "오늘의 공부 기록",
    category: "study",
    body: "배운 내용과 참고 링크를 짧게 정리해두면 나중에 다시 보기 좋습니다.",
    createdAt: "2026-06-01T09:10:00.000Z",
  },
  {
    id: "project-note",
    title: "홈페이지 개선 아이디어",
    category: "project",
    body: "프로필 사진, 프로젝트 링크, 방명록 기능을 차례대로 추가해볼 수 있습니다.",
    createdAt: "2026-06-01T09:20:00.000Z",
  },
];

const yearElement = document.querySelector("#year");
const postList = document.querySelector("#postList");
const postForm = document.querySelector("#postForm");
const searchInput = document.querySelector("#searchInput");
const categoryButtons = document.querySelectorAll("[data-category]");

let activeCategory = "all";
let posts = loadPosts();

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

renderPosts();

postForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(postForm);
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const category = String(formData.get("category") || "daily");

  if (!title || !body) {
    return;
  }

  posts = [
    {
      id: crypto.randomUUID(),
      title,
      category,
      body,
      createdAt: new Date().toISOString(),
    },
    ...posts,
  ];

  savePosts();
  postForm.reset();
  renderPosts();
  document.querySelector("#board")?.scrollIntoView({ behavior: "smooth" });
});

searchInput?.addEventListener("input", renderPosts);

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category || "all";
    categoryButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    renderPosts();
  });
});

postList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");

  if (!button) {
    return;
  }

  posts = posts.filter((post) => post.id !== button.dataset.deleteId);
  savePosts();
  renderPosts();
});

function loadPosts() {
  const savedPosts = localStorage.getItem(STORAGE_KEY);

  if (!savedPosts) {
    return starterPosts;
  }

  try {
    const parsed = JSON.parse(savedPosts);
    return Array.isArray(parsed) ? parsed : starterPosts;
  } catch {
    return starterPosts;
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function renderPosts() {
  if (!postList) {
    return;
  }

  const query = (searchInput?.value || "").trim().toLowerCase();
  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      activeCategory === "all" || post.category === activeCategory;
    const searchableText = `${post.title} ${post.body}`.toLowerCase();
    return matchesCategory && searchableText.includes(query);
  });

  if (filteredPosts.length === 0) {
    postList.innerHTML =
      '<div class="empty-state">조건에 맞는 글이 없습니다. 새 글을 남겨보세요.</div>';
    return;
  }

  postList.innerHTML = filteredPosts.map(createPostMarkup).join("");
}

function createPostMarkup(post) {
  const label = categoryLabels[post.category] || "기타";
  const date = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.createdAt));

  return `
    <article class="post-card">
      <div class="post-card__meta">
        <span class="badge">${escapeHtml(label)}</span>
        <time datetime="${escapeHtml(post.createdAt)}">${escapeHtml(date)}</time>
      </div>
      <div>
        <h3>${escapeHtml(post.title)}</h3>
        <p class="post-card__body">${escapeHtml(post.body)}</p>
      </div>
      <div class="post-card__actions">
        <button class="delete-button" type="button" data-delete-id="${escapeHtml(post.id)}">
          삭제
        </button>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
