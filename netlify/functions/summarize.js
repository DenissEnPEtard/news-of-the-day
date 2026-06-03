const ENV = typeof process !== "undefined" && process.env ? process.env : {};
const OPENAI_MODEL = ENV.OPENAI_MODEL || "gpt-5.5";
const OPENAI_TIMEOUT_MS = Number(ENV.OPENAI_TIMEOUT_MS || 8500);

const LEVEL_CONFIG = {
  beginner: {
    label: "Level 1",
    cefr: "A1/A2",
    minWords: 40,
    maxWords: 80,
    minParagraphs: 1,
    maxParagraphs: 2,
    temperature: 0.45,
    maxOutputTokens: 900,
    style: "Français simple, phrases courtes, vocabulaire courant, explications faciles."
  },
  intermediate: {
    label: "Level 2",
    cefr: "B1",
    minWords: 80,
    maxWords: 140,
    minParagraphs: 2,
    maxParagraphs: 3,
    temperature: 0.5,
    maxOutputTokens: 1200,
    style: "Français intermédiaire, plus de détails, connecteurs simples, contexte expliqué clairement."
  },
  advanced: {
    label: "Level 3",
    cefr: "B2/C1",
    minWords: 150,
    maxWords: 250,
    minParagraphs: 3,
    maxParagraphs: 5,
    temperature: 0.58,
    maxOutputTokens: 1800,
    style: "Français riche et naturel, analyse du sujet, contexte, importance, conséquences possibles et vocabulaire précis."
  }
};

const GENERIC_PHRASES = [
  "cet article parle de",
  "ce texte parle de",
  "ce texte explique",
  "cet article explique",
  "pour comprendre",
  "il est important de comprendre",
  "dans cet article",
  "l'article présente simplement",
  "cette nouvelle est intéressante parce qu'elle est intéressante"
];

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "because", "been", "but", "can", "for", "from", "has", "have", "into", "more", "not", "that", "the", "their", "this", "with",
  "ainsi", "alors", "aussi", "avec", "avoir", "cette", "comme", "dans", "des", "elle", "entre", "être", "fait", "font", "leur", "leurs", "mais", "nous", "plus", "pour", "quand", "quoi", "sans", "sont", "tout", "très", "une", "vers"
]);

const ENTITY_REJECT_WORDS = new Set([
  "Article", "Cette", "Ces", "Dans", "Des", "La", "Le", "Les", "Level", "Plusieurs", "Selon", "Une"
]);

const TRAILING_WORDS = new Set(["à", "avec", "dans", "de", "des", "du", "en", "et", "la", "le", "les", "ou", "pour", "un", "une"]);

const KNOWN_PLACES = [
  "Canada", "Ontario", "Québec", "Quebec", "Alberta", "Colombie-Britannique", "Manitoba", "Saskatchewan", "Nouvelle-Écosse", "Nouveau-Brunswick",
  "Toronto", "Montréal", "Montreal", "Vancouver", "Ottawa", "Calgary", "Edmonton", "Winnipeg", "Halifax", "Regina", "Victoria"
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const level = normalizeLevel(body.level);
    const config = LEVEL_CONFIG[level];
    const article = normalizeArticle(body);
    const insights = extractArticleInsights(article);

    if (!ENV.OPENAI_API_KEY) {
      const summary = createLocalPedagogicalText(article, level, insights);
      return jsonResponse(200, {
        summary,
        generatedBy: "local-quality-fallback",
        quality: assessSummaryQuality(summary, article, level, insights)
      });
    }

    try {
      let summary = await requestModel(buildPrompt(article, level, insights), config);
      let quality = assessSummaryQuality(summary, article, level, insights);

      if (!quality.pass) {
        summary = await requestModel(buildRepairPrompt(article, level, insights, summary, quality.issues), {
          ...config,
          temperature: Math.max(0.35, config.temperature - 0.1)
        });
        quality = assessSummaryQuality(summary, article, level, insights);
      }

      if (!quality.pass) {
        summary = createLocalPedagogicalText(article, level, insights);
        quality = assessSummaryQuality(summary, article, level, insights);
        return jsonResponse(200, { summary, generatedBy: "local-quality-fallback", quality });
      }

      return jsonResponse(200, {
        summary: cleanModelOutput(summary),
        generatedBy: "openai",
        quality
      });
    } catch (error) {
      const summary = createLocalPedagogicalText(article, level, insights);
      return jsonResponse(200, {
        summary,
        generatedBy: "local-quality-fallback",
        warning: error.message || "AI generation failed.",
        quality: assessSummaryQuality(summary, article, level, insights)
      });
    }
  } catch (error) {
    return jsonResponse(500, { error: error.message || "Summary generation failed." });
  }
};

