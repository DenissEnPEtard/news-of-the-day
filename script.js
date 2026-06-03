const API_KEY = "bca407c94fadbba9aff3dff0b58870e4";
const NEWS_API_URL = "/.netlify/functions/news";
const MAX_ARTICLES = 9;
const CATEGORY_CACHE_MS = 15 * 60 * 1000;

const categoryLabels = {
  world: "Monde",
  nation: "Canada",
  technology: "Technologie",
  sports: "Sport",
  entertainment: "Culture"
};

const categorySearchQueries = {
  world: ["international monde Canada", "cooperation internationale Canada", "francophonie monde Canada"],
  nation: ["Canada communaute innovation", "Canada eleves education", "Canada environnement projet"],
  technology: ["technologie Canada innovation", "science Canada decouverte", "intelligence artificielle Canada"],
  sports: ["sport Canada equipe", "hockey Canada athlete", "tournoi Canada victoire"],
  entertainment: ["culture Canada festival", "musique Canada artiste", "film Canada cinema"]
};

const levelDetails = {
  beginner: {
    label: "Level 1",
    tag: "40-80 words",
    description: "Simple French, short sentences, easy explanations."
  },
  intermediate: {
    label: "Level 2",
    tag: "80-140 words",
    description: "Intermediate French with more details and some context."
  },
  advanced: {
    label: "Level 3",
    tag: "150-250 words",
    description: "B2/C1 French with analysis, importance, and possible consequences."
  }
};

const negativeWords = [
  "accident",
  "attaque",
  "crise",
  "dead",
  "death",
  "décès",
  "deces",
  "guerre",
  "killed",
  "meurtre",
  "mort",
  "shooting",
  "tué",
  "tue",
  "violence"
];

const positiveStudentWords = [
  "artiste",
  "canada",
  "canadien",
  "cinéma",
  "cinema",
  "communauté",
  "communaute",
  "coopération",
  "cooperation",
  "culture",
  "découverte",
  "decouverte",
  "école",
  "ecole",
  "élève",
  "eleve",
  "environnement",
  "équipe",
  "equipe",
  "festival",
  "francophonie",
  "hockey",
  "innovation",
  "jeune",
  "musique",
  "projet",
  "science",
  "sport",
  "technologie",
  "victoire"
];

