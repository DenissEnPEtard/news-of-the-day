const ENV = typeof process !== "undefined" && process.env ? process.env : {};
const GNEWS_KEY = ENV.GNEWS_API_KEY || "bca407c94fadbba9aff3dff0b58870e4";
const SEARCH_API_URL = "https://gnews.io/api/v4/search";
const HEADLINES_API_URL = "https://gnews.io/api/v4/top-headlines";
const MAX_ARTICLES = 9;

const categoryConfig = {
  world: {
    label: "Monde",
    apiCategory: "world",
    queries: ["international monde Canada", "cooperation internationale Canada", "francophonie monde Canada"]
  },
  nation: {
    label: "Canada",
    apiCategory: "general",
    queries: ["Canada communaute innovation", "Canada eleves education", "Canada environnement projet", "Canada culture positive"]
  },
  technology: {
    label: "Technologie",
    apiCategory: "technology",
    queries: ["technologie Canada innovation", "science Canada decouverte", "intelligence artificielle Canada"]
  },
  sports: {
    label: "Sport",
    apiCategory: "sports",
    queries: ["sport Canada equipe", "hockey Canada athlete", "tournoi Canada victoire"]
  },
  entertainment: {
    label: "Culture",
    apiCategory: "entertainment",
    queries: ["culture Canada festival", "musique Canada artiste", "film Canada cinema"]
  }
};

