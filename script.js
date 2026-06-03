const API_KEY = "bca407c94fadbba9aff3dff0b58870e4";
const API_URL = "https://gnews.io/api/v4/top-headlines";
const MAX_ARTICLES = 9;

const categoryConfig = {
  world: {
    apiCategory: "world",
    query: "Canada cooperation discovery progress education community"
  },
  nation: {
    apiCategory: "general",
    query: "Canada community students environment innovation"
  },
  technology: {
    apiCategory: "technology",
    query: "Canada technology innovation science students"
  },
  sports: {
    apiCategory: "sports",
    query: "Canada sports team athlete tournament"
  },
  entertainment: {
    apiCategory: "entertainment",
    query: "Canada culture music film festival artist"
  }
};

const negativeWords = [
  "accident",
  "attaque",
  "crise",
  "dead",
  "death",
  "deces",
  "guerre",
  "killed",
  "meurtre",
  "mort",
  "shooting",
  "tue",
  "violence"
];

const categoryLabels = {
  world: "Monde",
  nation: "Canada",
  technology: "Technologie",
  sports: "Sport",
  entertainment: "Culture"
};

const learningHelp = {
  world: {
    vocab: ["le monde", "un pays", "une décision", "la paix", "un dirigeant"],
    sentence: "Cette nouvelle parle d'un événement important dans le monde.",
    question: "Quel pays ou quelle région est mentionné dans l'article ?"
  },
  nation: {
    vocab: ["le Canada", "une province", "le gouvernement", "une ville", "les citoyens"],
    sentence: "Cette nouvelle explique quelque chose qui se passe au Canada.",
    question: "Pourquoi cette nouvelle est-elle importante pour les Canadiens ?"
  },
  technology: {
    vocab: ["la technologie", "une application", "l'innovation", "un appareil", "la sécurité"],
    sentence: "Cette nouvelle montre comment la technologie change la vie quotidienne.",
    question: "Quel outil ou quelle idée technologique est présenté ?"
  },
  sports: {
    vocab: ["une équipe", "un match", "un joueur", "une victoire", "un résultat"],
    sentence: "Cette nouvelle parle d'un sport, d'une équipe ou d'un athlète.",
    question: "Qui joue ou participe dans cette nouvelle ?"
  },
  entertainment: {
    vocab: ["la culture", "un film", "la musique", "un artiste", "un événement"],
    sentence: "Cette nouvelle présente une partie de la culture ou du divertissement.",
    question: "Quel artiste, film ou événement culturel est mentionné ?"
  }
};

const newsGrid = document.getElementById("news-grid");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const categoryButtons = document.querySelectorAll(".category-button");
const todayLabel = document.getElementById("today-label");

let activeCategory = "world";
let articleStore = {};

updateTodayLabel();

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    updateActiveButton();
    loadNews(activeCategory);
  });
});

newsGrid.addEventListener("click", handleNewsGridClick);

loadNews(activeCategory);
scheduleDailyRefresh();

