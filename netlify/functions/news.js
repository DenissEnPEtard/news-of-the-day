const GNEWS_KEY = process.env.GNEWS_API_KEY || "bca407c94fadbba9aff3dff0b58870e4";
const SEARCH_API_URL = "https://gnews.io/api/v4/search";
const HEADLINES_API_URL = "https://gnews.io/api/v4/top-headlines";
const MAX_ARTICLES = 9;

const categoryConfig = {
  world: {
    label: "Monde",
    apiCategory: "world",
    queries: ["international monde Canada", "cooperation internationale Canada", "decouverte monde francais"]
  },
  nation: {
    label: "Canada",
    apiCategory: "general",
    queries: ["Canada communaute innovation", "Canada eleves education", "Canada environnement projet"]
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

const fallbackArticles = {
  world: [
    makeFallback("Des jeunes Canadiens discutent de cooperation internationale", "Une carte de pratique sur la cooperation, les cultures et les liens entre le Canada et le monde.", "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80"),
    makeFallback("La francophonie aide les eleves a mieux comprendre le monde", "Un sujet positif pour parler de langues, de pays francophones et de communication.", "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des projets scolaires relient le Canada a d'autres pays", "Un sujet clair pour parler d'education, de collaboration et de citoyennete mondiale.", "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80")
  ],
  nation: [
    makeFallback("Des communautes canadiennes lancent des projets positifs", "Une carte de pratique sur les villes, les citoyens et les projets locaux au Canada.", "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des eleves canadiens utilisent le francais dans la vie quotidienne", "Un sujet accessible pour parler d'ecole, de bilinguisme et de confiance en classe.", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Le Canada encourage les jeunes a participer a leur communaute", "Un sujet positif pour parler de benevolat, de citoyennete et de projets locaux.", "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=80")
  ],
  technology: [
    makeFallback("La technologie aide les eleves canadiens a apprendre le francais", "Un sujet clair sur les outils numeriques, les videos et l'apprentissage des langues.", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des innovations canadiennes rendent l'ecole plus interactive", "Une carte de pratique sur l'innovation, la classe et les nouvelles idees.", "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80"),
    makeFallback("La science et la technologie donnent de nouveaux sujets de discussion", "Un sujet pour apprendre du vocabulaire sur la science, les appareils et la securite.", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80")
  ],
  sports: [
    makeFallback("Le sport canadien rassemble les eleves et les communautes", "Une carte de pratique sur les equipes, les matchs et l'esprit sportif.", "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Des athletes canadiens inspirent les jeunes", "Un sujet positif pour parler d'objectifs, d'entrainement et de perseverance.", "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Le hockey reste un sujet important pour parler du Canada", "Un sujet familier pour pratiquer le vocabulaire du sport en francais.", "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=900&q=80")
  ],
  entertainment: [
    makeFallback("La culture canadienne donne de bons sujets en classe de francais", "Une carte de pratique sur la musique, les films, les festivals et les artistes.", "https://images.unsplash.com/photo-1508973379184-7517410fb0bc?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Les festivals aident les jeunes a decouvrir la culture francophone", "Un sujet positif pour parler d'evenements, de villes et de traditions.", "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80"),
    makeFallback("Les artistes canadiens racontent des histoires en francais", "Un sujet pour parler de chansons, de films et d'identite culturelle.", "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80")
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

  for (const query of config.queries) {
    const articles = await requestGNews(buildSearchUrl(query));
    if (articles.length > 0) {
      return articles;
    }
  }

  return requestGNews(buildHeadlinesUrl(config.apiCategory));
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

function getFallbackArticles(category) {
  const articles = fallbackArticles[category] || fallbackArticles.world;
  const today = new Date().toISOString();
  return articles.map((article) => ({
    ...article,
    publishedAt: today
  }));
}

function makeFallback(title, description, image) {
  return {
    title,
    description,
    content: description,
    url: "https://ici.radio-canada.ca/info/en-continu",
    image,
    source: { name: "Practice news backup" }
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=900"
    },
    body: JSON.stringify(body)
  };
}
