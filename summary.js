const params = new URLSearchParams(window.location.search);
const summaryId = params.get("id");

const LEVEL_CONFIG = {
  beginner: {
    label: "Level 1",
    minWords: 40,
    maxWords: 80,
    minParagraphs: 1,
    style: "simple"
  },
  intermediate: {
    label: "Level 2",
    minWords: 80,
    maxWords: 140,
    minParagraphs: 2,
    style: "intermediate"
  },
  advanced: {
    label: "Level 3",
    minWords: 150,
    maxWords: 250,
    minParagraphs: 3,
    style: "advanced"
  }
};

const ENTITY_REJECT_WORDS = new Set([
  "Article", "Cette", "Ces", "Dans", "Des", "La", "Le", "Les", "Level", "Plusieurs", "Selon", "Une"
]);

const TRAILING_WORDS = new Set(["à", "avec", "dans", "de", "des", "du", "en", "et", "la", "le", "les", "ou", "pour", "un", "une"]);

const levelLabel = document.getElementById("summary-level");
const sourceLabel = document.getElementById("summary-source");
const title = document.getElementById("summary-title");
const statusText = document.getElementById("summary-status");
const output = document.getElementById("summary-output");
const factsBox = document.getElementById("article-facts");

loadArticleSummary();

async function loadArticleSummary() {
  let saved = null;

  try {
    saved = summaryId ? localStorage.getItem(`summary:${summaryId}`) : null;
  } catch (error) {
    console.warn(error);
  }

  if (!saved) {
    statusText.textContent = "No article data was found. Please go back and choose a news story again.";
    output.textContent = "";
    return;
  }

  let payload;
  try {
    payload = JSON.parse(saved);
  } catch (error) {
    statusText.textContent = "The summary data could not be read. Please go back and choose the article again.";
    output.textContent = "";
    console.warn(error);
    return;
  }

  const article = normalizeArticle(payload.article || {});
  const level = LEVEL_CONFIG[payload.level] ? payload.level : "beginner";

  if (!article.title) {
    statusText.textContent = "The article data is incomplete. Please go back and choose the article again.";
    output.textContent = "";
    return;
  }

  levelLabel.textContent = LEVEL_CONFIG[level].label;
  sourceLabel.textContent = article.source || "Unknown source";
  title.textContent = article.title || "News summary";
  renderArticleFacts(article);

  try {
    const summary = await requestAiSummary(article, level);
    statusText.textContent = `${LEVEL_CONFIG[level].label} ready.`;
    renderParagraphs(summary);
  } catch (error) {
    console.warn(error);
    statusText.textContent = `${LEVEL_CONFIG[level].label} ready.`;
    renderParagraphs(createLocalArticleSummary(article, level));
  }
}

