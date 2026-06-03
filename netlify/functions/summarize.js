exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(503, { error: "OPENAI_API_KEY is not configured." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const level = String(body.level || "beginner");
    const prompt = buildPrompt(body, level);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        temperature: 0.4,
        max_output_tokens: level === "advanced" ? 520 : level === "intermediate" ? 380 : 260
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
    beginner: "Beginner level: write a real article summary in very simple French. Use 4 to 5 short paragraphs, common vocabulary, and clear explanations. Around 110 to 140 French words.",
    intermediate: "Intermediate level: write a real article summary in clear French. Use 4 paragraphs: main idea, important details, why it matters, and what to remember. Around 170 to 220 French words.",
    advanced: "Advanced level: write a detailed article summary in richer but still student-friendly French. Use 5 paragraphs: context, main fact, supporting details, explanation of importance, and final takeaway. Around 260 to 330 French words."
  };

  return [
    "You are helping English-speaking Canadian high school students learn French.",
    "Create a clear, complete, student-friendly French summary of this news article.",
    "This must be a real summary, not an oral presentation script.",
    "The summary MUST be about the specific article below, not a generic topic.",
    "You MUST mention the specific title or a close paraphrase of it in the first paragraph.",
    "You MUST use concrete details from the Description and Content fields. If the article data is short, say only what is available and do not add unrelated examples.",
    "Explain the article's main fact, important details, why it matters, and what the reader should remember.",
    "Do not invent facts beyond the article data.",
    "Do not write a generic text about Canada, French learning, school, or the category unless those details are in the article data.",
    "Do not include markdown, bullet points, stage directions, greetings, or phrases like 'Bonjour tout le monde'.",
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