const negativeWords = [
  "accident",
  "attaque",
  "crise",
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

const fallbackArticles = {
  world: [
    makeFallback("Des jeunes Canadiens discutent de coopération internationale", "Des élèves au Canada parlent de projets positifs qui relient leur communauté à d'autres pays.", "Des classes canadiennes peuvent utiliser l'actualité pour comparer les cultures, parler de coopération et mieux comprendre le rôle du Canada dans le monde francophone.", "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80"),
    makeFallback("La francophonie aide les élèves à mieux comprendre le monde", "La langue française permet aux jeunes Canadiens de découvrir plusieurs pays, accents et cultures.", "La francophonie donne aux élèves un moyen concret de parler de voyages, de musique, de traditions et de communication internationale.", "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des projets scolaires relient le Canada à d'autres pays", "Des écoles utilisent des échanges et des projets en ligne pour connecter les élèves canadiens à des jeunes ailleurs dans le monde.", "Ces projets aident les élèves à comparer leur vie quotidienne, à poser des questions et à utiliser le français dans une situation réelle.", "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80")
  ],
  nation: [
    makeFallback("Des communautés canadiennes lancent des projets positifs", "Plusieurs villes et groupes locaux créent des activités pour aider les jeunes, soutenir les familles et protéger l'environnement.", "Ces projets montrent comment des citoyens peuvent améliorer leur quartier avec des idées simples, du bénévolat et une bonne organisation.", "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des élèves canadiens utilisent le français dans la vie quotidienne", "Des élèves anglophones pratiquent le français avec des nouvelles simples, des vidéos courtes et des questions de compréhension.", "Cette méthode rend la lecture plus utile, parce que les élèves parlent de sujets actuels qui touchent leur pays et leur génération.", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Le Canada encourage les jeunes à participer à leur communauté", "Des programmes et des organismes invitent les jeunes à faire du bénévolat et à développer leurs compétences.", "Participer à la communauté aide les élèves à rencontrer des gens, comprendre leur ville et prendre confiance dans leurs idées.", "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=80")
  ],
  technology: [
    makeFallback("La technologie aide les élèves canadiens à apprendre le français", "Des outils numériques permettent de lire, écouter et parler en français plus souvent.", "Les vidéos courtes, les applications et les résumés adaptés donnent aux élèves plus de façons de pratiquer en classe et à la maison.", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des innovations canadiennes rendent l'école plus interactive", "Des enseignants utilisent des outils modernes pour rendre les cours plus visuels, participatifs et faciles à suivre.", "Ces innovations peuvent aider les élèves à travailler ensemble, poser des questions et comprendre des idées complexes plus rapidement.", "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80"),
    makeFallback("La science et la technologie donnent de nouveaux sujets de discussion", "Les nouvelles scientifiques aident les élèves à apprendre du vocabulaire sur l'innovation, la sécurité et l'avenir.", "Les sujets technologiques sont utiles en français parce qu'ils parlent de problèmes réels, de solutions et de changements dans la vie quotidienne.", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80")
  ],
  sports: [
    makeFallback("Le sport canadien rassemble les élèves et les communautés", "Les équipes, les matchs et les athlètes donnent aux jeunes des sujets faciles pour parler en français.", "Le sport aide les élèves à utiliser des mots sur l'effort, le respect, la victoire, la défaite et le travail d'équipe.", "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des athlètes canadiens inspirent les jeunes", "Des sportifs canadiens montrent l'importance de l'entraînement, de la discipline et de la confiance.", "Leurs histoires donnent aux élèves des exemples concrets pour parler d'objectifs personnels et de persévérance.", "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Le hockey reste un sujet important pour parler du Canada", "Le hockey donne aux élèves un vocabulaire familier sur les joueurs, les équipes, les matchs et les résultats.", "Comme ce sport est très connu au Canada, il peut rendre la discussion en français plus naturelle pour plusieurs classes.", "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=900&q=80")
  ],
  entertainment: [
    makeFallback("La culture canadienne donne de bons sujets en classe de français", "La musique, les films, les festivals et les artistes aident les élèves à parler de goûts et d'identité.", "Les sujets culturels sont utiles parce qu'ils permettent aux élèves de donner leur opinion avec un vocabulaire simple et personnel.", "https://images.unsplash.com/photo-1508973379184-7517410fb0bc?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Les festivals aident les jeunes à découvrir la culture francophone", "Des festivals au Canada permettent d'entendre le français dans la musique, les spectacles et les activités publiques.", "Ces événements donnent aux élèves un exemple vivant de la langue française en dehors de la salle de classe.", "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Les artistes canadiens racontent des histoires en français", "Des artistes utilisent des chansons, des films et des balados pour partager des histoires canadiennes.", "Ces œuvres aident les élèves à voir comment le français peut exprimer des émotions, des idées et des expériences modernes.", "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80")
  ]
};

exports.handler = async (event) => {
  const category = event.queryStringParameters?.category || "world";

  try {
    const articles = await fetchLiveArticles(category);
    if (articles.length >= 3) {
      return jsonResponse(200, { articles, fallback: false });
    }
  } catch (error) {
    // GNews can hit a daily limit. The site should still remain usable for class.
  }

  return jsonResponse(200, {
    articles: getFallbackArticles(category),
    fallback: true
  });
};

async function fetchLiveArticles(category) {
  const config = categoryConfig[category] || categoryConfig.world;
  const urls = [
    ...config.queries.map(buildSearchUrl),
    buildHeadlinesUrl(config.apiCategory)
  ];
  const collected = [];

  for (const url of urls) {
    try {
      const articles = await requestGNews(url);
      collected.push(...articles);
    } catch (error) {
      // Try the next source. One failed query should not break the category.
    }

    if (dedupeArticles(collected).filter(isStudentFriendlyArticle).length >= MAX_ARTICLES) {
      break;
    }
  }

  return dedupeArticles(collected)
    .filter(isStudentFriendlyArticle)
    .sort(sortNewestFirst)
    .slice(0, MAX_ARTICLES);
}

async function requestGNews(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GNews error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.articles) ? data.articles : [];
}

function buildSearchUrl(query) {
  const params = new URLSearchParams({
    q: query,
    lang: "fr",
    country: "ca",
    max: String(MAX_ARTICLES),
    apikey: GNEWS_KEY
  });

  return `${SEARCH_API_URL}?${params.toString()}`;
}

function buildHeadlinesUrl(apiCategory) {
  const params = new URLSearchParams({
    category: apiCategory,
    lang: "fr",
    country: "ca",
    max: String(MAX_ARTICLES),
    apikey: GNEWS_KEY
  });

  return `${HEADLINES_API_URL}?${params.toString()}`;
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = normalizeText(article.url || article.title || "");
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isStudentFriendlyArticle(article) {
  const text = normalizeText(`${article.title || ""} ${article.description || ""}`);
  const hasNegativeWord = negativeWords.some((word) => text.includes(normalizeText(word)));
  const hasPositiveStudentWord = positiveStudentWords.some((word) => text.includes(normalizeText(word)));
  return !hasNegativeWord && hasPositiveStudentWord;
}

function sortNewestFirst(a, b) {
  return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getFallbackArticles(category) {
  const articles = fallbackArticles[category] || fallbackArticles.world;
  const today = new Date().toISOString();
  return articles.map((article) => ({
    ...article,
    publishedAt: today
  }));
}

function makeFallback(title, description, content, image) {
  return {
    title,
    description,
    content,
    url: "https://ici.radio-canada.ca/info/en-continu",
    image,
    source: { name: "News of the Day practice article" }
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=1800"
    },
    body: JSON.stringify(body)
  };
}