async function requestAiSummary(article, level) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 42000);

  try {
    const response = await fetch("/.netlify/functions/summarize", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        level,
        category: article.category,
        title: article.title,
        description: article.description,
        content: article.content,
        source: article.source,
        publishedAt: article.publishedAt,
        url: article.url
      })
    });

    if (!response.ok) {
      throw new Error(`Summary request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.summary) {
      throw new Error("Summary response was empty.");
    }

    return cleanOutput(data.summary);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function createLocalArticleSummary(article, level) {
  const config = LEVEL_CONFIG[level];
  const insights = extractArticleInsights(article);
  const mainFact = sentenceFrom(insights.facts[0] || article.description || article.title, 28);
  const detailFact = sentenceFrom(insights.facts[1] || article.content || article.description || article.title, 34);
  const subject = sentenceFrom(insights.mainSubject || article.title, 18);
  const source = formatSource(article.source);
  const dateText = formatPublishedDate(article.publishedAt);
  const peopleText = insights.people.length ? `Les personnes ou groupes concernés sont ${joinFrenchList(insights.people.slice(0, 3))}.` : "";
  const placeText = insights.places.length ? `Le lieu principal est ${joinFrenchList(insights.places.slice(0, 2))}.` : "";
  const stake = sentenceFrom(insights.stakes[0], 30);
  const consequence = sentenceFrom(insights.consequences[0], 34);

  if (level === "beginner") {
    return fitToRange([
      `${config.label}. ${subject}`,
      mainFact,
      detailFact,
      placeText || `La source est ${source}.`,
      `Cette nouvelle est importante parce qu'elle montre une situation réelle.`
    ].filter(Boolean).join(" "), config);
  }

  if (level === "intermediate") {
    return fitToRange([
      `${config.label}. ${subject} Selon ${source}, ${lowerFirst(mainFact)}`,
      [detailFact, peopleText, placeText].filter(Boolean).join(" "),
      `Le contexte est important : ${lowerFirst(stake)} La date indiquée pour cette information est ${dateText}.`
    ].filter(Boolean).join("\n\n"), config);
  }

  return fitToRange([
    `${config.label}. ${subject} Selon ${source}, ${lowerFirst(mainFact)} ${detailFact}`,
    [peopleText, placeText].filter(Boolean).join(" "),
    `L'enjeu principal est ${lowerFirst(stake)} Cette dimension donne plus de profondeur à la nouvelle, car elle relie le fait principal aux personnes ou aux groupes touchés par la situation.`,
    `Le sujet est important parce qu'il ne se limite pas à une information isolée. Il aide les lecteurs à comprendre une évolution, une initiative ou une décision dans son contexte. Une conséquence possible est que ${lowerFirst(consequence)} Cette conclusion reste prudente, car elle s'appuie seulement sur les informations disponibles dans l'article.`
  ].filter(Boolean).join("\n\n"), config);
}

function extractArticleInsights(article) {
  const text = cleanText(`${article.title}. ${article.description}. ${article.content}`);
  const facts = uniqueItems([
    article.description,
    ...splitSentences(article.content),
    article.title
  ].map(removeGNewsTruncation).filter(Boolean)).slice(0, 5);
  const people = extractEntities(text);
  const places = extractPlaces(text);
  const stakes = inferStakes(article);
  const consequences = inferConsequences(article);

  return {
    mainSubject: article.title,
    facts: facts.length ? facts : [article.title],
    people,
    places,
    stakes,
    consequences
  };
}

function inferStakes(article) {
  const category = normalizeText(article.category);

  if (category.includes("technologie")) {
    return ["l'innovation, l'accès aux outils numériques et leurs effets concrets"];
  }
  if (category.includes("sport")) {
    return ["la participation, l'effort, l'esprit d'équipe et l'inspiration pour les jeunes"];
  }
  if (category.includes("culture")) {
    return ["l'accès à la culture, l'identité et la place du français au Canada"];
  }
  if (category.includes("canada")) {
    return ["la vie communautaire, la participation citoyenne et les effets locaux"];
  }

  return ["la coopération, la compréhension du monde et le lien avec le Canada"];
}

function inferConsequences(article) {
  const category = normalizeText(article.category);

  if (category.includes("technologie")) {
    return ["ces changements peuvent modifier la manière d'apprendre, de communiquer ou de travailler"];
  }
  if (category.includes("sport")) {
    return ["le sujet peut influencer la motivation, la participation ou l'image du sport dans la communauté"];
  }
  if (category.includes("culture")) {
    return ["le sujet peut encourager la découverte culturelle et l'utilisation du français dans la vie quotidienne"];
  }
  if (category.includes("canada")) {
    return ["ces initiatives peuvent renforcer la confiance, l'entraide et l'engagement local"];
  }

  return ["le sujet peut aider les lecteurs à mieux comprendre l'actualité"];
}