const localFallbackArticles = {
  world: [
    {
      title: "Des jeunes Canadiens discutent de coopération internationale",
      description: "Des élèves au Canada parlent de projets positifs qui relient leur communauté à d'autres pays.",
      content: "Des classes canadiennes peuvent utiliser l'actualité pour comparer les cultures, parler de coopération et mieux comprendre le rôle du Canada dans le monde francophone.",
      url: "https://ici.radio-canada.ca/info/en-continu",
      image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "La francophonie aide les élèves à mieux comprendre le monde",
      description: "La langue française permet aux jeunes Canadiens de découvrir plusieurs pays, accents et cultures.",
      content: "La francophonie donne aux élèves un moyen concret de parler de voyages, de musique, de traditions et de communication internationale.",
      url: "https://www.francophonie.org/",
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Des projets scolaires relient le Canada à d'autres pays",
      description: "Des écoles utilisent des échanges et des projets en ligne pour connecter les élèves canadiens à des jeunes ailleurs dans le monde.",
      content: "Ces projets aident les élèves à comparer leur vie quotidienne, à poser des questions et à utiliser le français dans une situation réelle.",
      url: "https://ici.radio-canada.ca/jeunesse",
      image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    }
  ],
  nation: [
    {
      title: "Des communautés canadiennes lancent des projets positifs",
      description: "Plusieurs villes et groupes locaux créent des activités pour aider les jeunes, soutenir les familles et protéger l'environnement.",
      content: "Ces projets montrent comment des citoyens peuvent améliorer leur quartier avec des idées simples, du bénévolat et une bonne organisation.",
      url: "https://ici.radio-canada.ca/info/en-continu",
      image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Des élèves canadiens utilisent le français dans la vie quotidienne",
      description: "Des élèves anglophones pratiquent le français avec des nouvelles simples, des vidéos courtes et des questions de compréhension.",
      content: "Cette méthode rend la lecture plus utile, parce que les élèves parlent de sujets actuels qui touchent leur pays et leur génération.",
      url: "https://www.canada.ca/fr/patrimoine-canadien/services/langues-officielles-bilinguisme.html",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Le Canada encourage les jeunes à participer à leur communauté",
      description: "Des programmes et des organismes invitent les jeunes à faire du bénévolat et à développer leurs compétences.",
      content: "Participer à la communauté aide les élèves à rencontrer des gens, comprendre leur ville et prendre confiance dans leurs idées.",
      url: "https://www.canada.ca/fr/services/jeunesse.html",
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    }
  ],
  technology: [
    {
      title: "La technologie aide les élèves canadiens à apprendre le français",
      description: "Des outils numériques permettent de lire, écouter et parler en français plus souvent.",
      content: "Les vidéos courtes, les applications et les résumés adaptés donnent aux élèves plus de façons de pratiquer en classe et à la maison.",
      url: "https://ici.radio-canada.ca/jeunesse",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Des innovations canadiennes rendent l'école plus interactive",
      description: "Des enseignants utilisent des outils modernes pour rendre les cours plus visuels, participatifs et faciles à suivre.",
      content: "Ces innovations peuvent aider les élèves à travailler ensemble, poser des questions et comprendre des idées complexes plus rapidement.",
      url: "https://ised-isde.canada.ca/site/isde/fr",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "La science et la technologie donnent de nouveaux sujets de discussion",
      description: "Les nouvelles scientifiques aident les élèves à apprendre du vocabulaire sur l'innovation, la sécurité et l'avenir.",
      content: "Les sujets technologiques sont utiles en français parce qu'ils parlent de problèmes réels, de solutions et de changements dans la vie quotidienne.",
      url: "https://ici.radio-canada.ca/science",
      image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    }
  ],
  sports: [
    {
      title: "Le sport canadien rassemble les élèves et les communautés",
      description: "Les équipes, les matchs et les athlètes donnent aux jeunes des sujets faciles pour parler en français.",
      content: "Le sport aide les élèves à utiliser des mots sur l'effort, le respect, la victoire, la défaite et le travail d'équipe.",
      url: "https://ici.radio-canada.ca/sports",
      image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Des athlètes canadiens inspirent les jeunes",
      description: "Des sportifs canadiens montrent l'importance de l'entraînement, de la discipline et de la confiance.",
      content: "Leurs histoires donnent aux élèves des exemples concrets pour parler d'objectifs personnels et de persévérance.",
      url: "https://www.canada.ca/fr/patrimoine-canadien/services/sport-canada.html",
      image: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Le hockey reste un sujet important pour parler du Canada",
      description: "Le hockey donne aux élèves un vocabulaire familier sur les joueurs, les équipes, les matchs et les résultats.",
      content: "Comme ce sport est très connu au Canada, il peut rendre la discussion en français plus naturelle pour plusieurs classes.",
      url: "https://ici.radio-canada.ca/sports/hockey",
      image: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    }
  ],
  entertainment: [
    {
      title: "La culture canadienne donne de bons sujets en classe de français",
      description: "La musique, les films, les festivals et les artistes aident les élèves à parler de goûts et d'identité.",
      content: "Les sujets culturels sont utiles parce qu'ils permettent aux élèves de donner leur opinion avec un vocabulaire simple et personnel.",
      url: "https://ici.radio-canada.ca/arts",
      image: "https://images.unsplash.com/photo-1508973379184-7517410fb0bc?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Les festivals aident les jeunes à découvrir la culture francophone",
      description: "Des festivals au Canada permettent d'entendre le français dans la musique, les spectacles et les activités publiques.",
      content: "Ces événements donnent aux élèves un exemple vivant de la langue française en dehors de la salle de classe.",
      url: "https://www.canada.ca/fr/patrimoine-canadien/services/financement/festivals-locaux.html",
      image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
    },
    {
      title: "Les artistes canadiens racontent des histoires en français",
      description: "Des artistes utilisent des chansons, des films et des balados pour partager des histoires canadiennes.",
      content: "Ces œuvres aident les élèves à voir comment le français peut exprimer des émotions, des idées et des expériences modernes.",
      url: "https://ici.radio-canada.ca/ohdio",
      image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
      source: { name: "News of the Day practice article" }
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
    categoryCache = {};
    loadNews(activeCategory);
    window.setInterval(() => {
      updateTodayLabel();
      categoryCache = {};
      loadNews(activeCategory);
    }, 24 * 60 * 60 * 1000);
  }, nextMorning.getTime() - now.getTime());
}

