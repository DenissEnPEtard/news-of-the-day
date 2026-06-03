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
    beginner: "Beginner level: write 5 short sentences in very simple French. Use common vocabulary, present tense, and short sentence structures. The text should be around 90 to 120 French words.",
    intermediate: "Intermediate level: write 3 clear paragraphs in French. Use useful transition words such as d'abord, ensuite, enfin, and explain the main idea, why it matters, and one simple opinion. The text should be around 150 to 190 French words.",
    advanced: "Advanced level: write 4 developed paragraphs in richer but still student-friendly French. Include context, main facts, importance for Canadians or students, and a thoughtful opinion. The text should be around 220 to 280 French words."
  };

  return [
    "You are helping English-speaking Canadian high school students learn French.",
    "Create a clear, complete, positive, student-friendly French oral presentation summary of this news item.",
    "The student will read this text aloud in front of the class, so write it like a spoken presentation.",
    "The summary MUST be about the specific article below, not a generic topic.",
    "You MUST mention the specific title or a close paraphrase of it in the first paragraph.",
    "You MUST use concrete details from the Description and Content fields. If the article data is short, say only what is available and do not add unrelated examples.",
    "Start naturally, explain the article's main fact, include why that fact matters, and end with a short closing sentence.",
    "Do not invent facts beyond the article data.",
    "Do not write a generic text about Canada, French learning, school, or the category unless those details are in the article data.",
    "Do not include markdown, bullet points, headings, or stage directions.",
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
