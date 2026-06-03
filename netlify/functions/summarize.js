const ENV = typeof process !== "undefined" && process.env ? process.env : {};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (!ENV.OPENAI_API_KEY) {
    return jsonResponse(503, { error: "OPENAI_API_KEY is not configured." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const level = String(body.level || "beginner");
    const prompt = buildPrompt(body, level);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: ENV.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        temperature: 0.4,
        max_output_tokens: level === "advanced" ? 900 : level === "intermediate" ? 620 : 380
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(response.status, { error: data.error?.message || "AI request failed." });
    }

    return jsonResponse(200, { summary: extractOutputText(data) });
  } catch (error) {
    return jsonResponse(500, { error: error.message || "Summary generation failed." });
  }
};

function buildPrompt(article, level) {
  const levelInstructions = {
    beginner: "Level 1: write a very simple French version of the article. Use common words, short sentences, and present tense when possible. Include the main fact and two concrete details. Around 90 to 130 French words.",
    intermediate: "Level 2: write a clear French version of the article with more details. Use 4 to 5 short paragraphs. Include what happened, who or what is involved, and the important details from the article. Around 160 to 230 French words.",
    advanced: "Level 3: write a fuller French version of the article. Use 5 to 6 paragraphs. Include context, main fact, supporting details, people or groups involved, and why the event matters if the article data supports it. Around 260 to 360 French words."
  };

  return [
    "You are helping English-speaking Canadian high school students learn French.",
    "Rewrite or translate the article information into French at the selected level, in the style of a News in Levels reading text.",
    "This must read like the article itself in simpler French, not like advice about how to understand the article.",
    "If the article data is in English, translate it faithfully into French. If it is already French, rewrite it more clearly at the selected level.",
    "The text MUST be about the specific article below, not a generic topic.",
    "You MUST mention the specific title or a close paraphrase of it in the first paragraph when natural.",
    "You MUST use concrete details from the Description and Content fields. If the article data is short, say only what is available and do not add unrelated examples.",
    "Write the facts directly: what happened, who or what is involved, where relevant, and the important details.",
    "Start the first paragraph with the level label: Level 1, Level 2, or Level 3.",
    "Do not invent facts beyond the article data.",
    "Do not write a generic text about Canada, French learning, school, or the category unless those details are in the article data.",
    "Do not write a presentation, a speech, class instructions, vocabulary advice, or comprehension advice.",
    "Do not include meta-explanations such as 'this article helps the reader understand', 'what we should remember', 'to understand the article', or 'this text explains'.",
    "Do not include sentences like 'cet article parle de', 'ce texte montre', or 'pour comprendre'. State the news directly.",
    "Do not include markdown, bullet points, stage directions, greetings, or phrases like 'Bonjour tout le monde'.",
    "Output only the French leveled article text, except keep the English level label at the start.",
    levelInstructions[level] || levelInstructions.beginner,
    "",
    `Category: ${article.category || "News"}`,
    `Title: ${article.title || ""}`,
    `Description: ${article.description || ""}`,
    `Content: ${article.content || ""}`,
    `Source: ${article.source || ""}`
  ].join("\n");
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

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
