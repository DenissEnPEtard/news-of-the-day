const params = new URLSearchParams(window.location.search);
const summaryId = params.get("id");

const levelLabel = document.getElementById("summary-level");
const sourceLabel = document.getElementById("summary-source");
const title = document.getElementById("summary-title");
const statusText = document.getElementById("summary-status");
const output = document.getElementById("summary-output");

loadPresentationSummary();

async function loadPresentationSummary() {
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
  const level = payload.level;

  if (!article) {
    statusText.textContent = "The article data is incomplete. Please go back and choose the article again.";
    output.textContent = "";
    return;
  }

  levelLabel.textContent = formatLevel(level);
  sourceLabel.textContent = article.source || "Unknown source";
  title.textContent = article.title || "News summary";

  try {
    const summary = await requestAiSummary(article, level);
    statusText.textContent = "Ready to read aloud.";
    renderParagraphs(summary);
  } catch (error) {
    console.warn(error);
    statusText.textContent = "AI summary unavailable. Showing a local presentation summary instead.";
    renderParagraphs(createLocalPresentationSummary(article, level));
  }
}

async function requestAiSummary(article, level) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

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
      source: article.source
    })
  });
  window.clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Summary request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.summary) {
    throw new Error("Summary response was empty.");
  }

  return data.summary;
}

function createLocalPresentationSummary(article, level) {
  const titleText = cleanText(article.title || "cette nouvelle");
  const detail = cleanText(article.content || article.description || titleText);
  const source = cleanText(article.source || "la source de l'article");
  const category = cleanText(article.category || "l'actualite");

  if (level === "beginner") {
    return [
      `Bonjour tout le monde. Aujourd'hui, je vais presenter une nouvelle dans la categorie ${category}.`,
      `Le titre de la nouvelle est : ${titleText}. Cette nouvelle parle d'un sujet actuel qui peut interesser des eleves au Canada.`,
      `L'idee principale est simple : ${shorten(detail, 38)}.`,
      `Cette information vient de ${source}. A mon avis, cette nouvelle est utile parce qu'elle nous aide a pratiquer le francais avec un vrai sujet d'actualite.`,
      `Merci de m'avoir ecoute.`
    ].join("\n\n");
  }

  if (level === "intermediate") {
    return [
      `Bonjour a toutes et a tous. Aujourd'hui, je vais vous presenter une nouvelle liee a ${category}.`,
      `Cette nouvelle s'intitule : ${titleText}. Elle presente un sujet actuel qui peut parler aux Canadiens, surtout aux jeunes qui veulent mieux comprendre le monde en francais.`,
      `D'apres les informations disponibles, ${shorten(detail, 62)}.`,
      `Ce qui est important, c'est que cette nouvelle donne un exemple concret d'un evenement, d'une idee ou d'une tendance qui existe autour de nous. Elle nous permet aussi d'apprendre du vocabulaire utile et de parler d'actualite avec des phrases claires.`,
      `Pour conclure, je pense que cette nouvelle est interessante parce qu'elle relie le francais a la vie quotidienne au Canada. Merci de votre attention.`
    ].join("\n\n");
  }

  return [
    `Bonjour a toutes et a tous. Pour ma presentation, j'ai choisi une nouvelle de la categorie ${category}. Le titre est : ${titleText}.`,
    `Cette nouvelle est interessante parce qu'elle ne presente pas seulement une information, mais aussi un contexte. Elle nous aide a comprendre une situation actuelle et a reflechir a son importance pour les Canadiens, en particulier pour les jeunes qui apprennent le francais.`,
    `Selon les informations de l'article, ${shorten(detail, 90)}.`,
    `On peut retenir trois idees principales. Premierement, le sujet est actuel et concret. Deuxiemement, il montre un lien avec la societe canadienne, la culture, la technologie, le sport ou la vie communautaire. Troisiemement, il donne l'occasion d'utiliser un francais plus precis pour expliquer, comparer et donner son opinion.`,
    `A mon avis, cette nouvelle merite d'etre partagee en classe parce qu'elle rend le francais plus vivant. Elle montre que la langue n'est pas seulement une matiere scolaire : c'est aussi un outil pour comprendre le monde, discuter avec les autres et exprimer clairement ses idees.`,
    `Merci de votre attention.`
  ].join("\n\n");
}

function renderParagraphs(text) {
  output.innerHTML = "";
  text.split(/\n{2,}/).forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph.trim();
    output.appendChild(p);
  });
}

function formatLevel(level) {
  const labels = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced"
  };

  return labels[level] || "Beginner";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function shorten(text, maxWords) {
  const words = cleanText(text).split(" ").filter(Boolean);
  const clipped = words.slice(0, maxWords).join(" ");
  return clipped || "l'article presente une nouvelle actuelle avec un lien possible avec le Canada";
}