async function requestModel(input, config) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${ENV.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildModelRequestBody(input, config))
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `AI request failed with status ${response.status}.`);
    }

    const text = extractOutputText(data);
    if (!text) {
      throw new Error("The AI response was empty.");
    }

    return cleanModelOutput(text);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`GPT-5.5 did not answer within ${OPENAI_TIMEOUT_MS} ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildModelRequestBody(input, config) {
  const body = {
    model: OPENAI_MODEL,
    input,
    max_output_tokens: config.maxOutputTokens
  };

  if (OPENAI_MODEL.startsWith("gpt-5")) {
    body.reasoning = {
      effort: ENV.OPENAI_REASONING_EFFORT || "low"
    };
    return body;
  }

  body.temperature = config.temperature;
  return body;
}

function buildPrompt(article, level, insights) {
  const config = LEVEL_CONFIG[level];

  return [
    "PROMPT SYSTÈME",
    "Tu es un rédacteur pédagogique expert spécialisé dans l'explication de l'actualité pour des élèves canadiens apprenant le français.",
    "Ta mission n'est pas seulement de résumer l'article.",
    "Tu dois identifier les informations importantes, expliquer leur signification, fournir du contexte et expliquer pourquoi le sujet est important.",
    "Tu dois adapter précisément le niveau de langue demandé.",
    "Ne recopie jamais simplement l'article.",
    "Produis un texte naturel, détaillé, informatif et intéressant.",
    "Évite les répétitions.",
    "Utilise uniquement les informations présentes dans l'article et dans l'analyse fournie ci-dessous. N'invente aucun nom, chiffre, lieu ou événement.",
    "Le résultat doit donner l'impression qu'un enseignant a expliqué l'article à ses élèves.",
    "",
    "NIVEAU DEMANDÉ",
    `${config.label} (${config.cefr})`,
    `${config.minWords} à ${config.maxWords} mots.`,
    config.style,
    `Paragraphes attendus : ${config.minParagraphs} à ${config.maxParagraphs}.`,
    "",
    "STRUCTURE ATTENDUE",
    "1. Résumé du fait principal.",
    "2. Explication des détails importants.",
    "3. Pourquoi ce sujet compte pour les lecteurs. Pour le niveau 3, ajoute une analyse prudente des enjeux et des conséquences possibles.",
    "La structure doit rester naturelle : n'utilise pas de titres comme Résumé, Explication ou Importance.",
    "",
    "CONTRÔLE QUALITÉ À FAIRE AVANT DE RÉPONDRE",
    "- Respecter la longueur demandée.",
    "- Éviter les phrases répétitives et les débuts de phrases identiques.",
    "- Employer un vocabulaire plus riche au niveau 3.",
    "- Couvrir le sujet principal, les faits importants, les personnes ou groupes concernés, les lieux, les enjeux et les conséquences quand ces éléments existent dans l'article.",
    "- Supprimer toute phrase générique qui pourrait convenir à n'importe quel article.",
    "- Ne pas écrire de conseils de lecture, de discours oral, de liste de vocabulaire ou de questions.",
    "",
    "INTERDICTIONS",
    "Ne commence pas par Bonjour.",
    "N'utilise pas de markdown, de puces ou de titres.",
    "N'écris pas : cet article parle de, ce texte explique, pour comprendre, l'article présente.",
    "N'ajoute pas d'informations externes.",
    "",
    "ANALYSE EXTRAITE DE L'ARTICLE",
    `Sujet principal : ${insights.mainSubject}`,
    `Faits importants : ${formatList(insights.facts)}`,
    `Personnes ou groupes concernés : ${formatList(insights.people)}`,
    `Lieux concernés : ${formatList(insights.places)}`,
    `Enjeux : ${formatList(insights.stakes)}`,
    `Conséquences possibles à expliquer prudemment : ${formatList(insights.consequences)}`,
    `Mots clés à intégrer naturellement : ${formatList(insights.keyTerms)}`,
    "",
    "ARTICLE ORIGINAL",
    `Catégorie : ${article.category}`,
    `Titre : ${article.title}`,
    `Description : ${article.description}`,
    `Contenu : ${article.content}`,
    `Source : ${article.source}`,
    `Date : ${article.publishedAt}`,
    "",
    `Réponds uniquement avec le texte final en français. Commence par "${config.label}."`
  ].join("\n");
}

function buildRepairPrompt(article, level, insights, previousSummary, issues) {
  const config = LEVEL_CONFIG[level];

  return [
    buildPrompt(article, level, insights),
    "",
    "RÉVISION OBLIGATOIRE",
    "La version précédente ne respecte pas les critères suivants :",
    formatList(issues),
    "",
    "Version précédente à améliorer :",
    previousSummary,
    "",
    `Réécris entièrement le texte. Il doit faire ${config.minWords} à ${config.maxWords} mots, être naturel, non répétitif et plus utile pédagogiquement.`
  ].join("\n");
}

function normalizeArticle(body) {
  return {
    category: cleanText(body.category || "Actualité"),
    title: cleanText(body.title || "Nouvelle du jour"),
    description: cleanText(body.description || ""),
    content: cleanText(body.content || ""),
    source: cleanText(body.source || "source originale"),
    publishedAt: cleanText(body.publishedAt || "")
  };
}

function normalizeLevel(level) {
  return LEVEL_CONFIG[level] ? level : "beginner";
}

function extractArticleInsights(article) {
  const combined = cleanText(`${article.title}. ${article.description}. ${article.content}`);
  const facts = uniqueItems([
    article.description,
    ...splitSentences(article.content),
    article.title
  ].map(removeGNewsTruncation).filter(Boolean)).slice(0, 6);
  const keyTerms = extractKeyTerms(combined, 10);
  const people = extractEntities(combined);
  const places = extractPlaces(combined);
  const stakes = inferStakes(article, keyTerms);
  const consequences = inferConsequences(article, stakes);

  return {
    mainSubject: article.title || keyTerms.slice(0, 4).join(" "),
    facts: facts.length ? facts : [article.title],
    people,
    places,
    stakes,
    consequences,
    keyTerms
  };
}

function inferStakes(article, keyTerms) {
  const category = normalizeText(article.category);
  const terms = keyTerms.slice(0, 3).join(", ");
  const stakes = [];

  if (category.includes("technologie")) {
    stakes.push("l'innovation, l'accès aux outils numériques et leurs effets concrets");
  } else if (category.includes("sport")) {
    stakes.push("la participation, l'effort, l'esprit d'équipe et l'inspiration pour les jeunes");
  } else if (category.includes("culture")) {
    stakes.push("l'accès à la culture, l'identité et la place du français au Canada");
  } else if (category.includes("canada")) {
    stakes.push("la vie communautaire, la participation citoyenne et les effets locaux");
  } else {
    stakes.push("la coopération, la compréhension du monde et le lien avec le Canada");
  }

  if (terms) {
    stakes.push(`les éléments clés du sujet : ${terms}`);
  }

  return stakes;
}

function inferConsequences(article, stakes) {
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

  return [stakes[0] ? `le sujet peut avoir un effet sur ${stakes[0]}` : "le sujet peut aider les lecteurs à mieux comprendre l'actualité"];
}

function createLocalPedagogicalText(article, level, insights = extractArticleInsights(article)) {
  const config = LEVEL_CONFIG[level];
  const mainFact = sentenceFrom(insights.facts[0] || article.description || article.title, 28);
  const detailFact = sentenceFrom(insights.facts[1] || article.content || article.description || article.title, 34);
  const subject = sentenceFrom(insights.mainSubject || article.title, 18);
  const source = formatSource(article.source);
  const placeText = insights.places.length ? `Le lieu principal est ${joinFrenchList(insights.places.slice(0, 2))}.` : "";
  const peopleText = insights.people.length ? `Les personnes ou groupes concernés sont ${joinFrenchList(insights.people.slice(0, 3))}.` : "";
  const stake = sentenceFrom(insights.stakes[0] || "l'enjeu principal est lié au sujet de l'article", 32);
  const consequence = sentenceFrom(insights.consequences[0] || "cette situation peut avoir des effets concrets pour les personnes concernées", 34);

  if (level === "beginner") {
    return fitToRange([
      `${config.label}. ${subject}`,
      mainFact,
      detailFact,
      `${placeText || peopleText || `La source est ${source}.`}`,
      `Ce sujet est important parce qu'il montre une situation réelle et actuelle.`
    ].filter(Boolean).join(" "), config);
  }

  if (level === "intermediate") {
    return fitToRange([
      `${config.label}. ${subject} Selon ${source}, ${lowerFirst(mainFact)}`,
      [detailFact, peopleText, placeText].filter(Boolean).join(" "),
      `Le contexte est important : ${lowerFirst(stake)} Ce sujet compte parce qu'il aide les lecteurs à voir les effets concrets de cette nouvelle.`
    ].filter(Boolean).join("\n\n"), config);
  }

  return fitToRange([
    `${config.label}. ${subject} Selon ${source}, ${lowerFirst(mainFact)} ${detailFact}`,
    [peopleText, placeText].filter(Boolean).join(" "),
    `L'enjeu principal est clair : ${lowerFirst(stake)} Cette dimension donne plus de profondeur à la nouvelle, car elle relie le fait principal aux personnes ou groupes touchés par la situation.`,
    `Le sujet est important parce qu'il ne se limite pas à une information isolée. Il montre une évolution, une décision ou une initiative qui peut influencer la manière dont les lecteurs comprennent leur communauté, leur pays ou le monde autour d'eux. Une conséquence possible est que ${lowerFirst(consequence)} Cette conclusion reste prudente, car elle s'appuie seulement sur les informations disponibles dans l'article.`
  ].filter(Boolean).join("\n\n"), config);
}