function fitToRange(text, config) {
  let clean = cleanOutput(text);

  if (countWords(clean) < config.minWords) {
    clean = `${clean}\n\nCette information mérite une lecture attentive, car elle relie un fait précis à un contexte plus large. Elle aide les élèves à comprendre ce qui se passe et pourquoi cela peut compter pour les personnes concernées.`;
  }

  if (countWords(clean) > config.maxWords) {
    clean = trimToWordLimit(clean, config.maxWords);
  }

  return cleanOutput(clean);
}

function renderArticleFacts(article) {
  const facts = [
    ["Article title", article.title],
    ["Original source", article.source],
    ["Main details", article.description || article.content]
  ].filter(([, value]) => cleanText(value));

  factsBox.hidden = facts.length === 0;
  factsBox.innerHTML = facts.map(([label, value]) => `
    <p><strong>${label}:</strong> ${escapeHtml(cleanText(value))}</p>
  `).join("");
}

function renderParagraphs(text) {
  output.innerHTML = "";
  cleanOutput(text).split(/\n{2,}/).forEach((paragraph) => {
    const clean = paragraph.trim();
    if (!clean) {
      return;
    }

    const p = document.createElement("p");
    p.textContent = clean;
    output.appendChild(p);
  });
}

function normalizeArticle(article) {
  return {
    category: cleanText(article.category || "Actualité"),
    title: cleanText(article.title || ""),
    description: cleanText(article.description || ""),
    content: cleanText(article.content || ""),
    source: cleanText(article.source || "source originale"),
    url: cleanText(article.url || ""),
    publishedAt: cleanText(article.publishedAt || "")
  };
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter((sentence) => sentence.length > 3);
}

function extractEntities(text) {
  const matches = cleanText(text).match(/\b[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ][\p{L}'’-]*(?:\s+[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ][\p{L}'’-]*){0,3}/gu) || [];
  return uniqueItems(matches.map(cleanText))
    .filter((item) => {
      const words = item.split(/\s+/);
      return item.length > 2 && !ENTITY_REJECT_WORDS.has(item) && !(words.length === 1 && ENTITY_REJECT_WORDS.has(words[0]));
    })
    .slice(0, 5);
}

function extractPlaces(text) {
  const places = ["Canada", "Ontario", "Québec", "Quebec", "Toronto", "Montréal", "Montreal", "Vancouver", "Ottawa", "Calgary", "Edmonton", "Winnipeg", "Halifax"];
  const normalizedText = normalizeText(text);
  return places.filter((place) => normalizedText.includes(normalizeText(place))).slice(0, 4);
}

function removeGNewsTruncation(text) {
  return cleanText(text)
    .replace(/\[\+\d+\s+chars?\]/gi, "")
    .replace(/\s+\.\s*$/, ".")
    .trim();
}

function sentenceFrom(text, maxWords) {
  const sentence = trimToWordLimit(cleanText(text).replace(/[.!?]+$/g, ""), maxWords);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function trimToWordLimit(text, maxWords) {
  const allWords = getWords(text);
  if (allWords.length <= maxWords) {
    if (!TRAILING_WORDS.has(normalizeText(allWords[allWords.length - 1] || ""))) {
      return cleanText(text);
    }
    return allWords.slice(0, -1).join(" ");
  }

  const words = allWords.slice(0, maxWords);
  while (words.length > 1 && TRAILING_WORDS.has(normalizeText(words[words.length - 1]))) {
    words.pop();
  }

  return words.join(" ");
}

function cleanOutput(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function countWords(text) {
  return getWords(text).length;
}

function getWords(text) {
  return cleanText(text).match(/[\p{L}\p{N}'’-]+/gu) || [];
}

function uniqueItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeText(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function joinFrenchList(items) {
  if (items.length <= 1) {
    return items[0] || "";
  }
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function lowerFirst(text) {
  const clean = cleanText(text);
  return clean ? clean.charAt(0).toLowerCase() + clean.slice(1) : clean;
}

function formatSource(source) {
  const clean = cleanText(source || "la source originale");
  return normalizeText(clean).includes("practice article") ? "News of the Day" : clean;
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatPublishedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "inconnue";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
