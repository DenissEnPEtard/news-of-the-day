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
    statusText.textContent = `${formatLevel(level)} ready.`;
    renderParagraphs(summary);
  } catch (error) {
    console.warn(error);
    statusText.textContent = "AI summary unavailable. Showing a local leveled article instead.";
    renderParagraphs(createLocalArticleSummary(article, level));
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

function createLocalArticleSummary(article, level) {
  const titleText = cleanText(article.title || "cette nouvelle");
  const description = cleanText(article.description || "");
  const detail = cleanText(article.content || article.description || titleText);
  const source = cleanText(article.source || "la source de l'article");
  const category = cleanText(article.category || "l'actualite");
  const mainInfo = description || detail || titleText;
  const supportingInfo = detail && detail !== description ? detail : mainInfo;

  if (level === "beginner") {
    return [
      `Level 1. Cet article s'appelle : ${titleText}.`,
      `Il vient de ${source}.`,
      `L'idee principale est : ${shorten(mainInfo, 24)}.`,
      `Un detail important est : ${shorten(supportingInfo, 22)}.`,
      `A retenir : cette nouvelle parle de ${category}. Elle donne une information simple et utile.`
    ].join("\n\n");
  }

  if (level === "intermediate") {
    return [
      `Level 2. L'article s'intitule : ${titleText}. Il vient de ${source} et appartient a la categorie ${category}.`,
      `Le resume est le suivant : ${shorten(mainInfo, 52)}.`,
      `Le detail principal est : ${shorten(supportingInfo, 62)}. Ce detail aide a comprendre exactement ce qui se passe dans l'article.`,
      `L'information est importante parce qu'elle donne un exemple concret, pas seulement un theme general. Le lecteur doit retenir le sujet, l'idee principale et le detail qui explique la nouvelle.`,
      `En conclusion, cet article montre une information actuelle avec assez de details pour la comprendre en francais.`
    ].join("\n\n");
  }

  return [
    `Level 3. Titre de l'article : ${titleText}. Source : ${source}. Categorie : ${category}.`,
    `Resume detaille : ${shorten(mainInfo, 90)}.`,
    `Explication des details : ${shorten(supportingInfo, 110)}. Ces details sont importants parce qu'ils donnent de la precision au sujet et permettent de comprendre les faits disponibles dans l'article.`,
    `Pour analyser cette nouvelle, il faut distinguer le titre, l'idee principale et les informations qui ajoutent du contexte. Le titre annonce le sujet, mais les details expliquent ce qui se passe vraiment.`,
    `Ce qu'il faut retenir, c'est que l'article ne doit pas etre compris seulement comme un theme general. Il faut regarder la source, les faits donnes et les consequences possibles pour mieux expliquer la nouvelle en francais.`,
    `En conclusion, ce texte presente le meme article avec plus de contexte, plus de vocabulaire et une explication plus complete des details.`
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
