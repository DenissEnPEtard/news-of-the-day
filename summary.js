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
    statusText.textContent = "Summary ready.";
    renderParagraphs(summary);
  } catch (error) {
    console.warn(error);
    statusText.textContent = "AI summary unavailable. Showing a local article summary instead.";
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
      `Cet article s'intitule : ${titleText}. Il vient de ${source}.`,
      `L'idee principale est simple : ${shorten(mainInfo, 36)}.`,
      `Un detail important est : ${shorten(supportingInfo, 32)}.`,
      `En mots simples, cet article parle d'un sujet lie a ${category}. Il aide a comprendre une information actuelle sans utiliser un francais trop difficile.`,
      `A retenir : le titre, l'idee principale et le detail important sont les trois parties les plus utiles pour comprendre l'article.`
    ].join("\n\n");
  }

  if (level === "intermediate") {
    return [
      `L'article s'intitule : ${titleText}. Il vient de ${source} et appartient a la categorie ${category}.`,
      `Le resume de l'article est le suivant : ${shorten(mainInfo, 58)}.`,
      `Le detail le plus utile pour mieux comprendre l'article est : ${shorten(supportingInfo, 70)}. Ce detail est important parce qu'il precise le sujet et montre ce que le lecteur doit retenir.`,
      `L'article peut etre relie a la vie des Canadiens ou des eleves parce qu'il donne un exemple concret d'une situation actuelle. Il ne faut donc pas seulement retenir le theme general, mais aussi les informations precises donnees par la source.`,
      `En conclusion, cet article explique une information principale, ajoute au moins un detail important, et permet de pratiquer un vocabulaire utile en francais.`
    ].join("\n\n");
  }

  return [
    `Titre de l'article : ${titleText}. Source : ${source}. Categorie : ${category}.`,
    `Resume detaille : ${shorten(mainInfo, 90)}.`,
    `Explication du detail principal : ${shorten(supportingInfo, 110)}. Ce detail donne de la precision au resume, car il montre les faits disponibles dans l'article plutot que de rester au niveau d'une idee generale.`,
    `Pour comprendre l'article, il faut distinguer trois choses. D'abord, le sujet annonce par le titre. Ensuite, l'information principale donnee par la description. Enfin, les details qui expliquent pourquoi cette information est importante ou interessante.`,
    `Ce qu'il faut retenir, c'est que l'article presente une information precise et que le lecteur doit utiliser les details pour expliquer le sens de la nouvelle. Un bon resume ne repete pas seulement le titre : il explique aussi ce qui se passe, qui est concerne, et pourquoi cela compte.`,
    `En conclusion, cet article doit etre compris a partir de ses faits principaux, de sa source et des details disponibles.`
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