function fitToRange(text, config) {
  let clean = cleanModelOutput(text);
  const words = countWords(clean);

  if (words < config.minWords) {
    clean = `${clean}\n\nCette information mérite donc une lecture attentive, car elle relie un fait précis à un contexte plus large. Elle aide les élèves à comprendre non seulement ce qui se passe, mais aussi pourquoi ce fait peut compter pour les personnes concernées.`;
  }

  if (countWords(clean) > config.maxWords) {
    clean = trimToWordLimit(clean, config.maxWords);
  }

  return cleanModelOutput(clean);
}

function assessSummaryQuality(summary, article, level, insights = extractArticleInsights(article)) {
  const config = LEVEL_CONFIG[level];
  const cleaned = cleanModelOutput(summary);
  const wordCount = countWords(cleaned);
  const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
  const sentences = splitSentences(cleaned);
  const normalizedSentences = sentences.map(normalizeText).filter(Boolean);
  const uniqueSentences = new Set(normalizedSentences);
  const tokens = getWords(cleaned).map(normalizeText).filter((word) => word.length > 3);
  const uniqueTokens = new Set(tokens);
  const diversity = tokens.length ? uniqueTokens.size / tokens.length : 0;
  const repeatedStarts = countRepeatedSentenceStarts(sentences);
  const keyCoverage = countCoveredTerms(cleaned, insights.keyTerms.slice(0, 8));
  const genericMatches = GENERIC_PHRASES.filter((phrase) => normalizeText(cleaned).includes(normalizeText(phrase)));
  const issues = [];

  if (wordCount < config.minWords) {
    issues.push(`Texte trop court : ${wordCount} mots, minimum ${config.minWords}.`);
  }
  if (wordCount > config.maxWords + 15) {
    issues.push(`Texte trop long : ${wordCount} mots, maximum ${config.maxWords}.`);
  }
  if (paragraphs.length < config.minParagraphs) {
    issues.push(`Pas assez de paragraphes : ${paragraphs.length}, minimum ${config.minParagraphs}.`);
  }
  if (paragraphs.length > config.maxParagraphs + 1) {
    issues.push(`Trop de paragraphes : ${paragraphs.length}, maximum ${config.maxParagraphs}.`);
  }
  if (uniqueSentences.size < normalizedSentences.length) {
    issues.push("Une ou plusieurs phrases sont répétées presque à l'identique.");
  }
  if (repeatedStarts > 1) {
    issues.push("Trop de phrases commencent de la même manière.");
  }
  if (diversity < (level === "advanced" ? 0.48 : 0.42)) {
    issues.push("Le vocabulaire manque de diversité.");
  }
  if (keyCoverage < Math.min(2, insights.keyTerms.length)) {
    issues.push("Le texte ne couvre pas assez de mots clés de l'article.");
  }
  if (genericMatches.length) {
    issues.push(`Formulations génériques interdites : ${genericMatches.join(", ")}.`);
  }
  if (!cleaned.startsWith(config.label)) {
    issues.push(`Le texte doit commencer par ${config.label}.`);
  }

  return {
    pass: issues.length === 0,
    issues,
    metrics: {
      wordCount,
      paragraphCount: paragraphs.length,
      vocabularyDiversity: Number(diversity.toFixed(2)),
      coveredKeyTerms: keyCoverage,
      repeatedStarts
    }
  };
}