function updateActiveButton() {
  categoryButtons.forEach((button) => {
    const isActive = button.dataset.category === activeCategory;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function updateTodayLabel() {
  todayLabel.textContent = new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function scheduleDailyRefresh() {
  const now = new Date();
  const nextMorning = new Date(now);
  nextMorning.setDate(now.getDate() + 1);
  nextMorning.setHours(6, 0, 0, 0);

  window.setTimeout(() => {
    updateTodayLabel();
    loadNews(activeCategory);
    window.setInterval(() => {
      updateTodayLabel();
      loadNews(activeCategory);
    }, 24 * 60 * 60 * 1000);
  }, nextMorning.getTime() - now.getTime());
}

async function loadNews(category) {
  setLoading(true);
  showError("");
  newsGrid.innerHTML = "";

  try {
    const response = await fetchNewsWithFallback(category);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];

    if (articles.length === 0) {
      throw new Error("No articles are available for this category.");
    }

    renderArticles(articles, category);
  } catch (error) {
    console.error(error);
    showError("The news could not load right now. Check the API key, check the Internet connection, or try again later.");
  } finally {
    setLoading(false);
  }
}

async function fetchNewsWithFallback(category) {
  const focusedResponse = await fetch(buildNewsUrl(category, true));

  if (focusedResponse.ok) {
    try {
      const clonedResponse = focusedResponse.clone();
      const data = await clonedResponse.json();
      if (Array.isArray(data.articles) && data.articles.length > 0) {
        return focusedResponse;
      }
    } catch (error) {
      console.warn(error);
    }
  }

  return fetch(buildNewsUrl(category, false));
}

function buildNewsUrl(category, includePositiveQuery = true) {
  const config = categoryConfig[category] || categoryConfig.world;
  const params = new URLSearchParams({
    category: config.apiCategory,
    lang: "fr",
    country: "ca",
    max: String(MAX_ARTICLES),
    apikey: API_KEY
  });

  if (includePositiveQuery) {
    params.set("q", config.query);
  }

  return `${API_URL}?${params.toString()}`;
}

function renderArticles(articles, category) {
  const positiveArticles = articles.filter(isStudentFriendlyArticle);
  const sourceArticles = positiveArticles.length >= 3 ? positiveArticles : articles;
  articleStore = {};
  const cards = sourceArticles
    .filter((article) => article.title && article.url)
    .slice(0, MAX_ARTICLES)
    .map((article, index) => createArticleCard(article, category, index));

  if (cards.length === 0) {
    showError("No usable articles are available for this category right now. Try another category or refresh the page.");
    return;
  }

  newsGrid.innerHTML = cards.join("");
  loadFrenchVideosForCards();
}

function isStudentFriendlyArticle(article) {
  const text = normalizeText(`${article.title || ""} ${article.description || ""}`);
  return !negativeWords.some((word) => text.includes(word));
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createArticleCard(article, category, index) {
  const help = learningHelp[category];
  const articleId = `${category}-${index}`;
  const sourceName = article.source?.name || "Unknown source";
  const publishedAt = article.publishedAt ? formatDate(article.publishedAt) : "Unknown date";
  const description = article.description || "Use the summary levels to discover the main idea of this French news story.";
  const imageUrl = article.image || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80";
  const summaries = createDifficultySummaries(article, category);
  const summaryId = `summary-${category}-${index}`;
  const videoQuery = createVideoQuery(article, category);
  articleStore[articleId] = { ...article, category };

  return `
    <article class="news-card" data-card data-article-id="${escapeAttribute(articleId)}">
      <img class="news-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(article.title)}" loading="lazy">
      <div class="card-body">
        <div class="meta-row">
          <span>${escapeHtml(sourceName)}</span>
          <span>${publishedAt}</span>
          <span>${categoryLabels[category]}</span>
        </div>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="description">${escapeHtml(description)}</p>
        <section class="summary-box" aria-labelledby="${summaryId}-title">
          <h4 id="${summaryId}-title">Choose your summary level</h4>
          <div class="difficulty-buttons" role="group" aria-label="Summary difficulty">
            <button type="button" class="difficulty-button" data-summary-level="beginner">Beginner</button>
            <button type="button" class="difficulty-button" data-summary-level="intermediate">Intermediate</button>
            <button type="button" class="difficulty-button" data-summary-level="advanced">Advanced</button>
          </div>
          <p class="summary-text" id="${summaryId}" data-summary-text aria-live="polite">Select a level first, then open a presentation summary page.</p>
          <template data-summary-template="beginner">${escapeHtml(summaries.beginner)}</template>
          <template data-summary-template="intermediate">${escapeHtml(summaries.intermediate)}</template>
          <template data-summary-template="advanced">${escapeHtml(summaries.advanced)}</template>
        </section>
        <section class="learning-box" aria-label="French learning help">
          <h4>French learning help</h4>
          <ul class="vocab-list">
            ${help.vocab.map((word) => `<li>${escapeHtml(word)}</li>`).join("")}
          </ul>
          <p class="simple-sentence"><strong>Simple French sentence:</strong> ${escapeHtml(help.sentence)}</p>
          <p class="question"><strong>Comprehension question:</strong> ${escapeHtml(help.question)}</p>
        </section>
        <section class="video-box" data-video-box data-video-query="${escapeAttribute(videoQuery)}" aria-label="Short French video">
          <h4>Short French video</h4>
          <p data-video-status>Looking for a short French video connected to this story...</p>
          <a class="video-fallback-link" href="${escapeAttribute(createVideoSearchUrl(videoQuery))}" target="_blank" rel="noopener noreferrer">Search French videos</a>
        </section>
        <button class="summary-button disabled" type="button" data-generate-summary aria-disabled="true">Choose a level first</button>
      </div>
    </article>
  `;
}

async function loadFrenchVideosForCards() {
  const videoBoxes = [...document.querySelectorAll("[data-video-box]")];

  await Promise.all(videoBoxes.map(async (box) => {
    const query = box.dataset.videoQuery;

    try {
      const video = await findFrenchVideo(query);
      if (!video) {
        showVideoFallback(box, query);
        return;
      }

      box.innerHTML = `
        <h4>Short French video</h4>
        <div class="video-frame">
          <iframe src="https://www.dailymotion.com/embed/video/${escapeAttribute(video.id)}" title="${escapeAttribute(video.title)}" loading="lazy" allowfullscreen></iframe>
        </div>
        <p class="video-title">${escapeHtml(video.title)}</p>
      `;
    } catch (error) {
      console.warn(error);
      showVideoFallback(box, query);
    }
  }));
}

async function findFrenchVideo(query) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 7000);
  const params = new URLSearchParams({
    search: query,
    fields: "id,title,duration,url",
    limit: "6"
  });

  try {
    const response = await fetch(`https://api.dailymotion.com/videos?${params.toString()}`, {
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Video API error: ${response.status}`);
    }

    const data = await response.json();
    const videos = Array.isArray(data.list) ? data.list : [];
    return videos.find((video) => video.id && video.duration && video.duration <= 480) || videos.find((video) => video.id);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function showVideoFallback(box, query) {
  box.innerHTML = `
    <h4>Short French video</h4>
    <p>A matching short video could not load automatically.</p>
    <a class="video-fallback-link" href="${escapeAttribute(createVideoSearchUrl(query))}" target="_blank" rel="noopener noreferrer">Search French videos</a>
  `;
}

function createVideoQuery(article, category) {
  const titleWords = cleanSentence(article.title)
    .split(" ")
    .filter((word) => word.length > 3)
    .slice(0, 7)
    .join(" ");

  return `${titleWords || categoryLabels[category]} francais Canada courte video`;
}

function createVideoSearchUrl(query) {
  return `https://www.dailymotion.com/search/${encodeURIComponent(query)}/videos`;
}

async function handleNewsGridClick(event) {
  const difficultyButton = event.target.closest("[data-summary-level]");
  const summaryButton = event.target.closest("[data-generate-summary]");

  if (difficultyButton) {
    const card = difficultyButton.closest("[data-card]");
    const level = difficultyButton.dataset.summaryLevel;
    const summaryText = card.querySelector("[data-summary-text]");
    const generateButton = card.querySelector("[data-generate-summary]");

    card.querySelectorAll("[data-summary-level]").forEach((button) => {
      const isActive = button === difficultyButton;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    card.dataset.selectedLevel = level;
    summaryText.textContent = `Level selected: ${difficultyButton.textContent}. Open a new page with a class presentation summary.`;
    generateButton.classList.remove("disabled");
    generateButton.removeAttribute("aria-disabled");
    generateButton.textContent = "Open presentation summary";
    return;
  }

  if (summaryButton?.classList.contains("disabled")) {
    event.preventDefault();
    const card = summaryButton.closest("[data-card]");
    const summaryText = card.querySelector("[data-summary-text]");
    summaryText.textContent = "Please choose Beginner, Intermediate, or Advanced first.";
    return;
  }

  if (summaryButton) {
    const card = summaryButton.closest("[data-card]");
    const level = card.dataset.selectedLevel;
    const template = card.querySelector(`[data-summary-template="${level}"]`);
    const fallbackSummary = template.content.textContent;
    const article = articleStore[card.dataset.articleId];
    const summaryPageId = `${card.dataset.articleId}-${Date.now()}`;

    try {
      localStorage.setItem(`summary:${summaryPageId}`, JSON.stringify({
        level,
        fallbackSummary,
        article: {
          category: categoryLabels[article.category],
          title: article.title,
          description: article.description,
          content: article.content,
          source: article.source?.name,
          image: article.image,
          publishedAt: article.publishedAt
        }
      }));

      const summaryWindow = window.open(`summary.html?id=${encodeURIComponent(summaryPageId)}`, "_blank", "noopener");
      if (!summaryWindow) {
        window.location.href = `summary.html?id=${encodeURIComponent(summaryPageId)}`;
      }
    } catch (error) {
      const summaryText = card.querySelector("[data-summary-text]");
      summaryText.textContent = "The summary page could not open. Please refresh and try again.";
      console.error(error);
    }
  }
}

function createDifficultySummaries(article, category) {
  const title = cleanSentence(article.title);
  const description = cleanSentence(article.description || "");
  const content = cleanSentence(article.content || description || title);
  const categoryLabel = categoryLabels[category];

  return {
    beginner: `Sujet : ${categoryLabel}. Cette nouvelle parle de : ${title}. Idee principale : ${makeShortSummary(content, 18)}.`,
    intermediate: `${makeShortSummary(content, 34)} Cette nouvelle est liee a ${categoryLabel}. Elle peut aider un eleve canadien a comprendre un sujet actuel en francais.`,
    advanced: `${makeShortSummary(content, 54)} Cette nouvelle montre un enjeu actuel lie a ${categoryLabel}. Pour aller plus loin, demande-toi pourquoi cette information est importante pour le Canada, qui est concerne, et quel point de vue la source met en avant.`
  };
}

function makeShortSummary(text, maxWords) {
  const words = cleanSentence(text).split(" ").filter(Boolean);
  const selectedWords = words.slice(0, maxWords).join(" ");
  return selectedWords || "L'article presente une nouvelle actuelle avec un lien avec le Canada";
}

function cleanSentence(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(dateString));
}

function setLoading(isLoading) {
  loading.hidden = !isLoading;
}

function showError(message) {
  errorMessage.hidden = !message;
  errorMessage.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
