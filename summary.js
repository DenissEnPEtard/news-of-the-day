const params = new URLSearchParams(window.location.search);
const summaryId = params.get("id");

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

  const article = payload.article;
  const level = payload.level || "beginner";

  if (!article) {
    statusText.textContent = "The article data is incomplete. Please go back and choose the article again.";
    output.textContent = "";
    return;
  }

  levelLabel.textContent = formatLevel(level);
  sourceLabel.textContent = article.source || "Unknown source";
  title.textContent = article.title || "News summary";
  renderArticleFacts(article);

  try {
    const summary = await requestAiSummary(article, level);
    statusText.textContent = `${formatLevel(level)} ready.`;
    renderParagraphs(summary);
  } catch (error) {
    console.warn(error);
    statusText.textContent = `${formatLevel(level)} ready.`;
    renderParagraphs(createLocalArticleSummary(article, level));
  }
}

async function requestAiSummary(article, level) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

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

    return data.summary;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function createLocalArticleSummary(article, level) {
  const titleText = cleanText(article.title || "cette nouvelle");
  const source = cleanText(article.source || "la source originale");
  const publishedDate = formatPublishedDate(article.publishedAt);
  const details = getArticleDetails(article, titleText);
  const mainDetail = details[0] || titleText;
  const extraDetails = details.slice(1).filter((detail) => normalizeText(detail) !== normalizeText(mainDetail));
  const secondDetail = extraDetails[0] || "";
  const thirdDetail = extraDetails[1] || "";

  if (level === "beginner") {
    const paragraphs = [
      `Level 1. ${sentenceFrom(titleText, 18)}`,
      sentenceFrom(mainDetail, 18)
    ];

    if (secondDetail) {
      paragraphs.push(sentenceFrom(secondDetail, 18));
    }

    paragraphs.push(
      `La source est ${source}. La date est ${publishedDate}.`,
      `L'idée principale est que ${lowerFirst(sentenceFrom(mainDetail, 16))}`
    );

    return paragraphs.join("\n\n");
  }

  if (level === "intermediate") {
    const paragraphs = [
      `Level 2. ${sentenceFrom(titleText, 22)}`,
      `Selon ${source}, ${lowerFirst(sentenceFrom(mainDetail, 44))}`
    ];

    if (secondDetail) {
      paragraphs.push(sentenceFrom(secondDetail, 48));
    }

    if (thirdDetail) {
      paragraphs.push(sentenceFrom(thirdDetail, 42));
    }

    paragraphs.push(`La date indiquée pour cette information est ${publishedDate}.`);

    return paragraphs.join("\n\n");
  }

  const paragraphs = [
    `Level 3. ${sentenceFrom(titleText, 24)}`,
    `Selon ${source}, ${lowerFirst(sentenceFrom(mainDetail, 62))}`
  ];

  if (secondDetail) {
    paragraphs.push(`L'article ajoute ce détail important : ${lowerFirst(sentenceFrom(secondDetail, 62))}`);
  }

  if (thirdDetail) {
    paragraphs.push(sentenceFrom(thirdDetail, 64));
  }

  paragraphs.push(
    `Cette information est datée du ${publishedDate} et vient de ${source}.`
  );

  return paragraphs.join("\n\n");
}

function getArticleDetails(article, fallbackTitle) {
  const candidates = [
    article.description,
    article.content
  ].map(cleanText)
    .filter(Boolean)
    .map(removeGNewsTruncation);

  const unique = [];
  candidates.forEach((candidate) => {
    const normalized = normalizeText(candidate);
    if (candidate && !unique.some((item) => normalizeText(item) === normalized)) {
      unique.push(candidate);
    }
  });

  return unique.length > 0 ? unique : [fallbackTitle];
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
  text.split(/\n{2,}/).forEach((paragraph) => {
    const clean = paragraph.trim();
    if (!clean) {
      return;
    }

    const p = document.createElement("p");
    p.textContent = clean;
    output.appendChild(p);
  });
}

function formatLevel(level) {
  const labels = {
    beginner: "Level 1",
    intermediate: "Level 2",
    advanced: "Level 3"
  };

  return labels[level] || "Level 1";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function removeGNewsTruncation(text) {
  return cleanText(text)
    .replace(/\[\+\d+\s+chars?\]/gi, "")
    .replace(/\s+\.\s*$/, ".")
    .trim();
}

function ensureSentence(text) {
  const clean = cleanText(text);
  if (!clean) {
    return "";
  }

  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function sentenceFrom(text, maxWords) {
  return ensureSentence(stripEndingPunctuation(shorten(text, maxWords)));
}

function stripEndingPunctuation(text) {
  return cleanText(text).replace(/[.!?]+$/g, "");
}

function shorten(text, maxWords) {
  const words = cleanText(text).split(" ").filter(Boolean);
  const clipped = words.slice(0, maxWords).join(" ");
  return clipped || "l'article présente le fait principal avec les détails disponibles";
}

function lowerFirst(text) {
  const clean = cleanText(text);
  return clean ? clean.charAt(0).toLowerCase() + clean.slice(1) : clean;
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
