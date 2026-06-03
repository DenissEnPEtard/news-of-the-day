const NEWS_API_URL = "/.netlify/functions/news";
const MAX_ARTICLES = 9;
const CATEGORY_CACHE_MS = 30 * 60 * 1000;

const categoryConfig = {
  world: {
    apiCategory: "world",
    queries: ["international monde Canada", "cooperation internationale Canada", "decouverte monde francais"]
  },
  nation: {
    apiCategory: "general",
    queries: ["Canada communaute innovation", "Canada eleves education", "Canada environnement projet"]
  },
  technology: {
    apiCategory: "technology",
    queries: ["technologie Canada innovation", "science Canada decouverte", "intelligence artificielle Canada"]
  },
  sports: {
    apiCategory: "sports",
    queries: ["sport Canada equipe", "hockey Canada athlete", "tournoi Canada victoire"]
  },
  entertainment: {
    apiCategory: "entertainment",
    queries: ["culture Canada festival", "musique Canada artiste", "film Canada cinema"]
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

const localFallbackArticles = {
  world: [
    {
      title: "Des jeunes Canadiens discutent de cooperation internationale",
      description: "Une carte de pratique sur la cooperation, les cultures et les liens entre le Canada et le monde.",
      content: "Des eleves au Canada peuvent apprendre le francais en parlant de cooperation internationale, de cultures differentes et de projets positifs dans le monde.",
      url: "https://ici.radio-canada.ca/info/en-continu",
      image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "La francophonie aide les eleves a mieux comprendre le monde",
      description: "Un sujet positif pour parler de langues, de pays francophones et de communication.",
      content: "La francophonie permet aux jeunes Canadiens de decouvrir d'autres pays, d'autres accents et d'autres facons de voir le monde.",
      url: "https://www.francophonie.org/",
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Des projets scolaires relient le Canada a d'autres pays",
      description: "Un sujet clair pour parler d'education, de collaboration et de citoyennete mondiale.",
      content: "Des projets scolaires peuvent aider les eleves a comparer leur vie au Canada avec celle de jeunes dans d'autres pays.",
      url: "https://ici.radio-canada.ca/jeunesse",
      image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    }
  ],
  nation: [
    {
      title: "Des communautes canadiennes lancent des projets positifs",
      description: "Une carte de pratique sur les villes, les citoyens et les projets locaux au Canada.",
      content: "Au Canada, plusieurs communautes creent des projets pour ameliorer la vie locale, aider les jeunes et proteger l'environnement.",
      url: "https://ici.radio-canada.ca/info/en-continu",
      image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Des eleves canadiens utilisent le francais dans la vie quotidienne",
      description: "Un sujet accessible pour parler d'ecole, de bilinguisme et de confiance en classe.",
      content: "Les eleves anglophones au Canada peuvent pratiquer le francais avec des nouvelles simples, des videos courtes et des resumes adaptes a leur niveau.",
      url: "https://www.canada.ca/fr/patrimoine-canadien/services/langues-officielles-bilinguisme.html",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Le Canada encourage les jeunes a participer a leur communaute",
      description: "Un sujet positif pour parler de benevolat, de citoyennete et de projets locaux.",
      content: "Participer a sa communaute aide les jeunes a developper leurs competences, rencontrer des gens et comprendre leur pays.",
      url: "https://www.canada.ca/fr/services/jeunesse.html",
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    }
  ],
  technology: [
    {
      title: "La technologie aide les eleves canadiens a apprendre le francais",
      description: "Un sujet clair sur les outils numeriques, les videos et l'apprentissage des langues.",
      content: "Les outils numeriques peuvent aider les eleves a lire, ecouter et parler en francais plus souvent.",
      url: "https://ici.radio-canada.ca/jeunesse",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Des innovations canadiennes rendent l'ecole plus interactive",
      description: "Une carte de pratique sur l'innovation, la classe et les nouvelles idees.",
      content: "Des innovations comme les applications, les videos et les outils d'intelligence artificielle peuvent rendre l'apprentissage plus interactif.",
      url: "https://ised-isde.canada.ca/site/isde/fr",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "La science et la technologie donnent de nouveaux sujets de discussion",
      description: "Un sujet pour apprendre du vocabulaire sur la science, les appareils et la securite.",
      content: "Les nouvelles technologiques permettent aux eleves de discuter d'innovation, de securite et d'avenir en francais.",
      url: "https://ici.radio-canada.ca/science",
      image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    }
  ],
  sports: [
    {
      title: "Le sport canadien rassemble les eleves et les communautes",
      description: "Une carte de pratique sur les equipes, les matchs et l'esprit sportif.",
      content: "Le sport aide les jeunes a parler de travail d'equipe, d'effort, de victoire et de respect.",
      url: "https://ici.radio-canada.ca/sports",
      image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Des athletes canadiens inspirent les jeunes",
      description: "Un sujet positif pour parler d'objectifs, d'entrainement et de perseverance.",
      content: "Les athletes canadiens peuvent inspirer les eleves parce qu'ils montrent l'importance de la discipline et de la confiance.",
      url: "https://www.canada.ca/fr/patrimoine-canadien/services/sport-canada.html",
      image: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Le hockey reste un sujet important pour parler du Canada",
      description: "Un sujet familier pour pratiquer le vocabulaire du sport en francais.",
      content: "Le hockey est souvent associe au Canada et donne aux eleves un sujet facile pour parler d'equipes, de joueurs et de matchs.",
      url: "https://ici.radio-canada.ca/sports/hockey",
      image: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    }
  ],
  entertainment: [
    {
      title: "La culture canadienne donne de bons sujets en classe de francais",
      description: "Une carte de pratique sur la musique, les films, les festivals et les artistes.",
      content: "La culture canadienne permet aux eleves de discuter de musique, de cinema, d'art et d'evenements locaux.",
      url: "https://ici.radio-canada.ca/arts",
      image: "https://images.unsplash.com/photo-1508973379184-7517410fb0bc?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Les festivals aident les jeunes a decouvrir la culture francophone",
      description: "Un sujet positif pour parler d'evenements, de villes et de traditions.",
      content: "Les festivals francophones au Canada peuvent aider les jeunes a entendre le francais dans un contexte vivant et amusant.",
      url: "https://www.canada.ca/fr/patrimoine-canadien/services/financement/festivals-locaux.html",
      image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    },
    {
      title: "Les artistes canadiens racontent des histoires en francais",
      description: "Un sujet pour parler de chansons, de films et d'identite culturelle.",
      content: "Les artistes canadiens peuvent aider les eleves a comprendre comment la langue francaise sert a raconter des histoires.",
      url: "https://ici.radio-canada.ca/ohdio",
      image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
      source: { name: "Practice news backup" }
    }
  ]
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
let latestLoadId = 0;
let categoryCache = {};

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
  const loadId = ++latestLoadId;
  setLoading(true);
  showError("");
  newsGrid.innerHTML = "";

  try {
    const cached = categoryCache[category];
    if (cached && Date.now() - cached.createdAt < CATEGORY_CACHE_MS) {
      renderArticles(cached.articles, category);
      return;
    }

    const articles = await fetchArticlesForCategory(category);
    if (loadId !== latestLoadId) {
      return;
    }
    if (articles.length === 0) {
      throw new Error("No articles are available for this category.");
    }

    categoryCache[category] = {
      createdAt: Date.now(),
      articles
    };
    renderArticles(articles, category);
  } catch (error) {
    if (loadId !== latestLoadId) {
      return;
    }
    console.error(error);
    showError(error.message || "The news could not load right now. Check the API key, check the Internet connection, or try again later.");
  } finally {
    if (loadId === latestLoadId) {
      setLoading(false);
    }
  }
}

async function fetchArticlesForCategory(category) {
  try {
    const response = await fetch(`${NEWS_API_URL}?category=${encodeURIComponent(category)}`);
    if (!response.ok) {
      throw new Error(`News function error: ${response.status}`);
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    if (articles.length > 0) {
      if (data.fallback) {
        showError("GNews is temporarily unavailable. Practice articles are shown so the class can continue.");
      }
      return articles;
    }
  } catch (error) {
    console.warn(error);
  }

  showError("Live news could not load. Practice articles are shown so the class can continue.");
  return getLocalFallbackArticles(category);
}

function renderArticles(articles, category) {
  const positiveArticles = articles.filter(isStudentFriendlyArticle);
  const sourceArticles = positiveArticles.length >= 3 ? positiveArticles : articles;
  articleStore = {};
  let cardArticles = sourceArticles
    .filter((article) => article.title && article.url)
    .slice(0, MAX_ARTICLES);

  if (cardArticles.length < 3) {
    showError("Live news is limited right now. Practice articles are shown so the class can continue.");
    cardArticles = getLocalFallbackArticles(category);
  }

  const cards = cardArticles.map((article, index) => createArticleCard(article, category, index));
  newsGrid.innerHTML = cards.join("");
  loadFrenchVideosForCards();
}

function getLocalFallbackArticles(category) {
  const articles = localFallbackArticles[category] || localFallbackArticles.world;
  const today = new Date().toISOString();
  return articles.map((article) => ({
    ...article,
    publishedAt: today
  }));
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
        <p class="category-note">Category loaded: ${escapeHtml(categoryLabels[category])}</p>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="description">${escapeHtml(description)}</p>
        <section class="summary-box" aria-labelledby="${summaryId}-title">
          <h4 id="${summaryId}-title">Choose your summary level</h4>
          <div class="difficulty-buttons" role="group" aria-label="Summary difficulty">
            <button type="button" class="difficulty-button" data-summary-level="beginner">Beginner</button>
            <button type="button" class="difficulty-button" data-summary-level="intermediate">Intermediate</button>
            <button type="button" class="difficulty-button" data-summary-level="advanced">Advanced</button>
          </div>
          <p class="summary-text" id="${summaryId}" data-summary-text aria-live="polite">Select a level first, then open a detailed article summary.</p>
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
    summaryText.textContent = `Level selected: ${difficultyButton.textContent}. Open a detailed summary of this article.`;
    generateButton.classList.remove("disabled");
    generateButton.removeAttribute("aria-disabled");
    generateButton.textContent = "Open article summary";
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