function extractOutputText(data) {
  if (data.output_text) {
    return data.output_text.trim();
  }

  const textParts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.text) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter((sentence) => sentence.length > 3);
}

function extractKeyTerms(text, limit) {
  const counts = new Map();
  for (const word of getWords(text)) {
    const normalized = normalizeText(word);
    if (normalized.length < 4 || STOP_WORDS.has(normalized)) {
      continue;
    }
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
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
  const normalizedText = normalizeText(text);
  return KNOWN_PLACES.filter((place) => normalizedText.includes(normalizeText(place))).slice(0, 4);
}

function countCoveredTerms(text, terms) {
  const normalizedText = normalizeText(text);
  return terms.filter((term) => normalizedText.includes(normalizeText(term))).length;
}

function countRepeatedSentenceStarts(sentences) {
  const starts = new Map();
  sentences.forEach((sentence) => {
    const start = normalizeText(getWords(sentence).slice(0, 3).join(" "));
    if (start) {
      starts.set(start, (starts.get(start) || 0) + 1);
    }
  });

  return [...starts.values()].filter((count) => count > 1).length;
}

function cleanModelOutput(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph
      .replace(/^[#*\-\s]+/gm, "")
      .replace(/[ \t]+/g, " ")
      .trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
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

function formatList(items) {
  return items && items.length ? items.join("; ") : "non précisé dans l'article";
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

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

exports._internal = {
  LEVEL_CONFIG,
  buildPrompt,
  extractArticleInsights,
  assessSummaryQuality,
  createLocalPedagogicalText,
  normalizeArticle
};