async function loadNews(category) {
  const loadId = ++latestLoadId;
  setLoading(true);
  showMessage("");
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
    showMessage(error.message || "The news could not load right now. Please check the API key or try again later.", "error");
    renderArticles(getLocalFallbackArticles(category), category);
  } finally {
    if (loadId === latestLoadId) {
      setLoading(false);
    }
  }
}

async function fetchArticlesForCategory(category) {
  const dayKey = new Date().toISOString().slice(0, 10);

  try {
    const response = await fetch(`${NEWS_API_URL}?category=${encodeURIComponent(category)}&day=${dayKey}`);
    if (!response.ok) {
      throw new Error(`News function error: ${response.status}`);
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    if (articles.length > 0) {
      if (data.fallback) {
        showMessage("Live news is limited right now. Practice articles are shown so the class can continue.", "notice");
      }
      return articles;
    }
  } catch (error) {
    console.warn(error);
  }

  try {
    const directArticles = await fetchDirectGNews(category);
    if (directArticles.length > 0) {
      return directArticles;
    }
  } catch (error) {
    console.warn(error);
  }

  showMessage("Live news could not load. Practice articles are shown so the class can continue.", "notice");
  return getLocalFallbackArticles(category);
}

async function fetchDirectGNews(category) {
  const query = categorySearchQueries[category]?.[0] || categorySearchQueries.world[0];
  const params = new URLSearchParams({
    q: query,
    lang: "fr",
    country: "ca",
    max: String(MAX_ARTICLES),
    apikey: API_KEY
  });

  const response = await fetch(`https://gnews.io/api/v4/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Direct GNews error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.articles) ? data.articles : [];
}

function renderArticles(articles, category) {
  const positiveArticles = articles.filter(isStudentFriendlyArticle);
  const sourceArticles = positiveArticles.length >= 3 ? positiveArticles : articles;
  articleStore = {};
  let cardArticles = sourceArticles
    .filter((article) => article.title)
    .slice(0, MAX_ARTICLES);

  if (cardArticles.length < 3) {
    showMessage("Only a few live articles loaded. Practice articles are shown so every category stays usable.", "notice");
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
  const hasNegativeWord = negativeWords.some((word) => text.includes(normalizeText(word)));
  const hasPositiveStudentWord = positiveStudentWords.some((word) => text.includes(normalizeText(word)));
  return !hasNegativeWord && hasPositiveStudentWord;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createArticleCard(article, category, index) {
  const help = learningHelp[category] || learningHelp.world;
  const articleId = `${category}-${index}`;
  const sourceName = article.source?.name || "Unknown source";
  const publishedAt = article.publishedAt ? formatDate(article.publishedAt) : "Unknown date";
  const description = cleanSentence(article.description || "Choose a level to read this news story in clear French.");
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
          <span>Source: ${escapeHtml(sourceName)}</span>
          <span>Date: ${publishedAt}</span>
          <span>${categoryLabels[category]}</span>
        </div>
        <p class="category-note">Student-friendly ${escapeHtml(categoryLabels[category])} topic</p>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="description">${escapeHtml(description)}</p>
        <section class="summary-box" aria-labelledby="${summaryId}-title">
          <h4 id="${summaryId}-title">Read this article in French</h4>
          <p class="level-hint">Choose a level before opening the full rewritten article.</p>
          <div class="difficulty-buttons" role="group" aria-label="Summary difficulty">
            ${Object.entries(levelDetails).map(([level, detail]) => `
              <button type="button" class="difficulty-button" data-summary-level="${level}" title="${escapeAttribute(detail.description)}">
                <strong>${detail.label}</strong>
                <span>${detail.tag}</span>
              </button>
            `).join("")}
          </div>
          <p class="summary-text" id="${summaryId}" data-summary-text aria-live="polite">Pick Level 1, Level 2, or Level 3. The next page will explain the article in French with the right amount of detail.</p>
          <template data-summary-template="beginner">${escapeHtml(summaries.beginner)}</template>
          <template data-summary-template="intermediate">${escapeHtml(summaries.intermediate)}</template>
          <template data-summary-template="advanced">${escapeHtml(summaries.advanced)}</template>
        </section>
        <section class="learning-box" aria-label="French learning help">
          <h4>French learning help</h4>
          <ul class="vocab-list">
            ${help.vocab.map((word) => `<li>${escapeHtml(word)}</li>`).join("")}
          </ul>
          <p class="simple-sentence"><strong>Simple sentence:</strong> ${escapeHtml(help.sentence)}</p>
          <p class="question"><strong>Quick question:</strong> ${escapeHtml(help.question)}</p>
        </section>
        <section class="video-box" data-video-box data-video-query="${escapeAttribute(videoQuery)}" aria-label="Short French video">
          <h4>Short French video</h4>
          <p data-video-status>Looking for a short French video connected to this article...</p>
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

  return `${titleWords || categoryLabels[category]} français Canada courte vidéo`;
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
    const detail = levelDetails[level] || levelDetails.beginner;

    card.querySelectorAll("[data-summary-level]").forEach((button) => {
      const isActive = button === difficultyButton;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    card.dataset.selectedLevel = level;
    summaryText.textContent = `${detail.label} selected: ${detail.description} Open the improved French explanation on the next page.`;
    generateButton.classList.remove("disabled");
    generateButton.removeAttribute("aria-disabled");
    generateButton.textContent = `Open ${detail.label} article`;
    return;
  }

  if (summaryButton?.classList.contains("disabled")) {
    event.preventDefault();
    const card = summaryButton.closest("[data-card]");
    const summaryText = card.querySelector("[data-summary-text]");
    summaryText.textContent = "Please choose Level 1, Level 2, or Level 3 first.";
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
          url: article.url,
          publishedAt: article.publishedAt
        }
      }));

      const summaryUrl = `summary.html?id=${encodeURIComponent(summaryPageId)}`;
      window.location.href = summaryUrl;
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
  const mainText = description || content || title;

  return {
    beginner: `Level 1. ${title}. ${makeShortSummary(mainText, 16)}.`,
    intermediate: `Level 2. ${title}. ${makeShortSummary(mainText, 26)} The full page adds context and important details.`,
    advanced: `Level 3. ${title}. ${makeShortSummary(mainText, 34)} The full page gives a deeper explanation, importance, and possible consequences.`
  };
}

function makeShortSummary(text, maxWords) {
  const words = cleanSentence(text).split(" ").filter(Boolean);
  const selectedWords = words.slice(0, maxWords).join(" ");
  return selectedWords || "L'article présente le fait principal avec les détails disponibles";
}

function cleanSentence(value) {
  return String(value || "")
    .replace(/\[\+\d+\s+chars?\]/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function setLoading(isLoading) {
  loading.hidden = !isLoading;
}

function showMessage(message, type = "error") {
  errorMessage.hidden = !message;
  errorMessage.textContent = message;
  errorMessage.classList.toggle("notice-message", type === "notice");
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
