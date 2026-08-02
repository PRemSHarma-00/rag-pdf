const { config, genai } = require('../config');

const systemPrompt = `You are a precise document Q&A assistant. Answer the user's question using ONLY the provided document context. Follow these rules:
1. Base your answer strictly on the provided evidence. Do not make up information.
2. Cite page numbers in your answer using [Page X] format.
3. If the context doesn't contain enough information to answer, say so clearly.
4. Use markdown formatting for clarity (headers, lists, bold for key terms).
5. If multiple sources discuss the topic, synthesize them into a coherent answer.`;

async function* generateAnswer(query, contexts) {
  let contextStr = contexts.map((ctx, idx) => 
    `[Evidence ${idx + 1}] (Page ${ctx.page_number}, ${ctx.filename}): "${ctx.text_content}"`
  ).join('\n\n');

  const userMessage = `Context:\n${contextStr}\n\nQuestion: ${query}`;
  
  console.log(`Generating answer for query: "${query}"`);

  // Track sources
  const sourceMap = new Map();
  for (const ctx of contexts) {
    const key = `${ctx.filename}_${ctx.page_number}`;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        filename: ctx.filename,
        page: ctx.page_number
      });
    }
  }
  const sources = Array.from(sourceMap.values());

  const responseStream = await genai.models.generateContentStream({
    model: config.GENERATION_MODEL,
    contents: userMessage,
    config: {
        systemInstruction: systemPrompt
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield { type: 'chunk', content: chunk.text };
    }
  }
  
  yield { type: 'sources', sources: sources };
}

module.exports = { generateAnswer };
