const params = new URLSearchParams(window.location.search);
const summaryId = params.get("id");

const levelLabel = document.getElementById("summary-level");
const sourceLabel = document.getElementById("summary-source");
const title = document.getElementById("summary-title");
const statusText = document.getElementById("summary-status");
const output = document.getElementById("summary-output");
const factsBox = document.getElementById("article-facts");

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
  renderArticleFacts(article);

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
      source: article.source,
      publishedAt: article.publishedAt
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
  const description = cleanText(article.description || "");
  const detail = cleanText(article.content || article.description || titleText);
  const source = cleanText(article.source || "la source de l'article");
  const category = cleanText(article.category || "l'actualite");
  const mainInfo = description || detail || titleText;
  const supportingInfo = detail && detail !== description ? detail : mainInfo;

  if (level === "beginner") {
    return [
      `Bonjour tout le monde. Aujourd'hui, je vais presenter une nouvelle dans la categorie ${category}.`,
      `Le titre est : ${titleText}.`,
      `Selon ${source}, l'information principale est : ${shorten(mainInfo, 34)}.`,
      `Un detail important est : ${shorten(supportingInfo, 28)}.`,
      `Je pense que cet article est utile pour notre classe parce qu'il nous donne un vrai sujet canadien a expliquer en francais.`,
      `Merci de m'avoir ecoute.`
    ].join("\n\n");
  }

  if (level === "intermediate") {
    return [
      `Bonjour a toutes et a tous. Aujourd'hui, je vais vous presenter une nouvelle liee a ${category}.`,
      `L'article s'intitule : ${titleText}. Il vient de ${source}, et il parle surtout de cette idee : ${shorten(mainInfo, 48)}.`,
      `D'abord, cette nouvelle est importante parce qu'elle presente un fait concret, pas seulement un theme general. Ensuite, le detail a retenir est le suivant : ${shorten(supportingInfo, 58)}.`,
      `Enfin, je pense que cet article peut interesser des eleves canadiens parce qu'il relie l'actualite a notre vie, a notre pays ou a notre facon d'apprendre le francais.`,
      `Pour conclure, cet article me permet d'expliquer une vraie information en francais et de pratiquer un vocabulaire utile devant la classe.`
    ].join("\n\n");
  }

  return [
    `Bonjour a toutes et a tous. Pour ma presentation, j'ai choisi une nouvelle de la categorie ${category}. Le titre est : ${titleText}.`,
    `La source est ${source}. L'idee principale de l'article est la suivante : ${shorten(mainInfo, 70)}.`,
    `Le detail le plus important a expliquer est celui-ci : ${shorten(supportingInfo, 95)}. Ce detail rend l'article plus precis, parce qu'il montre de quoi il s'agit vraiment et evite de parler seulement du sujet de maniere generale.`,
    `On peut retenir trois elements. Premierement, l'article presente une information concrete. Deuxiemement, cette information a un lien avec ${category} et peut parler a des eleves au Canada. Troisiemement, elle donne l'occasion d'utiliser un francais plus riche pour expliquer les faits, donner du contexte et exprimer une opinion.`,
    `A mon avis, cette nouvelle merite d'etre presentee en classe parce qu'elle transforme un article reel en discussion. Elle nous oblige a lire attentivement le titre, la description et les details disponibles, puis a les reformuler clairement pour que tout le monde comprenne.`,
    `Merci de votre attention.`
  ].join("\n\n");
}

function renderArticleFacts(article) {
  const facts = [
    ["Title", article.title],
    ["Source", article.source],
    ["Main detail", article.description || article.content]
  ].filter(([, value]) => cleanText(value));

  factsBox.hidden = facts.length === 0;
  factsBox.innerHTML = facts.map(([label, value]) => `
    <p><strong>${label}:</strong> ${escapeHtml(cleanText(value))}</p>
  `).join("");
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
